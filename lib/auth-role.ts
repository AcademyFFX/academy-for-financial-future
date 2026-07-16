export type AffRole = "administrator" | "student" | "anonymous";

export type AdminRoleRow = {
  id?: string | null;
  role?: string | null;
  is_active?: boolean | null;
};

export function resolveAffRole(userId?: string | null, adminRow?: AdminRoleRow | null): AffRole {
  if (!userId) return "anonymous";
  return adminRow?.is_active === true ? "administrator" : "student";
}

export function isAdministratorRole(role: AffRole) {
  return role === "administrator";
}
