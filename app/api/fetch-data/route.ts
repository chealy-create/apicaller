import { NextRequest, NextResponse } from 'next/server';

// Types for the request body
interface FetchDataRequest {
  platformId: string;
  callId: string;
  params: Record<string, unknown>;
}

// Validate that a param looks like a ticker/symbol (no path traversal)
function isValidSymbol(value: string): boolean {
  return /^[A-Za-z0-9.:_\-]{1,30}$/.test(value);
}

// Helper function to make HTTP requests with timeout
async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// API call implementations
async function handleQuoteMediaCall(
  callId: string,
  params: Record<string, unknown>
): Promise<NextResponse> {
  const token = process.env.QM_TOKEN;
  const webmasterId = process.env.QM_WEBMASTER_ID;

  if (!token || !webmasterId) {
    return NextResponse.json(
      { error: 'QuoteMedia API credentials not configured' },
      { status: 500 }
    );
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
  };

  let url: string;

  switch (callId) {
    case 'qm_earnings_events': {
      const symbol = params.symbol as string;
      const startYear = params.start_year as string;
      const endYear = params.end_year as string;

      if (!symbol || !startYear || !endYear) {
        return NextResponse.json(
          { error: 'Missing required params: symbol, start_year, end_year' },
          { status: 400 }
        );
      }

      const queryParams = new URLSearchParams({
        webmasterId,
        symbol,
        startYear,
        endYear,
      });

      url = `https://quotes.quotemedia.com/data/getEarningsEventsBySymbol.json?${queryParams}`;
      break;
    }

    case 'qm_enhanced_financials': {
      const symbol = params.symbol as string;
      const reportType = params.report_type as string;
      const numberOfReports = params.number_of_reports as string || '20';

      if (!symbol || !reportType) {
        return NextResponse.json(
          { error: 'Missing required params: symbol, report_type' },
          { status: 400 }
        );
      }

      const queryParams = new URLSearchParams({
        symbol,
        report_type: reportType,
        number_of_reports: numberOfReports,
        webmaster_id: webmasterId,
      });
      url = `https://quotes.quotemedia.com/v3/financials/enhanced?${queryParams}`;
      break;
    }

    case 'qm_dividends': {
      const symbol = params.symbol as string;
      const startDate = params.start_date as string;
      const endDate = params.end_date as string;

      if (!symbol) {
        return NextResponse.json(
          { error: 'Missing required param: symbol' },
          { status: 400 }
        );
      }

      const queryParams = new URLSearchParams({
        symbol,
        webmaster_id: webmasterId,
      });
      if (startDate) queryParams.append('start_date', startDate);
      if (endDate) queryParams.append('end_date', endDate);
      url = `https://quotes.quotemedia.com/v3/events/dividends?${queryParams}`;
      break;
    }

    case 'qm_fundamentals_mini': {
      const exchangeGroup = params.exchange_group as string;

      if (!exchangeGroup) {
        return NextResponse.json(
          { error: 'Missing required param: exchange_group' },
          { status: 400 }
        );
      }

      const queryParams = new URLSearchParams({
        webmasterId,
        exchangeGroup,
      });

      url = `https://quotes.quotemedia.com/data/getFundamentalsMiniByExchange.json?${queryParams}`;

      // This call has a 60s timeout
      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers,
        timeout: 60000,
      });

      const data = await response.json();
      return NextResponse.json(data, { status: response.ok ? 200 : response.status });
    }

    case 'qm_earnings_estimates_old': {
      const symbol = params.symbol as string;

      if (!symbol) {
        return NextResponse.json(
          { error: 'Missing required param: symbol' },
          { status: 400 }
        );
      }

      const queryParams = new URLSearchParams({
        webmasterId,
        symbol,
      });

      url = `https://quotes.quotemedia.com/data/getEarningsEstimates.json?${queryParams}`;
      break;
    }

    case 'qm_earnings_estimates_v3': {
      const symbol = params.symbol as string;

      if (!symbol) {
        return NextResponse.json(
          { error: 'Missing required param: symbol' },
          { status: 400 }
        );
      }

      const queryParams = new URLSearchParams({
        symbol,
        webmaster_id: webmasterId,
      });
      url = `https://quotes.quotemedia.com/v3/earnings/estimates?${queryParams}`;
      break;
    }

    case 'qm_profiles': {
      const symbol = params.symbol as string;

      if (!symbol) {
        return NextResponse.json(
          { error: 'Missing required param: symbol' },
          { status: 400 }
        );
      }

      const queryParams = new URLSearchParams({
        webmasterId,
        symbol,
      });

      url = `https://app.quotemedia.com/data/getProfiles.json?${queryParams}`;
      break;
    }

    default:
      return NextResponse.json(
        { error: `Unknown QuoteMedia callId: ${callId}` },
        { status: 400 }
      );
  }

  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers,
      timeout: 30000,
    });

    const data = await response.json();
    // Pass through the response even on error status — the body has useful error details
    return NextResponse.json(data, { status: response.ok ? 200 : response.status });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout — the API took too long to respond' },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: `QuoteMedia request failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

async function handleFiscalAiCall(
  callId: string,
  params: Record<string, unknown>
): Promise<NextResponse> {
  const apiKey = process.env.FISCAL_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Fiscal.ai API key not configured' },
      { status: 500 }
    );
  }

  switch (callId) {
    case 'fiscal_company_ratios': {
      const companyKey = params.company_key as string;
      const periodType = params.period_type as string;
      const currency = params.currency as string;
      const ratioId = params.ratio_id as string;

      if (!companyKey || !periodType || !currency || !ratioId) {
        return NextResponse.json(
          { error: 'Missing required params: company_key, period_type, currency, ratio_id' },
          { status: 400 }
        );
      }

      const queryParams = new URLSearchParams({
        companyKey,
        periodType,
        currency,
        ratioId,
        apiKey,
      });

      const url = `https://api.fiscal.ai/v1/company/ratios?${queryParams}`;

      try {
        const response = await fetchWithTimeout(url, {
          method: 'GET',
          timeout: 30000,
        });

        if (!response.ok) {
          return NextResponse.json(
            { error: `Fiscal.ai API error: ${response.statusText}` },
            { status: response.status }
          );
        }

        const data = await response.json();
        return NextResponse.json(data);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return NextResponse.json(
            { error: 'Request timeout' },
            { status: 504 }
          );
        }
        return NextResponse.json(
          { error: `Fiscal.ai request failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    default:
      return NextResponse.json(
        { error: `Unknown Fiscal.ai callId: ${callId}` },
        { status: 400 }
      );
  }
}

async function handleEODHDCall(
  callId: string,
  params: Record<string, unknown>
): Promise<NextResponse> {
  const token = process.env.EODHD_API_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: 'EODHD API token not configured' },
      { status: 500 }
    );
  }

  let url: string;

  switch (callId) {
    case 'eodhd_fundamentals': {
      const ticker = params.ticker as string;

      if (!ticker || !isValidSymbol(ticker)) {
        return NextResponse.json(
          { error: 'Missing or invalid ticker (e.g. RY.TO, MSFT.US)' },
          { status: 400 }
        );
      }

      const queryParams = new URLSearchParams({
        api_token: token,
        fmt: 'json',
      });

      url = `https://eodhd.com/api/fundamentals/${encodeURIComponent(ticker)}?${queryParams}`;
      break;
    }

    case 'eodhd_eod': {
      const ticker = params.ticker as string;

      if (!ticker || !isValidSymbol(ticker)) {
        return NextResponse.json(
          { error: 'Missing or invalid ticker (e.g. RY.TO, MSFT.US)' },
          { status: 400 }
        );
      }

      const queryParams = new URLSearchParams({
        api_token: token,
        fmt: 'json',
      });

      url = `https://eodhd.com/api/eod/${encodeURIComponent(ticker)}?${queryParams}`;
      break;
    }

    default:
      return NextResponse.json(
        { error: `Unknown EODHD callId: ${callId}` },
        { status: 400 }
      );
  }

  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      timeout: 30000,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `EODHD API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout' },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: `EODHD request failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

async function handleFMPCall(
  callId: string,
  params: Record<string, unknown>
): Promise<NextResponse> {
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'FMP API key not configured' },
      { status: 500 }
    );
  }

  let url: string;

  switch (callId) {
    case 'fmp_analyst_estimates': {
      const symbol = params.symbol as string;
      const period = params.period as string;

      if (!symbol || !period) {
        return NextResponse.json(
          { error: 'Missing required params: symbol, period' },
          { status: 400 }
        );
      }

      const queryParams = new URLSearchParams({
        symbol,
        period,
        apikey: apiKey,
      });

      url = `https://financialmodelingprep.com/stable/analyst-estimates?${queryParams}`;
      break;
    }

    case 'fmp_income_statement': {
      const symbol = params.symbol as string;
      const period = params.period as string;

      if (!symbol || !period) {
        return NextResponse.json(
          { error: 'Missing required params: symbol, period' },
          { status: 400 }
        );
      }

      const queryParams = new URLSearchParams({
        symbol,
        period,
        apikey: apiKey,
      });

      url = `https://financialmodelingprep.com/stable/income-statement?${queryParams}`;
      break;
    }

    case 'fmp_search_symbol': {
      const query = params.query as string;

      if (!query) {
        return NextResponse.json(
          { error: 'Missing required param: query' },
          { status: 400 }
        );
      }

      const queryParams = new URLSearchParams({
        query,
        apikey: apiKey,
      });

      url = `https://financialmodelingprep.com/stable/search-symbol?${queryParams}`;
      break;
    }

    default:
      return NextResponse.json(
        { error: `Unknown FMP callId: ${callId}` },
        { status: 400 }
      );
  }

  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      timeout: 30000,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `FMP API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout' },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: `FMP request failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

interface EodRow {
  date: string;
  close: number;
}

type PriceField = "close" | "adjusted_close";

async function fetchEodSeries(
  ticker: string,
  start: string,
  end: string,
  token: string,
  priceField: PriceField
): Promise<EodRow[]> {
  const fullTicker = ticker.includes(".") ? ticker : `${ticker}.US`;
  const qs = new URLSearchParams({
    from: start,
    to: end,
    period: "d",
    api_token: token,
    fmt: "json",
  });
  const url = `https://eodhd.com/api/eod/${encodeURIComponent(fullTicker)}?${qs}`;

  const response = await fetchWithTimeout(url, { method: "GET", timeout: 30000 });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${fullTicker}`);
  }

  const data = (await response.json()) as Array<{
    date: string;
    close?: number;
    adjusted_close?: number;
  }>;
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`No data returned for ${fullTicker} between ${start} and ${end}`);
  }

  const rows = data
    .map((r) => ({
      date: r.date,
      close: priceField === "adjusted_close" ? r.adjusted_close : r.close,
    }))
    .filter((r): r is EodRow => !!r.date && typeof r.close === "number")
    .sort((a, b) => a.date.localeCompare(b.date));

  if (rows.length === 0) {
    throw new Error(`No ${priceField} data returned for ${fullTicker}`);
  }

  return rows;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchEodSeriesWithRetry(
  ticker: string,
  start: string,
  end: string,
  token: string,
  priceField: PriceField
): Promise<EodRow[]> {
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fetchEodSeries(ticker, start, end, token, priceField);
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await sleep(350 * attempt);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unknown error");
}

function yesterdayIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function handleChartsCall(
  callId: string,
  params: Record<string, unknown>
): Promise<NextResponse> {
  const token = process.env.EODHD_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "EODHD API token not configured" },
      { status: 500 }
    );
  }

  if (callId !== "price_history_rebased") {
    return NextResponse.json(
      { error: `Unknown Charts callId: ${callId}` },
      { status: 400 }
    );
  }

  const tickersRaw = (params.tickers as string) || "";
  const startDate = ((params.start_date as string) || "").trim();
  const endDateInput = ((params.end_date as string) || "").trim();
  const priceFieldInput = ((params.price_field as string) || "close").trim();
  const priceField: PriceField =
    priceFieldInput === "adjusted_close" ? "adjusted_close" : "close";

  const tickers = tickersRaw
    .split(/[,\s]+/)
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);

  if (tickers.length === 0) {
    return NextResponse.json(
      { error: "At least one ticker is required" },
      { status: 400 }
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return NextResponse.json(
      { error: "start_date must be YYYY-MM-DD" },
      { status: 400 }
    );
  }
  const endDate = endDateInput || yesterdayIso();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return NextResponse.json(
      { error: "end_date must be YYYY-MM-DD or blank" },
      { status: 400 }
    );
  }
  if (endDate < startDate) {
    return NextResponse.json(
      { error: `end_date (${endDate}) is before start_date (${startDate})` },
      { status: 400 }
    );
  }
  for (const t of tickers) {
    if (!isValidSymbol(t)) {
      return NextResponse.json(
        { error: `Invalid ticker: ${t}` },
        { status: 400 }
      );
    }
  }

  const results: Array<{
    ticker: string;
    rows: EodRow[];
    error: string | null;
  }> = [];
  for (const t of tickers) {
    try {
      const rows = await fetchEodSeriesWithRetry(t, startDate, endDate, token, priceField);
      results.push({ ticker: t, rows, error: null });
    } catch (e) {
      results.push({
        ticker: t,
        rows: [],
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  const succeeded = results.filter((r) => !r.error && r.rows.length > 0);
  const failed = results
    .filter((r) => r.error || r.rows.length === 0)
    .map((r) => ({ ticker: r.ticker, error: r.error || "No data" }));

  if (succeeded.length === 0) {
    return NextResponse.json(
      {
        error: "No data retrieved for any ticker",
        failed,
      },
      { status: 502 }
    );
  }

  // Build union of dates across all successful series
  const dateSet = new Set<string>();
  for (const s of succeeded) {
    for (const r of s.rows) dateSet.add(r.date);
  }
  const dates = Array.from(dateSet).sort();

  const raw: Record<string, (number | null)[]> = {};
  const rebased: Record<string, (number | null)[]> = {};

  for (const s of succeeded) {
    const byDate = new Map(s.rows.map((r) => [r.date, r.close]));
    const aligned = dates.map((d) => (byDate.has(d) ? byDate.get(d)! : null));

    const firstValid = aligned.find((v) => v !== null) ?? null;
    raw[s.ticker] = aligned;
    rebased[s.ticker] =
      firstValid && firstValid !== 0
        ? aligned.map((v) => (v === null ? null : (v / firstValid) * 100))
        : aligned;
  }

  return NextResponse.json({
    chartData: {
      tickers: succeeded.map((s) => s.ticker),
      startDate,
      endDate,
      priceField,
      dates,
      raw,
      rebased,
    },
    failed,
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: FetchDataRequest = await request.json();
    const { platformId, callId, params } = body;

    // Validate required fields
    if (!platformId || !callId || !params) {
      return NextResponse.json(
        { error: 'Missing required fields: platformId, callId, params' },
        { status: 400 }
      );
    }

    // Route to appropriate handler based on platformId
    switch (platformId) {
      case 'QuoteMedia':
        return await handleQuoteMediaCall(callId, params);

      case 'Fiscal.ai':
        return await handleFiscalAiCall(callId, params);

      case 'EODHD':
        return await handleEODHDCall(callId, params);

      case 'FMP':
        return await handleFMPCall(callId, params);

      case 'Charts':
        return await handleChartsCall(callId, params);

      default:
        return NextResponse.json(
          { error: `Unknown platformId: ${platformId}` },
          { status: 400 }
        );
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
