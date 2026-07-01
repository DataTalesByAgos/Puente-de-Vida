# Roadmap — Puente de Vida

> **El plan activo ahora es [ROADMAP-MOBILE.md](./ROADMAP-MOBILE.md)** — plataforma mobile-first con gestión de necesidades (micro/macro), roles (Ciudadano, Voluntario, Coordinador, Organización, Admin), Expo/React Native, offline-first y Mapbox GL.
>
> Este documento contiene los items **transversales** (QA, seguridad, infraestructura, calidad de código) que aplican a cualquier versión de la plataforma.

---

## 📌 Índice

1. [Calidad y Seguridad (QA / Red Team)](#-calidad-y-seguridad-qa--red-team)
2. [Revisión y Mejoras de Código](#-revisión-y-mejoras-de-código)
3. [Infraestructura y Recursos Extra](#-infraestructura-y-recursos-extra)
4. [Discusión Técnica — Viabilidad](#-discusión-técnica--viabilidad)
5. [Cómo Aportar](#-cómo-aportar)

---

## 🛡️ Calidad y Seguridad (QA / Red Team)

- [x] **Rate limiting por IP** — 100 peticiones globales por IP, 5 intentos por minuto en login.
- [x] **Validación de entrada con Zod** — Esquemas tipados en rutas críticas de la API.
- [ ] **Auditoría de seguridad (Red Team)** — Probar inyección SQL, XSS, CSRF, exposición de secretos, acceso no autorizado.
- [ ] **Pruebas automatizadas (QA)** — Suite de tests unitarios y de integración: API (vitest), mobile (Detox/Testing Library), flujo offline → sync → servidor.
- [ ] **Linting de seguridad** — Integrar `eslint-plugin-security` y `ts-reset` para detectar patrones inseguros.
- [ ] **Fuzzing de APIs entrantes** — Evaluar tolerancia a payloads malformados en webhooks y endpoints públicos.
- [ ] **Gestión de secretos** — Migrar variables de entorno a un vault seguro (HashiCorp Vault, Infisical o Doppler).
- [ ] **Penetration test del Service Worker / SQLite local** — Verificar que el almacenamiento offline no filtre información entre sesiones.

---

## ⚙️ Revisión y Mejoras de Código

- [ ] **Tipado estricto en toda la API** — Migrar `Record<string, unknown>` a interfaces fuertemente tipadas.
- [ ] **Pruebas de regresión visual** — Screenshots automáticos en diferentes tamaños de pantalla para asegurar consistencia responsive (Percy / Chromatic).
- [ ] **Benchmark de performance** — Medir tiempos de respuesta de la API bajo alta concurrencia (k6 / autocannon).
- [ ] **Análisis de bundle** — Integrar herramienta de visualización de bundle para auditar tamaño de la app mobile (expo-analyzer).
- [ ] **Revisión de accesibilidad (a11y)** — Auditar con axe-core y cumplir WCAG 2.2 AA donde aplique.

---

## 🎛️ Infraestructura y Recursos Extra

- [ ] **Persistencia con Redis** — Conectar con `REDIS_URL` para almacenar sesiones activas y evitar pérdidas ante reinicios.
- [ ] **Caché en memoria de estadísticas** — Almacenar métricas del dashboard temporalmente (30s) para reducir carga en PostgreSQL.
- [ ] **Job Queue dedicada** — Worker separado (Bull) para tareas lentas: scraping de fuentes externas, notificaciones push masivas.
- [ ] **Almacenamiento de medios Cloud (S3/R2)** — Subir fotos y recursos a un bucket S3-compatible en vez de base64 en PostgreSQL.
- [ ] **Réplicas de base de datos** — Delegar consultas analíticas pesadas a réplicas de solo lectura de PostgreSQL.
- [ ] **Rate Limit Distribuido** — Migrar rate limiting de memoria local a Redis para consistencia en multi-instancia.

---

## 💡 Discusión Técnica — Viabilidad

### Red en Malla (Mesh Networking)

Comunicación dispositivo a dispositivo (Wi-Fi Aware / BLE) para movilidad en zonas sin cobertura.

- **Viabilidad actual:** Baja en PWA. Media en app nativa (Android) con módulos Kotlin.
- **Estado:** Idea a largo plazo. Priorizar offline-first con SQLite + sync diferido por ahora.

### Integración con fuentes externas

Consolidar datos de organizaciones aliadas (listas de desaparecidos, centros de acopio, etc.).

- **Viabilidad:** Alta. El backend ya tiene pipeline de ingesta modular.
- **Recomendación:** Publicar un estándar API propio ("Humanitarian Needs Schema") para que aliados envíen datos mediante push webhook en vez de polling.

---

## 🤝 Cómo Aportar

1. Elegí un item del roadmap o proponé una mejora.
2. Abrí un **Issue** para discutir el enfoque.
3. Enviá un **Pull Request** siguiendo las prácticas del proyecto.
