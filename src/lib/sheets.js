import { randomUUID } from 'crypto';
import { google } from 'googleapis';
import { calcDiasEquivalentes, getWorkdayHours } from './calc';

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Nombres de las pestañas dentro de la Hoja de Google.
const TAB_AUSENCIAS = 'Ausencias';
const TAB_EMPLEADOS = 'Empleados';
const TAB_CATEGORIAS = 'Categorias';

// Orden de columnas en la pestaña Ausencias (fila 1 = cabecera).
// A:id  B:nombre  C:fecha  D:tipo  E:horas  F:categoria  G:nota  H:diasEquivalentes  I:createdAt
const AUSENCIAS_RANGE = `${TAB_AUSENCIAS}!A2:I`;

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

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const key = normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY);
  if (!email || !key) {
    throw new Error('Faltan GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_PRIVATE_KEY');
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

/** Lee todas las ausencias. Filtro opcional por rango de fechas (YYYY-MM-DD). */
export async function getAbsences({ from, to } = {}) {
  const sheets = sheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: AUSENCIAS_RANGE,
  });
  const rows = res.data.values || [];
  let list = rows
    .map((row, i) => rowToAbsence(row, i + 2)) // +2 porque empieza en A2
    .filter((a) => a.id); // ignora filas vacías

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

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: AUSENCIAS_RANGE,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  });

  return { id, ...data, horas: horas || null, diasEquivalentes: dias, createdAt };
}

async function findRowById(sheets, id) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB_AUSENCIAS}!A2:A`,
  });
  const ids = res.data.values || [];
  const index = ids.findIndex((r) => r[0] === id);
  if (index === -1) return null;
  return index + 2; // número de fila real
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
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB_EMPLEADOS}!A2:A`,
  });
  const rows = res.data.values || [];
  return rows.map((r) => (r[0] || '').trim()).filter(Boolean);
}

/** Lee la lista de categorías desde la pestaña Categorias (columna A). */
export async function getCategories() {
  const sheets = sheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB_CATEGORIAS}!A2:A`,
  });
  const rows = res.data.values || [];
  const list = rows.map((r) => (r[0] || '').trim()).filter(Boolean);
  // Valores por defecto si la pestaña está vacía.
  return list.length
    ? list
    : ['justificada', 'injustificada', 'vacaciones', 'enfermedad', 'permiso'];
}
