// Utilidades puras para construir resúmenes en el cliente.

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function round(n) {
  return Math.round(n * 100) / 100;
}

/** Devuelve el año (YYYY) y mes (0-11) de una fecha YYYY-MM-DD. */
export function parseYearMonth(fecha) {
  const [y, m] = (fecha || '').split('-');
  return { year: Number(y), month: Number(m) - 1 };
}

/** Resumen mensual: por persona, con desglose por tipo y categoría. */
export function monthlySummary(absences, year, month) {
  const inMonth = absences.filter((a) => {
    const { year: y, month: m } = parseYearMonth(a.fecha);
    return y === year && m === month;
  });

  const byPerson = {};
  for (const a of inMonth) {
    if (!byPerson[a.nombre]) {
      byPerson[a.nombre] = {
        nombre: a.nombre,
        totalDias: 0,
        registros: 0,
        porTipo: {},
        porCategoria: {},
      };
    }
    const p = byPerson[a.nombre];
    p.totalDias += a.diasEquivalentes;
    p.registros += 1;
    p.porTipo[a.tipo] = round((p.porTipo[a.tipo] || 0) + a.diasEquivalentes);
    p.porCategoria[a.categoria] = round(
      (p.porCategoria[a.categoria] || 0) + a.diasEquivalentes
    );
  }

  const people = Object.values(byPerson).map((p) => ({
    ...p,
    totalDias: round(p.totalDias),
  }));
  people.sort((a, b) => b.totalDias - a.totalDias);

  const totalDias = round(people.reduce((s, p) => s + p.totalDias, 0));
  return { people, totalDias, registros: inMonth.length };
}

/** Resumen anual: por persona, mes a mes, más totales del equipo por mes. */
export function annualSummary(absences, year) {
  const inYear = absences.filter((a) => parseYearMonth(a.fecha).year === year);

  const byPerson = {};
  const teamByMonth = Array(12).fill(0);

  for (const a of inYear) {
    const { month } = parseYearMonth(a.fecha);
    if (!byPerson[a.nombre]) {
      byPerson[a.nombre] = { nombre: a.nombre, months: Array(12).fill(0), total: 0 };
    }
    byPerson[a.nombre].months[month] += a.diasEquivalentes;
    byPerson[a.nombre].total += a.diasEquivalentes;
    teamByMonth[month] += a.diasEquivalentes;
  }

  const people = Object.values(byPerson).map((p) => ({
    nombre: p.nombre,
    months: p.months.map(round),
    total: round(p.total),
  }));
  people.sort((a, b) => b.total - a.total);

  return {
    people,
    teamByMonth: teamByMonth.map(round),
    total: round(teamByMonth.reduce((s, n) => s + n, 0)),
  };
}

/** Datos para el gráfico "ausencias por mes" de un año. */
export function chartByMonth(absences, year) {
  const arr = Array(12).fill(0);
  for (const a of absences) {
    const { year: y, month } = parseYearMonth(a.fecha);
    if (y === year) arr[month] += a.diasEquivalentes;
  }
  return arr.map((v, i) => ({ mes: MESES[i].slice(0, 3), dias: round(v) }));
}

/** Datos para el gráfico "ausencias por persona" de un año. */
export function chartByPerson(absences, year) {
  const byPerson = {};
  for (const a of absences) {
    if (parseYearMonth(a.fecha).year === year) {
      byPerson[a.nombre] = (byPerson[a.nombre] || 0) + a.diasEquivalentes;
    }
  }
  return Object.entries(byPerson)
    .map(([nombre, dias]) => ({ nombre, dias: round(dias) }))
    .sort((a, b) => b.dias - a.dias);
}
