# Control de Asistencia del Personal

App web sencilla (Next.js + App Router) para **registrar ausencias del personal** y ver **resúmenes mensuales y anuales**, con gráficos. Los datos se guardan en una **Hoja de Google** (Google Sheets) mediante una **cuenta de servicio** — no hace falta base de datos. Está protegida por un **código de acceso compartido** y se despliega en **Vercel** con configuración mínima.

---

## Índice

1. [Qué hace](#qué-hace)
2. [Cómo funciona el almacenamiento](#cómo-funciona-el-almacenamiento)
3. [Paso 1 — Crear la Hoja de Google](#paso-1--crear-la-hoja-de-google)
4. [Paso 2 — Crear el proyecto y la cuenta de servicio en Google Cloud](#paso-2--crear-el-proyecto-y-la-cuenta-de-servicio-en-google-cloud)
5. [Paso 3 — Descargar credenciales (JSON)](#paso-3--descargar-credenciales-json)
6. [Paso 4 — Compartir la hoja con la cuenta de servicio](#paso-4--compartir-la-hoja-con-la-cuenta-de-servicio)
7. [Paso 5 — Variables de entorno](#paso-5--variables-de-entorno)
8. [Paso 6 — Probar en local](#paso-6--probar-en-local)
9. [Paso 7 — Desplegar en Vercel](#paso-7--desplegar-en-vercel)
10. [Cambiar el código de acceso](#cambiar-el-código-de-acceso)
11. [Editar empleados y categorías](#editar-empleados-y-categorías)
12. [Regla de cálculo](#regla-de-cálculo)
13. [Seguridad](#seguridad)

---

## Qué hace

- **Registro de ausencias** con: persona (lista editable), fecha, tipo (día completo / medio día / por horas), categoría (editable), nota opcional.
- **Cálculo automático** de "días equivalentes": día completo = 1, medio día = 0.5, por horas = horas ÷ jornada.
- **Resumen mensual** por persona (desglose por tipo y categoría) y vista general.
- **Resumen anual** por persona mes a mes, más totales del equipo.
- **Gráficos** de ausencias por mes y por persona.
- **Editar / borrar** registros y **filtrar por rango de fechas**.
- **Acceso protegido** con un único código compartido (sesión de 12 h por cookie httpOnly). Tanto las páginas como las API están protegidas en el servidor.

---

## Cómo funciona el almacenamiento

Los datos viven en una Hoja de Google con **tres pestañas**:

| Pestaña      | Columna(s)                                                                 |
|--------------|----------------------------------------------------------------------------|
| `Ausencias`  | `id`, `nombre`, `fecha`, `tipo`, `horas`, `categoria`, `nota`, `diasEquivalentes`, `createdAt` |
| `Empleados`  | `nombre` (una fila por empleado)                                           |
| `Categorias` | `categoria` (una fila por categoría)                                       |

Cada ausencia registrada es una **fila** nueva en `Ausencias`. La app escribe y lee usando una cuenta de servicio de Google.

---

## Paso 1 — Crear la Hoja de Google

1. Ve a [sheets.google.com](https://sheets.google.com) y crea una hoja nueva. Ponle un nombre, p. ej. **"Asistencia"**.
2. Crea **tres pestañas** con estos nombres EXACTOS (respeta mayúsculas y sin tildes en `Categorias`):
   - `Ausencias`
   - `Empleados`
   - `Categorias`
3. En la pestaña **`Ausencias`**, escribe en la **fila 1** las cabeceras (opcional pero recomendado), una por columna de la A a la I:
   ```
   id | nombre | fecha | tipo | horas | categoria | nota | diasEquivalentes | createdAt
   ```
   La app empieza a escribir en la fila 2, así que la fila 1 es solo para que tú te orientes.
4. En la pestaña **`Empleados`**, pon `nombre` en A1 y a partir de A2 escribe un empleado por fila:
   ```
   nombre
   Ana Pérez
   Luis Gómez
   ```
5. En la pestaña **`Categorias`**, pon `categoria` en A1 y a partir de A2 las categorías (si la dejas vacía, la app usa por defecto: justificada, injustificada, vacaciones, enfermedad, permiso):
   ```
   categoria
   justificada
   injustificada
   vacaciones
   enfermedad
   permiso
   ```
6. Copia el **ID de la hoja** desde la URL. La URL es así:
   ```
   https://docs.google.com/spreadsheets/d/AQUI_VA_EL_ID/edit#gid=0
   ```
   El `ID` es el trozo entre `/d/` y `/edit`. Guárdalo: será `GOOGLE_SHEET_ID`.

---

## Paso 2 — Crear el proyecto y la cuenta de servicio en Google Cloud

1. Entra en [console.cloud.google.com](https://console.cloud.google.com) con tu cuenta de Google.
2. Arriba, crea un **proyecto nuevo** (o usa uno existente). Ejemplo: "asistencia".
3. Con el proyecto seleccionado, ve a **APIs y servicios → Biblioteca**, busca **"Google Sheets API"** y pulsa **Habilitar**.
4. Ve a **APIs y servicios → Credenciales → Crear credenciales → Cuenta de servicio**.
   - Nombre: p. ej. `asistencia-bot`.
   - Pulsa **Crear y continuar**. Los pasos de "roles" y "acceso" puedes dejarlos vacíos (no hacen falta roles del proyecto). Pulsa **Listo**.
5. Verás la cuenta de servicio creada, con un email tipo:
   ```
   asistencia-bot@tu-proyecto.iam.gserviceaccount.com
   ```
   Guárdalo: será `GOOGLE_SERVICE_ACCOUNT_EMAIL`.

---

## Paso 3 — Descargar credenciales (JSON)

1. En **Credenciales**, haz clic en la cuenta de servicio que creaste.
2. Pestaña **Claves → Agregar clave → Crear clave nueva → tipo JSON → Crear**.
3. Se descargará un archivo `.json`. **Ábrelo con un editor de texto.** Contiene, entre otros:
   ```json
   {
     "client_email": "asistencia-bot@tu-proyecto.iam.gserviceaccount.com",
     "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n",
     ...
   }
   ```
   - `client_email` → es tu `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
   - `private_key` → es tu `GOOGLE_PRIVATE_KEY` (cópialo **tal cual**, incluyendo los `\n` y las comillas).

> ⚠️ **Nunca subas este JSON al repositorio.** Solo lo usarás para copiar los dos valores a variables de entorno.

---

## Paso 4 — Compartir la hoja con la cuenta de servicio

Esto es **imprescindible**: la cuenta de servicio solo puede leer/escribir la hoja si la compartes con su email.

1. Abre tu Hoja de Google.
2. Pulsa **Compartir** (arriba a la derecha).
3. Pega el email de la cuenta de servicio (`...@....iam.gserviceaccount.com`).
4. Dale permiso de **Editor**.
5. Desmarca "Notificar" y pulsa **Compartir / Enviar**.

---

## Paso 5 — Variables de entorno

La app usa estas variables (nunca van en el código):

| Variable                        | Qué es                                                                 |
|---------------------------------|------------------------------------------------------------------------|
| `ACCESS_CODE`                   | Código de acceso compartido que pide la app al entrar.                 |
| `SESSION_SECRET`                | Cadena larga y aleatoria para firmar la cookie de sesión.              |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`  | El `client_email` del JSON.                                            |
| `GOOGLE_PRIVATE_KEY`            | El `private_key` del JSON (con `\n` y entre comillas).                 |
| `GOOGLE_SHEET_ID`               | El ID de la hoja (del Paso 1).                                         |
| `STANDARD_WORKDAY_HOURS`        | Horas de la jornada estándar (por defecto `8`).                        |

Para generar un `SESSION_SECRET` aleatorio:

```bash
openssl rand -base64 32
```

En **local**, copia `.env.example` a `.env.local` y rellena los valores:

```bash
cp .env.example .env.local
```

---

## Paso 6 — Probar en local

```bash
npm install
npm run dev
```

Abre <http://localhost:3000>. Te pedirá el código de acceso (`ACCESS_CODE`). Regístralo y prueba a crear una ausencia; debería aparecer como una fila nueva en la pestaña `Ausencias` de tu hoja.

---

## Paso 7 — Desplegar en Vercel

1. Sube este proyecto a un repositorio de GitHub/GitLab/Bitbucket.
2. Entra en [vercel.com](https://vercel.com), pulsa **Add New → Project** e importa el repositorio.
3. Framework: Vercel detecta **Next.js** automáticamente. No cambies nada del build.
4. Antes de desplegar, abre **Environment Variables** y añade **todas** las del Paso 5:
   - `ACCESS_CODE`
   - `SESSION_SECRET`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY` → pega el valor **completo** del `private_key`. En el campo de Vercel puedes pegarlo con sus `\n` literales tal como está en el JSON (entre comillas o sin ellas; la app hace `replace('\n')`). Lo más seguro: pégalo **exactamente** como aparece en el JSON, con las comillas incluidas.
   - `GOOGLE_SHEET_ID`
   - `STANDARD_WORKDAY_HOURS` → `8`
5. Pulsa **Deploy**. Al terminar, abre la URL que te da Vercel; te pedirá el código de acceso.

> Si cambias variables de entorno después, ve a **Settings → Environment Variables**, edítalas y haz **Redeploy**.

### Nota sobre `GOOGLE_PRIVATE_KEY` en Vercel

El error más común es la clave privada mal pegada. Recomendación:

- Copia el valor de `private_key` **incluyendo** `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n`.
- Si Vercel te lo guarda con saltos de línea reales, también funciona: la app soporta ambos formatos.

---

## Cambiar el código de acceso

El código está en la variable `ACCESS_CODE`.

- **En Vercel:** Settings → Environment Variables → edita `ACCESS_CODE` → guarda → **Redeploy** (o espera al siguiente deploy). El nuevo código se aplica a todos.
- **En local:** cambia `ACCESS_CODE` en `.env.local` y reinicia `npm run dev`.

Las sesiones ya iniciadas siguen activas hasta que expiran (12 h). Si quieres invalidar sesiones existentes de inmediato, cambia también `SESSION_SECRET` (eso cierra la sesión de todos).

---

## Editar empleados y categorías

No hace falta tocar código: edita directamente la Hoja de Google.

- **Añadir/quitar empleados:** edita la pestaña `Empleados` (una fila por persona).
- **Añadir/quitar categorías:** edita la pestaña `Categorias`.

Los cambios aparecen en la app al recargar (la lista se lee de la hoja en cada carga).

---

## Regla de cálculo

Jornada estándar = `STANDARD_WORKDAY_HOURS` (por defecto **8 h**).

| Tipo         | Días equivalentes      |
|--------------|------------------------|
| Día completo | 1                      |
| Medio día    | 0.5                    |
| Por horas    | horas ÷ jornada        |

Se muestra siempre el **tipo original** y el **equivalente en días**. El cálculo se hace en el servidor al guardar, así que el valor almacenado es fiable.

---

## Seguridad

- El código de acceso se valida **en el servidor** (`/api/login`), no en el navegador.
- Tras validar, se guarda una **cookie httpOnly** con un token de sesión firmado (JWT, expira a las 12 h).
- El **middleware** protege tanto las páginas como las **API routes**: cualquier petición sin cookie de sesión válida recibe `401` (o es redirigida al login). Nadie puede leer/escribir datos llamando a la API directamente.
- Las credenciales de Google y el código de acceso viven **solo en variables de entorno**, nunca en el código.

---

## Estructura del proyecto

```
src/
  middleware.js            Protege páginas y APIs (Edge)
  lib/
    auth.js                Firma/verificación de la sesión (JWT)
    guard.js               Comprobación de sesión en las API routes
    sheets.js              Lectura/escritura en Google Sheets
    calc.js                Cálculo de días equivalentes
    summary.js             Resúmenes mensual/anual (cliente)
  app/
    login/page.js          Pantalla de código de acceso
    page.js                Dashboard (servidor -> Dashboard)
    api/
      login/route.js       Valida ACCESS_CODE y crea la sesión
      logout/route.js      Cierra la sesión
      absences/route.js    CRUD de ausencias
      employees/route.js   Lista de empleados
      categories/route.js  Lista de categorías
  components/              Formulario, tabla, resúmenes y gráficos
```
