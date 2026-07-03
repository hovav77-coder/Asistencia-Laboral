'use client';

import { useState } from 'react';

export default function EmployeesManager({ employees, onChanged }) {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState('');

  async function addEmployee() {
    const nombre = newName.trim();
    if (!nombre) return;
    setError('');
    setSuccess('');
    setAdding(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'No se pudo añadir');
      } else {
        setNewName('');
        setSuccess(`"${data.nombre}" añadido a la lista`);
        onChanged?.();
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setAdding(false);
    }
  }

  async function removeEmployee(nombre) {
    if (
      !confirm(
        `¿Eliminar a "${nombre}" de la lista de empleados?\n\n` +
          'Sus ausencias ya registradas NO se borran (se conserva el historial).'
      )
    )
      return;
    setError('');
    setSuccess('');
    setDeleting(nombre);
    try {
      const res = await fetch(
        `/api/employees?nombre=${encodeURIComponent(nombre)}`,
        { method: 'DELETE' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'No se pudo eliminar');
      } else {
        setSuccess(`"${nombre}" eliminado de la lista`);
        onChanged?.();
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setDeleting('');
    }
  }

  return (
    <div className="card">
      <h2>Empleados</h2>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <div className="toolbar">
        <div className="field" style={{ flex: 1, minWidth: 220 }}>
          <label>Añadir empleado</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre completo…"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addEmployee();
              }
            }}
          />
        </div>
        <button
          className="btn"
          disabled={adding || !newName.trim()}
          onClick={addEmployee}
        >
          {adding ? 'Añadiendo…' : 'Añadir'}
        </button>
      </div>

      {employees.length === 0 ? (
        <p className="muted">No hay empleados en la lista.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((n, i) => (
                <tr key={n}>
                  <td className="muted">{i + 1}</td>
                  <td>{n}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn danger small"
                      disabled={deleting === n}
                      onClick={() => removeEmployee(n)}
                    >
                      {deleting === n ? '…' : 'Eliminar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
        Eliminar a alguien solo lo quita de la lista para nuevos registros; su
        historial de ausencias se conserva.
      </p>
    </div>
  );
}
