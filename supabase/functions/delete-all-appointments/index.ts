import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { adminId, dependencyId } = await req.json();

    if (!adminId) {
      return new Response(JSON.stringify({ error: "Missing adminId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get appointments to delete for audit log
    let query = supabase.from("appointments").select("*");
    if (dependencyId) query = query.eq("dependency_id", dependencyId);
    const { data: oldData, error: fetchError } = await query;

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete appointments
    let deleteQuery = supabase.from("appointments").delete();
    if (dependencyId) deleteQuery = deleteQuery.eq("dependency_id", dependencyId);
    const { error: deleteError } = await deleteQuery;

    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log audit action
    await supabase.from("audit_logs").insert({
      user_id: adminId,
      action: "DELETE_ALL_APPOINTMENTS",
      entity_type: "appointment",
      entity_id: dependencyId ? `dependency_${dependencyId}` : "all",
      old_data: { count: oldData?.length || 0 },
      new_data: null,
      user_agent: req.headers.get("user-agent"),
    });

    return new Response(JSON.stringify({ success: true, deleted: oldData?.length || 0 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});