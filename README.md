# Sentinel — Puente de Vida

**Sentinel (Puente de Vida)** es una plataforma de coordinación de emergencias de código abierto diseñada bajo un enfoque **Offline-First**. Su objetivo es garantizar que la información crítica de rescate y ayuda humanitaria continúe fluyendo y organizándose de manera eficiente, incluso cuando la conexión a Internet es limitada, inestable o inexistente.

El principio central del proyecto es simple:

> **Ningún reporte debería perderse porque se cayó Internet.**

---

## 🚀 Características Principales

- **Arquitectura Offline-First:** Diseñada para seguir operando sin conexión, almacenando datos localmente y sincronizándolos automáticamente al recuperar la conectividad.
- **Chatbot de WhatsApp (con simulador integrado):** Permite a los ciudadanos reportar incidentes, necesidades y personas desaparecidas sin instalar aplicaciones adicionales. Incluye un **simulador emulado gratuito** para probar todo el flujo sin contratar ningún proveedor, y queda **listo para conectar WhatsApp real** (Meta o Kapso) con solo configurar variables de entorno.
- **Aplicación Web Progresiva (PWA):** Una interfaz web ultraligera para voluntarios y equipos de respuesta en terreno que funciona 100% sin conexión (IndexedDB + Dexie.js).
- **Panel de Coordinación Inteligente:** Centraliza e integra reportes de diversas fuentes, utilizando IA para estructurar, priorizar, categorizar y detectar duplicados automáticamente.
- **Optimización Extrema:** Estructura liviana preparada para conexiones lentas y bajo consumo de recursos.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:** Next.js (React), Progressive Web App (PWA)
- **Base de Datos & Almacenamiento:** PostgreSQL, Dexie.js (IndexedDB local)
- **Backend:** Node.js (API Monorrepo en TypeScript)
- **Mapas:** OpenStreetMap & Leaflet
- **Canales:** WhatsApp (proveedor conmutable: simulador emulado · Meta WhatsApp Cloud API · Kapso)

---

## ⚙️ Estructura del Proyecto

El repositorio está organizado como un **monorrepo de npm**:

```text
├── apps/
│   ├── api/          # Servidor backend y procesamiento (Express / Node.js)
│   └── web/          # Aplicación Frontend PWA (Next.js)
├── materiales/       # Recursos visuales oficiales de la campaña (Logos, SVG)
├── package.json      # Configuración del monorrepo y scripts globales
└── docker-compose.yml# Configuración de contenedores Docker
```

---

## 💻 Cómo Probar e Iniciar el Proyecto

Tienes dos formas de poner en marcha la plataforma:

### Opción 1: Con Docker (Recomendado y Rápido)

Este método levantará automáticamente la base de datos PostgreSQL, la API Backend y la aplicación Web de Next.js en contenedores aislados.

1. **Iniciar todos los servicios:**

   ```bash
   npm run up
   ```

   _(Este comando compila y levanta la plataforma usando `docker compose up --build`)_

2. **Acceder a los servicios:**
   - **Aplicación Web (PWA):** [http://localhost:3000](http://localhost:3000)
   - **API Backend:** [http://localhost:4000](http://localhost:4000)
   - **Base de Datos (PostgreSQL):** Puerto `5432` con credenciales configuradas en `docker-compose.yml`.

3. **Detener los servicios:**
   ```bash
   npm run down
   ```

---

### Opción 2: Modo de Desarrollo Local (Con Hot Reload)

Ideal si quieres realizar modificaciones en el código y ver los cambios al instante.

1. **Levantar la Base de Datos:**

   ```bash
   npm run db:up
   ```

2. **Iniciar Servidores de Desarrollo (API + Web):**

   ```bash
   npm run dev
   ```

   _(Utiliza `concurrently` para arrancar ambos servicios de forma paralela)_

3. **Acceder a los servicios:**
   - **Web:** [http://localhost:3000](http://localhost:3000)
   - **API:** [http://localhost:4000](http://localhost:4000)

---

### 📋 Comandos de Utilidad

- **Chequeo de Tipos (TypeScript):**
  ```bash
  npm run typecheck
  ```
- **Análisis de Estilos e Errores (Linting):**
  ```bash
  npm run lint
  ```
- **Formateo Automático de Código:**
  ```bash
  npm run format
  ```
- **Compilación de Producción Local:**
  ```bash
  npm run build
  ```

---

## 💬 Canal de WhatsApp (Simulador y Proveedor Real)

El reporte ciudadano por WhatsApp es un canal de entrada **conmutable**. Por defecto, la plataforma arranca en **modo demo emulado**, que **no cuesta nada** y no requiere contratar ningún servicio: ideal para hackathones, demos y desarrollo.

### 🆓 Modo demo (emulado, por defecto)

1. Levantá la plataforma (Docker o desarrollo local) y abrí la web.
2. Entrá a la pestaña **💬 WhatsApp**: vas a ver un **teléfono simulado**.
3. Escribí un mensaje como ciudadano (o tocá una sugerencia). El **bot responde al instante** y, a la derecha, la **IA estructura** el reporte (tipo, prioridad, equipo) para el coordinador.
4. El mismo reporte aparece, ya priorizado, en el **Panel** y en el **Mapa**.

> El simulador funciona **offline-first**: guarda en el dispositivo y sincroniza cuando hay conexión, igual que el canal real.

### 📲 Activar WhatsApp real (cuando alguien pague los recursos)

No hace falta tocar el código: el envío real se activa **solo** al detectar las credenciales de **un** proveedor. Configurá las variables de entorno (en tu `.env` o en `docker-compose.yml`) y reiniciá la API.

**Opción A — Meta WhatsApp Cloud API**

```bash
WHATSAPP_PROVIDER=meta
WHATSAPP_TOKEN=<tu_token_permanente_de_meta>
WHATSAPP_PHONE_NUMBER_ID=<tu_phone_number_id>
# opcional: WHATSAPP_API_VERSION=v21.0
```

**Opción B — Kapso (WhatsApp Business API gestionada)**

```bash
WHATSAPP_PROVIDER=kapso
KAPSO_API_KEY=<tu_api_key_de_kapso>
KAPSO_WEBHOOK_SECRET=<secreto_compartido_para_el_webhook>
```

Luego, en el panel del proveedor, apuntá el **webhook entrante** a tu API:

```text
https://TU_HOST/api/whatsapp/webhook
```

Con esto, los mensajes reales de ciudadanos entran por el webhook, la IA los clasifica y el bot envía la **respuesta automática** de acuse de recibo. Podés desactivar esa respuesta con `WHATSAPP_AUTO_REPLY=false`.

### 🔌 Endpoints del canal

- `GET /api/whatsapp/status` → indica el modo activo (`mock` / `meta` / `kapso`).
- `POST /api/whatsapp/webhook` → entrada de mensajes reales del proveedor.
- `POST /api/whatsapp/simulate` → ingresa un mensaje de prueba y devuelve la respuesta del bot (útil para probar la IA del servidor por `curl`).

```bash
curl -X POST http://localhost:4000/api/whatsapp/simulate \
  -H "Content-Type: application/json" \
  -d '{"phone":"+584120000099","text":"Edificio derrumbado, hay personas atrapadas"}'
```

### 🌊 Simulación de carga masiva (comando grabable)

Para **ver la app en acción como en un desastre real** —cientos de reportes entrando a la vez y la IA clasificándolos en vivo— hay un comando de simulación. Es ideal para **grabar una demo** y, a la vez, sirve como **prueba de rendimiento** (mide latencia y throughput para detectar dónde el código deja de ser fluido).

Con la plataforma levantada (`npm run dev` o `npm run up`), en otra terminal:

```bash
# 200 mensajes, 8 en paralelo (valores por defecto)
npm run sim

# 500 mensajes con 16 en paralelo
npm run sim -- -n 500 -c 16

# Simular una "ráfaga" realista limitada a 30 mensajes por segundo
npm run sim -- --rate 30 --total 300

# Reproducir exactamente la misma corrida (semilla fija)
npm run sim -- --seed 42
```

Mientras corre, verás **en vivo** cada reporte con su clasificación (tipo, prioridad, confianza, latencia y si fue detectado como **duplicado**), y el **Panel** y el **Mapa** en `http://localhost:3000` se irán llenando solos. Al terminar, imprime un **resumen**: throughput (msg/s), latencias `p50/p95/p99`, desglose por tipo y prioridad, y un **veredicto de fluidez**.

| Opción              | Atajo | Descripción                                  | Def.    |
| ------------------- | ----- | -------------------------------------------- | ------- |
| `--total <n>`       | `-n`  | Cantidad total de mensajes                   | `200`   |
| `--concurrency <n>` | `-c`  | Mensajes en paralelo                         | `8`     |
| `--rate <n>`        | `-r`  | Límite de mensajes por segundo (`0` = libre) | `0`     |
| `--dup <0..1>`      |       | Proporción de reportes duplicados            | `0.18`  |
| `--seed <n>`        | `-s`  | Semilla para reproducir la corrida           | random  |
| `--url <url>`       | `-u`  | URL de la API (`API_URL` también sirve)      | `:4000` |
| `--quiet`           | `-q`  | Solo métricas, sin el detalle por mensaje    | —       |

> El comando usa el endpoint emulado (`/api/whatsapp/simulate`): **no envía nada a WhatsApp real**, pero ejecuta el flujo completo de producción (IA + deduplicación + PostgreSQL).

---

## 🤝 Cómo Aportar (Guía de Contribución)

¡Sentinel es un proyecto comunitario y de código abierto! Agradecemos enormemente cualquier tipo de contribución, desde reportar errores hasta proponer grandes características o mejoras en la documentación.

Para mantener la colaboración ordenada, eficiente y con altos estándares de calidad, te pedimos que sigas estas pautas:

### 1. Flujo de Trabajo (Workflow)

1. **Haz un Fork** de este repositorio.
2. **Crea una rama de trabajo** descriptiva desde la rama `main` de tu fork:
   - Para nuevas funcionalidades: `feat/nombre-de-la-funcionalidad`
   - Para corrección de errores: `fix/nombre-del-bug`
   - Para mejoras de documentación: `docs/nombre-de-la-mejora`
   - Para refactorizaciones o mantenimiento: `refactor/nombre-cambio` o `chore/nombre-cambio`
3. **Realiza tus cambios** y asegúrate de que todo funcione correctamente localmente.
4. **Verifica la calidad del código y su formato:** Antes de confirmar tus cambios, asegúrate de que el formateo, chequeo de tipo y linter pasen exitosamente sin errores:
   ```bash
   npm run format
   npm run lint
   npm run typecheck
   ```
5. **Haz tus commits** con mensajes claros. Te recomendamos seguir la convención de [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/):
   - Ejemplo: `feat(web): implementar sincronización automática de IndexedDB`
   - Ejemplo: `fix(api): corregir parsing de ubicación en el reporte de WhatsApp`
6. **Sube tus cambios** a tu fork (`git push origin mi-rama`) y abre un **Pull Request (PR)** hacia la rama `main` del repositorio oficial.

### 2. Estándares de Desarrollo

- **Eficiencia y Buenas Prácticas:** Al ser una herramienta para desastres, la eficiencia es crucial. Mantén el código limpio, optimizado y asegúrate de que la aplicación web sea lo más liviana posible.
- **Tipado Estricto:** Todo el proyecto utiliza TypeScript. No uses `any` a menos que sea estrictamente necesario y justificado.
- **Enfoque Offline-First:** Si trabajas en el frontend, ten siempre en cuenta que las operaciones deben poder realizarse localmente y sincronizarse de manera asíncrona cuando retorne la conexión.

### 3. Reportar Errores y Sugerir Ideas

Si encuentras un error o tienes una gran idea para la plataforma, abre un **Issue** en GitHub y proporciona:

- Una descripción clara del problema o de la propuesta.
- Pasos detallados para reproducir el error (si aplica).
- Capturas de pantalla o logs que consideres útiles.

---

## 📄 Licencia

Este proyecto está bajo la Licencia [MIT](LICENSE).
