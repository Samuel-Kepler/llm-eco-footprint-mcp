---
name: eco-footprint
description: Estima e apresenta a pegada ecológica (água, energia e CO2e) do uso de LLMs, usando as ferramentas do servidor MCP eco-footprint. Use SEMPRE que o usuário perguntar sobre impacto ambiental, consumo de água, energia, carbono, sustentabilidade ou "pegada" de uma sessão, prompt, projeto ou quantidade de tokens, mesmo que ele não diga "eco-footprint" nem "pegada ecológica". Também use para comparar sistemas de resfriamento de data centers ou explicar as premissas do cálculo.
allowed-tools: mcp__eco-footprint__analyze_claude_code_session mcp__eco-footprint__calculate_ecological_footprint mcp__eco-footprint__compare_cooling_systems mcp__eco-footprint__get_ecological_benchmarks
---

# Eco-Footprint — Pegada ecológica do uso de LLMs

Esta skill orienta o uso do servidor MCP `eco-footprint`. O servidor faz os
cálculos; esta skill define QUANDO chamar cada ferramenta e COMO apresentar os
resultados com honestidade.

Regra central: os números vêm SEMPRE das ferramentas. Nunca calcule, estime ou
invente valores de cabeça.

## 1. Escolha da ferramenta

| Pedido do usuário | Ferramenta |
|---|---|
| "Pegada desta sessão", "quanto gastei hoje", "impacto deste projeto" | `analyze_claude_code_session` |
| Número de tokens informado ("1 milhão de tokens", "um prompt de 5k") | `calculate_ecological_footprint` |
| Comparar resfriamento, "closed loop vs evaporativo" | `compare_cooling_systems` |
| "De onde vêm esses números?", premissas, fontes, fórmulas | `get_ecological_benchmarks` |

Parâmetros:
- A região representa a localização do data center, não a do usuário.
  Use `global` por padrão, sem perguntar.
- Nunca infira a região pelo idioma ou pela localização do usuário.
- Use outra região só se o usuário pedir explicitamente, e apresente-a
  como cenário hipotético ("se fosse processado em...").
- Sempre informe a região usada na linha de contexto.
- Para uma sessão, use o diretório atual como `project_path`, a menos que o
  usuário indique outro. No Windows, use barras normais (`C:/Users/...`).
- Nunca peça ao usuário para contar tokens manualmente se os logs da sessão
  estiverem disponíveis.

Se as ferramentas `eco-footprint` não estiverem disponíveis, NÃO faça o cálculo
por conta própria. Explique que o servidor precisa estar conectado e oriente:
rodar `/mcp` no Claude Code, aprovar o servidor `eco-footprint` e tentar de novo.

## 2. Formato obrigatório da resposta

Siga esta estrutura, nesta ordem:

**1. Contexto (1 linha):** o que foi medido, o modelo/família, a região e o
sistema de resfriamento usados.

**2. Tokens:** entrada, saída, cache lido e cache escrito, com os números
exatos que a ferramenta retornou.

**3. Pegada estimada:** sempre com a faixa, nunca só o valor central, usando
os textos do campo `formatado`:

    Energia: ~X (faixa A – B)
    Água total: ~X (faixa A – B)
      • direta (resfriamento): ~X
      • indireta (geração de eletricidade): ~X
    Carbono: ~X g CO2e (faixa A – B)

**4. Equivalências:** use APENAS as que a ferramenta retornou (garrafas de
500 mL, horas de lâmpada LED de 10 W, cargas de smartphone de 15 Wh).

**5. Leitura crítica (1–3 frases):** o que domina o resultado (ver seção 3).

**6. Nota de transparência:** reproduza a nota retornada pela ferramenta. Se
ela não vier, use:
> Valores estimados a partir de premissas de ordem de grandeza (energia por
> token, PUE, WUE, EWIF e intensidade de carbono). Não há dados oficiais
> públicos de consumo por token para estes modelos. Use como referência
> comparativa, não como medição.
> Todas as 6 partes são obrigatórias. Se a ferramenta não retornar alguma delas (ex.: equivalências), diga explicitamente que ela não veio, em vez de omitir.

## 3. Regras essenciais (resumo)

- Copie os valores do campo `formatado` exatamente como vieram; nunca converta
  nem arredonde de novo. Energia só em Wh ou kWh, nunca mWh.
- Use apenas as equivalências que a ferramenta retornou; nunca invente.
- Separe sempre água direta e indireta; nunca diga "impacto hídrico zero".
- Tom informativo, sem alarmismo e sem minimizar.

Para a sensibilidade ao cache, pedidos comuns ("como reduzir?", "é confiável?",
comparação entre sessões) e um exemplo completo de resposta, leia
[reference.md](reference.md) antes de responder.
