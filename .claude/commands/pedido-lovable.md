---
description: Transforma uma ideia em um pedido pronto para colar no Lovable, já com as regras do projeto
argument-hint: "[o que você quer mudar ou criar]"
---

Escreva um pedido para o agente do Lovable sobre: **$ARGUMENTS**

O Lovable cobra créditos por mensagem, então o pedido precisa ser preciso, curto e seguro. **Não envie nada ao Lovable** (nem pelo `send_message`): só entregue o texto para o dono colar.

## Passos

1. **Entenda no código** antes de escrever: ache os arquivos reais envolvidos (`grep` e `docs/mapa-do-codigo.md`) e cite os caminhos no pedido. Veja se já existe algo parecido (`grep`, `.lovable/plan/`, `roadmap.md`) para não pedir duas vezes.
2. **Confira conflito com as regras do projeto** (`CLAUDE.md`, `AGENTS.md`, Knowledge do Lovable via `mcp__Lovable__get_project_knowledge`). Regra do dono: se a ideia contradiz uma regra existente, aponte o conflito **antes** do pedido e pergunte como seguir.
3. **Divida se for grande:** uma etapa por vez, com parada ao fim de cada uma. Entregue só o pedido da primeira etapa e liste as próximas.
4. **Se o assunto for banco ou permissão**, prefira `/migracao`: eu mesmo escrevo e ensaio, sem gastar créditos.

## Formato do pedido (um bloco de código, em português)

```
<TÍTULO CURTO — tipo da mudança (cirúrgica / nova função / correção de segurança)>

Contexto: <1 a 3 frases: onde está e por que muda; arquivos reais>
Problema ou objetivo: <o que acontece hoje e o que deve acontecer>

O que fazer:
1. <passo concreto, com arquivo>
2. ...

Não fazer: <o que não pode mudar, ex.: não redesenhar, não mexer em outras telas>

Regras: preservar o que funciona; correção cirúrgica; sem DROP nem apagar dados; papéis neutros (negócio, dono, profissional, cliente); termos de segmento só na tela; usar só os tokens e componentes do contrato de design; motor oficial de agenda como única fonte de verdade; nunca confirmar pagamento sem a função oficial.
Validar: tipos, lint dos arquivos tocados, testes e build; telas em 390px e 1280px. Não publicar. Me mostre o resultado antes.
```

Adapte as "Regras" e a "Validar" ao pedido (tire o que não se aplica, por exemplo as telas se não houver tela).

## Resposta

- O bloco com o pedido.
- Duas linhas: o que pode dar errado e como conferir depois (por exemplo, rodar `/revisar-regras` no commit que o Lovable fizer).
