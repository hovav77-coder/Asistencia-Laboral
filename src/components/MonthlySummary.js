'use client';

import { MESES, monthlySummary } from '@/lib/summary';

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
  const { people, totalDias, registros } = monthlySummary(absences, year, month);

  return (
    <div className="card">
      <h2>Resumen mensual</h2>

      <div className="toolbar">
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
