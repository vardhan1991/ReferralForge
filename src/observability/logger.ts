export type LogLevel = "info" | "warn" | "error";

export function log(level: LogLevel, event: string, fields: Record<string, unknown> = {}): void {
  const payload = {
    level,
    event,
    at: new Date().toISOString(),
    traceId: fields.traceId ?? crypto.randomUUID().slice(0, 8),
    ...fields
  };
  console[level === "error" ? "error" : "log"](JSON.stringify(payload));
}
