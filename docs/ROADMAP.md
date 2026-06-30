# Roadmap

Ideas priorizadas para futuras versiones. Si querés aportar una, abrí un issue o directamente un PR. También podés anotar sugerencias nuevas al final de este archivo y mandar un PR.

---

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

---

## Cómo aportar

1. Elegí un item del roadmap (o proponé uno nuevo)
2. Si es un bug o feature request, abrí un [issue](https://github.com/anomalyco/opencode/issues)
3. Si querés codificarlo, seguí el flujo de contribución en el README principal
4. Si no sabés por dónde empezar, buscá issues etiquetados con `good first issue`

---

## Sugerencias anotadas por la comunidad

_(Agregá tu idea abajo con un PR. Formato: `- [ ] Descripción — @usuario`)_
