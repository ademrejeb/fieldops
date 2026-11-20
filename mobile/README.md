# FieldOps Tech — Mobile App (Techniciens)

Application terrain : Mes missions, exécution offline-first, signature client,
photos, pièces, temps + **suivi GPS périodique** (même app fermée).

## Prérequis

- Node 20+, compte Expo gratuit, app **Expo Go** sur le téléphone.
- Le backend tourne sur le PC : `npm run dev` (port 3000).
- Téléphone **sur le même Wi-Fi** que le PC.

## Démarrage (5 min)

```bash
cd mobile
npm install
npx expo start
```

- Scannez le QR avec Expo Go (Android) / Appareil photo (iOS).
- Écran login → champ **Serveur** :
  - Émulateur Android : `http://10.0.2.2:3000` (pré-rempli)
  - Téléphone réel : `http://IP-DU-PC:3000` (ex: `http://192.168.0.10:3000`)
- Connectez-vous : `tech@fieldops.ma` / `FieldOps123!`

## Ce que fait l’app

| Écran | Contenu |
|---|---|
| Missions | Jobs assignés au technicien (priorité, client, site, statut), pull-to-refresh, cache offline, file d’envoi ⏳ + bouton Synchroniser |
| Détail job | Fiche 360° (client, site + code d’accès, actif), boutons En route → Sur site → En cours → Terminé |
| Checklist | Étapes du gabarit, PASS/FAIL, validation une par une |
| Pièces | Recherche stock temps réel, +1 décrémente le vrai stock (409 si insuffisant) |
| Temps | Saisie minutes → TimeLog |
| Clôture | Résumé + photos caméra + pad de signature au doigt + note ★ → rapport, WO DONE, ticket RESOLVED |
| Réglages | Identité, serveur, **suivi GPS on/off**, sync manuelle, déconnexion |

## Suivi GPS périodique

- Réglages → **Activer** : demande les droits (toujours autoriser pour le fond),
  démarre la tâche `fieldops-bg-track` : **toutes les 5 min** (ou 100 m),
  envoie `{lat, lng, speed}` à `POST /api/mobile/position` avec le token.
- La carte web du Centre de pilotage affiche le point + « GPS il y a X min ».
- App tuée / téléphone redémarré : Android relance via le foreground service ;
  iOS relance à la prochaine ouverture (limite OS).
- Hors ligne : la position est mise en file et synchronisée au retour réseau.

## Hors ligne (tunnels, sous-sols)

Checklist, pièces, temps, statuts, rapports, positions → file locale chiffrée
par l’OS, envoyés dans l’ordre à la reconnexion (bouton Synchroniser + compteur).
Les missions consultées restent visibles via le cache.

## Build production (APK / IPA)

```bash
npx expo prebuild        # projet natif (dossier android/ + ios/)
npx expo run:android      # compile + installe (Android SDK requis)
npx expo run:ios          # Xcode requis (macOS)
# ou EAS : npm i -g eas-cli && eas build -p android --profile preview
```

## Dépannage

- « Network request failed » : mauvais IP serveur ou PC hors Wi-Fi.
- 401 : token expiré (30 j) → reconnectez-vous.
- GPS fond iOS : Réglages iPhone → FieldOps → Position → Toujours.
