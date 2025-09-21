"use client";

export type CsvRow = Record<string, string | number | boolean | null | undefined>;

function serializeValue(value: CsvRow[keyof CsvRow]) {
        if (value === null || value === undefined) {
                return "";
        }

        if (typeof value === "string") {
                const needsQuotes = value.includes(",") || value.includes("\n") || value.includes('"');
                const escaped = value.replace(/"/g, '""');
                return needsQuotes ? `"${escaped}"` : escaped;
        }

        return String(value);
}

export function exportRowsToCsv(filename: string, rows: CsvRow[]) {
        if (!rows.length) {
                return;
        }

        const headers = Object.keys(rows[0]);
        const csv = [headers.join(",")]
                .concat(rows.map((row) => headers.map((header) => serializeValue(row[header])).join(",")))
                .join("\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
}
