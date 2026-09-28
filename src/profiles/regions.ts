import { REGION_PRESETS, type RegionPreset } from "../math/benchmarks.js";
import type { Region } from "../types/index.js";

export function getRegionPreset(region: Region): RegionPreset {
  return REGION_PRESETS[region];
}

export type { RegionPreset };
