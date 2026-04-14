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
