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
    const { appointmentId, professionalId } = await req.json();

    if (!appointmentId || !professionalId) {
      return new Response(JSON.stringify({ error: "Missing appointmentId or professionalId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get old data for audit log
    const { data: oldData, error: fetchError } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", appointmentId)
      .single();

    if (fetchError || !oldData) {
      return new Response(JSON.stringify({ error: "Cita no encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already assigned to someone else
    if (oldData.professional_id && oldData.professional_id !== professionalId) {
      return new Response(JSON.stringify({ error: "La cita ya está asignada a otro profesional" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update appointment - assign professional
    const { data: newData, error: updateError } = await supabase
      .from("appointments")
      .update({ professional_id: professionalId, updated_at: new Date().toISOString() })
      .eq("id", appointmentId)
      .select()
      .single();

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log audit action
    await supabase.from("audit_logs").insert({
      user_id: professionalId,
      action: "TAKE_APPOINTMENT",
      entity_type: "appointment",
      entity_id: appointmentId,
      old_data: oldData,
      new_data: newData,
      user_agent: req.headers.get("user-agent"),
    });

    return new Response(JSON.stringify({ success: true, appointment: newData }), {
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