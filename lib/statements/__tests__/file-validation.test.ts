import {
  MAX_UPLOAD_BYTES,
  formatFileSize,
  validateStatementFile,
} from "@/lib/statements/file-validation";
import { pdfFile } from "@/test/fixtures";

function fileWith(name: string, type: string, size: number) {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("validateStatementFile", () => {
  it("accepts a PDF within the size limit", () => {
    expect(validateStatementFile(pdfFile())).toBeNull();
  });

  it("accepts a .pdf whose MIME type the browser did not report", () => {
    expect(validateStatementFile(fileWith("statement.pdf", "", 1024))).toBeNull();
  });

  it("rejects a non-PDF file", () => {
    expect(validateStatementFile(fileWith("statement.csv", "text/csv", 1024))).toMatch(/only pdf/i);
  });

  it("rejects an empty PDF", () => {
    expect(validateStatementFile(fileWith("statement.pdf", "application/pdf", 0))).toMatch(/empty/i);
  });

  it("rejects a PDF above the 10 MiB backend limit", () => {
    expect(validateStatementFile(fileWith("statement.pdf", "application/pdf", MAX_UPLOAD_BYTES + 1)))
      .toMatch(/10 MiB/);
  });
});

describe("formatFileSize", () => {
  it("formats bytes, kilobytes, and megabytes", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2 KB");
    expect(formatFileSize(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});
