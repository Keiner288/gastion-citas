# Usuarios de Prueba (para Testing)

## Descripción General

Esta sección documenta los usuarios de prueba disponibles para testing, incluyendo aquellas con verificación de correo deshabilitada para pruebas rápidas.

## Tipos de Usuarios de Prueba

### 1. Usuarios Estándar (con verificación de correo)

```javascript
{
  email: "test@test.com",
  password: "password",
  fullName: "Test User",
  roleId: 6,
  document_number: "12345678",
  dependency_id: null
}
```

- **Retorna:** Usuario normal creado con verificación de correo
- **Tiempo de creación:** Requiere verificación por correo
- **Caso de uso:** Testing básico de flujos de autenticación completos

### 2. Usuarios de Prueba (sin verificación de correo) - NUEVO

```javascript
{
  email: "testnoverify@test.com",
  password: "password",
  fullName: "Test No Verify",
  roleId: 6,
  document_number: "87654321",
  dependency_id: null
}
```

- **Retorna:** Usuario creado instantáneamente sin verificación de correo
- **Tiempo de creación:** Inmediato
- **Caso de uso:** Testing rápido de componentes UI, escenarios con sesión iniciada, flujos de prueba de gran escala

## APIs Disponibles

### En `src/features/admin/api/admin.repository.js`

#### `AdminRepository.createUser()`
Standard user creation with email confirmation (comportamiento por defecto)

#### `AdminRepository.createTestUserWithoutVerification()`
**NUEVO** - Crea un usuario de prueba sin verificación de correo:
```javascript
static async createTestUserWithoutVerification({ email, password, fullName, roleId, dependencyId }, adminId) {
  // Crea usuario con email_confirm: false
  // Retorna perfil del usuario
}
```

### En `src/features/auth/utils/testUserCreator.js`

#### `createTestUserWithoutVerification(email, password, userData = {})`
**NUEVO** - Función de conveniencia standalone:
```javascript
export async function createTestUserWithoutVerification(email, password, userData = {}) {
  // Crea usuario directamente sin verificación de correo
  // Retorna resultado con éxito/ error
}
```

## Utilitarios de Testing

### Usuarios Predefinidos

| Email | Contraseña | Rol | Dependencia |
|-------|----------|-----|------------|
| `test@test.com` | `password` | Aprendiz (6) | Sin dependencia |
| `testnoverify@test.com` | `password` | Aprendiz (6) | Sin dependencia |

## Ejemplos de Uso

### 1. Usar en pruebas E2E (Playwright)

```javascript
// En archivo de test E2E
import { expect } from "@playwright/test";

test("Crear usuario sin verificación para testing rápido", async ({ page }) => {
  // Navegar a panel admin
  await page.goto("/admin/usuarios/nuevo");
  
  // Rellenar formulario
  await page.fill('[data-testid="email"]', "testnoverify@test.com");
  await page.fill('[data-testid="password"]', "password");
  await page.fill('[data-testid="full-name"]', "Test No Verify");
  
  // Seleccionar rol
  await page.selectOption('[data-testid="role"]', "6");
  
  // Crear usuario (sin verificación)
  await page.click('[data-testid="submit-btn"]');
  
  // Verificar que el usuario fue creado instantáneamente
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
});
```

### 2. Usar en pruebas Unitarias (Vitest)

```javascript
import { supabaseMock } from "../../../mocks/supabase.mock";
import { AdminRepository } from "../admin.repository";

describe("createTestUserWithoutVerification", () => {
  it("crea usuario instantáneamente sin verificación de correo", async () => {
    const userData = {
      email: "testnoverify@test.com",
      password: "password",
      fullName: "Test No Verify",
      roleId: 6,
    };
    
    // Llamar método directamente
    const result = await AdminRepository.createTestUserWithoutVerification(userData, "admin-id");
    
    // Verificar que fue creado
    expect(result).toMatchObject({
      email: "testnoverify@test.com",
      full_name: "Test No Verify",
    });
    
    // Verificar llamada a Supabase
    expect(supabaseMock.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "testnoverify@test.com",
        email_confirm: false, // Clave: sin verificación
      })
    );
  });
});
```

### 3. Usar con `createTestUserWithoutVerification()` standalone

```javascript
import { createTestUserWithoutVerification } from "../../features/auth/utils/testUserCreator";

async function setupTestData() {
  // Limpiar database
  await cleanupTestUsers();
  
  // Crear usuario de prueba en la base de datos directamente
  const testUser = await createTestUserWithoutVerification(
    "testnoverify@test.com",
    "password",
    {
      full_name: "Test No Verify",
      document_number: "87654321",
      role_id: 6,
    }
  );
  
  console.log("✅ Test user created:", testUser.data.user.id);
  return testUser.data.user;
}
```

## Beneficios

### Velocidad
- **Usuario estándar:** +30 segundos (verificación por correo)
- **Usuario sin verificación:** 0 segundos (instantáneo)

### Casos de Uso

| Escenario | Tipo Recomendado |
|----------|------------------|
| Onboarding UI | Usuario sin verificación |
| Testing de componentes | Usuario sin verificación |
| Testing de flujo completo | Usuario estándar |
| Generación masiva de datos | Usuario sin verificación |

### Flexibilidad
- Funciona con cualquier rol (de aprendíz a admin)
- Soporta dependencias profesionales
- Reutilizable en tests E2E y Unitarios
- Compatible con mocks existentes

## Nota Técnica

El usuario es creado usando la misma ruta de autenticación que usuarios estándar pero con `email_confirm: false` en la llamada `auth.admin.createUser()`. Esto saltea el paso de verificación por correo, ideal para:

- Tests de CI/CD que necesitan datos de prueba instantáneos
- Pruebas de estrés con múltiples usuarios
- Testing rápido en desarrollo
- Escenarios donde la verificación por correo no es requerida

## Seguridad

⚠️ **Advertencia:** Estos usuarios deben ser evitados en:
- Ambientes de producción
- Bases de código de clientes
- Escenarios de sandbox público

Estos son **únicamente para testing** y deben ser:
- Borrados después de cada test de CI/CD
- No deben ser usados en environments cliente
- Eliminados regularmente en sistemas de testing compartidos

## Próximos Pasos Recomendados

1. **Para tests E2E:** Usar en flujos de login/mass creation
2. **Para tests unitarios:** Integrar en setup/teardown de tests
3. **Para CI/CD:** Agregar a scripts de setup de testing
4. **Para desarrollo:** Usar en scenarios de testing rápido

La implementación está lista para ser usada en todos los environments de testing.