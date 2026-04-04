"use client";

import { useState, useMemo } from "react";

interface TableViewProps {
  data: unknown;
}

type SortDirection = "asc" | "desc" | null;

interface TableData {
  title?: string;
  headers: string[];
  rows: unknown[][];
}

// Recursively find the first array of objects in a nested structure
function findArrayOfObjects(obj: Record<string, unknown>, depth = 0): unknown[] | null {
  if (depth > 5) return null;
  for (const value of Object.values(obj)) {
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object" && value[0] !== null) {
      return value;
    }
  }
  // Go deeper
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const found = findArrayOfObjects(value as Record<string, unknown>, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

// Convert an array of objects to table data, flattening nested objects one level
function arrayToTable(arr: unknown[], title?: string): TableData {
  const flatRows: Record<string, unknown>[] = [];

  for (const item of arr) {
    if (typeof item !== "object" || item === null) continue;
    const flat: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(item as Record<string, unknown>)) {
      if (val === null || val === undefined) {
        flat[key] = null;
      } else if (typeof val === "object" && !Array.isArray(val)) {
        // Flatten one level of nested objects
        for (const [subKey, subVal] of Object.entries(val as Record<string, unknown>)) {
          flat[`${key}.${subKey}`] = subVal;
        }
      } else if (Array.isArray(val)) {
        flat[key] = JSON.stringify(val);
      } else {
        flat[key] = val;
      }
    }
    flatRows.push(flat);
  }

  // Collect all unique headers
  const headerSet = new Set<string>();
  for (const row of flatRows) {
    for (const key of Object.keys(row)) {
      headerSet.add(key);
    }
  }
  const headers = Array.from(headerSet);

  const rows = flatRows.map((row) =>
    headers.map((h) => {
      const val = row[h];
      if (val === null || val === undefined) return null;
      if (typeof val === "object") return JSON.stringify(val);
      return val;
    })
  );

  return { title, headers, rows };
}

function detectAndConvertData(data: unknown): TableData[] {
  if (!data || typeof data !== "object") return [];

  // Top-level array of objects — reverse so newest data shows first
  if (Array.isArray(data)) {
    if (data.length === 0) return [];
    if (typeof data[0] === "object" && data[0] !== null) {
      return [arrayToTable([...data].reverse(), "Data")];
    }
    return [];
  }

  const obj = data as Record<string, unknown>;
  const results: TableData[] = [];

  // Financial pivot: results.companies[0].reports
  const companies = (obj.results as Record<string, unknown>)?.companies;
  if (Array.isArray(companies) && companies.length > 0) {
    const company = companies[0] as Record<string, unknown>;
    const reports = company?.reports;
    if (Array.isArray(reports) && reports.length > 0) {
      // Check if reports have statement-type structure (incomeStatement, balanceSheet, cashFlow)
      const firstReport = reports[0] as Record<string, unknown>;
      const hasStatements = firstReport.incomeStatement || firstReport.balanceSheet || firstReport.cashFlow;

      if (hasStatements) {
        // Pivot: rows = Statement+Metric, columns = ReportDate
        const pivoted: Record<string, Record<string, string>> = {};
        for (const report of reports) {
          const rpt = report as Record<string, unknown>;
          const reportDate = String(rpt.reportDate || "");
          for (const stmtKey of ["incomeStatement", "balanceSheet", "cashFlow"]) {
            const stmt = rpt[stmtKey];
            if (stmt && typeof stmt === "object" && !Array.isArray(stmt)) {
              for (const [metric, val] of Object.entries(stmt as Record<string, unknown>)) {
                const key = `${stmtKey} | ${metric}`;
                if (!pivoted[key]) pivoted[key] = {};
                pivoted[key][reportDate] = val != null ? String(val) : "";
              }
            }
          }
        }
        const dates = Array.from(
          new Set(reports.map((r) => String((r as Record<string, unknown>).reportDate || "")))
        ).sort().reverse();
        const headers = ["Statement | Metric", ...dates];
        const rows = Object.entries(pivoted).map(([metric, values]) => [
          metric,
          ...dates.map((d) => values[d] || ""),
        ]);
        results.push({ title: "Financials", headers, rows });
      } else {
        // Generic reports array
        results.push(arrayToTable(reports, "Reports"));
      }
      return results;
    }
  }

  // Known array patterns under results
  const res = obj.results as Record<string, unknown> | undefined;
  if (res && typeof res === "object") {
    const knownKeys = ["dividends", "earningsEvents", "estimates", "earningsEstimates"];
    for (const key of knownKeys) {
      const val = res[key];
      if (val && typeof val === "object") {
        if (Array.isArray(val) && val.length > 0) {
          results.push(arrayToTable(val, key));
        } else if (!Array.isArray(val)) {
          // Single object — show as key-value table
          const entries = Object.entries(val as Record<string, unknown>);
          // Check if it contains nested objects/arrays that should be separate tables
          const scalarEntries: [string, unknown][] = [];
          for (const [k, v] of entries) {
            if (Array.isArray(v) && v.length > 0 && typeof v[0] === "object") {
              results.push(arrayToTable(v, `${key} > ${k}`));
            } else if (v && typeof v === "object" && !Array.isArray(v)) {
              // Nested object — show as its own key-value section
              const subEntries = Object.entries(v as Record<string, unknown>);
              results.push({
                title: `${key} > ${k}`,
                headers: ["Field", "Value"],
                rows: subEntries.map(([sk, sv]) => [
                  sk,
                  sv != null && typeof sv === "object" ? JSON.stringify(sv) : sv,
                ]),
              });
            } else {
              scalarEntries.push([k, v]);
            }
          }
          if (scalarEntries.length > 0) {
            results.push({
              title: key,
              headers: ["Field", "Value"],
              rows: scalarEntries.map(([k, v]) => [k, v]),
            });
          }
        }
      }
    }
    if (results.length > 0) return results;
  }

  // Fiscal ratios: data[]
  if (Array.isArray(obj.data) && obj.data.length > 0) {
    return [arrayToTable(obj.data as unknown[], "Ratios")];
  }

  // Generic: find the first array of objects anywhere in the tree
  const found = findArrayOfObjects(obj);
  if (found) {
    return [arrayToTable(found, "Data")];
  }

  // Last resort: key-value pairs of top-level scalars + summarized nested
  const kvRows: unknown[][] = [];
  for (const [key, val] of Object.entries(obj)) {
    if (val === null || val === undefined) {
      kvRows.push([key, null]);
    } else if (typeof val === "object") {
      kvRows.push([key, JSON.stringify(val).slice(0, 200)]);
    } else {
      kvRows.push([key, val]);
    }
  }
  if (kvRows.length > 0) {
    return [{ title: "Data", headers: ["Key", "Value"], rows: kvRows }];
  }

  return [];
}

function SingleTable({ table }: { table: TableData }) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);

  const sortedRows = useMemo(() => {
    const rows = [...table.rows];
    if (sortKey !== null && sortDir) {
      const colIdx = table.headers.indexOf(sortKey);
      if (colIdx >= 0) {
        rows.sort((a, b) => {
          const aVal = a[colIdx];
          const bVal = b[colIdx];
          if (aVal === null || aVal === undefined) return 1;
          if (bVal === null || bVal === undefined) return -1;
          if (typeof aVal === "number" && typeof bVal === "number") {
            return sortDir === "asc" ? aVal - bVal : bVal - aVal;
          }
          const cmp = String(aVal).localeCompare(String(bVal));
          return sortDir === "asc" ? cmp : -cmp;
        });
      }
    }
    return rows;
  }, [table.rows, table.headers, sortKey, sortDir]);

  const handleHeaderClick = (header: string) => {
    if (sortKey === header) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortKey(null); setSortDir(null); }
    } else {
      setSortKey(header);
      setSortDir("asc");
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="text-sm text-gray-600">
          {table.title && <span className="font-semibold text-gray-800 mr-3">{table.title}</span>}
          <span className="font-medium">{sortedRows.length}</span> rows x{" "}
          <span className="font-medium">{table.headers.length}</span> columns
        </div>
      </div>
      <div className="overflow-auto max-h-[600px]">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {table.headers.map((header, i) => (
                <th
                  key={`${header}-${i}`}
                  onClick={() => handleHeaderClick(header)}
                  className="px-4 py-2 text-left font-semibold text-gray-900 border-b border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                >
                  {header}
                  {sortKey === header && (sortDir === "asc" ? " ↑" : " ↓")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, rowIdx) => (
              <tr key={rowIdx} className={rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="px-4 py-2 border-b border-gray-100 text-gray-900 max-w-xs truncate">
                    {cell === null ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      String(cell)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TableView({ data }: TableViewProps) {
  const tables = useMemo(() => detectAndConvertData(data), [data]);

  if (tables.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 text-sm">
        No table data found. Try the JSON view instead.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {tables.map((table, i) => (
        <SingleTable key={i} table={table} />
      ))}
    </div>
  );
}
