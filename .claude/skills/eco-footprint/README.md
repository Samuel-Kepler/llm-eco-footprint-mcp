# Skill eco-footprint

Orienta o Claude Code a estimar e explicar a pegada ecológica (água, energia e
CO2e) do uso de LLMs, chamando as ferramentas do servidor MCP `eco-footprint`
e apresentando sempre faixas de estimativa, nunca medições. Dispara quando
alguém pergunta sobre impacto ambiental, consumo de água, energia ou carbono.

Para usar em outro projeto: copie esta pasta para `.claude/skills/` do seu
projeto, registre o servidor MCP (veja o README da raiz do repositório) e
reinicie o Claude Code. Sem o servidor, a skill avisa em vez de calcular.

- `SKILL.md`: escolha da ferramenta, formato da resposta e regras essenciais.
- `reference.md`: regras detalhadas de interpretação e exemplo de resposta.
