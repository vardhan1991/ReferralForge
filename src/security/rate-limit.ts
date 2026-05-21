export class RateLimiter {
  private buckets = new Map<string, { count: number; resetAt: number }>();
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  take(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const current = this.buckets.get(key);
    if (!current || current.resetAt < now) {
      const bucket = { count: 1, resetAt: now + this.windowMs };
      this.buckets.set(key, bucket);
      return { allowed: true, remaining: this.limit - 1, resetAt: bucket.resetAt };
    }
    current.count += 1;
    return { allowed: current.count <= this.limit, remaining: Math.max(0, this.limit - current.count), resetAt: current.resetAt };
  }
}
