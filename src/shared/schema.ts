export class ValidationError extends Error {
  details: string[];

  constructor(message: string, details: string[] = []) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
  }
}

export function assertObject(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError(`${label} must be an object`);
  }
}

export function stringField(input: Record<string, unknown>, key: string, fallback = ""): string {
  const value = input[key];
  return typeof value === "string" ? value.trim() : fallback;
}

export function optionalString(input: Record<string, unknown>, key: string): string | undefined {
  const value = input[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function numberField(input: Record<string, unknown>, key: string, fallback = 0): number {
  const value = input[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function arrayField(input: Record<string, unknown>, key: string): unknown[] {
  const value = input[key];
  return Array.isArray(value) ? value : [];
}

export function cleanText(value: string): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/[<>]/g, "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function assertSafeUpload(fileName: string, base64: string, maxBytes = 8 * 1024 * 1024): void {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const allowed = new Set(["pdf", "doc", "docx", "txt", "png", "jpg", "jpeg", "webp"]);
  if (!allowed.has(ext)) {
    throw new ValidationError("Unsupported file type", [`.${ext || "unknown"} is not allowed`]);
  }
  const bytes = Math.ceil((base64.length * 3) / 4);
  if (bytes > maxBytes) {
    throw new ValidationError("File too large", [`Maximum upload size is ${Math.round(maxBytes / 1024 / 1024)}MB`]);
  }
}
