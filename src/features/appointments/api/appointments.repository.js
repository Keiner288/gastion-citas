import { supabase } from "../../../lib/supabase";

// CLASE Repository: encapsula todo el acceso a datos de citas
// Principio SOLID: Dependency Inversion (dependemos de abstracciones)
export class AppointmentRepository {
  // CREATE: Crear nueva cita
  static async create(appointmentData) {
    const { data, error } = await supabase
      .from("appointments")
      .insert([appointmentData])
      .select(
        `
        *,
        dependencies (name, color),
        profiles!professional_id (full_name)
      `,
      )
      .single();

    if (error) throw new Error(`Error creando cita: ${error.message}`);
    return data;
  }

  // READ: Obtener citas según filtros (RLS se encarga de seguridad)
  static async fetch({ userId, dependencyId, professionalId, status, dateFrom, dateTo, search, documentNumber, fullName }) {
    let query = supabase.from("appointments").select(`
        *,
        dependencies (name, color),
        profiles!user_id (full_name, document_number),
        professional:profiles!professional_id (full_name)
      `);

    // Filtros dinámicos
    if (userId) query = query.eq("user_id", userId);
    if (dependencyId) query = query.eq("dependency_id", dependencyId);
    if (professionalId) query = query.eq("professional_id", professionalId);
    if (status) query = query.eq("status", status);
    if (dateFrom) query = query.gte("scheduled_date", dateFrom);
    if (dateTo) query = query.lte("scheduled_date", dateTo);

    // Filtros de búsqueda en perfil del aprendiz
    if (search) {
      query = query.or(`profiles!user_id.full_name.ilike.%${search}%,profiles!user_id.document_number.ilike.%${search}%`);
    } else {
      if (documentNumber) query = query.ilike("profiles!user_id.document_number", `%${documentNumber}%`);
      if (fullName) query = query.ilike("profiles!user_id.full_name", `%${fullName}%`);
    }

    // Ordenar por fecha y hora
    query = query
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true });

    const { data, error } = await query;
    if (error) throw new Error(`Error fetching citas: ${error.message}`);
    return data || [];
  }

  // UPDATE: Actualizar estado o notas
  static async update(id, updates) {
    const { data, error } = await supabase
      .from("appointments")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) throw new Error(error.message);
    return data;
  }

  // TAKE APPOINTMENT: Profesional se auto-asigna una cita (usa Edge Function para bypass RLS)
  static async takeAppointment(appointmentId, professionalId) {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/take-appointment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ appointmentId, professionalId }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Error tomando cita");
    return result.appointment;
  }

  // DELETE: Eliminar una cita
  static async remove(id) {
    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id);

    if (error) throw new Error(`Error eliminando cita: ${error.message}`);
    return true;
  }

  // CHECK AVAILABILITY: Verificar si horario está libre
  static async checkAvailability(dependencyId, date, time, excludeId = null) {
    let query = supabase
      .from("appointments")
      .select("id")
      .eq("dependency_id", dependencyId)
      .eq("scheduled_date", date)
      .eq("scheduled_time", time)
      .in("status", ["pending", "confirmed"]);

    if (excludeId) query = query.neq("id", excludeId);

    const { data, error } = await query;
    if (error) throw error;
    return data.length === 0; // true = disponible
  }

  // COUNT TOTAL: Contar TODAS las citas de un usuario (límite de 2)
  static async countTotal(userId) {
    const { count, error } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) throw error;
    return count;
  }

  // COUNT PENDING: Contar citas pendientes de un usuario
  static async countPending(userId) {
    const { count, error } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "pending");

    if (error) throw error;
    return count;
  }

  // FETCH APPRENTICE HISTORY: Obtener historial de un aprendiz en una dependencia
  static async fetchApprenticeHistory(userId, dependencyId) {
    let query = supabase
      .from("appointments")
      .select(`
        *,
        dependencies (name, color),
        profiles!user_id (full_name, document_number),
        professional:profiles!professional_id (full_name)
      `)
      .eq("user_id", userId);

    if (dependencyId) query = query.eq("dependency_id", dependencyId);

    const { data, error } = await query
      .order("scheduled_date", { ascending: false })
      .order("scheduled_time", { ascending: false });

    if (error) throw new Error(`Error fetching historial: ${error.message}`);
    return data || [];
  }
}
