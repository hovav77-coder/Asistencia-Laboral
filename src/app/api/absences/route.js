import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/guard';
import {
  getAbsences,
  createAbsence,
  updateAbsence,
  deleteAbsence,
} from '@/lib/sheets';
import { TIPOS } from '@/lib/calc';

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
    const created = await createAbsence(body);
    return NextResponse.json({ absence: created }, { status: 201 });
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
