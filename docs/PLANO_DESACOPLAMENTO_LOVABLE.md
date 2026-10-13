# Inventário de dependências do Lovable — migração independente

Branch de trabalho: `cloudflare-workers-migration-2026-10-13`

Este documento distingue pacotes removíveis de serviços externos que ainda fazem parte do comportamento do produto. Não autoriza deploy, mudança de domínio ou alteração de banco.

## Já desacoplado nesta branch

- **Build Vite/TanStack:** configuração nativa com Cloudflare Vite plugin, TanStack Start, React, Tailwind e aliases.
- **OAuth de entrada:** `src/integrations/lovable/index.ts` encaminha Google/Apple para `supabase.auth.signInWithOAuth`. A configuração de provedores e URLs de retorno precisa ser validada por ambiente antes do uso real.
- **Webhook WhatsApp:** validação HMAC local, timestamp com tolerância limitada, comparação constante, limite do corpo e testes próprios em `src/lib/webhooks/lovable-signature.server.ts`.
- **Pacote de webhooks:** removido das dependências depois da migração local.
- **Cloud Auth SDK:** removido das dependências e do lockfile.
- **Exceções de instalação:** removidas do `bunfig.toml` para pacotes já não usados.

## Ainda acoplado — não remover sem substituição testada

### MCP e OAuth de recursos protegidos

Pacote: `@lovable.dev/mcp-js`

Arquivos principais:
- `vite.config.ts` — plugin MCP que gera rotas.
- `src/routes/mcp.ts` — transporte MCP.
- `src/routes/[.well-known]/oauth-protected-resource.ts` — metadados OAuth.
- `src/lib/mcp/index.ts` — definição do servidor, emissor e ferramentas.
- `src/lib/mcp/supabase.ts` — contexto autenticado e descoberta do tenant.
- `src/lib/mcp/tools/listar-servicos.ts` e `listar-agendamentos.ts` — ferramentas somente leitura.
- `src/routes/[.]lovable.oauth.consent.tsx` — tela de consentimento usando a API OAuth do Supabase.

Substituição exigida antes de retirar o pacote:
1. Implementar transporte compatível com MCP e métodos HTTP suportados pelo cliente.
2. Reproduzir corretamente os metadados de recurso protegido e os desafios `WWW-Authenticate`.
3. Validar JWT do Supabase no servidor e derivar usuário/tenant do token validado; nunca confiar em tenant enviado pelo cliente.
4. Manter escopo somente leitura, schema/validação dos argumentos, limite de 31 dias e limite de 500 agendamentos.
5. Testar cliente sem token, token inválido/expirado, usuário sem vínculo, acesso a outro tenant, listagem de serviços e agenda.
6. Confirmar o fluxo de consentimento e callback OAuth no ambiente de teste antes de mudar a rota.

### Gateway de IA

Endpoints ainda usados:
- `https://ai.gateway.lovable.dev/v1/responses` em `src/lib/brain/gateway.server.ts`.
- `https://ai.gateway.lovable.dev/v1/chat/completions` em `src/lib/ia/assistente.server.ts`.
- `https://ai.gateway.lovable.dev/v1/audio/transcriptions` em `src/lib/whatsapp/transcricao.server.ts`.

Há suporte parcial a provedor OpenAI-compatible no cérebro, mas isso não significa que todas as chamadas estejam desacopladas. Antes de trocar:
1. Unificar o adaptador de provedor para respostas, chamadas com ferramentas e transcrição.
2. Preservar streaming, resposta estruturada, uso/custos, limites, erros 402/403/429/5xx e pausa por provedor.
3. Não enviar chaves ao navegador nem incluir conteúdo de conversa na telemetria por padrão.
4. Validar com testes de contrato e avaliações Promptfoo antes de ativar um provedor alternativo.

### Integrações auxiliares / compatibilidade

- `src/lib/lovable-error-reporting.ts` e `RouteError.tsx`: telemetria específica do editor; pode ser removida somente após confirmar fallback silencioso fora do editor.
- `src/integrations/lovable/index.ts` e consumidores ainda usam o nome compatível `lovable`; renomear é limpeza posterior, não bloqueia o runtime.
- `LOVABLE_CRON_SECRET` em `src/integrations/supabase/cron-auth.ts`: nome de variável ainda legado. Rotacionar/renomear exige transição compatível com jobs existentes e não deve ser feito isoladamente.
- Comentários, metadados e rotas com o prefixo `/.lovable` podem fazer parte do fluxo OAuth de consentimento; não excluir só pelo nome.

## Portas de segurança antes de qualquer mudança de banco

- Confirmar backup restaurável e procedimento de restore.
- Revisar a migration inicial e políticas RLS em separado.
- Aplicar apenas no banco de reconstrução, depois de autorização explícita.
- Nunca apontar testes para o banco original ou para `evolution-crm`.

## Critério de conclusão

Considerar a migração independente concluída apenas quando build, TypeScript, testes de webhook/MCP/OAuth/IA e testes de isolamento passarem; o inventário de endpoints/variáveis estiver atualizado; e houver uma validação funcional no ambiente de testes. CI verde sozinho não comprova fluxos externos funcionando.
