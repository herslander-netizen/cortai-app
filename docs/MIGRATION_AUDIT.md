# Cortaí — auditoria de migrations e plano de baseline

**Destino:** Supabase `cortai-prod` (`ibsberidejlbczxrweqg`), projeto dedicado à reconstrução.  
**Estado:** preparação/auditoria; nenhuma migration aplicada.  
**Escopo desta revisão:** leitura do schema inicial, funções críticas de agendamento, arquivo de permissões e migrations finais de WhatsApp. A listagem do diretório contém 134 arquivos SQL, mas a revisão linha a linha de todos eles ainda não foi concluída. Este documento não deve ser interpretado como aprovação para executar a baseline.

## Proteções inegociáveis
- Não tocar no Supabase `evolution-crm` (`guuvderpqspldyrlbhxa`), no projeto Lovable original, no domínio `cortai.dev`, DNS, webhooks ou integrações ativas.
- Não executar migrations nem DDL no projeto de destino até que o SQL consolidado e o plano final sejam apresentados e aprovados.
- Não incluir seeds/dados de demonstração, IDs fixos, envio de WhatsApp de teste, WABA/template IDs ou segredos.
- Não modificar schemas gerenciados `auth` e `storage`.
- Não fazer merge nem deploy.

## Estado do destino na última verificação
- `public`: nenhuma tabela de aplicação.
- Histórico de migrations: vazio.
- `auth.users`: zero.
- `storage.buckets` e `storage.objects`: vazios.
- Advisors de segurança e performance: sem avisos retornados na consulta anterior.
- Não foi gerado backup restaurável. A verificação de estado não equivale a backup.

## Achados de alta prioridade

### P0 — escrita arbitrária em movimentos de carteira
Na migration inicial, a role `authenticated` recebe `INSERT` em `public.movimentos`, e a policy `tenant lanca movimentos` verifica apenas se a carteira pertence a um membro do tenant. Como o trigger `recalcular_carteira` recalcula o saldo com base nos movimentos inseridos, um membro autenticado pode potencialmente inserir deltas arbitrários de crédito/dinheiro/fidelidade. A proteção append-only impede UPDATE/DELETE, mas não impede INSERT abusivo. **Antes de liberar o app, remover INSERT direto para `authenticated` e expor apenas funções transacionais autorizadas**, ou restringir rigorosamente tipos, valores e origens na camada SQL. Testar isso com dois tenants e usuários comuns.

### P0 — funções SECURITY DEFINER com autorização incompleta
`criar_agendamento`, `cancelar_agendamento` e `marcar_falta` usam `SECURITY DEFINER`. Os grants encontrados limitam EXECUTE a `service_role`, o que reduz exposição via PostgREST, mas as funções de cancelamento/falta não validam usuário/tenant dentro da função. Manter esse acesso exclusivamente no servidor com autorização por tenant antes da chamada e testar que nenhum caminho client-side possa invocá-las. Não conceder EXECUTE a `anon` ou `authenticated`.

### P1 — divergência de CHECKs e funções de agendamento
- `agendamentos.forma_pagamento` aceita `credito,pix,balcao,fiado`, mas `criar_agendamento` valida `credito,pix,barbearia,fiado`.
- `movimentos.tipo` não aceita `devolucao`, embora o cancelamento tente inseri-lo.
- `movimentos.origem` não aceita `agendamento` nem `cancelamento`, embora criação/cancelamento usem esses valores.
Essas divergências podem quebrar criação/cancelamento e estornos. A baseline precisa reconciliar enums/checks com o comportamento pretendido e cobrir tudo com testes SQL.

### P1 — conflito de horários sujeito a corrida
A função verifica sobreposição e depois insere, sem bloqueio/constraint de exclusão evidente no arquivo revisado. Duas requisições simultâneas podem passar pela verificação. Adicionar proteção transacional no banco (por exemplo, constraint de exclusão com range e escopo de profissional, quando compatível com as regras) ou lock explícito; validar dependência de extensão e timezone.

### P1 — seeds e configuração externa
A migration inicial termina com dados de demonstração para tenant, profissionais, serviços, clientes, carteiras, movimentos e regras de plano. Não incluir esses INSERTs. As migrations finais atualizam templates/WABA e registram um envio de teste com identificadores/telefone fixos; excluí-las da baseline inicial e configurar WhatsApp posteriormente por ambiente/estabelecimento.

## Sequência proposta (não executar ainda)
1. Inventariar e classificar as 134 migrations: schema, segurança, correção, seed, integração externa, dados de teste e recursos opcionais.
2. Resolver conflitos entre migrations e código; definir o escopo mínimo de produto para a primeira versão.
3. Gerar baseline revisada sem DML de demonstração nem credenciais/IDs externos.
4. Validar sintaxe e dependências em banco temporário/local; executar testes de RLS, isolamento multi-tenant, carteira e agenda.
5. Revisar permissões de funções `SECURITY DEFINER`, grants/revokes, políticas e índices.
6. Apresentar os arquivos SQL finais e checklist de validação para aprovação explícita.
7. Só depois da aprovação, aplicar no projeto `cortai-prod`, conferir estado com `supabase/baseline/baseline_verification.sql` e executar advisors novamente.

## Arquivos relacionados
- [Auditoria de baseline](./auditoria-baseline-supabase.md)
- [Consultas de verificação pós-baseline](../supabase/baseline/baseline_verification.sql)

## Limitação atual
Não há baseline consolidada e validada pronta para execução. Não executar as 134 migrations em sequência como substituto da auditoria. A prioridade é corrigir as falhas P0/P1 antes de criar o schema final.

## Correções preparadas na branch isolada (não aplicadas ao banco)

- A migration inicial foi editada para remover o bloco de INSERTs de demonstração (tenant, profissionais, serviços, clientes, carteiras, movimentos e regras fictícias).
- Foi criada `supabase/migrations/20261013170000_reconstruction_security_and_constraints.sql`: revoga INSERT direto em `public.movimentos` para `anon` e `authenticated`, preserva acesso de leitura e acesso total do `service_role`, e reconcilia as constraints de pagamento/movimentos para evitar que os valores já usados nas funções falhem.
- A migration de correção ainda é candidata: precisa ser testada após aplicar o schema completo numa instância temporária. Em particular, é necessário auditar todas as rotas que escrevem em `movimentos` para confirmar que usam operações confiáveis do servidor antes de revogar INSERT direto a usuários autenticados.
- A prevenção de corrida de horários ainda exige revisão integral das migrations posteriores e teste de concorrência; não foi incluída constraint de exclusão sem validar extensão, opclasses, regras de encaixe e reservas existentes.
- Nenhuma migration foi aplicada a `cortai-prod`; nenhuma alteração foi feita em `evolution-crm`, produção, DNS ou integrações externas.
