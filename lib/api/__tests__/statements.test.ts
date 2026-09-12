import { getStatements, importStatement, uploadStatement } from "@/lib/api/statements";
import { ApiError } from "@/lib/api/client";
import { pdfFile, statements, uploadResult } from "@/test/fixtures";

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

describe("uploadStatement", () => {
  it("posts multipart form data to the upload endpoint", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(uploadResult));

    await expect(uploadStatement(pdfFile(), "CREDIT_CARD")).resolves.toEqual(uploadResult);

    const [url, init] = mockedFetch.mock.calls[0];
    expect(url).toBe("/api/v1/statements/upload");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.headers["X-XSRF-TOKEN"]).toBe("test-csrf-token");
    expect((init.body as FormData).get("statementType")).toBe("CREDIT_CARD");
    expect((init.body as FormData).get("file")).toBeInstanceOf(File);
  });

  it("lets the browser set the multipart boundary instead of forcing JSON", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(uploadResult));

    await uploadStatement(pdfFile(), "CHECKING_ACCOUNT");

    expect(mockedFetch.mock.calls[0][1].headers).not.toHaveProperty("Content-Type");
  });

  it("surfaces the backend message for an unsupported statement", async () => {
    mockedFetch.mockResolvedValue(
      jsonResponse({ message: "The statement format is not supported" }, 422),
    );

    await expect(uploadStatement(pdfFile(), "CHECKING_ACCOUNT")).rejects.toThrow(
      "The statement format is not supported",
    );
  });

  it("reports the status when the error body cannot be parsed", async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 413,
      json: async () => {
        throw new Error("not json");
      },
    } as unknown as Response);

    await expect(uploadStatement(pdfFile(), "CREDIT_CARD")).rejects.toBeInstanceOf(ApiError);
  });
});

describe("statement persistence", () => {
  it("lists imported statements", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(statements));

    await expect(getStatements()).resolves.toEqual(statements);
    expect(mockedFetch.mock.calls[0][0]).toBe("/api/v1/statements");
  });

  it("imports a reviewed statement as CSRF-protected JSON", async () => {
    const input = {
      accountId: 4,
      statementType: "CREDIT_CARD" as const,
      periodStart: "2026-08-14",
      periodEnd: "2026-09-13",
      transactions: [{ categoryId: 9, date: "2026-09-11", amount: 42.35, description: "Harbour Market", forceDuplicate: false }],
    };
    mockedFetch.mockResolvedValue(jsonResponse({ statement: statements[0], created: true, savedCount: 1, duplicateCount: 0 }, 201));

    await expect(importStatement(input)).resolves.toMatchObject({ created: true, savedCount: 1 });

    const [url, init] = mockedFetch.mock.calls[0];
    expect(url).toBe("/api/v1/statements");
    expect(init.method).toBe("POST");
    expect(init.headers["X-XSRF-TOKEN"]).toBe("test-csrf-token");
    expect(JSON.parse(init.body)).toEqual(input);
  });
});
