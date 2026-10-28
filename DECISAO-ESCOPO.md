# DECISAO-ESCOPO — llm-eco-footprint-mcp

> Rascunho baseado no código atual. O template oficial (`starter/` do fork de
> `pda-especializacao-ia`) não está neste repositório: se o formato for
> diferente, os campos abaixo devem ser remapeados, mantendo o conteúdo.

## 1. A tool escolhida

**`analyze_claude_code_session`** (`src/tools/analyzeSession.ts`).

As outras três tools (`calculate_ecological_footprint`, `compare_cooling_systems`,
`get_ecological_benchmarks`) só fazem contas com números recebidos ou constantes
internas. Esta é a única que toca o sistema de arquivos, então é nela que o
escopo e o red team se concentram.

## 2. Para que serve (o domínio)

Quem usa o Claude Code quer saber a pegada ecológica (energia, água, CO2e) da
própria sessão sem contar tokens à mão. A tool lê os logs locais do Claude Code,
soma os tokens reais por modelo e devolve uma **faixa de estimativa**
(mín/central/máx), nunca uma medição.

## 3. O que a tool PODE fazer

- Ler arquivos `.jsonl` de sessão dentro de `<config do Claude Code>/projects/<projeto>/`.
- Extrair apenas `message.usage` (4 contadores de tokens) e `message.model`.
- Devolver contagens de tokens e a faixa calculada de energia, água e carbono.

## 4. O que a tool NÃO pode fazer (e onde está a trava)

| # | Ela não pode | Trava no código | Como verificar |
|---|---|---|---|
| 1 | Escrever, alterar ou apagar qualquer arquivo | Só `readFile`, `readdir` e `stat` são importados em `src/session/claudeCodeLogs.ts:1`; nenhuma função de escrita existe em `src/` | `grep -rnE "writeFile\|appendFile\|unlink\|rm\(" src` não retorna nada |
| 2 | Acessar a rede | Nenhum `fetch`, `http` ou `net` em `src/` | `grep -rnE "fetch\|http\|net" src` |
| 3 | Executar comandos do sistema | Nenhum `child_process` ou `exec` em `src/` | `grep -rn "child_process\|exec" src` |
| 4 | Ler arquivos fora de `<config>/projects/` | `assertWithinBase` em `claudeCodeLogs.ts:57` é aplicado ao diretório do projeto (`:71`), ao arquivo de `session_id` (`:96`) e a cada arquivo lido (`:156`) | Teste "session_id com tentativa de path traversal" em `tests/claudeCodeLogs.test.ts:69` |
| 5 | Ler um arquivo escolhido pelo chamador | `project_path` é convertido por `encodeProjectPath` em um nome de pasta com traços (`:51`), não usado como caminho. `session_id` passa por `path.basename` (`:94`) e só vale se estiver na lista de `.jsonl` que `readdir` encontrou (`:97`) | Mesmo teste de traversal |
| 6 | Ler arquivos que não sejam `.jsonl` | `listSessionFiles` filtra por extensão (`:78`) | Leitura do código |
| 7 | Devolver o conteúdo de mensagens, código ou prompts do usuário | O tipo `RawLogLine` (`:124`) só declara `usage` e `model`; o acumulador só soma esses campos | Leitura do código. **Sem teste que prove**: a fixture só tem `"content":"ola"` numa linha de usuário e nenhum teste confere que texto de mensagem não aparece na saída (lacuna 4) |
| 8 | Aceitar `region` ou `cooling_system` arbitrários | Enums Zod em `src/types/index.ts:7` e `:15` | `tests/types.test.ts` (rejeição de valores inválidos e mensagem de erro sem eco do valor enviado) |
| 9 | Aceitar `since` que não seja data | `z.string().datetime().or(z.string().date())` em `src/types/index.ts:65` | `tests/types.test.ts` (`since` inválido rejeitado, data válida aceita) |
| 10 | Ser alterada ou ampliada pelo próprio assistente | Todas as travas estão no código TypeScript, não em instruções ao modelo. O assistente só escolhe valores dentro dos parâmetros acima | Leitura do código |

## 5. Lacunas conhecidas

> **Status após o red team (ver `LOG-INJECTION-TEMPLATE.md`):** as lacunas 2,
> 3 (campos de texto) e 5 foram corrigidas e têm teste; a 4 foi coberta em
> `tests/types.test.ts` e `tests/claudeCodeLogs.test.ts`. Seguem abertas a 1
> (risco aceito) e o tamanho do arquivo de log na lacuna 3. Os textos abaixo
> descrevem o estado **antes** da correção; as linhas 7 a 9 da tabela da
> seção 4 também ganharam testes depois disso.

1. **Leitura de logs de outros projetos.** `project_path` aceita qualquer
   caminho. A tool não verifica que ele é o projeto atual: um assistente
   enganado pode pedir os números de outro projeto do mesmo usuário. Só vaza
   contagem de tokens, não conteúdo.
2. **Texto livre devolvido na saída.** O nome do modelo vem do log e é usado
   como chave do relatório; em `calculate_ecological_footprint`, `model` é
   `z.string()` sem limite e volta em `premissas.modelo_informado`. Um texto
   com instrução embutida chegaria de volta ao assistente (risco de
   *output handling* / injeção indireta).
3. **Sem limite de tamanho.** `session_id`, `project_path` e `model` não têm
   `.max()`, e `readFile` carrega o arquivo `.jsonl` inteiro na memória.
   Entrada gigante ou log gigante pode travar o servidor.
4. **Testes ausentes.** Só `session_id` tem teste de path traversal. Faltam
   testes para `project_path` hostil, para valores inválidos de `region`,
   `cooling_system` e `since`, e para provar que o texto das mensagens não
   aparece na saída.
5. **Mensagem de erro genérica.** `String(error)` em `analyzeSession.ts:114`
   pode expor caminhos do sistema em erros inesperados.

## 6. Fora do escopo (decidido não implementar)

- Qualquer tool de escrita, exclusão ou exportação de arquivos.
- Leitura do conteúdo das conversas, mesmo que o usuário peça.
- Envio de dados a serviços externos (telemetria, APIs).
- Valores exatos: toda saída continua sendo faixa de estimativa com nota de
  transparência.
