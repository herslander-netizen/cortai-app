# Auditoria da CortAI (somente leitura) e proposta em fases

Nada foi alterado nem publicado. Abaixo está o que já existe e uma proposta de implementação para você aprovar depois.

## 1. Onde já existe IA

- **Núcleo único ("cérebro")**, em `src/lib/brain/`:
  - `gateway.server.ts`: fala com o Lovable AI Gateway (modelo `openai/gpt-6-astra`, Responses API, streaming, chave `LOVABLE_API_KEY` apenas no servidor).
  - `agente.server.ts`: `pensarCortai`, onde o modelo só escolhe ações.
  - `acoes.server.ts`: catálogo de ações e permissões por papel (`acaoPermitida`).
  - `guardas.ts`: barreiras de segurança.
  - `uso.server.ts`: cota, registro em `acoes_de_ia_log`, e pausa/retomada da IA (`ia_pausada_em`) quando o gateway responde 402/403.
- **Legado em paralelo, ainda no código:**
  - `src/lib/ia/assistente.server.ts` e `src/lib/whatsapp/atendimento.server.ts`, que a própria função marca como `@deprecated`. Os dois também leem `LOVABLE_API_KEY`.
  - `src/lib/whatsapp/transcricao.server.ts`: transcrição de áudio pronta, mas não ligada ao fluxo. A regra atual é pedir texto ao cliente.
- **Gemini/OpenAI direto:** não existe. Tudo passa pelo gateway da Lovable.

## 2. Pontos de chat no servidor

- `src/lib/assistente.functions.ts`:
  - `getConversaDoAssistente`: carrega a conversa.
  - `perguntarAoCortai`: chama `pensarCortai`.
  - `confirmarAcaoDaIa`: só executa uma ação depois da confirmação.
  - `interpretarServicos` e `interpretarHorarios`: usados no onboarding.
- `src/lib/brain/secretaria-publica.functions.ts`: `perguntarSecretariaPublica`, usada pelo chat público de agendamento. O nome ainda carrega "Secretária".
- `src/lib/whatsapp/fluxo.server.ts`, por volta da linha 837: o WhatsApp chama o mesmo `pensarCortai`.

## 3. Telas que já conversam com a IA

- `components/ia/AssistenteCortai.tsx`: folha de chat do painel. Abre por:
  - `BotaoAssistente`, montado só em `/barbeiro/mais`;
  - `FabCortai`, a bolha flutuante. **Ela existe, mas não está montada em nenhuma tela.**
- `components/ia/FolhaCortai.tsx`, `Digitando.tsx` e `IconeDaIA.tsx`: peças de interface já prontas.
- Chat público: `components/agendamento/AgendamentoChat.tsx` e `chat/useConversaAgendamento.ts`.
- Onboarding: `EditorDeServicos.tsx` e `EditorDeHorarios.tsx`.
- `src/routes/barbeiro.cortai.tsx` é a tela de conexão do WhatsApp, não um chat.

## 4. Estado e persistência da ativação (o que existe hoje)

| Controle | Onde fica | O que faz hoje |
| --- | --- | --- |
| `config_atendimento_ia.responder_whatsapp` | por negócio | resposta automática no WhatsApp |
| `config_atendimento_ia.ia_pausada_em` / `ia_pausa_motivo` | por negócio | pausa automática por falta de crédito |
| `config_atendimento_ia.ia_limite_diario_whatsapp` | por negócio | cota diária do WhatsApp |
| `ia_ativa` e `modo_humano` | por conversa | liga/desliga a IA naquela conversa |
| `tenants.notificacoes_whatsapp_ativas` | por negócio | avisos, não IA |
| `recursos_de_plano` | por plano | libera recursos conforme o plano contratado |

**Lacuna:** não confirmei nenhum interruptor único "CortAI ligada/desligada" por negócio que valha para painel, site e WhatsApp ao mesmo tempo.

## 5. Botão "CortAI" no topo e ícone de chat: forma segura

- **Interruptor geral (só dono ou permissão de gestão):**
  - Grava um campo novo por negócio, por exemplo `config_atendimento_ia.cortai_ativa boolean DEFAULT true`. A mudança é só de acréscimo, sem apagar nada.
  - Uma função no servidor faz a gravação e confere a permissão do usuário.
  - A verificação acontece **dentro do cérebro**, em `bloqueioDeUso`/`pensarCortai`. Assim valem os três canais, e não só o botão na tela.
  - Desligado, o WhatsApp volta às regras fixas: 1/2/3, avisos e templates. Agenda, comandas e notificações continuam iguais.
- **Ícone separado do chat:**
  - Reaproveita o `FabCortai`/`AssistenteCortai`, levado para o cabeçalho com `IconeDaIA`, sem criar um segundo chat.
  - Fica oculto ou desativado quando a CortAI estiver desligada, pausada ou fora do plano.
  - Respeita as regras de ações rápidas do cabeçalho (só em rotas permitidas) e a camada do painel Ajustes.
- **Riscos a evitar:**
  - Interruptor só na tela, sem conferência no servidor.
  - Duplicar o controle de pausa por crédito: o interruptor manual precisa ficar separado da pausa automática.
  - Um profissional sem permissão conseguir desligar a CortAI do negócio.
  - O "⚡" competir com o FAB da Agenda.

## 6. Relação com WhatsApp, Evolution e automações

- Mensagem recebida pela Evolution → webhook → `fluxo.server.ts` → regras fixas primeiro (números e avisos pendentes) → só depois `pensarCortai`, se `responder_whatsapp` e a conversa permitirem.
- Lembretes e avisos nascem de eventos reais e não dependem da IA.
- O interruptor geral deve entrar no mesmo ponto em que já se verifica `responder_whatsapp`.

## 7. Integração externa "ALVO IA"

- Está referenciada, mas é legado desativado:
  - `src/lib/ia/alvo-ia.server.ts` (`@deprecated`): só funciona se existirem `ALVO_IA_BASE_URL` e `ALVO_IA_API_KEY`;
  - `src/routes/api/public/alvo-ia.ts`: responde 503 sem `ALVO_IA_WEBHOOK_SECRET`;
  - `src/routes/api/public/ai/$.ts` e `src/routes/api/public/cortai/acoes.ts`: API REST por token `cortai_…`;
  - `src/lib/ia/ponte.server.ts` e `src/lib/ia/eventos.server.ts`, este último ainda chamado em `barbeiro.functions.ts:1293`.
- Não há outro projeto Lovable ligado. O cérebro novo nunca chama a ALVO IA.

## 8. O que falta para conversar de fato

1. Confirmar que `LOVABLE_API_KEY` existe e que há crédito, com um teste real de `perguntarAoCortai`.
2. Montar o ponto de entrada no painel: hoje o chat só abre pelo item em `/barbeiro/mais`.
3. Criar o interruptor geral e aplicá-lo no cérebro.
4. Mostrar na tela os estados "pausada por crédito", "desligada" e "fora do plano".
5. Opcional: renomear `secretaria-publica` e retirar o legado da ALVO IA quando for seguro.

## Fases recomendadas

1. **Verificação (sem código):** teste real do gateway e do chat atual com um usuário dono.
2. **Ponto de entrada:** ícone de chat no cabeçalho reaproveitando `FabCortai`/`AssistenteCortai`, com papéis e rotas permitidas respeitados.
3. **Interruptor geral:** migration só de acréscimo (`cortai_ativa`), função protegida, verificação no cérebro, botão "⚡ CortAI" no topo para o dono e testes cobrindo os três canais.
4. **Estados e consumo:** selo de pausada/desligada/limite e ligação com o painel Admin por negócio.
5. **Limpeza (com autorização à parte):** nomenclatura "Secretária" e legado da ALVO IA, sem DROP.

Nenhuma fase publica automaticamente.
