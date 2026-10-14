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

## Em validação — MCP e IA

### MCP e OAuth de recursos protegidos

O transporte MCP foi substituído por `@modelcontextprotocol/sdk` em `src/lib/mcp/handler.server.ts`; `src/routes/mcp.ts` agora encaminha GET/POST/DELETE para o handler próprio. O handler valida o token no Supabase, deriva o usuário e o estabelecimento no servidor, mantém as ferramentas somente leitura e aplica o limite de 31 dias e 500 agendamentos. O plugin e o pacote `@lovable.dev/mcp-js` não aparecem mais nas dependências atuais.

Ainda é necessário testar o protocolo com um cliente MCP real, os metadados OAuth, o fluxo de consentimento e os casos de token inválido/expirado e usuário sem vínculo. A substituição de código não prova compatibilidade ponta a ponta.

### Gateway de IA

- `src/lib/brain/gateway.server.ts` encaminha somente para o provedor compatível configurado ou para o modo de regras; o caminho de execução direto do gateway Lovable foi removido.
- `src/lib/ia/assistente.server.ts` usa o adaptador independente.
- `src/lib/whatsapp/transcricao.server.ts` usa endpoint de transcrição configurável e não deve recorrer ao gateway Lovable.
- `src/lib/brain/gateway-compativel.server.ts` trata ausência de `CORTAI_AI_PROVIDER` (ou valor legado `lovable`) como configuração indisponível, sem fallback automático.

A correção ainda depende de CI verde e testes de contrato. Validar resposta com ferramentas, JSON estruturado, timeout, erros HTTP, transcrição e comportamento quando nenhuma chave estiver configurada. Não ativar provedor real nem executar avaliação com credenciais sem configuração explícita do ambiente.

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
