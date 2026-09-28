---
name: eco-footprint
description: Estima e apresenta a pegada ecológica (água, energia e CO2e) do uso de LLMs, usando as ferramentas do servidor MCP eco-footprint. Use SEMPRE que o usuário perguntar sobre impacto ambiental, consumo de água, energia, carbono, sustentabilidade ou "pegada" de uma sessão, prompt, projeto ou quantidade de tokens, mesmo que ele não diga "eco-footprint" nem "pegada ecológica". Também use para comparar sistemas de resfriamento de data centers ou explicar as premissas do cálculo.
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

## 3. Regras de interpretação

**Unidades e precisão.** As ferramentas retornam cada grandeza em dois formatos:
números crus (kWh, L, g) e o campo `formatado`, já em pt-BR, com unidade
adaptativa e vírgula decimal (ex.: "10,3 Wh").
- Na resposta, copie os valores do campo `formatado` exatamente como vieram,
  incluindo central, mínimo e máximo. Não converta, não arredonde de novo e não
  reescreva unidades.
- Use os números crus apenas para contas auxiliares (ex.: participação do cache
  nos tokens equivalentes). Ao mostrar o resultado de uma conta sua, deixe a
  conta visível e confira a unidade.
- Unidades válidas de energia: Wh e kWh. Nunca use mWh.
- Se o campo `formatado` estiver ausente, o servidor provavelmente está
  desatualizado. Avise o usuário para recarregar o eco-footprint via `/mcp`
  antes de apresentar valores.

**Equivalências: nunca invente.** Comparações improvisadas ("segundos de
chuveiro", "carregar o celular por alguns segundos") costumam errar a ordem de
grandeza.
- Errado: 6,2 Wh descrito como "carregar o celular por alguns segundos".
- Certo: 6,2 Wh ≈ 0,4 carga de smartphone ≈ 37 min de lâmpada LED de 10 W.
Se quiser uma comparação que a ferramenta não fornece, mostre a conta
explicitamente e confira as unidades antes de escrever.

**Água direta vs. indireta.** Sempre separe as duas. Ao falar de closed loop ou
direct-to-chip, deixe claro que a água indireta (geração elétrica) continua
existindo. Nunca diga "impacto hídrico zero".

**Sensibilidade ao cache.** Calcule a participação de cada tipo de token nos
tokens equivalentes, usando os pesos retornados por `get_ecological_benchmarks`
(padrão atual: saída 1,0, entrada 0,25, cache escrito 0,25, cache lido 0,10).
Se o cache lido responder por mais de 50% do total, diga isso e explique que
o peso do cache é a premissa mais sensível: o resultado muda quase na mesma
proporção desse peso. Os logs registram a quantidade de tokens de cache, não o conteúdo. Não atribua
o cache a uma origem específica (prompt de sistema, skill, histórico); diga
apenas que se trata de contexto reaproveitado.

**Tom.** Informativo, sem alarmismo e sem minimizar. Não diga "insignificante"
nem "catastrófico". Para dar escala, compare sessões entre si ou com a própria
faixa, em vez de julgar.

## 4. Pedidos comuns

- **"Como reduzir a pegada?"** Chame `compare_cooling_systems` ou recalcule
  com outra região para mostrar o efeito real. Sugestões com base no modelo:
  modelos menores (haiku) para tarefas simples, prompts e respostas mais
  enxutos, e `/clear` entre tarefas não relacionadas para evitar arrastar
  contexto. Deixe claro que resfriamento e região não dependem do usuário.
- **"Esses números são confiáveis?"** Chame `get_ecological_benchmarks` e
  explique as premissas, as fontes de sanidade citadas nela e as limitações.
- **Pedido de comparação entre sessões:** use os mesmos parâmetros (região,
  resfriamento) em todas, senão a comparação não vale.

## 5. Exemplo de resposta

> Pegada desta sessão (família sonnet, região brazil, resfriamento evaporativo):
>
> **Tokens:** entrada 4 · saída 234 · cache lido 103.939 · cache escrito 14.530
>
> **Energia:** ~10,3 Wh (faixa 5,1 – 17,1 Wh)
> **Água total:** ~42 mL (faixa 21 – 70 mL)
>  • direta: ~10 mL · indireta: ~32 mL
> **Carbono:** ~0,92 g CO2e (faixa 0,46 – 1,54 g)
>
> **Equivalências:** ~0,08 garrafa de 500 mL · ~1 h de lâmpada LED ·
> ~0,68 carga de smartphone
>
> **Leitura crítica:** dos ~14.261 tokens equivalentes, o cache lido responde
> por ~73% e o cache escrito por ~25%; a saída é só ~1,6%. Quase todo o custo
> vem de reaproveitar contexto, não de gerar texto. Por isso, o peso do cache
> lido (0,10) é a premissa mais sensível deste resultado.
>
> *Valores estimados a partir de premissas de ordem de grandeza. Use como
> referência comparativa, não como medição.*
