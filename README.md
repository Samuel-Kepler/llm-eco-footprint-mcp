# llm-eco-footprint-mcp

Servidor MCP (Model Context Protocol) em TypeScript/Node.js que estima a
pegada ecológica (água, energia e carbono) do uso de LLMs — com uma
ferramenta dedicada a medir o consumo **real** de uma sessão do Claude Code.

Projeto desenvolvido como atividade do curso **IA para Devs — Programadores
do Amanhã (PDA)**.

> ⚠️ **Os valores são sempre faixas de estimativa (mín/central/máx), nunca
> medições.** Não existem dados oficiais públicos de energia por token para
> os modelos Claude. Veja a seção [Premissas e fontes](#premissas-e-fontes).

## Rodando na sua máquina (para quem clonou o repositório)

Requisitos: Node.js 20+ (LTS) e Claude Code instalado.

```bash
git clone https://github.com/Samuel-Kepler/llm-eco-footprint-mcp.git
cd llm-eco-footprint-mcp
npm install
npm run build
```

O repositório já vem com um `.mcp.json` na raiz (caminho relativo,
`./dist/index.js`), então basta abrir o Claude Code **dentro dessa pasta**:

```bash
claude
```

Na primeira vez, o Claude Code vai perguntar se você aprova o servidor MCP
`eco-footprint` do projeto — aprove. Depois, confira com `claude mcp list`
ou `/mcp` dentro da sessão.

> Se você mover ou renomear a pasta do projeto depois de já ter aprovado o
> servidor, rode `npm run build` de novo antes de abrir o Claude Code — o
> caminho no `.mcp.json` é relativo à raiz do projeto, então funciona em
> qualquer máquina sem edição.

## Registrando manualmente em outro projeto

Se você quiser usar o servidor a partir de **outro** diretório (não este
repositório), registre com o caminho absoluto do seu clone:

```bash
claude mcp add eco-footprint -- node /caminho/absoluto/para/llm-eco-footprint-mcp/dist/index.js
```

**Alternativa (Claude Desktop):** adicione o mesmo comando em
`claude_desktop_config.json`, na chave `"mcpServers"`.

## Scripts

| Script          | Descrição                                   |
| --------------- | -------------------------------------------- |
| `npm run build` | Compila TypeScript para `dist/`               |
| `npm start`     | Roda o servidor já compilado                  |
| `npm run dev`   | Roda o servidor via `tsx`, sem build           |
| `npm test`      | Roda a suíte de testes (Vitest)               |

## Ferramentas disponíveis

### 1. `calculate_ecological_footprint`
Estima água (direta e indireta), energia e CO2e para uma quantidade de
tokens informada manualmente.

Entrada: `input_tokens`, `output_tokens`, `cache_read_tokens?`,
`cache_write_tokens?`, `model?`, `cooling_system?`
(`evaporative | hybrid | closed_loop | direct_to_chip`),
`region?` (`global | us | eu | brazil`), `include_offsite_water?`.

A soma de todos os campos de tokens é limitada a 1e12; acima disso a
ferramenta retorna erro de validação.

### 2. `compare_cooling_systems`
Compara a mesma carga de tokens entre os quatro sistemas de resfriamento.
Deixa explícito que **a água off-site (geração de eletricidade) não muda
com o sistema de resfriamento** — só a água on-site varia.

### 3. `get_ecological_benchmarks`
Retorna todas as constantes, fórmulas, presets regionais e limitações
usadas nos cálculos, para auditoria.

### 4. `analyze_claude_code_session`
Lê os logs locais do Claude Code (`~/.claude/projects/<projeto-codificado>/<id>.jsonl`,
ou `$CLAUDE_CONFIG_DIR` se definida) e calcula a pegada com os **tokens reais**
registrados na sessão, em vez de números estimados.

Entrada: `project_path?` (padrão: diretório atual), `session_id?` (padrão:
sessão mais recente), `since?` (data ISO; soma todas as sessões desde essa
data), `cooling_system?`, `region?`.

Regras de segurança e integridade aplicadas pelo parser
(`src/session/claudeCodeLogs.ts`):
- Deduplica respostas pelo `message.id` (a mesma resposta pode aparecer em
  várias linhas do log com o mesmo `usage`).
- Lê **apenas** os campos de uso e o nome do modelo — nunca o conteúdo das
  mensagens.
- Só acessa arquivos dentro do diretório de configuração do Claude Code
  (proteção contra path traversal via `session_id`).
- Linhas malformadas são ignoradas, e a contagem de linhas ignoradas é
  devolvida para transparência.

## Exemplos de uso (dentro do Claude Code)

```
Use a ferramenta calculate_ecological_footprint para 50000 tokens de
entrada e 2000 tokens de saída do claude-sonnet-5, região brazil.
```

```
Compare os sistemas de resfriamento para 1 milhão de tokens de saída.
```

```
Analise a pegada ecológica da minha sessão atual do Claude Code.
```

## Premissas e fontes

Todas as constantes ficam em `src/math/benchmarks.ts`, com comentários
indicando que são premissas de ordem de grandeza — não medições.

### Energia por 1.000 tokens de SAÍDA (kWh)

| Família         | mín      | central  | máx     |
| --------------- | -------- | -------- | ------- |
| large (opus)    | 0.0006   | 0.0012   | 0.0020  |
| medium (sonnet) | 0.0003   | 0.0006   | 0.0010  |
| small (haiku)   | 0.00005  | 0.0001   | 0.00015 |

- Peso dos tokens de **entrada**: `INPUT_WEIGHT = 0.25` (1 token de entrada
  ≈ 1/4 da energia de 1 token de saída — o *prefill* é paralelizável e mais
  barato que o *decode* token a token).
- Peso dos tokens **lidos do cache**: `CACHE_READ_WEIGHT = 0.10` (leitura de
  cache evita recomputação). Tokens **gravados** no cache contam como
  entrada normal.

### Data center

- **PUE** (Power Usage Effectiveness): 1.2 (intervalo típico 1.1–1.25).
- **WUE on-site** (L de água por kWh de **TI**, não da energia total —
  definição da The Green Grid):

| Sistema         | central | faixa típica |
| --------------- | ------- | ------------ |
| evaporative     | 1.2     | 1.0 – 1.8    |
| hybrid          | 0.6     | 0.4 – 0.8    |
| closed_loop     | 0.05    | 0.0 – 0.1    |
| direct_to_chip  | 0.01    | 0.0 – 0.05   |

### Eletricidade (por região)

| Região  | Intensidade de carbono (gCO2e/kWh) | EWIF (L/kWh) |
| ------- | ----------------------------------- | ------------ |
| global  | 480                                  | 3.1          |
| us      | 370                                  | 3.1          |
| eu      | 250                                  | 2.5          |
| brazil  | 90                                   | 3.1 (*)      |

EWIF (Electricity Water Intensity Factor) é a água consumida para gerar
1 kWh de eletricidade — a água **off-site** do artigo *"Making AI Less
Thirsty"* (Li et al.). Presets aproximados; a atualizar com fontes oficiais
(Ember, EPE, EPA).

(*) Em matrizes com muita hidrelétrica, o EWIF depende fortemente do método
de cálculo (evaporação de reservatórios). O valor padrão é conservador; é
configurável via o parâmetro `region`.

### Fórmulas

```
tokens_eq  = output + input*INPUT_WEIGHT + cache_write*INPUT_WEIGHT + cache_read*CACHE_READ_WEIGHT
E_it       = (tokens_eq / 1000) * e_token[família]        # única grandeza com faixa min/central/máx
E_total    = E_it * PUE
W_onsite   = E_it * WUE[resfriamento]                     # sobre a energia de TI, não a total
W_offsite  = E_total * EWIF[região]
W_total    = W_onsite + W_offsite
CO2        = E_total * intensidade_de_carbono[região]
```

Apenas a energia por token (`e_token`) varia em três pontos (mín/central/máx);
PUE, WUE, EWIF e intensidade de carbono usam o valor central do preset
escolhido. A incerteza final do resultado vem da incerteza documentada de
`e_token`, propagada linearmente por todas as fórmulas.

### Checagem de sanidade

- A Epoch AI (2025) estimou ~0,3 Wh para uma consulta típica ao GPT-4o
  (algumas centenas de tokens de saída) — compatível com ~0,6 Wh
  (0,0006 kWh) por 1.000 tokens de saída.
- O Google (ago/2025) reportou ~0,24 Wh e ~0,26 mL de água por prompt
  mediano do Gemini.

Se os resultados do calculador ficarem ordens de grandeza distantes desses
números, revise as constantes em `benchmarks.ts`.

## Limitações

- **Ausência de dados oficiais por token:** as constantes são premissas de
  ordem de grandeza, não medições dos modelos Claude — não há dados oficiais
  públicos de consumo de energia por token para esses modelos.
- **Dependência dos pesos de cache:** o resultado é sensível aos pesos
  atribuídos a cada tipo de token (`INPUT_WEIGHT`, `CACHE_READ_WEIGHT`);
  como o cache costuma dominar os tokens equivalentes de uma sessão, mudar
  esses pesos altera a pegada estimada quase na mesma proporção.
- **Localização desconhecida do data center:** não há como saber em qual
  data center (ou região) a requisição foi de fato processada — os presets
  regionais (`global`, `us`, `eu`, `brazil`) são aproximações escolhidas
  manualmente pelo usuário, não detectadas automaticamente, e o data center
  real pode ter clima, hardware e matriz elétrica bem diferentes do preset.
- O formato dos logs do Claude Code é interno e pode mudar sem aviso; o
  parser está isolado em `src/session/claudeCodeLogs.ts` e coberto por
  testes com fixtures, para que uma mudança de formato quebre os testes
  antes de quebrar em produção.
- Modelos não reconhecidos (nem Claude nem heurísticas conhecidas de outros
  provedores) caem no tier `medium`, com aviso explícito de fallback na
  resposta.

## Estrutura do projeto

```
llm-eco-footprint-mcp/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts                      # Cria o McpServer e registra as tools
│   ├── types/index.ts                # Tipos e schemas Zod
│   ├── math/
│   │   ├── calculator.ts             # Funções puras de cálculo
│   │   ├── benchmarks.ts             # Constantes (e_token, PUE, WUE, EWIF, CI)
│   │   └── format.ts                 # Arredondamento e formatação de unidades
│   ├── profiles/
│   │   ├── models.ts                 # Mapeamento modelo -> família/tier
│   │   └── regions.ts                # Presets de intensidade de carbono e EWIF
│   ├── session/
│   │   └── claudeCodeLogs.ts         # Leitura dos logs .jsonl do Claude Code
│   └── tools/
│       ├── calculateFootprint.ts     # Tool 1
│       ├── compareCooling.ts         # Tool 2
│       ├── getBenchmarks.ts          # Tool 3
│       └── analyzeSession.ts         # Tool 4
└── tests/
    ├── calculator.test.ts
    ├── models.test.ts
    ├── claudeCodeLogs.test.ts        # Usa fixtures .jsonl falsas
    └── fixtures/session-sample.jsonl
```
