'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AbsenceForm from './AbsenceForm';
import RecordsTable from './RecordsTable';
import MonthlySummary from './MonthlySummary';
import AnnualSummary from './AnnualSummary';
import Charts from './Charts';
import EmployeesManager from './EmployeesManager';

const TABS = [
  { key: 'registrar', label: 'Registrar' },
  { key: 'registros', label: 'Registros' },
  { key: 'mensual', label: 'Resumen mensual' },
  { key: 'anual', label: 'Resumen anual' },
  { key: 'graficos', label: 'Gráficos' },
  { key: 'empleados', label: 'Empleados' },
];

export default function Dashboard({ workdayHours }) {
  const router = useRouter();
  const now = new Date();

  const [tab, setTab] = useState('registrar');
  const [employees, setEmployees] = useState([]);
  const [categories, setCategories] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState({ from: '', to: '' });

  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [annualYear, setAnnualYear] = useState(now.getFullYear());

  const loadEmployees = useCallback(async () => {
    const res = await fetch('/api/employees').then((r) => r.json()).catch(() => ({}));
    setEmployees(res.employees || []);
  }, []);

  const loadAbsences = useCallback(async (f = filter) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (f.from) params.set('from', f.from);
    if (f.to) params.set('to', f.to);
    const res = await fetch(`/api/absences?${params.toString()}`);
    if (res.status === 401) {
      router.replace('/login');
      return;
    }
    const data = await res.json().catch(() => ({ absences: [] }));
    setAbsences(data.absences || []);
    setLoading(false);
  }, [filter, router]);

  useEffect(() => {
    (async () => {
      const [emp, cat] = await Promise.all([
        fetch('/api/employees').then((r) => r.json()).catch(() => ({})),
        fetch('/api/categories').then((r) => r.json()).catch(() => ({})),
      ]);
      setEmployees(emp.employees || []);
      setCategories(cat.categories || []);
      await loadAbsences({ from: '', to: '' });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  function handleSaved() {
    setEditing(null);
    setTab('registros');
    loadAbsences();
  }

  function handleEdit(a) {
    setEditing(a);
    setTab('registrar');
  }

  function handleFilter(f) {
    setFilter(f);
    loadAbsences(f);
  }

  return (
    <div className="container">
      <div className="topbar">
        <h1>Control de Asistencia</h1>
        <button className="btn secondary" onClick={logout}>
          Cerrar sesión
        </button>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'registrar' && (
        <AbsenceForm
          employees={employees}
          categories={categories}
          workdayHours={workdayHours}
          editing={editing}
          onSaved={handleSaved}
          onCancel={() => setEditing(null)}
          onEmployeeAdded={(nombre) =>
            setEmployees((list) => (list.includes(nombre) ? list : [...list, nombre]))
          }
        />
      )}

      {tab === 'registros' && (
        <RecordsTable
          absences={absences}
          loading={loading}
          onEdit={handleEdit}
          onDeleted={loadAbsences}
          onFilter={handleFilter}
        />
      )}

      {tab === 'mensual' && (
        <MonthlySummary
          absences={absences}
          year={year}
          month={month}
          onYear={setYear}
          onMonth={setMonth}
        />
      )}

      {tab === 'anual' && (
        <AnnualSummary absences={absences} year={annualYear} onYear={setAnnualYear} />
      )}

      {tab === 'graficos' && <Charts absences={absences} year={annualYear} />}

      {tab === 'empleados' && (
        <EmployeesManager
          employees={employees}
          onChanged={() => {
            loadEmployees();
            loadAbsences(); // un renombrado también actualiza el historial
          }}
        />
      )}

      {(tab === 'mensual' || tab === 'anual' || tab === 'graficos') &&
        (filter.from || filter.to) && (
          <p className="muted" style={{ textAlign: 'center' }}>
            Nota: hay un filtro de fechas activo en «Registros» que limita estos datos.
            Límpialo para ver todo.
          </p>
        )}
    </div>
  );
}
