# Ajustes finais do botão “Agora” da Agenda

## Alterações
- Fazer o ícone indicar a visualização de destino e trocar com animação curta usando os movimentos oficiais; reduzir movimento terá apenas troca seca ou esmaecimento breve.
- Compartilhar com o botão “+” uma variável de posição móvel, alinhando ambos em 50 px e respeitando a área segura inferior.
- Fazer “Agora” voltar ao dia de hoje quando necessário sem alterar a visualização escolhida.
- Na Timeline, centralizar a linha atual; na Lista, rolar ao primeiro atendimento em aberto ou ao topo quando não houver.
- Expirar pedidos de rolagem pendentes em até 2 segundos.

## Escopo técnico
- Alterar `BotaoAgoraPrincipal.tsx`, seus testes, `pilula-agora.ts`, seus testes e somente o CSS da cápsula/posição compartilhada.
- Em `AgendaOperacional.tsx`, passar apenas o estado e as ações necessárias, sem adicionar lógica.
- Manter intactos barra inferior, botão “+”, menu, cabeçalho, controles existentes e regras de negócio.

## Validação
- Validar interações e posicionamento em 390 px, inclusive área segura simulada de 34 px.
- Confirmar ausência da cápsula e preservação do computador em 1280 px.
- Rodar testes, verificação automática e build; não publicar.
