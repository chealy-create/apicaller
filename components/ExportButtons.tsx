"use client";

import { useState } from "react";
import { detectTableData, type TableData } from "@/lib/tableData";
import * as XLSX from "xlsx";

interface ExportButtonsProps {
  data: unknown;
  filename: string;
}

const INVALID_SHEET_NAME_CHARS = /[\[\]*?:/\\]/g;

function hasExportableRows(table: TableData): boolean {
  return table.headers.length > 0 && table.rows.length > 0;
}

function sanitizeWorksheetName(
  preferredName: string | undefined,
  fallbackName: string,
  usedNames: Set<string>
): string {
  const base =
    (preferredName || fallbackName)
      .replace(INVALID_SHEET_NAME_CHARS, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 31) || fallbackName;
  let name = base;
  let suffix = 2;

  while (usedNames.has(name.toLowerCase())) {
    const marker = ` (${suffix})`;
    name = `${base.slice(0, 31 - marker.length)}${marker}`;
    suffix += 1;
  }

  usedNames.add(name.toLowerCase());
  return name;
}

export default function ExportButtons({
  data,
  filename,
}: ExportButtonsProps) {
  const [exporting, setExporting] = useState(false);

  const handleDownloadJson = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadExcel = async () => {
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      const tables = detectTableData(data).filter(hasExportableRows);

      if (tables.length > 0) {
        const usedSheetNames = new Set<string>();
        tables.forEach((table, index) => {
          const wsData = [table.headers, ...table.rows];
          const ws = XLSX.utils.aoa_to_sheet(wsData);
          const sheetName = sanitizeWorksheetName(
            table.title,
            index === 0 ? "Data" : `Data ${index + 1}`,
            usedSheetNames
          );
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });
      } else {
        const jsonString = JSON.stringify(data, null, 2);
        const ws = XLSX.utils.aoa_to_sheet([[jsonString]]);
        XLSX.utils.book_append_sheet(wb, ws, "JSON");
      }

      XLSX.writeFile(wb, `${filename}.xlsx`);
    } catch (error) {
      console.error("Failed to export to Excel:", error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleDownloadJson}
        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
      >
        Download JSON
      </button>
      <button
        onClick={handleDownloadExcel}
        disabled={exporting}
        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
      >
        {exporting ? "Exporting..." : "Download Excel"}
      </button>
    </div>
  );
}
