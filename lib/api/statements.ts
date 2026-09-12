import { apiRequest } from "@/lib/api/client";
import type { StatementType, StatementUploadResult } from "@/lib/types/statement";

/**
 * Sends the PDF as multipart form data. The Content-Type header is deliberately omitted so the
 * browser generates the multipart boundary the Spring endpoint needs.
 */
export function uploadStatement(
  file: File,
  statementType: StatementType,
  signal?: AbortSignal,
) {
  const body = new FormData();
  body.append("file", file);
  body.append("statementType", statementType);

  return apiRequest<StatementUploadResult>("/statements/upload", { method: "POST", body, signal });
}
