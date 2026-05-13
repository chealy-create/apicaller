import assert from "node:assert/strict";
import test from "node:test";

import { detectTableData } from "../lib/tableData";

test("pivots QuoteMedia Enhanced Financials reports into statement metric rows and newest report dates first", () => {
  const tables = detectTableData({
    results: {
      companies: [
        {
          reports: [
            {
              reportDate: "2025-12-31",
              incomeStatement: {
                revenue: 120,
                netIncome: 12,
              },
              balanceSheet: {
                totalAssets: 300,
              },
              cashFlow: {
                operatingCashFlow: 31,
              },
            },
            {
              reportDate: "2024-12-31",
              incomeStatement: {
                revenue: 100,
                netIncome: 10,
              },
              balanceSheet: {
                totalAssets: 280,
              },
              cashFlow: {
                operatingCashFlow: 25,
              },
            },
          ],
        },
      ],
    },
  });

  assert.equal(tables.length, 1);
  assert.equal(tables[0].title, "Financials");
  assert.deepEqual(tables[0].headers, [
    "Statement | Metric",
    "2025-12-31",
    "2024-12-31",
  ]);
  assert.deepEqual(tables[0].rows, [
    ["incomeStatement | revenue", 120, 100],
    ["incomeStatement | netIncome", 12, 10],
    ["balanceSheet | totalAssets", 300, 280],
    ["cashFlow | operatingCashFlow", 31, 25],
  ]);
});

test("exports Enhanced Financials rows when reports contain only one statement section", () => {
  const tables = detectTableData({
    results: {
      companies: [
        {
          reports: [
            {
              reportDate: "2026-03-31",
              incomeStatement: {
                revenue: 50,
              },
            },
          ],
        },
      ],
    },
  });

  assert.equal(tables.length, 1);
  assert.deepEqual(tables[0].headers, ["Statement | Metric", "2026-03-31"]);
  assert.deepEqual(tables[0].rows, [["incomeStatement | revenue", 50]]);
});

test("converts top-level arrays of objects into table rows", () => {
  const tables = detectTableData([
    { symbol: "AAPL", price: 200 },
    { symbol: "MSFT", price: 420 },
  ]);

  assert.equal(tables.length, 1);
  assert.equal(tables[0].title, "Data");
  assert.deepEqual(tables[0].headers, ["symbol", "price"]);
  assert.deepEqual(tables[0].rows, [
    ["MSFT", 420],
    ["AAPL", 200],
  ]);
});

test("unrolls QuoteMedia earnings estimate brokers into one row per estimate", () => {
  const tables = detectTableData({
    results: {
      brokers: [
        {
          broker: "Broker A",
          estimates: [
            { period: "2026", eps: 1.25 },
            { period: "2027", eps: 1.4 },
          ],
        },
      ],
    },
  });

  assert.equal(tables.length, 1);
  assert.equal(tables[0].title, "Earnings Estimates");
  assert.deepEqual(tables[0].headers, ["broker", "period", "eps"]);
  assert.deepEqual(tables[0].rows, [
    ["Broker A", "2026", 1.25],
    ["Broker A", "2027", 1.4],
  ]);
});

test("falls back to key value rows instead of returning header-only table data", () => {
  const tables = detectTableData({
    status: "ok",
    results: {
      companies: [
        {
          reports: [],
        },
      ],
    },
  });

  assert.equal(tables.length, 1);
  assert.equal(tables[0].title, "Data");
  assert.deepEqual(tables[0].headers, ["Key", "Value"]);
  assert.deepEqual(tables[0].rows, [
    ["status", "ok"],
    ["results", "{\"companies\":[{\"reports\":[]}]}"],
  ]);
});
