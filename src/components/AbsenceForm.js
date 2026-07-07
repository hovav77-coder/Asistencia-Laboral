'use client';

import { useEffect, useState } from 'react';
import { TIPO_LABEL, TIPOS, calcDiasEquivalentes } from '@/lib/calc';

const emptyForm = {
  nombre: '',
  fecha: '',
  fechaFin: '',
  tipo: 'completo',
  horas: '',
  categoria: '',
  nota: '',
};

// Cuenta los días del rango [desde, hasta] en el navegador (para el aviso).
function contarDias(desde, hasta, excluirFinde) {
  if (!desde || !hasta || hasta < desde) return 0;
  const [y1, m1, d1] = desde.split('-').map(Number);
  const [y2, m2, d2] = hasta.split('-').map(Number);
  let count = 0;
  for (let t = Date.UTC(y1, m1 - 1, d1); t <= Date.UTC(y2, m2 - 1, d2); t += 86400000) {
    const dow = new Date(t).getUTCDay();
    if (excluirFinde && (dow === 0 || dow === 6)) continue;
    count++;
    if (count > 62) break;
  }
  return count;
}

export default function AbsenceForm({
  employees,
  categories,
  workdayHours,
  editing,
  onSaved,
  onCancel,
  onEmployeeAdded,
}) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [esRango, setEsRango] = useState(false);
  const [excluirFinde, setExcluirFinde] = useState(false);
  const [showNewPerson, setShowNewPerson] = useState(false);
  const [newPerson, setNewPerson] = useState('');
  const [personError, setPersonError] = useState('');
  const [personSaving, setPersonSaving] = useState(false);

  async function saveNewPerson() {
    const nombre = newPerson.trim();
    if (!nombre) return;
    setPersonError('');
    setPersonSaving(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPersonError(data.error || 'No se pudo añadir');
      } else {
        onEmployeeAdded?.(data.nombre);
        setForm((f) => ({ ...f, nombre: data.nombre }));
        setNewPerson('');
        setShowNewPerson(false);
      }
    } catch {
      setPersonError('Error de conexión');
    } finally {
      setPersonSaving(false);
    }
  }

  useEffect(() => {
    if (editing) {
      setForm({
        nombre: editing.nombre || '',
        fecha: editing.fecha || '',
        fechaFin: '',
        tipo: editing.tipo || 'completo',
        horas: editing.horas ?? '',
        categoria: editing.categoria || '',
        nota: editing.nota || '',
      });
    } else {
      setForm(emptyForm);
    }
    setEsRango(false);
    setError('');
  }, [editing]);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const dias = calcDiasEquivalentes(form.tipo, form.horas, workdayHours);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { ...form };
      if (editing) payload.id = editing.id;
      if (esRango) {
        payload.excluirFinde = excluirFinde;
      } else {
        delete payload.fechaFin;
      }
      const res = await fetch('/api/absences', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'No se pudo guardar');
      } else {
        setForm(emptyForm);
        setEsRango(false);
        onSaved?.();
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  }

  const diasRango = esRango ? contarDias(form.fecha, form.fechaFin, excluirFinde) : 1;

  return (
    <div className="card">
      <h2>{editing ? 'Editar ausencia' : 'Registrar ausencia'}</h2>
      {error && <div className="alert error">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="row">
          <div className="field">
            <label>
              Persona{' '}
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setShowNewPerson((v) => !v);
                  setPersonError('');
                }}
              >
                {showNewPerson ? 'cancelar' : '+ nueva persona'}
              </button>
            </label>
            {showNewPerson ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={newPerson}
                  onChange={(e) => setNewPerson(e.target.value)}
                  placeholder="Nombre del empleado…"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      saveNewPerson();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn"
                  disabled={personSaving || !newPerson.trim()}
                  onClick={saveNewPerson}
                >
                  {personSaving ? '…' : 'Añadir'}
                </button>
              </div>
            ) : (
              <select
                value={form.nombre}
                onChange={(e) => set('nombre', e.target.value)}
                required
              >
                <option value="">— Selecciona —</option>
                {employees.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            )}
            {personError && (
              <p style={{ color: 'var(--danger)', fontSize: 13, margin: '6px 0 0' }}>
                {personError}
              </p>
            )}
          </div>
          <div className="field">
            <label>
              {esRango ? 'Desde' : 'Fecha'}{' '}
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setEsRango((v) => !v);
                  set('fechaFin', '');
                }}
              >
                {esRango
                  ? 'un solo día'
                  : editing
                  ? '+ extender a más días'
                  : '+ varios días seguidos'}
              </button>
            </label>
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => set('fecha', e.target.value)}
              required
            />
          </div>
        </div>

        {esRango && (
          <div className="row">
            <div className="field">
              <label>Hasta (incluido)</label>
              <input
                type="date"
                value={form.fechaFin}
                onChange={(e) => set('fechaFin', e.target.value)}
                min={form.fecha || undefined}
                required
              />
            </div>
            <div className="field">
              <label>Fines de semana</label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontWeight: 400,
                  fontSize: 14,
                  color: 'var(--text)',
                  marginTop: 10,
                }}
              >
                <input
                  type="checkbox"
                  checked={excluirFinde}
                  onChange={(e) => setExcluirFinde(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                Excluir sábados y domingos
              </label>
            </div>
          </div>
        )}

        <div className="row">
          <div className="field">
            <label>Tipo de ausencia</label>
            <select value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {TIPO_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Categoría</label>
            <select
              value={form.categoria}
              onChange={(e) => set('categoria', e.target.value)}
              required
            >
              <option value="">— Selecciona —</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {form.tipo === 'horas' && (
          <div className="field">
            <label>Número de horas (jornada = {workdayHours} h)</label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={form.horas}
              onChange={(e) => set('horas', e.target.value)}
              required
            />
          </div>
        )}

        <div className="field">
          <label>Nota (opcional)</label>
          <textarea
            value={form.nota}
            onChange={(e) => set('nota', e.target.value)}
            placeholder="Detalle opcional…"
          />
        </div>

        <p className="muted">
          {esRango ? (
            <>
              {editing ? 'Este registro se extenderá a' : 'Se registrarán'}{' '}
              <span className="badge">{diasRango} día(s)</span> — equivalente
              total:{' '}
              <span className="badge">
                {Math.round(dias * diasRango * 100) / 100} día(s)
              </span>
              {editing && diasRango > 1 && (
                <>
                  {' '}
                  (se actualiza este registro y se crean {diasRango - 1} nuevos)
                </>
              )}
            </>
          ) : (
            <>
              Equivalente en días: <span className="badge">{dias} día(s)</span>
            </>
          )}
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" type="submit" disabled={saving}>
            {saving
              ? 'Guardando…'
              : esRango
              ? editing
                ? `Guardar ${diasRango || ''} día(s)`
                : `Registrar ${diasRango || ''} día(s)`
              : editing
              ? 'Guardar cambios'
              : 'Registrar'}
          </button>
          {editing && (
            <button type="button" className="btn secondary" onClick={onCancel}>
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
