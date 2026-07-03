'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { chartByMonth, chartByPerson } from '@/lib/summary';

export default function Charts({ absences, year }) {
  const byMonth = chartByMonth(absences, year);
  const byPerson = chartByPerson(absences, year);

  return (
    <div className="card">
      <h2>Gráficos {year}</h2>

      <h3 style={{ fontSize: 14, color: 'var(--muted)' }}>
        Ausencias por mes (días equivalentes)
      </h3>
      <div className="chart-box">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={byMonth}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="mes" fontSize={12} />
            <YAxis fontSize={12} allowDecimals />
            <Tooltip />
            <Bar dataKey="dias" name="Días" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h3 style={{ fontSize: 14, color: 'var(--muted)', marginTop: 24 }}>
        Ausencias por persona (días equivalentes)
      </h3>
      {byPerson.length === 0 ? (
        <p className="muted">Sin datos.</p>
      ) : (
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byPerson} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" fontSize={12} allowDecimals />
              <YAxis type="category" dataKey="nombre" width={120} fontSize={12} />
              <Tooltip />
              <Bar dataKey="dias" name="Días" fill="#16a34a" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
