"use client";

import { useState, useMemo, Fragment } from "react";
import { PLATFORMS } from "@/lib/platforms";
import { Tab } from "@/lib/types";
import PlatformSelector from "@/components/PlatformSelector";
import CallSelector from "@/components/CallSelector";
import ParamForm from "@/components/ParamForm";
import ResultTabs from "@/components/ResultTabs";
import JsonView from "@/components/JsonView";
import TableView from "@/components/TableView";
import ChartView from "@/components/ChartView";
import ExportButtons from "@/components/ExportButtons";

interface PartialFailure {
  ticker: string;
  error: string;
}

function extractPartialFailures(data: unknown): PartialFailure[] {
  if (!data || typeof data !== "object") return [];
  const failed = (data as { failed?: unknown }).failed;
  if (!Array.isArray(failed)) return [];
  return failed.filter(
    (item): item is PartialFailure =>
      !!item &&
      typeof item === "object" &&
      typeof (item as PartialFailure).ticker === "string" &&
      typeof (item as PartialFailure).error === "string"
  );
}

function formatFailures(failures: PartialFailure[]): string {
  return failures.map((f) => `${f.ticker} (${f.error})`).join(", ");
}

export default function Home() {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"json" | "table" | "chart">("table");

  const platform = useMemo(
    () => PLATFORMS.find((p) => p.name === selectedPlatform),
    [selectedPlatform]
  );

  const selectedCall = useMemo(
    () => platform?.calls.find((c) => c.id === selectedCallId),
    [platform, selectedCallId]
  );

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId),
    [tabs, activeTabId]
  );

  const activeHasChart = useMemo(() => {
    const d = activeTab?.data;
    return !!(d && typeof d === "object" && (d as { chartData?: unknown }).chartData);
  }, [activeTab]);

  const activeFailures = useMemo(
    () => extractPartialFailures(activeTab?.data),
    [activeTab]
  );

  const handleSelectPlatform = (name: string) => {
    setSelectedPlatform(name);
    setSelectedCallId(null);
    setParamValues({});
  };

  const handleSelectCall = (id: string) => {
    setSelectedCallId(id);
    const call = platform?.calls.find((c) => c.id === id);
    if (call) {
      const defaults: Record<string, string> = {};
      call.params.forEach((param) => {
        defaults[param.key] = param.default || "";
      });
      setParamValues(defaults);
    }
  };

  const handleParamChange = (key: string, value: string) => {
    setParamValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleFetchData = async () => {
    if (!selectedPlatform || !selectedCallId || !selectedCall) return;

    const tabId = Date.now().toString();
    const firstParamKey = selectedCall.params[0]?.key;
    const firstParamValue = paramValues[firstParamKey];
    const tabLabel = firstParamValue
      ? `${firstParamValue} – ${selectedCall.name}`
      : selectedCall.name;

    const reqParams = { ...paramValues };
    const newTab: Tab = {
      id: tabId,
      label: tabLabel,
      data: null,
      platform: selectedPlatform,
      callName: selectedCall.name,
      callId: selectedCallId,
      params: reqParams,
      loading: true,
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(tabId);

    try {
      const response = await fetch("/api/fetch-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformId: selectedPlatform,
          callId: selectedCallId,
          params: reqParams,
        }),
      });

      const data = await response.json();
      const httpStatus = response.status;

      if (!response.ok) {
        const failures = extractPartialFailures(data);
        const baseMsg =
          data?.error ||
          data?.results?.errors?.[0]?.message ||
          `API returned ${httpStatus}`;
        const failureMsg = failures.length > 0 ? formatFailures(failures) : "";
        const apiMsg =
          failureMsg && !baseMsg.includes(failureMsg)
            ? `${baseMsg}: ${failureMsg}`
            : baseMsg;
        setTabs((prev) =>
          prev.map((t) =>
            t.id === tabId
              ? { ...t, data, error: apiMsg, loading: false, httpStatus }
              : t
          )
        );
        return;
      }

      // Check if the API returned an error inside a 200 response
      const inlineError = data?.results?.errors?.[0]?.message;
      if (inlineError) {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === tabId
              ? { ...t, data, error: inlineError, loading: false, httpStatus }
              : t
          )
        );
        return;
      }

      setTabs((prev) =>
        prev.map((t) =>
          t.id === tabId ? { ...t, data, loading: false, httpStatus } : t
        )
      );

      if (data && typeof data === "object" && (data as { chartData?: unknown }).chartData) {
        setViewMode("chart");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tabId
            ? { ...t, error: errorMessage, loading: false }
            : t
        )
      );
    }
  };

  const handleSelectTab = (id: string) => {
    setActiveTabId(id);
    const tab = tabs.find((t) => t.id === id);
    const hasChart = !!(
      tab?.data &&
      typeof tab.data === "object" &&
      (tab.data as { chartData?: unknown }).chartData
    );
    if (hasChart) setViewMode("chart");
    else if (viewMode === "chart") setViewMode("table");
  };

  const handleCloseTab = (id: string) => {
    setTabs((prev) => prev.filter((t) => t.id !== id));
    if (activeTabId === id) {
      const remaining = tabs.filter((t) => t.id !== id);
      setActiveTabId(remaining[remaining.length - 1]?.id || null);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 border-b border-gray-200 bg-white flex items-center px-6 z-50">
        <h1 className="text-xl font-semibold text-gray-900">API Explorer</h1>
        <span className="ml-auto text-sm text-gray-500">v1.1.2</span>
      </header>

      {/* Left Sidebar */}
      <aside className="fixed top-16 left-0 bottom-0 w-80 border-r border-gray-200 bg-white overflow-y-auto p-6 pb-24 flex flex-col gap-6">
        {/* Platform Selector */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Platform</h2>
          <PlatformSelector
            platforms={PLATFORMS}
            selected={selectedPlatform}
            onSelect={handleSelectPlatform}
          />
        </div>

        {/* Call Selector */}
        {platform && (
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Call</h2>
            <CallSelector
              calls={platform.calls}
              selected={selectedCallId}
              onSelect={handleSelectCall}
            />
          </div>
        )}

        {/* Parameters */}
        {selectedCall && (
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Parameters
            </h2>
            {selectedCall.desc && (
              <p className="text-xs text-gray-600 mb-3">{selectedCall.desc}</p>
            )}
            <ParamForm
              params={selectedCall.params}
              values={paramValues}
              onChange={handleParamChange}
              onSubmit={handleFetchData}
              loading={tabs.some((t) => t.loading)}
            />
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="fixed top-16 left-80 right-0 bottom-0 flex flex-col bg-gray-50 overflow-hidden">
        {/* Result Tabs */}
        {tabs.length > 0 ? (
          <>
            <ResultTabs
              tabs={tabs}
              activeTabId={activeTabId}
              onSelectTab={handleSelectTab}
              onCloseTab={handleCloseTab}
            />

            {/* View Toggle & Export */}
            <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center gap-3">
              <div className="flex gap-2">
                {activeHasChart && (
                  <button
                    onClick={() => setViewMode("chart")}
                    className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                      viewMode === "chart"
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    Chart
                  </button>
                )}
                <button
                  onClick={() => setViewMode("json")}
                  className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                    viewMode === "json"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  JSON
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                    viewMode === "table"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Table
                </button>
              </div>
              {activeTab && (
                <ExportButtons
                  data={activeTab.data}
                  filename={`${activeTab.platform}_${activeTab.callName}_${new Date().toISOString().split("T")[0]}`}
                />
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-6">
              {activeTab ? (
                activeTab.loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center gap-3 text-gray-500">
                      <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-sm">Fetching data...</span>
                    </div>
                  </div>
                ) : activeTab.error && viewMode !== "json" ? (
                  <div className="flex flex-col gap-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-5">
                      <div className="flex items-start gap-3">
                        <span className="text-red-500 text-lg mt-0.5">!</span>
                        <div className="flex-1">
                          <p className="font-semibold text-red-800">Request Failed</p>
                          <p className="text-sm text-red-700 mt-1">{activeTab.error}</p>
                        </div>
                        {activeTab.httpStatus && (
                          <span className="shrink-0 px-2 py-1 bg-red-100 text-red-700 text-xs font-mono rounded">
                            HTTP {activeTab.httpStatus}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Diagnostics */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                      <p className="font-semibold text-gray-800 text-sm mb-3">Diagnostics</p>
                      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                        <span className="text-gray-500">Platform</span>
                        <span className="font-mono text-gray-900">{activeTab.platform}</span>
                        <span className="text-gray-500">Call</span>
                        <span className="font-mono text-gray-900">{activeTab.callName}</span>
                        <span className="text-gray-500">Call ID</span>
                        <span className="font-mono text-gray-900">{activeTab.callId}</span>
                        {Object.entries(activeTab.params).map(([k, v]) => (
                          <Fragment key={k}>
                            <span className="text-gray-500">{k}</span>
                            <span className="font-mono text-gray-900">{v || <span className="text-gray-400">(empty)</span>}</span>
                          </Fragment>
                        ))}
                      </div>
                      {activeTab.data != null && (
                        <div className="mt-4">
                          <button
                            onClick={() => setViewMode("json")}
                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                          >
                            View raw API response
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : viewMode === "json" ? (
                  <JsonView data={activeTab.data} />
                ) : viewMode === "chart" ? (
                  <ChartView
                    data={activeTab.data}
                    filename={`${activeTab.platform}_${activeTab.callName}_${new Date().toISOString().split("T")[0]}`}
                  />
                ) : (
                  <div className="flex flex-col gap-4">
                    {activeFailures.length > 0 && (
                      <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        Partial data returned:{" "}
                        {activeFailures
                          .map((f) => `${f.ticker} (${f.error})`)
                          .join(", ")}
                      </div>
                    )}
                    <TableView data={activeTab.data} />
                  </div>
                )
              ) : null}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p>Select a platform and API call to get started</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
