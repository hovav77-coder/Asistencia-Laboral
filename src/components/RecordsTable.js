'use client';

import { useState } from 'react';
import { TIPO_LABEL } from '@/lib/calc';

export default function RecordsTable({ absences, loading, onEdit, onDeleted, onFilter }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [deletingId, setDeletingId] = useState(null);

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
      <h2>Registros</h2>

      <div className="toolbar">
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
            onFilter?.({ from: '', to: '' });
          }}
        >
          Limpiar
        </button>
      </div>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : absences.length === 0 ? (
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
              {absences.map((a) => (
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
