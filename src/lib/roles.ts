/** Human-readable role names (avoid internal codes in the interface). */
export const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrateur",
  MANAGER: "Responsable",
  DISPATCHER: "Répartiteur",
  TECHNICIAN: "Technicien",
  CLIENT: "Client",
};

export function roleLabel(role: string | undefined | null): string {
  return (role && ROLE_LABEL[role]) || "Utilisateur";
}
