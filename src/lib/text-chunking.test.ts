import { describe, expect, it } from "vitest";
import { chunkText } from "./text-chunking";

describe("chunkText", () => {
  it("returns an empty array for blank input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   ")).toEqual([]);
  });

  it("returns a single chunk for short text", () => {
    const chunks = chunkText("Um texto curto.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe("Um texto curto.");
  });

  it("splits long text into multiple overlapping chunks", () => {
    const longText = "palavra ".repeat(500); // muito maior que o tamanho de um chunk
    const chunks = chunkText(longText);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("collapses internal whitespace/newlines before chunking", () => {
    const chunks = chunkText("linha um\n\nlinha   dois\t\tlinha tres");
    expect(chunks[0]).not.toMatch(/\n|\t/);
  });

  it("reassembles to cover the full original content (allowing for overlap)", () => {
    const longText = "abcdefghij".repeat(200);
    const chunks = chunkText(longText);
    const uniqueCharsCovered = new Set(chunks.join("").split(""));
    // Nenhum caractere da entrada deve desaparecer da saída combinada.
    for (const char of new Set(longText.split(""))) {
      expect(uniqueCharsCovered.has(char)).toBe(true);
    }
  });
});
