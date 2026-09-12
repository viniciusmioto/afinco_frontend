import { uploadStatement } from "@/lib/api/statements";
import { ApiError } from "@/lib/api/client";
import { pdfFile, uploadResult } from "@/test/fixtures";

const mockedFetch = jest.fn();
global.fetch = mockedFetch as unknown as typeof fetch;

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body } as Response;
}

afterEach(() => jest.clearAllMocks());

describe("uploadStatement", () => {
  it("posts multipart form data to the upload endpoint", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(uploadResult));

    await expect(uploadStatement(pdfFile(), "CREDIT_CARD")).resolves.toEqual(uploadResult);

    const [url, init] = mockedFetch.mock.calls[0];
    expect(url).toBe("/api/v1/statements/upload");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
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
