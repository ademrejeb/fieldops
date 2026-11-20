import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

/** Typed error an API handler can throw; the route() wrapper turns it into a JSON response. */
export class ApiError extends Error {
  status: number;
  extra: Record<string, unknown>;
  constructor(message: string, status = 400, extra: Record<string, unknown> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.extra = extra;
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data as object, { status });
}

export function fail(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function zodMessage(err: ZodError) {
  return err.issues
    .map((i) => `${i.path.join(".") || "(racine)"} — ${i.message}`)
    .slice(0, 6)
    .join(" ; ");
}

/** Parse + validate a JSON body against a Zod schema. Throws ApiError(422) on failure. */
export async function readBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError("Corps JSON invalide.", 400);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new ApiError(`Données invalides : ${zodMessage(parsed.error)}`, 422);
  return parsed.data;
}

type Handler<Ctx> = (req: Request, ctx: Ctx) => Promise<Response> | Response;

/**
 * Wrap a route handler: centralises error → response mapping so every endpoint
 * shares one contract (thrown ApiError keeps its status, Zod → 422, else 500).
 */
export function route<Ctx = unknown>(fn: Handler<Ctx>): Handler<Ctx> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof ApiError) return fail(e.message, e.status, e.extra);
      if (e instanceof ZodError) return fail(`Données invalides : ${zodMessage(e)}`, 422);
      console.error("[api-error]", e instanceof Error ? e.stack ?? e.message : e);
      return fail("Erreur serveur. L’incident a été journalisé.", 500);
    }
  };
}
