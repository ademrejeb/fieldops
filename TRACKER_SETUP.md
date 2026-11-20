# GPS Tracker Setup — Vans (toutes marques)

Comment ça marche (ton intuition est bonne) : chaque boîtier GPS a une carte SIM
et un **code unique** (IMEI / ID). Il envoie régulièrement
`code + latitude + longitude` à un serveur. Notre endpoint accepte ces messages,
retrouve le technicien par son `deviceId`, et la carte affiche la camionnette
en direct. Le dispatch IA utilise ces positions pour l’ETA.

## 1. Clé d’ingestion

Chaque tenant a une clé (`settings.ingestKey`). La voir :

```bash
# via la base (dev)
node -e "const {PrismaBetterSqlite3}=require('@prisma/adapter-better-sqlite3');..."
# plus simple: elle est créée au seed — vérifiez la table Tenant.settings
```

## 2. Associer un boîtier à un technicien

Techniciens → Modifier → champ **Code traceur GPS** (ex: `VAN01-GPS`, ou l’IMEI
réel `865123456789012`). Les positions reçues avec ce code mettent à jour
sa position live + statut.

## 3. Formats acceptés (un seul endpoint)

```
POST/GET https://VOTRE-DOMAINE/api/ingest/position
```

| Source | Exemple |
|---|---|
| JSON universel | `{"key":"trk_…","deviceId":"VAN01-GPS","lat":33.57,"lng":-7.58,"speed":42,"battery":87}` |
| Style Traccar (GET) | `?key=trk_…&id=VAN01-GPS&lat=33.57&lon=-7.58` |
| CSV brut (boîtiers simples) | corps texte : `VAN01-GPS,33.5731,-7.5898,42,87` |

Alias reconnus : `id|device|imei|code` → identifiant · `lon|long|longitude` →
longitude · `spd|batt`. Réponse : `{ok, technician, mapped}`.

## 4. Boîtiers testés / compatibles

- **Traccar** (recommandé, gratuit) : installez le serveur Traccar, ajoutez vos
  boîtiers (supporte 2000+ modèles : Teltonika, TK103/Coban, Ruptela…), puis
  activez le **forward** vers notre URL ci-dessus. Traccar normalise tout.
- **Teltonika (FMBxxx)** : configurateur → GPRS → Domain = votre domaine,
  Port 443, protocole HTTP/JSON vers `/api/ingest/position`.
- **TK103/Coban (SMS/GPRS low-cost)** : configurez le GPRS vers Traccar
  (protocole `tk103`), puis forward comme ci-dessus.
- **Application mobile FieldOps** (`mobile/`) : envoie déjà ce format avec le
  token du technicien — zéro config.

## 5. Test sans matériel (simulateur)

```bash
KEY=trk_VOTRE_CLE
# Yassine roule vers Maârif
curl -X POST http://localhost:3000/api/ingest/position \
  -H "Content-Type: application/json" \
  -d "{\"key\":\"$KEY\",\"deviceId\":\"VAN01-GPS\",\"lat\":33.5812,\"lng\":-7.6011,\"speed\":38,\"battery\":92}"
# → la carte du Centre de pilotage affiche le nouveau point + "GPS il y a …"
```

## 6. Fréquence conseillée

- Urbain dense : toutes les **2–5 min** (ou 200 m).
- L’app mobile envoie toutes les **5 min** en tâche de fond (réglable).
- Les positions sont conservées (table `Position`) → historique par technicien.
