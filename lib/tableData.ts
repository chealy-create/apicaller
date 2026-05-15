import { isQuoteMediaEnhancedFinancialsBundle } from "./quotemedia";

export type CellValue = string | number | boolean | null;

export interface TableData {
  title?: string;
  headers: string[];
  rows: CellValue[][];
}

const FINANCIAL_STATEMENT_KEYS = [
  "incomeStatement",
  "balanceSheet",
  "cashFlow",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function formatCellValue(value: unknown): CellValue {
  if (value === null || value === undefined) return null;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function getCompanyLabel(company: Record<string, unknown>, index: number): string {
  const candidate =
    company.symbol ||
    company.companySymbol ||
    company.name ||
    company.companyName ||
    company.longname;
  return candidate ? String(candidate) : `Company ${index + 1}`;
}

function findArrayOfObjects(
  obj: Record<string, unknown>,
  depth = 0
): unknown[] | null {
  if (depth > 5) return null;

  for (const value of Object.values(obj)) {
    if (
      Array.isArray(value) &&
      value.length > 0 &&
      value.some(hasTabularObjectShape)
    ) {
      return value;
    }
  }

  for (const value of Object.values(obj)) {
    if (isRecord(value)) {
      const found = findArrayOfObjects(value, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

function hasTabularObjectShape(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;

  return Object.values(value).some((fieldValue) => {
    if (fieldValue === null || fieldValue === undefined) return true;
    if (!Array.isArray(fieldValue) && typeof fieldValue !== "object") return true;
    if (isRecord(fieldValue)) return Object.keys(fieldValue).length > 0;
    return false;
  });
}

function arrayToTable(arr: unknown[], title?: string): TableData {
  const flatRows: Record<string, CellValue>[] = [];

  for (const item of arr) {
    if (!isRecord(item)) continue;

    const flat: Record<string, CellValue> = {};
    for (const [key, val] of Object.entries(item)) {
      if (isRecord(val)) {
        for (const [subKey, subVal] of Object.entries(val)) {
          flat[`${key}.${subKey}`] = formatCellValue(subVal);
        }
      } else {
        flat[key] = formatCellValue(val);
      }
    }
    flatRows.push(flat);
  }

  const headerSet = new Set<string>();
  for (const row of flatRows) {
    for (const key of Object.keys(row)) {
      headerSet.add(key);
    }
  }
  const headers = Array.from(headerSet);

  const rows = flatRows.map((row) =>
    headers.map((header) => (header in row ? row[header] : null))
  );

  return { title, headers, rows };
}

function enhancedFinancialsToTable(
  companies: unknown[],
  title = "Financials"
): TableData | null {
  const reportsByCompany = companies
    .map((company, index) => {
      if (!isRecord(company) || !Array.isArray(company.reports)) return null;
      return {
        company,
        companyLabel: getCompanyLabel(company, index),
        reports: company.reports.filter(isRecord),
      };
    })
    .filter(
      (
        item
      ): item is {
        company: Record<string, unknown>;
        companyLabel: string;
        reports: Record<string, unknown>[];
      } => !!item && item.reports.length > 0
    );

  const hasStatementShape = reportsByCompany.some(({ reports }) =>
    reports.some((report) =>
      FINANCIAL_STATEMENT_KEYS.some((statementKey) => isRecord(report[statementKey]))
    )
  );
  if (!hasStatementShape) return null;

  const includeCompanyInMetric = reportsByCompany.length > 1;
  const dateSet = new Set<string>();
  const pivoted = new Map<string, Record<string, CellValue>>();

  for (const { companyLabel, reports } of reportsByCompany) {
    for (const report of reports) {
      const reportDate = String(report.reportDate || "");
      dateSet.add(reportDate);

      for (const statementKey of FINANCIAL_STATEMENT_KEYS) {
        const statement = report[statementKey];
        if (!isRecord(statement)) continue;

        for (const [metric, value] of Object.entries(statement)) {
          const rowKey = includeCompanyInMetric
            ? `${companyLabel} | ${statementKey} | ${metric}`
            : `${statementKey} | ${metric}`;
          if (!pivoted.has(rowKey)) {
            pivoted.set(rowKey, {});
          }
          pivoted.get(rowKey)![reportDate] = formatCellValue(value);
        }
      }
    }
  }

  const dates = Array.from(dateSet).sort().reverse();
  const headers = [
    includeCompanyInMetric ? "Company | Statement | Metric" : "Statement | Metric",
    ...dates,
  ];
  const rows = Array.from(pivoted.entries()).map(([metric, values]) => [
    metric,
    ...dates.map((date) => values[date] ?? ""),
  ]);

  return rows.length > 0 ? { title, headers, rows } : null;
}

function unrollBrokerEstimates(brokers: unknown[]): TableData | null {
  const firstBroker = brokers[0];
  if (!isRecord(firstBroker) || !Array.isArray(firstBroker.estimates)) {
    return null;
  }

  const unrolled: Record<string, unknown>[] = [];
  for (const brokerValue of brokers) {
    if (!isRecord(brokerValue)) continue;
    const { estimates, ...brokerInfo } = brokerValue;
    const estimateRows = Array.isArray(estimates) ? estimates : [];

    if (estimateRows.length === 0) {
      unrolled.push(brokerInfo);
      continue;
    }

    for (const estimate of estimateRows) {
      if (isRecord(estimate)) {
        unrolled.push({ ...brokerInfo, ...estimate });
      }
    }
  }

  return unrolled.length > 0
    ? arrayToTable(unrolled, "Earnings Estimates")
    : null;
}

function resultArrayTables(results: Record<string, unknown>): TableData[] {
  const tables: TableData[] = [];
  const knownKeys = [
    "company",
    "dividends",
    "earningsEvents",
    "estimates",
    "earningsEstimates",
  ];

  for (const key of knownKeys) {
    const val = results[key];
    if (!val || typeof val !== "object") continue;

    if (Array.isArray(val) && val.length > 0) {
      tables.push(arrayToTable(val, key));
      continue;
    }

    if (Array.isArray(val)) continue;

    const scalarEntries: [string, unknown][] = [];
    for (const [nestedKey, nestedVal] of Object.entries(val)) {
      if (
        Array.isArray(nestedVal) &&
        nestedVal.length > 0 &&
        typeof nestedVal[0] === "object"
      ) {
        tables.push(arrayToTable(nestedVal, `${key} > ${nestedKey}`));
      } else if (isRecord(nestedVal)) {
        tables.push({
          title: `${key} > ${nestedKey}`,
          headers: ["Field", "Value"],
          rows: Object.entries(nestedVal).map(([subKey, subVal]) => [
            subKey,
            formatCellValue(subVal),
          ]),
        });
      } else {
        scalarEntries.push([nestedKey, nestedVal]);
      }
    }

    if (scalarEntries.length > 0) {
      tables.push({
        title: key,
        headers: ["Field", "Value"],
        rows: scalarEntries.map(([nestedKey, nestedVal]) => [
          nestedKey,
          formatCellValue(nestedVal),
        ]),
      });
    }
  }

  return tables;
}

export function detectTableData(data: unknown): TableData[] {
  if (!data || typeof data !== "object") return [];

  if (Array.isArray(data)) {
    if (
      data.length > 0 &&
      typeof data[0] === "object" &&
      data[0] !== null
    ) {
      return [arrayToTable([...data].reverse(), "Data")];
    }
    return [];
  }

  const obj = data as Record<string, unknown>;

  if (isQuoteMediaEnhancedFinancialsBundle(obj)) {
    const tables = obj.sections.flatMap((section) => {
      if (section.status === "failed" || !isRecord(section.data)) return [];

      const sectionResults = isRecord(section.data.results)
        ? section.data.results
        : undefined;
      const sectionCompanies = sectionResults?.companies;
      if (!Array.isArray(sectionCompanies) || sectionCompanies.length === 0) {
        return [];
      }

      const table = enhancedFinancialsToTable(sectionCompanies, section.label);
      return table ? [table] : [];
    });

    return tables;
  }

  const res = isRecord(obj.results) ? obj.results : undefined;

  const companies = res?.companies;
  if (Array.isArray(companies) && companies.length > 0) {
    const financialsTable = enhancedFinancialsToTable(companies);
    if (financialsTable) return [financialsTable];

    const firstCompany = companies[0];
    const reports = isRecord(firstCompany) ? firstCompany.reports : null;
    if (Array.isArray(reports) && reports.length > 0) {
      return [arrayToTable(reports, "Reports")];
    }
  }

  const brokers = res?.brokers;
  if (Array.isArray(brokers) && brokers.length > 0) {
    const estimatesTable = unrollBrokerEstimates(brokers);
    if (estimatesTable) return [estimatesTable];
  }

  if (res) {
    const knownResultTables = resultArrayTables(res);
    if (knownResultTables.length > 0) return knownResultTables;
  }

  if (Array.isArray(obj.data) && obj.data.length > 0) {
    return [arrayToTable(obj.data, "Ratios")];
  }

  const found = findArrayOfObjects(obj);
  if (found) {
    return [arrayToTable(found, "Data")];
  }

  const rows = Object.entries(obj).map(([key, value]) => {
    const cellValue = formatCellValue(value);
    return [
      key,
      typeof cellValue === "string" ? cellValue.slice(0, 200) : cellValue,
    ];
  });

  return rows.length > 0 ? [{ title: "Data", headers: ["Key", "Value"], rows }] : [];
}
