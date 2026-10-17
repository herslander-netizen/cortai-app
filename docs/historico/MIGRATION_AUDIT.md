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

## Ensaio completo da sequência (15/10/2026)

O banco original do Lovable não respondeu às consultas de leitura (erro 504). A estrutura foi reconstruída a partir do repositório e conferida contra `src/integrations/supabase/types.ts` (gerado do banco original) e contra o que a auditoria de 09/10 verificou no banco de produção.

**Como repetir:** `supabase/baseline/ensaio/ensaio-local.sh` (com `MANTER=1` o banco fica de pé para inspeção). Ele cria um Postgres temporário com uma imitação mínima do Supabase (`imitacao-supabase.sql`), aplica as migrações Supabase e Drizzle em ordem e roda `supabase/tests`. Não conecta em nenhum banco remoto.

**Resultado:** 142 migrações Supabase aplicadas, 4 puladas, 28 Drizzle aplicadas e RBAC com 68 de 68 verificações. Todas as tabelas, colunas e funções do `types.ts` existem, e nenhuma tabela fica sem RLS.

**Migrações recuperadas:** a sequência do GitHub parava em `20260913144719`, porque 7 migrações de 13/09 nunca chegaram ao repositório. Elas foram recuperadas de um export do projeto feito naquela data e voltaram com os nomes originais:
- `20260913005022`: permissões por papel, `gerente`, confirmação de pagamento, auditoria do negócio, `registrar_auditoria_barbearia` e `confirmar_pagamento_agendamento`.
- `20260913005054`: permissões dessas funções.
- `20260913010327`: configuração visual e contato da plataforma.
- `20260913012556`: recursos por negócio.
- `20260913022536`: redes sociais da plataforma.
- `20260913022610`: permissões de `contato_da_plataforma`.
- `20260913023749`: leitura de recursos só por membros.

**Ainda deduzido** (`20261015120000_reconstrucao_lacunas_finais.sql`, revisar antes de produção):
- A tabela `aceites_legais`: estrutura do `types.ts`; cada pessoa lê e registra só os próprios aceites.
- Os buckets `tenant-logos` e `home-publica`, criados como privados.

**Puladas num banco novo** (`supabase/baseline/ensaio/pular-no-banco-novo.txt`): dados do negócio de demonstração, IDs de modelos do WhatsApp da conta antiga e o envio de WhatsApp de teste.

**Teste ajustado:** `supabase/tests/rbac.sql` esperava que o dono mudasse o plano por escrita direta. A migração `20260930083859` tirou essa permissão de propósito (plano só muda no servidor), então o teste passou a exigir a recusa.

**Para aplicar no `cortai-prod`:** mesma ordem e mesmos pulos do ensaio, com `check_function_bodies = off` em cada migração. Em seguida, conferir com `supabase/baseline/baseline_verification.sql` e com os alertas de segurança do Supabase. **Depende de autorização explícita.**

**Limites do ensaio:** Postgres 16 local com imitações de `auth`, `storage`, `cron` e `net`; o `cortai-prod` usa Postgres 17 e o Supabase real.

**Pendências ligadas a isto:**
- Trocar os nomes com "barbearia" por nomes neutros, numa etapa própria.
- Fechar 4 funções de gatilho que o visitante anônimo consegue executar.
- `src/lib/barbeiro.functions.ts:1249`: as sugestões de horário usam uma grade fixa das 9h às 19h com `setHours`. Isso ignora o horário do negócio e o fuso.

## Aplicação no `cortai-prod`

- **Tarefa agendada recriada:** `20260928084249_reconstrucao_tarefa_varredura_whatsapp.sql` recria a tarefa `cortai-varredura-whatsapp` (a cada 15 min). Ela foi criada direto no banco original, e a migração `20260928084250` altera a tarefa nº 1, que precisa existir antes.
- **Script:** `supabase/baseline/aplicar-no-banco-novo.sh` aplica tudo numa transação só. Se qualquer migração falhar, nada fica gravado. Ele recusa:
  - banco que não seja do projeto esperado;
  - esquema `public` que não esteja vazio;
  - endereço do app que não comece com `https://`.

  Na hora de aplicar, troca `https://cortai.dev/api/` pelo endereço do ambiente (`URL_DO_APP`), para as tarefas agendadas e os avisos de push não chamarem a produção antiga. Os arquivos das migrações não mudam.
- **Automação:** "Montar banco novo (cortai-prod)", só manual, com a confirmação `MONTAR`. Usa o segredo `CORTAI_PROD_DB_URL` (string do Session pooler do Supabase, que funciona por IPv4 nos runners do GitHub).
- **Testado localmente:** com falha forçada, nada ficou gravado; a aplicação completa passou com 171 migrações e RBAC 68 de 68; as tarefas e os gatilhos de push apontam para `URL_DO_APP`.
