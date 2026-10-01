# Agenda fluida, painel organizado e fila segura

## Objetivo
Corrigir apenas os atritos confirmados da timeline e reorganizar o painel de atendimento, preservando o motor oficial, o desfazer, as permissões e o comportamento já existente da lista de espera.

## Estado confirmado
- A timeline usa pressão prolongada de 300 ms para iniciar o arrasto e o toque em área vazia não registra o deslocamento anterior ao clique.
- No celular, a timeline deixa de ter rolagem interna; por isso, “Voltar para agora” precisa posicionar a rolagem da página.
- A dica de toque/arrasto é ocultada permanentemente por uma preferência local.
- O painel reúne ações operacionais, contato e ajustes com o mesmo peso; há WhatsApp, mas não há ligação direta.
- Cancelamento confirmado já possui confirmação específica; “Falta” ainda é executado diretamente.
- A lista de espera já possui `posicao`, oferta compatível, expiração, aceite atômico, marcação da origem e notificações. Ela foi projetada para nunca reservar sem confirmação do cliente.
- Hoje, cancelamentos e remarcações futuras podem gerar oferta. “Não compareceu” não gera oferta, pois normalmente o horário já começou ou passou.

## Fase 1 — Timeline
1. Registrar a origem e o deslocamento do toque na própria área vazia; só abrir novo agendamento quando o gesto permanecer dentro da tolerância de 6 px.
2. Aumentar a pressão prolongada de 300 ms para 400 ms e cancelar sua ativação assim que o gesto indicar rolagem vertical.
3. Preservar o arrasto por mouse e o encaixe em intervalos de 15 minutos, sem alterar a validação oficial da remarcação.
4. Fazer “Voltar para agora” usar a rolagem interna no desktop e posicionar a página no celular.
5. Trocar a dica descartável por uma orientação curta e discreta junto à timeline, sempre disponível sem cobrir horários.
6. Manter feedback tátil somente quando suportado e acrescentar confirmação visual curta após um arrasto válido, sem criar animação pesada.

## Fase 2 — Painel de atendimento
1. Destacar uma única ação principal por estado:
   - agendado: “Cliente chegou”;
   - chegou: “Iniciar atendimento”;
   - em atendimento: “Concluir atendimento”.
2. Exibir telefone somente como ação contextual, sem duplicar dados sensíveis: “Ligar” (`tel:`) e “WhatsApp” lado a lado quando houver número válido.
3. Agrupar “Comanda” e “Notas do cliente” como ações de registro.
4. Colocar “Remarcar”, “Falta” e “Cancelar” em uma seção secundária claramente separada.
5. Manter a confirmação existente ao cancelar quem confirmou pelo WhatsApp e adicionar confirmação para “Marcar falta”.
6. Preservar o formulário e a verificação oficial de conflito ao remarcar.

## Fase 3 — Lista de espera, sem duplicar o motor
1. Não criar `useFila`, novo trigger ou `processarCancelamento`: a estrutura equivalente já existe e criar outra produziria concorrência e regras paralelas.
2. Manter o fluxo seguro atual: vaga liberada → primeiro cliente compatível → WhatsApp com prazo → aceite → criação atômica do agendamento.
3. Garantir que cancelamentos feitos pelo cliente também acionem a oferta existente, pois esse caminho atualmente apenas cancela e notifica.
4. Não oferecer vaga após “falta” quando o horário já começou; aplicar a regra existente de antecedência e disponibilidade real.
5. Manter a identificação “Vaga preenchida pela lista de espera” para transparência operacional e suporte, sem expor isso ao cliente de forma desnecessária.
6. Reaproveitar as notificações internas e a Secretária Cortaí existentes; falha de WhatsApp continuará sem interromper cancelamento ou agenda.

## Validação
- Testar em 390 px: rolar verticalmente sem abrir formulário, toque intencional em horário livre, pressão e arrasto, “Voltar para agora”, abrir/fechar painel, ligar/WhatsApp e confirmações.
- Testar em 1280 px: rolagem interna, centralização de “Agora”, arrasto por mouse, colunas por profissional e painel lateral.
- Cobrir com testes os limiares de gesto e o acionamento da oferta no cancelamento do cliente.
- Executar verificação de tipos, lint dirigido, testes e build; conferir erros de console e não publicar.

## Limites
- Sem mudança de plano, cobrança, autenticação, dados existentes ou regras de disponibilidade.
- Sem reserva automática e silenciosa: isso contrariaria o consentimento do cliente e o fluxo já consolidado da lista de espera.
- Sem novas colunas: `posicao`, carimbo de aviso e origem da fila já existem; o aceite já registra quando a oferta foi respondida e qual agendamento foi criado.
