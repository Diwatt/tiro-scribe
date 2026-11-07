# EMBEDDINGS — Recherche sémantique sur transcripts

*Design 06/11/2026 — révisé après revue (recherche par séance, hybride lexical, chiffrement
BDD, périmètre LLM). Phase 1 : embeddings + stockage + recherche. Phase 2 : synthèse
Gemma 4 on-device.*

## 1. Objectif

Permettre au thérapeute d'interroger l'historique verbal du patient en langage naturel, ex. :
« Comment le sujet de la mère a évolué dans son discours sur les 5 dernières séances ? »

Architecture local-first, deux briques indépendantes :

1. **Embeddings** — vectoriser les transcripts (modèle d'embedding on-device), stocker dans
   SQLite (MikroORM), recherche par similarité (kNN cosinus) **+ recherche lexicale**.
2. **Synthèse NL (Gemma 4)** — un petit LLM local reformule la question, reçoit les passages
   retrouvés (horodatés, attribués par locuteur) et produit une synthèse **avec citations**.

**Garde-fou : le LLM ne parle jamais directement à la BDD.** Il ne génère pas de SQL. Le
kNN et la fusion lexicale sont déterministes (notre code) ; le LLM ne reçoit que les chunks
sélectionnés et ne peut pas halluciner d'accès au-delà.

## 2. Choix du modèle d'embedding

| | **arctic-embed-m-v2.0** (candidat) | paraphrase-multilingual-MiniLM-L12-v2 (repli) |
|---|---|---|
| Params | 305 M (113 M non-embedding) | 118 M |
| Dims | 768 → **256 stockés** (MRL, −2 % NDCG) | 384 |
| Langues | 74 (FR ✓), MIRACL/CLEF forts | 50+ |
| Contexte | 8192 tokens (RoPE, base GTE-multilingual) | 128 tokens ⚠️ |
| Poids int8 ≈ | ~300 MB | ~120 MB |
| Licence | Apache-2.0 | Apache-2.0 |

**L'arbitrage final se fera sur notre jeu d'évaluation (recall@k, §7), pas sur les
benchmarks seuls** — c'est ce qui tranchera arctic vs MiniLM et mesurera l'apport de
l'hybride lexical.

**Contrat d'usage** (identique desktop / device) : pooling **CLS**, L2-normalisé, préfixe
**`query: `** sur la requête uniquement (jamais sur les documents). Similarité = produit
scalaire (= cosinus après normalisation).

## 3. Intégration runtime (capability `embed`)

Même pattern que `asr` / `speaker_id` : entrée catalogue (mock puis HF), rôles
`encoder` (+ `config` : dims, queryPrefix, formes), `Runtime.getModel('embed')`, export
**int8 + `XnnpackPartitioner`** (leçon décodeur P3).

- **Export multi-formes avec attention_mask** : un chunk moyen (~25 s de parole) fait
  ~120 tokens — une forme figée 512 padderait 4× trop (même piège que la fenêtre 28 s de
  l'ASR). Exporter **3 méthodes distinctes dans le même `.pte`** (128 / 256 / 512 tokens),
  l'`Embedder` choisit la plus petite qui loge le chunk. **Le programme prend `input_ids`
  + `attention_mask`** : sans masque, les tokens de padding participent à l'attention et
  le vecteur CLS dépendrait de la forme choisie (même chunk → embedding différent selon
  128/256/512). **Test de cohérence inter-formes : même texte × 3 formes → cosinus ≥
  0,999.**
- **Gate de parité réaliste** : la quantification int8 modifie les vecteurs (comme pour
  decoder/joint) — la « bit-parité cos 1.0 » est impossible. Gate = **cosinus ≥ 0,99 vs
  fp32** ET **stabilité du classement** (même top-k que fp32 sur le jeu d'évaluation —
  construit en étape 1, avant tout export, cf. §10).
- Métrique : même discipline que `AsrRunMetric` (latence par batch) + bench sur le fixture
  long `bench_long_16k.wav` (35 segments déjà transcrits sur device).

## 4. Chunking des transcripts

Un **chunk = un locuteur** (coupure systématique au changement de locuteur), puis borné
par : durée ≤ ~45 s **ou** ~400 mots (≈ 512 tokens). C'est ce qui permet de chercher
« le discours du **patient** sur sa mère » sans remonter les relances du thérapeute — le
filtre `speakerLabel` (§5) fait le reste à la requête.

- **Contexte du tour précédent** : un « P: oui » isolé n'a aucun sens — le sens vient de
  la question du thérapeute. Un chunk patient inclut **le tour précédent du thérapeute
  dans son texte embeddé** (`T: votre mère vous manque ? — P: oui, énormément`) et reste
  **attribué au patient** (c'est sa réponse).
- **Longueur minimale** : en dessous d'un plancher (à caler, ex. ~15 mots), fusionner
  avec le tour adjacent ou ignorer le chunk — pas d'embedding de fragments sans valeur.

- Texte du chunk = utterances préfixées (`T:` / `P:`) — le locuteur fait partie de la
  sémantique ; **colonne `speakerLabel` dédiée** pour le filtrage.
- Timestamps (`startMs`/`endMs`, horloge absolue) conservés pour la timeline.
- Ordre de grandeur : séance de 4 h ≈ ~400-800 chunks (~25 s de parole chacun).

Répartition dense / lexical (détail §7) : la **dense** gère les synonymes et paraphrases
(« maman », « ma mère », « elle m'a toujours… ») ; le **lexical** gère les termes exacts
que la dense rate : noms propres, médicaments, termes rares, erreurs d'ASR sur les noms.

## 5. Stockage MikroORM

SQLite n'a pas de type vecteur : le vecteur est un **BLOB float32 little-endian**
(`Uint8ArrayType` MikroORM — mappé BLOB ; à valider sur le dialect `kysely-expo` au spike,
repli `p.json<number[]>()`). Entité dans le style `Transcription.ts` :

```ts
const TranscriptChunkSchema = defineEntity({
    name: 'TranscriptChunk',
    tableName: 'transcript_chunks',
    properties: {
        uuid: p.uuid().length(36).primary().onCreate(() => uuidv4()),
        encounterId: p.manyToOne(Encounter).deleteRule('cascade').mapToPk(),
        speakerLabel: p.string().length(16),
        text: p.string(),
        startMs: p.int(),
        endMs: p.int(),
        utteranceStartIndex: p.int(),
        utteranceEndIndex: p.int(),
        /** float32 LE, dims stockées (256), L2-normalisé — dot = cosinus. */
        embedding: p.type(Uint8ArrayType),
        dimension: p.int(),
        modelName: p.string().length(64),
        modelVersion: p.string().length(16),
    },
});
```

- **Cascade delete** avec l'encounter (les embeddings dérivent de la parole du patient :
  même cycle de vie, shred avec l'audio/transcript).
- `dimension` + `modelName`/`modelVersion` = traçabilité contractuelle et détection des
  vecteurs **stale** (`modelName` ≠ modèle courant → re-embed).
- Index sur `encounterId`. Schema sync **additif** (`orm.schema.update()`).
- **Table lexicale** : FTS5 sur `text` — **activé par défaut** dans expo-sqlite
  (`enableFTS: true`, FTS3/4/5 — doc Expo consultée 06/11). Voir §7.

### Repository

`TranscriptChunkRepository extends AbstractRepository` :

- `persistBatch(chunks)` — upsert par (encounterId, utteranceStartIndex) + index FTS ;
- `deleteForEncounter(encounterId)` ;
- `searchTopK(queryVector, { encounterIds?, speakerLabel?, topK = 12 })` — **mode
  « question ponctuelle »** : les k meilleurs passages, tous encounters confondus ;
- `searchEvolution(queryVector, { patientId, speakerLabel, perEncounterK = 3,
  minSimilarity })` — **mode « évolution »** : k passages **par encounter** au-dessus d'un
  seuil, **ordre chronologique**. Une séance sans passage au-dessus du seuil est un
  résultat (thème absent cette séance-là) — information rendue à l'UI, pas un silence.
- kNN **brute-force en JS** : dot product sur `Float32Array`. À cette échelle
  (~10³ vecteurs, ~0,8 MB / 4 h) c'est < 10 ms ; **sqlite-vec hors v1**.
- **`ChunkVectorCache`** : les vecteurs d'un patient sont chargés de SQLite **une fois par
  session de recherche** et maintenus en mémoire (invalidés à l'écriture) — pas de
  re-lecture des BLOB à chaque requête.

## 6. Flux d'ingestion (P4, post-transcription)

Store now, process later (sur chargeur) : encounter transcrit → chunker (mono-locuteur) →
batch embed → persist + index FTS. Reprise = checkpoint par encounter ; présence de chunks
avec `modelName` courant = déjà fait (idempotent).

## 7. Recherche (phase 1, sans LLM)

**Deux modes distincts dès la phase 1** :

1. **Ponctuel** (`searchTopK`) : « quand a-t-il parlé de sa mère ? » — top-k global.
2. **Évolution** (`searchEvolution`) : « comment le sujet de la mère a évolué sur 5
   séances ? » — top-k **par séance**, chronologique, avec les séances sans correspondance
   signalées (« thème absent cette séance » — information, pas un silence). Le seuil
   « séance sans thème » s'applique **au cosinus dense seul** : les scores RRF ne sont pas
   calibrés, le lexical ne sert qu'au classement. Un top-k global répond structurellement
   mal à cette question : les 12 meilleurs passages peuvent venir des 2 séances où le
   patient a le plus parlé d'elle.

**Hybride dense + lexical** : FTS5 sur `text` fusionné au kNN par **RRF (Reciprocal Rank
Fusion)** — coûte peu, apporte beaucoup en contexte clinique. Répartition : **dense =
synonymes et paraphrases** (« maman », « ma mère », « elle m'a toujours… ») ; **lexical =
termes exacts** (noms propres, médicaments, termes rares, erreurs d'ASR sur les noms).
⚠️ FTS5 n'a **pas de racinisation française** native (le tokenizer porter livré vise
l'anglais) : **`unicode61` + `remove_diacritics`** au minimum ; une vraie lemmatisation
FR reste hors v1.

**Jeu d'évaluation** : 20-30 questions annotées sur les fixtures (thèmes, personnes,
symptômes) avec les chunks attendus → **recall@k**. C'est la gate de qualité (arctic vs
MiniLM, gain de l'hybride) et le jeu de stabilité du classement (§3). **Inclure des cas
où la diarisation est connue fausse** : le filtre `speakerLabel` hérite des erreurs du
`speaker_id` — un passage du patient étiqueté psy disparaîtrait du mode « discours du
patient » — et mesurer cet impact. Résultats affichés en timeline horodatée.

## 8. Gemma 4 on-device (phase 2 — « parler à la bdd »)

Rôles du LLM : (a) reformuler la question en requête(s) d'embedding multi-thèmes ;
(b) synthèse RAG à partir des chunks horodatés fournis.

- **Modèle — Gemma 4, licence Apache 2.0** : Google a publié Gemma 4 sous Apache 2.0,
  **abandonnant les « Gemma Terms of Use »** des versions précédentes (Gemma 3) — plus de
  restriction de distribution à valider. Famille **E2B / E4B / 12B / 26B MoE / 31B** ;
  les variantes **edge** (E2B : 2,3B effectifs / 5,1B avec embeddings ; E4B : 4,5B / 8B)
  sont conçues pour le **on-device mobile**, contexte 128K, thinking désactivable
  (`<|think|>`), system role natif, function calling. Candidat v1 : **E2B** (multimodal
  texte+image+audio — l'audio ne nous sert pas, notre ASR est Parakeet).
- **Chemin d'exécution — la stack l'a déjà** : `react-native-executorch` (sur quoi notre
  `ExecuTorchRuntime` est bâti) expose des hooks `useLLM*` et met en avant Gemma 4 tournant
  intégralement on-device en RN ; la maison édite aussi **React Native RAG** (recherche +
  génération on-device). Le spike **démarre par `useLLM` de react-native-executorch**, pas
  par une comparaison ExecuTorch vs MediaPipe. (Listing exact des variantes Gemma 4 dans
  leur catalogue : à confirmer à l'ouverture du spike.)
- **RAM** : fichiers Ollama (E2B 4,6-7,5 GB) = tailles serveur ; en int4 texte-seul,
  estimation ≈ 2,5 GB (E2B) — à mesurer. Conflit avec l'ASR (572 MB) sur device 6 GB →
  **phase dédiée avec déchargement de l'ASR** (prérequis `Runtime.unload(capability)` à
  créer) ou gate `HardwareGuard` ≥ 8 GB.
- **Périmètre de sortie — citations obligatoires** : « la mère est mentionnée en termes
  culpabilisés » est de l'interprétation clinique produite par un modèle de 2B → **hors
  périmètre**. Gemma ne fait que **synthétiser avec citations** : chaque affirmation doit
  pointer vers un chunk horodaté, **vérifié côté code** (le chunk cité existe et figure
  dans le contexte fourni) et cliquable dans la timeline. L'interprétation revient au
  thérapeute. ⚠️ **Zone « aide à la décision clinique » → implication réglementaire
  possible (dispositif médical, MDR Europe) — à faire vérifier avant de livrer la phase 2.**
- Contexte prompt : ≤ ~12 passages (top-k cumulés) pour tenir dans le budget tokens.

## 9. Confidentialité

- Les embeddings **sont aussi sensibles que le transcript** : ils peuvent être en partie
  inversés pour retrouver le texte d'origine. Même traitement que le texte : jamais
  synchronisés, jamais loggués (compteurs seulement), cascade delete + shred avec
  l'encounter. Traçabilité `modelName`/`modelVersion` (contrat « résultats signés »).
- ⚠️ **Constat code 06/11 : la base SQLite est en clair sur disque** — `Database.ts` ouvre
  expo-sqlite nu (kysely-expo `ExpoDialect`), sans chiffrement. **Les transcripts
  (`utterances` JSON) sont donc déjà en clair**, contrairement à l'audio (AES-256-GCM
  natif).
- **Chiffrement de la base — exigence de confidentialité, sans lien technique avec les
  embeddings** : elle couvre **déjà les transcripts**, a fortiori les embeddings qui en
  dérivent — d'où sa place en étape 0 du plan, mais c'est un problème **dès aujourd'hui**.
  **Arbitrage tranché : SQLCipher via le config plugin expo-sqlite** (confirmé doc Expo,
  consultée 06/11) — **pas de migration vers op-sqlite**, on garde expo-sqlite +
  kysely-expo : `"plugins": [["expo-sqlite", { "useSQLCipher": true, "enableFTS": true
  }]]` (enableFTS déjà `true` par défaut). Le chiffrement est **fichier, page par page** :
  une fois la base ouverte avec la clé, SQLite voit du clair en mémoire — recherche
  dense, FTS5, BLOB d'embeddings et kNN JS fonctionnent sans changement ; le disque ne
  contient que du chiffré, **index FTS compris**.
- **FTS5 a seulement orienté le choix** : le chiffrement applicatif par colonne est
  écarté car il rendrait FTS5 inutilisable (on ne peut pas indexer du texte chiffré) et
  supprimerait l'hybride lexical. **Il n'y a pas de dépendance embeddings ↔ chiffrement** :
  la recherche dense fonctionne avec n'importe quelle option — base en clair, SQLCipher,
  ou même des vecteurs chiffrés par colonne et déchiffrés au chargement du
  `ChunkVectorCache`. Option `withSQLiteVecExtension` du même plugin : sqlite-vec
  embarquable le jour où le brute-force JS ne suffit plus. ⚠️ Option de build → **rebuild
  natif requis** (CNG/prebuild ; non supporté sur Expo Go — hors sujet, nous sommes en
  dev builds).
- **Implémentation** (étape 0, §10) :
  1. **Clé** : 256 bits aléatoires au premier lancement, stockées Keychain/Keystore
     via SecureStore — **même racine matérielle que la clé audio** (`secure_recorder_key`,
     alias natif), mais **clé de domaine séparée volontairement** : sur Android la clé
     audio est un objet KeyStore **non exportable** (impossible à passer à SQLCipher qui
     exige les octets), et réutiliser la même clé brute pour deux domaines (fichiers
     audio vs base) violerait la séparation des clés. Une vraie hiérarchie dérivée
     (HKDF depuis un master wrappé natif) n'est justifiée que si le nombre de clés
     explose — pas aujourd'hui.
  2. **Ouverture** : `PRAGMA key` doit être **la toute première instruction** après
     l'ouverture, avant toute requête. Point délicat MikroORM/kysely-expo : vérifier que
     le dialect accepte une connexion déjà ouverte ou un hook de connexion, sinon petit
     wrapper.
  3. **Migration** : bases existantes en clair → export SQLCipher standard
     (`sqlcipher_export`) puis remplacement du fichier + suppression sûre de l'ancien ;
     **pas encore d'utilisateurs réels → repartir d'une base vide** (fixtures DevConsole).
  4. **Vérification** : test automatisé — copier le `.db` hors appareil : **pas d'en-tête
     « SQLite format 3 »**, grep d'un mot connu du transcript sans résultat ; vérifier
     aussi `-wal` et `-shm`.
- **Limites assumées** : mémoire de l'app pendant une recherche (texte + vecteurs en clair
  dans le cache JS — inévitable, acceptable appareil déverrouillé + app ouverte) ;
  **sauvegardes cloud** : exclure le fichier DB **et** la clé des backups iCloud/Android
  (strictement local) ; perf : surcoût de quelques % à ~15 % en lecture/écriture,
  négligeable à notre échelle avec le cache de vecteurs par patient.

## 10. Plan d'implémentation

| # | Étape | Gate |
|---|---|---|
| 0 | **Chiffrement de la base : `useSQLCipher` via le plugin expo-sqlite** — exigence de confidentialité (transcripts en clair **aujourd'hui**), **pas une dépendance des embeddings** ; clé 256 bits Keychain/Keystore, `PRAGMA key` en 1ʳᵉ instruction, base neuve — pas d'utilisateurs réels | FTS5 + BLOB round-trip sur dialect chiffré · **test en-tête/grep/`-wal`** · bench perf lecture |
| 1 | **Jeu d'évaluation** (20-30 questions annotées, dont diarisation fausse) puis **arbitrage arctic vs MiniLM sur desktop fp32** (sentence-transformers) | recall@k → **modèle retenu avant tout export** |
| 2 | Export `.pte` du modèle retenu : **input_ids + attention_mask**, multi-formes 128/256/512, assertion anti-ops portables | cos ≥ 0,99 vs fp32 · top-k stable · **cohérence inter-formes ≥ 0,999** |
| 3 | Capability `embed` : catalogue + `config` + classe `Embedder` (prefix, MRL, norm, choix de forme) | tests unitaires + parité device |
| 4 | Entité `TranscriptChunk` (+ FTS) + repository (persistBatch, searchTopK, searchEvolution) + `ChunkVectorCache` | BLOB round-trip sur dialect chiffré |
| 5 | `TranscriptChunker` (mono-locuteur, contexte tour précédent, longueur min) + ingestion post-transcription (P4) | bench RTF sur `bench_long_16k.wav` (déjà sur device) |
| 6 | Hybride lexical FTS5 + RRF (lexical = bonus de classement) | gain recall@k mesuré vs dense seul |
| 7 | Recherche phase 1 + timeline DevConsole (2 modes) | « évolution sur N séances » correcte, séances sans thème signalées |
| 8 | Spike Gemma 4 **E2B** via `useLLM` (react-native-executorch) + `Runtime.unload` | LLM chargé aux côtés / après l'ASR sur device 6-8 GB |
| 9 | Synthèse bout-en-bout **à citations vérifiées** | critère P4 + **avis MDR** avant toute livraison |
