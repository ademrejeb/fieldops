"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  CalendarDays,
  Users,
  Building2,
  Boxes,
  Receipt,
  Settings2,
  Radio,
  Package,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/cn";
import { roleLabel } from "@/lib/roles";
import { BrandMark } from "@/components/ui/brand-mark";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: string[];
};

type NavGroup = { label: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    label: "Au quotidien",
    items: [
      { href: "/", label: "Vue d’ensemble", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "DISPATCHER"] },
      { href: "/tickets", label: "Interventions", icon: Ticket, roles: ["ADMIN", "MANAGER", "DISPATCHER", "TECHNICIAN", "CLIENT"] },
      { href: "/planning", label: "Planning", icon: CalendarDays, roles: ["ADMIN", "MANAGER", "DISPATCHER", "TECHNICIAN"] },
    ],
  },
  {
    label: "Gestion",
    items: [
      { href: "/technicians", label: "Techniciens", icon: Users, roles: ["ADMIN", "MANAGER", "DISPATCHER"] },
      { href: "/clients", label: "Clients", icon: Building2, roles: ["ADMIN", "MANAGER", "DISPATCHER"] },
      { href: "/assets", label: "Sites & équipements", icon: Package, roles: ["ADMIN", "MANAGER", "DISPATCHER", "TECHNICIAN"] },
      { href: "/inventory", label: "Stock", icon: Boxes, roles: ["ADMIN", "MANAGER", "DISPATCHER", "TECHNICIAN"] },
      { href: "/billing", label: "Facturation", icon: Receipt, roles: ["ADMIN", "MANAGER", "CLIENT"] },
    ],
  },
  {
    label: "Système",
    items: [
      { href: "/settings", label: "Réglages", icon: Settings2, roles: ["ADMIN", "MANAGER"] },
    ],
  },
];

/** Shared nav links used by both the desktop rail and the mobile drawer. */
export function NavLinks({ role, onNavigate }: { role: string; onNavigate?: () => void }) {
  const path = usePathname();

  return (
    <nav className="space-y-5" aria-label="Navigation principale">
      {GROUPS.map((group) => {
        const items = group.items.filter((item) => item.roles.includes(role));
        if (items.length === 0) return null;
        return (
          <div key={group.label}>
            <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {items.map((item) => {
                const active =
                  path === item.href || (item.href !== "/" && path.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1220]",
                      active
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px]",
                        active ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                      )}
                    />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const { data } = useSession();
  const role = (data?.user?.role ?? "DISPATCHER") as string;
  const tenantName = data?.user?.tenantName ?? "FieldOps";

  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col bg-[#0b1220] text-slate-300 lg:flex">
      <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
        <BrandMark size={36} />
        <div>
          <div className="text-[15px] font-bold tracking-tight text-white">FieldOps</div>
          <div className="flex items-center gap-1 text-[11.5px] text-slate-400">
            <Radio className="h-3 w-3 text-emerald-400" /> Gestion des interventions
          </div>
        </div>
      </div>

      <div className="mx-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
        <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          Entreprise
        </div>
        <div className="truncate text-[13.5px] font-semibold text-white">{tenantName}</div>
      </div>

      <div className="mt-5 flex-1 overflow-y-auto px-3">
        <NavLinks role={role} />
      </div>

      <div className="flex items-center gap-2.5 border-t border-white/10 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-[12px] font-bold text-white">
          {(data?.user?.name ?? "OP")
            .split(" ")
            .map((x: string) => x[0])
            .slice(0, 2)
            .join("")}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-white">
            {data?.user?.name ?? "Utilisateur"}
          </div>
          <div className="text-[12px] text-slate-400">{roleLabel(role)}</div>
        </div>
      </div>
    </aside>
  );
}
