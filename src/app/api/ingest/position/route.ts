import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenantByIngestKey } from "@/lib/mobile-auth";
import { clientKey, LIMITS, rateLimit } from "@/lib/rate-limit";

/**
 * Universal GPS ingest — one endpoint for every tracker type.
 *
 * Recommended: point your tracker platform (Traccar, Kreuzung, Teltonika server)
 * at this URL with forward enabled — they all normalize to lat/lon.
 *
 * Accepted shapes (auth via ?key= or {"key":...} — tenant ingest key):
 *  1. JSON:      {"key":"trk_…","deviceId":"VAN01-GPS","lat":33.57,"lng":-7.58,"speed":42,"battery":87}
 *  2. Query GET: ?key=…&id=VAN01-GPS&lat=33.57&lon=-7.58   (Traccar-style)
 *  3. CSV text:  VAN01-GPS,33.5731,-7.5898,42,87            (device,lat,lng[,speed][,battery])
 * Aliases: id|device|imei|code → deviceId · lon|long|longitude → lng · lat|latitude · spd → speed · batt → battery.
 */

type Parsed = { deviceId: string; lat: number; lng: number; speed: number; battery: number; at: Date; source: string };

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function pick(o: Record<string, unknown>, ...keys: string[]) {
  for (const k of keys) {
    for (const ok of Object.keys(o)) {
      if (ok.toLowerCase() === k.toLowerCase()) return o[ok];
    }
  }
  return undefined;
}

function parseAll(url: URL, body: unknown, contentType: string): { key: string; data: Parsed | null; error?: string } {
  const q = (k: string) => url.searchParams.get(k) ?? undefined;
  let key = q("key") ?? "";
  let raw: Record<string, unknown> | null = null;
  let csv: string[] | null = null;

  if (body && typeof body === "object" && !Array.isArray(body)) {
    raw = body as Record<string, unknown>;
    if (typeof raw.key === "string") key = raw.key;
  } else if (typeof body === "string" && body.trim()) {
    if (body.includes("{")) {
      try { raw = JSON.parse(body); if (typeof raw?.key === "string") key = raw.key as string; } catch { /* fallthrough */ }
    } else {
      csv = body.trim().split(/[,\s;]+/);
    }
  }
  if (!raw && !csv) {
    raw = {};
    for (const [k, v] of url.searchParams.entries()) raw[k] = v;
  }

  let deviceId = "", lat: number | null = null, lng: number | null = null;
  let speed = 0, battery = 0, source = "gps", at = new Date();

  if (csv) {
    // device,lat,lng[,speed][,battery]
    deviceId = (csv[0] ?? "").replace(/^["']|["']$/g, "");
    lat = num(csv[1]); lng = num(csv[2]);
    speed = num(csv[3]) ?? 0; battery = num(csv[4]) ?? 0;
    source = "tracker";
  } else if (raw) {
    deviceId = String(pick(raw, "deviceId", "device", "id", "imei", "code", "tracker") ?? "");
    lat = num(pick(raw, "lat", "latitude"));
    lng = num(pick(raw, "lng", "lon", "long", "longitude"));
    speed = num(pick(raw, "speed", "spd")) ?? 0;
    battery = num(pick(raw, "battery", "batt")) ?? 0;
    const s = pick(raw, "source");
    if (typeof s === "string" && s) source = s;
    const t = pick(raw, "at", "time", "timestamp", "fixtime");
    if (typeof t === "string" || typeof t === "number") {
      const d = new Date(t);
      if (!isNaN(d.getTime())) at = d;
    }
    void contentType;
  }

  if (!deviceId) return { key, data: null, error: "deviceId manquant (id/device/imei)" };
  if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { key, data: null, error: "lat/lng invalides" };
  }
  return { key, data: { deviceId, lat, lng, speed, battery, at, source } };
}

async function handle(req: Request) {
  // Trackers are chatty; allow a generous but bounded rate per source IP.
  if (!rateLimit(clientKey(req, "ingest"), LIMITS.ingest.limit, LIMITS.ingest.windowMs).ok) {
    return NextResponse.json({ ok: false, error: "rate limit" }, { status: 429 });
  }
  const url = new URL(req.url);
  let body: unknown = null;
  if (req.method === "POST") {
    const ct = req.headers.get("content-type") ?? "";
    try {
      body = ct.includes("json") ? await req.json() : await req.text();
    } catch { body = null; }
  }
  const { key, data, error } = parseAll(url, body, req.headers.get("content-type") ?? "");
  if (!data) return NextResponse.json({ ok: false, error }, { status: 400 });

  const tenant = await tenantByIngestKey(key);
  if (!tenant) return NextResponse.json({ ok: false, error: "clé invalide (key)" }, { status: 401 });

  const tech = await db.technician.findFirst({ where: { tenantId: tenant.id, deviceId: data.deviceId } });
  const pos = await db.position.create({
    data: {
      tenantId: tenant.id,
      technicianId: tech?.id ?? null,
      deviceId: data.deviceId,
      lat: data.lat, lng: data.lng,
      speed: Math.round(data.speed), battery: Math.round(data.battery),
      recordedAt: data.at, source: data.source,
    },
  });
  // Live map follows fresh GPS: update tech base position
  if (tech) await db.technician.update({ where: { id: tech.id }, data: { lat: data.lat, lng: data.lng, status: "ON_JOB" } });

  return NextResponse.json({ ok: true, id: pos.id, technician: tech?.name ?? null, mapped: Boolean(tech) });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
