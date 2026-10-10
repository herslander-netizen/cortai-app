# Agenda no celular: estado do refino (2026-10-10)

Notas de passagem para a próxima sessão. Só documentação.

## Na `main`
- Topo e semana em bloco, mês na própria tela, grade nas medidas do modelo; título sem corte e menu "…" com três pontos verticais.
- Cartões coloridos pelo estado do cliente (tokens `--estado-*`, faixa arredondada, classe `agenda-timeline-confirmado`); na lista, só a barrinha lateral muda de cor.
- Legenda das cores dentro do menu "…" da Agenda (`LegendaDasCores`).
- Pílula "Agora" e "+" com 56px e a mesma sombra.
- Etiqueta do horário atual inteira; semana do topo desliza e entra pelo lado.
- Pontinhos discretos no começo (depois dos profissionais) e no fim da grade; correm como carregando enquanto a agenda atualiza; dica "Segure para agendar" discreta.
- Prévia do dia vizinho alinhada à grade ao puxar; deslize lateral começa também em cima do cartão.
- Menu lateral com o nome do negócio proporcional.
- Gavetas de baixo (Ajustes etc.): arrastar para fechar não bloqueia mais a rolagem.
- WhatsApp: conexão por número de telefone (código de 8 caracteres) além do QR Code; falta testar com o serviço Evolution real.
- Testes de `lembretes-numeros` com relógio fixo (não dependem mais da data de hoje).

## Ideias combinadas ou em aberto
- Conferir no celular real: movimento da semana, pílula e "+", cores no tema claro, prévia do dia ao puxar (inclusive com "hoje" como vizinho), conexão por número de telefone e a lista rolando no Ajustes.
- Regra de confirmar a troca de dia: passa da metade da tela ou peteleco (pode baixar o limite se o dono pedir).
- Segurança em aberto: limite extra por IP na secretária do site e na criação de negócio sem login; fila de chegada sem limite; agendamento com telefone de terceiros; links `/painel`.
- Erros de prettier antigos em alguns arquivos de `agenda/` (não tocados).

## Como validar visualmente
Página temporária `src/routes/zz-vitrine-agenda.tsx` (nunca versionar) com dados no cache do react-query, mais patch temporário de `rotaDaAgenda` e de `ManagementDrawer`; guardar e restaurar `src/routeTree.gen.ts`. Toque simulado por CDP (`Input.dispatchTouchEvent`).
