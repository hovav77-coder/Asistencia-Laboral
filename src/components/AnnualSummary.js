'use client';

import { useState } from 'react';
import { MESES, annualSummary } from '@/lib/summary';
import { exportToExcel } from '@/lib/exportExcel';

export default function AnnualSummary({ absences, year, onYear }) {
  const { people, teamByMonth, total } = annualSummary(absences, year);
  const mesesCortos = MESES.map((m) => m.slice(0, 3));
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const toRow = (nombre, months, tot) => {
        const row = { Persona: nombre };
        mesesCortos.forEach((m, i) => (row[m] = months[i] || ''));
        row.Total = tot;
        return row;
      };
      const rows = people.map((p) => toRow(p.nombre, p.months, p.total));
      rows.push(toRow('EQUIPO', teamByMonth, total));

      await exportToExcel(`Resumen_anual_${year}.xlsx`, [
        { name: `Resumen anual ${year}`, rows },
      ]);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2>Resumen anual</h2>
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
          <div className="num">{total}</div>
          <div className="lbl">Días equiv. (año)</div>
        </div>
        <div className="stat">
          <div className="num">{people.length}</div>
          <div className="lbl">Personas con ausencias</div>
        </div>
      </div>

      {people.length === 0 ? (
        <p className="muted">Sin ausencias en {year}.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Persona</th>
                {mesesCortos.map((m) => (
                  <th key={m} style={{ textAlign: 'center' }}>
                    {m}
                  </th>
                ))}
                <th style={{ textAlign: 'center' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.nombre}>
                  <td>{p.nombre}</td>
                  {p.months.map((v, i) => (
                    <td key={i} style={{ textAlign: 'center' }}>
                      {v || <span className="muted">·</span>}
                    </td>
                  ))}
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge">{p.total}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ fontWeight: 700 }}>Equipo</td>
                {teamByMonth.map((v, i) => (
                  <td key={i} style={{ textAlign: 'center', fontWeight: 600 }}>
                    {v || <span className="muted">·</span>}
                  </td>
                ))}
                <td style={{ textAlign: 'center', fontWeight: 700 }}>{total}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
