# Brief — Entrada animada e fluxo das páginas externas (06/11/2026)

Pedido do dono (06/11, com vídeo de referência de 43 s): "fazer o mais parecido possível a tela, com a cara do Flow,
à vontade para adaptar à nossa realidade", assumindo papel de UX/UI sênior, e "melhorar o fluxo de configurações das
páginas externas, tanto para os clientes atendidos quanto para o estabelecimento que configura".

Este documento é o prompt de trabalho: o que a referência faz, o que o Flow adapta e como saber que ficou pronto.

## 1. O que a referência faz (análise quadro a quadro)

Tela única de boas-vindas, celular em retrato:

1. **Marca** no topo, sozinha.
2. **Cartão vertical alto** (≈ 55 % da altura): em cima uma "tela de celular" clara que se mexe sozinha como uma
   gravação de tela; embaixo, separada por um traço colorido, a **legenda**: um rótulo curto colorido em caixa alta e uma
   frase de duas linhas.
3. **Cinco ícones** de capítulo (site, agenda, lembretes, avaliações, desempenho), o ativo colorido.
4. **Botão de pílula** "Começar" e a linha "Já possui conta? Entrar".

Cada capítulo é uma **mini-história** com passos (≈ 6–9 s): o conteúdo rola, um **círculo de toque** aparece no ponto que
"seria tocado", o toque afunda, a tela muda de estado. Destaques:

- **Site**: capa com foto, troca de tema revelada por um círculo que cresce a partir do toque (mostra personalização),
  rolagem até equipe e serviços, toque em "Agendar".
- **Agenda**: escolhe o dia no calendário, toca num horário, abre a lista de profissionais, escolhe um, preenche os dados,
  digita o código e termina numa tela verde de "reserva confirmada".
- **Lembretes**: tela de bloqueio com notificações chegando uma a uma.
- **Avaliações**: nota grande, barras por estrela, lista de comentários.
- **Desempenho**: cartões de números do período, por serviço e por campanha.

## 2. Adaptação ao Flow (decisões de design)

- **Identidade Flow**: `MarcaFlow`, palco Dark Navy fixo (decisão de 01/11), tokens `--figaro-*` (a "tela" usa o tema claro
  aplicado só dentro dela, pela classe `.light`), botões de `src/components/ui`, molas de `movimento-figaro.ts`.
- **Só o que o Flow faz de verdade**: página pública com tema do negócio, agendamento público com código pelo WhatsApp
  para telefone já cadastrado, avisos no WhatsApp e push para a equipe, avaliações e relatórios. Nada de recurso inventado.
- **Linguagem neutra** (sem "barbearia", sem tesoura/pente): negócio de exemplo "Studio Aurora", serviços neutros.
- **Textos próprios**: a estrutura segue a referência; as frases não são copiadas.
- **Exemplo visual**: os números e nomes são ilustrativos e a tela diz isso para leitores de tela.
- **Movimento**: só `transform`/`opacity`; com "reduzir movimento" cada capítulo mostra o passo final parado e não troca
  sozinho.
- **Jornadas preservadas**: criar conta, entrar e "Sou cliente e quero só agendar" continuam iguais (decisão de 31/10).
- **Agenda protegida**: nada da Agenda do painel é tocado.

## 3. Critérios de aceite da entrada

- [ ] 5 capítulos animados, cada um com passos, toque simulado e legenda de duas linhas.
- [ ] Toque nos ícones e arrastar para os lados trocam de capítulo; pausa depois de interagir.
- [ ] Cabe em 360×640 e 390×844 sem cortar a legenda nem os botões.
- [ ] Sem cor solta: só tokens; testes de guarda atualizados.
- [ ] Reduzir movimento: estático e sem troca automática.

## 4. Páginas externas (segunda parte)

Auditoria como UX/UI sênior das duas pontas — **cliente** (página pública `/$slug`, agendamento `/agendar/$slug`, chat) e
**negócio** (Sua Página / Marca: layout e tema, seções, chat) — com capturas, problemas priorizados por impacto e
correções cirúrgicas no que estiver claramente quebrado ou confuso. Resultado em
`docs/auditoria-paginas-externas-2026-11-06.md`.
