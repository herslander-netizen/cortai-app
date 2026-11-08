# Padrão Flow — apresentação, atendimento e encerramento pelo WhatsApp

Atualizado em 08/11/2026. Escopo: prévia do Flow. Aplicável a textos de Flow Bot, Flow IA, Flow Core e, quando autorizada a integração, notificações e agentes. **Não modifica** política de consentimento, templates aprovados, janela oficial de 24 horas ou regras da Agenda.

## Objetivo

A mesma conversa deve parecer um único atendimento, ainda que passe entre regras, IA e profissional. Cada mensagem deve ter propósito claro. A confirmação final é obrigatória depois de uma operação realmente concluída, mas não deve ser seguida de outro menu ou de perguntas supérfluas.

## Formatação nativa

- Negrito: *Serviço:* Corte; use em títulos, datas, horário, preço e confirmação.
- Itálico: _Você também pode informar outro dia_; use em orientações opcionais.
- Riscado: ~terça-feira às 15h~; use **somente após** uma remarcação efetivada, nunca em uma reserva ainda ativa.
- Monoespaçado: use apenas para códigos e protocolos curtos; não transforme mensagens completas em blocos de código.
- Listas: opções com *1)*, *2)*, *3)*, uma linha por item, para evitar recuos indesejados em clientes WhatsApp. O renderizador central já normaliza listas comuns.
- Citação: > Você prefere às 15h; apenas quando a repetição de informação do cliente ajuda a esclarecer uma correção. Nunca use citação em toda mensagem.
- Emojis: geralmente zero a dois por mensagem. Exemplos: 👋 boas-vindas, 📋 menu, 🕒 horários, 📍 endereço, ✅ operação confirmada, ⚠️ erro real. Não há emoji para toda frase.
- Não usar CAPS LOCK em parágrafos, pseudo-fontes Unicode, formatação aninhada pouco confiável, spoiler ||texto|| ou muitos sinais de exclamação.
- Stickers são *mídia*, não texto. Só enviar quando houver suporte explícito no provedor, consentimento/contexto, arquivo apropriado e testes; **não enviar stickers automaticamente em etapas críticas do agendamento**.
- Não reformatar manualmente saídas já convertidas pela função central paraWhatsApp; evitar novos renderizadores concorrentes.

## Conversa de agendamento

1. Cumprimentar brevemente e oferecer agendamento na conversa, sem obrigar o cliente a abrir site.
2. Aproveitar informações contidas no texto ou áudio do cliente. Perguntar **uma coisa por vez** e somente o que falta.
3. Mostrar serviços disponíveis e preço real; perguntar profissional somente se houver escolha.
4. Oferecer horários reais da agenda. Se não houver vaga, conservar serviço/profissional e aceitar outra data.
5. Mostrar resumo com serviço, profissional, data, horário, valor e pedir SIM/NÃO.
6. Depois de SIM, executar a ação oficial e conferir seu resultado. Uma reserva só pode ser tratada como confirmada **quando a agenda a registrou**. Repetição de webhook e repetição de SIM não podem duplicar a operação.
7. Emitir **uma** mensagem final com ✅, título, dados reais, agradecimento, possibilidade de remarcar/cancelar. Não acrescentar automaticamente "Algo mais?" ou menu de opções.
8. Quando o cliente disser "obrigado" ou "tchau", responder brevemente se elegível e então encerrar, sem reabrir menu. Honrar SAIR e pedidos de pessoa.
9. Em remarcação/cancelamento, apresentar mensagem distinta e somente após operação efetiva. Horário antigo riscado apenas depois de remarcação concluída.
10. Se o profissional assumir a conversa, bot/IA silenciam por cliente. As exceções transacionais devem ser coordenadas pelo gateway de envio e nunca duplicadas.

## Incidentes de confirmação

- **Não gravou:** nunca dizer que confirmou. Explicar ou encaminhar à equipe.
- **Gravou e não enviou a mensagem:** manter a reserva; marcar a entrega pendente no rastro/atividade; recuperar depois de consultar a reserva real e a evidência de envio, sem executar outra criação de agendamento.
- **Ambiguidade (API aceitou mensagem mas não devolveu confirmação):** não reenviar sem idempotência ou verificação do provedor.
- **Contexto permanece em confirmar:** corrigir estado e prevenir que um segundo SIM faça nova gravação; manter trilha de auditoria.
- **Mensagem repetida do webhook:** consultar idempotência antes de executar ação, não depois.
- **Falha na IA:** não afirmar "a equipe está indisponível" sem confirmação. Evitar fallback que reabra menu durante atendimento humano.
- **Janela oficial:** fora das 24 horas após a última mensagem do cliente, mensagens livres da API oficial não devem ser disparadas; usar somente template aprovado adequado e consentimento, conforme regras vigentes.

## Testes mínimos

Agendamento por número, texto e áudio; um e muitos profissionais; cliente novo e existente; sem vagas e outro dia; escolha e negativa; SIM duplicado; operação gravada com envio falho; remarcação/cancelamento; serviço/horário/preço divergentes; humano assumindo; menu expirado; janela oficial fechada; SAIR; template inexistente; texto com negrito, itálico, riscado, listas, citação, emojis e código.

Os testes puros dos componentes de conversa estão em src/lib/flow-bot/agenda-na-conversa/*.test.ts. O renderizador de todas as mensagens livres permanece em src/lib/whatsapp/formatacao.ts (escopo reservado pela Claude, não modificar sem coordenação). Testes integrados de entrega e publicação da prévia ainda são exigidos.

## Referências externas

- WhatsApp Help Center: https://faq.whatsapp.com/539178204879377/?locale=pt_BR
- Google Conversation Design, confirmação: https://developers.google.com/assistant/conversation-design/confirmations
- Google Conversation Design, encerramento: https://developers.google.com/assistant/conversation-design/endings
- Política WhatsApp Business: https://whatsappbusiness.com/policy/
