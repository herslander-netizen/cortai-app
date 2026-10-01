# Agenda operacional e Minha assinatura

## Resultado
A Agenda passa a ser a tela de operação principal no celular, com uma ação evidente por estado, sequência contínua e acesso rápido a encaixe, bloqueio, cliente e fila. No computador, Timeline continua principal e Lista permanece disponível. A área Minha assinatura passa a mostrar e operar os dados reais da cobrança Cortaí já integrados ao Asaas, sem misturar com pagamentos de atendimentos.

## Agenda
- Tornar o Modo Foco a experiência padrão em telas móveis, preservando a saída para a visão completa e as visualizações Timeline/Lista no tablet e computador.
- Reorganizar o cockpit em Agora, Próximo, alertas/fila, tempo livre acionável e restante do dia.
- Reutilizar as transições oficiais para chegada, início, finalização/comanda, falta, cancelamento e remarcação; nenhuma nova regra de disponibilidade será criada.
- Exibir CTAs grandes e explícitos conforme o estado real. Ações ainda não suportadas pelo motor atual, como pausar ou adicionar serviço durante atendimento, só serão mostradas se já houver operação segura correspondente.
- Manter contador/progresso, linha Agora, auto-scroll, arrasto, troca de dia, desfazer, atualização em tempo real e cache seguro.
- Ampliar o menu principal para Novo agendamento, Encaixar cliente, Bloquear horário e Novo cliente, retornando sempre ao contexto da Agenda.
- Integrar visualmente fila, previsão do dia, alertas reais e horários livres sem excesso de cartões.

## Minha assinatura
- Evoluir a tela de plano para Minha assinatura, mantendo a tabela comercial e separando-a do caixa e das comandas.
- Criar funções autenticadas para ler assinatura, cobrança em aberto, histórico e dados de cobrança mascarados, sempre limitados ao negócio do usuário.
- Reutilizar o cliente Asaas somente no servidor para criar cliente, assinatura e primeira cobrança; valores continuarão recalculados no servidor.
- Exibir plano, valor, ciclo, status, próxima cobrança, método e histórico, com ações contextuais para escolher plano, regularizar, gerenciar ou reativar.
- Preservar webhook idempotente, deduplicação, varredura, isolamento por negócio e estados reais do backend.
- Quando a cobrança real não estiver configurada, mostrar um estado claro e seguro, sem simular conexão nem pedir chave no navegador.

## Validação
- Exercitar Agenda em 390 px e 1280 px, incluindo abertura/fechamento das folhas e retorno ao contexto.
- Exercitar Minha assinatura autenticada sem criar cobrança real ou alterar dados da conta de demonstração.
- Conferir ausência de sobreposição, scroll preso, botões cortados, erros de console e rotas quebradas.
- Rodar tipos, lint dos arquivos alterados, testes e build. Nada será publicado.

## Limites seguros
- Sem alterações destrutivas, migrações ou mudanças em RLS/RPCs.
- Sem chave do Asaas no navegador e sem inventar credenciais.
- A operação da Agenda não será bloqueada por avisos de plano.
- Pausar atendimento e adicionar serviço não serão improvisados se o backend atual não tiver suporte transacional seguro.
