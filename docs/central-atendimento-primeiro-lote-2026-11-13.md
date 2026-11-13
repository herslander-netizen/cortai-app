# Flow — Central de Atendimento (lote 1)

Data: 13/11/2026. Branch-base oficial da prévia: `cloudflare-workers-migration-2026-10-13`.

## Escopo implementado no PR #75

- Nova aba **Conversas** na tela já existente `/barbeiro/cortai-atividade`. Não cria projeto, banco ou aplicativo paralelo. Mantém abas Envios, Flow IA e Conexão.
- Lista até 40 conversas reais da barbearia, filtros por cinco situações operacionais, busca por nome ou últimos quatro dígitos, histórico de 50 mensagens da conversa e até oito agendamentos vinculados a um `cliente_id` real (com nome do serviço). **Sem vínculo de ficha não associa pessoas apenas porque o telefone se parece.**
- Origem da mensagem apresentada com base nos metadados: cliente (entrada); equipe (`gerada_por_humano=true`); Flow IA (`gerada_por_ia=true`); **Automação do Flow** (`saida` sem os indicadores anteriores). Não chama toda automação determinística de Flow Bot sem prova.
- Comandos explícitos no painel, com confirmação, persistência e auditoria:
  - **Assumir:** `status='humano'`, `modo_humano=true`, `modo_humano_ate=NULL`. IA/bot silenciosos nessa conversa; sem mexer no interruptor global.
  - **Liberar IA:** `status='ativa'`, `modo_humano=false`, `modo_humano_ate=NULL`, `ia_ativa=true`. A habilitação global/plano ainda controla se haverá resposta.
  - **Resolver:** `status='encerrada'`, `modo_humano=true`, `modo_humano_ate=NULL`, `ia_ativa=false`. Só comando explícito reabre.
- Backend usa `requireSupabaseAuth` + vínculo ativo `tenantIdDoMembro` + `ver_cortai` para leitura e `gerenciar_whatsapp` + recurso `secretaria_whatsapp` para escrita. TODAS as consultas com admin têm `tenant_id` explícito. Atualização com `atualizado_em` da tela evita sobrescrever a intervenção de outro aparelho; em conflito, pede releitura.
- O helper `humanoNoControle` e a proteção final de contingência passam a respeitar, além da flag e do prazo, os valores reais `status='humano'` e `status='encerrada'`. São controles de SILÊNCIO por conversa, não decisão sobre quem mandou o evento Evolution.
- Deep-link antigo `/barbeiro/cortai?aba=conversas` agora direciona à aba principal de Conversas da tela Atividade.

## Evidência de esquema — Supabase PREVIEW, somente leitura

`conversas_whatsapp_status_valido` aceita apenas `ativa | humano | encerrada`. Há `atualizado_em NOT NULL DEFAULT now()` com trigger `conversas_whatsapp_atualizado_em` (BEFORE UPDATE), além do índice `idx_conversas_whatsapp_tenant` sobre `(tenant_id, ultima_mensagem_em DESC)`. Nenhuma migration foi gerada/aplicada.

## Limites

- A classificação visual **Nova** é baseada na amostra recente de mensagens, não na prova de inexistência de todo o histórico. A listagem consulta no máximo 300 mensagens recentes entre até 40 conversas; uma conversa muito ativa pode reduzir a amostragem das demais. Tratar isso como triagem, não como informação de auditoria definitiva.
- A tela **não envia mensagens nem faz ações de agenda diretamente**; preserva os fluxos oficiais do Flow Bot, Flow IA e agenda. Histórico detalhado de regras acionadas, rastro de decisões, construtor AutoResponder e composição de respostas ficam para próximos lotes.
- Alterações via comando precisam ser validadas no aplicativo autenticado e em dispositivos simultâneos. CI/testes puros não substituem a prova de bloqueio no webhook Evolution.
- Nenhuma credencial, número completo, texto privado de conversa ou segredo vai para logs de aplicação/auditoria.
- **PR em rascunho** até testes de UX mobile e fluxo real. Sem alteração em produção ou banco de prévia.

## Plano de homologação em dois números, sem terceiros

1. Abrir a Central autenticada no estabelecimento de testes e confirmar que ela apresenta somente conversas desse tenant, inclusive com nomes longos e viewport estreito (360/390px), e que funcionário sem `gerenciar_whatsapp` só vê, não altera.
2. Cliente envia do WhatsApp secundário uma solicitação; acompanhar o Flow Bot na conversa.
3. No painel, escolher **Assumir** e confirmar persistência de `status=humano` e `modo_humano=true`. Cliente manda nova mensagem: garantir que NÃO haja resposta automática adicional. A central permanece aberta após recarregar.
4. Responder pelo **WhatsApp efetivamente conectado**; conferir `fromMe=true` e `gerada_por_humano=true` no registro, sem confundir mensagem pessoal com mensagem da empresa.
5. Testar controle simultâneo em dois navegadores. Uma operação com `atualizado_em` desatualizado deve retornar conflito, nunca sobrescrever a outra decisão.
6. Marcar **Resolver**, enviar texto do cliente e comprovar silêncio. Verificar status `encerrada` persistido e exibição **Resolvida**.
7. Selecionar **Liberar IA**; confirmar `ativa`, `modo_humano=false` e resposta apenas se automação global/plano realmente permitirem. Verificar que o estado não vaza para outro tenant.
8. Medir entrada e detalhes no Android real; revisar rolagem do histórico, teclado, ações e estado vazio. Não promover para produção sem evidência e revisão das interações.

## Próximos lotes

1. Tornar a leitura da última mensagem por conversa exata e paginada (e não amostrada) em backend de leitura, com índice existente ou RPC revisada.
2. Criar rastreabilidade por evento: regra acionada, rastro Flow Bot/IA, entrega confirmada pelo provedor e ações gravadas no calendário.
3. Criar editor guiado das regras com versão, simulação, aprovação e fallback, sem enviar diretamente ou burlar o consentimento de WhatsApp.
4. Refinar UX mobile/desktop após inspeção visual autenticada da prévia.

## Continuação de segurança — 13/11/2026 (PR #75)

A revisão dos pontos de envio descobriu que `processarMensagemRecebida` consultava a posse humana apenas ao chegar no Bot/IA/contingência, mas **respostas contextuais a lembretes e áudios ocorrem antes**. A nova barreira é executada depois de persistir a mensagem de entrada e atualizar a conversa, porém antes das respostas automáticas contextuais. Ela consulta novamente `status, modo_humano, modo_humano_ate` por tenant + conversa, e falha fechada se não houver leitura confiável.

A posse é **por conversa**, inclusive para telefone pessoal que eventualmente seja verificado como membro da equipe. O bot e a Flow IA também deixam de ignorar `humanoNoControle` quando o remetente for equipe, pois uma conversa assumida/resolvida não pode receber respostas automáticas por classificação do remetente. Identidade verificada continua determinando o acesso aos fluxos internos da equipe em conversas **ativas**, não a permissão para burlar uma pausa explícita.

O comando da Central foi isolado em `src/lib/whatsapp/comandos-central.ts` para permitir testes determinísticos. `comandos-central.test.ts` cobre os três estados, tenant errado, timestamps obsoletos, corrida no UPDATE condicional, erro de banco e ordem da autenticação/autorização/recurso no servidor. Há também um teste de arquitetura que confirma a barreira no caminho de recebimento **antes** das respostas a lembretes/áudio.

Limitações persistentes: não houve teste visual autenticado, conexão via navegador ou envio real de WhatsApp; CI e mocks não representam um webhook de produção nem fazem prova de entrega humana. Antes de integrar à prévia, homologar o roteiro acima. O código acrescenta uma proteção de processamento, mas não representa trava transacional em cada ponto possível de saída: concorrências entre a leitura de posse e o envio efetivo devem continuar sob avaliação.
