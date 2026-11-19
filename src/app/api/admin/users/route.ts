/**
 * POST /api/admin/users — create a staff/resident account (Supabase mode only).
 *
 * Server-side authorisation: the caller's Supabase access token is verified and their profile
 * must have role = 'admin' before the service-role key is used. The service-role key never
 * reaches the browser.
 */
import { createClient } from "@supabase/supabase-js";
import type { UserInput } from "@/lib/types";
import { hasErrors, validateUser } from "@/lib/validation";

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) {
    return Response.json({ error: "Supabase is not configured on the server (demo mode)." }, { status: 501 });
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Missing access token" }, { status: 401 });

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: caller, error: callerErr } = await admin.auth.getUser(token);
  if (callerErr || !caller.user) return Response.json({ error: "Invalid session" }, { status: 401 });

  const { data: profile } = await admin.from("profiles").select("role, active").eq("id", caller.user.id).single();
  if (!profile || profile.role !== "admin" || !profile.active) {
    return Response.json({ error: "Only administrators can create accounts" }, { status: 403 });
  }

  let input: UserInput;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const errors = validateUser(input);
  if (hasErrors(errors)) return Response.json({ error: Object.values(errors).find(Boolean), fields: errors }, { status: 400 });

  const { data: created, error: createErr } = await admin.auth.admin.inviteUserByEmail(input.email.trim().toLowerCase(), {
    data: { full_name: input.name.trim(), phone: input.phone.trim() },
  });
  if (createErr || !created.user) return Response.json({ error: createErr?.message ?? "Could not create user" }, { status: 400 });

  const { data: row, error: updErr } = await admin
    .from("profiles")
    .update({ role: input.role, zone_id: input.zoneId ?? null, team_id: input.role === "rescue" ? input.teamId : null, full_name: input.name.trim(), phone: input.phone.trim() })
    .eq("id", created.user.id)
    .select()
    .single();
  if (updErr) return Response.json({ error: updErr.message }, { status: 400 });

  return Response.json({
    user: {
      id: row.id,
      name: row.full_name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      zoneId: row.zone_id,
      teamId: row.team_id,
      active: row.active,
      createdAt: row.created_at,
    },
  });
}
