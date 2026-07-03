import { randomUUID } from 'crypto';
import { google } from 'googleapis';
import { calcDiasEquivalentes, getWorkdayHours } from './calc';

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Nombres de las pestañas dentro de la Hoja de Google.
const TAB_AUSENCIAS = 'Ausencias';
const TAB_EMPLEADOS = 'Empleados';
const TAB_CATEGORIAS = 'Categorias';

// Orden de columnas en la pestaña Ausencias:
// A:id  B:nombre  C:fecha  D:tipo  E:horas  F:categoria  G:nota  H:diasEquivalentes  I:createdAt

// Normaliza la clave privada para tolerar los errores más comunes al pegarla
// en Vercel: comillas envolventes, saltos de línea escapados (\n) y espacios.
function normalizePrivateKey(raw) {
  if (!raw) return raw;
  let k = raw.trim();
  // Quitar comillas envolventes si el valor se pegó con ellas.
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1);
  }
  // Convertir secuencias escapadas (\r\n, \n, \r) en saltos de línea reales.
  k = k.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '\n');
  // Normalizar posibles CRLF reales a LF.
  k = k.replace(/\r\n/g, '\n');
  return k;
}

// Obtiene las credenciales. Método recomendado y a prueba de errores:
// GOOGLE_CREDENTIALS_JSON con el contenido completo del archivo .json
// (JSON.parse reconstruye la clave con sus saltos de línea correctos).
// Alternativa: las variables separadas GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY.
function getCredentials() {
  const raw = process.env.GOOGLE_CREDENTIALS_JSON;
  if (raw && raw.trim()) {
    let parsed;
    try {
      parsed = JSON.parse(raw.trim());
    } catch (e) {
      throw new Error('GOOGLE_CREDENTIALS_JSON no es un JSON válido: ' + e.message);
    }
    return {
      email: parsed.client_email,
      key: normalizePrivateKey(parsed.private_key),
    };
  }
  return {
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim(),
    key: normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY),
  };
}

function getAuth() {
  const { email, key } = getCredentials();
  if (!email || !key) {
    throw new Error(
      'Faltan credenciales de Google. Configura GOOGLE_CREDENTIALS_JSON (recomendado) o GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY'
    );
  }
  return new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function sheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

function rowToAbsence(row, rowNumber) {
  return {
    id: row[0] || '',
    nombre: row[1] || '',
    fecha: row[2] || '',
    tipo: row[3] || '',
    horas: row[4] ? Number(row[4]) : null,
    categoria: row[5] || '',
    nota: row[6] || '',
    diasEquivalentes: row[7] ? Number(row[7]) : 0,
    createdAt: row[8] || '',
    _row: rowNumber, // número de fila real en la hoja (para editar/borrar)
  };
}

// Detecta si una fila es la cabecera (por si la hoja la tiene en la fila 1).
function isHeaderRow(row) {
  return (row?.[0] || '').trim().toLowerCase() === 'id';
}

/** Lee todas las ausencias. Filtro opcional por rango de fechas (YYYY-MM-DD). */
export async function getAbsences({ from, to } = {}) {
  const sheets = sheetsClient();
  // Leemos desde la fila 1 para no depender de que exista una cabecera:
  // así los números de fila cuadran aunque el primer dato esté en la fila 1.
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB_AUSENCIAS}!A1:I`,
  });
  const rows = res.data.values || [];
  let list = rows
    .map((row, i) => rowToAbsence(row, i + 1)) // fila real = índice + 1
    // Un registro válido tiene id, fecha y tipo. Así se ignoran filas vacías,
    // la cabecera (id === 'id') y cualquier texto suelto (p. ej. "Ausencias" en A1).
    .filter((a) => a.id && a.id.toLowerCase() !== 'id' && a.fecha && a.tipo);

  if (from) list = list.filter((a) => a.fecha >= from);
  if (to) list = list.filter((a) => a.fecha <= to);

  // Orden descendente por fecha.
  list.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  return list;
}

/** Crea una nueva ausencia (una fila nueva). */
export async function createAbsence(data) {
  const sheets = sheetsClient();
  const jornada = getWorkdayHours();
  const id = randomUUID();
  const dias = calcDiasEquivalentes(data.tipo, data.horas, jornada);
  const createdAt = new Date().toISOString();
  const horas = data.tipo === 'horas' ? Number(data.horas) : '';

  const values = [[
    id,
    data.nombre,
    data.fecha,
    data.tipo,
    horas,
    data.categoria,
    data.nota || '',
    dias,
    createdAt,
  ]];

  // Colocación determinista: escribir en la primera fila libre (según la
  // columna A). Evita el comportamiento impredecible de append() cuando la
  // hoja tiene texto suelto o no tiene cabecera.
  const colA = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB_AUSENCIAS}!A1:A`,
  });
  const targetRow = (colA.data.values || []).length + 1;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${TAB_AUSENCIAS}!A${targetRow}:I${targetRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });

  return { id, ...data, horas: horas || null, diasEquivalentes: dias, createdAt };
}

async function findRowById(sheets, id) {
  // Leemos desde A1 (fila real = índice + 1) para que cuadre haya o no cabecera.
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB_AUSENCIAS}!A1:A`,
  });
  const ids = res.data.values || [];
  const index = ids.findIndex((r) => r[0] === id);
  if (index === -1) return null;
  return index + 1; // número de fila real
}

/** Actualiza una ausencia existente identificada por id. */
export async function updateAbsence(id, data) {
  const sheets = sheetsClient();
  const rowNumber = await findRowById(sheets, id);
  if (!rowNumber) throw new Error('Registro no encontrado');

  const jornada = getWorkdayHours();
  const dias = calcDiasEquivalentes(data.tipo, data.horas, jornada);
  const createdAt = new Date().toISOString();
  const horas = data.tipo === 'horas' ? Number(data.horas) : '';

  const values = [[
    id,
    data.nombre,
    data.fecha,
    data.tipo,
    horas,
    data.categoria,
    data.nota || '',
    dias,
    createdAt,
  ]];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${TAB_AUSENCIAS}!A${rowNumber}:I${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });

  return { id, ...data, horas: horas || null, diasEquivalentes: dias };
}

async function getSheetGid(sheets, title) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const sheet = meta.data.sheets.find((s) => s.properties.title === title);
  if (!sheet) throw new Error(`No existe la pestaña "${title}"`);
  return sheet.properties.sheetId;
}

/** Borra una ausencia (elimina la fila completa). */
export async function deleteAbsence(id) {
  const sheets = sheetsClient();
  const rowNumber = await findRowById(sheets, id);
  if (!rowNumber) throw new Error('Registro no encontrado');

  const gid = await getSheetGid(sheets, TAB_AUSENCIAS);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: gid,
              dimension: 'ROWS',
              startIndex: rowNumber - 1, // base 0
              endIndex: rowNumber, // exclusivo
            },
          },
        },
      ],
    },
  });

  return { id };
}

/** Lee la lista de empleados desde la pestaña Empleados (columna A). */
export async function getEmployees() {
  const sheets = sheetsClient();
  // Desde A1 y filtrando la posible cabecera, para no depender de su existencia.
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB_EMPLEADOS}!A1:A`,
  });
  const rows = res.data.values || [];
  return rows
    .map((r) => (r[0] || '').trim())
    .filter((n) => n && n.toLowerCase() !== 'nombre');
}

/** Añade un empleado nuevo a la pestaña Empleados (primera fila libre). */
export async function addEmployee(nombre) {
  const clean = (nombre || '').trim();
  if (!clean) throw new Error('El nombre no puede estar vacío');

  const sheets = sheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB_EMPLEADOS}!A1:A`,
  });
  const rows = res.data.values || [];
  const existing = rows.map((r) => (r[0] || '').trim()).filter(Boolean);
  if (existing.some((n) => n.toLowerCase() === clean.toLowerCase())) {
    throw new Error('Ese empleado ya existe en la lista');
  }

  const targetRow = rows.length + 1;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${TAB_EMPLEADOS}!A${targetRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[clean]] },
  });

  return clean;
}

/** Elimina un empleado de la pestaña Empleados (borra su fila). */
export async function deleteEmployee(nombre) {
  const clean = (nombre || '').trim();
  if (!clean) throw new Error('El nombre no puede estar vacío');

  const sheets = sheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB_EMPLEADOS}!A1:A`,
  });
  const rows = res.data.values || [];
  const index = rows.findIndex(
    (r) => (r[0] || '').trim().toLowerCase() === clean.toLowerCase()
  );
  if (index === -1) throw new Error('Empleado no encontrado');

  const gid = await getSheetGid(sheets, TAB_EMPLEADOS);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: gid,
              dimension: 'ROWS',
              startIndex: index, // base 0
              endIndex: index + 1,
            },
          },
        },
      ],
    },
  });

  return clean;
}

/** Lee la lista de categorías desde la pestaña Categorias (columna A). */
export async function getCategories() {
  const sheets = sheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB_CATEGORIAS}!A1:A`,
  });
  const rows = res.data.values || [];
  const list = rows
    .map((r) => (r[0] || '').trim())
    .filter((c) => c && c.toLowerCase() !== 'categoria');
  // Valores por defecto si la pestaña está vacía.
  return list.length
    ? list
    : ['justificada', 'injustificada', 'vacaciones', 'enfermedad', 'permiso'];
}
