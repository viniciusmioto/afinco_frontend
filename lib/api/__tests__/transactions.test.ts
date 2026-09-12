import {
  createAccount,
  getAccounts,
  getCategories,
  getTransactionMonths,
  getTransactions,
} from "@/lib/api/transactions";
import { accounts, categories, months } from "@/test/fixtures";

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

describe("getTransactions", () => {
  const page = { content: [], page: 0, size: 500, totalElements: 0, totalPages: 0, first: true, last: true };

  it("requests one statement", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(page));

    await getTransactions({ view: "statement", statementId: 12 });

    expect(mockedFetch.mock.calls[0][0]).toBe("/api/v1/transactions?size=500&statementId=12");
  });

  it("requests one calendar month through its inclusive date bounds", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(page));

    await getTransactions({ view: "month", month: "2026-02" });

    expect(mockedFetch.mock.calls[0][0])
      .toBe("/api/v1/transactions?size=500&startDate=2026-02-01&endDate=2026-02-28");
  });

  it("loads the months that contain transactions", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(months));

    await expect(getTransactionMonths()).resolves.toEqual(months);
    expect(mockedFetch.mock.calls[0][0]).toBe("/api/v1/transactions/months");
  });
});

describe("reference data", () => {
  it("loads accounts", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(accounts));

    await expect(getAccounts()).resolves.toEqual(accounts);
    expect(mockedFetch.mock.calls[0][0]).toBe("/api/v1/accounts");
  });

  it("creates an account with a CSRF-protected JSON request", async () => {
    const input = { bankName: "TD Bank", accountNumberLast4: "2048", currency: "CAD" };
    mockedFetch.mockResolvedValue(jsonResponse(accounts[0], 201));

    await expect(createAccount(input)).resolves.toEqual(accounts[0]);
    const [url, init] = mockedFetch.mock.calls[0];
    expect(url).toBe("/api/v1/accounts");
    expect(init.method).toBe("POST");
    expect(init.headers["X-XSRF-TOKEN"]).toBe("test-csrf-token");
    expect(JSON.parse(init.body)).toEqual(input);
  });

  it("loads categories", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(categories));

    await expect(getCategories()).resolves.toEqual(categories);
    expect(mockedFetch.mock.calls[0][0]).toBe("/api/v1/categories");
  });
});
