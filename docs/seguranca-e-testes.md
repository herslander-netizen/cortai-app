# Segurança e testes — 28/09/2026

## Publicação
- Site oficial: https://cortai.dev (publicado).
- Verificação de lembretes (pg_cron `cortai-varredura-whatsapp`, a cada 15 min) chama `https://cortai.dev/api/public/whatsapp/automacoes` com a chave interna `x-cortai-varredura`.
- Últimas execuções antes da troca: HTTP 200 `{"ok":true,...}` às 08:15 e 08:30.

## Os 27 avisos do verificador do banco
Nenhum é crítico. O verificador de segurança completo não encontrou nenhum problema.

### 5 × "RLS ligado sem política" (INFO) — intencional
`whatsapp_webhook_events`, `rascunhos_de_barbearia`, `webhook_rejeicoes`, `webhook_limites`, `whatsapp_contexto_numero`.
Sem política = ninguém do app acessa; só o servidor (service_role). É o comportamento correto para tabelas internas. Ação: nenhuma.

### 22 × "Função SECURITY DEFINER executável por usuários logados" (WARN) — intencional
`cancelar_agendamento`, `carteira_pertence_ao_membro`, `confirmar_meu_acesso`, `confirmar_pagamento_agendamento`, `convidar_membro`, `criar_agendamento`, `criar_barbearia`, `definir_acesso_membro`, `definir_barbeiro_recebe`, `eh_hoje_na_barbearia`, `eh_meu_profissional`, `equipe_do_tenant`, `equipe_valida_edicao`, `has_role`, `has_tenant_permission`, `is_tenant_member`, `marcar_falta`, `meu_acesso_no_tenant`, `meu_convite`, `recurso_do_tenant_ativo`, `registrar_auditoria_barbearia`, `remover_membro`.
São as ações do próprio app (RPC) ou auxiliares usados nas regras de acesso; revogar quebraria o app. Cada uma valida `auth.uid()` e o vínculo/permissão com a barbearia internamente. Nenhuma recebe SQL dinâmico montado com texto do usuário (sem risco de SQL injection); todas usam `search_path` fixo.

### Agora vs. próximas sprints
- Agora: nada bloqueante.
- Próxima sprint: testes automáticos por papel (dono/gerente/recepção/barbeiro/cliente) chamando cada RPC acima com barbearia alheia e esperando recusa; revisar `criar_barbearia` com limite por usuário.

## Schema de notificações (validado)
- `envios_de_whatsapp`: `resposta`, `respondido_em`, `id_mensagem_externa` (indexado).
- `preferencias_do_cliente_avisos`: RLS equipe da barbearia + próprio cliente.

## Logs para depuração
- Execuções da verificação: `cron.job_run_details` e respostas em `net._http_response`.
- Envios e respostas: tabela `envios_de_whatsapp` e tela Flow IA → Atividade → Lembretes.
- Rejeições de webhook: `webhook_rejeicoes`.

## Guia rápido de teste (barbearia)
1. De um celular que NÃO seja o do bot, mande "oi" para +55 79 9818-1983.
2. Escolha a barbearia (1 ou 2) e marque um horário para daqui a ~2h10.
3. Confira o horário na Agenda do app (aparece ao vivo).
4. Em até 15 min depois de faltarem 2h, chega o aviso "você é o próximo" com Confirmar / Remarcar / Cancelar.
5. Toque em Confirmar → veja "Confirmou" em Flow IA → Atividade.
6. Repita com Cancelar → o horário some da agenda e a equipe é avisada.
7. Tudo sem custo: só funciona para quem escreveu nas últimas 24h.
