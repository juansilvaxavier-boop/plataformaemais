import { describe, expect, it } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  it("allows requests up to the limit", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, 5, 60_000)).toBe(true);
    }
  });

  it("blocks requests once the limit is exceeded within the window", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      checkRateLimit(key, 3, 60_000);
    }
    expect(checkRateLimit(key, 3, 60_000)).toBe(false);
  });

  it("tracks independent buckets per key", () => {
    const keyA = `test-a-${Math.random()}`;
    const keyB = `test-b-${Math.random()}`;
    for (let i = 0; i < 3; i++) checkRateLimit(keyA, 3, 60_000);
    // A esgotou o limite, mas B ainda deve estar livre.
    expect(checkRateLimit(keyA, 3, 60_000)).toBe(false);
    expect(checkRateLimit(keyB, 3, 60_000)).toBe(true);
  });

  it("resets the count after the window expires", async () => {
    const key = `test-window-${Math.random()}`;
    const windowMs = 50;
    expect(checkRateLimit(key, 1, windowMs)).toBe(true);
    expect(checkRateLimit(key, 1, windowMs)).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, windowMs + 20));

    expect(checkRateLimit(key, 1, windowMs)).toBe(true);
  });
});
