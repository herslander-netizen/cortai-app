# Botão “Agora” composto no pé da Agenda

## O que será alterado
- Substituir a faixa móvel atual do celular por um botão composto fixo no canto inferior esquerdo, acima da barra inferior.
- Manter o botão “+” exatamente onde está e preservar o respiro de 96 px já aplicado.
- A parte “mira + Agora” ficará sempre visível e levará à linha rosa do horário atual.
- A parte direita alternará Timeline e Lista, mantendo a persistência e o controle de estado existentes.
- O computador continuará com o seletor Timeline/Lista/Semana no cabeçalho, sem o novo botão.

## Interação e acessibilidade
- Usar o ícone `Crosshair` já disponível no conjunto de ícones do projeto.
- Dividir o controle em duas áreas tocáveis com nomes acessíveis independentes.
- Aplicar somente opacidade por 120 ms na troca do ícone; com “reduzir movimento”, trocar sem animação.
- Na Lista, o comando “Agora” mudará para Timeline e então centralizará a linha atual; na Timeline, apenas centralizará.

## Arquivos
- Criar `src/components/barbeiro/agenda/BotaoAgoraPrincipal.tsx` e seu teste.
- Ajustar `AgendaOperacional.tsx`, `AgendaTimeline.tsx` e `styles.css` somente onde necessário.
- Remover o uso da faixa anterior sem tocar no botão “+” nem no restante da Agenda.

## Validação
- Testar presença e as duas zonas do botão em 390 px e ausência em 1280 px.
- Validar alternância Timeline/Lista, rolagem suave/direta e redução de movimento.
- Rodar todos os testes, verificação de tipos e confirmar o build automático.
- Não publicar.
