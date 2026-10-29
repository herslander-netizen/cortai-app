# Modelos do WhatsApp (conta oficial do Flow)

Conta (WABA) 1051467980961489 · idioma `pt_BR` · categoria **UTILIDADE** em todos.
O catálogo vivo fica na tabela `modelos_whatsapp`; o status é atualizado pelo webhook.
Cada botão leva no payload `ACAO:{id do envio}` (preenchido pelo Flow no envio).

## Aprovados (não reenviar)

| Nome | Aviso | Texto | Variáveis | Botões |
|---|---|---|---|---|
| cortai_lembrete_vespera | lembrete da véspera | Olá, {{1}}! Passando para lembrar do seu horário na {{2}} no dia {{3}}, às {{4}}. Você pode confirmar, remarcar ou cancelar tocando em um dos botões abaixo. | cliente, negocio, data, hora | Confirmar · Remarcar · Cancelar |
| cortai_lembrete_dia | lembrete do dia | Olá, {{1}}! Seu horário na {{2}} está chegando: hoje, {{3}}, às {{4}}. Toque em um dos botões abaixo para confirmar, avisar que chegou, remarcar ou cancelar. | cliente, negocio, data, hora | Confirmar · Cheguei · Remarcar · Cancelar |

## Enviados à Meta em 01/10/2026 (em análise)

Todos já submetidos; o status muda sozinho no catálogo quando a Meta responder.

Em todos: Categoria **Utilidade** · Idioma **Português (BR)** · Rodapé **Enviado pelo Flow** · Botões do tipo **Resposta rápida**.

### cortai_confirmacao
Texto: `Olá, {{1}}! Seu horário em {{2}} está confirmado para {{3}}, às {{4}}. Serviço: {{5}}, com {{6}}. Se precisar, use os botões abaixo para remarcar ou cancelar.`
Exemplos: {{1}} Ana · {{2}} Studio Aurora · {{3}} 02/10/2026 · {{4}} 14:30 · {{5}} Atendimento completo · {{6}} Bia
Botões: Remarcar · Cancelar

### cortai_cancelamento
Texto: `Olá, {{1}}. Seu horário em {{2}} do dia {{3}}, às {{4}}, foi cancelado como você pediu. Quando quiser, toque no botão abaixo para escolher um novo horário.`
Exemplos: Ana · Studio Aurora · 02/10/2026 · 14:30
Botão: Remarcar

### cortai_cancelado_negocio
Texto: `Olá, {{1}}. Precisamos cancelar seu horário em {{2}} do dia {{3}}, às {{4}}, por um imprevisto. Pedimos desculpas. Toque no botão abaixo para ver outros horários disponíveis.`
Exemplos: Ana · Studio Aurora · 02/10/2026 · 14:30
Botão: Ver horários

### cortai_remarcacao
Texto: `Olá, {{1}}. Seu horário em {{2}} mudou para {{3}}, às {{4}}, com {{5}}. Toque em um dos botões abaixo para confirmar o novo horário ou escolher outro.`
Exemplos: Ana · Studio Aurora · 03/10/2026 · 15:00 · Bia
Botões: Confirmar · Remarcar

### cortai_vaga_aberta
Texto: `Olá, {{1}}! Abriu uma vaga da sua lista de espera em {{2}}: {{3}}, às {{4}}, com {{5}}. A vaga fica guardada para a sua resposta até {{6}}. Toque em um dos botões abaixo para responder.`
Exemplos: Ana · Studio Aurora · 02/10/2026 · 15:10 · Lucas · 14:40
Botões: Quero · Não posso

### cortai_falta
Texto: `Olá, {{1}}. Sentimos sua falta no horário de hoje, às {{2}}, em {{3}}. Se quiser, toque no botão abaixo para escolher um novo horário.`
Exemplos: Ana · 14:30 · Studio Aurora
Botão: Remarcar

### cortai_valor_pendente
Texto: `Olá, {{1}}. Ficou um valor de {{2}} pendente do seu atendimento em {{3}}. Toque no botão abaixo para receber a chave Pix e concluir o pagamento.`
Exemplos: Ana · R$ 45,00 · Studio Aurora
Botão: Mandar Pix

**Importante:** use exatamente estes nomes. Quando a Meta aprovar, o Flow passa a usar o modelo sozinho (o webhook marca como aprovado no catálogo).
Marketing (retorno, pós-atendimento, aniversário) não entra aqui: só com aceite do cliente e interruptor do negócio.
