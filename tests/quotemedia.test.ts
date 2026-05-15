import assert from "node:assert/strict";
import test from "node:test";

import {
  buildQuoteMediaEnhancedFinancialsParams,
  buildQuoteMediaExchangeParams,
  buildQuoteMediaProfileParams,
  getQuoteMediaExchangeGroup,
} from "../lib/quotemedia";

test("maps TSX exchange aliases to QuoteMedia exgroup", () => {
  assert.equal(getQuoteMediaExchangeGroup("tsx"), "TSX");
  assert.equal(getQuoteMediaExchangeGroup("TSX"), "TSX");

  const params = buildQuoteMediaExchangeParams("131246", "tsx");
  assert.equal(params.get("webmasterId"), "131246");
  assert.equal(params.get("exgroup"), "TSX");
  assert.equal(params.has("exchangeGroup"), false);
});

test("maps NASDAQ exchange alias to QuoteMedia NSD exgroup", () => {
  const params = buildQuoteMediaExchangeParams("131246", "nasdaq");

  assert.equal(params.get("exgroup"), "NSD");
});

test("builds profile params with QuoteMedia symbols key", () => {
  const params = buildQuoteMediaProfileParams("131246", "MSFT:US");

  assert.equal(params.get("webmasterId"), "131246");
  assert.equal(params.get("symbols"), "MSFT:US");
  assert.equal(params.has("symbol"), false);
});

test("builds Enhanced Financials params to match the reference script endpoint shape", () => {
  const params = buildQuoteMediaEnhancedFinancialsParams({
    webmasterId: "131246",
    symbol: "POW:CA",
    reportType: "h",
  });

  assert.equal(params.get("symbol"), "POW:CA");
  assert.equal(params.get("report_type"), "H");
  assert.equal(params.get("number_of_reports"), "300");
  assert.equal(params.get("webmaster_id"), "131246");
});

test("returns null for unsupported exchange groups", () => {
  assert.equal(getQuoteMediaExchangeGroup("nse"), null);
  assert.equal(getQuoteMediaExchangeGroup("not-real"), null);
});
