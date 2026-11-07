# Agente Flow — compilação técnica dos frameworks e catálogo de funções

**Data:** 07/11/2026. **Estado:** primeira implementação em modo sombra, sem rota de entrada e sem ligação ao atendimento real.
**Repositório:** `herslander-netizen/cortai-app`; branch `cloudflare-workers-migration-2026-10-13`.
**Princípio:** **um cérebro, um catálogo de ações, um estado de negócio**. O agente deve orquestrar o Flow existente, não criar outro chatbot, outra agenda ou outro gateway WhatsApp.

## 1. Análise de código aberto: o que compilar e o que NÃO instalar

| Projeto público | Licença verificada | Capacidade a aproveitar no desenho | Limitação relevante ao Flow | Decisão |
|---|---|---|---|---|
| [LangGraph.js](https://github.com/langchain-ai/langgraphjs) | MIT | Estado de grafo, checkpoints, interrupção para aprovação (`interrupt`), retomada e rastros com IDs por conversa | Sem checkpointer persistido, não há retomada real; adaptador Postgres/Workers precisa ser testado | Referência **principal** do orquestrador; não adicionar dependência no MVP |
| [Cloudflare Agents SDK](https://github.com/cloudflare/agents) | MIT | `Agent`, Durable Objects SQLite, fila, `schedule`, `retry`, RPC e workflows | Nova fonte de estado e novos bindings/migrações de DO; consumo sujeito aos limites da conta | Referência para resiliência e execução; adiar adoção até medir |
| [Mastra](https://github.com/mastra-ai/mastra) | Core Apache-2.0; `ee/` sob licença empresarial | Workflows `step/branch/parallel`, pausa/retomada, memória e testes/observabilidade | Runtime e dependências adicionais; evitar importar `ee/` ou pressupor licença gratuita para esse código | Referência para contratos de etapas e observabilidade; não instalar |
| [OpenCode](https://github.com/anomalyco/opencode) | MIT | Sessões de trabalho, ferramentas tipadas, aprovação, plano vs execução, auditoria de código | É primordialmente um agente de programação, NÃO o atendente de WhatsApp; terminal e acesso ao código são perigosos para cliente | Usar para **desenvolvimento** do Flow, não como motor de atendimento |

Fontes oficiais lidas em 07/11/2026: repositórios e READMEs acima; [LangGraph persistence](https://github.com/langchain-ai/langgraphjs/blob/main/docs/docs/concepts/persistence.md); [LangGraph human-in-the-loop](https://github.com/langchain-ai/langgraphjs/blob/main/docs/docs/agents/human-in-the-loop.md); [Cloudflare Agents SDK](https://developers.cloudflare.com/agents/index.md); [Cloudflare Durable Objects e limites gratuitos](https://developers.cloudflare.com/durable-objects/platform/limits/); [Mastra LICENSE.md](https://github.com/mastra-ai/mastra/blob/main/LICENSE.md); [OpenCode SDK](https://docs.opencode.ai/docs/pt-br/sdk/).

**Não foi copiado código de nenhum desses repositórios.** A implementação usa exclusivamente padrões arquiteturais, e o único código de terceiro incorporado continua sendo o conjunto de dependências já instalado no Flow. Licença sem custo NÃO implica execução gratuita: Workers, Durable Objects, mensagens e modelos têm cotas ou cobranças próprias. Nenhum serviço novo foi contratado.

## 2. Inventário real das 24 ações oficiais

Fonte única: `src/lib/brain/acoes.server.ts` (`ACOES`, `acaoPermitida`). O agente **não** define políticas de autorização: respeita `tenantId`, identidade do telefone, papéis e permissões efetivas do catálogo.

### Leitura — 14

| Ação existente | O que fornece | Restrição importante |
|---|---|---|
| `listar_servicos` | Serviços, duração e preços cadastrados | Somente do negócio |
| `consultar_servico` | Detalhe de um serviço real | ID oficial |
| `listar_profissionais` | Equipe ativa | Somente do negócio |
| `consultar_horarios_funcionamento` | Expediente real | Fuso do negócio |
| `consultar_informacoes` | Endereço, pagamento, políticas | Registro real, sem inventar |
| `consultar_disponibilidade` | Vagas de fato disponíveis | Dia, serviço e profissional válidos |
| `buscar_cliente` | Ficha do cliente | No WhatsApp só telefone do próprio cliente |
| `buscar_cliente_por_nome` | Candidatos por nome | Apenas painel |
| `consultar_agendamentos_cliente` | Compromissos do cliente | Telefone próprio, sem dados de terceiros |
| `consultar_agendamento` | Detalhes de um compromisso | Checagem de titularidade |
| `consultar_movimento` | Indicadores do dia | Apenas painel/equipe autorizada |
| `consultar_caixa_hoje` | Movimentos financeiros | Apenas painel/dono |
| `minha_agenda` | Agenda da equipe | `canais: []`; não disponibilizar por suposição |
| `consultar_fila` | Lista de espera | `canais: []`; não disponibilizar por suposição |

### Escrita — 9

| Ação existente | Resultado pretendido | Barreira |
|---|---|---|
| `cadastrar_servicos` | Incluir serviço | Só painel, confirmação, permissões |
| `definir_horarios` | Ajustar funcionamento | Só painel, confirmação |
| `criar_cliente` | Registrar cliente | Identidade e confirmação |
| `atualizar_dados_cliente` | Atualizar cadastro | Próprio telefone/permissões, confirmação |
| `registrar_nota` | Observação na ficha | Apenas equipe/painel |
| `criar_agendamento` | Registrar horário | Disponibilidade oficial + SIM + verificação |
| `cancelar_agendamento` | Cancelar horário | Titularidade, prazo, confirmação |
| `reagendar_agendamento` | Remarcar horário | Titularidade, prazo, evitar dupla reserva |
| `avisar_atraso` | Notificar atraso | `canais: []`; envio real verificado antes de afirmar sucesso |

### Controle — 1

| Ação existente | Uso | Barreira |
|---|---|---|
| `encaminhar_humano` | Transferir para a equipe | Apenas WhatsApp; registrar prazo de retorno |

**Importante:** `canais: []` não significa público: significa que o catálogo não liberou a ação a canais. Não ampliar permissões durante criação do agente.

## 3. Capacidades necessárias do agente e situação atual

| # | Função que o Flow precisa | Hoje / fonte existente | Estado e prioridade |
|---|---|---|---|
| 01 | Receber Evolution e Meta | `routes/api/public/whatsapp/*` | Existe; preservar |
| 02 | Autenticar remetente, instância e negócio | `evolution.ts`, `identidade.server.ts` | Existe; preservar |
| 03 | Dedupe de entrada e idempotência | `mensagens_whatsapp`, inbox da Meta | Parcial; P18 Evolution |
| 04 | Persistir entrada antes de processar | Meta `whatsapp_webhook_events` | Falta equivalente durável Evolution |
| 05 | Juntar picadas e transcrições | `whatsapp/naturalidade.ts` | Existe; testar compartilhamento do histórico |
| 06 | Regras de SAIR, VOLTAR, avisos e consentimento | `porteiro*`, `consentimento*` | Existe; corrigir falso positivo P2 |
| 07 | Carregar contexto de negócio e cliente | `conversas_whatsapp.contexto` e brain | Parcial; evitar colisão de JSON |
| 08 | Resolver intenção e entidades | `motor/intencoes.ts`, `conversa/entender.ts` | Existe; corpus 396 frases no CI |
| 09 | Resolver confirmações pendentes antes de intenção genérica | `brain/guardas.ts` e estado | P3; priorizar testes |
| 10 | Decidir agir, perguntar, silenciar, transferir | Disperso entre Bot/IA/WhatsApp | **Simulador independente v0 criado** |
| 11 | Consultar fatos sem inventar resposta | `brain/acoes.server.ts` | Existe |
| 12 | Preparar operações sem gravar ainda | `brain/conferencia.ts` e pendências | Existe; respeitar confirmação |
| 13 | Consumir pendência atomicamente | `consumirPendente` no ciclo do cérebro | Existe no caminho oficial |
| 14 | Executar ação oficial com papel/tenant | `brain/acoes.server.ts` | Existe; nunca clonar |
| 15 | Compensar falha parcial de remarcação | `ia/acoes.server.ts` | P8; corrigir no fluxo oficial |
| 16 | Validar texto final baseado no resultado | `brain/guardas.ts` | Existe; ampliar testes |
| 17 | Reter saída e tentar novamente após falha | Sem outbox universal | P10; falta entrega durável |
| 18 | Formatar, enviar, limitar e registrar WhatsApp | `enviarPelaBarbearia`, `decidirFormato`, `ritmo` | Existe; sob reserva Claude |
| 19 | Handoff para humano com vencimento | `flow-bot/decisao.ts` | Parcial; P1 da IA |
| 20 | Medir acerto, custo, latência, duplicidade | Corpus, rastros, logs de IA | Parcial; baseline publicada |
| 21 | Rejeitar eventos malformados e reentregas | Webhooks, `idempotencia` | Endurecer e ensaiar |
| 22 | Respeitar custos e indisponibilidade de modelo | `brain/gateway.server.ts` e fallback | Existe; sem API paga no MVP |

## 4. Nosso Agente Flow v0: o que foi implementado

Arquivo: `src/lib/agente-flow/planejador.ts`.

`planejarTurno(turno, estado)` é **puro, sem banco, sem rede e somente leitura**. O chamador precisa oferecer a intenção já classificada pelo motor atual; não foi criado novo vocabulário. Retorna: `proximaEtapa`, `motivo`, `versaoLida`, `chaveIdempotencia` e eventuais ferramenta de LEITURA ou ID da pendência.

Decisões possíveis:
1. `ignorar`: reentrega do turno já visto.
2. `silenciar`: humano comprovadamente no controle e dentro do prazo.
3. `consultar`: sugere ferramenta de **leitura** conhecida; NÃO a chama.
4. `perguntar`: não existe confirmação válida, número solto ou pendência vencida.
5. `delegar`: quem decide e executa é o Flow Bot ou o cérebro oficial.
6. `solicitar_execucao_confirmada`: apenas informa que há confirmação inequívoca para pendência válida, própria da conversa/negócio; o caminho oficial ainda precisa **consumi-la atomicamente e revalidar permissões, prazo e disponibilidade**.

Os princípios adaptados: LangGraph — estado, identidade do thread e precedência da pendência; Cloudflare Agents — idempotência e eventual durabilidade; Mastra — decisão tipada, caminho explícito de erro; OpenCode — separar planejamento de execução.

**Limites explícitos:** o módulo não cria um agente vivo, não responde WhatsApp, não muda `config_atendimento_ia`, não possui memória persistida, não modifica agenda, não registra estado nem garante processamento único entre processos. O retorno `sombra: true` é literal. `chaveIdempotencia` é um identificador candidato, não um índice único persistido.

## 5. Arquitetura futura, dependências e riscos

```text
Evolution/Meta (único webhook por conexão)
    -> Inbox durável, autenticação e dedupe (P18)
    -> Agrupador existente
    -> Identidade, consentimento e supressão existentes (P2)
    -> Estado versionado / pendências (P1, P3, P24)
    -> Classificador e Flow Bot existentes
    -> Planejador Flow (modo sombra; comparar com decisão real)
    -> Cérebro oficial e ações oficiais (aprovação + permissões + gravação)
    -> Guarda da resposta
    -> Outbox + retentativas + monitor (P10)
    -> Gateway WhatsApp existente
    -> Trilha de métricas do turno
```

**Não instalar** `@langchain/langgraph`, `agents`, `@mastra/core` ou `@opencode/sdk` agora: o comportamento crucial pode ser construído e medido com o código que já existe. Em momento futuro, avaliar **LangGraph.js como biblioteca de fluxo** ou **Agents SDK como runtime**, não como dois bancos de memória em concorrência. A compatibilidade com o runtime de prévia exige um protótipo isolado, medição de bundle, CPU, storage e testes de restart; não está validada aqui.

### Invariantes inegociáveis

- Sem API LLM paga necessária para as decisões determinísticas; provedor opcional só após orçamento/medição.
- Cliente jamais recebe dados de outro tenant ou outro telefone; quem valida é o servidor existente.
- Nenhuma escrita sem confirmação explícita e consumo único de pendência.
- Nenhum pagamento marcado como recebido por texto de WhatsApp.
- Falha de banco não vira "sem vagas"; falha de envio não vira "confirmado".
- Sem escolha arbitrária de horário/profissional; perguntar quando mudar o resultado.
- Nenhuma mensagem proativa fora da janela/autorização definida pelo gateway oficial.
- Nunca conectar ao WhatsApp real antes de corrigir P1/P2/P8/P10 e validar em prévia com dados fictícios.
- Manter ações `canais: []` indisponíveis; sem bypass por "tool calling" de IA.
- `main`, `cortai-prod`, segredos, DNS, `evolution-crm` e Oracle intocados.

## 6. Testes e próximos gates

A suíte `src/lib/agente-flow/planejador.test.ts` deve validar: identidade e versionamento; isolamento por tenant/conversa; idempotência de turno; humano com prazo válido e sem prazo; pendência expirada/futura; confirmação certa e tentativa de confirmação de ação diferente; número solto; negar; ferramenta de leitura vs escrita; pedido humano e desconhecido; nenhuma execução ou resposta automática.

A definição de **pronto para produção** NÃO é ter testes do planejador verde. Só avançar depois de:
1. Resolver as reservas atuais em `DIARIO.md` e corrigir P2 e P1 nos caminhos oficiais.
2. Executar os cenários de `11-testes-e-avaliacao.md` (incluindo P8 e P10) no banco fictício e testar dedupe após falha.
3. Ativar comparação em modo sombra **por tenant**, sem envios adicionais nem escritas, respeitando LGPD e custos.
4. Medir a taxa de divergência em conversas de teste e custos de infraestrutura.
5. Aprovar integração real no workflow oficial, separadamente de qualquer publicação no site principal.

**Conclusão:** reutilizar os 24 comandos oficiais, adicionar uma política orquestradora que não escreve, manter o Flow Bot e a Flow IA como motores existentes. Usar código open source como referência arquitetural; instalar biblioteca somente diante de uma lacuna comprovada e após verificar licença, runtime e custo.
