'use client';

/**
 * Exporta hojas de datos a un archivo .xlsx y lo descarga.
 * La librería xlsx se carga bajo demanda (solo al exportar).
 *
 * @param {string} filename  Nombre del archivo (con .xlsx)
 * @param {Array<{name: string, rows: object[]}>} sheets
 *   Cada hoja: nombre de pestaña y filas como objetos (las claves son cabeceras).
 */
export async function exportToExcel(filename, sheets) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  for (const { name, rows } of sheets) {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);

    // Ancho de columnas según el contenido.
    if (rows.length) {
      const keys = Object.keys(rows[0]);
      ws['!cols'] = keys.map((k) => {
        const maxLen = rows.reduce(
          (m, r) => Math.max(m, String(r[k] ?? '').length),
          k.length
        );
        return { wch: Math.min(Math.max(maxLen + 2, 8), 40) };
      });
    }

    // Los nombres de pestaña en Excel admiten máx. 31 caracteres.
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  }

  XLSX.writeFile(wb, filename);
}
