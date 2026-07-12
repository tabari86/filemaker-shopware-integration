const { ApiError } = require("./api-error");

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATETIME_PATTERN =
  /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,9})?)?(?:Z|[+-](?:(?:0\d|1[0-3]):[0-5]\d|14:00))$/;

function invalidQuery(message) {
  throw new ApiError(400, "INVALID_QUERY", message);
}

function invalidIdentifier(message) {
  throw new ApiError(400, "INVALID_IDENTIFIER", message);
}

function readQueryValue(query, name) {
  if (!Object.prototype.hasOwnProperty.call(query, name)) return undefined;
  const value = query[name];
  if (typeof value !== "string") {
    invalidQuery(`${name} must be provided exactly once`);
  }
  return value;
}

function assertSupportedParameters(query, supported) {
  const unknown = Object.keys(query).find((name) => !supported.has(name));
  if (unknown) invalidQuery(`Unsupported query parameter: ${unknown}`);
}

function parseInteger(value, name, { defaultValue, min, max }) {
  if (value === undefined) return defaultValue;
  if (!/^\d+$/.test(value)) invalidQuery(`${name} must be an integer`);

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    const range = max === undefined ? `at least ${min}` : `from ${min} to ${max}`;
    invalidQuery(`${name} must be an integer ${range}`);
  }
  return parsed;
}

function parsePagination(query) {
  return {
    page: parseInteger(readQueryValue(query, "page"), "page", {
      defaultValue: 1,
      min: 1
    }),
    limit: parseInteger(readQueryValue(query, "limit"), "limit", {
      defaultValue: 25,
      min: 1,
      max: 100
    })
  };
}

function parseText(value, name, maxLength, normalize = (entry) => entry) {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) {
    invalidQuery(`${name} must contain from 1 to ${maxLength} characters`);
  }
  return normalize(trimmed);
}

function parseEnum(value, name, allowed) {
  if (value === undefined) return undefined;
  if (!allowed.includes(value)) {
    invalidQuery(`${name} must be one of: ${allowed.join(", ")}`);
  }
  return value;
}

function parseSort(value, allowed, defaultValue) {
  const selected = value === undefined ? defaultValue : value;
  if (!allowed.includes(selected)) {
    invalidQuery(`sort must be one of: ${allowed.join(", ")}`);
  }
  return {
    field: selected.startsWith("-") ? selected.slice(1) : selected,
    direction: selected.startsWith("-") ? -1 : 1
  };
}

function isValidCalendarDate(value) {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function parseIsoDate(value, name, endOfDay = false) {
  if (value === undefined) return undefined;
  if (value.length > 100) invalidQuery(`${name} must be an ISO date or datetime`);

  if (DATE_PATTERN.test(value)) {
    if (!isValidCalendarDate(value)) {
      invalidQuery(`${name} must be a valid ISO date or datetime`);
    }
    return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  }

  const dateTimeMatch = DATETIME_PATTERN.exec(value);
  if (!dateTimeMatch || !isValidCalendarDate(dateTimeMatch[1])) {
    invalidQuery(`${name} must be a valid ISO date or datetime`);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    invalidQuery(`${name} must be a valid ISO date or datetime`);
  }
  return parsed;
}

function parseDateRange(query) {
  const from = parseIsoDate(readQueryValue(query, "from"), "from");
  const to = parseIsoDate(readQueryValue(query, "to"), "to", true);
  if (from && to && from.getTime() > to.getTime()) {
    invalidQuery("from must not be later than to");
  }
  return { from, to };
}

function parseProductQuery(query) {
  assertSupportedParameters(
    query,
    new Set(["page", "limit", "productNumber", "name", "isActive", "minStock", "sort"])
  );

  const isActiveValue = readQueryValue(query, "isActive");
  const minStockValue = readQueryValue(query, "minStock");
  return {
    ...parsePagination(query),
    productNumber: parseText(
      readQueryValue(query, "productNumber"),
      "productNumber",
      100
    ),
    name: parseText(readQueryValue(query, "name"), "name", 100),
    isActive:
      isActiveValue === undefined
        ? undefined
        : parseEnum(isActiveValue, "isActive", ["true", "false"]) === "true",
    minStock:
      minStockValue === undefined
        ? undefined
        : parseInteger(minStockValue, "minStock", { min: 0 }),
    sort: parseSort(
      readQueryValue(query, "sort"),
      [
        "productName",
        "-productName",
        "stockQuantity",
        "-stockQuantity",
        "syncedAt",
        "-syncedAt"
      ],
      "-syncedAt"
    )
  };
}

function parseOrderQuery(query) {
  assertSupportedParameters(
    query,
    new Set(["page", "limit", "orderNumber", "status", "from", "to", "sort"])
  );

  return {
    ...parsePagination(query),
    orderNumber: parseText(readQueryValue(query, "orderNumber"), "orderNumber", 100),
    status: parseText(
      readQueryValue(query, "status"),
      "status",
      50,
      (value) => value.toLowerCase()
    ),
    ...parseDateRange(query),
    sort: parseSort(
      readQueryValue(query, "sort"),
      ["orderDate", "-orderDate", "amountTotal", "-amountTotal", "syncedAt", "-syncedAt"],
      "-orderDate"
    )
  };
}

function parseSyncLogQuery(query) {
  assertSupportedParameters(
    query,
    new Set(["page", "limit", "entity", "status", "runId", "from", "to", "sort"])
  );

  const runId = readQueryValue(query, "runId");
  if (runId !== undefined && !UUID_PATTERN.test(runId)) {
    invalidQuery("runId must be a valid UUID");
  }

  return {
    ...parsePagination(query),
    entity: parseEnum(readQueryValue(query, "entity"), "entity", [
      "products",
      "orders",
      "dashboard"
    ]),
    status: parseEnum(readQueryValue(query, "status"), "status", ["success", "failure"]),
    runId,
    ...parseDateRange(query),
    sort: parseSort(
      readQueryValue(query, "sort"),
      ["createdAt", "-createdAt", "durationMs", "-durationMs"],
      "-createdAt"
    )
  };
}

function parseSyncRunQuery(query) {
  assertSupportedParameters(
    query,
    new Set(["page", "limit", "scope", "status", "from", "to", "sort"])
  );

  return {
    ...parsePagination(query),
    scope: parseEnum(readQueryValue(query, "scope"), "scope", ["products", "orders", "all"]),
    status: parseEnum(readQueryValue(query, "status"), "status", [
      "running",
      "success",
      "failure"
    ]),
    ...parseDateRange(query),
    sort: parseSort(
      readQueryValue(query, "sort"),
      ["startedAt", "-startedAt", "durationMs", "-durationMs"],
      "-startedAt"
    )
  };
}

function parseIdentifier(value, label) {
  if (typeof value !== "string") invalidIdentifier(`${label} is invalid`);
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 100) {
    invalidIdentifier(`${label} must contain from 1 to 100 characters`);
  }
  return trimmed;
}

function parseUuidIdentifier(value, label = "runId") {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    invalidIdentifier(`${label} must be a valid UUID`);
  }
  return value;
}

function parseObjectIdIdentifier(value, label = "logId") {
  if (typeof value !== "string" || !OBJECT_ID_PATTERN.test(value)) {
    invalidIdentifier(`${label} must be a valid MongoDB ObjectId`);
  }
  return value;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildPagination(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit)
  };
}

module.exports = {
  buildPagination,
  escapeRegex,
  parseIdentifier,
  parseObjectIdIdentifier,
  parseOrderQuery,
  parseProductQuery,
  parseSyncLogQuery,
  parseSyncRunQuery,
  parseUuidIdentifier
};
