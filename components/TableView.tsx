"use client";

import { useState, useMemo } from "react";
import { detectTableData, type TableData } from "@/lib/tableData";

interface TableViewProps {
  data: unknown;
}

type SortDirection = "asc" | "desc" | null;

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
  const tables = useMemo(() => detectTableData(data), [data]);

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
