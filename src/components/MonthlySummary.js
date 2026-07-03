'use client';

import { useState } from 'react';
import { MESES, monthlySummary, parseYearMonth } from '@/lib/summary';
import { TIPO_LABEL } from '@/lib/calc';
import { exportToExcel } from '@/lib/exportExcel';

function chips(obj) {
  const entries = Object.entries(obj);
  if (entries.length === 0) return <span className="muted">—</span>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {entries.map(([k, v]) => (
        <span key={k} className="badge">
          {k}: {v}
        </span>
      ))}
    </div>
  );
}

export default function MonthlySummary({ absences, year, month, onYear, onMonth }) {
  const [persona, setPersona] = useState('');
  const [exporting, setExporting] = useState(false);

  const personas = [...new Set(absences.map((a) => a.nombre))].sort((a, b) =>
    a.localeCompare(b, 'es')
  );
  const base = persona ? absences.filter((a) => a.nombre === persona) : absences;
  const { people, totalDias, registros } = monthlySummary(base, year, month);

  async function handleExport() {
    setExporting(true);
    try {
      // Hoja 1: resumen por persona (columnas dinámicas por categoría y tipo).
      const categorias = [...new Set(people.flatMap((p) => Object.keys(p.porCategoria)))];
      const tipos = [...new Set(people.flatMap((p) => Object.keys(p.porTipo)))];
      const resumen = people.map((p) => {
        const row = {
          Persona: p.nombre,
          'Total días': p.totalDias,
          Registros: p.registros,
        };
        categorias.forEach((c) => (row[c] = p.porCategoria[c] ?? ''));
        tipos.forEach((t) => (row[TIPO_LABEL[t] || t] = p.porTipo[t] ?? ''));
        return row;
      });

      // Hoja 2: detalle de los registros del mes (respeta el filtro de persona).
      const detalle = base
        .filter((a) => {
          const { year: y, month: m } = parseYearMonth(a.fecha);
          return y === year && m === month;
        })
        .sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
        .map((a) => ({
          Fecha: a.fecha,
          Persona: a.nombre,
          Tipo: TIPO_LABEL[a.tipo] || a.tipo,
          Horas: a.horas ?? '',
          Categoría: a.categoria,
          'Días equiv.': a.diasEquivalentes,
          Nota: a.nota || '',
        }));

      const mes = String(month + 1).padStart(2, '0');
      const suffix = persona ? `_${persona.replace(/\s+/g, '_')}` : '';
      await exportToExcel(`Resumen_${year}-${mes}${suffix}.xlsx`, [
        { name: `Resumen ${MESES[month]} ${year}`, rows: resumen },
        { name: 'Detalle', rows: detalle },
      ]);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2>Resumen mensual</h2>
        <button
          className="btn secondary small"
          onClick={handleExport}
          disabled={exporting || people.length === 0}
        >
          {exporting ? 'Exportando…' : '⬇ Exportar a Excel'}
        </button>
      </div>

      <div className="toolbar">
        <div className="field">
          <label>Persona</label>
          <select
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            style={{ minWidth: 160 }}
          >
            <option value="">— Todas —</option>
            {personas.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Mes</label>
          <select value={month} onChange={(e) => onMonth(Number(e.target.value))}>
            {MESES.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Año</label>
          <input
            type="number"
            value={year}
            onChange={(e) => onYear(Number(e.target.value))}
            style={{ width: 100 }}
          />
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="num">{totalDias}</div>
          <div className="lbl">Días equiv. (mes)</div>
        </div>
        <div className="stat">
          <div className="num">{registros}</div>
          <div className="lbl">Registros</div>
        </div>
        <div className="stat">
          <div className="num">{people.length}</div>
          <div className="lbl">Personas con ausencias</div>
        </div>
      </div>

      {people.length === 0 ? (
        <p className="muted">Sin ausencias en {MESES[month]} {year}.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Persona</th>
                <th>Total días</th>
                <th>Por tipo</th>
                <th>Por categoría</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.nombre}>
                  <td>{p.nombre}</td>
                  <td>
                    <span className="badge">{p.totalDias}</span>
                  </td>
                  <td style={{ whiteSpace: 'normal' }}>{chips(p.porTipo)}</td>
                  <td style={{ whiteSpace: 'normal' }}>{chips(p.porCategoria)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
