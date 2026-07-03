import Dashboard from '@/components/Dashboard';
import { getWorkdayHours } from '@/lib/calc';

export const dynamic = 'force-dynamic';

export default function Home() {
  // El middleware ya garantiza que solo llegan aquí sesiones válidas.
  const workdayHours = getWorkdayHours();
  return <Dashboard workdayHours={workdayHours} />;
}
