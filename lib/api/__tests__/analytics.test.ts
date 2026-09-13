import { getSpending } from "@/lib/api/analytics";

const mockedFetch = jest.fn();
global.fetch = mockedFetch as unknown as typeof fetch;

afterEach(() => jest.clearAllMocks());

describe("getSpending", () => {
  const body = { groupBy: "MONTH", bankName: null, categories: [], periods: [] };

  it("requests monthly spending across banks", async () => {
    mockedFetch.mockResolvedValue({ ok: true, status: 200, json: async () => body } as Response);

    await expect(getSpending("MONTH", null)).resolves.toEqual(body);
    expect(mockedFetch.mock.calls[0][0]).toBe("/api/v1/analytics/spending?groupBy=MONTH");
  });

  it("requests one bank's statements", async () => {
    mockedFetch.mockResolvedValue({ ok: true, status: 200, json: async () => body } as Response);

    await getSpending("STATEMENT", "TD Bank");

    expect(mockedFetch.mock.calls[0][0]).toBe("/api/v1/analytics/spending?groupBy=STATEMENT&bankName=TD+Bank");
  });
});
