import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/guard';
import { getEmployees, addEmployee, deleteEmployee } from '@/lib/sheets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAuth() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const employees = await getEmployees();
    return NextResponse.json({ employees });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const body = await req.json().catch(() => null);
  const nombre = (body?.nombre || '').trim();
  if (!nombre) {
    return NextResponse.json({ error: 'Falta el nombre' }, { status: 400 });
  }

  try {
    const created = await addEmployee(nombre);
    return NextResponse.json({ nombre: created }, { status: 201 });
  } catch (e) {
    const status = e.message.includes('ya existe') ? 409 : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}

export async function DELETE(req) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { searchParams } = new URL(req.url);
  const nombre = (searchParams.get('nombre') || '').trim();
  if (!nombre) {
    return NextResponse.json({ error: 'Falta el nombre' }, { status: 400 });
  }

  try {
    await deleteEmployee(nombre);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const status = e.message.includes('no encontrado') ? 404 : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
