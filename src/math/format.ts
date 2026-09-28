/**
 * Formatacao de unidades adaptativa (mL/L, Wh/kWh, g/kg) com 2 a 3
 * algarismos significativos. Mais precisao do que isso seria falsa, dada a
 * incerteza das premissas usadas no calculo.
 */

import type { Range } from "../types/index.js";

export function toSignificantFigures(value: number, sigFigs = 3): number {
  if (value === 0 || !Number.isFinite(value)) return 0;
  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  const factor = Math.pow(10, sigFigs - 1 - magnitude);
  return Math.round(value * factor) / factor;
}

/** Numero -> texto no padrao pt-BR: virgula decimal, sem separador de milhar. */
function toPtBrString(value: number): string {
  return value.toString().replace(".", ",");
}

export function formatWater(liters: number): string {
  if (Math.abs(liters) < 1) {
    return `${toPtBrString(toSignificantFigures(liters * 1000, 3))} mL`;
  }
  return `${toPtBrString(toSignificantFigures(liters, 3))} L`;
}

export function formatEnergy(kwh: number): string {
  if (Math.abs(kwh) < 1) {
    return `${toPtBrString(toSignificantFigures(kwh * 1000, 3))} Wh`;
  }
  return `${toPtBrString(toSignificantFigures(kwh, 3))} kWh`;
}

export function formatCarbon(grams: number): string {
  if (Math.abs(grams) < 1000) {
    return `${toPtBrString(toSignificantFigures(grams, 3))} g CO2e`;
  }
  return `${toPtBrString(toSignificantFigures(grams / 1000, 3))} kg CO2e`;
}

/** Aplica um formatador a min/central/max de uma Range, preservando a faixa. */
export function formatRange(
  range: Range,
  formatter: (value: number) => string,
): { min: string; central: string; max: string } {
  return {
    min: formatter(range.min),
    central: formatter(range.central),
    max: formatter(range.max),
  };
}

export interface Equivalences {
  garrafas_500ml: number;
  horas_lampada_led_10w: number;
  cargas_smartphone: number;
}

export interface FormattedEquivalences {
  garrafas_500ml: string;
  horas_lampada_led_10w: string;
  cargas_smartphone: string;
}

/** Formata equivalencias praticas em pt-BR (virgula decimal, 3 algarismos significativos). */
export function formatEquivalences(equivalences: Equivalences): FormattedEquivalences {
  const num = (value: number) => toPtBrString(toSignificantFigures(value, 3));
  return {
    garrafas_500ml: `${num(equivalences.garrafas_500ml)} garrafa(s) de 500 mL`,
    horas_lampada_led_10w: `${num(equivalences.horas_lampada_led_10w)} h de lampada LED de 10 W`,
    cargas_smartphone: `${num(equivalences.cargas_smartphone)} carga(s) de smartphone`,
  };
}
