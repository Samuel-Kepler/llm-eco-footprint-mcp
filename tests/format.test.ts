import { describe, expect, it } from "vitest";
import {
  formatCarbon,
  formatEnergy,
  formatRange,
  formatWater,
  toSignificantFigures,
} from "../src/math/format.js";

describe("toSignificantFigures", () => {
  it("arredonda para 3 algarismos significativos por padrao", () => {
    expect(toSignificantFigures(10.268208, 3)).toBe(10.3);
    expect(toSignificantFigures(0.0421, 3)).toBe(0.0421);
  });

  it("trata 0 e valores nao finitos sem lancar erro", () => {
    expect(toSignificantFigures(0)).toBe(0);
    expect(toSignificantFigures(NaN)).toBe(0);
    expect(toSignificantFigures(Infinity)).toBe(0);
  });
});

describe("formatEnergy", () => {
  it("usa Wh abaixo de 1 kWh (kwh * 1000, nunca mWh), com virgula decimal (pt-BR)", () => {
    expect(formatEnergy(0.0103)).toBe("10,3 Wh");
    expect(formatEnergy(0.0000103)).toBe("0,0103 Wh");
  });

  it("usa kWh a partir de 1 kWh, com virgula decimal", () => {
    expect(formatEnergy(1.5)).toBe("1,5 kWh");
  });

  it("nunca produz o rotulo mWh", () => {
    expect(formatEnergy(0.0103)).not.toContain("mWh");
    expect(formatEnergy(0.0000001)).not.toContain("mWh");
  });

  it("nunca usa ponto como separador decimal", () => {
    expect(formatEnergy(0.0103)).not.toContain(".");
    expect(formatEnergy(1.5)).not.toContain(".");
  });
});

describe("formatWater", () => {
  it("usa mL abaixo de 1 L e L a partir de 1 L, com virgula decimal", () => {
    expect(formatWater(0.042)).toBe("42 mL");
    expect(formatWater(2.5)).toBe("2,5 L");
  });
});

describe("formatCarbon", () => {
  it("usa g CO2e abaixo de 1000 g e kg CO2e a partir de 1000 g, com virgula decimal", () => {
    expect(formatCarbon(0.924)).toBe("0,924 g CO2e");
    expect(formatCarbon(1500)).toBe("1,5 kg CO2e");
  });
});

describe("formatRange", () => {
  it("aplica o formatador aos tres pontos da faixa, preservando min/central/max", () => {
    const result = formatRange(
      { min: 0.0051, central: 0.0103, max: 0.0171 },
      formatEnergy,
    );
    expect(result).toEqual({ min: "5,1 Wh", central: "10,3 Wh", max: "17,1 Wh" });
  });
});
