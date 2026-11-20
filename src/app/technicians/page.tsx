import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { Card } from "@/components/ui/primitives";
import { ConfirmDelete } from "@/components/ux/confirm";
import { SearchInput } from "@/components/ux/search-input";
import { ExportButtons } from "@/components/ux/export-buttons";
import { ImportButton } from "@/components/ux/import-button";
import { FilterBar, FilterSelect } from "@/components/ux/filter-bar";
import { TechButton } from "./tech-actions";

export const dynamic = "force-dynamic";

export default async function TechniciansPage({ searchParams }: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const tenant = await getTenant();
  const query = sp.q ?? "";
  const status = sp.status ?? "";
  const sort = sp.sort ?? "name";
  const techs = await db.technician.findMany({
    where: {
      tenantId: tenant.id,
      ...(status ? { status } : {}),
      ...(query ? { OR: [{ name: { contains: query } }, { phone: { contains: query } }] } : {}),
    },
    include: { assignments: { include: { workOrder: { include: { ticket: true } } } } },
    orderBy: sort === "status" ? { status: "asc" } : { name: "asc" },
  });
  if (sort === "missions") techs.sort((a, b) => b.assignments.length - a.assignments.length);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Techniciens ({techs.length})</h1>
          <p className="text-[14px] text-slate-600 dark:text-slate-300">Compétences, disponibilité et missions de l’équipe.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons
            filename="techniciens"
            fetchUrl={`/api/technicians${status || query ? `?${new URLSearchParams({ ...(status ? { status } : {}), ...(query ? { q: query } : {}) })}` : ""}`}
            columns={[
              { key: "name", label: "Nom" }, { key: "phone", label: "Téléphone" },
              { key: "email", label: "Email" }, { key: "deviceId", label: "Traceur" },
              { key: "skills", label: "Compétences", kind: "list" },
              { key: "certifications", label: "Certifications", kind: "list" },
              { key: "status", label: "Statut" },
            ]}
          />
          <ImportButton uploadUrl="/api/technicians/import" label="Techniciens" templateHeaders={["Nom", "Téléphone", "Email", "Traceur", "Compétences", "Certifications", "Statut"]} />
          <TechButton />
        </div>
      </div>

      <FilterBar>
        <SearchInput placeholder="Rechercher nom, téléphone…" />
        <FilterSelect param="status" value={status} placeholder="Tous statuts"
          options={[{ value: "AVAILABLE", label: "Disponibles" }, { value: "ON_JOB", label: "En mission" }, { value: "OFFLINE", label: "Hors ligne" }]} />
        <FilterSelect param="sort" value={sort} placeholder="Tri: Nom"
          options={[{ value: "name", label: "Tri: Nom" }, { value: "status", label: "Tri: Statut" }, { value: "missions", label: "Tri: Charge" }]} />
      </FilterBar>

      {techs.length === 0 && (
        <Card className="p-10 text-center text-[13px] text-slate-500 dark:text-slate-400">Aucun technicien sur ce filtre.</Card>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {techs.map((t) => (
          <Card key={t.id} className="p-4 transition-shadow hover:shadow-md dark:hover:shadow-none dark:hover:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-[13px] font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                {t.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[14px] font-bold">{t.name}</div>
                <div className="truncate text-[12px] text-slate-500 dark:text-slate-400">{t.phone || "—"}{t.email && ` · ${t.email}`}</div>
                {t.deviceId && <div className="font-mono text-[11.5px] text-slate-400 dark:text-slate-500">📡 {t.deviceId}</div>}
              </div>
              <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-bold ${t.status === "ON_JOB" ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" : t.status === "OFFLINE" ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"}`}>
                {t.status === "ON_JOB" ? "En mission" : t.status === "OFFLINE" ? "Hors ligne" : "Disponible"}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(Array.isArray(t.skills) ? (t.skills as string[]) : []).map((s) => <span key={s} className="rounded bg-blue-50 px-2 py-0.5 text-[11.5px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{s}</span>)}
              {(Array.isArray(t.certifications) ? (t.certifications as string[]) : []).map((s) => <span key={s} className="rounded bg-violet-50 px-2 py-0.5 text-[11.5px] font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">🎓 {s}</span>)}
            </div>
            <div className="mt-2 text-[12.5px] text-slate-500 dark:text-slate-400">
              Missions: <b className="text-slate-800 dark:text-slate-200">{t.assignments.length}</b> · Note {t.rating.toFixed(1)}/5
              {t.assignments[0] && <span> · sur <b>{t.assignments[0].workOrder.ticket.number}</b></span>}
            </div>
            <div className="mt-3 flex gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
              <TechButton tech={{ id: t.id, name: t.name, phone: t.phone, email: t.email, deviceId: t.deviceId, skills: Array.isArray(t.skills) ? t.skills as string[] : [], certifications: Array.isArray(t.certifications) ? t.certifications as string[] : [], status: t.status, lat: t.lat, lng: t.lng }} />
              <ConfirmDelete url={`/api/technicians/${t.id}`} label={t.name} small />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
