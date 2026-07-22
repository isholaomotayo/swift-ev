export interface CSVColumn<T = any> {
  header: string;
  key: string | ((row: T) => any);
}

/**
 * Escapes a cell value for CSV format according to RFC 4180 rules.
 */
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value);
  // If string contains quotes, commas, or newlines, wrap in quotes and escape internal double-quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Converts tabular object data into a CSV string and triggers a browser download.
 *
 * @param filename - Name of file to save (e.g., 'orders-report.csv')
 * @param columns - Array of column definitions specifying header title and accessor key/fn
 * @param data - Array of data rows
 */
export function exportToCSV<T = any>(
  filename: string,
  columns: CSVColumn<T>[],
  data: T[]
): void {
  if (!data || data.length === 0) {
    console.warn("No data provided for CSV export");
    return;
  }

  // 1. Build header row
  const headers = columns.map((col) => escapeCSVValue(col.header)).join(",");

  // 2. Build data rows
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        let val: any;
        if (typeof col.key === "function") {
          val = col.key(row);
        } else {
          val = (row as any)[col.key];
        }
        return escapeCSVValue(val);
      })
      .join(",");
  });

  // 3. Combine into final CSV content
  const csvContent = [headers, ...rows].join("\r\n");

  // 4. Create Blob and trigger download link
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
