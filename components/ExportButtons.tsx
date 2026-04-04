"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

interface ExportButtonsProps {
  data: unknown;
  filename: string;
}

interface TableData {
  headers: string[];
  rows: unknown[][];
}

function detectTableData(data: unknown): TableData | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const obj = data as Record<string, any>;

  // Array of objects
  if (Array.isArray(data)) {
    if (data.length === 0) return null;
    const firstItem = data[0];
    if (typeof firstItem === "object" && firstItem !== null) {
      const headers = Object.keys(firstItem);
      const rows = data.map((item) =>
        headers.map((h) => {
          const val = (item as Record<string, any>)[h];
          if (val === null || val === undefined) return null;
          if (typeof val === "object") return JSON.stringify(val);
          return val;
        })
      );
      return { headers, rows };
    }
  }

  // Financial reports
  if (obj.results?.companies?.[0]?.reports) {
    const companies = obj.results.companies;
    const pivoted: Record<string, Record<string, string>> = {};

    companies.forEach((company: any) => {
      company.reports?.forEach((report: any) => {
        const stmt = report.statement || "Unknown";
        report.metrics?.forEach((metric: any) => {
          const key = `${stmt} — ${metric.metric || ""}`;
          if (!pivoted[key]) {
            pivoted[key] = {};
          }
          pivoted[key][report.reportDate || ""] =
            metric.value?.toString() || "";
        });
      });
    });

    const dateSet = new Set<string>();
    Object.values(pivoted).forEach((row) => {
      Object.keys(row).forEach((date) => dateSet.add(date));
    });
    const dates = Array.from(dateSet).sort();
    const headers = ["Metric", ...dates];
    const rows = Object.entries(pivoted).map(([metric, values]) => [
      metric,
      ...dates.map((d) => values[d] || "—"),
    ]);

    return { headers, rows };
  }

  // Dividends
  if (obj.results?.dividends) {
    const dividends = Array.isArray(obj.results.dividends)
      ? obj.results.dividends
      : [obj.results.dividends];
    if (dividends.length > 0) {
      const headers = Object.keys(dividends[0]);
      const rows = dividends.map((d: Record<string, unknown>) =>
        headers.map((h) => {
          const val = d[h];
          if (val === null || val === undefined) return null;
          if (typeof val === "object") return JSON.stringify(val);
          return val;
        })
      );
      return { headers, rows };
    }
  }

  // Earnings events
  if (obj.results?.earningsEvents) {
    const events = Array.isArray(obj.results.earningsEvents)
      ? obj.results.earningsEvents
      : [obj.results.earningsEvents];
    if (events.length > 0) {
      const headers = Object.keys(events[0]);
      const rows = events.map((e: Record<string, unknown>) =>
        headers.map((h) => {
          const val = e[h];
          if (val === null || val === undefined) return null;
          if (typeof val === "object") return JSON.stringify(val);
          return val;
        })
      );
      return { headers, rows };
    }
  }

  // Fiscal ratios
  if (Array.isArray(obj.data) && obj.data.length > 0) {
    const headers = Object.keys(obj.data[0]);
    const rows = obj.data.map((item: Record<string, unknown>) =>
      headers.map((h) => {
        const val = item[h];
        if (val === null || val === undefined) return null;
        if (typeof val === "object") return JSON.stringify(val);
        return val;
      })
    );
    return { headers, rows };
  }

  // Estimates
  if (obj.results?.estimates) {
    const estimates = Array.isArray(obj.results.estimates)
      ? obj.results.estimates
      : [obj.results.estimates];
    if (estimates.length > 0) {
      const headers = Object.keys(estimates[0]);
      const rows = estimates.map((e: Record<string, unknown>) =>
        headers.map((h) => {
          const val = e[h];
          if (val === null || val === undefined) return null;
          if (typeof val === "object") return JSON.stringify(val);
          return val;
        })
      );
      return { headers, rows };
    }
  }

  return null;
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
      const tableData = detectTableData(data);

      if (tableData) {
        // Create a single sheet with detected table
        const wsData = [tableData.headers, ...tableData.rows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "Data");
      } else {
        // Create a sheet with raw JSON
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
