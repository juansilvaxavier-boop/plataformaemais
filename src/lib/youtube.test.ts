import { describe, expect, it } from "vitest";
import { extractYouTubeVideoId, isYouTubeUrl } from "./youtube";

describe("extractYouTubeVideoId", () => {
  it("extracts the id from a standard watch URL", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=abc123XYZ_")).toBe("abc123XYZ_");
  });

  it("extracts the id from a watch URL with extra query params", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=abc123&list=PL1&t=30s")).toBe("abc123");
  });

  it("extracts the id from a youtu.be short link", () => {
    expect(extractYouTubeVideoId("https://youtu.be/abc123XYZ_")).toBe("abc123XYZ_");
  });

  it("extracts the id from a youtu.be link with tracking query params", () => {
    expect(extractYouTubeVideoId("https://youtu.be/abc123XYZ_?si=trackingtoken")).toBe("abc123XYZ_");
  });

  it("extracts the id from an embed URL", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/embed/abc123XYZ_")).toBe("abc123XYZ_");
  });

  it("extracts the id from a shorts URL", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/shorts/abc123XYZ_")).toBe("abc123XYZ_");
  });

  it("extracts the id from a live URL", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/live/abc123XYZ_")).toBe("abc123XYZ_");
  });

  it("accepts a URL pasted without protocol", () => {
    expect(extractYouTubeVideoId("www.youtube.com/watch?v=abc123XYZ_")).toBe("abc123XYZ_");
    expect(extractYouTubeVideoId("youtu.be/abc123XYZ_")).toBe("abc123XYZ_");
  });

  it("trims surrounding whitespace", () => {
    expect(extractYouTubeVideoId("  https://youtu.be/abc123XYZ_  ")).toBe("abc123XYZ_");
  });

  it("handles a trailing slash on short/embed links", () => {
    expect(extractYouTubeVideoId("https://youtu.be/abc123XYZ_/")).toBe("abc123XYZ_");
  });

  it("returns null for a non-YouTube URL", () => {
    expect(extractYouTubeVideoId("https://example.com/video.mp4")).toBeNull();
  });

  it("returns null for an invalid URL", () => {
    expect(extractYouTubeVideoId("not a url at all")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(extractYouTubeVideoId("")).toBeNull();
  });
});

describe("isYouTubeUrl", () => {
  it("returns true for YouTube URLs", () => {
    expect(isYouTubeUrl("https://youtu.be/abc123")).toBe(true);
  });

  it("returns false for direct video file URLs", () => {
    expect(isYouTubeUrl("https://cdn.example.com/aula1.mp4")).toBe(false);
  });
});
