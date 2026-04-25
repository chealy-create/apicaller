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

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function formatCellValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

function detectTableData(data: unknown): TableData | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const obj = data as Record<string, unknown>;

  // Array of objects
  if (Array.isArray(data)) {
    if (data.length === 0) return null;
    const firstItem = data[0];
    if (isRecord(firstItem)) {
      const headers = Object.keys(firstItem);
      const rows = data.map((item) =>
        headers.map((h) => {
          if (!isRecord(item)) return null;
          return formatCellValue(item[h]);
        })
      );
      return { headers, rows };
    }
  }

  // Financial reports
  const results = isRecord(obj.results) ? obj.results : null;
  const companies = Array.isArray(results?.companies) ? results.companies : null;
  const firstCompany = companies?.[0];
  const reports = isRecord(firstCompany) && Array.isArray(firstCompany.reports)
    ? firstCompany.reports
    : null;
  if (companies && reports) {
    const pivoted: Record<string, Record<string, string>> = {};

    companies.forEach((company) => {
      if (!isRecord(company) || !Array.isArray(company.reports)) return;
      company.reports.forEach((report) => {
        if (!isRecord(report)) return;
        const stmt = report.statement || "Unknown";
        if (!Array.isArray(report.metrics)) return;
        report.metrics.forEach((metric) => {
          if (!isRecord(metric)) return;
          const key = `${stmt} — ${metric.metric || ""}`;
          if (!pivoted[key]) {
            pivoted[key] = {};
          }
          const reportDate = String(report.reportDate || "");
          pivoted[key][reportDate] =
            metric.value === null || metric.value === undefined
              ? ""
              : String(metric.value);
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
  if (results?.dividends) {
    const dividends = Array.isArray(results.dividends)
      ? results.dividends
      : [results.dividends];
    if (dividends.length > 0 && isRecord(dividends[0])) {
      const headers = Object.keys(dividends[0]);
      const rows = dividends.map((d) =>
        headers.map((h) => (isRecord(d) ? formatCellValue(d[h]) : null))
      );
      return { headers, rows };
    }
  }

  // Earnings events
  if (results?.earningsEvents) {
    const events = Array.isArray(results.earningsEvents)
      ? results.earningsEvents
      : [results.earningsEvents];
    if (events.length > 0 && isRecord(events[0])) {
      const headers = Object.keys(events[0]);
      const rows = events.map((e) =>
        headers.map((h) => (isRecord(e) ? formatCellValue(e[h]) : null))
      );
      return { headers, rows };
    }
  }

  // Fiscal ratios
  if (Array.isArray(obj.data) && obj.data.length > 0 && isRecord(obj.data[0])) {
    const headers = Object.keys(obj.data[0]);
    const rows = obj.data.map((item) =>
      headers.map((h) => (isRecord(item) ? formatCellValue(item[h]) : null))
    );
    return { headers, rows };
  }

  // Estimates
  if (results?.estimates) {
    const estimates = Array.isArray(results.estimates)
      ? results.estimates
      : [results.estimates];
    if (estimates.length > 0 && isRecord(estimates[0])) {
      const headers = Object.keys(estimates[0]);
      const rows = estimates.map((e) =>
        headers.map((h) => (isRecord(e) ? formatCellValue(e[h]) : null))
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
