# Auditoria mobile do Cortaí (somente leitura)

Nenhum arquivo, migração ou dado será alterado. Nada será publicado. A entrega é só um relatório no chat.

## Escopo
- Telas: 360x640, 390x844 e 430x932, com emulação de toque (iPhone/Android).
- A) Cliente: /agendar/demonstracao do começo ao fim (serviço, profissional, dia, horário, telefone, nome, confirmar), confirmação, alterar, cancelar, dia lotado, negócio sem horários, 3G lento e sem conexão.
- B) Barbeiro (/barbeiro): agenda de hoje, agendamento manual, serviços, horários, equipe, link, clientes, financeiro, notificações e primeiros passos. Conta autorizada barbeiro.teste@cortai.dev. O acesso depende da sua aprovação no cartão de login.
- C) PWA: manifest, ícones (maskable), theme-color, tela de abertura, service worker, offline e atualização.

## Como será feito
1. Navegação real com Playwright nos 3 tamanhos: capturas, erros de console, rolagem lateral, alvos de toque abaixo de 44px (medidos no DOM), campos com fonte abaixo de 16px, inputMode/type/autocomplete/enterKeyHint, botão voltar do aparelho dentro de fluxos e modais, e toque duplo em botões de envio. Throttling 3G e modo offline via CDP.
2. Para confirmar agendamento/cancelamento sem criar dados de verdade: interrompo pouco antes de gravar, ou só avanço se o dado for da demonstração isolada. O que ficar sem teste será marcado como tal.
3. Leitura de código onde a navegação não chega: 100vh vs dvh, safe-area, viewport-fit, estados de carregamento/erro, textos em inglês, carregamento das rotas sob demanda, tamanho do pacote inicial (só leitura do build já existente), imagens, consultas repetidas, reduced-motion, gestos que só funcionam com mouse, registro do service worker.

## Entrega (no chat)
- Tabela ordenada por gravidade: nº, tela/fluxo, problema, como reproduzir, tamanho de tela, gravidade, tipo, arquivo provável, e a indicação **Observado** ou **Inferido do código**.
- Seção "Exigem decisão de layout", sem propor solução visual.
- O que não foi possível testar e por quê (ex.: teclado real do iOS, instalação real pelo ícone, rede 4G real).
- Rodadas de correção pequenas, da mais segura para a mais arriscada.
