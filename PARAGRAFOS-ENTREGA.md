# Parágrafos da entrega

## Para o dono do negócio

Demos ao assistente de IA uma ferramenta que lê o registro de uso do próprio
Claude Code e calcula quanta energia, água e carbono uma sessão de trabalho
gasta, sempre como uma faixa estimada e nunca como uma medida exata. Assim ele
responde "qual foi o impacto da minha sessão?" sem que ninguém precise contar
nada à mão. A ferramenta só lê números de uso (quanto texto foi processado e
por qual modelo): ela não vê o conteúdo das conversas nem do código, não altera
nem apaga arquivo nenhum, não acessa a internet e não executa comandos. Mesmo
que alguém esconda um texto tentando enganar o assistente para ele ignorar
essas regras, a ferramenta recusa entradas fora do formato esperado, porque a
trava está no código e não na boa vontade do assistente. Um limite que ainda
existe: ela consegue ler os números de uso de outros projetos do mesmo
computador, mas nunca o conteúdo deles.

## Qual risco ameaça mais o meu domínio

Dos três riscos vistos em sala, o que mais ameaça este projeto é o de
**tratamento de saída (output handling), que é a porta de entrada da injeção
de prompt indireta**. O server lê arquivos de log que ele não controla e
devolve parte do que leu ao assistente; no teste, um nome de modelo com uma
instrução embutida voltava intacto na resposta, e foi isso que precisei
corrigir. Quem escreve nesses logs não é o usuário que está olhando a tela,
então o texto malicioso chega ao assistente sem ninguém ver. A cadeia de
suprimentos (supply chain) é um risco real, mas aqui é menor e mais genérico:
o projeto tem só duas dependências de execução (o SDK do MCP e o Zod). A
injeção direta, por sua vez, é limitada porque as entradas da tool são
poucas e validadas. Esta é a minha avaliação a partir do que testei, e o red
team em dupla pode mostrar algo que eu não vi.
