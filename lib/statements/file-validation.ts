/** Mirrors `StatementUploadService.MAX_UPLOAD_BYTES` so oversized files fail before a round trip. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const PDF_EXTENSION = /\.pdf$/i;

/** Returns a human-readable reason the file cannot be uploaded, or `null` when it is acceptable. */
export function validateStatementFile(file: File): string | null {
  const looksLikePdf = file.type === "application/pdf" || (!file.type && PDF_EXTENSION.test(file.name));
  if (!looksLikePdf) return "Only PDF statements can be uploaded.";
  if (file.size === 0) return "That PDF is empty.";
  if (file.size > MAX_UPLOAD_BYTES) return "That PDF is larger than the 10 MiB limit.";
  return null;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
