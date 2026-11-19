/**
 * Role-based permission matrix.
 *
 * This single matrix is used by:
 *  - the UI (to show/hide navigation and actions),
 *  - the demo data layer (every mutation calls `authorize` before changing data), and
 *  - mirrors the Supabase Row Level Security policies + RPC checks in
 *    /supabase/migrations/0001_init.sql, which are the real server-side enforcement
 *    when Supabase is configured.
 */
import type { Role, SOSRequest, UserProfile } from "../types";

export const PERMISSIONS = {
  "dashboard:view": ["official", "admin"],
  "riskmap:view": ["resident", "official", "rescue", "admin"],
  "risk:simulate": ["official", "admin"],
  "resident:portal": ["resident"],
  "sos:create": ["resident", "official", "admin"],
  "sos:view_all": ["official", "admin"],
  "sos:view_assigned": ["rescue"],
  "sos:assign": ["official", "admin"],
  "sos:update_status": ["official", "rescue", "admin"],
  "rescue:view": ["official", "rescue", "admin"],
  "report:create": ["resident", "official", "rescue", "admin"],
  "report:verify": ["official", "admin"],
  "alert:manage": ["official", "admin"],
  "shelter:view_admin": ["official", "rescue", "admin"],
  "shelter:update_occupancy": ["official", "admin"],
  "shelter:manage": ["admin"],
  "team:manage": ["admin"],
  "team:update_status": ["official", "admin"],
  "users:manage": ["admin"],
  "system:manage": ["admin"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function authorize(user: UserProfile | null | undefined, permission: Permission): asserts user is UserProfile {
  if (!user || !user.active) throw new AuthorizationError("You must be signed in with an active account.");
  if (!can(user.role, permission)) {
    throw new AuthorizationError(`Your role (${user.role}) is not permitted to perform this action.`);
  }
}

/** Rescue teams may only update requests assigned to their own team. */
export function canUpdateSOS(user: UserProfile | null | undefined, sos: SOSRequest): boolean {
  if (!user || !user.active) return false;
  if (user.role === "official" || user.role === "admin") return true;
  if (user.role === "rescue") return !!user.teamId && sos.assignedTeamId === user.teamId;
  return false;
}

/** Default landing route for each role after sign-in. */
export const ROLE_HOME: Record<Role, string> = {
  resident: "/resident",
  official: "/dashboard",
  rescue: "/rescue",
  admin: "/dashboard",
};
