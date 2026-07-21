import { describe, expect, it } from "vitest";
import { generateNaiveCaptionSegments, segmentsToVtt } from "./captions";

describe("generateNaiveCaptionSegments", () => {
  it("returns no segments for empty transcript", () => {
    expect(generateNaiveCaptionSegments("", 100)).toEqual([]);
  });

  it("returns no segments for zero/negative duration", () => {
    expect(generateNaiveCaptionSegments("Alguma frase. Outra frase.", 0)).toEqual([]);
  });

  it("splits transcript into one segment per sentence", () => {
    const segments = generateNaiveCaptionSegments(
      "Primeira frase aqui. Segunda frase aqui. Terceira frase aqui.",
      90
    );
    expect(segments).toHaveLength(3);
  });

  it("distributes segments proportionally across the full duration without gaps or overlaps", () => {
    const duration = 60;
    const segments = generateNaiveCaptionSegments("Frase um. Frase dois é mais longa que a um.", duration);

    expect(segments[0].start).toBe(0);
    expect(segments[segments.length - 1].end).toBeCloseTo(duration, 5);

    for (let i = 1; i < segments.length; i++) {
      expect(segments[i].start).toBeCloseTo(segments[i - 1].end, 5);
    }
  });

  it("gives longer sentences a proportionally longer time slice", () => {
    const shortText = "Oi.";
    const longText = "Esta e uma frase bem mais longa do que a anterior para comparacao.";
    const segments = generateNaiveCaptionSegments(`${shortText} ${longText}`, 100);

    expect(segments).toHaveLength(2);
    const shortDuration = segments[0].end - segments[0].start;
    const longDuration = segments[1].end - segments[1].start;
    expect(longDuration).toBeGreaterThan(shortDuration);
  });
});

describe("segmentsToVtt", () => {
  it("produces a valid WEBVTT header", () => {
    const vtt = segmentsToVtt([{ start: 0, end: 1.5, text: "Olá" }]);
    expect(vtt.startsWith("WEBVTT")).toBe(true);
  });

  it("formats timestamps as HH:MM:SS.mmm", () => {
    const vtt = segmentsToVtt([{ start: 0, end: 65.25, text: "Teste" }]);
    expect(vtt).toContain("00:00:00.000 --> 00:01:05.250");
    expect(vtt).toContain("Teste");
  });
});
