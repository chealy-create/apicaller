"use client";

import { ApiCallDef } from "../lib/types";

interface CallSelectorProps {
  calls: ApiCallDef[];
  selected: string | null;
  onSelect: (id: string) => void;
}

export default function CallSelector({
  calls,
  selected,
  onSelect,
}: CallSelectorProps) {
  if (calls.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 text-sm">
        Select a platform
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {calls.map((call) => (
        <button
          key={call.id}
          onClick={() => onSelect(call.id)}
          className={`w-full text-left px-4 py-3 border-b border-gray-200 last:border-b-0 border-l-4 transition-colors ${
            selected === call.id
              ? "bg-blue-50 border-l-blue-600"
              : "bg-white border-l-transparent hover:bg-gray-50"
          }`}
        >
          <div className="font-medium text-gray-900">{call.name}</div>
          <div className="text-sm text-gray-600 mt-1">{call.desc}</div>
        </button>
      ))}
    </div>
  );
}
