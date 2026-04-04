"use client";

import { useEffect, useState } from "react";
import { ParamDef } from "../lib/types";
import { EXCHANGE_OPTIONS } from "../lib/platforms";

interface ParamFormProps {
  params: ParamDef[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

interface RatioOption {
  ratioId: string;
  description: string;
}

export default function ParamForm({
  params,
  values,
  onChange,
  onSubmit,
  loading,
}: ParamFormProps) {
  const [ratioOptions, setRatioOptions] = useState<RatioOption[]>([]);
  const [ratioLoading, setRatioLoading] = useState(false);

  useEffect(() => {
    const loadRatios = async () => {
      try {
        setRatioLoading(true);
        const response = await fetch("/data/fiscal_ratios.json");
        if (response.ok) {
          const data = await response.json();
          setRatioOptions(data);
        }
      } catch (error) {
        console.error("Failed to load fiscal ratios:", error);
      } finally {
        setRatioLoading(false);
      }
    };

    const hasRatioParam = params.some((p) => p.type === "searchable_ratio");
    if (hasRatioParam) {
      loadRatios();
    }
  }, [params]);

  const renderField = (param: ParamDef) => {
    const value = values[param.key] || "";

    if (param.type === "combo") {
      return (
        <select
          value={value}
          onChange={(e) => onChange(param.key, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">-- Select --</option>
          {param.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    if (param.type === "searchable_exchange") {
      return (
        <select
          value={value}
          onChange={(e) => onChange(param.key, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">-- Select --</option>
          {EXCHANGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    if (param.type === "searchable_ratio") {
      const dataListId = `ratios-${param.key}`;
      return (
        <div>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(param.key, e.target.value)}
            list={dataListId}
            placeholder="Enter or select a ratio"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <datalist id={dataListId}>
            {ratioOptions.map((opt) => (
              <option key={opt.ratioId} value={opt.ratioId}>
                {opt.ratioId} — {opt.description}
              </option>
            ))}
          </datalist>
        </div>
      );
    }

    // Default: text entry
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(param.key, e.target.value)}
        placeholder={param.default || ""}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    );
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      {params.map((param) => (
        <div key={param.key}>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            {param.label}
          </label>
          {renderField(param)}
        </div>
      ))}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        Fetch Data
      </button>
    </form>
  );
}
