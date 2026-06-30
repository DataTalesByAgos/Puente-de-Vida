# Roadmap

## Próximas funcionalidades

### 🔴 Redes sociales — Bandeja de moderación

- Tabla `mentions` (fuente, texto, foto url, link, perfil, status: `pendiente_verificacion` | `aprobado` | `descartado` | `solicitando_info`).
- Worker RSS que ingiere menciones desde Google News RSS + RSS-Bridge autohosteado (Twitter, Reddit, etc.).
- UI tipo bandeja en el dashboard: el coordinador ve la foto, texto, enlace y decide aprobar (crea `report` oficial), solicitar más datos, o descartar.
- Si la publicación deja un teléfono, el coordinador puede contactar desde la misma UI (WhatsApp o llamada).
- Anti-fake-news: cruzar con reportes existentes en la misma zona para validar.

### 🟡 Mejoras al dashboard

- Notificaciones sonoras en tiempo real cuando llega un reporte crítico.
- Vista de mapa con todos los incidentes activos.
- Historial de cambios por reporte (quién cambió qué y cuándo).

### 🟢 Optimizaciones

- Paginación virtual del feed cuando hay +500 reportes activos.
- Compresión de fotos antes de subir a la API.
- Exportar reportes a CSV/PDF para informes.

### ⚪ Canal telefónico (Twilio)

- Número telefónico con transcripción speech-to-text.
- Entrada manual por operador como alternativa.
