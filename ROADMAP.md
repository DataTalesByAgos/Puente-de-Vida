# Roadmap & Discusión de Viabilidad

Este es el único documento maestro de planificación para **Puente de Vida**. Aquí se consolidan los objetivos a corto, mediano y largo plazo, los requerimientos de calidad y seguridad, las necesidades de infraestructura y el análisis de viabilidad técnica de las ideas más complejas del proyecto.

---

## 📌 Índice de Contenidos

1. [Calidad y Seguridad (QA / Red Team)](#-calidad-y-seguridad-qa--red-team)
2. [Revisión y Mejoras de Código](#-revisión-y-mejoras-de-código)
3. [Planificación de Funcionalidades (Corto, Mediano y Largo Plazo)](#-planificación-de-funcionalidades-corto-mediano-y-largo-plazo)
4. [Infraestructura y Recursos Extra](#-infraestructura-y-recursos-extra)
5. [Discusión Técnica y Viabilidad de Grandes Ideas](#-discusión-técnica-y-viabilidad-de-grandes-ideas)
6. [Cómo Aportar](#-cómo-aportar)
7. [Sugerencias de la Comunidad](#-sugerencias-de-la-comunidad)

---

## 🛡️ Calidad y Seguridad (QA / Red Team)

- [x] **Rate limiting por IP** — Implementado con `@fastify/rate-limit`: 100 peticiones globales por IP, 5 intentos por minuto en inicio de sesión.
- [x] **Validación de entrada con Zod** — Esquemas de validación tipados e implementados en rutas críticas de la API (`reports.ts`, `sync.ts`, etc.) para prevenir ingresos maliciosos.
- [ ] **Auditoría de seguridad (Red Team)** — Probar vulnerabilidades comunes como inyección SQL, XSS, CSRF, exposición de secretos y acceso no autorizado a rutas de administrador.
- [ ] **Pruebas automatizadas (QA)** — Desarrollar suite de tests unitarios y de integración: API (`jest` / `vitest`), frontend (`Playwright` / `Cypress`) y el flujo offline → sync → servidor.
- [ ] **Linting de seguridad** — Integrar `eslint-plugin-security` y `ts-reset` para detectar patrones inseguros de código en tiempo de compilación.
- [ ] **Fuzzing de APIs entrantes** — Evaluar la tolerancia a fallas y la robustez del webhook de WhatsApp y de los endpoints públicos frente a payloads malformados.
- [ ] **Gestión de secretos** — Migrar las variables de entorno de archivos `.env` locales a un vault seguro (ej. HashiCorp Vault, Infisical o Doppler).
- [ ] **Penetration test del Service Worker** — Verificar que las estrategias de cacheo y la cola de sincronización en segundo plano no filtren información confidencial entre sesiones de usuarios.

---

## ⚙️ Revisión y Mejoras de Código

- [ ] **Refactor de heurística de clasificación** — Extraer las expresiones regulares y las reglas locales de clasificación de incidentes a un archivo de configuración JSON/YAML estructurado y desacoplado de la lógica de código.
- [ ] **Tipado estricto en toda la API** — Migrar las definiciones laxas como `Record<string, unknown>` a tipos e interfaces fuertemente definidos en todas las rutas de Fastify.
- [ ] **Pruebas de regresión visual** — Capturar screenshots automáticos de los componentes de la interfaz de usuario en diferentes tamaños de pantalla (Percy o Chromatic) para asegurar consistencia responsive.
- [ ] **Benchmark de performance** — Medir los tiempos de respuesta de la API bajo alta concurrencia (100, 500, 1000 req/s) usando herramientas como `k6` o `autocannon`.
- [ ] **Análisis de bundle** — Integrar `vite-bundle-visualizer` para optimizar y auditar el tamaño de la aplicación estática cliente.
- [ ] **Revisión de accesibilidad (a11y)** — Auditar la interfaz con `axe-core` y asegurar el cumplimiento de la directiva WCAG 2.2 AA.

---

## 🚀 Planificación de Funcionalidades (Corto, Mediano y Largo Plazo)

### Corto Plazo

- [ ] **Adaptación a mobile / responsive** — Optimizar la interfaz del dashboard, los mapas interactivos y las tablas operativas para asegurar una experiencia táctil fluida en smartphones y tablets en el terreno.
- [ ] **Hot-reload de configuración** — Permitir que los cambios en la configuración de proveedores realizados desde el panel de administración se apliquen en tiempo de ejecución sin necesidad de reiniciar el servidor Fastify.
- [ ] **Autenticación persistente** — Evolucionar de las sesiones en memoria con TTL de 24 horas hacia tokens persistentes JWT con refresh tokens firmados y almacenados con seguridad en cookies `httpOnly`.
- [ ] **Notificaciones en tiempo real** — Alertas sonoras y visuales automáticas en el dashboard de coordinación ante la entrada de un incidente de prioridad crítica.
- [ ] **Notificaciones push** — Configurar el Service Worker para recibir push events externos cuando ocurran eventos de alta prioridad.
- [ ] **Internacionalización (i18n)** — Extender el soporte multilingüe agregando idiomas adicionales como inglés y portugués (además del español actual).
- [ ] **Exportar reportes a PDF** — Generar informes consolidados formateados y listos para imprimir para directores de organizaciones civiles y rescatistas.

### Mediano Plazo

- [ ] **Integración con aliados estratégicos e ingesta externa** — Automatizar la alimentación de reportes bidireccionales de manera fluida con bases de datos y plataformas de otras organizaciones aliadas (como "Aquí Estoy" o "Venezuela Te Busca").
- [ ] **Cola de mensajes** — Reemplazar el procesamiento inmediato de la API por una cola asíncrona de tareas en segundo plano (vía `BullMQ` o `Redis`) para desacoplar de forma limpia la ingesta y la clasificación pesada de incidentes.
- [ ] **WebSocket para actualización interactiva** — Cambiar la lógica actual de polling periódico por una conexión bidireccional continua (WebSocket o Server-Sent Events) para actualizar de inmediato mapas y métricas del panel.
- [ ] **App Android Nativa** — Empaquetar la interfaz PWA utilizando un contenedor como Capacitor para lograr un acceso robusto al sistema operativo (notificaciones persistentes, geolocalización continua, cámara).
- [ ] **Arquitectura modular de canales** — Implementar un sistema de plugins de entrada para que desarrolladores externos puedan añadir nuevos canales (Telegram, Signal, SMS vía Twilio) sin alterar la lógica de negocio.

### Largo Plazo

- [x] **Mapa de incidentes activos** — Integración completa con `Leaflet` y `OpenStreetMap` en el frontend para dibujar incidentes georreferenciados según prioridad.
- [x] **Exportación a CSV** — Capacidad de descargar de forma local reportes depurados desde el panel de administración.
- [ ] **Mapa offline con tiles precacheados** — Descargar mosaicos de mapas geográficos específicos en el navegador antes de salir a misiones en el terreno donde la señal de internet sea nula.
- [ ] **Redes en malla (Mesh Networking)** — Comunicación descentralizada directa dispositivo a dispositivo (Wi-Fi Aware / Bluetooth) para mover datos por terreno hostil en ausencia total de infraestructura celular o satelital.
- [ ] **Sistemas oficiales de emergencia** — Integrar Puente de Vida con canales y consolas estatales de Protección Civil, Bomberos y centros de despacho de emergencias.
- [ ] **Despliegue multi-tenant** — Estructurar la API para que una sola instalación del servidor sirva a múltiples regiones o países independientes con total aislamiento de base de datos.

---

## 🎛️ Infraestructura y Recursos Extra

Estas mejoras de rendimiento y resiliencia del ecosistema no requieren cambios profundos en el código base, sino la incorporación de servicios gestionados opcionales mediante variables de entorno:

- [ ] **Persistencia con Redis** — Conectar un broker con `REDIS_URL` para almacenar sesiones activas, evitando su pérdida ante reinicios del servidor.
- [ ] **Caché en memoria de estadísticas** — Almacenar temporalmente (ej. 30s) las métricas del panel `/api/dashboard/stats` en un caché central, previniendo la fatiga y sobrecarga de PostgreSQL.
- [ ] **Job Queue dedicada** — Implementar un proceso Worker dedicado (ej. Bull) para resolver scraping e ingesta periódica de APIs aliadas, aislando estas tareas lentas del hilo del servidor API de Fastify.
- [ ] **Almacenamiento de medios Cloud (S3/R2)** — Subir las fotografías y recursos de los incidentes directamente a un bucket compatible con la API de Amazon S3 en lugar de codificarlas en base64 en la base de datos central de PostgreSQL.
- [ ] **Red replicas de base de datos** — Balancear la carga delegando las consultas analíticas pesadas (dashboard, mapas, exportaciones) a réplicas de solo lectura de PostgreSQL, liberando a la instancia principal para que atienda la ingesta continua de incidentes de WhatsApp y formularios.
- [ ] **Rate Limit Distribuido** — Migrar la memoria interna local de Fastify a un almacén compartido de Redis, garantizando la consistencia del bloqueo de IPs sospechosas en entornos multi-instancia de alta disponibilidad.

---

## 💡 Discusión Técnica y Viabilidad de Grandes Ideas

Análisis exhaustivo sobre las funcionalidades más disruptivas del roadmap que presentan las mayores complejidades a nivel de arquitectura y desarrollo de software:

### 1. Red en Malla (Mesh Networking)

- **Beneficios:**
  - _Resiliencia extrema:_ Permite la comunicación local y directa dispositivo a dispositivo sin depender en absoluto de satélites, torres celulares de telefonía o del suministro eléctrico tradicional de red.
  - _Efecto de mulas de datos ("Data Mules"):_ Los incidentes capturados "saltan" de forma descentralizada entre teléfonos de voluntarios. Tan pronto como cualquiera de ellos alcance un punto con cobertura mínima, transmite automáticamente todo el lote consolidado al backend.
- **Desafíos (Challenges):**
  - _Aislamiento y Sandbox de la PWA:_ Como aplicación web que corre dentro de un navegador, Puente de Vida tiene prohibido por el sistema operativo acceder a sockets directos Wi-Fi o emitir señales BLE de bajo nivel en segundo plano, debido a las rígidas políticas de seguridad y privacidad móvil.
  - _Consumo de energía:_ Los algoritmos de escaneo constante de vecinos inalámbricos drenan velozmente la batería, lo cual es crítico en zonas aisladas por catástrofes.
- **Estado Actual vs. Ideal:**
  - _Actual:_ La app guarda y valida de forma perfecta los reportes localmente en `IndexedDB` a través de `Dexie.js`, pero requiere que cada terminal individual logre una conexión directa de red para que el `Service Worker` transmita el reporte al servidor central de PostgreSQL.
  - _Ideal:_ Los reportes de los voluntarios se unifican y propagan por cercanía física de forma transparente, integrando las bases de datos locales hasta encontrar una salida remota.
- **Viabilidad Inicial y Alternativa Viable:**
  - _Viabilidad:_ Baja en formato de aplicación web (PWA) de navegador tradicional.
  - _Alternativa Viable:_ Envolver el frontend estático mediante **Capacitor** para habilitar llamadas a librerías nativas que expongan la conectividad de hardware, o bien diseñar un pequeño módulo nativo complementario (Kotlin para Android y Swift para iOS) responsable de actuar como "bridge" de transmisión Bluetooth/Wi-Fi Aware que mueva los datos guardados por la IndexedDB local.

### 2. Integración y Alianzas de Ingesta Externa (Strategic Data Ingestion)

- **Beneficios:**
  - _Centralización inteligente:_ Consolida en un panel único e integral la información proveniente de múltiples bases de datos y hojas de cálculo civiles ("Aquí Estoy", "Venezuela Te Busca"), previniendo la duplicación del trabajo.
  - _Datos validados:_ Enriquecimiento constante mediante API-hooks con canales acreditados de prensa o reportes oficiales de cuerpos de rescate en el epicentro de la crisis.
- **Desafíos (Challenges):**
  - _Mapeo y normalización:_ Diferentes formatos de estructuras de datos, coordenadas geográficas inconsistentes o incompletas y discrepancias de nombres y marcas de tiempo de los registros externos.
  - _Tolerancia a fallos:_ Depender de peticiones constantes (polling) a servidores ajenos de terceros que sufren caídas por alta demanda o inestabilidad eléctrica en el área afectada.
  - _Filtrado de información maliciosa:_ Determinar la autenticidad y el nivel de confianza de cada origen de datos para evitar reportes falsos que saboteen las acciones de rescate.
- **Estado Actual vs. Ideal:**
  - _Actual:_ El backend de Fastify implementa un pipeline modular de ingesta (`ingestion.ts`) y operaciones de inserción masiva aceleradas por la función `UNNEST` de SQL, pero el registro de nuevos aliados requiere codificación estática manual dentro de la arquitectura del proyecto.
  - _Ideal:_ Un sistema interactivo donde los administradores de la plataforma configuren, mapeen y habiliten conectores de datos externos de forma visual y dinámica desde la interfaz del panel de control.
- **Viabilidad Inicial y Alternativa Viable:**
  - _Viabilidad:_ Media-Alta. Las estructuras transaccionales de almacenamiento (`external_persons`) y la velocidad de carga ya están listas y probadas.
  - _Alternativa Viable:_ Definir y publicar un estándar API público propio de Puente de Vida ("Humanitarian Report Schema"). De esta manera, delegamos la responsabilidad de normalización y procesamiento a las organizaciones aliadas, quienes realizarán peticiones seguras (Push Webhook) directo a nuestros endpoints optimizados, evitando que Puente de Vida sobrecargue su infraestructura realizando escaneos periódicos (Pull).

---

## 🤝 Cómo Aportar

1. Elige un item del roadmap o propone una mejora que consideres vital.
2. Abre un **Issue** para discutir la arquitectura y el enfoque de desarrollo.
3. Envía un **Pull Request** siguiendo las mejores prácticas especificadas en la documentación técnica del proyecto.

---

## 💬 Sugerencias de la Comunidad

_(Agrega tus propuestas nuevas enviando un Pull Request a este documento)_

- [ ] Implementar un módulo de soporte de primeros auxilios offline con guías ilustradas de bajo peso.
- [ ] Habilitar geocodificación inversa local (coordenadas a texto descriptivo de dirección) de forma estática para operar offline.
- [ ] Añadir soporte para envío automatizado de alertas SOS de bajo ancho de banda mediante SMS tradicionales integrados.
