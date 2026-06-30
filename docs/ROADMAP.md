# Roadmap

Ideas priorizadas para futuras versiones. Si querés aportar una, abrí un issue o directamente un PR. También podés anotar sugerencias nuevas al final de este archivo y mandar un PR.

---

## Calidad y seguridad (QA / Red Team)

- [ ] **Auditoría de seguridad (Red Team)** — probar vulnerabilidades comunes: inyección SQL, XSS, CSRF, exposición de secrets, rate limiting, y acceso no autorizado a rutas de admin
- [ ] **Pruebas automatizadas (QA)** — armar suite de tests unitarios e integración: API (jest / vitest), frontend (Playwright / Cypress), flujo offline → sync → servidor
- [ ] **Linting de seguridad** — integrar `eslint-plugin-security` y `ts-reset` para detectar patrones inseguros
- [ ] **Fuzzing de APIs entrantes** — probar el webhook de WhatsApp y endpoints públicos con entradas maliciosas
- [ ] **Gestión de secretos** — migrar variables de entorno a un vault (HashiCorp Vault / Infisical) en vez de `.env`
- [ ] **Penetration test del Service Worker** — verificar que el cacheo y background sync no filtren datos sensibles entre sesiones
- [ ] **Rate limiting por IP** — evitar abuso en endpoints de login y creación de reportes (express-rate-limit o similar)
- [ ] **Validación de entrada con Zod** — reemplazar validaciones manuales en rutas API por esquemas tipados

## Revisión y mejoras de código

- [ ] **Refactor de heurística de clasificación** — extraer reglas a un archivo de configuración en vez de tenerlas hardcodeadas
- [ ] **Tipado estricto en toda la API** — migrar `Record<string, unknown>` a tipos concretos en todas las rutas
- [ ] **Pruebas de regresión visual** — capturar screenshots de componentes clave con Percy / Chromatic antes de cada release
- [ ] **Benchmark de performance** — medir tiempo de respuesta de la API bajo carga (100, 500, 1000 req/s) con k6 o autocannon
- [ ] **Análisis de bundle** — integrar `vite-bundle-visualizer` para monitorear el tamaño del frontend
- [ ] **Revisión de accesibilidad (a11y)** — auditar con axe-core y cumplir WCAG 2.2 AA en la interfaz pública

## Corto plazo

- [ ] **Hot-reload de configuración** — que los cambios de proveedores en el panel Admin se apliquen sin reiniciar la API
- [ ] **Autenticación persistente** — migrar de sesiones en memoria a Redis o JWT con refresh tokens
- [ ] **Notificaciones push** — que el SW reciba push events cuando hay reportes nuevos de alta prioridad
- [ ] **Internacionalización** — soporte para inglés y portugués (además del español actual)
- [ ] **Exportar PDF** — generar reportes consolidados imprimibles

## Mediano plazo

- [ ] **Cola de mensajes** — reemplazar el envío directo HTTP por una cola (RabbitMQ / Redis) para desacoplar el ingreso del procesamiento
- [ ] **WebSocket en lugar de polling** — para actualizaciones en vivo en el dashboard sin refrescar
- [ ] **Analytics de respuesta** — medir tiempos de atención por organización, tipo de incidente, etc.
- [ ] **App Android nativa** — wrapper con Capacitor o Kotlin para mejor integración con notificaciones y cámara
- [ ] **Plugins de proveedores** — sistema de plugins para que cualquiera pueda agregar un nuevo canal (Telegram, Signal, SMS vía Twilio, etc.) sin tocar el código central

## Largo plazo

- [ ] **Mapa offline con tiles precacheados** — descargar mosaicos de mapas para zonas específicas antes de una misión
- [ ] **Mesh networking** — que los dispositivos puedan reenviar reportes entre sí vía WiFi Direct / Bluetooth en ausencia total de infraestructura
- [ ] **Integración con sistemas oficiales** — SINAPRED, Protección Civil, cuerpos de bomberos
- [ ] **Despliegue multi-tenant** — que una misma instancia sirva a múltiples regiones/países independientes

## Mejoras que necesitan recursos (infraestructura extra)

Estos items no requieren cambiar código — solo agregar servicios externos y configurar variables de entorno.

- [ ] **Redis para sesiones persistentes** — con `REDIS_URL` configurada, las sesiones de admin sobreviven a reinicios del servidor. Sin Redis, se pierden al reiniciar (funcional para demo).
- [ ] **Caché de dashboard con Redis** — stats cacheados 30s en Redis en vez de recalcular queries pesadas en cada request. Reduce la carga en PostgreSQL cuando hay muchos operadores viendo el panel.
- [ ] **Job queue (Bull / RabbitMQ)** — desacoplar la ingesta de fuentes externas del proceso de la API. Permite reintentos automáticos, cola de prioridad, y monitoreo visual de trabajos fallidos.
- [ ] **WebSocket en lugar de polling** — notificaciones push en vivo a los dashboards cuando llega un reporte crítico, sin refrescar cada 30s. Ahorra ancho de banda y batería en móviles.
- [ ] **Object storage (S3 / R2 / Supabase Storage)** — subir fotos de reportes al cloud en vez de guardarlas en base64 en PostgreSQL. Permite adjuntar imágenes pesadas sin degradar la DB.
- [ ] **CDN para assets estáticos** — servir el frontend desde Cloudflare Pages, Vercel Edge o Netlify. Carga instantánea en cualquier país.
- [ ] **Read replicas de PostgreSQL** — separar lecturas (dashboard, stats) de escrituras (reportes entrantes). Las queries pesadas de analytics no compiten con la ingesta de reportes.
- [ ] **Backups automáticos a cloud storage** — pg_dump comprimido subido a S3/R2/Backblaze cada N horas con retención configurable. Sin infraestructura extra, los backups hay que hacerlos a mano.
- [ ] **Rate limiting por IP con Redis** — evitar que un atacante queme el endpoint de login o el webhook de WhatsApp. Sin Redis, el rate limit es por proceso y no funciona con múltiples instancias.
- [ ] **Monitoreo y alertas** — conectar Sentry para errores, Grafana para métricas (conteo de reportes, tiempo de respuesta, tasa de sync). Detectar problemas antes que los usuarios.
- [ ] **Multi-instancia con balanceador** — correr la API detrás de un load balancer (nginx / Traefik / Cloudflare). Escalar horizontalmente cuando una sola instancia no da abasto.
- [ ] **Analytics de respuesta** — medir tiempos de atención por organización reporte por reporte. Identificar cuellos de botella en la cadena de emergencia.

---

## Cómo aportar

1. Elegí un item del roadmap (o proponé uno nuevo)
2. Si es un bug o feature request, abrí un [issue](https://github.com/anomalyco/opencode/issues)
3. Si querés codificarlo, seguí el flujo de contribución en el README principal
4. Si no sabés por dónde empezar, buscá issues etiquetados con `good first issue`

---

## Sugerencias anotadas por la comunidad

_(Agregá tu idea abajo con un PR. Formato: `- [ ] Descripción — @usuario`)_
