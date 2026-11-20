import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  return session;
}

export async function requireRole(min: "CLIENT" | "TECHNICIAN" | "DISPATCHER" | "MANAGER" | "ADMIN") {
  const { canRole } = await import("@/lib/auth-options");
  const session = await getServerSession(authOptions);
  const role = session?.user?.role as string | undefined;
  if (!session || !canRole(role, min)) return null;
  return session;
}

/** Portal scope: CLIENT users only see their own customer data. Returns null = no scope. */
export async function customerScope() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  const customerId = session?.user?.customerId ?? null;
  return { session, role, scopedCustomerId: role === "CLIENT" ? customerId : null };
}
