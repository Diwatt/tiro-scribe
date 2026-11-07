# Backup & Restore cross-device — design « envelope »

*Statut : proposition à valider (07/11/2026). Prérequis livrés : SQLCipher (étape 0, P6), restore in-device (`RestoreState` + `TherapistForge.recover`, P5).*

## 1. Problème

La clé SQLCipher de la base vit uniquement dans le SecureStore du téléphone (`DatabaseKeyVault`, clé random 256 bits). **Elle meurt avec l'appareil** : Android ne migre jamais le Keystore, iOS marque les items `ThisDeviceOnly`. Conséquence : une copie du fichier `.db` sur un nouveau téléphone est indéchiffrable — le restore « J'ai un kit de récupération » livré ne couvre que le cas *vault présent sur l'appareil* (ligne `Therapist` en DB, masterKey absent du SecureStore : restore OS, keychain effacé).

Le design « dériver la clé DB du masterKey » est écarté (décision 07/11) : les copies durables du masterKey sont **dans la DB elle-même** → circularité au restore, et zéro gain au boot (même coffre). Voir le docstring de `DatabaseKeyVault`.

## 2. Idée directrice : l'envelope

La clé DB reste **random et locale** ; on lui ajoute une **copie voyageuse** chiffrée par les secrets humains, jointe au fichier de sauvegarde. Même pattern que `TherapistForge` (double chiffrement password + recovery code), appliqué à la clé DB.

```
tiro-backup-<date>.tirobackup   (= un zip standard, lib pure JS type fflate — pas de module natif)
├── database.db      : le .db SQLCipher brut (octets, après checkpoint WAL — pas de base64)
└── envelope.json    : sels non secrets + la clé DB chiffrée AES-256-GCM, deux fois :
    ├── primary      : sous keyFromPassword(password, salt.primary)   (PBKDF2 600k)
    └── recovery     : sous keyFromCode(code, salt.recovery)          (PBKDF2 100k)
```

Pourquoi ça boucle sans circularité : pour ouvrir la DB il faut la clé DB ; la clé DB est dans l'envelope (à côté du fichier, pas dedans) ; l'envelope s'ouvre avec un secret **dans la tête du psy**. Une fois la DB ouverte, le masterKey chiffré est lu dans `Therapist` et tout remonte.

## 3. Format (v1)

Deux fichiers dans le zip ; seul `envelope.json` est parsé par l'app, **avec Zod à la boundary** (payload non approuvé — jamais de `interface` à la main) :

```json
{
  "version": 1,
  "kdf": {
    "primarySalt": "scribe_dbkey_primary_<therapist-uuid>",
    "recoverySalt": "scribe_dbkey_recovery_<therapist-uuid>"
  },
  "encryptedDbKey": {
    "primary": "<CryptoEngine.encrypt(dbKeyHex, keyFromPassword(password, primarySalt))>",
    "recovery": "<CryptoEngine.encrypt(dbKeyHex, RecoveryCode.keyFromCode(code, recoverySalt))>"
  }
}
```

- La clé DB en clair est la chaîne hex 64 chars — `encrypt(plaintext, keyHex)` du `CryptoEngine` telle quelle (même signature que `TherapistForge`). ⚠️ *Note 07/11 — boot auth-gated acté (`AUTH_GATED_BOOT.md`) : cette clé ne vivra plus dans le SecureStore mais chiffrée dans le keyfile ; l'import d'un bundle écrit donc ses slots dans le keyfile, pas dans le SecureStore.*
- Les sels voyagent dans l'envelope car au restore, on ne connaît pas encore le `uuid` (il est dans la DB qu'on n'a pas ouverte). Ils sont non secrets.
- `version` permet de faire évoluer le format ; un bundle de version inconnue est refusé avec message clair.

## 4. Export

**Déclencheur** : manuel, Settings → Security (« Exporter une sauvegarde »). Pas d'auto-backup cloud, pas de backup OS : cohérent avec la note P6 (exclure DB + clé des backups iCloud/Android). Le psy garde le bundle avec son kit papier (share sheet, même mécanique que le PDF du recovery kit via `expo-sharing`).

Séquence (`BackupExporter`) :
1. `PRAGMA wal_checkpoint(TRUNCATE)` sur la connexion ouverte (fichier unique cohérent, pas de `-wal` à copier).
2. Zip du `.db` + de l'envelope (`fflate`, pure JS).
3. Lire la clé DB (`DatabaseKeyVault.getKey()`), la chiffrer deux fois, écrire `envelope.json`.
4. Écrire le bundle + `share()`.

**Changement de mot de passe → régénération du bundle** (acté 07/11) : un fichier déjà exporté ne peut pas apprendre un password futur — on ne peut pas ré-écrire ce qui a quitté l'appareil. Donc, à la fin du flow « changer le mot de passe », si un backup a déjà été exporté, l'app **régénère automatiquement le bundle** (re-snapshot complet de la base + re-chiffrement sous le nouveau password) avant de quitter l'écran. Invariant : le password **courant** ouvre toujours la sauvegarde **courante** ; le code de récupération ouvre **toutes** les sauvegardes (il ne change jamais) ; les vieilles copies restent ouvertes avec le password d'alors **ou** le code.

## 5. Import

**Entrée UX** : `RestoreScreen` gagne un chemin « restaurer depuis une sauvegarde » (document picker). Le psy arrive sur le nouveau téléphone, tape le lien « J'ai un kit de récupération », importe le bundle, saisit **code + nouveau password** — exactement le formulaire du restore in-device déjà livré.

Séquence (`BackupImporter` + `RestoreState` existant) :
1. Dézipper le bundle, lire + parser `envelope.json` (Zod), vérifier `version`.
2. Déchiffrer la clé DB : essai `recovery` (deterministe, marche toujours) puis `primary` — le code de récupération est l'ancre maîtresse, le password n'est qu'un raccourci.
3. Remplacer la base locale : mécanique déjà éprouvée par `Database.reset()` (dev) — supprimer le fichier courant, écrire le `.db` du bundle, **clear du singleton**, puis `Database.initialize({ entities })`. La fabrique des repositories étant résolue paresseusement depuis le Container, aucune re-injection n'est nécessaire. **Pas de restart app.**
4. Écrire le `dbKey` déchiffré dans le keyfile (slots password + recovery — cf. `AUTH_GATED_BOOT.md` ; historiquement : SecureStore `scribe_db_cipher`).
5. Le flow existant reprend tel quel : `forge.recover(therapist, code, newPassword)` → decrypt masterKey (lecture de `encryptedMasterKeyRecovery` **dans la DB fraîchement importée**) → re-chiffrement sous nouveau password → `persist` + `vault.save(uuid, masterKey)` → session active → `/main`.

Cas d'erreur dédiés : bundle illisible/version inconnue, code invalide (échec GCM), DB du bundle corrompue (échec d'ouverture SQLCipher). Chacun son message i18n ; la base locale fraîche n'est remplacée qu'après decrypt réussi (jamais de demi-restauration).

## 6. Menaces & limites assumées

- **Bundle volé** → brute-force offline du recovery code (60 bits uniformes : hors de portée) ou du password (entropie utilisateur — exposition identique au `encryptedMasterKeyPrimary` existant ; pas d'aggravation).
- **Changement de password** : les anciens bundles restent valides (slots `recovery` intacts, pas de rekey DB). Le prochain export chiffre avec le nouveau password. Aucune action requise côté app.
- **Rotation du masterKey** : n'orphanne pas les bundles — la clé DB n'en dépend pas.
- **Audio** : jamais restaurable par design (clés matérielles non exportables). Le bundle restaure transcripts, métriques et métadonnées. À énoncer dans l'UX d'export.
- Le bundle en partance vers Drive/whatever est chiffré par construction ; on ne chiffre rien de plus au-dessus.

## 7. Plan d'implémentation (TDD, dans l'ordre)

| # | Étape | Gate |
|---|---|---|
| 1 | `BackupEnvelope` — schema Zod + factories `encrypt`/`decrypt` (pur, sans device) | round-trip + refus version inconnue + mauvais code |
| 2 | `BackupExporter` — checkpoint + zip (`.db` + envelope) + écriture + share | archive dézippée = `.db` octet-pour-octet + envelope vérifiable (mocks fs/crypto) |
| 3 | `Database.replaceFromFile()` — mécanique `reset()` promue en capability (close → copy → re-init) | re-init sur SqlJsDialect d'injection ; file copiée intacte |
| 4 | UI export (Settings → Security) + UI import (picker dans `RestoreScreen`) + i18n | parcours navigable émulateur |
| 5 | E2E émulateur : créer vault → exporter → effacer app data → importer avec le kit | sessions visibles après restore, `hasActiveSession` true |

Dépendances : `expo-file-system` ✓, `expo-sharing` ✓ (RecoveryKit), **`fflate` à ajouter** (zip pure JS, aucun rebuild natif), **`expo-document-picker` à ajouter**.
