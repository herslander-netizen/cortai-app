# Integrações e plugins — arquitetura portátil

Objetivo: manter o Flow independente de qualquer fornecedor e permitir conectar/desconectar serviços sem reescrever regras de negócio. Esta especificação não significa que todos os conectores estejam implementados ou conectados.

## Conectores previstos

| Área | Provedores/serviços | Estado |
|---|---|---|
| Código e automação | GitHub, GitHub Actions | Conectado; CI ativo |
| Hospedagem e preview | Cloudflare Workers + Wrangler | Workflow preparado; preview ainda não publicado |
| Dados, autenticação e arquivos | Supabase | Projeto novo isolado; migrations ainda não aplicadas |
| WhatsApp | Evolution API, Z-API, Meta Cloud API, gateway genérico | Webhook só aceita entregas assinadas pela Meta (X-Hub-Signature-256); envio direto pela Cloud API |
| IA | OpenAI, Anthropic/Claude, Google Gemini | Variáveis reservadas; conectores precisam ser validados |
| Pagamentos | Asaas | Variável reservada; integração não validada |
| Assistentes de código | ChatGPT, Codex, Claude Code, GitHub | Ferramentas externas; nenhuma chave deve ficar no frontend |
| Desenvolvimento remoto | Codespaces ou ambiente web equivalente | Opção de trabalho; não é dependência de runtime |

## Regras para novos plugins

1. Um conector por provedor e uma interface estável por capacidade. Não espalhar chamadas específicas de fornecedor nas telas.
2. Cada conector deve implementar healthCheck, capabilities e operações tipadas; quando aplicável, suportar timeout, retry limitado, idempotência e logs sem segredos.
3. Credenciais apenas em secrets do ambiente de execução (Cloudflare secrets/GitHub Actions secrets/Supabase secrets). Nunca em commits, logs, localStorage ou variáveis VITE_*.
4. Webhooks devem validar assinatura/segredo, limitar tamanho, rejeitar replay quando houver timestamp/nonce e gravar eventos duráveis antes de responder sucesso.
5. Cada conexão por estabelecimento/tenant deve ter escopo explícito; nunca usar credenciais globais para agir em nome de outro tenant.
6. Novos conectores devem ter modo mock/teste, testes de contrato e documentação de configuração.
7. O aplicativo deve continuar inicializando quando um conector opcional estiver ausente. Exibir estado “não configurado” em vez de falhar a aplicação inteira.
8. Para dispositivos: usar OAuth ou tokens revogáveis quando disponível; QR de WhatsApp deve ser tratado como segredo temporário e nunca persistido em logs. Não guardar tokens no navegador.
9. Configuração de frontend só pode conter valores públicos. Segredos do servidor nunca recebem prefixo VITE_.
10. Não alterar domínios, produção ou banco até validar o preview isolado.

## Contrato recomendado para provedores

- WhatsApp: connect/status/disconnect/sendMessage/sendMedia/verifyWebhook; detalhes de sessão e QR ficam dentro do adaptador do provedor.
- IA: generateText/streamText, limites, timeout, identificação do modelo e trilha de auditoria.
- Pagamento: createCheckout/getPaymentStatus/handleWebhook/refund, com idempotência.
- Armazenamento: upload/getSignedUrl/delete, com políticas tenant-aware.
- Notificações: sendEmail/sendWhatsApp/sendPush com preferência e opt-out por tenant/usuário.
- Ferramentas/plugins de IA: lista explícita de ferramentas, schemas Zod, autenticação e autorização por operação; nenhuma execução arbitrária de código ou SQL.

## Como adicionar um conector

1. Criar o adaptador em src/integrations/<capacidade>/<provedor>.ts.
2. Definir interface e tipos sem importar UI.
3. Registrar o provedor numa fábrica central, com seleção por configuração.
4. Validar configuração na inicialização e fornecer erro acionável sem expor segredos.
5. Criar testes de contrato/mock e testes de isolamento por tenant.
6. Documentar as variáveis neste arquivo e em .env.example.
7. Executar CI; só depois ativar credenciais em ambiente de preview.

## Variáveis

O arquivo .env.example contém apenas nomes de variáveis sem valores secretos. Copie para um ambiente privado de desenvolvimento e preencha com credenciais próprias. Não commitar um .env real.

## Limitações atuais

- Este documento e o template de ambiente preparam o caminho; não afirmam que todos os provedores estão prontos.
- Evolution, Z-API, Meta, Asaas e provedores de IA precisam de testes reais com credenciais e webhooks de teste.
- Login com Google/Apple direto pelo Supabase Auth (`src/lib/auth/entrar-com-provedor.ts`); consentimento OAuth de assistentes (MCP) em `/oauth/consentimento`.


## Webhook da Meta

O endpoint `/api/public/whatsapp/webhook` aceita só entregas da Meta, com a assinatura `X-Hub-Signature-256` conferida em tempo constante sobre o corpo cru (`META_APP_SECRET`/`META_WHATSAPP_APP_SECRET`), limite de tamanho do corpo e idempotência pela caixa de entrada `whatsapp_webhook_events`. Entrega sem assinatura é recusada.
