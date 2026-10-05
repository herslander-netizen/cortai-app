# Correção cirúrgica do botão “+” da Agenda

## Objetivo
Consolidar o posicionamento, tamanho e empilhamento do botão “+” e do menu de ações, sem alterar ações, regras da Agenda ou outras telas.

## Alterações
- Remover as definições históricas duplicadas de `.agenda-acao-fixa` e `.agenda-acao-redonda` e manter uma única fonte de verdade no bloco atual da Agenda.
- Compartilhar as mesmas variáveis geométricas entre o “+”, o controle “Agora” e a lista do menu, incluindo margem inferior e área segura.
- Manter o “+” acima do fundo escurecido, com as opções acima do botão e limitadas à altura útil da tela.
- Garantir espaço inferior real em `.agenda-operacional`, sem alterar a rolagem da Timeline nem o comportamento desktop.
- Preservar callbacks e ações atuais; complementar testes somente para interação e acessibilidade do menu, se necessário.

## Validação
- Conferir fechado, aberto e fechamento por animação.
- Testar FAB, fundo escurecido, Escape e cada ação.
- Inspecionar 320, 390, 430, 768 e desktop.
- Executar testes da Agenda, checagem de tipos e compilação.
- Revisar o diff final, confirmar ausência de alterações funcionais/banco e informar o commit gerado.

## Detalhes técnicos
A correção ficará restrita a `BotaoAgoraPrincipal.tsx`, `MenuAcoesAgenda.tsx`, `src/styles.css` e, se necessário, testes diretamente relacionados. O CSS usará um único conjunto de variáveis para tamanho, margens e referência inferior do conjunto flutuante.
