# Agenda no celular: estado do refino (2026-10-10)

Notas de passagem para a próxima sessão. Só documentação.

## Já na `main` (até `3960975`)
- Topo e semana em bloco, mês na própria tela, grade nas medidas do modelo.
- Cartões coloridos por estado do cliente (tokens `--estado-*`, faixa lateral arredondada, classe `agenda-timeline-confirmado`).
- Pílula "Agora" e botão "+" com 56px.
- Título "Mês Ano" sem corte; menu "…" com três pontos verticais e botão estreito.
- Etiqueta do horário atual inteira (não corta na borda esquerda).
- Semana do topo acompanha o dedo e entra pelo lado ao trocar de semana.
- Cinco pontinhos discretos marcam começo e fim da grade (`MarcaDoLimiteDoDia`, só informam, não são botão).
- Menu lateral: nome do negócio em 18px (16px nos nomes longos).

## Na branch `claude/agenda-gesto-dia` (commit `a8842cd`), ainda NÃO na `main`
- Prévia do dia vizinho alinhada à grade e já na posição em que vai assentar (`AgendaTimeline`, ramo `previa` + `diaCompleto`).
- Deslize lateral também começa em cima de um cartão; o cartão em edição leva `data-sem-gesto-dia`.
- Para ir à `main`: precisa de autorização do dono; conferir antes commits novos do Lovable e trazer por merge.

## Ideias combinadas ou em aberto
- Legenda das cores dos cartões dentro do menu "…" da Agenda (sugerida, não feita).
- Conferir no celular real: movimento da semana, pílula e "+", cores no tema claro, prévia do dia ao puxar (inclusive com "hoje" como vizinho).
- Regra de confirmar a troca de dia: passa da metade da tela ou peteleco (pode baixar o limite se o dono pedir).
- Segurança em aberto: limite extra por IP na secretária do site e na criação de negócio sem login; fila de chegada sem limite; agendamento com telefone de terceiros; links `/painel`.
- 8 testes antigos de `lembretes-numeros.test.ts` falham por datas fixas vencidas (já era assim).
- Erros de prettier antigos em alguns arquivos de `agenda/` (não tocados).

## Como validar visualmente
Página temporária `src/routes/zz-vitrine-agenda.tsx` (nunca versionar) com dados no cache do react-query, mais patch temporário de `rotaDaAgenda` e de `ManagementDrawer`; guardar e restaurar `src/routeTree.gen.ts`. Toque simulado por CDP (`Input.dispatchTouchEvent`).
