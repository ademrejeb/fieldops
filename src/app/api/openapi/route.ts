import { openapi } from "@/lib/openapi";

export const dynamic = "force-static";

/** Machine-readable OpenAPI 3.1 document. Rendered as Swagger UI at /docs. */
export function GET() {
  return Response.json(openapi, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
