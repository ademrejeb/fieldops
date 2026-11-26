import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";

import bcrypt from "bcryptjs";

function createClient() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  if (url.startsWith("postgres")) {
    return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  }
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: url.replace(/^file:/, "") }) });
}

const db = createClient();

async function main() {
  const tenant = await db.tenant.upsert({
    where: { slug: "demo-casablanca" },
    update: {},
    create: {
      name: "Casablanca FieldOps",
      slug: "demo-casablanca",
      industry: "ELEVATOR_HVAC",
      locale: "fr-MA",
      settings: { currency: "MAD", timezone: "Africa/Casablanca" },
    },
  });

  // SLA policies
  const slaSeed = [
    { priority: "P1_CRITICAL" as const, tier: "GOLD" as const, responseH: 2, resolveH: 8 },
    { priority: "P1_CRITICAL" as const, tier: "SILVER" as const, responseH: 4, resolveH: 12 },
    { priority: "P2_HIGH" as const, tier: "GOLD" as const, responseH: 4, resolveH: 24 },
    { priority: "P2_HIGH" as const, tier: "SILVER" as const, responseH: 8, resolveH: 48 },
    { priority: "P3_NORMAL" as const, tier: "SILVER" as const, responseH: 24, resolveH: 72 },
  ];
  for (const s of slaSeed) {
    await db.slaPolicy.upsert({
      where: {
        tenantId_priority_tier: { tenantId: tenant.id, priority: s.priority, tier: s.tier },
      },
      update: {},
      create: { tenantId: tenant.id, name: `${s.priority}/${s.tier}`, ...s },
    });
  }

  // Users + technicians (RBAC demo — password: FieldOps123!)
  const passwordH = await bcrypt.hash("FieldOps123!", 10);
  const demoUsers = [
    { email: "dispatch@fieldops.ma", name: "Salma Dispatch", role: "DISPATCHER" as const },
    { email: "manager@fieldops.ma", name: "Omar Manager", role: "MANAGER" as const },
    { email: "tech@fieldops.ma", name: "Yassine El Amrani", role: "TECHNICIAN" as const },
    { email: "mehdi@fieldops.ma", name: "Mehdi Bennani", role: "TECHNICIAN" as const },
    { email: "khadija@fieldops.ma", name: "Khadija Tazi", role: "TECHNICIAN" as const },
    { email: "client@anfa.ma", name: "M. Berrada (Client)", role: "CLIENT" as const },
    { email: "admin@fieldops.ma", name: "Admin Sys", role: "ADMIN" as const },
  ];
  for (const u of demoUsers) {
    await db.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: u.email } },
      update: { passwordH, role: u.role, active: true },
      create: { tenantId: tenant.id, email: u.email, name: u.name, role: u.role, passwordH },
    });
  }

  const techs = [
    { name: "Yassine El Amrani", phone: "+212 6 61 00 00 01", email: "tech@fieldops.ma", deviceId: "VAN01-GPS", skills: ["ELEVATOR", "DOOR_SYSTEM"], certifications: ["KONE_L2"], lat: 33.5731, lng: -7.5898, status: "AVAILABLE" },
    { name: "Mehdi Bennani", phone: "+212 6 62 00 00 02", email: "mehdi@fieldops.ma", deviceId: "VAN02-GPS", skills: ["HVAC_VRV", "ELECTRICAL"], certifications: ["DAIKIN_P"], lat: 33.595, lng: -7.62, status: "ON_JOB" },
    { name: "Khadija Tazi", phone: "+212 6 63 00 00 03", email: "khadija@fieldops.ma", deviceId: "", skills: ["SECURITY_CCTV", "ACCESS"], certifications: ["HIKVISION"], lat: 33.56, lng: -7.57, status: "AVAILABLE" },
  ];
  for (const t of techs) {
    const exists = await db.technician.findFirst({ where: { tenantId: tenant.id, name: t.name } });
    if (exists) await db.technician.update({ where: { id: exists.id }, data: { email: t.email, deviceId: t.deviceId, lat: t.lat, lng: t.lng } });
    else await db.technician.create({ data: { tenantId: tenant.id, ...t } });
  }

  // Stock locations (depots + vans) — the single source for every location input
  const yassine = await db.technician.findFirst({ where: { tenantId: tenant.id, name: { contains: "Yassine" } } });
  const locs = [
    { name: "MAIN", label: "Dépôt principal — Casablanca", kind: "DEPOT", technicianId: null as string | null },
    { name: "VAN-01", label: "Camionnette Yassine", kind: "VAN", technicianId: yassine?.id ?? null },
    { name: "VAN-02", label: "Camionnette Mehdi", kind: "VAN", technicianId: null as string | null },
  ];
  for (const l of locs) {
    await db.stockLocation.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: l.name } },
      update: { label: l.label, kind: l.kind, technicianId: l.technicianId },
      create: { tenantId: tenant.id, ...l },
    });
  }

  // Asset types
  const elevatorType = await db.assetType.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Elevator KONE MonoSpace" } },
    update: {},
    create: { tenantId: tenant.id, name: "Elevator KONE MonoSpace", category: "ELEVATOR", schemaJson: { floors: "number", loadKg: "number" } },
  });
  const hvacType = await db.assetType.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "HVAC Daikin VRV" } },
    update: {},
    create: { tenantId: tenant.id, name: "HVAC Daikin VRV", category: "HVAC", schemaJson: { refrigerant: "string", zones: "number" } },
  });

  // Checklist
  const checklist = await db.checklistTemplate.upsert({
    where: { tenantId_name_version: { tenantId: tenant.id, name: "Elevator P1 Safety Check", version: 1 } },
    update: {},
    create: {
      tenantId: tenant.id, name: "Elevator P1 Safety Check", category: "ELEVATOR",
      steps: [
        { key: "power", label: "Cut power + lockout", type: "check", required: true },
        { key: "door", label: "Door sensor + sill cleaning", type: "check", required: true },
        { key: "photo_before", label: "Photo before repair", type: "photo", required: true },
        { key: "error", label: "Error code cleared?", type: "text", required: true },
        { key: "photo_after", label: "Photo after repair", type: "photo", required: true },
      ],
    },
  });

  // Customers + sites + assets
  const custA = await db.customer.upsert({
    where: { id: "seed-cust-a" },
    update: {},
    create: { id: "seed-cust-a", tenantId: tenant.id, name: "AnfaPark Mall", type: "B2B", phone: "+212 5 22 00 00 00", address: "Bd d'Anfa, Casablanca" },
  });
  const custB = await db.customer.upsert({
    where: { id: "seed-cust-b" },
    update: {},
    create: { id: "seed-cust-b", tenantId: tenant.id, name: "Clinique Al Manar", type: "B2B", phone: "+212 5 22 11 11 11", address: "Maârif, Casablanca" },
  });

  let siteA = await db.site.findFirst({ where: { customerId: custA.id } });
  if (!siteA) siteA = await db.site.create({ data: { customerId: custA.id, name: "AnfaPark — Tour A", address: "Bd d'Anfa", city: "Casablanca", lat: 33.5731, lng: -7.5898, contactName: "M. Berrada", contactPhone: "+212 6 60 00 00 00" } });
  let siteB = await db.site.findFirst({ where: { customerId: custB.id } });
  if (!siteB) siteB = await db.site.create({ data: { customerId: custB.id, name: "Clinique — Bloc B", address: "Maârif", city: "Casablanca", lat: 33.585, lng: -7.61, contactName: "Dr. Chraibi", contactPhone: "+212 6 61 11 11 11" } });

  const asset1 = await db.asset.upsert({
    where: { tenantId_serialNo: { tenantId: tenant.id, serialNo: "KONE-MS-0042" } },
    update: {},
    create: { tenantId: tenant.id, siteId: siteA.id, assetTypeId: elevatorType.id, serialNo: "KONE-MS-0042", name: "Ascenseur Tour A — N°2", installDate: new Date("2021-03-14"), healthScore: 62, customData: { floors: 12, loadKg: 1000 } },
  });
  const asset2 = await db.asset.upsert({
    where: { tenantId_serialNo: { tenantId: tenant.id, serialNo: "DKN-VRV-118" } },
    update: {},
    create: { tenantId: tenant.id, siteId: siteB.id, assetTypeId: hvacType.id, serialNo: "DKN-VRV-118", name: "VRV Bloc opératoire", installDate: new Date("2022-06-01"), healthScore: 81, customData: { refrigerant: "R410A", zones: 8 } },
  });

  const contract = await db.contract.findFirst({ where: { tenantId: tenant.id, customerId: custA.id } })
    ?? await db.contract.create({ data: { tenantId: tenant.id, customerId: custA.id, tier: "GOLD", slaResponseH: 2, slaResolveH: 8, billingTerms: "NET_30" } });

  // Inventory
  const parts = [
    { sku: "KONE-SENS-DOOR", name: "Door sensor KONE", qtyOnHand: 24, unitPrice: 85000, location: "MAIN" },
    { sku: "DKN-FILTER-VRV", name: "Filtre VRV Daikin", qtyOnHand: 60, unitPrice: 19000, location: "MAIN" },
    { sku: "CABLE-HARNESS-X", name: "Harness X elevator", qtyOnHand: 12, unitPrice: 43000, location: "VAN-01" },
  ];
  for (const p of parts) {
    await db.inventoryItem.upsert({
      where: { tenantId_sku: { tenantId: tenant.id, sku: p.sku } },
      update: { qtyOnHand: p.qtyOnHand },
      create: { tenantId: tenant.id, ...p },
    });
  }

  // Tickets (Suivi Total demo)
  const count = await db.ticket.count({ where: { tenantId: tenant.id } });
  if (count === 0) {
    const t1 = await db.ticket.create({
      data: {
        tenantId: tenant.id, number: `TK-${new Date().getFullYear()}-0001`,
        customerId: custA.id, assetId: asset1.id, contractId: contract.id,
        channel: "PHONE", priority: "P1_CRITICAL", status: "ON_SITE",
        title: "Ascenseur bloqué — pers. à l'intérieur (Tour A N°2)",
        description: "Client signale E30 + porte bloquée au niveau 4. Technicien sur site.",
        errorCode: "E30", aiSummary: "Door sensor fault (78% hist. fix: sill clean + harness)", aiConfidence: 0.87,
        slaDueAt: new Date(Date.now() + 2 * 3600e3),
        events: { create: [{ actor: "system", action: "CREATED", detail: "Phone intake + transcription" }, { actor: "salma", action: "STATUS_CHANGED", fromStatus: "NEW", toStatus: "ON_SITE", detail: "Assigned Yassine" }] },
      },
    });
    const wo1 = await db.workOrder.create({
      data: { tenantId: tenant.id, ticketId: t1.id, number: `WO-${new Date().getFullYear()}-0001`, jobType: "REPAIR", status: "ON_SITE", scheduledStart: new Date(), estimatedMin: 90, checklistId: checklist.id, requiredSkills: ["ELEVATOR"] },
    });
    const yassine = await db.technician.findFirst({ where: { tenantId: tenant.id, name: { contains: "Yassine" } } });
    if (yassine) await db.assignment.create({ data: { workOrderId: wo1.id, technicianId: yassine.id, etaMin: 18 } });

    await db.ticket.create({
      data: {
        tenantId: tenant.id, number: `TK-${new Date().getFullYear()}-0002`,
        customerId: custB.id, assetId: asset2.id, channel: "IOT", priority: "P2_HIGH", status: "SCHEDULED",
        title: "VRV — surchauffe + débit faible (alerte IoT)",
        description: "IoT: temp refoulement 48°C, vibration anormale. Préventif recommandé.",
        errorCode: "U4", aiSummary: "Likely clogged filter / fan fault", aiConfidence: 0.74,
        slaDueAt: new Date(Date.now() + 8 * 3600e3),
        events: { create: [{ actor: "iot", action: "CREATED", detail: "MQTT alert DKN-VRV-118" }] },
      },
    });
  }

  console.log("Seed OK:", tenant.slug);

  // Ingest key for GPS trackers (per tenant, in settings JSON)
  const settings = (tenant.settings ?? {}) as Record<string, unknown>;
  if (!settings.ingestKey) {
    const { randomBytes } = await import("crypto");
    await db.tenant.update({
      where: { id: tenant.id },
      data: { settings: { ...settings, ingestKey: `trk_${randomBytes(16).toString("hex")}` } },
    });
    console.log("Ingest key created (see tenant settings)");
  }

  // ---- Role links (portal scoping) ----
  const clientUser = await db.user.findFirst({ where: { tenantId: tenant.id, email: "client@anfa.ma" } });
  if (clientUser) await db.user.update({ where: { id: clientUser.id }, data: { customerId: custA.id } });
  const techUser = await db.user.findFirst({ where: { tenantId: tenant.id, email: "tech@fieldops.ma" } });
  const yassineTech = await db.technician.findFirst({ where: { tenantId: tenant.id, name: { contains: "Yassine" } } });
  if (techUser && yassineTech && !yassineTech.userId) {
    await db.technician.update({ where: { id: yassineTech.id }, data: { userId: techUser.id } });
  }
  for (const email of ["mehdi@fieldops.ma", "khadija@fieldops.ma"]) {
    const login = await db.user.findFirst({ where: { tenantId: tenant.id, email } });
    const tech = await db.technician.findFirst({ where: { tenantId: tenant.id, email } });
    if (login && tech && !tech.userId) {
      await db.technician.update({ where: { id: tech.id }, data: { userId: login.id } });
    }
  }
  console.log("Role links OK");
}

main().finally(() => db.$disconnect());
