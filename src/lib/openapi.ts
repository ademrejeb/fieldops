/**
 * OpenAPI 3.1 specification for the FieldOps FSM API.
 *
 * Served as JSON at /api/openapi and rendered by Swagger UI at /docs.
 * Cookie session (next-auth) protects the web routes; mobile routes use a
 * Bearer API token; the GPS ingest endpoint authenticates with a tenant key.
 */

type Json = Record<string, unknown>;

const errorResponse: Json = {
  description: "Erreur",
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
};

function paginated(ref: string): Json {
  return {
    description: "OK",
    content: { "application/json": { schema: { type: "object", properties: { items: { type: "array", items: { $ref: ref } } } } } },
  };
}

export const openapi = {
  openapi: "3.1.0",
  info: {
    title: "FieldOps — Operations & FSM API",
    version: "1.0.0",
    description:
      "API REST du platform FieldOps (FSM / Suivi Total): intake omnicanal, dispatch IA, " +
      "exécution terrain, GPS, facturation. Multi-tenant, RBAC (CLIENT < TECHNICIAN < DISPATCHER < MANAGER < ADMIN).\n\n" +
      "**Authentification**\n" +
      "- Web (dashboard): cookie de session NextAuth — connectez-vous via `/login`.\n" +
      "- Mobile: `Authorization: Bearer <token>` obtenu via `POST /api/mobile/login`.\n" +
      "- GPS ingest: `?key=<tenantIngestKey>` (boîtiers traceurs).",
  },
  servers: [{ url: "/", description: "Serveur courant" }],
  tags: [
    { name: "Santé", description: "Sondes de disponibilité" },
    { name: "Auth & Mobile", description: "Session et API mobile technicien" },
    { name: "Tickets", description: "Intake et cycle de vie SAV" },
    { name: "Dispatch", description: "Planning et affectation IA" },
    { name: "Clients", description: "Comptes, contrats, sites" },
    { name: "Actifs", description: "Parc d'équipements" },
    { name: "Techniciens", description: "Équipe terrain" },
    { name: "Stock", description: "Pièces et emplacements" },
    { name: "Facturation", description: "Factures et paiements" },
    { name: "Temps réel", description: "Notifications, recherche, KPIs" },
    { name: "GPS", description: "Ingestion des positions traceurs" },
  ],
  components: {
    securitySchemes: {
      cookieAuth: { type: "apiKey", in: "cookie", name: "next-auth.session-token", description: "Session web NextAuth" },
      bearerAuth: { type: "http", scheme: "bearer", description: "Token API mobile (30 jours)" },
    },
    schemas: {
      Error: { type: "object", properties: { error: { type: "string" } }, required: ["error"] },
      Ok: { type: "object", properties: { ok: { type: "boolean" } } },
      ImportResult: {
        type: "object",
        properties: { created: { type: "integer" }, updated: { type: "integer" }, failed: { type: "integer" }, errors: { type: "array", items: { type: "string" } } },
      },
      Ticket: {
        type: "object",
        properties: {
          id: { type: "string" }, number: { type: "string", example: "TK-2026-0001" },
          title: { type: "string" }, description: { type: "string" },
          channel: { type: "string", enum: ["PHONE", "EMAIL", "PORTAL", "IOT", "WHATSAPP"] },
          priority: { type: "string", enum: ["P1_CRITICAL", "P2_HIGH", "P3_NORMAL", "P4_LOW"] },
          status: { type: "string", enum: ["NEW", "QUALIFIED", "SCHEDULED", "EN_ROUTE", "ON_SITE", "IN_PROGRESS", "RESOLVED", "INVOICED", "CLOSED", "CANCELLED"] },
          errorCode: { type: "string" }, aiConfidence: { type: "number" },
          slaDueAt: { type: "string", format: "date-time", nullable: true }, slaBreached: { type: "boolean" },
          customerId: { type: "string" }, assetId: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Customer: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, type: { type: "string" }, email: { type: "string" }, phone: { type: "string" }, address: { type: "string" } } },
      Site: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, address: { type: "string" }, lat: { type: "number" }, lng: { type: "number" }, accessCode: { type: "string" } } },
      Asset: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, serialNo: { type: "string" }, healthScore: { type: "integer" }, siteId: { type: "string" }, assetTypeId: { type: "string" } } },
      Technician: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, phone: { type: "string" }, email: { type: "string" }, deviceId: { type: "string" }, skills: { type: "array", items: { type: "string" } }, certifications: { type: "array", items: { type: "string" } }, status: { type: "string", enum: ["AVAILABLE", "ON_JOB", "OFFLINE"] }, lat: { type: "number" }, lng: { type: "number" }, rating: { type: "number" } } },
      InventoryItem: { type: "object", properties: { id: { type: "string" }, sku: { type: "string" }, name: { type: "string" }, location: { type: "string" }, qtyOnHand: { type: "integer" }, reorderPt: { type: "integer" }, unitPrice: { type: "integer", description: "centimes MAD" } } },
      Invoice: { type: "object", properties: { id: { type: "string" }, number: { type: "string" }, status: { type: "string", enum: ["DRAFT", "SENT", "PAID", "PARTIAL", "OVERDUE", "CANCELLED"] }, totalCents: { type: "integer" }, currency: { type: "string" }, dueAt: { type: "string", format: "date-time" } } },
      WorkOrder: { type: "object", properties: { id: { type: "string" }, number: { type: "string" }, jobType: { type: "string" }, status: { type: "string", enum: ["DRAFT", "ASSIGNED", "IN_PROGRESS", "DONE", "APPROVED", "CANCELLED"] }, ticketId: { type: "string" }, estimatedMin: { type: "integer" }, scheduledStart: { type: "string", format: "date-time", nullable: true } } },
      Notification: { type: "object", properties: { id: { type: "string" }, kind: { type: "string" }, severity: { type: "string", enum: ["critical", "high", "medium", "info"] }, title: { type: "string" }, detail: { type: "string" }, href: { type: "string" } } },
      Overview: { type: "object", properties: { tenant: { type: "object" }, open: { type: "integer" }, p1: { type: "integer" }, slaRisk: { type: "integer" }, techsOnline: { type: "integer" }, techsTotal: { type: "integer" }, resolved: { type: "integer" }, slaCompliance: { type: "integer" } } },
      Health: { type: "object", properties: { status: { type: "string", enum: ["ok", "degraded"] }, service: { type: "string" }, uptimeSec: { type: "integer" }, checks: { type: "object" } } },
      MobileLogin: { type: "object", properties: { token: { type: "string" }, expiresAt: { type: "string", format: "date-time" }, user: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, role: { type: "string" }, technicianId: { type: "string", nullable: true } } } } },
      Position: { type: "object", properties: { id: { type: "string" }, technician: { type: "string", nullable: true }, mapped: { type: "boolean" } } },
    },
  },
  security: [{ cookieAuth: [] }],
  paths: {
    "/api/health": {
      get: { tags: ["Santé"], summary: "Sonde de disponibilité", security: [], responses: { "200": { description: "Service OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Health" } } } }, "503": errorResponse } },
    },
    "/api/auth/csrf": {
      get: { tags: ["Auth & Mobile"], summary: "Jeton CSRF NextAuth", security: [], responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { csrfToken: { type: "string" } } } } } } } },
    },
    "/api/auth/callback/credentials": {
      post: { tags: ["Auth & Mobile"], summary: "Connexion (credentials)", description: "Rate-limited 8/min par IP.", security: [], requestBody: { required: true, content: { "application/x-www-form-urlencoded": { schema: { type: "object", properties: { email: { type: "string" }, password: { type: "string" }, csrfToken: { type: "string" }, json: { type: "string" } }, required: ["email", "password", "csrfToken"] } } } }, responses: { "200": { description: "Session créée (cookie posé)" }, "401": errorResponse } },
    },
    "/api/mobile/login": {
      post: { tags: ["Auth & Mobile"], summary: "Login mobile → token Bearer", security: [], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { email: { type: "string" }, password: { type: "string" } }, required: ["email", "password"] } } } }, responses: { "200": { description: "Token émis", content: { "application/json": { schema: { $ref: "#/components/schemas/MobileLogin" } } } }, "401": errorResponse, "429": errorResponse } },
      delete: { tags: ["Auth & Mobile"], summary: "Logout mobile (révoque le token)", responses: { "200": { description: "OK" } } },
    },
    "/api/tickets": {
      get: { tags: ["Tickets"], summary: "Lister les tickets", parameters: [ { name: "status", in: "query", schema: { type: "string" } }, { name: "priority", in: "query", schema: { type: "string" } }, { name: "q", in: "query", schema: { type: "string" } } ], responses: { "200": paginated("#/components/schemas/Ticket") } },
      post: { tags: ["Tickets"], summary: "Créer + qualifier (IA)", requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { customerId: { type: "string" }, assetId: { type: "string" }, title: { type: "string" }, description: { type: "string" }, priority: { type: "string" }, channel: { type: "string" }, errorCode: { type: "string" } }, required: ["customerId", "title"] } } } }, responses: { "200": { description: "Ticket créé", content: { "application/json": { schema: { type: "object", properties: { ticket: { $ref: "#/components/schemas/Ticket" } } } } } }, "422": errorResponse } },
    },
    "/api/tickets/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      get: { tags: ["Tickets"], summary: "Détail d'un ticket", responses: { "200": { description: "OK" }, "404": errorResponse } },
      patch: { tags: ["Tickets"], summary: "Mettre à jour un ticket", responses: { "200": { description: "OK" }, "404": errorResponse } },
      delete: { tags: ["Tickets"], summary: "Supprimer (MANAGER/ADMIN, statut initial)", responses: { "200": { description: "OK" }, "409": errorResponse } },
    },
    "/api/tickets/{id}/status": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      patch: { tags: ["Tickets"], summary: "Changer le statut (+ audit)", requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { status: { type: "string" }, actor: { type: "string" }, note: { type: "string" } }, required: ["status"] } } } }, responses: { "200": { description: "OK" } } },
    },
    "/api/dispatch/suggest": {
      get: { tags: ["Dispatch"], summary: "Classement IA des techniciens", parameters: [{ name: "ticketId", in: "query", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { ranked: { type: "array", items: { type: "object" } } } } } } } } },
    },
    "/api/workorders": {
      get: { tags: ["Dispatch"], summary: "Lister les ordres de travail", responses: { "200": paginated("#/components/schemas/WorkOrder") } },
      post: { tags: ["Dispatch"], summary: "Créer un ordre de travail + affecter", requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { ticketId: { type: "string" }, jobType: { type: "string" }, estimatedMin: { type: "integer" }, technicianIds: { type: "array", items: { type: "string" } } }, required: ["ticketId"] } } } }, responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { workOrder: { $ref: "#/components/schemas/WorkOrder" } } } } } } } },
    },
    "/api/customers": {
      get: { tags: ["Clients"], summary: "Lister les clients", responses: { "200": paginated("#/components/schemas/Customer") } },
      post: { tags: ["Clients"], summary: "Créer un client", responses: { "200": { description: "OK" } } },
    },
    "/api/customers/import": {
      post: { tags: ["Clients"], summary: "Import CSV/Excel (max 2000 lignes)", requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { rows: { type: "array", items: { type: "object" } } } } } } }, responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ImportResult" } } } } } },
    },
    "/api/customers/{id}": { parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], get: { tags: ["Clients"], summary: "Détail client", responses: { "200": { description: "OK" } } }, patch: { tags: ["Clients"], summary: "Modifier", responses: { "200": { description: "OK" } } }, delete: { tags: ["Clients"], summary: "Supprimer", responses: { "200": { description: "OK" }, "409": errorResponse } } },
    "/api/sites": {
      get: { tags: ["Clients"], summary: "Lister les sites", responses: { "200": paginated("#/components/schemas/Site") } },
      post: { tags: ["Clients"], summary: "Créer un site", responses: { "200": { description: "OK" } } },
    },
    "/api/sites/{id}": { parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], patch: { tags: ["Clients"], summary: "Modifier", responses: { "200": { description: "OK" } } }, delete: { tags: ["Clients"], summary: "Supprimer", responses: { "200": { description: "OK" }, "409": errorResponse } } },
    "/api/assets": {
      get: { tags: ["Actifs"], summary: "Lister les actifs", responses: { "200": paginated("#/components/schemas/Asset") } },
      post: { tags: ["Actifs"], summary: "Créer un actif", responses: { "200": { description: "OK" } } },
    },
    "/api/assets/import": { post: { tags: ["Actifs"], summary: "Import CSV/Excel", responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ImportResult" } } } } } } },
    "/api/assets/{id}": { parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], patch: { tags: ["Actifs"], summary: "Modifier", responses: { "200": { description: "OK" } } }, delete: { tags: ["Actifs"], summary: "Supprimer", responses: { "200": { description: "OK" }, "409": errorResponse } } },
    "/api/technicians": {
      get: { tags: ["Techniciens"], summary: "Lister les techniciens", responses: { "200": paginated("#/components/schemas/Technician") } },
      post: { tags: ["Techniciens"], summary: "Créer un technicien", responses: { "200": { description: "OK" } } },
    },
    "/api/technicians/import": { post: { tags: ["Techniciens"], summary: "Import CSV/Excel", responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ImportResult" } } } } } } },
    "/api/technicians/{id}": { parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], patch: { tags: ["Techniciens"], summary: "Modifier", responses: { "200": { description: "OK" } } }, delete: { tags: ["Techniciens"], summary: "Supprimer", responses: { "200": { description: "OK" }, "409": errorResponse } } },
    "/api/inventory": {
      get: { tags: ["Stock"], summary: "Lister les pièces", responses: { "200": paginated("#/components/schemas/InventoryItem") } },
      post: { tags: ["Stock"], summary: "Créer une pièce", responses: { "200": { description: "OK" } } },
    },
    "/api/inventory/import": { post: { tags: ["Stock"], summary: "Import CSV/Excel", responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ImportResult" } } } } } } },
    "/api/inventory/{id}": { parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], patch: { tags: ["Stock"], summary: "Modifier / ajuster le stock", responses: { "200": { description: "OK" } } }, delete: { tags: ["Stock"], summary: "Supprimer", responses: { "200": { description: "OK" }, "409": errorResponse } } },
    "/api/locations": {
      get: { tags: ["Stock"], summary: "Lister les emplacements", responses: { "200": { description: "OK" } } },
      post: { tags: ["Stock"], summary: "Créer un emplacement", responses: { "200": { description: "OK" } } },
    },
    "/api/locations/{id}": { parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], delete: { tags: ["Stock"], summary: "Supprimer", responses: { "200": { description: "OK" }, "409": errorResponse } } },
    "/api/billing": { get: { tags: ["Facturation"], summary: "Lister les factures", responses: { "200": paginated("#/components/schemas/Invoice") } } },
    "/api/invoices/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      get: { tags: ["Facturation"], summary: "Détail facture", responses: { "200": { description: "OK" } } },
      patch: { tags: ["Facturation"], summary: "Mettre à jour le statut", responses: { "200": { description: "OK" } } },
      delete: { tags: ["Facturation"], summary: "Supprimer (brouillon)", responses: { "200": { description: "OK" } } },
    },
    "/api/notifications": { get: { tags: ["Temps réel"], summary: "Alertes ops (SLA, P1, stock, retard)", responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { count: { type: "integer" }, items: { type: "array", items: { $ref: "#/components/schemas/Notification" } } } } } } } } } },
    "/api/search": { get: { tags: ["Temps réel"], summary: "Recherche globale groupée", parameters: [{ name: "q", in: "query", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { groups: { type: "array", items: { type: "object" } } } } } } } } } },
    "/api/overview": { get: { tags: ["Temps réel"], summary: "KPIs live du shell", responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Overview" } } } } } } },
    "/api/lookups": { get: { tags: ["Temps réel"], summary: "Listes de sélection (clients, actifs)", responses: { "200": { description: "OK" } } } },
    "/api/diagnostics": { get: { tags: ["Temps réel"], summary: "Suggestion diagnostic IA", parameters: [{ name: "code", in: "query", schema: { type: "string" } }, { name: "q", in: "query", schema: { type: "string" } }], responses: { "200": { description: "OK" } } } },
    "/api/settings/test-mail": { post: { tags: ["Temps réel"], summary: "Envoyer un email de test", requestBody: { content: { "application/json": { schema: { type: "object", properties: { to: { type: "string" } } } } } }, responses: { "200": { description: "OK" } } } },
    "/api/ingest/position": {
      get: { tags: ["GPS"], summary: "Ingest GPS (Traccar-style GET)", security: [], parameters: [ { name: "key", in: "query", required: true, schema: { type: "string" } }, { name: "id", in: "query", required: true, schema: { type: "string" }, description: "deviceId / IMEI" }, { name: "lat", in: "query", required: true, schema: { type: "number" } }, { name: "lon", in: "query", required: true, schema: { type: "number" } } ], responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Position" } } } }, "400": errorResponse, "401": errorResponse, "429": errorResponse } },
      post: {
        tags: ["GPS"], summary: "Ingest GPS (JSON ou CSV)", security: [],
        description: "Accepte un corps JSON `{key, deviceId, lat, lng, speed, battery}` ou du texte CSV `deviceId,lat,lng[,speed][,battery]`.",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { key: { type: "string" }, deviceId: { type: "string" }, lat: { type: "number" }, lng: { type: "number" }, speed: { type: "number" }, battery: { type: "number" } }, required: ["key", "deviceId", "lat", "lng"] } }, "text/plain": { schema: { type: "string", example: "VAN01-GPS,33.5731,-7.5898,42,87" } } } },
        responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Position" } } } }, "400": errorResponse, "401": errorResponse, "429": errorResponse },
      },
    },
    "/api/mobile/jobs": { get: { tags: ["Auth & Mobile"], summary: "Missions du technicien connecté", security: [{ bearerAuth: [] }], responses: { "200": paginated("#/components/schemas/WorkOrder"), "401": errorResponse } } },
    "/api/mobile/jobs/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      get: { tags: ["Auth & Mobile"], summary: "Détail mission", security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" }, "404": errorResponse } },
      patch: { tags: ["Auth & Mobile"], summary: "Avancer le statut (EN_ROUTE→…→DONE)", security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" } } },
    },
    "/api/mobile/jobs/{id}/checklist": { parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], post: { tags: ["Auth & Mobile"], summary: "Valider une étape de checklist", security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" } } } },
    "/api/mobile/jobs/{id}/parts": { parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], post: { tags: ["Auth & Mobile"], summary: "Consommer une pièce (décrémente le stock)", security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" }, "409": errorResponse } } },
    "/api/mobile/jobs/{id}/time": { parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], post: { tags: ["Auth & Mobile"], summary: "Enregistrer du temps", security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" } } } },
    "/api/mobile/jobs/{id}/report": { parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], post: { tags: ["Auth & Mobile"], summary: "Clôturer : rapport + signature + photos", security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" } } } },
    "/api/mobile/position": { post: { tags: ["Auth & Mobile"], summary: "Envoyer la position (app technicien)", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { lat: { type: "number" }, lng: { type: "number" }, speed: { type: "number" } }, required: ["lat", "lng"] } } } }, responses: { "200": { description: "OK" } } } },
    "/api/mobile/parts": { get: { tags: ["Auth & Mobile"], summary: "Catalogue pièces (recherche)", security: [{ bearerAuth: [] }], parameters: [{ name: "q", in: "query", schema: { type: "string" } }], responses: { "200": paginated("#/components/schemas/InventoryItem") } } },
  },
} as const;

export type OpenApiDoc = typeof openapi;
