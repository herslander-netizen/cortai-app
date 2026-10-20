# Auditoria de baseline Supabase — Cortaí

**Status:** em andamento; não executar como plano de aplicação.  
**Destino autorizado para preparação:** projeto Supabase `cortai-prod` (`ibsberidejlbczxrweqg`).  
**Proteção:** não tocar em `evolution-crm`, projeto original Lovable, produção, DNS, webhooks ou integrações existentes.

## Estado observado antes de qualquer alteração
- `public`: nenhuma tabela de aplicação encontrada na última leitura.
- Histórico de migrations do projeto: vazio.
- `auth.users`: vazio na última leitura.
- `storage.buckets` e `storage.objects`: vazios na última leitura.
- Isso é uma verificação de estado, não um backup restaurável. Nenhuma migration foi aplicada.

## Achados confirmados em arquivos revisados
### Migration inicial — `20260912184842_951484fd-6be9-4481-8600-b3eb63403e50.sql`
Cria tipos, tabelas, índices, políticas RLS, funções e triggers para papéis, tenants, profissionais, serviços, clientes, carteiras, movimentos, agendamentos e fila de espera. No final também insere dados de demonstração (tenant M.A Barbearia, profissionais, serviços, clientes, carteiras, movimentos e regras de plano com UUIDs fixos). A baseline limpa deve preservar o DDL necessário, mas excluir esses inserts de teste.

### Permissões — `20260912184906_6fc1a1d5-c84b-4e10-b9fe-47af9ec59409.sql`
Ajusta EXECUTE de funções de gatilho e helpers RLS. Deve ser consolidada junto das definições de funções e políticas para evitar exposição indevida ou bloqueio de acesso legítimo.

### Funções de agendamento — `20260912185303_dee64a97-0076-4a22-a5da-f514d0230183.sql`
Cria funções `SECURITY DEFINER` de criação/cancelamento/falta. Requer revisão de validação de tenant e autorização, consistência de enums/check constraints, concorrência de horários e permissões de execução. A função de criação usa formas de pagamento que não correspondem exatamente aos valores permitidos na tabela inicial; tipos de movimento/origem também precisam ser reconciliados com os CHECKs.

### Migrations finais de WhatsApp
- `20261001205921_10aaea28-b664-496f-8526-b460b2888a71.sql`: atualiza modelos com IDs de templates e WABA externos. Não copiar automaticamente; reconfigurar após validação das credenciais e do negócio.
- `20261001210601_cfb088dd-3efa-4262-bf77-a65b08b7c930.sql`: insere envio de teste com IDs fixos, telefone e prazo expirado. Excluir da baseline.
- `20261001210640_eca17833-9062-48de-83d6-28ff2061d781.sql`: marca aquele envio de teste como enviado com identificador externo. Excluir da baseline.

## Política da baseline
1. Não executar cegamente as 134 migrations.
2. Excluir seeds de teste, IDs fixos de tenants/clientes/agendamentos e estado de envio de WhatsApp de teste.
3. Não incluir IDs de templates/WABA, tokens, segredos, números ou identificadores externos sem configuração deliberada.
4. Preservar a ordem lógica de dependências de tipos → tabelas → funções/triggers → RLS/policies → grants.
5. Revisar todas as 134 migrations antes de declarar o SQL consolidado final.
6. Não alterar schemas gerenciados `auth` ou `storage`; não recriar funções/objetos internos do Supabase.
7. Não executar migrations no Supabase até apresentar o SQL final, plano, riscos e verificações para revisão.

## Verificações obrigatórias antes/depois da aplicação
- Confirmar projeto alvo e estado inicial novamente.
- Validar SQL numa instância temporária/local antes do projeto alvo.
- Conferir tabelas, tipos, índices, FKs, constraints, funções, triggers, policies RLS, grants/revokes e extensões.
- Confirmar ausência de dados de demonstração e seeds externos.
- Rodar advisors de segurança e performance.
- Testar isolamento multi-tenant e fluxos críticos de agendamento/carteira.
- Reconsultar estado após aplicação e comparar com inventário esperado.

## Limitação desta versão
Este documento registra os riscos confirmados nos arquivos inspecionados e define o método de auditoria. Não representa ainda a classificação linha a linha de todas as 134 migrations nem é autorização para executar SQL. A baseline final só deve ser gerada após concluir a revisão integral e resolver as dependências e incompatibilidades.
