'use client';

import { useState } from 'react';

export default function EmployeesManager({ employees, onChanged }) {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState('');
  const [editing, setEditing] = useState(''); // nombre en edición
  const [editValue, setEditValue] = useState('');
  const [renaming, setRenaming] = useState(false);

  function startEdit(nombre) {
    setEditing(nombre);
    setEditValue(nombre);
    setError('');
    setSuccess('');
  }

  async function saveRename() {
    const nuevoNombre = editValue.trim();
    if (!nuevoNombre || nuevoNombre === editing) {
      setEditing('');
      return;
    }
    setError('');
    setSuccess('');
    setRenaming(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: editing, nuevoNombre }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'No se pudo renombrar');
      } else {
        setSuccess(
          `Renombrado a "${data.nombre}"` +
            (data.actualizados
              ? ` (${data.actualizados} registro(s) del historial actualizados)`
              : '')
        );
        setEditing('');
        onChanged?.();
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setRenaming(false);
    }
  }

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
                  <td style={{ whiteSpace: 'normal', minWidth: 200 }}>
                    {editing === n ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            saveRename();
                          }
                          if (e.key === 'Escape') setEditing('');
                        }}
                      />
                    ) : (
                      n
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {editing === n ? (
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="btn small"
                          disabled={renaming || !editValue.trim()}
                          onClick={saveRename}
                        >
                          {renaming ? '…' : 'Guardar'}
                        </button>
                        <button
                          className="btn secondary small"
                          onClick={() => setEditing('')}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="btn secondary small"
                          onClick={() => startEdit(n)}
                        >
                          Renombrar
                        </button>
                        <button
                          className="btn danger small"
                          disabled={deleting === n}
                          onClick={() => removeEmployee(n)}
                        >
                          {deleting === n ? '…' : 'Eliminar'}
                        </button>
                      </div>
                    )}
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
