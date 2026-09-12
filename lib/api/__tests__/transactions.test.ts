import { createTransactionBatch, getAccounts, getCategories } from "@/lib/api/transactions";
import { accounts, categories } from "@/test/fixtures";

const mockedFetch = jest.fn();
global.fetch = mockedFetch as unknown as typeof fetch;

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body } as Response;
}

beforeEach(() => {
  document.cookie = "XSRF-TOKEN=test-csrf-token; path=/";
});

afterEach(() => {
  jest.clearAllMocks();
  document.cookie = "XSRF-TOKEN=; Max-Age=0; path=/";
});

describe("createTransactionBatch", () => {
  const payload = {
    accountId: 4,
    transactions: [
      {
        categoryId: 9,
        date: "2026-09-11",
        amount: 42.35,
        type: "CREDIT" as const,
        description: "Harbour Market",
        hashSignature: "a".repeat(64),
        forceDuplicate: false,
      },
    ],
  };

  it("posts the reviewed batch as JSON", async () => {
    mockedFetch.mockResolvedValue(
      jsonResponse({ savedCount: 1, duplicateCount: 0, transactions: [] }, 201),
    );

    const result = await createTransactionBatch(payload);

    expect(result.savedCount).toBe(1);
    const [url, init] = mockedFetch.mock.calls[0];
    expect(url).toBe("/api/v1/transactions/batch");
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.headers["X-XSRF-TOKEN"]).toBe("test-csrf-token");
    expect(JSON.parse(init.body)).toEqual(payload);
  });

  it("propagates a validation failure from the API", async () => {
    mockedFetch.mockResolvedValue(
      jsonResponse({ message: "Request validation failed", validationErrors: { accountId: "must not be null" } }, 400),
    );

    await expect(createTransactionBatch(payload)).rejects.toThrow("Request validation failed");
  });
});

describe("reference data", () => {
  it("loads accounts", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(accounts));

    await expect(getAccounts()).resolves.toEqual(accounts);
    expect(mockedFetch.mock.calls[0][0]).toBe("/api/v1/accounts");
  });

  it("loads categories", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(categories));

    await expect(getCategories()).resolves.toEqual(categories);
    expect(mockedFetch.mock.calls[0][0]).toBe("/api/v1/categories");
  });
});
