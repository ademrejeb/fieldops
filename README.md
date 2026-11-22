# FieldOps — Intelligent Operations & FSM Platform (Suivi Total)

Production-grade starter: Next.js 16 + React 19 + Prisma 7 + SQLite (dev) → Postgres (prod).

## Stack (latest)
- **Web:** Next.js 16, React 19, Tailwind CSS v4, lucide-react, zod
- **DB:** Prisma 7 + driver adapters (`better-sqlite3` dev / `pg` prod) — 1-line switch
- **Seed:** Casablanca demo tenant (elevator P1 + HVAC IoT alert, 3 techs, stock, SLA Gold/Silver)

## Run now
```bash
npm install
npm run db:setup        # push schema (SQLite) + seed demo
npm run dev             # → http://localhost:3000
```

Key routes: `/login` (JWT credentials) · `/` Command Center · `/tickets` · `/tickets/[id]` Suivi Total timeline ·
`/tickets/new` · `/planning` dispatch IA · `/technicians` · `/assets` · `/clients` ·
`/inventory` · `/billing` WO→facture · `/settings` no-code config.

## Temps réel ops
- **Cloche notifications** (topbar): SLA < 4h, P1 sans ordre de travail, tickets
  non qualifiés > 2h, stock à réassortir, factures en retard — badge non-lus,
  rafraîchi toutes les minutes (`/api/notifications`).
- **Recherche globale** (topbar): tickets, actifs, clients, techniciens, factures
  groupés + navigation clavier (`/api/search`).
- **Carte live**: les techniciens bougent sur OpenStreetMap dès qu’une position
  GPS arrive (traceur ou app mobile), avec « GPS il y a X min ».

## Suivi GPS + app mobile
- **Boîtiers** (`TRACKER_SETUP.md`): un seul endpoint `/api/ingest/position`
  accepte JSON, GET type Traccar (`?id=&lat=&lon=`) et CSV brut — Teltonika,
  TK103 (via Traccar en passerelle), ou direct. Clé par tenant, mapping par
  `deviceId` (champ fiche technicien), positions live + historique.
- **App mobile** (`mobile/`, Expo) : login token 30 j, Mes missions, exécution
  (statuts, checklist, pièces décrémentées, temps, photos, signature au doigt,
  clôture → RESOLVED), file offline + cache, **GPS de fond toutes les 5 min**.
  API token : `/api/mobile/*` (login, jobs, checklist, parts, time, report,
  position, parts). Démarrage : voir `mobile/README.md`.

## Dispatch IA (AI Agent Factory)

Le bouton **Dispatch IA** d’une intervention appelle un agent publié de la
Factory (`POST /api/v1/agents/{id}/runs` avec une clé `agents:run`). L’agent
charge le contexte réel du ticket (techniciens, compétences, distances, charge,
SLA) via `POST /api/agents/dispatch-context` protégé par
`AGENT_CONTEXT_SECRET`, choisit un technicien et renvoie un JSON. FieldOps
affiche le résumé, les raisons, la confiance et le run Factory ; si l’agent
échoue, le classement déterministe reste le repli.

Variables :

```bash
FACTORY_GATEWAY_URL="https://agent-factory-api-xxxx.onrender.com"
FACTORY_WEB_URL="https://factory-web-xxxx.onrender.com"
FACTORY_AGENT_ID="agent_..."
FACTORY_AGENT_KEY="aaf_..."        # clé client scope agents:run
AGENT_CONTEXT_SECRET="..."         # même valeur dans le secret de l’agent
```

LLM gratuit : la Factory accepte tout endpoint OpenAI-compatible. Deux options
sans carte bancaire :

- **Ollama local + tunnel Cloudflare** : `ollama serve`, puis
  `cloudflared tunnel --url http://127.0.0.1:11434`, et connectez
  `https://<tunnel>.trycloudflare.com/v1` (modèle installé). Le tunnel doit
  rester ouvert pendant la démo.
- **Pollinations** : `https://text.pollinations.ai/openai`, modèle
  `openai-fast`, sans clé. Le tier anonyme limite à une réponse toutes les 45 s
  par IP ; FieldOps bascule alors sur le classement déterministe.

Changer de modèle = éditer la connexion dans la Factory, puis republier l’agent.

## Auth + RBAC (NextAuth credentials + JWT)
- Login: `/login` — demo password for all accounts: `FieldOps123!`
- Accounts: `dispatch@fieldops.ma` (Dispatcher) · `manager@fieldops.ma` (Manager) ·
  `tech@fieldops.ma` (Technician) · `client@anfa.ma` (Client) · `admin@fieldops.ma` (Admin)
- Middleware protects everything except `/login` + `/api/auth/*`.
- API guards: `POST /tickets` ≥ CLIENT · `PATCH status` ≥ TECHNICIAN ·
  `POST /workorders` ≥ DISPATCHER · `POST /billing` ≥ MANAGER.
- Sidebar/topbar are role-aware (client sees tickets + billing only).
- Sessions are stateless JWT (12h) — works behind any replica, SQLite or Postgres.

## Basacore SSO (optionnel)
Le bouton **Continuer avec Basacore** apparaît dès que `BASACORE_CLIENT_ID` et
`BASACORE_CLIENT_SECRET` sont renseignés. La connexion locale par mot de passe
reste disponible pour les comptes démo.

1. Dans **Basacore Console → Products → `<produit>` → Integration**, créez un
   login client (confidential, PKCE requis) avec l’URI de redirection exacte :
   `http://localhost:3000/api/auth/callback/basacore` (et
   `http://localhost:3010/...` si vous testez sur un autre port).
2. Renseignez `.env` :
   ```bash
   BASACORE_ISSUER="http://localhost:8000"
   BASACORE_CLIENT_ID="basa_..."
   BASACORE_CLIENT_SECRET="bsc_..."
   BASACORE_TENANT_HINT="northwind-sales"
   BASACORE_TENANT_MAP="northwind-sales=demo-casablanca"
   ```
3. Au premier login, l’utilisateur local est provisionné à la volée dans le
   tenant mappé (`passwordH` vide : le provider credentials ne peut pas
   l’authentifier). Les rôles Basacore sont mappés vers `ADMIN / MANAGER /
   DISPATCHER / TECHNICIAN / CLIENT` ; un compte local existant conserve son
   rôle.
4. Les tokens Basacore restent dans le JWT NextAuth chiffré, côté serveur. Le
   refresh token est utilisé automatiquement quand l’access token approche de
   l’expiration. La session n’expose que les claims non sensibles (rôles,
   permissions, tenant, expiration).
- Fichiers : `src/lib/basacore.ts` (provider, provisioning, refresh),
  `src/lib/auth-options.ts` (callbacks), `/settings` (carte d’identité).

APIs: `/api/stats` `/api/tickets` `/api/tickets/[id]/status` `/api/workorders`
`/api/billing` `/api/lookups` · Intelligence: `/api/dispatch/suggest?ticketId=` (ranked techs) ·
`/api/diagnostics?code=E30&q=` (KB + history).

## SQLite → Postgres (no code change)
See `DATABASE_SWITCH.md`. Summary:
1. `prisma/schema.prisma`: `provider = "postgresql"`
2. `.env`: `DATABASE_URL="postgresql://fsm:fsm_secret@db:5432/fsm?schema=public"`
3. `npx prisma migrate dev --name init_pg && npm run db:seed`

`src/lib/db.ts` auto-selects the pg adapter for `postgres*` URLs.

## Opérations quotidiennes (penser comme l’utilisateur)
- **Filtres compacts:** une seule barre (recherche + menus déroulants) sur chaque page —
  jamais de mur de pastilles, même avec 100+ techniciens ou types d’actifs.
- **Tri partout:** en-têtes de tableau cliquables (N°, priorité, SLA, stock, prix,
  santé, total…) + tris Nom/Charge/Tickets sur les cartes.
- **Vraie carte terrain:** OpenStreetMap avec techniciens + sites (positions réelles
  modifiables). Le dispatch IA calcule ETA/distances sur ces points.
- **Positions configurables:** chaque site et technicien a sa position GPS (clic sur
  carte + champs numériques). Fini les coordonnées en dur.
- **Emplacements réels:** Dépôts + camionnettes gérés dans Stock → Emplacements
  (affectation camionnette ↔ technicien, suppression protégée). Les fiches pièces
  et l’import n’acceptent que ces valeurs (+ création auto à l’import).
- **Notifications mail:** chaque assignation prévient le technicien (client, site,
  code d’accès, horaire, lien ticket + trace NOTIFIED sur la timeline). Sans SMTP:
  aperçu dans les logs. Test d’envoi depuis Configuration.
- **Ajouter / Modifier / Supprimer** sur Clients (+ leurs Sites), Techniciens,
  Actifs, Stock (avec −/+ direct), Factures (statuts + suppression brouillon),
  Tickets (suppression manager si non démarré). Suppressions protégées (409 si lié).
- **Import / Export masse:** boutons CSV + Excel sur chaque référentiel; import
  CSV/XLSX avec modèle téléchargeable, upsert intelligent (email / tél / série /
  SKU), rapport créé/mis à jour/erreurs ligne par ligne.
- **Rôles utiles:** Client → portail (ses tickets + factures, redirection auto);
  Technicien → planning filtré sur ses missions; Manager → facturation + suppressions.

## Intelligence layer (no external AI dependency)
- **Dispatch scoring** (`src/lib/dispatch.ts` — pure, tested): skills 40% · ETA/proximité
  30% (boosté en P1) · disponibilité/charge 20% · note 10%. Haversine + ETA urbain
  (`src/lib/geo.ts`). API → top-5 avec score, ETA, raisons, éligibilité.
  Branché sur: fiche ticket (SuggestAssign 1-clic), Planning (scores live par ticket).
- **Diagnostics** (`src/lib/diagnostics-kb.ts` — RAG-ready): KB curée E30/U4/F-12
  (causes, steps, pièces, confiance, source manuelle). `diagnose()` → exact →
  fuzzy → symptômes → générique. Intake auto-remplit `aiSummary` + confiance;
  fiche ticket affiche guide + pièces + nb cas similaires; intake montre un
  preview live. Plus tard: swap interne avec pgvector/LLM, même type retour.

## API & documentation
- Spec **OpenAPI 3.1** générée dans `src/lib/openapi.ts` (42 chemins, tags par domaine).
- `GET /api/openapi` → JSON machine-readable · `GET /docs` → **Swagger UI** (essai-requête
  intégré, `Authorize` pour cookie/Bearer/clé GPS).
- Auth: cookie de session NextAuth (web) · `Authorization: Bearer` (mobile) · `?key=` (ingest GPS).

## Robustesse & sécurité
- **Contrat d'API unique**: `route()` (`src/lib/api.ts`) mappe `ApiError` → statut, Zod → 422, sinon 500.
- **Rate limiting** (`src/lib/rate-limit.ts`): login 8/min par IP, ingest 240/min, mobile 10/min.
  Anti-énumération par coût constant (`DUMMY_HASH`).
- **Validation d'environnement** (`src/lib/env.ts`) + sonde `GET /api/health`.
- **En-têtes de sécurité** (`next.config.ts`): CSP (prod), HSTS, nosniff, frame-ancestors, Permissions-Policy.
- **Error boundaries** App Router: `error.tsx`, `global-error.tsx`, `not-found.tsx`, `loading.tsx`.

## Thème
- Mode **clair/sombre** persistant (toggle topbar), défaut = préférence système, sans flash
  (script inline dans `layout.tsx`). Variante Tailwind v4 `dark` pilotée par la classe `.dark`.

## Prod
```bash
docker compose up --build
# or: npm run build && npm start (set DATABASE_URL to Postgres)
```

## Why it doesn't look "vibe-coded"
- Dense ops tables (11px uppercase headers), status/priority pill system, dark navy
  sidebar like ServiceTitan/Jobber, Inter + tabular numbers, live SLA risk rail,
  map + Gantt placeholders wired to real data, full audit timeline per ticket.

## Dispatch IA (AI Agent Factory)

Le bouton **Dispatch IA** du ticket appelle `POST /api/agents/dispatch`. Le service
calcule des métriques réelles par technicien (compétences, ETA trafic, charge, note,
missions terminées, temps moyen de résolution, fraîcheur GPS), puis délègue le choix à
un agent LangGraph publié dans AI Agent Factory.

Architecture :

```text
Ticket UI → /api/agents/dispatch
              ├─ classement déterministe (src/lib/dispatch.ts) — toujours disponible
              ├─ Factory gateway /agents/{id}/runs
              │     └─ HTTP → /api/agents/dispatch-context (secret partagé)
              │     └─ LLM → choix parmi les candidats réels
              └─ validation de l'id → WorkOrder + Assignment + AuditEvent
```

L'IA ne peut choisir qu'un technicien du tenant et de la liste classée. Toute réponse
invalide, lente ou indisponible retombe sur le classement déterministe : le dispatch
n'est jamais bloqué par le modèle.

Variables (voir `.env.example`) :

| Variable | Rôle |
| --- | --- |
| `FACTORY_GATEWAY_URL` | URL de l'API AI Agent Factory |
| `FACTORY_AGENT_ID` | Agent dispatch publié |
| `FACTORY_AGENT_KEY` | Clé client `agents:run` |
| `AGENT_CONTEXT_SECRET` | Secret partagé avec l'agent (Bearer) |

Créer l'agent : AI Agent Factory → Agents → New agent → **Start from the ticketing
template** → URL Ticketing + `AGENT_CONTEXT_SECRET`, puis tester et publier. Sans
configuration Factory, le bouton applique uniquement le classement déterministe.

La page **Réglages** affiche l'état réel de l'intégration (configurée, joignable,
agent id) et un lien vers la Factory. Si l'agent a été créé puis publié dans la
Factory, renseignez `FACTORY_AGENT_ID` et `FACTORY_AGENT_KEY` (clé cliente
`agents:run`). La Factory peut aussi provisionner l'agent au démarrage avec
`BOOTSTRAP_TICKETING_*` ; dans ce cas, récupérez l'agent id dans la Factory et
créez la clé cliente une seule fois.
