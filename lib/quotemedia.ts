export const QUOTEMEDIA_ENHANCED_FINANCIALS_BUNDLE_TYPE =
  "quoteMediaEnhancedFinancialsBundle" as const;

export const QUOTEMEDIA_ENHANCED_REPORT_TYPES = [
  { code: "A", label: "Annual" },
  { code: "Q", label: "Quarterly" },
  { code: "H", label: "Half-Yearly" },
] as const;

export type QuoteMediaEnhancedReportType =
  (typeof QUOTEMEDIA_ENHANCED_REPORT_TYPES)[number]["code"];

export type QuoteMediaEnhancedFinancialsSectionStatus =
  | "fulfilled"
  | "skipped"
  | "failed";

export interface QuoteMediaEnhancedFinancialsSection {
  reportType: QuoteMediaEnhancedReportType;
  label: string;
  status: QuoteMediaEnhancedFinancialsSectionStatus;
  data: unknown;
  params: Record<string, string>;
  error?: string;
  httpStatus?: number;
}

export interface QuoteMediaEnhancedFinancialsBundle {
  type: typeof QUOTEMEDIA_ENHANCED_FINANCIALS_BUNDLE_TYPE;
  symbol: string;
  sections: QuoteMediaEnhancedFinancialsSection[];
}

export const QUOTEMEDIA_EXCHANGE_OPTIONS = [
  { value: "TSX", label: "TSX (Toronto)" },
  { value: "TSV", label: "TSXV (Venture)" },
  { value: "NSD", label: "NASDAQ" },
  { value: "NYE", label: "NYSE" },
  { value: "AMX", label: "AMEX" },
  { value: "LSE", label: "LSE (London)" },
  { value: "AU", label: "ASX (Australia)" },
  { value: "HK", label: "HKSE (Hong Kong)" },
  { value: "SH", label: "SSE (Shanghai)" },
  { value: "MB", label: "BSE (India)" },
] as const;

const EXCHANGE_GROUP_ALIASES: Record<string, string> = {
  amex: "AMX",
  amx: "AMX",
  asx: "AU",
  au: "AU",
  bse: "MB",
  hk: "HK",
  hkse: "HK",
  lse: "LSE",
  mb: "MB",
  nasdaq: "NSD",
  nsd: "NSD",
  nye: "NYE",
  nyse: "NYE",
  sh: "SH",
  sse: "SH",
  tsv: "TSV",
  tsx: "TSX",
  tsxv: "TSV",
};

export function getQuoteMediaExchangeGroup(value: string): string | null {
  const key = value.trim().toLowerCase();
  return EXCHANGE_GROUP_ALIASES[key] ?? null;
}

export function buildQuoteMediaExchangeParams(
  webmasterId: string,
  exchangeGroup: string
): URLSearchParams {
  const exgroup = getQuoteMediaExchangeGroup(exchangeGroup);
  if (!exgroup) {
    throw new Error(`Unsupported QuoteMedia exchange group: ${exchangeGroup}`);
  }

  return new URLSearchParams({
    webmasterId,
    exgroup,
  });
}

export function buildQuoteMediaProfileParams(
  webmasterId: string,
  symbol: string
): URLSearchParams {
  return new URLSearchParams({
    webmasterId,
    symbols: symbol,
  });
}

export function buildQuoteMediaEnhancedFinancialsParams({
  webmasterId,
  symbol,
  reportType,
  numberOfReports = "300",
}: {
  webmasterId: string;
  symbol: string;
  reportType: string;
  numberOfReports?: string;
}): URLSearchParams {
  return new URLSearchParams({
    symbol,
    report_type: reportType.toUpperCase(),
    number_of_reports: numberOfReports,
    webmaster_id: webmasterId,
  });
}

export function getQuoteMediaEnhancedReportLabel(
  reportType: string
): string {
  return (
    QUOTEMEDIA_ENHANCED_REPORT_TYPES.find((item) => item.code === reportType)
      ?.label ?? reportType
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function isQuoteMediaEnhancedFinancialsBundle(
  value: unknown
): value is QuoteMediaEnhancedFinancialsBundle {
  return (
    isRecord(value) &&
    value.type === QUOTEMEDIA_ENHANCED_FINANCIALS_BUNDLE_TYPE &&
    Array.isArray(value.sections)
  );
}

export function hasQuoteMediaEnhancedReports(data: unknown): boolean {
  if (!isRecord(data)) return false;
  const results = data.results;
  if (!isRecord(results) || !Array.isArray(results.companies)) return false;

  return results.companies.some(
    (company) =>
      isRecord(company) &&
      Array.isArray(company.reports) &&
      company.reports.length > 0
  );
}
