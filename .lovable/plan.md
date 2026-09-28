# Agenda móvel em modo foco

## Resultado
A agenda do barbeiro passa a abrir no celular como uma timeline operacional em tela cheia, utilizável com uma mão, preservando estados, comanda, permissões, tempo real e regras atuais.

## Implementação
- Fazer a rota principal da agenda ocultar no celular o cabeçalho global, a barra inferior, rodapé e elementos secundários; manter a navegação atual nas demais telas e no computador.
- Colocar um menu hambúrguer compacto no topo da agenda com apenas Perfil, Configurações e Sair.
- Simplificar o topo para dia atual, navegação entre dias, profissional e aviso flutuante do próximo cliente.
- Transformar cada horário em um bloco vertical grande com hora, cliente, serviço, profissional e estado com ícone, texto e cor semântica.
- Expor diretamente no bloco somente as ações válidas para o estado: Chamar, Confirmar chegada, Começar e Terminar. Cada ação terá no mínimo 50 px, resposta otimista e Desfazer quando aplicável.
- Usar toque longo no bloco para abrir as opções existentes de Remarcar, Cancelar, Falta, WhatsApp, Comanda e ficha/notas, sem criar regras paralelas.
- Fazer a timeline ocupar a altura disponível, abrir perto do horário atual e permitir rolagem vertical natural para próximas horas.
- Adicionar um controle discreto de modo foco; quando ativo, solicitar tela cheia do navegador quando suportado e manter somente a timeline.

## Dados, desempenho e offline
- Reutilizar `mudarEstadoAtendimento`, remarcação, fechamento de comanda e o canal em tempo real já existentes.
- Ajustar a atualização de segurança para 30 segundos e manter invalidação imediata por tempo real.
- Persistir localmente a última agenda carregada por barbearia, profissional e dia para leitura sem internet; ações feitas offline ficam desabilitadas com aviso claro, evitando conflito ou gravação insegura.
- Manter carregamento anterior durante trocas de dia e reduzir conteúdo inicial no celular para priorizar a timeline.

## Validação
- Testar em 390 px com uma mão: Chamar, Chegou, Começar, Terminar, Remarcar, Cancelar e Desfazer.
- Confirmar toque longo, aviso do próximo cliente, menu mínimo, modo foco, rolagem, estado offline e reconexão.
- Conferir claro/escuro, ausência de sobreposição e rolagem lateral, alvos de toque e atualização em outra aba.
- Validar tipos, testes relevantes e build.

## Limites seguros
- “Terminar” continua abrindo a comanda existente; não pula pagamento.
- Offline fornece consulta da última agenda, mas não enfileira alterações de estado sem confirmação do servidor.
- O modo foco usa a API de tela cheia quando o aparelho permite; no PWA instalado, a própria janela já funciona sem barra do navegador.
