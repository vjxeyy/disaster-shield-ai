import { connection } from "next/server";
import { APP_NAME } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/data/backend";
import { getRiskModel } from "@/lib/risk";

export async function GET() {
  await connection(); // evaluate at request time so it reflects the deployed environment
  const model = getRiskModel();
  return Response.json({
    status: "ok",
    app: APP_NAME,
    dataMode: isSupabaseConfigured() ? "supabase" : "demo",
    riskModel: `${model.id}@${model.version}`,
    serviceRoleConfigured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    time: new Date().toISOString(),
  });
}
