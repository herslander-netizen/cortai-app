# Flow Bot dentro do Flow — skills, aprendizados e aprimoramentos

**Data:** 31/10/2026 · **Autor:** Claude · **Pedido do dono:** "análise aprofundada de skills, tudo que você pode obter
de aprendizado, sugestões e aprimoramentos que possam agregar a essa ideia agora".
**Base:** decisões do dono de 31/10 no `DIARIO.md` (bot dentro do Flow; IA só entre o dono e o sistema),
`docs/motor-respostas-flow-ia-especificacao.md` (30/10), o repositório `flow-bot`, o código do WhatsApp do Flow, o banco
`cortai-prod` (só leitura, números agregados) e pesquisa externa (fontes no fim).
**Estado:** análise. Nada implementado, nenhuma migração criada.

---

## Resumo — o que mais importa

1. **Ainda não existe conversa real para aprender.** O WhatsApp do Flow nunca rodou em produção: 0 conexões, 0
   mensagens e nenhum negócio com resposta automática ligada. Hoje são 3 negócios (2 barbearias, 1 salão), com cerca de
   30 agendamentos nos últimos 30 dias. É o momento de desenhar certo antes do primeiro cliente e começar com um
   **piloto em modo sombra**.
2. **Um motor só.** A especificação "Respostas da Flow IA" (30/10) já define as camadas de **regras** (L1) e
   **conhecimento** (L2) no estilo AutoResponder. O Flow Bot embutido é a implementação dessas camadas. Não criar a
   tabela `regras_de_resposta` da especificação **e** o armazenamento do Flow Bot: são o mesmo recurso.
3. **Reaproveitar o que o Flow já tem**:
   - textos por situação (`conversa-padrao.ts`);
   - entendimento de datas, períodos e apelidos (`conversa/entender.ts`);
   - números fixos 1/2/3 (`opcoes-numeradas.ts`);
   - porteiro e ritmo contra bloqueio;
   - modo humano;
   - Central de automação;
   - motor de horários.
4. **O bot precisa saber quando uma pessoa assumiu a conversa.** Hoje o Flow ignora a mensagem que o próprio negócio
   manda pelo celular (`evolution.ts:125`, `fromMe` ignorado) e o `modo_humano` liga mas nunca desliga. É a falha mais
   comum de robô: falar por cima do dono.
5. **Antes de ligar para qualquer cliente**, o bot precisa de três coisas:
   - **modo sombra**: o bot decide, mas não envia;
   - **rastro de decisão**: qual regra respondeu e por quê;
   - **testes de ouro por negócio**: conversas de exemplo que precisam continuar respondendo igual.
6. **Ordem fixa de quem responde no WhatsApp:** o bot entra **depois** das respostas a avisos (1/2/3, SAIR, VOLTAR,
   códigos) e **antes** da Flow IA. Equipe e conversa em modo humano não passam pelo bot.
7. **Parecer humano sem enganar:** "digitando…" proporcional ao texto, marcar como lida, atraso sorteado, no máximo 3
   mensagens por resposta e cancelar respostas pendentes quando o cliente escreve de novo.
8. **Regras do WhatsApp em 2026:** desde 15/01/2026 a Meta proíbe assistentes de IA de uso geral na API Business; bots
   com função do próprio negócio continuam permitidos. O Flow Bot (determinístico, só sobre o negócio) está do lado
   permitido. A Evolution é não oficial: há risco de bloqueio do número, menor quando o bot só responde quem escreveu.
9. **Diferencial de mercado:** os concorrentes pesquisados (Trinks, AppBarber, Booksy) vendem link de agendamento e
   lembretes; não encontrei, nas fontes pesquisadas, bot de WhatsApp que agende direto na agenda do negócio. O Flow
   tem agenda e WhatsApp no mesmo sistema, e o bot roda sem custo de IA por mensagem.
10. **Skills do Claude:** não há skill pronta de chatbot nem de WhatsApp no catálogo. A sugestão é criar 4 skills do
    projeto para o fluxo "o profissional avisa o dono, o dono manda para o Claude, o Claude corrige" (decisão de 31/10).
11. **Texto de reserva enganoso:** quando a IA não está ligada, a mensagem livre recebe "Recebi sua mensagem! Estou com
    instabilidade agora…" (`fluxo.server.ts`, depois de `responderComCerebro`). Não é instabilidade; precisa de texto
    verdadeiro. Nunca chegou a ser enviado, porque o WhatsApp ainda não rodou.
12. **Seis decisões do dono** estão listadas na seção 8. Nenhuma trava o começo.

---

## 1. Fatos levantados

| Fato | Evidência | Consequência |
|---|---|---|
| WhatsApp nunca usado em produção | `cortai-prod` em 31/10: `mensagens_whatsapp` = 0, `conexoes_whatsapp` = 0, `config_atendimento_ia.responder_whatsapp` ligado em 0 de 2 | Sem dados reais; alimentar com modelos por segmento e com conversas exportadas pelo dono (seção 2) |
| 3 negócios: 2 barbearias e 1 salão, cerca de 30 agendamentos em 30 dias | `tenants`, `agendamentos` (agregados) | Piloto pequeno; modelos prontos primeiro para barbearia e salão |
| A especificação de 30/10 já define regras e conhecimento | `docs/motor-respostas-flow-ia-especificacao.md` §2 e §3 | O Flow Bot implementa L1 e L2; uma migração só |
| Textos por situação, sobrescrever e desligar por negócio | `src/lib/whatsapp/conversa-padrao.ts` (`SITUACOES`, `textos_conversa`, `situacoes_desligadas`) | Base dos modelos prontos e das variáveis `{{}}` |
| Entendimento sem IA (12 intenções, períodos do dia, apelidos) | `src/lib/conversa/entender.ts` (`Intencao`: agendar, servicos, funcionamento, endereco, pagamento, profissionais, menu, atendente…) | O bot usa isso para "amanhã de tarde com o Zé", sem reinventar |
| Números com sentido fixo (1 Confirmar, 2 Remarcar, 3 Cancelar) | `src/lib/whatsapp/opcoes-numeradas.ts` | O bot nunca pode responder a um número solto com aviso aberto |
| SAIR, VOLTAR e "número errado" tratados na resposta a aviso | `src/lib/whatsapp/lembretes.server.ts:71-115` | Ficam antes do bot |
| Mensagem do próprio negócio pelo celular é ignorada | `src/routes/api/public/whatsapp/evolution.ts:125` (`fromMe` → ignorada) | O sistema não sabe quando uma pessoa assumiu |
| `modo_humano` só liga | `fluxo.server.ts:662`, `:968` (liga); nenhum lugar desliga | Conversa fica "humana" para sempre; precisa de prazo |
| Flow IA respeita modo humano e o interruptor `responder_whatsapp` | `fluxo.server.ts:897-899` | O bot segue as mesmas travas |
| Ritmo contra bloqueio e porteiro já existem | `whatsapp/ritmo.ts`, `whatsapp/porteiro.ts` | Toda resposta do bot passa por eles |
| Central de automação com estados independentes | `whatsapp/central-automacao.ts` | O liga/desliga do bot entra nela; nada de tela solta |
| Agendamento guarda a origem | `agendamentos.origem` (`whatsapp`, `link_publico`, `voz`, `manual`…) | Medir quantos horários o bot gerou |
| Flow Bot: 16 tipos de passo, motor puro, aprendizado anônimo e limpeza de 90 dias prontos | `flow-bot/packages/contracts/src/catalog.ts`, `runtime`, `docs/LEARNING.md` | O motor entra no Flow sem servidor próprio |
| Inventário do AutoResponder já levantado | `flow-bot/docs/REVERSE_ENGINEERING.md` | Base das melhorias da seção 5 (P2) |
| Áudio já vira texto | `whatsapp/transcricao.server.ts`, `CORTAI_STT_*` | O bot pode tratar áudio, mas a transcrição tem custo no provedor (decisão) |
| O Flow não usa "digitando…" nem "marcar como lida" | nenhuma chamada a `sendPresence` ou `markMessageAsRead` | Melhoria barata de naturalidade (Evolution v2 tem os dois) |

---

## 2. Skills do Claude para o fluxo "dono → Claude corrige"

### 2.1 O que existe hoje
- **Catálogo:** nenhuma skill de chatbot, WhatsApp ou automação de atendimento. A útil para o projeto é a
  **skill-creator**, que cria skills e mede o desempenho com avaliações.
- **Repositório:** 4 comandos em `.claude/commands/` (`/verificar`, `/migracao`, `/auditar`, `/revisar-regras`) e
  nenhuma skill.
- **GPT/Codex não lê skills do Claude.** Para as duas IAs trabalharem igual, cada skill segue um roteiro em
  `docs/roteiros/`, que os dois leem. A skill só diz ao Claude quando usar o roteiro.

### 2.2 Skills sugeridas (criar quando a base do bot existir)

| Skill | Quando usar | O que faz | Escreve no banco? |
|---|---|---|---|
| `diagnosticar-conversa` | "o bot respondeu errado para o cliente X" | Linha do tempo da conversa com o porquê de cada resposta (regra, versão, motivo), lida do rastro; reproduz no simulador; classifica a causa: regra do negócio, dado do sistema ou defeito do código | Não (só leitura) |
| `corrigir-bot` | Depois do diagnóstico | Se for regra: grava nova versão (a anterior fica guardada), roda os testes de ouro do negócio e relata. Se for código: corrige na branch com teste, como hoje | Sim; o pedido do dono vale como autorização daquela mudança (decisão de 31/10) |
| `alimentar-bot` | Ao ligar um negócio novo, ou quando o dono manda uma conversa exportada do WhatsApp (.txt) | Tira nomes e telefones, agrupa as perguntas mais comuns e propõe respostas e regras. O dono aprova antes de publicar | Só depois da aprovação |
| `saude-do-bot` | Toda semana, ou quando o dono pedir | Por negócio: respondidas, resolvidas sem pessoa, encaminhadas, perguntas sem resposta, horários gerados e sinais de risco de bloqueio. Sugere ações | Não |

### 2.3 Pré-requisitos para essas skills funcionarem
- **Rastro de decisão gravado** por mensagem: regra ou passo, versão publicada e motivo. O motor já devolve `passos`
  e `motivo`; falta guardar.
- **Simulador** como função do servidor, a mesma usada em produção: a skill reproduz o caso sem enviar nada.
- **Versões** de regras com "voltar para a anterior".
- **Testes de ouro por negócio:** cada correção vira um teste novo, para o erro não voltar.

### 2.4 Como medir as skills
- Com a skill-creator, montar avaliações a partir de casos simulados: conversa, regras, defeito e correção esperada.
- Medir se a skill acha a causa certa e não mexe no que não foi pedido.

---

## 3. Habilidades do bot (o que ele faz para o cliente)

Regra geral: **o bot não inicia conversa.** O que o Flow manda por iniciativa própria (lembrete, confirmação,
pós-atendimento, falta, vaga da lista de espera) continua nos avisos, com porteiro e janela de 24 h.

| Habilidade | Como responde | Reaproveita no Flow | Fase |
|---|---|---|---|
| Saudação (contato novo ou conhecido) | Texto da Conversa Padrão; com cliente conhecido, oferece "o de sempre" | `conversa-padrao.ts`, `conversa/memoria-cliente.ts` | A |
| Serviços e preços | Lista do catálogo com preço e duração | `servicos` (preço do banco) | A |
| Está aberto? Que horas fecha? | Horário do dia já com horário especial, intervalo e bloqueios | `horarios.ts`, `horarios-especiais.ts` | A |
| Endereço e pagamento | Dados do negócio | `conversa-padrao.ts` (`localizacao`, `pagamento`) | A |
| Tem horário amanhã de tarde? | Horários livres de verdade | `disponibilidade.ts` + `entender.ts` (períodos) | A |
| Agendar | **Não reimplementar:** entrega para o agendamento do Flow Chat, ou manda o link `/agendar` | `agenda-chat.functions.ts`, `agendamento-publico` | A (link), B (dentro da conversa) |
| Meu horário, remarcar, cancelar | Mesmas funções oficiais e números fixos | `lembretes.server.ts`, `confirmacao.server.ts`, `opcoes-numeradas.ts` | B |
| Lista de espera | Ponto único `ofertarVaga` | `fila-compatibilidade.ts` | B |
| Falar com a equipe | Liga o modo humano (com prazo) e avisa no sininho | `modo_humano`, avisos | A |
| Fora do horário | Mensagem própria e o próximo horário livre | horários e disponibilidade | A |
| Perguntas do negócio ("tem estacionamento?") | Respostas cadastradas | tabela do bot | B |
| Não entendeu | Menu de opções numeradas da Conversa Padrão (`nao_entendeu`) | `conversa-padrao.ts` | A |

---

## 4. Ordem de quem responde no WhatsApp (proposta)

Hoje, em `processarMensagemRecebida`, o bot entra entre a resposta a avisos e a Flow IA:

1. Mensagem repetida: descarta (já existe).
2. Áudio: vira texto se a transcrição estiver ligada (já existe).
3. "CODIGO 123456": confirmação de telefone (já existe).
4. Central ou número compartilhado (já existe).
5. Resposta a aviso: 1/2/3, SAIR, VOLTAR e número errado. Número solto nunca segue adiante (já existe).
6. Canal só de notificações (já existe).
7. **Novo:** conversa em modo humano dentro do prazo → silêncio (só registra).
8. **Novo:** equipe com telefone verificado → pula o bot e vai direto para a IA da equipe.
9. **Novo: Flow Bot** (regras e conhecimento), dentro do horário configurado.
10. Flow IA, se estiver ligada e com crédito (já existe).
11. Orientação fixa, **com texto verdadeiro** (hoje diz "instabilidade").

---

## 5. Aprimoramentos por prioridade

### P0 — antes de ligar para qualquer cliente
1. **Um motor só:**
   - o Flow Bot vira a camada L1/L2 da especificação;
   - uma migração (a 0055) com as tabelas do bot: versões publicadas, conversas em andamento, prazos, rastro, histórico
     de 90 dias e aprendizado anônimo;
   - aplicar só com autorização.
2. **Saber quando uma pessoa assumiu:**
   - passar a ler a mensagem `fromMe` da Evolution e separar o que o Flow enviou (identificador gravado no envio) do
     que alguém digitou no celular;
   - o que foi digitado pausa o bot naquela conversa por um prazo (decisão do dono, sugestão: 2 h);
   - o `modo_humano` ganha prazo para expirar e um botão "devolver ao bot".
3. **Modo sombra:** o bot decide e registra "o que teria respondido", sem enviar. O dono compara com as respostas reais
   antes de ligar.
4. **Rastro de decisão** por mensagem e **simulador** com a mesma função de produção.
5. **Testes de ouro por negócio,** rodados a cada versão publicada. Uma versão que quebra um teste não publica.
6. **Horário certo:**
   - o horário do bot é o do negócio no dia (com horário especial, intervalo e bloqueios), ou um horário próprio;
   - feriados entram como horário especial;
   - tudo sempre no fuso do negócio.
7. **Anti-loop:**
   - nunca responder grupo, status, lista de transmissão nem o próprio número;
   - detectar outro robô (rajada de mensagens iguais) e calar;
   - manter o limite de respostas por conversa que o motor já tem;
   - cancelar respostas pendentes quando chega mensagem nova (recurso do AutoResponder).
8. **Texto de reserva verdadeiro** no lugar de "instabilidade".
9. **Parecer humano sem enganar:**
   - "digitando…" proporcional ao tamanho do texto (Evolution `sendPresence` com `composing`);
   - marcar como lida (`markMessageAsRead`);
   - atraso sorteado (o motor já tem);
   - no máximo 3 partes por resposta.

### P1 — junto com a tela
10. **Tela no padrão Figaro dentro da Central de automação.** Não criar tela solta. Ela reúne:
    - liga e desliga;
    - horário de atendimento;
    - respostas cadastradas e regras;
    - modelos prontos;
    - simulador;
    - versões;
    - histórico de 90 dias.
11. **Modelos por segmento** gerados da Conversa Padrão com `termos(segmento)`: barbearia e salão primeiro.
12. **Perguntas sem resposta** (já previstas em `flow-bot/docs/LEARNING.md`), com resposta em um toque, e **painel no
    ADM** para o dono ver o bot de cada negócio.
13. **Métricas de valor para o negócio:**
    - quantas mensagens respondeu;
    - quantas resolveu sem pessoa;
    - quantas passou para a equipe;
    - **quantos horários gerou e quanto isso vale em R$** (pela origem do agendamento);
    - tempo de resposta.

    É o argumento de venda do recurso.

### P2 — depois do piloto
14. Recursos restantes do AutoResponder:
    - sub-regras;
    - condição "regra anterior acionada";
    - listas de contatos atendidos e ignorados;
    - probabilidade de disparo.
15. Áudio respondido pelo bot (depende da transcrição ligada, que tem custo).
16. **API oficial da Meta como segundo canal:** o bot é de função do negócio, então é permitido em 2026. Botões e
    listas só na API oficial; na Evolution, usar números.
17. **Bot em outros projetos:** três adaptadores (de onde vêm as mensagens, para onde vão as respostas, de onde vêm os
    dados), já descritos em `flow-bot/docs/INTEGRATION.md`.

---

## 6. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Bloqueio do número (Evolution não oficial) | O bot só responde quem escreveu; porteiro e ritmo; número dedicado; aquecer o número por 2 a 4 semanas; observar sinais (entregas sem confirmação, bloqueios). Monitor da Evolution já existe |
| Bot falar por cima do dono | Detecção de `fromMe` e modo humano com prazo (P0.2) |
| Resposta errada de preço ou horário | Só dados oficiais; testes de ouro; modo sombra no piloto |
| Conflito com avisos (o "1" depois do lembrete) | Ordem fixa da seção 4 e teste cobrindo |
| Dois motores de regras | Unificação da especificação com o Flow Bot (P0.1) |
| Privacidade (LGPD) | Histórico de 90 dias; aprendizado sem nome nem telefone; SAIR para tudo; nada de áudio guardado |
| Custo | Zero por mensagem (sem IA). A Evolution precisa de um servidor (decisão do dono). Transcrição de áudio é opcional |

---

## 7. Sequência sugerida

| Fase | Entrega | Depende do dono |
|---|---|---|
| A — Base | Motor dentro do Flow, entrada no WhatsApp na ordem da seção 4, rastro, modo sombra, horário, detecção de pessoa que assumiu, modo humano com prazo, texto de reserva verdadeiro, testes | Autorizar a migração 0055 |
| B — Configuração | Tela na Central de automação, modelos por segmento, simulador, versões, agendar dentro da conversa | Plano comercial |
| C — Aprendizado | Perguntas sem resposta, painel no ADM, métricas de valor | — |
| D — Skills do Claude | `diagnosticar-conversa`, `corrigir-bot`, `alimentar-bot`, `saude-do-bot` com roteiros em `docs/roteiros/` | — |
| Piloto | Um negócio em modo sombra; depois ligado | Hospedagem da Evolution, negócio piloto |

---

## 8. Decisões pendentes do dono

1. **Planos:** em quais o bot entra.
2. **Hospedagem da Evolution:** um servidor pequeno (estimativa: R$ 30 a 60 por mês).
3. **Mensagem livre sem regra:**
   - o código manda para a Flow IA, e o texto antigo do `CLAUDE.md` dizia Flow Chat;
   - sugestão: bot primeiro; sem regra, Flow IA se estiver ligada; senão, o menu de opções da Conversa Padrão.
4. **Pausa quando uma pessoa responde pelo celular:** quanto tempo (sugestão: 2 h, ou até o fim do expediente).
5. **Áudio no bot:** usar a transcrição, que tem custo por minuto no provedor configurado, ou pedir que o cliente
   escreva.
6. **Piloto:** qual negócio e quanto tempo em modo sombra (sugestão: um negócio seu, por 1 semana).

---

## Fontes externas
- Política do WhatsApp para bots em 2026: [respond.io — WhatsApp general-purpose chatbots ban](https://respond.io/blog/whatsapp-general-purpose-chatbots-ban),
  [respond.io — WhatsApp chatbot policy 2026](https://respond.io/blog/whatsapp-chatbot-policy-2026),
  [TechCrunch (18/10/2025)](https://techcrunch.com/2025/10/18/whatssapp-changes-its-terms-to-bar-general-purpose-chatbots-from-its-platform/?rand=324),
  [Business Standard](https://www.business-standard.com/technology/tech-news/meta-bans-ai-chatbots-from-whatsapp-business-api-chatgpt-to-shut-down-jan-2026-125102200335_1.html).
  São fontes de terceiros; o texto oficial dos termos da Meta não foi consultado.
- Evolution API v2: [Send Presence](https://doc.evolution-api.com/v2/api-reference/chat-controller/send-presence.md),
  [Mark as read](https://doc.evolution-api.com/v2/api-reference/chat-controller/mark-as-read.md).
- Risco de bloqueio em API não oficial: [Zylos — WhatsApp API and Automation 2026](https://zylos.ai/research/2026-01-26-whatsapp-api-automation),
  [guia de desenvolvedores](https://whatsapp.checkleaked.cc/de/blog/avoid-whatsapp-ban). São práticas relatadas, não
  documentação da Meta.
- Mercado: [Aurora Inbox — WhatsApp appointment system for barbershops and salons (2026)](https://www.aurorainbox.com/en/2026/05/03/whatsapp-appointment-system-for-barbershops-and-salons/),
  [AppBarber PRO (App Store)](https://apps.apple.com/app/id1602535418),
  [Comunidade ManyChat](https://community.manychat.com/perguntas-e-respostas-pt-61/automatizar-whatsapp-para-barbearia-6963).
