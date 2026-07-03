'use client';

import { useEffect, useState } from 'react';
import { TIPO_LABEL, TIPOS, calcDiasEquivalentes } from '@/lib/calc';

const emptyForm = {
  nombre: '',
  fecha: '',
  tipo: 'completo',
  horas: '',
  categoria: '',
  nota: '',
};

export default function AbsenceForm({
  employees,
  categories,
  workdayHours,
  editing,
  onSaved,
  onCancel,
}) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        nombre: editing.nombre || '',
        fecha: editing.fecha || '',
        tipo: editing.tipo || 'completo',
        horas: editing.horas ?? '',
        categoria: editing.categoria || '',
        nota: editing.nota || '',
      });
    } else {
      setForm(emptyForm);
    }
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
        onSaved?.();
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h2>{editing ? 'Editar ausencia' : 'Registrar ausencia'}</h2>
      {error && <div className="alert error">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="row">
          <div className="field">
            <label>Persona</label>
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
          </div>
          <div className="field">
            <label>Fecha</label>
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => set('fecha', e.target.value)}
              required
            />
          </div>
        </div>

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
          Equivalente en días:{' '}
          <span className="badge">{dias} día(s)</span>
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" type="submit" disabled={saving}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Registrar'}
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
