import { describe, expect, it } from "vitest";
import { evaluateHeartbeat, SEEK_TOLERANCE_SECONDS, COMPLETION_THRESHOLD } from "./heartbeat";

describe("evaluateHeartbeat", () => {
  it("accepts continuous forward progress", () => {
    const result = evaluateHeartbeat({ currentMax: 10, positionSeconds: 12, durationSeconds: 100 });
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.newMax).toBe(12);
      expect(result.percent).toBeCloseTo(12);
      expect(result.willComplete).toBe(false);
    }
  });

  it("accepts a small step within the seek tolerance", () => {
    const result = evaluateHeartbeat({
      currentMax: 10,
      positionSeconds: 10 + SEEK_TOLERANCE_SECONDS,
      durationSeconds: 100,
    });
    expect(result.allowed).toBe(true);
  });

  it("rejects a jump beyond the seek tolerance (anti-cheat)", () => {
    const result = evaluateHeartbeat({
      currentMax: 10,
      positionSeconds: 10 + SEEK_TOLERANCE_SECONDS + 1,
      durationSeconds: 100,
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.maxWatchedSeconds).toBe(10);
    }
  });

  it("never decreases the max watched position when scrubbing backward", () => {
    const result = evaluateHeartbeat({ currentMax: 50, positionSeconds: 5, durationSeconds: 100 });
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.newMax).toBe(50);
    }
  });

  it("does not mark complete just under the completion threshold", () => {
    const durationSeconds = 100;
    const position = durationSeconds * COMPLETION_THRESHOLD - 1;
    // currentMax próximo à posição para não disparar a rejeição de salto.
    const result = evaluateHeartbeat({ currentMax: position, positionSeconds: position, durationSeconds });
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.willComplete).toBe(false);
    }
  });

  it("marks complete at/above the completion threshold", () => {
    const durationSeconds = 100;
    const position = durationSeconds * COMPLETION_THRESHOLD;
    const result = evaluateHeartbeat({ currentMax: position, positionSeconds: position, durationSeconds });
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.willComplete).toBe(true);
    }
  });

  it("never completes a lesson with unknown/zero duration", () => {
    const result = evaluateHeartbeat({ currentMax: 0, positionSeconds: 0, durationSeconds: 0 });
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.willComplete).toBe(false);
      expect(result.percent).toBe(0);
    }
  });

  it("caps percent at 100 even if position slightly overshoots duration", () => {
    // currentMax já perto do fim; 105 está dentro da tolerância de salto (100+5).
    const result = evaluateHeartbeat({ currentMax: 100, positionSeconds: 105, durationSeconds: 100 });
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.percent).toBe(100);
    }
  });
});
