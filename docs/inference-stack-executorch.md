# La stack d'inférence expliquée (ExecuTorch)

> Doc de pilotage projet (français, hors code). Les docs vivant dans les dossiers de code
> (`src/**`, `tests/**`…) sont en anglais — cf. règle Language de `AGENTS.md`.

Ce README explique, sans prérequis en machine learning, comment l'app fait tourner
ses modèles d'IA **entièrement sur le téléphone** : qui fait quoi, dans quel ordre,
et pourquoi. Les classes citées existent toutes dans `src/InferenceModel/`.

---

## 1. Le pipeline, de bout en bout

Rappel produit : **rien ne sort du téléphone**, et **rien n'est traité en temps réel**.
Le thérapeute enregistre sa séance, l'app chiffre l'audio sur le disque, et le
traitement IA a lieu plus tard (post-enregistrement), sur des segments déjà choisis.

```
Séance enregistrée
   │
   ▼
Audio chiffré sur disque (.dat, AES-256-GCM, chunks)
   │
   ▼
Déchiffrement en RAM (jamais de PCM sur le disque)
   │
   ▼
Découpage en segments de parole ──────────► VAD (détection d'activité vocale)
   │
   ▼
PCM 16 kHz mono (Float32Array, une valeur par échantillon)
   │
   ├──► CAM++  : biocode du locuteur (identification du thérapeute)
   │
   └──► Parakeet : transcription texte
```

Les deux branches sont **indépendantes** et interchangeables : chaque capability
(`speaker_id`, `parakeet_asr`) télécharge son propre bundle de fichiers et tourne
sur ses propres programmes.

---

## 2. Le vocabulaire ML, traduit

| Terme | Ce que ça veut dire, concrètement |
|---|---|
| **Modèle** | Un réseau de neurones entraîné : un sac de poids (nombres) + une architecture. Exécuter le modèle = des multiplications de matrices sur vos données. |
| **Inférence** | Utiliser un modèle entraîné pour produire un résultat (un texte, un vecteur). Opposé à l'entraînement, qui ne se fait pas sur le téléphone. |
| **Échantillon (sample)** | Une mesure de pression acoustique. 16 000 par seconde, un `Float32` entre -1 et 1 chacun. |
| **Frame** | Une petite fenêtre d'audio (ex. 25 ms) sur laquelle on calcule des features. L'audio est traité frame par frame, en avançant par pas (hop) de 10 ms. |
| **Spectrogramme mel / fbank** | La « recette » qui transforme de l'audio brut en tableau de nombres exploitables : découpage en frames → Fourier (quelles fréquences sont présentes ?) → regroupement en bandes de fréquences imitant l'oreille humaine (échelle *mel*) → logarithme. Résultat : 1 colonne de nombres par frame (128 colonnes pour Parakeet, 80 pour CAM++). |
| **Front-end** | Tout ce qui précède le réseau de neurones : ici, le calcul du spectrogramme mel. « Front-end **figé** » = les mêmes paramètres (taille de fenêtre, nombre de bandes…) que pendant l'entraînement, sans dimension dynamique. Voir §5 : ce n'est pas une optimisation, c'est une exigence de correction. |
| **Embedding** | Un vecteur de nombres qui résume une entrée. L'embedding d'un segment de voix = « signature » du locuteur. Deux enregistrements du même locuteur donnent deux vecteurs proches. |
| **Cosinus** | Mesure de ressemblance entre deux vecteurs : 1 = identiques (même direction), 0 = sans rapport. Utilisé pour comparer des embeddings et des biocodes. |
| **Attention / Transformer** | Mécanisme clé des modèles modernes : chaque position d'une séquence « regarde » toutes les autres pour se contextualiser. Le *Transformer* est l'architecture construite autour de ce mécanisme. |
| **Conformer** | Variante utilisée pour l'audio : des blocs d'attention (contexte global) alternés avec des blocs de convolution (détails locaux). C'est l'architecture de l'encodeur Parakeet. |
| **LSTM** | Ancienne génération de réseau récurrent : un état (mémoire) se transmet de pas en pas. Parakeet l'utilise côté décodeur, token par token. |
| **VAD (Voice Activity Detection)** | Petit modèle (Silero) qui répond « y a-t-il de la parole dans ce morceau ? ». Sert à couper le silence au lieu d'envoyer 4 h d'audio au gros modèle. |
| **Tokenizer (SentencePiece, Metaspace)** | Correspondance entre texte et identifiants numériques. Découpe les mots en morceaux (*tokens*) ; le style *Metaspace* marque le début d'un mot avec le caractère `▁`. Décoder = remplacer `▁` par une espace et concaténer. |
| **Blank** | Token spécial (« rien à dire sur cette frame ») du décodage type RNN-T/TDT. Le décodeur émet soit un token, soit blank, soit avance. |
| **TDT (Token-and-Duration)** | Variant du décodage qui prédit, en plus du token, **de combien de frames avancer**. Gain : moins d'appels au décodeur qu'un RNN-T classique. |
| **Décodage greedy** | La stratégie la plus simple : à chaque étape, on prend le token le plus probable (argmax), sans explorer d'alternatives. C'est ce que fait `TdtGreedyDecoder`. |
| **Logits** | Scores bruts en sortie du réseau, avant transformation en probabilités. Prendre l'argmax des logits = prendre la décision la plus probable. |
| **Quantization** | Stocker les poids sur moins de bits (int8/int4 au lieu de float32) : modèle ~4× plus petit et plus rapide, perte de précision minime. Détail de l'export, transparent pour le code d'exécution. |
| **WER (Word Error Rate)** | % de mots mal transcrits. Plus bas = mieux. Le métrique principal pour comparer deux modèles d'ASR. |
| **RTF (Real-Time Factor)** | Temps de calcul ÷ durée de l'audio. RTF 0.2 = transcrire 1 h d'audio prend 12 min. Plus bas = mieux. |

---

## 3. Qu'est-ce qu'un fichier `.pte` ?

Un **`.pte`** est un programme PyTorch **compilé et figé** pour ExecuTorch, le runtime
mobile de PyTorch. Trois idées à retenir :

1. **C'est un programme, pas un fichier de données.** Il contient les poids ET la
   structure du calcul. On le charge, on appelle ses **méthodes** (en pratique
   `forward`), on récupère des tenseurs.
2. **Il embarque son schéma.** Le programme déclare ses entrées et sorties :
   pour chaque paramètre, un type (`float32`, `int64`…) et une forme (shape),
   dont chaque dimension est **constante**, une **plage** (`range`) ou une **énumération**.
   Notre runtime lit ce schéma (validé par Zod à la frontière) pour **pré-allouer
   les tenseurs de sortie avant l'exécution** — le natif écrit dans de la mémoire
   qu'on lui a déjà donnée, il n'alloue rien au vol.
3. **Les dimensions de sortie doivent être constantes.** Notre runtime refuse une
   sortie `range`/`enum` : sans taille exacte, impossible de pré-allouer. C'est
   pourquoi nos exports figent les formes (voir §5).

Contraintes pratiques du natif, déjà gérées dans le code :

- le loader natif n'accepte que des **chemins bare** (`/path/to/model.pte`),
  jamais d'URI `file://` — `ExecuTorchRuntime.toModelPath` retire le préfixe ;
- l'exécution est **synchrone** (blocante, via JSI), le chargement est async ;
- un fichier `.pte` peut contenir **plusieurs méthodes** (c'est le cas de Parakeet,
  voir §6) — le schéma est une map `nom de méthode → { inputs, outputs }`.

---

## 4. Parakeet : comment un fichier audio devient du texte

`ParakeetSpeechRecognizer` orchestre trois programmes ExecuTorch + deux artefacts
texte. Étapes (chiffres = constantes de la classe) :

```
PCM 16 kHz (une fenêtre d'au plus 28 s)
   │
   ▼  ParakeetMelSpectrogram (front-end, en TS)
128 bandes mel × 2800 frames   (hop 160 échantillons = 10 ms)
   │                           (fenêtre figée : tronque/complete à 2800)
   ▼  programme « encoder » (Conformer, .pte)
350 frames × 640 dims          (l'encodeur sous-échantillonne ×8 : 2800 → 350)
   │
   ▼  boucle TdtGreedyDecoder, frame par frame
   │     ├─ programme « decoder » : LSTM sur le dernier token émis → état de prédiction
   │     └─ programme « joint »   : (état prédiction + frame encoder) → logits
   │            → token (argmax sur 8192) + durée (argmax sur 5)
   │            → blank + durée 0 = avance d'une frame ; sinon on avance de « durée »
   ▼
ids de tokens ──► ParakeetVocabulary.decode (Metaspace : ▁ → espace)
   │
   ▼
Texte
```

Notes :

- **Fenêtre de 28 s** : `FIXED_MEL_FRAMES = 2800`. Une fenêtre fixe simplifie tout
  (shapes constantes, pré-allocation), au prix d'un peu de padding sur les segments courts.
- **Timestamps** : le décodeur retient l'index de frame de chaque token émis
  (`frameIndexes`) — post-traitement, jamais de suivi en direct.
- **Vocabulaire** : 8192 tokens réels + 1 blank (`id 8192`) ; les ids < 12 sont des
  tokens spéciaux ignorés au décodage.
- Le texte est **français-capable** : le choix Parakeet-TDT-0.6B v3 vient de son WER
  FR (~5 %) meilleur que Whisper small, pour un modèle bien plus léger.

## 5. CAM++ : comment un audio devient une signature de locuteur

`SpeakerId` est le pendant simple du duo précédent : **un** programme, **une** sortie.

```
PCM 16 kHz (fenêtre figée de 500 frames mel ≈ 5 s)
   │
   ▼  AudioFeatureExtractor (front-end fbank 80 bandes, 25/10 ms, en TS)
80 bandes × 500 frames
   │
   ▼  programme « encoder » (CAM++, .pte)
vecteur de 512 nombres = embedding du locuteur
   │
   ▼  normalisation (longueur 1) dans SpeakerVector
   │
   ▼  projection par la matrice secrète du thérapeute (BiocodeFactory)
Biocode (vecteur projeté, non ré-identifiable sans la matrice)
```

Pourquoi une projection ? L'embedding brut CAM++ est ré-identifiable (on peut le
comparer à des voix connues). En le multipliant par une matrice dérivée du secret du
thérapeute, on obtient un **biocode** : anonyme pour tout le monde, mais qui conserve
la propriété utile — deux enregistrements du même locuteur restent proches
(`Biocode.similarityTo`, cosinus, seuil de match 0.85). C'est le mécanisme qui permet
le matching multi-séances **sans** stocker de données biométriques exploitables.

## 6. Pourquoi les shapes figées sont obligatoires

Leçon de la spike P2 (consignée dans `TODO.md`) : sur le graphe CAM++ **original**
(dims dynamiques), ORT mobile produisait un embedding **faux** sans lever d'erreur.
Sur le graphe simplifié à dims constantes, tout était correct. Conséquences :

- le front-end figé (fenêtre à taille constante, tronquée/complétée avant
  l'inférence) est une **exigence de correction**, pas un raffinement ;
- nos exports `.pte` figent toutes les dimensions → le runtime peut exiger des
  sorties constantes et pré-allouer ;
- chaque modèle est **interchangeable** : changer de modèle = changer un bundle de
  fichiers (spec + `.pte` + artefacts), pas le code. On peut servir un modèle plus
  petit aux téléphones modestes sans branche de rétro-compatibilité.

## 7. Cartographie du code

### Couche ExecuTorch (`ExecuTorch/`) — le moteur

| Classe | Rôle |
|---|---|
| `ExecuTorchProgramSchema` | Frontière Zod : parse le JSON de schéma livré par le natif. Rien ne passe sans validation. |
| `ExecuTorchDimension` | Une dimension de tenseur (constante / plage / énum) + ses factories et gardes (`getConstantValue()` throwe si dynamique). |
| `ExecuTorchParameter` | Une entrée ou sortie déclarée (tenseur ou scalaire) ; `getDtype()`/`getShape()` throwent sur un non-tenseur. |
| `ExecuTorchProgram` | Un `.pte` chargé : chemin, map validée des sorties par méthode, points d'entrée d'exécution/libération. |
| `ExecuTorchRunInput` | Une entrée prête à exécuter : données + shape, validées à la création. |
| `ExecuTorchRuntime` | Façade : `load()` (chemin bare), `run()` (pré-alloue les sorties d'après le schéma, exécute, lit, libère les tenseurs). |
| `ReactNativeExecuTorchBackend` | Le seul point de contact avec `react-native-executorch` (JSI natif). Chargé par import dynamique uniquement — jamais via le barrel. |

### Couche modèles (`Model/`) — les pipelines

| Classe | Rôle |
|---|---|
| `InferenceModel` | Contrats communs (`initialize`/`dispose`/`isReady`/`run`) ; chaque modèle gère lui-même son bundle ExecuTorch. |
| `Asr` | Pipeline ASR complet (§4) : 3 programmes + vocabulaire + filtres mel. |
| `SpeakerId` | Pipeline locuteur (§5) : 1 programme + config yaml validée (`SpeakerIdConfig`). |
| `SpeakerIdConfig` | Paramètres CAM++ lus du `config.yaml` du bundle (dim embedding, bandes mel, fréquence, tailles de frame), validés par Zod. |

### Couche Parakeet (`Parakeet/`) — les pièces du pipeline ASR en TS pur

| Classe | Rôle |
|---|---|
| `ParakeetMelSpectrogram` | Front-end log-mel fidèle à HuggingFace (preemph, STFT centrée, hann, projection slaney, normalisation par bande). FFT implémentée à la main, pré-allouée. |
| `TdtGreedyDecoder` | La boucle de décodage TDT (§4), sémantique HuggingFace exacte ; les programmes natifs lui sont **injected** (elle ne connaît pas ExecuTorch). |
| `ParakeetVocabulary` | ids → texte (Metaspace, tokens spéciaux ignorés). |

### Couche téléchargement (`Download/`) — d'où viennent les fichiers

Chaque capability est décrite par une **spec** (`spec.yaml` hébergé) : une liste de
fichiers identifiés par un **rôle générique** (`encoder`, `decoder`, `joint`,
`tokenizer`, `mel_filters`, `config`…), une URL et un checksum.

| Classe | Rôle |
|---|---|
| `Downloader` | Point d'entrée : `ensureDownloaded(capability)` (bloque jusqu'à complet) et `getArtifact(capability, role)` → un `ModelArtifact`. |
| `ModelArtifact` | Un fichier téléchargé : `getUri()` (chemin pour le natif), `getText()` (contenu texte). |
| `ModelArtifactStorage` | Où vivent les fichiers sur disque, résolution rôle → fichier. |
| `DownloadTaskManager` / `DownloadTaskExecutor` / `ExecutorCollection` | File de téléchargements, suivi d'état/progression par tâche. |
| `FileDownloader` | Transport HTTP d'un fichier. |
| `ChecksumVerifier` | Vérifie l'intégrité (hash) après téléchargement. |
| `ConfigProvider` | Récupère et valide la spec d'une capability. |

### Couche locuteur (`Speaker/`) — au-dessus de CAM++

| Classe | Rôle |
|---|---|
| `SpeakerEmbedder` | PCM → features → `SpeakerId` → `SpeakerVector` normalisé. |
| `SpeakerVector` | Embedding normalisé + confiance (magnitude brute bornée à 1). |
| `BiocodeFactory` | Projection de l'embedding par la matrice dérivée du secret → `Biocode`. |
| `Biocode` | Vecteur projeté + matching par cosinus (seuil 0.85). |
| `SpeakerProcessor` / `VoiceCalibrator` | Orchestration métier (calibration de la voix du thérapeute, traitement de segments). |

### Le registre (`Runtime.ts`, `Setup.ts`)

- `Runtime` : **registre**, pas un modèle. `load(capability)` instancie le bon
  pipeline (factory par capability, imports dynamiques), `getModel<T>()` le rend,
  `dispose()` libère tout.
- `Setup` : la liste des capabilities à pré-télécharger au démarrage.

---

## 8. Fil conducteur : l'ajout d'un nouveau modèle

1. Exporter le modèle en `.pte` avec **toutes les dimensions constantes** et un
   front-end figé (mêmes paramètres que l'entraînement).
2. Déclarer le bundle dans la spec (rôles génériques : `encoder`, `config`, …),
   l'héberger, noter son checksum.
3. Écrire une classe pipeline dans `Model/` (hériter d'`AbstractModel`,
   fenêtres figées par constantes de classe, artefacts validés par Zod).
4. L'enregistrer dans la factory de `Runtime.createModel`.
5. Benchmarker RTF/WER sur device avant de le rendre par défaut — un modèle n'est
   « mieux » que mesuré sur un Pixel réel, jamais sur le papier.
