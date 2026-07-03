import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/guard';
import { getEmployees } from '@/lib/sheets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const employees = await getEmployees();
    return NextResponse.json({ employees });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
