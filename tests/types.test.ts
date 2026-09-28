import { describe, expect, it } from "vitest";
import {
  AnalyzeSessionInputSchema,
  CalculateFootprintInputSchema,
  CompareCoolingInputSchema,
} from "../src/types/index.js";

describe("region default", () => {
  it("calculate_ecological_footprint sem region usa global", () => {
    const parsed = CalculateFootprintInputSchema.parse({
      input_tokens: 100,
      output_tokens: 100,
    });
    expect(parsed.region).toBe("global");
  });

  it("compare_cooling_systems sem region usa global", () => {
    const parsed = CompareCoolingInputSchema.parse({
      input_tokens: 100,
      output_tokens: 100,
    });
    expect(parsed.region).toBe("global");
  });

  it("analyze_claude_code_session sem region usa global", () => {
    const parsed = AnalyzeSessionInputSchema.parse({});
    expect(parsed.region).toBe("global");
  });
});
