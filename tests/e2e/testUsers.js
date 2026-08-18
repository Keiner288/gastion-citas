# Test Users para E2E

Este archivo contiene cuentas de prueba predefinidas para usar en tests E2E.

## Credenciales Predefinidas

### Usuario Standard (con verificación)
```
Email: test@test.com
Password: password123
```

### Usuario de Prueba (sin verificación)
```
Email: testnoverify@test.com
Password: password123
```

## Guía de Testing

### 1. Login E2E Tests

#### Formulario de Login
Verifica que el formulario de login se muestra correctamente.

#### Credenciales Inválidas
Prueba el comportamiento con credenciales incorrectas.

#### Credenciales Válidas (sin verificación)
**NUEVO** - Prueba con usuario estándar sin verificación para casos donde no necesitas pasar por verificación por correo.

#### Campos Requeridos
Valida que los campos son requeridos cuando el formulario se envía vacío.

#### Redirección de Registro
Verifica que el link al registro funciona.

### 2. Registro E2E Tests

#### Formulario de Registro
Inicia en el flujo de registro.

#### Validación E2E
Verifica que los errores mostrados son visibles.

#### Navegación de Login
El link desde el registro al login.

### 3. Recuperar Contraseña E2E Tests

#### Formulario de Recuperación
Inicia en el flujo de recuperación.

### Utilidad de Obtener Credenciales

```javascript
import { testUser } from './testUsers.js';

// Para tests E2E
const testUser = {
  email: "testnoverify@test.com",
  password: "password123"
};
```
