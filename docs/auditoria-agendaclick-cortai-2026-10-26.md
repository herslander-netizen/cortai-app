# Auditoria AgendaClick → Cortaí — melhorias propostas

**Data:** 26/10/2026  
**Branch:** `cloudflare-workers-migration-2026-10-13`

## Resultado da comparação

A análise do código atual confirmou que o Cortaí já possui agenda em timeline/lista, filtro de profissional, bloqueio de horários, histórico/CRM de clientes, confirmações e lembretes pelo WhatsApp, caixa, comissões e página pública. Esses módulos não devem ser duplicados.

Foram adicionados quatro incrementos ao código, com migrações preparadas quando necessário:

1. **Séries de agendamento:** o atendimento existente é a primeira ocorrência; o profissional escolhe semanal, quinzenal ou mensal e cria até 51 horários futuros. O horário local do negócio é preservado; no mensal, o dia original é mantido com ajuste para o último dia de meses mais curtos. A migração 0048 prepara uma transação integral: se um horário conflitar ou estiver fora das regras do negócio, a série inteira é revertida.
2. **Bloqueio de cliente:** separado do arquivamento. A migração 0047 acrescenta estado, data, autor e motivo interno e um gatilho que recusa novos agendamentos para o cliente bloqueado. Os atendimentos existentes não são apagados nem cancelados.
3. **Ganhos extras:** a tela de caixa registra gorjeta, serviço extra e outro recebimento, opcionalmente ligado ao profissional e ao método de pagamento. O Financeiro permite alternar entre semana e mês, somando os ganhos extras sem recriar o financeiro.
4. **Créditos em mensagens:** confirmações e lembretes exibem o saldo real de créditos de atendimento da carteira, se maior que zero. Isso **não é anunciado como saldo de sessões por pacote**, pois o sistema atual não tem uma carteira de sessões vinculada a cada compra de pacote.

## Migrações preparadas, não aplicadas

- `0047_bloqueio_cliente_agendamento.sql`
- `0048_series_agendamentos.sql`

Nenhuma migração foi aplicada, nenhum banco real foi escrito e o site principal não foi publicado. Enquanto as migrações não estiverem aplicadas no banco correspondente, a UI do bloqueio informa que a função ainda não está disponível e a criação de séries informa quando o RPC ainda não existe.

## Pendência separada: lembretes por e-mail

O Cortaí tem o e-mail opcional do cliente, mas não foi identificado um provedor de envio transacional configurado. Não foi criado um remetente fictício nem adicionada uma dependência com custo. Antes de ativar esse canal, é preciso escolher/configurar o provedor e definir consentimento e política de envio.
