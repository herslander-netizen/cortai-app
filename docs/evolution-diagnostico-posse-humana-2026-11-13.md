# Evolution — auditoria da posse humana (13/11/2026)

## Evidência real da PRÉVIA (consultas SELECT, sem envio)

- Conta de homologação tem uma conexão Evolution vinculada ao WhatsApp terminado em **1983**.
- Em 13/11/2026, por volta de 07:47:49 UTC, um contato de WhatsApp terminado em **7208** pediu atendimento humano.
- Às 07:47:58 UTC, o `flow_bot_rastro` registrou `motivo=encaminhada`, `modo=ligado`, `enviado=true` e uma resposta. Uma comparação por igualdade de texto confirmou que essa resposta é a mensagem **enviada pelo Flow Bot** às 07:48:03 UTC. Não foi um segundo fallback da contingência.
- A mesma conversa tinha `modo_humano_ate=2026-11-13T09:47:55.542Z`. Em consulta às 07:53 UTC, o prazo ainda estava em vigor. `humanoNoControle` retorna verdadeiro se `modo_humano=true` **OU** se `modo_humano_ate` for uma data futura. Assim, `modo_humano=false` e `ia_ativa=true` não significam que a pausa temporária falhou.
- Às 07:49:38 UTC, uma mensagem contendo a frase de teste de atendimento humano foi recebida do próprio contato **7208**, com `direcao=entrada`. Não era uma saída `fromMe` do número conectado **1983**. Seu conteúdo não pode ser usado como prova de autoria da equipe.
- A sessão Evolution associada à conversa estava `conectado`. Não há evidência de troca indevida de tenant ou sessão neste episódio.

**Conclusão:** o teste de handoff automático gerou o aviso previsto e a pausa temporária; **o teste de tomada de posse pelo celular da equipe ainda não foi executado com sucesso**, pois a mensagem de prova não saiu da conta do estabelecimento. O webhook deve confiar em `key.fromMe` somente com mensagem de saída real, nunca no texto da mensagem.

## Defeito de código confirmado e mitigação

Na rota `src/routes/api/public/whatsapp/evolution.ts`, o ramo `key.fromMe=true` invocava `registrarRespostaDoNegocio` para qualquer evento do contato, mesmo um `protocolMessage` (leitura), reação, `senderKeyDistributionMessage`, envelope vazio ou `type=append` (histórico). O projeto **já tinha** o predicado `eventoComMensagemDeSaidaReal` e testes unitários, mas o webhook não o aplicava.

O patch conecta esse predicado ao ramo do webhook e adiciona regressões diretamente ao handler HTTP:

1. Recibos, reações, sincronização e histórico `fromMe` jamais sinalizam intervenção humana.
2. Texto que diz ser da equipe, mas vem como `fromMe=false`, continua entrada de cliente e não assume o atendimento.
3. Mensagens reais de texto e áudio `fromMe=true` continuam chegando a `registrarRespostaDoNegocio`, que deve distinguir eco do Flow por ID do provedor.

Não muda banco, credenciais, Railway, Evolution nem conteúdo de mensagens.

## Homologação real ainda necessária

1. Usar **dois dispositivos**: cliente escreve do WhatsApp externo e recebe a resposta/encaminhamento; profissional responde **a essa conversa, a partir do WhatsApp conectado como estabelecimento**.
2. Conferir o evento da mesma instância: `messages.upsert` com `key.fromMe=true` e `key.remoteJid` do cliente; a mensagem precisa ter conteúdo real (não `type=append`).
3. Confirmar no Supabase de prévia `mensagens_whatsapp.direcao=saida`, `gerada_por_humano=true` e `conversas_whatsapp.modo_humano_ate` futuro. A flag `modo_humano` pode continuar falsa durante a pausa por prazo, por design.
4. Mandar uma mensagem adicional do cliente durante a pausa e comprovar que **não houve resposta automática concorrente**. Verificar `flow_bot_rastro`, `mensagens_whatsapp` e os logs de atendimento sem expor conversas/telefones.
5. Diferenciar eco de envio automático (`fromMe=true` e ID igual ao gerado pelo Flow), que **não** deve iniciar nova pausa.
6. Somente após essa validação, marcar o handoff real como homologado.

Nenhuma ação remota de reconexão, envio, alteração de status ou desbloqueio de contato foi efetuada nesta investigação.
