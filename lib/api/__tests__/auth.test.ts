import { getCurrentUser, login, logout } from "@/lib/api/auth";

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

describe("authentication API", () => {
  it("logs in with a CSRF-protected JSON request", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ id: 1, email: "test@test.com" }));

    await expect(login({ email: "test@test.com", password: "123@Test" }))
      .resolves.toEqual({ id: 1, email: "test@test.com" });

    expect(mockedFetch).toHaveBeenCalledWith(
      "/api/v1/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "test@test.com", password: "123@Test" }),
        headers: expect.objectContaining({ "X-XSRF-TOKEN": "test-csrf-token" }),
      }),
    );
  });

  it("loads the current session without a CSRF header", async () => {
    mockedFetch.mockResolvedValue(jsonResponse({ id: 1, email: "test@test.com" }));

    await getCurrentUser();

    const init = mockedFetch.mock.calls[0][1];
    expect(init.headers).not.toHaveProperty("X-XSRF-TOKEN");
  });

  it("protects logout with the CSRF token", async () => {
    mockedFetch.mockResolvedValue({ ok: true, status: 204 } as Response);

    await logout();

    expect(mockedFetch.mock.calls[0][1]).toEqual(expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ "X-XSRF-TOKEN": "test-csrf-token" }),
    }));
  });

  it("obtains a token before the first unsafe request", async () => {
    document.cookie = "XSRF-TOKEN=; Max-Age=0; path=/";
    mockedFetch
      .mockResolvedValueOnce(jsonResponse({ token: "fresh-token" }))
      .mockResolvedValueOnce(jsonResponse({ id: 1, email: "test@test.com" }));

    await login({ email: "test@test.com", password: "123@Test" });

    expect(mockedFetch.mock.calls[0][0]).toBe("/api/v1/auth/csrf");
    expect(mockedFetch.mock.calls[1][1].headers["X-XSRF-TOKEN"]).toBe("fresh-token");
  });
});
