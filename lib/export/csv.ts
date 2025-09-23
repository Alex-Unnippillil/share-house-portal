export type CsvCell = string | number | boolean | null | undefined;

function serializeCell(value: CsvCell): string {
  if (value === null || value === undefined) {
    return '""';
  }

  const stringValue = typeof value === 'string' ? value : String(value);
  const sanitized = stringValue.replace(/"/g, '""');
  return `"${sanitized}"`;
}

export function serializeRow(values: CsvCell[]): string {
  return values.map(serializeCell).join(',');
}

export function buildCsvString(headers: string[], rows: CsvCell[][]): string {
  const serializedRows = rows.map(serializeRow);
  return [serializeRow(headers), ...serializedRows].join('\n');
}

export function buildCsvStream(headers: string[], rows: CsvCell[][]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`${serializeRow(headers)}\n`));

      for (const row of rows) {
        controller.enqueue(encoder.encode(`${serializeRow(row)}\n`));
      }

      controller.close();
    },
  });
}
