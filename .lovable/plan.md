# Painel de Controle da Operação — auditoria (Fase 1)

Versão atual: 1.5.0 (motor de conversa determinístico). Versão de destino: 1.6.0 (MINOR). Nenhum arquivo foi alterado.

## 1. Arquitetura atual do painel

A tela Início do barbeiro (`src/routes/barbeiro.index.tsx`) já é o painel. Hoje ela faz duas chamadas: uma para os números do dia e outra para as oportunidades. Mostra faturamento, ocupação, a receber, clientes ativos, atendimento em andamento, "próximos passos", hub de módulos, meu plano e três alertas fixos (fila, fiado vencendo, sumidos há 45 dias).

Limitações reais encontradas:
- A ocupação é estimada por uma conta fixa de 20 horários por profissional, ignorando os horários de funcionamento já cadastrados.
- O faturamento do dia vem de agendamentos + baixas, enquanto o módulo de caixa usa a tabela de movimentos de caixa — dois números diferentes para a mesma pergunta.
- Não existem ticket médio, cancelamentos, faltas, clientes novos/recorrentes do dia, encaixes, profissional em atendimento nem resumo do WhatsApp.
- Os alertas são sempre os mesmos três, sem prioridade e sem link direto.
- Não há estados de carregando/erro/vazio/sem permissão: erro simplesmente não mostra nada.
- Risco de segurança: a função do painel e a de oportunidades usam a conexão administrativa e **não checam permissão nenhuma**. Um barbeiro ou recepção vê faturamento, fiado e receita fixa. Precisa ser corrigido nesta entrega.

## 2. Mapa capacidade → arquivo → função → permissão → classificação

| Capacidade | Arquivo | Função | Permissão hoje | Classificação |
|---|---|---|---|---|
| Números do dia | `src/lib/barbeiro.functions.ts` | `getPainelHoje` | nenhuma (falha) | ADAPTAR |
| Agenda do dia | `src/lib/barbeiro.functions.ts` | `getAgendaDia` | nenhuma | REUTILIZAR |
| Próximo horário livre | `src/lib/barbeiro.functions.ts` | `getProximoHorarioLivre` | — | REUTILIZAR |
| Fila de espera | `src/lib/barbeiro.functions.ts` | `getFila` | recurso de plano | REUTILIZAR |
| Oportunidades | `src/lib/crescimento.functions.ts` | `getOportunidades` | nenhuma | ADAPTAR |
| Retorno/recorrência/inativos | `src/lib/crescimento.functions.ts` | `getCrescimento`, `getClientesCRM` | recurso de plano | REUTILIZAR |
| Caixa, fiados, formas de pagamento | `src/lib/financeiro.functions.ts` | `getCaixa`, `getFiados` | `visualizar_financeiro` | REUTILIZAR |
| Comissões | `src/lib/financeiro.functions.ts` | `getComissoes` | `comissao_visualizar_todas` | NÃO MEXER |
| Profissionais | `src/lib/crescimento.functions.ts` | `getProfissionaisPerfil` | — | REUTILIZAR |
| Fidelidade | `src/lib/fidelidade.functions.ts` | `getClientesFidelidade` | `gerenciar_voltai` | REUTILIZAR |
| WhatsApp/CortAI | `src/lib/whatsapp.functions.ts` | `getPainelDoCortai`, `getMetricasDoCortai` | `ver_cortai` | REUTILIZAR |
| Horários de funcionamento | `src/lib/horarios.ts` | `slotsDoDia` | — | REUTILIZAR |
| Autorização | `src/lib/tenant.ts` + RPC `has_tenant_permission` | `exigirPermissao` | — | NÃO MEXER |

## 3. Oportunidades calculáveis hoje (motor determinístico, sem IA)

Com os dados que já existem: horário vago nas próximas horas, cliente na fila esperando encaixe, cancelamento recente liberando horário, clientes no período habitual de retorno, clientes inativos além do intervalo próprio, profissional com baixa ocupação no dia, fiado vencido, atendimento sem avaliação, estoque baixo, conversa aguardando atendente humano. Cada oportunidade sai como tipo, prioridade, título, descrição, quantidade e destino — nada é enviado automaticamente, só sugerido.

## 4. O que será feito

**Banco:** nenhuma migration. Nenhuma alteração estrutural.

**Servidor** (`src/lib/painel.functions.ts`, novo):
- `getPainelDeControle` — uma única chamada agregada, substituindo o efeito em cascata de vários cards. Justificativa: hoje a Home já faz duas chamadas que repetem as mesmas consultas de agendamentos e clientes; unificar reduz consultas em vez de aumentar.
- Devolve blocos: hoje, agenda, atenção, movimentos (oportunidades), clientes, financeiro, profissionais, atendimento.
- Cada bloco carrega uma marca de permissão: sem `visualizar_financeiro` o bloco financeiro nem é calculado nem enviado; sem `ver_cortai` o bloco de atendimento não vem; sem `visualizar_clientes` o bloco de clientes não vem. A checagem é no servidor, via a RPC de permissões já existente.
- Ocupação passa a usar o horário de funcionamento real cadastrado; quando não houver horário configurado, o painel informa "horários ainda não configurados" em vez de mostrar porcentagem inventada.
- Faturamento do dia passa a usar a mesma fonte do módulo de caixa, para o número bater com o caixa.
- Motor de oportunidades determinístico em `src/lib/painel/oportunidades.server.ts`.
- Correção de segurança: `getPainelHoje` e `getOportunidades` passam a exigir permissão para os campos sensíveis, sem quebrar as telas que já os usam.

**Interface** (`src/routes/barbeiro.index.tsx` + componentes em `src/components/painel/`):
- Saudação "Bom dia, [nome]" conforme a hora, com "Veja como sua barbearia está hoje."
- Ordem no celular: Hoje → Precisa de atenção → Próximos movimentos → Agenda → indicadores secundários (clientes, financeiro, profissionais, atendimento).
- No desktop, as mesmas áreas em duas colunas; no tablet, composição intermediária.
- Cada item de atenção e de oportunidade leva direto para agenda, clientes, fila, financeiro ou conversas.
- Estados completos: esqueleto ao carregar, vazio explicado, erro com opção de tentar de novo, sem permissão explicado, e "dados insuficientes" quando a base ainda é pequena. Nunca um zero sem explicação.
- Ações rápidas do bloco agenda: ver agenda, adicionar atendimento (reutiliza o formulário existente), ver fila.
- Visual atual mantido: grafite, branco e dourado como destaque pontual, cantos moderados, sem gradientes novos.

**Preservado:** navegação inferior, agenda, WhatsApp, financeiro, CRM, fidelidade, comissões e o botão do CortAI ficam como estão.

## 5. Riscos e impacto

- A Home é a tela mais usada: a troca será feita mantendo os elementos atuais (plano, hub de módulos, atendimento em andamento, avisos da plataforma).
- Mudar a fonte do faturamento pode alterar o número exibido hoje; é intencional, para ficar igual ao caixa.
- Aplicar permissão onde não havia pode esconder valores de quem via indevidamente; é correção de segurança.
- Custo: zero. Nada de IA paga, nenhum serviço externo novo.

## 6. Plano de testes

Dono, gerente, barbeiro e recepção; celular, tablet e desktop; barbearia sem clientes, sem agenda, sem faturamento e com vários profissionais; horários vagos, fila, cancelamento, cliente inativo; isolamento entre barbearias; carregando, erro e dados atualizados. Verificação de tipos e compilação ao final.

## 7. Changelog previsto

1.6.0 — Painel de Controle da Operação na Home do barbeiro: blocos Hoje, Atenção, Próximos movimentos, Agenda, Clientes, Financeiro, Profissionais e Atendimento; motor determinístico de oportunidades; permissões aplicadas no servidor; estados completos de carregamento, vazio, erro e sem permissão.
