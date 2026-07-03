import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/guard';
import { getCategories } from '@/lib/sheets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const categories = await getCategories();
    return NextResponse.json({ categories });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
