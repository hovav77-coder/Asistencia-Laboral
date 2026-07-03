import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/guard';
import {
  getAbsences,
  createAbsence,
  createAbsencesRange,
  updateAbsence,
  deleteAbsence,
} from '@/lib/sheets';
import { TIPOS } from '@/lib/calc';

const MAX_RANGO_DIAS = 31;

// Genera las fechas YYYY-MM-DD del rango [desde, hasta], ambos inclusive.
// Usa UTC para evitar desfases por zona horaria.
function buildDateRange(desde, hasta, excluirFinde) {
  const [y1, m1, d1] = desde.split('-').map(Number);
  const [y2, m2, d2] = hasta.split('-').map(Number);
  const start = Date.UTC(y1, m1 - 1, d1);
  const end = Date.UTC(y2, m2 - 1, d2);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;

  const fechas = [];
  for (let t = start; t <= end; t += 86400000) {
    const d = new Date(t);
    const dow = d.getUTCDay(); // 0 = domingo, 6 = sábado
    if (excluirFinde && (dow === 0 || dow === 6)) continue;
    fechas.push(d.toISOString().slice(0, 10));
    if (fechas.length > MAX_RANGO_DIAS) return 'too_long';
  }
  return fechas;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAuth() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  return null;
}

function validate(body) {
  if (!body?.nombre) return 'Falta el nombre';
  if (!body?.fecha) return 'Falta la fecha';
  if (!TIPOS.includes(body?.tipo)) return 'Tipo de ausencia inválido';
  if (!body?.categoria) return 'Falta la categoría';
  if (body.tipo === 'horas') {
    const n = Number(body.horas);
    if (!Number.isFinite(n) || n <= 0) return 'Indica un número de horas válido';
  }
  return null;
}

export async function GET(req) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;

  try {
    const data = await getAbsences({ from, to });
    return NextResponse.json({ absences: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const body = await req.json().catch(() => null);
  const err = validate(body);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  try {
    // Rango de fechas: crea un registro por cada día del rango.
    if (body.fechaFin && body.fechaFin !== body.fecha) {
      const fechas = buildDateRange(body.fecha, body.fechaFin, !!body.excluirFinde);
      if (fechas === null) {
        return NextResponse.json(
          { error: 'Rango de fechas inválido (la fecha final debe ser posterior)' },
          { status: 400 }
        );
      }
      if (fechas === 'too_long') {
        return NextResponse.json(
          { error: `El rango no puede superar ${MAX_RANGO_DIAS} días` },
          { status: 400 }
        );
      }
      if (fechas.length === 0) {
        return NextResponse.json(
          { error: 'El rango no contiene ningún día (¿todo cae en fin de semana?)' },
          { status: 400 }
        );
      }
      const result = await createAbsencesRange(body, fechas);
      return NextResponse.json({ ...result }, { status: 201 });
    }

    const created = await createAbsence(body);
    return NextResponse.json({ absence: created, created: 1 }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 });
  const err = validate(body);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  try {
    const updated = await updateAbsence(body.id, body);
    return NextResponse.json({ absence: updated });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 });

  try {
    await deleteAbsence(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
