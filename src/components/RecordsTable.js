'use client';

import { useState } from 'react';
import { TIPO_LABEL } from '@/lib/calc';
import { exportToExcel } from '@/lib/exportExcel';

export default function RecordsTable({ absences, loading, onEdit, onDeleted, onFilter }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [persona, setPersona] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const rows = [...visibles]
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
      const suffix = persona ? `_${persona.replace(/\s+/g, '_')}` : '';
      await exportToExcel(`Registros${suffix}.xlsx`, [
        { name: 'Registros', rows },
      ]);
    } finally {
      setExporting(false);
    }
  }

  // Nombres presentes en los registros cargados (incluye históricos).
  const personas = [...new Set(absences.map((a) => a.nombre))].sort((a, b) =>
    a.localeCompare(b, 'es')
  );

  const visibles = persona
    ? absences.filter((a) => a.nombre === persona)
    : absences;

  const totalDias =
    Math.round(visibles.reduce((s, a) => s + (a.diasEquivalentes || 0), 0) * 100) /
    100;

  async function handleDelete(a) {
    if (!confirm(`¿Borrar la ausencia de ${a.nombre} del ${a.fecha}?`)) return;
    setDeletingId(a.id);
    try {
      const res = await fetch(`/api/absences?id=${encodeURIComponent(a.id)}`, {
        method: 'DELETE',
      });
      if (res.ok) onDeleted?.();
      else alert('No se pudo borrar');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2>Registros</h2>
        <button
          className="btn secondary small"
          onClick={handleExport}
          disabled={exporting || visibles.length === 0}
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
          <label>Desde</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="field">
          <label>Hasta</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button className="btn secondary" onClick={() => onFilter?.({ from, to })}>
          Filtrar
        </button>
        <button
          className="btn secondary"
          onClick={() => {
            setFrom('');
            setTo('');
            setPersona('');
            onFilter?.({ from: '', to: '' });
          }}
        >
          Limpiar
        </button>
      </div>

      {!loading && visibles.length > 0 && (
        <p className="muted" style={{ marginTop: 0 }}>
          {persona ? (
            <>
              <strong>{persona}</strong>: {visibles.length} registro(s) —{' '}
              <span className="badge">{totalDias} día(s) equiv.</span>
            </>
          ) : (
            <>
              {visibles.length} registro(s) —{' '}
              <span className="badge">{totalDias} día(s) equiv.</span>
            </>
          )}
        </p>
      )}

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : visibles.length === 0 ? (
        <p className="muted">No hay registros para el filtro seleccionado.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Persona</th>
                <th>Tipo</th>
                <th>Categoría</th>
                <th>Días equiv.</th>
                <th>Nota</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((a) => (
                <tr key={a.id}>
                  <td>{a.fecha}</td>
                  <td>{a.nombre}</td>
                  <td>
                    {TIPO_LABEL[a.tipo] || a.tipo}
                    {a.tipo === 'horas' && a.horas ? ` (${a.horas} h)` : ''}
                  </td>
                  <td>{a.categoria}</td>
                  <td>
                    <span className="badge">{a.diasEquivalentes}</span>
                  </td>
                  <td
                    className="muted"
                    style={{ whiteSpace: 'normal', maxWidth: 220 }}
                  >
                    {a.nota}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn secondary small" onClick={() => onEdit?.(a)}>
                        Editar
                      </button>
                      <button
                        className="btn danger small"
                        disabled={deletingId === a.id}
                        onClick={() => handleDelete(a)}
                      >
                        {deletingId === a.id ? '…' : 'Borrar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
