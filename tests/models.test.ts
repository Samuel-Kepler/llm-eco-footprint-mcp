import { describe, expect, it } from "vitest";
import { resolveModelFamily } from "../src/profiles/models.js";

describe("resolveModelFamily", () => {
  it.each([
    ["claude-opus-4", "large"],
    ["claude-sonnet-5", "medium"],
    ["claude-haiku-4-5", "small"],
    ["gpt-4o-mini", "small"],
    ["gpt-4o", "medium"],
  ] as const)("%s -> %s (sem fallback)", (model, expectedFamily) => {
    const resolution = resolveModelFamily(model);
    expect(resolution.family).toBe(expectedFamily);
    expect(resolution.fallback_used).toBe(false);
  });

  it('"xyz" -> medium + aviso de fallback', () => {
    const resolution = resolveModelFamily("xyz");
    expect(resolution.family).toBe("medium");
    expect(resolution.fallback_used).toBe(true);
    expect(resolution.warning).toBeDefined();
  });

  it("modelo nao informado -> medium + aviso de fallback", () => {
    const resolution = resolveModelFamily(undefined);
    expect(resolution.family).toBe("medium");
    expect(resolution.fallback_used).toBe(true);
    expect(resolution.warning).toBeDefined();
  });
});
