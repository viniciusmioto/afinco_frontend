import { deleteAllTransactionData, getTransactionDataSummary } from "@/lib/api/transaction-data";

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

describe("transaction data API", () => {
  it("loads the reset summary without a CSRF header", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ transactionCount: 250, statementCount: 7 }));

    await expect(getTransactionDataSummary()).resolves.toEqual({ transactionCount: 250, statementCount: 7 });

    const [url, init] = mockedFetch.mock.calls[0];
    expect(url).toBe("/api/v1/transaction-data");
    expect(init.headers).not.toHaveProperty("X-XSRF-TOKEN");
  });

  it("deletes all transaction data with a CSRF-protected DELETE", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ deletedTransactions: 250, deletedStatements: 7 }));

    await expect(deleteAllTransactionData()).resolves.toEqual({ deletedTransactions: 250, deletedStatements: 7 });

    const [url, init] = mockedFetch.mock.calls[0];
    expect(url).toBe("/api/v1/transaction-data");
    expect(init.method).toBe("DELETE");
    expect(init.headers["X-XSRF-TOKEN"]).toBe("test-csrf-token");
  });
});
