import { PlatformDef } from "./types";

export const PLATFORMS: PlatformDef[] = [
  {
    name: "QuoteMedia",
    calls: [
      {
        id: "qm_earnings_events",
        name: "Earnings Events by Symbol",
        desc: "Historical earnings events for a symbol.",
        params: [
          { key: "symbol", label: "Symbol (e.g. MSFT:US)", default: "" },
          { key: "start_year", label: "Start Year (e.g. 2023)", default: "2023" },
          { key: "end_year", label: "End Year (e.g. 2025)", default: "2025" },
        ],
      },
      {
        id: "qm_enhanced_financials",
        name: "Enhanced Financials",
        desc: "Income statement, balance sheet, cash flow.",
        params: [
          { key: "symbol", label: "Symbol (e.g. ARX:CA)", default: "" },
          {
            key: "report_type",
            label: "Report Type",
            default: "Q",
            type: "combo",
            options: ["A", "Q"],
          },
          { key: "number_of_reports", label: "Number of Reports", default: "20" },
        ],
      },
      {
        id: "qm_dividends",
        name: "Dividends",
        desc: "Dividend history for a symbol within a date range.",
        params: [
          { key: "symbol", label: "Symbol (e.g. PHX:CA)", default: "" },
          { key: "start_date", label: "Start Date (YYYY-MM-DD)", default: "2024-01-01" },
          { key: "end_date", label: "End Date (YYYY-MM-DD)", default: "2026-04-11" },
        ],
      },
      {
        id: "qm_fundamentals_mini",
        name: "Fundamentals Mini by Exchange",
        desc: "Fundamental values for an entire exchange (large response).",
        params: [
          {
            key: "exchange_group",
            label: "Exchange Group",
            default: "tsx",
            type: "searchable_exchange",
          },
        ],
      },
      {
        id: "qm_earnings_estimates_old",
        name: "Earnings Estimates (Legacy)",
        desc: "Earnings estimates via the older getEarningsEstimates endpoint.",
        params: [
          { key: "symbol", label: "Symbol (e.g. TXP:CA)", default: "" },
        ],
      },
      {
        id: "qm_earnings_estimates_v3",
        name: "Earnings Estimates (v3)",
        desc: "Earnings estimates via the newer v3 endpoint.",
        params: [
          { key: "symbol", label: "Symbol (e.g. JBSS:US)", default: "" },
        ],
      },
      {
        id: "qm_profiles",
        name: "Company Profile",
        desc: "Company profile including description, address, CEO.",
        params: [
          { key: "symbol", label: "Symbol (e.g. MSFT:US)", default: "" },
        ],
      },
    ],
  },
  {
    name: "Fiscal.ai",
    calls: [
      {
        id: "fiscal_company_ratios",
        name: "Company Ratios",
        desc: "Specific financial ratios for a company.",
        params: [
          { key: "company_key", label: "Company Key (e.g. TSX_CRR.UN)", default: "" },
          {
            key: "period_type",
            label: "Period Type",
            default: "quarterly",
            type: "combo",
            options: ["quarterly", "annual"],
          },
          {
            key: "currency",
            label: "Currency",
            default: "CAD",
            type: "combo",
            options: ["CAD", "USD"],
          },
          {
            key: "ratio_id",
            label: "Ratio ID",
            default: "",
            type: "searchable_ratio",
          },
        ],
      },
    ],
  },
  {
    name: "EODHD",
    calls: [
      {
        id: "eodhd_fundamentals",
        name: "Fundamentals",
        desc: "Full fundamental data for a ticker.",
        params: [
          { key: "ticker", label: "Ticker (e.g. RY.TO or MSFT.US)", default: "" },
        ],
      },
      {
        id: "eodhd_eod",
        name: "End-of-Day Prices",
        desc: "Historical end-of-day price data.",
        params: [
          { key: "ticker", label: "Ticker (e.g. RY.TO or MSFT.US)", default: "" },
        ],
      },
    ],
  },
  {
    name: "FMP",
    calls: [
      {
        id: "fmp_analyst_estimates",
        name: "Analyst Estimates",
        desc: "Analyst estimates for a company.",
        params: [
          { key: "symbol", label: "Symbol (e.g. AAPL)", default: "" },
          {
            key: "period",
            label: "Period",
            default: "quarterly",
            type: "combo",
            options: ["quarterly", "annual"],
          },
        ],
      },
      {
        id: "fmp_income_statement",
        name: "Income Statement",
        desc: "Income statement data.",
        params: [
          { key: "symbol", label: "Symbol (e.g. AAPL)", default: "" },
          {
            key: "period",
            label: "Period",
            default: "quarterly",
            type: "combo",
            options: ["quarterly", "annual"],
          },
        ],
      },
      {
        id: "fmp_search_symbol",
        name: "Symbol Search",
        desc: "Search for symbols by company name or ticker.",
        params: [
          { key: "query", label: "Search Query (ticker or company name)", default: "" },
        ],
      },
    ],
  },
];

export const EXCHANGE_OPTIONS = [
  { value: "tsx", label: "TSX (Toronto)" },
  { value: "tsxv", label: "TSXV (Venture)" },
  { value: "nasdaq", label: "NASDAQ" },
  { value: "nyse", label: "NYSE" },
  { value: "amex", label: "AMEX" },
  { value: "lse", label: "LSE (London)" },
  { value: "asx", label: "ASX (Australia)" },
  { value: "hkse", label: "HKSE (Hong Kong)" },
  { value: "sse", label: "SSE (Shanghai)" },
  { value: "nse", label: "NSE (India)" },
];
