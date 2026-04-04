"use client";

import { Tab } from "../lib/types";

interface ResultTabsProps {
  tabs: Tab[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
}

export default function ResultTabs({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
}: ResultTabsProps) {
  if (tabs.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 text-sm">
        No results yet
      </div>
    );
  }

  return (
    <div className="border-b border-gray-200 overflow-x-auto">
      <div className="flex gap-0 min-w-min">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            role="tab"
            className={`px-4 py-3 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer select-none ${
              activeTabId === tab.id
                ? "border-b-blue-600 text-gray-900 bg-white"
                : "border-b-transparent text-gray-600 bg-gray-50 hover:text-gray-900"
            }`}
          >
            <span>{tab.label}</span>
            {tab.loading && (
              <svg
                className="animate-spin h-3 w-3"
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
            {tab.error && (
              <span className="w-2 h-2 bg-red-600 rounded-full"></span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              className="ml-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close tab"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
