# Agenda operacional mobile-first

## Resultado
Transformar a Agenda atual em um painel diário de operação, preservando consultas, permissões, tempo real, fila, comanda e máquina de estados já existentes.

## O que será construído
- Trocar o cabeçalho interno por navegação compacta entre dias, com setas, data no formato `QUI · 24 SET` e atalho `Hoje`.
- Exibir atendimentos `na_cadeira` em blocos AGORA empilhados, com cliente, serviço, profissional, tempo decorrido/previsto e barra de progresso dourada que muda para brick ao ultrapassar a duração.
- Mostrar observação relevante da ficha técnica como alergia somente quando esse dado já estiver cadastrado; não criar informação clínica nova.
- Exibir PRÓXIMO e DEPOIS com horário, serviço e estado. Quando um atendimento em curso ultrapassar o início do próximo, calcular a espera e oferecer `Avisar [nome]` por WhatsApp com mensagem pronta, usando o telefone já cadastrado.
- Criar a alternância `Lista | Timeline`, mantendo Lista funcional e deixando Timeline marcada como próxima etapa, sem criar uma visualização incompleta.
- Representar todos os estados com ícone, texto e cor: Agendado, Chegou, Na cadeira, Finalizado, Cancelado e Não compareceu.
- Aplicar os estados vazios pedidos para o intervalo livre e para um dia sem agenda.
- Após 15 minutos de tolerância, mostrar `Não chegou?`, com ações para marcar `nao_compareceu` ou aguardar. A tolerância ficará centralizada na leitura da Agenda com padrão de 15 minutos; se não houver configuração persistida existente, esta entrega não adicionará uma nova tela de configurações.
- Fixar a ação principal acima da área segura do celular, sempre com tesoura:
  - sem seleção: folha com Atendimento manual, Chamar próximo da fila, Novo agendamento e Bloquear horário;
  - selecionado/agendado ou chegou: `Iniciar [nome]`;
  - na cadeira: `Finalizar [nome]`, abrindo o fechamento de comanda atual.
- Ao iniciar um segundo cliente, perguntar uma única vez se deve finalizar o atendimento aberto ou manter os dois.
- Tornar o toque no nome um acesso à ficha existente do cliente.

## Comportamento e segurança
- Reutilizar `mudarEstadoAtendimento`; horários reais continuam sendo gravados pelo servidor e sincronizados em tempo real.
- Aplicar atualização otimista no toque e reverter se a gravação falhar.
- Depois de cada transição, oferecer `Desfazer` por 5 segundos, voltando ao estado anterior pela mesma função segura.
- Invalidar apenas as consultas da Agenda afetadas, sem duplicar listeners ou criar um segundo fluxo de atendimento.
- Cancelados e faltas continuarão visíveis na lista do dia, mas nunca como atendimento atual.

## Arquivos e validação
- Evoluir o módulo compartilhado da Agenda e, se necessário, pequenos componentes locais focados em estado, bloco AGORA e ação fixa.
- Ampliar somente a projeção de dados da Agenda necessária para duração real, telefone e ficha técnica; sem nova tabela.
- Adicionar tokens/classes semânticos específicos da operação ao tema existente.
- Validar em celular: Agendado → Na cadeira → Finalizado, Desfazer em cada transição, dois atendimentos simultâneos, WhatsApp de atraso, perfil do cliente, estados vazios e tempo real em outra aba.
- Conferir tipos, testes e build, preservando o único carregamento sob demanda da Agenda.

## Fora desta etapa
- A visualização Timeline completa.
- Novos campos clínicos ou interpretação médica da ficha técnica.
- Um novo módulo de bloqueios caso nenhum fluxo de bloqueio já exista; nesse caso, a ação levará ao controle de horários existente.
