import type { CoolingSystem, ModelFamily, Range, Region } from "../types/index.js";

/**
 * TODAS AS CONSTANTES ABAIXO SAO PREMISSAS DE ORDEM DE GRANDEZA.
 *
 * Nao existem dados oficiais publicos de energia por token para os modelos
 * Claude. Os valores foram escolhidos para ficarem na mesma ordem de grandeza
 * de estimativas publicas independentes (Epoch AI para GPT-4o, Google para o
 * Gemini — ver README.md). Ajuste-os aqui se novas fontes surgirem.
 */

// Energia por 1.000 tokens de SAIDA, em kWh, por familia de modelo.
export const E_TOKEN_PER_1K_OUTPUT: Record<ModelFamily, Range> = {
  large: { min: 0.0006, central: 0.0012, max: 0.002 },
  medium: { min: 0.0003, central: 0.0006, max: 0.001 },
  small: { min: 0.00005, central: 0.0001, max: 0.00015 },
};

// Peso relativo de 1 token de ENTRADA frente a 1 token de SAIDA.
// (1 token de entrada consome ~1/4 da energia de 1 token de saida)
export const INPUT_WEIGHT = 0.25;

// Peso relativo de 1 token LIDO do cache frente a 1 token de SAIDA.
// (leitura de cache evita recomputacao, entao custa bem menos que um token novo)
export const CACHE_READ_WEIGHT = 0.1;
// Tokens gravados no cache sao tratados como entrada normal (INPUT_WEIGHT).

// PUE (Power Usage Effectiveness): energia total do data center / energia de TI.
export const PUE = { min: 1.1, central: 1.2, max: 1.25 };

// WUE (Water Usage Effectiveness) on-site, em L de agua por kWh de TI.
// Definido sobre a energia de TI (definicao da The Green Grid), NAO sobre a
// energia total do data center.
export const WUE_ONSITE: Record<CoolingSystem, Range> = {
  evaporative: { min: 1.0, central: 1.2, max: 1.8 },
  hybrid: { min: 0.4, central: 0.6, max: 0.8 },
  closed_loop: { min: 0.0, central: 0.05, max: 0.1 },
  direct_to_chip: { min: 0.0, central: 0.01, max: 0.05 },
};

// Presets regionais aproximados. A ATUALIZAR com fontes oficiais
// (Ember, EPE, EPA) quando disponiveis.
export interface RegionPreset {
  // Intensidade de carbono da rede eletrica, em gCO2e/kWh.
  carbon_intensity_g_per_kwh: number;
  // EWIF (Electricity Water Intensity Factor): agua consumida para gerar
  // 1 kWh de eletricidade, em L/kWh. Conta a agua "off-site".
  ewif_l_per_kwh: number;
}

export const REGION_PRESETS: Record<Region, RegionPreset> = {
  global: { carbon_intensity_g_per_kwh: 480, ewif_l_per_kwh: 3.1 },
  us: { carbon_intensity_g_per_kwh: 370, ewif_l_per_kwh: 3.1 },
  eu: { carbon_intensity_g_per_kwh: 250, ewif_l_per_kwh: 2.5 },
  // Em matrizes com muita hidreletrica, o EWIF depende fortemente do metodo
  // de calculo (evaporacao de reservatorios). O valor abaixo e conservador.
  brazil: { carbon_intensity_g_per_kwh: 90, ewif_l_per_kwh: 3.1 },
};

// Equivalencias praticas, calculadas sobre o valor central.
export const BOTTLE_VOLUME_L = 0.5;
export const LED_BULB_POWER_W = 10;
export const SMARTPHONE_CHARGE_WH = 15;

export const TRANSPARENCY_NOTE =
  "Valores estimados a partir de premissas de ordem de grandeza (energia por " +
  "token, PUE, WUE, EWIF e intensidade de carbono). Nao ha dados oficiais " +
  "publicos de consumo por token para estes modelos. Data centers reais variam " +
  "conforme localizacao, clima, hardware e matriz eletrica. Use como referencia " +
  "comparativa, nao como medicao.";

export const SANITY_CHECK_NOTE =
  "Checagem de sanidade: a Epoch AI (2025) estimou ~0,3 Wh para uma consulta " +
  "tipica ao GPT-4o (algumas centenas de tokens de saida), compativel com " +
  "~0,6 Wh (0,0006 kWh) por 1.000 tokens de saida. O Google (ago/2025) reportou " +
  "~0,24 Wh e ~0,26 mL de agua por prompt mediano do Gemini.";
