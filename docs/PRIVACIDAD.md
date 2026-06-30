# Privacidad y Seguridad

Puente de Vida está diseñado con privacidad y seguridad como ejes centrales, especialmente para la protección de datos sensibles en contextos de emergencia humanitaria.

---

## Principios

1. **Mínimo necesario**: solo se recolectan los datos estrictamente necesarios para la coordinación de emergencias.
2. **Cifrado en reposo**: los datos sensibles se cifran localmente en el dispositivo del usuario.
3. **Control de acceso por roles**: cada usuario ve solo la información que necesita según su rol.
4. **Trazabilidad**: cada acceso y cambio a un reporte queda registrado con operador y timestamp.
5. **Protección de menores**: los datos de niños, niñas y adolescentes reciben protección adicional automática.
6. **Sin datos a terceros**: la verificación de identidad usa fuentes públicas (CNE) sin enviar datos a intermediarios.

---

## Cifrado de datos locales (IndexedDB)

Toda la información sensible almacenada en el navegador se cifra con **AES-256-GCM**:

| Campo                         | Cifrado |
| ----------------------------- | ------- |
| Nombre del reportante         | Sí      |
| Teléfono del reportante       | Sí      |
| Texto del reporte             | Sí      |
| Dirección / ubicación textual | Sí      |
| Foto (data URL)               | Sí      |

- La clave de cifrado se deriva del token de sesión mediante **PBKDF2** con 600.000 iteraciones y salt.
- La clave **nunca se persiste en disco**: solo existe en memoria mientras el usuario está logueado.
- Al cerrar sesión o la pestaña, la clave se destruye.
- Si no hay sesión activa, los datos se almacenan sin cifrar (modo ciudadano, solo lectura pública mínima).

---

## Autenticación y sesiones

- Las contraseñas se almacenan con **scrypt + salt** en la base de datos.
- Los tokens de sesión usan **randomBytes(32)** y expiran a las **24 horas**.
- Las sesiones se transmiten como **httpOnly cookies** (inaccesibles desde JavaScript) + header `Authorization` para compatibilidad.
- El login tiene **rate limiting**: 5 intentos por minuto por IP.
- Los intentos fallidos se registran en `audit_log` con IP y motivo.
- Todas las comparaciones de contraseñas y tokens usan **timingSafeEqual** para prevenir ataques de temporización.

---

## Control de acceso por roles

| Rol            | Acceso                                                                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sin sesión** | Solo datos mínimos: tipo, prioridad, estado, fecha. Sin nombres, teléfonos, direcciones ni fotos.                                               |
| **viewer**     | Datos con campos sensibles truncados: teléfono enmascarado (0412****123), nombre con inicial, dirección a nivel de ciudad/parroquia. Sin fotos. |
| **operator**   | Datos completos. Puede clasificar reportes, asignar equipos, gestionar inventario.                                                              |
| **admin**      | Acceso total + gestión de usuarios, configuración de proveedores, auditoría.                                                                    |

---

## Protección de menores

Cuando un reporte involucra a un menor de edad (< 18 años o detectado por heurística en el texto):

- El campo `is_minor` se marca automáticamente.
- Para roles viewer y anónimos: se oculta la ubicación exacta, el nombre completo y cualquier detalle identificatorio.
- Se agrega el flag `_minor_protected: true` en la respuesta.
- La detección usa tanto el campo `age` (si fue proporcionado) como heurística de texto (palabras clave: niño, niña, menor, bebé, infante, adolescente).

---

## Cédulas de identidad

- Las cédulas siempre se muestran enmascaradas: `V-17****208`.
- Solo los primeros 2 y últimos 3 dígitos son visibles.
- Esto aplica a todos los roles, incluyendo admin.

---

## Verificación de identidad (CNE)

El registro de operadores ofrece verificación opcional contra el **Consejo Nacional Electoral (CNE)**:

- **Fuente**: API pública del CNE (`http://www.cne.gob.ve/web/registro_electoral/ce.php`).
- **Qué se envía**: solo número de cédula y nacionalidad (V/E).
- **Qué se recibe**: nombre completo registrado en el CNE.
- **Costo**: gratuito.
- **Privacidad**: no se envían datos a intermediarios ni a servicios de terceros. La consulta es directamente al sitio público del CNE.
- **Fallback**: si el CNE no responde (timeout 8s), el registro continúa sin verificación. El operador queda marcado como `verified: false`.
- La verificación es **best-effort** y no bloquea el registro.

---

## Registro de operadores

Los operadores se registran con:

1. **Cédula de identidad** (formato V/E + número).
2. **Código de invitación** de su organización (generado por el admin).
3. **Nombre de usuario y contraseña**.

El flujo completo:

```
Admin crea organización
  → sistema genera código de invitación (8 caracteres, ej: B4V-A7K2)
  → admin entrega el código al operador (por WhatsApp, teléfono, etc.)
  → operador ingresa cédula + código + usuario + contraseña
  → sistema verifica código contra la organización
  → (opcional) verifica cédula contra CNE
  → operador creado con rol operator, asociado a organización
```

---

## Consentimiento del reportante

- Todo reporte ingresado por un ciudadano presupone **consentimiento tácito** para su uso en la coordinación de emergencias, basado en el interés vital y la urgencia humanitaria.
- El formulario de reporte incluye un aviso visible: _"Al enviar este reporte, autoriza el uso de sus datos para fines de coordinación de emergencias. Puede solicitar su eliminación en cualquier momento contactando a la organización coordinadora."_
- Los datos no se utilizan para fines distintos a los declarados (coordinación de emergencias, búsqueda y rescate, asistencia humanitaria).

---

## Retención y eliminación de datos

- Los reportes se conservan mientras sean relevantes para la emergencia activa.
- Una vez finalizada la emergencia, los datos se **anonimizan** (se eliminan nombres, teléfonos y direcciones exactas) y se conservan únicamente con fines estadísticos y de mejora del servicio.
- El período de retención máximo es de **2 años** posteriores al cierre de la emergencia.
- Los operadores pueden solicitar la eliminación de sus cuentas contactando al administrador del sistema.
- Los ciudadanos pueden solicitar la eliminación de sus reportes individuales.
- Las sesiones expiran automáticamente a las **24 horas** y los tokens no se persisten.

---

## Derechos del titular de los datos

Cualquier persona cuyos datos sean procesados por la plataforma tiene derecho a:

1. **Acceso** — conocer qué datos suyos están siendo procesados.
2. **Rectificación** — corregir datos inexactos o incompletos.
3. **Supresión** — solicitar la eliminación de sus datos personales.
4. **Limitación** — restringir el procesamiento en casos determinados.
5. **Portabilidad** — recibir sus datos en formato estructurado (CSV/JSON).
6. **Oposición** — oponerse al procesamiento para fines específicos.

Para ejercer estos derechos, el titular debe contactar a la organización coordinadora a través de los canales indicados en la plataforma.

---

## Transmisión de datos

- Todas las llamadas API usan **HTTPS** en producción.
- El frontend y la API pueden compartir origen (cookie httpOnly) o usar CORS con `credentials: include`.
- Los datos sincronizados entre cliente y servidor viajan por la misma conexión segura.
- Las fotos se transmiten como data URLs base64 (sin almacenamiento externo).

---

## Trazabilidad (auditoría)

Cada acción importante queda registrada:

| Evento                               | Datos registrados                                         |
| ------------------------------------ | --------------------------------------------------------- |
| Cambio de estado de reporte          | operador, estado anterior, estado nuevo, timestamp, notas |
| Visualización de reporte             | operador, timestamp                                       |
| Login exitoso/fallido                | usuario, IP (solo servidor), motivo                       |
| Asignación de reporte a organización | operador, organización, timestamp                         |
| Creación/eliminación de usuario      | admin, username, rol                                      |
| Cambio de configuración              | admin, cambios realizados                                 |

Los registros de auditoría se almacenan tanto localmente (IndexedDB) como en el servidor (PostgreSQL).

---

## Normas y estándares aplicados

Puente de Vida se alinea con los siguientes marcos normativos y estándares internacionales para el tratamiento de datos en contextos humanitarios:

- **Reglamento General de Protección de Datos (GDPR)** — minimización de datos, consentimiento, derecho de supresión, portabilidad.
- **Ley Orgánica de Protección de Datos Personales (Venezuela, 2012)** — marco legal local aplicable.
- **Convención sobre los Derechos del Niño (ONU, 1989)** — interés superior del niño, protección contra toda forma de violencia, derecho a la privacidad (Art. 16).
- **Normas Esfera (Sphere Handbook)** — principios de protección en la respuesta humanitaria: "no hacer daño", acceso seguro, rendición de cuentas.
- **Principios de Protección de Datos Humanitarios (OCHA / IASC)** — limitación de propósito, proporcionalidad, seguridad, participación.
- **ISO/IEC 27001** — control de acceso, clasificación de información, gestión de incidentes, trazabilidad.
- **Principios de la OCDE sobre Privacidad** — limitación de recogida, calidad de los datos, finalidad, seguridad, transparencia.
- **Convención Americana sobre Derechos Humanos (Pacto de San José)** — derecho a la honra, reconocimiento de la dignidad, protección judicial (Art. 11, 25).
- **Estándares del CICR para la Protección de Datos Personales en Acción Humanitaria** — datos biométricos, intercambio seguro, retención mínima.
