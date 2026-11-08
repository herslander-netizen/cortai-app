# Fase 3 — limitador de cotas global atômico (preparação)

## O que foi implementado
- Worker **separado** em `infra/flow-ai-quota/`, com classe `CotaGlobalDuravel` baseada em SQLite, migração `new_sqlite_classes` e sem rota pública (`workers_dev: false`; `fetch` responde 404).
- `src/lib/brain/cotas-cloudflare.server.ts` transforma o binding privado `FLOW_AI_COTAS` no contrato `LimitadorHibridoDistribuido` do gateway original. Uma mesma conta/provedor vai sempre para o mesmo Durable Object, independentemente do tenant.
- Reservas usam **uma transação SQLite síncrona sem `await`**; verificam simultaneamente janelas *móveis* de 60 segundos e 24 horas; recusam idempotência repetida. A operação é fail-closed em falha de storage, API, namespace ou conexão.
- O próprio Worker impõe tetos conservadores adicionais (não representam os limites oficiais de cada serviço); o menor valor entre teto do Worker e configuração do Flow prevalece.
- Toda chamada ao modelo, inclusive a segunda rodada depois de executar ferramentas, recebe ID exclusivo. Não registra prompt, CPF, telefone, chaves de API ou tokens.
- **Não foram criados nenhum Worker remoto, namespace, binding ou segredo.** O código funciona apenas quando essa infraestrutura for configurada e `CORTAI_AI_HIBRIDO=true` for liberado expressamente.

## Como conectar SOMENTE na prévia, após revisão do custo e confirmação
1. Verificar conta Cloudflare Free, limite gratuito de Durable Objects, ausência de faturamento excedente e disponibilidade da classe SQLite.
2. Fazer build isolado com o Wrangler já instalado: `bunx wrangler deploy --dry-run --config infra/flow-ai-quota/wrangler.jsonc`.
3. Implantar o Worker `flow-core-quota-preview` com `bunx wrangler deploy --config infra/flow-ai-quota/wrangler.jsonc`. Não executar na produção e não configurar routes/workers.dev.
4. No projeto **Pages de prévia**, adicionar binding Durable Object `FLOW_AI_COTAS` apontando para classe `CotaGlobalDuravel` do Worker `flow-core-quota-preview`. Só prévia; não adicionar à configuração de produção do mesmo projeto.
5. Adicionar, em segredo de prévia e só depois dos testes com entradas **sintéticas**, os `CORTAI_AI_HIBRIDO_*` necessários, modelos/contas gratuitos, um ID público estável por chave de API e limites específicos inferiores aos tetos do Worker. O workflow de prévia atual NÃO propaga esses novos segredos; ajustar esse caminho com revisão e aprovação antes da ativação.
6. Fazer testes sem PII de rajadas simultâneas, transições dos limites, indisponibilidade do DO, atrasos/replays e fallback. Conferir registros de uso/custo nos provedores.
7. Só então ligar `CORTAI_AI_HIBRIDO=true` na prévia, por período supervisionado. Não usar em produção.

**Importante:** bloqueio do Flow sozinho não garante consumo de R$ 0. Toda conta externa precisa estar na modalidade gratuita, com cobrança paga proibida; erros 429 podem ocorrer abaixo dos limites configurados por modelo/organização. A política atual continua conservadora e dados pessoais são processados somente pelo Ollama privado quando ligado.

Documentação Cloudflare: https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/ ; https://developers.cloudflare.com/pages/functions/bindings/ ; https://developers.cloudflare.com/workers/runtime-apis/bindings/.
