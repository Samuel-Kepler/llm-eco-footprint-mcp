# CLAUDE.md — llm-eco-footprint-mcp

## Contexto

Servidor MCP (TypeScript/Node 20+, stdio) que estima a pegada ecológica (água,
energia, CO2e) do uso de LLMs. A tool principal, `analyze_claude_code_session`,
lê os logs locais do Claude Code e calcula a pegada com os tokens reais da
sessão. Projeto do curso PDA (IA para Devs). Público final: quem usa o Claude
Code e quer saber o impacto ambiental, sem ser especialista em data centers.

**Todo resultado é uma faixa de estimativa (mín/central/máx), nunca uma
medição.** Não existem dados oficiais de energia por token para modelos Claude.
Nunca apresente um número como exato nem remova avisos de transparência.

## Comandos úteis

```bash
npm install        # dependências
npm run build      # compila para dist/ (o .mcp.json aponta para dist/index.js)
npm test           # suíte Vitest — rode antes de qualquer commit
npm run dev        # servidor via tsx, sem build
```

Depois de mudar `src/`, rode `npm run build` antes de testar a tool dentro do
Claude Code, senão ele usa o `dist/` antigo.

## Convenções técnicas

- **Nunca use `console.log`** em `src/`: no transporte stdio o stdout é o canal
  do protocolo MCP e qualquer texto extra o corrompe. Logs vão em `console.error`.
- `src/math/calculator.ts` só tem funções puras (sem I/O). I/O fica em
  `src/session/` e `src/tools/`.
- Constantes numéricas (e_token, PUE, WUE, EWIF, intensidade de carbono) ficam
  só em `src/math/benchmarks.ts` e `src/profiles/`, com comentário de que são
  premissas. Se mudar uma, atualize a tabela de premissas do `README.md`.
- Entradas das tools são validadas com Zod (`src/types/index.ts`).
- O parser de logs (`src/session/claudeCodeLogs.ts`) lê apenas campos de uso e
  nome do modelo, nunca o conteúdo das mensagens, e só acessa arquivos dentro
  do diretório de config do Claude Code (proteção contra path traversal).
  Preserve essas duas garantias.
- Toda tool nova ou mudança de cálculo precisa de teste em `tests/`; formatos
  de log novos entram como fixture `.jsonl` em `tests/fixtures/`.
- Código e comentários sem acentos (padrão dos `.ts`); README e docs em
  português com acentos.

---

Este conteúdo também está em `AGENTS.md` (formato aberto, lido por outros
agentes como Cursor e Codex). Ao mudar uma regra aqui, atualize os dois arquivos.
