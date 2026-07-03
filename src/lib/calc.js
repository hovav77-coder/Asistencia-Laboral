/** Jornada estándar (horas) tomada de la variable de entorno, por defecto 8. */
export function getWorkdayHours() {
  const h = Number(process.env.STANDARD_WORKDAY_HOURS);
  return Number.isFinite(h) && h > 0 ? h : 8;
}

/**
 * Convierte una ausencia a "días equivalentes".
 *  - completo -> 1
 *  - medio    -> 0.5
 *  - horas    -> horas / jornada
 */
export function calcDiasEquivalentes(tipo, horas, jornada = getWorkdayHours()) {
  if (tipo === 'completo') return 1;
  if (tipo === 'medio') return 0.5;
  if (tipo === 'horas') {
    const n = Number(horas);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round((n / jornada) * 10000) / 10000;
  }
  return 0;
}

export const TIPOS = ['completo', 'medio', 'horas'];

export const TIPO_LABEL = {
  completo: 'Día completo',
  medio: 'Medio día',
  horas: 'Por horas',
};
