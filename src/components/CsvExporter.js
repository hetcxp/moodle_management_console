export function sanitizeCsvFilename(name) {
  return String(name || 'export')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'export';
}

export function exportToCsv(filename, rows, columns) {
  if (!rows || !rows.length) {
    alert('No hay datos para exportar');
    return;
  }

  // Header row
  const header = columns.map((col) => `"${col.label.replace(/"/g, '""')}"`).join(',');

  // Body rows
  const csvRows = rows.map((row) => {
    return columns
      .map((col) => {
        let val = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor];
        if (val === null || val === undefined) val = '';
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      })
      .join(',');
  });

  const csvContent = '\uFEFF' + [header, ...csvRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const safeFilename = sanitizeCsvFilename(filename);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${safeFilename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
