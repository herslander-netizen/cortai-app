# Conversação do Flow — o que já temos e o que podemos usar para melhorar

**Data:** 05/11/2026 · **Autor:** Claude · **Pedido do dono:** "Vamos aprimorar a conversação do Flow, pesquisa e traga
tudo que podemos usar para isso".
**Base:** código da branch oficial em 05/11, `docs/flow-bot-no-flow-analise.md` (31/10),
`docs/fluxo-cooperativo-flow-bot-flow-ia.md` (04/11), `docs/conversa-padrao.md`, a Evolution no Railway conferida hoje
e pesquisa externa (fontes no fim).
**Estado:** análise. Nada implementado. Complementa a análise de 31/10 sem repetir o que ela já cobre.

---

## Resumo

1. **Boa parte da análise de 31/10 já virou código:** leitura do `fromMe`, modo humano com prazo
   (`modo_humano_ate`), modo sombra, rastro de decisão, no máximo 3 mensagens e texto de reserva verdadeiro.
2. **Achado principal: existe um motor de agendamento por conversa pronto e parado.** `src/lib/whatsapp/motor/`
   (estados de escolher serviço, profissional, dia, horário, confirmar, remarcar e cancelar, com 532 linhas de
   vocabulário e testes) não é chamado por nenhum código de produção. Hoje o Flow Bot só manda o link para agendar.
   Ligar esse motor é o maior salto de qualidade possível e não precisa de IA.
3. **O agendamento do chat da página pública roda no navegador** (`useConversaAgendamento.ts`). Para o WhatsApp, a
   mesma sequência precisa existir no servidor. Unir os dois numa regra só evita dois jeitos de agendar.
4. **Na Evolution não há botões nem listas confiáveis.** A pesquisa indica que, na conexão por QR (Baileys), botões e
   listas não são suportados e um usuário relatou que a v2.3.7 (a nossa) os quebrou. O Flow já faz certo: na
   Evolution usa opções numeradas. Alternativa que funciona: **enquete** (`sendPoll`).
5. **Falta parecer gente:** o Flow não manda "digitando…" nem marca como lida. A Evolution tem as duas coisas.
6. **Falta juntar mensagens picadas.** O cliente escreve "oi" / "queria marcar" / "amanhã" em três mensagens e cada
   uma é tratada sozinha. Uma espera curta (3 a 5 s) antes de responder resolve. O Redis da Evolution já está no ar,
   mas o Flow roda no Cloudflare; a espera deve usar o que o Flow já tem.
7. **Formas de pagamento e próximo horário livre ficam vazios** na resposta do Bot (`realidade.ts`). As condições do
   modelo evitam texto quebrado, mas o cliente não recebe a informação.
8. **Regra de mercado:** em 2026 a Meta proíbe IA de uso geral na API oficial; bot do próprio negócio é permitido. E a
   Meta anunciou cobrança também das mensagens de atendimento (antes grátis) — confirmar valores antes de escolher
   o canal oficial.
9. **Padrão técnico recomendado** (pesquisa): estado da conversa no código, IA só para entender e escrever. É o
   desenho que o Flow já tem (Bot determinístico + Flow IA). Avaliar conversas pelo **estado final** (agendou certo?),
   não só pelo texto.

---

## 1. O que já temos (05/11)

| Peça | Onde | Estado |
|---|---|---|
| Ordem de quem responde (avisos → Bot → Flow IA → reserva) | `whatsapp/fluxo.server.ts` | Em uso |
| Flow Bot (regras sem IA), modo sombra/ligado, rastro | `src/lib/flow-bot/*`, modelo `modelos/atendimento.json` | Em uso na prévia (sombra) |
| Pessoa assumiu pelo celular (`fromMe`) e pausa com prazo | `flow-bot/decisao.ts`, `humano.server.ts` | Em uso |
| Entendimento sem IA (12 intenções, datas, períodos, apelidos) | `src/lib/conversa/entender.ts` | Em uso |
| Textos por situação, editáveis por negócio | `whatsapp/conversa-padrao.ts`, `docs/conversa-padrao.md` | Em uso |
| Opções numeradas 1/2/3 com sentido fixo | `whatsapp/opcoes-numeradas.ts` | Em uso |
| Porteiro e ritmo contra bloqueio | `whatsapp/porteiro.ts`, `ritmo.ts` | Em uso |
| Botões interativos | `gateway.server.ts` `enviarInterativo` | Só na API oficial; Evolution recebe números |
| Áudio vira texto | `whatsapp/transcricao.server.ts` | Opcional (custo) |
| **Motor de agendamento por conversa** | `src/lib/whatsapp/motor/` (`estado.ts`, `intencoes.ts`, `vocabulario.ts`, `entendimento-whatsapp.ts`) | **Pronto, com testes, sem uso** |
| Agendamento por conversa na página pública | `components/agendamento/chat/useConversaAgendamento.ts` | Em uso, no navegador |
| Memória do cliente ("o de sempre") | `useMemoriaDaConversa.ts` | Só na página pública |
| Flow IA agenda pela conversa | `src/lib/brain/acoes.server.ts` | Em uso quando a IA está ligada (custo por mensagem) |

## 2. O que podemos usar — por prioridade

### P0 — melhora direta da conversa, sem custo novo

1. **Agendar dentro da conversa sem IA.** Ligar o motor de `whatsapp/motor/` depois do Flow Bot e antes da Flow IA,
   com as fontes únicas de sempre: `disponibilidade.ts` para horários, `validarAgendamento` e `criar_agendamento` para
   gravar. O estado já é pensado para `conversas_whatsapp.contexto` (sem tabela nova) e expira em 2 h. Ganho: o
   cliente marca sem sair do WhatsApp e sem custo de IA.
   - Seguir a Conversa Padrão: uma pergunta por vez, oferecer 3 horários concretos, repetir tudo antes de confirmar
     (serviço, profissional, dia da semana, data, hora, valor) e só gravar depois do "sim".
   - Aproveitar o que o cliente já disse ("amanhã de tarde com o Zé") e perguntar só o que falta.
2. **Uma regra só para o agendamento por conversa.** Levar a sequência do chat público (`useConversaAgendamento.ts`)
   e a do WhatsApp para a mesma função pura em `src/lib`, usada pelos dois canais. Evita a armadilha "regra reescrita
   na tela".
3. **"Digitando…" e marcar como lida** na Evolution (`chat/sendPresence` com `composing`, e marcar como lida), com
   tempo proporcional ao texto. Pequeno, barato, e deixa a conversa mais natural.
4. **Juntar mensagens picadas.** Esperar 3 a 5 s de silêncio antes de responder e tratar tudo junto. Se chegar
   mensagem nova durante a espera, a resposta pendente é cancelada (recurso que o AutoResponder já tem e a análise de
   31/10 listou).
5. **Preencher o que está vazio no Bot:** próximo horário livre (pela `disponibilidade.ts`) e formas de pagamento
   (dado do negócio; hoje o Flow não guarda — decisão sobre onde guardar).
6. **"O de sempre" no WhatsApp.** Levar a memória do cliente do chat público para o WhatsApp: "Oi, João! Quer o de
   sempre (corte com o Zé)?".

### P1 — opções mais ricas

7. **Enquete no lugar de botões na Evolution** (`message/sendPoll`): o cliente toca em vez de digitar o número. Testar
   antes no número de teste; manter os números como reserva sempre.
8. **Reação com emoji** (`message/sendReaction`, ex.: 👍 no "obrigado") em vez de mais uma mensagem — menos texto,
   menos risco de rajada.
9. **Lembretes com mais utilidade:** a pesquisa sugere 24 h e 2 h antes, com endereço e estacionamento. O Flow já
   tem lembretes; vale conferir se o de 2 h e o endereço entram.

### P2 — canal oficial e avaliação

10. **WhatsApp Flows (só API oficial):** formulário dentro do WhatsApp para escolher serviço, dia e horário, com o
    servidor do Flow respondendo os horários livres a cada tela. A Meta tem exemplo pronto de "marcar horário".
    Exige chave de criptografia e endpoint próprio. Só vale se o dono escolher a API oficial.
11. **Avaliação por estado final.** Os testes de conversa (cenários do Bot) devem conferir o que ficou gravado:
    serviço certo, horário livre de verdade, confirmação só depois do "sim". É o método recomendado pela pesquisa
    (SAGE, 2026) e combina com os "testes de ouro" de 31/10.

## 3. Riscos e cuidados

| Risco | Cuidado |
|---|---|
| Bloqueio do número (Evolution não oficial) | Só responder quem escreveu; porteiro e ritmo; "digitando…" e espera ajudam a não parecer rajada |
| Botões quebrados na v2.3.7 | Não depender deles; números sempre; enquete só depois de testar |
| Dois jeitos de agendar | Uma função só para chat público e WhatsApp (P0.2) |
| IA respondendo de verdade no modo sombra | Já registrado em 05/11: ao ligar telefone na `flow-bot-teste`, a Flow IA do negócio de demonstração responde |
| Custo da API oficial | A Meta anunciou cobrança das mensagens de atendimento; confirmar valores em reais antes de decidir |

## 4. Decisões do dono

1. **Agendar dentro do WhatsApp sem IA (P0.1):** ligar o motor parado? (Recomendado.)
2. **Onde guardar formas de pagamento** do negócio para o Bot responder.
3. **Enquete na Evolution:** testar no número de teste?
4. **API oficial da Meta:** seguir só com Evolution por enquanto, ou avaliar o canal oficial (Flows, botões, custo).

## Fontes externas

- Botões e listas na conexão por QR e enquete como alternativa: [manual do pacote evolution (CRAN)](https://cran.r-project.org/web/packages/evolution/refman/evolution.html),
  [NEWS do pacote](https://strategicprojects.r-universe.dev/evolution/NEWS.txt).
- Botões e listas quebrados na v2.3.7 (relato de um usuário): [issue #2390](https://github.com/evolution-foundation/evolution-api/issues/2390).
- Rotas de enquete, reação e "digitando…" (SDK não oficial): [evolution-api-sdk — rotas](https://app.unpkg.com/evolution-api-sdk@0.6.23/files/lib/api/routes.d.ts).
- Juntar mensagens antes de responder: [n8n-nodes-message-debounce](https://github.com/uaiautomacao/n8n-nodes-message-debounce),
  [webhooks da Evolution v2](https://doc.evolution-api.com/v2/pt/configuration/webhooks.md).
- WhatsApp Flows (oficial): [Meta — endpoint de Flows](https://developers.facebook.com/docs/whatsapp/flows/guides/implementingyourflowendpoint).
- Preço da API oficial: [Meta — preços](https://developers.facebook.com/docs/whatsapp/pricing),
  [Zenvia — novas regras de cobrança](https://support.zenvia.com/kb/en/article/600343/preguntas-frecuentes-nuevas-reglas-de-cobro-de-whatsapp-business).
- Boas práticas de conversa para salões (blogs de fornecedores; números de resultado não verificados):
  [MioSalon](https://blog.miosalon.com/how-to-use-business-whatsapp-to-grow-your-salon-and-spa/),
  [Thikaa](https://thikaa.com/blog/appointment-booking-whatsapp-bot?lang=en),
  [Aurora Inbox (pt)](https://www.aurorainbox.com/pt/2026/05/03/sistema-de-agendamento-via-whatsapp-para-barbearias-e-saloes-de-beleza/).
- Estado no código e IA só para linguagem: [Google CXAS — slot filling](https://cdn.jsdelivr.net/gh/GoogleCloudPlatform/cxas-scrapi@main/docs/patterns/slot-filling.md);
  avaliação pelo estado: [SAGE (2026)](https://arxiv.org/pdf/2609.00434).
- Mercado no Brasil (vagas pedindo recepcionista por IA integrada à Trinks; sem recurso nativo confirmado):
  [Workana](https://www.workana.com/job/automatizacao-de-atendimento-whatsapp-com-ia-e-agendamento-trinks).
