"use client";

import { useMemo, useState } from "react";

interface ChartData {
  tickers: string[];
  startDate: string;
  endDate: string;
  dates: string[];
  raw: Record<string, (number | null)[]>;
  rebased: Record<string, (number | null)[]>;
}

interface ChartViewProps {
  data: unknown;
}

const COLOURS = [
  "#1f77b4",
  "#d62728",
  "#2ca02c",
  "#ff7f0e",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#17becf",
];

function extractChartData(data: unknown): ChartData | null {
  if (!data || typeof data !== "object") return null;
  const cd = (data as { chartData?: unknown }).chartData;
  if (!cd || typeof cd !== "object") return null;
  const c = cd as ChartData;
  if (!Array.isArray(c.tickers) || !Array.isArray(c.dates) || !c.rebased) {
    return null;
  }
  return c;
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const year = String(d.getUTCFullYear()).slice(2);
  return `${month} '${year}`;
}

function formatLongDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function ChartView({ data }: ChartViewProps) {
  const chart = useMemo(() => extractChartData(data), [data]);
  const [mode, setMode] = useState<"rebased" | "raw">("rebased");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const dims = useMemo(() => {
    if (!chart) return null;
    const width = 900;
    const height = 460;
    const margin = { top: 40, right: 110, bottom: 44, left: 56 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const series = mode === "rebased" ? chart.rebased : chart.raw;
    const allValues: number[] = [];
    for (const t of chart.tickers) {
      for (const v of series[t] || []) {
        if (v !== null && Number.isFinite(v)) allValues.push(v);
      }
    }
    if (allValues.length === 0 || chart.dates.length === 0) return null;

    const minV = Math.min(...allValues);
    const maxV = Math.max(...allValues);
    const pad = (maxV - minV) * 0.08 || 1;
    const yMin = mode === "rebased" ? Math.min(minV, 100) - pad : minV - pad;
    const yMax = mode === "rebased" ? Math.max(maxV, 100) + pad : maxV + pad;

    const nDates = chart.dates.length;
    const xAt = (i: number) =>
      margin.left + (nDates <= 1 ? innerW / 2 : (i / (nDates - 1)) * innerW);
    const yAt = (v: number) =>
      margin.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

    const yTicks: number[] = [];
    const nTicks = 6;
    for (let i = 0; i <= nTicks; i++) {
      yTicks.push(yMin + (i / nTicks) * (yMax - yMin));
    }

    const xTickCount = Math.min(8, Math.max(3, Math.floor(nDates / 20)));
    const xTickIndices: number[] = [];
    for (let i = 0; i < xTickCount; i++) {
      const idx = Math.round((i / (xTickCount - 1 || 1)) * (nDates - 1));
      if (!xTickIndices.includes(idx)) xTickIndices.push(idx);
    }

    return {
      width,
      height,
      margin,
      innerW,
      innerH,
      series,
      yMin,
      yMax,
      xAt,
      yAt,
      yTicks,
      xTickIndices,
      nDates,
    };
  }, [chart, mode]);

  if (!chart) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 text-sm">
        No chart data available.
      </div>
    );
  }

  if (!dims) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 text-sm">
        No numeric values to plot.
      </div>
    );
  }

  const {
    width,
    height,
    margin,
    innerW,
    innerH,
    series,
    yTicks,
    xAt,
    yAt,
    xTickIndices,
    nDates,
  } = dims;

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPx = ((e.clientX - rect.left) / rect.width) * width;
    if (xPx < margin.left || xPx > margin.left + innerW) {
      setHoverIdx(null);
      return;
    }
    const ratio = (xPx - margin.left) / innerW;
    const idx = Math.round(ratio * (nDates - 1));
    setHoverIdx(Math.max(0, Math.min(nDates - 1, idx)));
  };

  const title = `${mode === "rebased" ? "Rebased Total Return" : "Raw Closing Prices"} — ${chart.tickers.join(" vs ")}`;
  const subtitle = `${formatLongDate(chart.startDate)} to ${formatLongDate(chart.endDate)}`;

  const hoverX = hoverIdx !== null ? xAt(hoverIdx) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setMode("rebased")}
            className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
              mode === "rebased"
                ? "bg-blue-100 text-blue-700"
                : "text-gray-600 hover:bg-gray-100 bg-white border border-gray-200"
            }`}
          >
            Rebased (start = 100)
          </button>
          <button
            onClick={() => setMode("raw")}
            className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
              mode === "raw"
                ? "bg-blue-100 text-blue-700"
                : "text-gray-600 hover:bg-gray-100 bg-white border border-gray-200"
            }`}
          >
            Raw prices
          </button>
        </div>
        <div className="text-xs text-gray-500">
          {chart.dates.length} trading day{chart.dates.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="mb-1">
          <div className="text-base font-semibold text-gray-900">{title}</div>
          <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>
        </div>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Horizontal gridlines */}
          {yTicks.map((v, i) => (
            <g key={`yt-${i}`}>
              <line
                x1={margin.left}
                x2={margin.left + innerW}
                y1={yAt(v)}
                y2={yAt(v)}
                stroke="#e5e7eb"
                strokeWidth={0.8}
                strokeDasharray="3 3"
              />
              <text
                x={margin.left - 8}
                y={yAt(v)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={10}
                fill="#6b7280"
              >
                {v.toFixed(mode === "rebased" ? 0 : 2)}
              </text>
            </g>
          ))}

          {/* Baseline at 100 for rebased mode */}
          {mode === "rebased" &&
            dims.yMin <= 100 &&
            dims.yMax >= 100 && (
              <line
                x1={margin.left}
                x2={margin.left + innerW}
                y1={yAt(100)}
                y2={yAt(100)}
                stroke="#9ca3af"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
            )}

          {/* Left axis */}
          <line
            x1={margin.left}
            x2={margin.left}
            y1={margin.top}
            y2={margin.top + innerH}
            stroke="#d1d5db"
            strokeWidth={1}
          />

          {/* X-axis labels */}
          {xTickIndices.map((i) => (
            <text
              key={`xt-${i}`}
              x={xAt(i)}
              y={margin.top + innerH + 16}
              textAnchor="middle"
              fontSize={10}
              fill="#6b7280"
            >
              {formatDateLabel(chart.dates[i])}
            </text>
          ))}

          {/* Series lines */}
          {chart.tickers.map((t, tIdx) => {
            const colour = COLOURS[tIdx % COLOURS.length];
            const values = series[t] || [];
            let d = "";
            let lastValidIdx = -1;
            let lastValidVal = 0;
            let penDown = false;
            for (let i = 0; i < values.length; i++) {
              const v = values[i];
              if (v === null || !Number.isFinite(v)) {
                penDown = false;
                continue;
              }
              const x = xAt(i);
              const y = yAt(v);
              d += `${penDown ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)} `;
              penDown = true;
              lastValidIdx = i;
              lastValidVal = v;
            }
            const labelX = lastValidIdx >= 0 ? xAt(lastValidIdx) + 6 : 0;
            const labelY = lastValidIdx >= 0 ? yAt(lastValidVal) : 0;
            return (
              <g key={t}>
                <path
                  d={d.trim()}
                  fill="none"
                  stroke={colour}
                  strokeWidth={1.8}
                />
                {lastValidIdx >= 0 && (
                  <text
                    x={labelX}
                    y={labelY}
                    dominantBaseline="middle"
                    fontSize={10}
                    fill={colour}
                    fontWeight={600}
                  >
                    {t} {lastValidVal.toFixed(mode === "rebased" ? 1 : 2)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Hover crosshair + markers */}
          {hoverIdx !== null && hoverX !== null && (
            <g>
              <line
                x1={hoverX}
                x2={hoverX}
                y1={margin.top}
                y2={margin.top + innerH}
                stroke="#9ca3af"
                strokeWidth={0.8}
                strokeDasharray="2 2"
              />
              {chart.tickers.map((t, tIdx) => {
                const v = (series[t] || [])[hoverIdx];
                if (v === null || v === undefined || !Number.isFinite(v))
                  return null;
                const colour = COLOURS[tIdx % COLOURS.length];
                return (
                  <circle
                    key={`hv-${t}`}
                    cx={hoverX}
                    cy={yAt(v)}
                    r={3.5}
                    fill="#fff"
                    stroke={colour}
                    strokeWidth={1.8}
                  />
                );
              })}
            </g>
          )}
        </svg>

        {/* Hover readout */}
        {hoverIdx !== null && (
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-700 border-t border-gray-100 pt-2">
            <span className="font-mono text-gray-500">
              {formatLongDate(chart.dates[hoverIdx])}
            </span>
            {chart.tickers.map((t, tIdx) => {
              const v = (series[t] || [])[hoverIdx];
              if (v === null || v === undefined || !Number.isFinite(v))
                return null;
              return (
                <span key={t} className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: COLOURS[tIdx % COLOURS.length] }}
                  />
                  <span className="font-medium">{t}</span>
                  <span className="font-mono">
                    {v.toFixed(mode === "rebased" ? 2 : 4)}
                  </span>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
