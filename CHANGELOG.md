# Historial de Cambios

## 13/08/2026

### Fix: Desactivar/Activar usuarios desde el panel de admin

**Problema:** Al hacer clic en "Activo/Inactivo" en la gestión de usuarios, el toast mostraba "Usuario actualizado exitosamente" pero el estado no cambiaba en la base de datos.

**Causa:** La política RLS `profiles_update_own` de Supabase solo permitía que cada usuario actualizara su propio perfil (`auth.uid() = id`). Un admin no podía actualizar el perfil de otro usuario.

**Solución:**
- Crear función SQL `admin_update_user(UUID, BIGINT, BIGINT, BOOLEAN)` con `SECURITY DEFINER` que bypass RLS
- Modificar `AdminRepository.updateUser()` en `src/features/admin/api/admin.repository.js` para llamar a esta función via `supabase.rpc("admin_update_user", ...)`
- Otorgar permisos `GRANT EXECUTE` a usuarios autenticados

**Archivos modificados:**
- `supabase-schema-complete.sql` — Nueva función `admin_update_user`
- `supabase-rpc-fix.sql` — Ya contenía la función (fue necesario ejecutarla)
- `src/features/admin/api/admin.repository.js` — `updateUser()` usa RPC en vez de `.update()`

---

### Función: Eliminar historial de citas (admin)

**Descripción:** El administrador puede eliminar todas las citas del sistema o las de una dependencia específica.

**Funcionalidad:**
- Botón rojo "Eliminar Historial" en Supervisión de Citas
- Si se filtra por dependencia, solo elimina las citas de esa dependencia
- Si no hay filtro, elimina todas las citas
- Pide confirmación antes de borrar
- Registra la acción en auditoría (`DELETE_ALL_APPOINTMENTS`)

**Archivos modificados:**
- `src/features/admin/api/admin.repository.js` — Nuevo método `deleteAllAppointments(adminId, dependencyId)`
- `src/features/admin/hooks/useAdmin.js` — Nueva función `deleteAllAppointments(dependencyId)`
- `src/features/admin/components/AppointmentSupervision.jsx` — Botón "Eliminar Historial" en header

---

### Función: Eliminar dependencias con citas asociadas

**Descripción:** Antes, no se podía eliminar una dependencia que tuviera citas. Ahora se puede: primero elimina las citas y luego la dependencia.

**Funcionalidad:**
- Si la dependencia tiene citas, muestra confirmación indicando cuántas citas se eliminarán
- Primero elimina todas las citas de esa dependencia
- Luego elimina la dependencia

**Archivos modificados:**
- `src/features/admin/components/AdminOverview.jsx` — Se agregó `deleteAllAppointments` al hook
- `src/features/admin/components/DependencyManagement.jsx` — `handleDelete()` ahora elimina citas primero si es necesario
