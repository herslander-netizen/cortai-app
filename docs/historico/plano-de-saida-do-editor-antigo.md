# Inventário de dependências do Lovable — migração independente

Branch de trabalho: `cloudflare-workers-migration-2026-10-13`

Este documento distingue pacotes removíveis de serviços externos que ainda fazem parte do comportamento do produto. Não autoriza deploy, mudança de domínio ou alteração de banco.

## Já desacoplado nesta branch

- **Build Vite/TanStack:** configuração nativa com Cloudflare Vite plugin, TanStack Start, React, Tailwind e aliases.
- **OAuth de entrada:** `src/integrations/lovable/index.ts` encaminha Google/Apple para `supabase.auth.signInWithOAuth`. A configuração de provedores e URLs de retorno precisa ser validada por ambiente antes do uso real.
- **Webhook WhatsApp:** validação HMAC local, timestamp com tolerância limitada, comparação constante, limite do corpo e testes próprios em `src/lib/webhooks/lovable-signature.server.ts`.
- **WhatsApp oficial (Meta):** envio direto pela Cloud API (`graph.facebook.com`) quando `META_WHATSAPP_ACCESS_TOKEN` e `META_WHATSAPP_PHONE_NUMBER_ID` existem; o recebimento direto já conferia `X-Hub-Signature-256` com o App Secret e agora aceita também `META_WHATSAPP_VERIFY_TOKEN`/`META_WHATSAPP_APP_SECRET`. O conector do Lovable (`connector-gateway.lovable.dev`) só é usado se a configuração direta faltar. Testes: `src/lib/whatsapp/gateway-meta-direta.test.ts`.
- **Pacote de webhooks:** removido das dependências depois da migração local.
- **Cloud Auth SDK:** removido das dependências e do lockfile.
- **Exceções de instalação:** removidas do `bunfig.toml` para pacotes já não usados.
- **Metadados e comandos do editor hospedado:** removidos `.lovable/project.json`, `.lovable/mcp/manifest.json` e `.claude/commands/pedido-lovable.md`. O manifesto removido fixava o endpoint OAuth em um projeto Supabase antigo; o comando removido gerava pedidos para o editor hospedado. O histórico de planos em `.lovable/plan/` foi preservado como documentação de produto, não como dependência de execução.

## Em validação — MCP e IA

### MCP e OAuth de recursos protegidos

O transporte MCP foi substituído por `@modelcontextprotocol/sdk` em `src/lib/mcp/handler.server.ts`; `src/routes/mcp.ts` agora encaminha GET/POST/DELETE para o handler próprio. O handler valida o token no Supabase, deriva o usuário e o estabelecimento no servidor, mantém as ferramentas somente leitura e aplica o limite de 31 dias e 500 agendamentos. O plugin e o pacote `@lovable.dev/mcp-js` não aparecem mais nas dependências atuais. Também removi os módulos órfãos antigos de ferramentas MCP e o helper de autenticação duplicado, mantendo uma única implementação ativa no handler novo.

Os testes automatizados agora cobrem token ausente, token inválido/expirado e usuário autenticado sem vínculo ativo; a execução de CI `38504235312` passou com TypeScript, testes e build. Os testes de autenticação usam mocks: não comprovam a validação contra um projeto Supabase real nem substituem teste de isolamento ponta a ponta. Ainda é necessário exercitar as ferramentas com dois estabelecimentos de teste, usar um cliente MCP real e validar os metadados OAuth e o fluxo de consentimento.

### Gateway de IA

O harness Promptfoo e os arquivos de comparação foram atualizados para usar o provedor configurado ou GPT-OSS; o perfil legado que dependia do gateway Lovable foi removido. As avaliações com provedor real ainda exigem credenciais explícitas e não foram executadas nesta etapa.

- `src/lib/brain/gateway.server.ts` encaminha somente para o provedor compatível configurado ou para o modo de regras; o caminho de execução direto do gateway Lovable foi removido.
- `src/lib/ia/assistente.server.ts` usa o adaptador independente.
- `src/lib/whatsapp/transcricao.server.ts` usa endpoint de transcrição configurável e não deve recorrer ao gateway Lovable.
- `src/lib/brain/gateway-compativel.server.ts` trata ausência de `CORTAI_AI_PROVIDER` (ou valor legado `lovable`) como configuração indisponível, sem fallback automático.

A correção ainda depende de CI verde e testes de contrato. Validar resposta com ferramentas, JSON estruturado, timeout, erros HTTP, transcrição e comportamento quando nenhuma chave estiver configurada. Não ativar provedor real nem executar avaliação com credenciais sem configuração explícita do ambiente.

### Integrações auxiliares / compatibilidade

- **Tratamento de erro de rota:** `src/components/layout/RouteError.tsx` permanece como interface própria de recuperação de erros (sessão, rede, permissão e chunks desatualizados); não é, por si só, telemetria do editor. O módulo `src/lib/lovable-error-reporting.ts` não existe nesta branch. Não remover o `RouteError` sem substituir suas rotas de recuperação e testar o comportamento offline/PWA.
- `src/integrations/lovable/index.ts` ainda preserva o nome de compatibilidade para consumidores existentes, mas delega o login ao Supabase; renomear todos os consumidores é limpeza posterior, não bloqueia o runtime.
- `LOVABLE_CRON_SECRET` em `src/integrations/supabase/cron-auth.ts`: nome de variável ainda legado. Rotacionar/renomear exige transição compatível com jobs existentes e não deve ser feito isoladamente.
- Comentários, metadados e rotas com o prefixo `/.lovable` podem fazer parte do fluxo OAuth de consentimento; não excluir só pelo nome.

## Portas de segurança antes de qualquer mudança de banco

- Confirmar backup restaurável e procedimento de restore.
- Revisar a migration inicial e políticas RLS em separado.
- Aplicar apenas no banco de reconstrução, depois de autorização explícita.
- Nunca apontar testes para o banco original ou para `evolution-crm`.

## Critério de conclusão

Considerar a migração independente concluída apenas quando build, TypeScript, testes de webhook/MCP/OAuth/IA e testes de isolamento passarem; o inventário de endpoints/variáveis estiver atualizado; e houver uma validação funcional no ambiente de testes. CI verde sozinho não comprova fluxos externos funcionando.
