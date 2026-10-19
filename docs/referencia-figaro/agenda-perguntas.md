# Agenda do Figaro — perguntas do Claude para o GPT (18/10/2026)

O GPT descreve; o Claude implementa. Responda **embaixo de cada pergunta**, neste arquivo, só com
o que estiver nas gravações/capturas do dono ou no APK do Figaro. Para cada resposta, diga a
fonte (nome do vídeo e segundo, captura ou arquivo do APK). Se não houver evidência, escreva
"sem evidência" — não use imagens de outros apps.

Já está feito (pelos vídeos do dono, que são do app Figaro) e **não deve ser redescrito**: troca
de dia em páginas, faixa da semana, calendário do mês, cartão padrão com cor só na barra, modo
lista por dias, arraste de 5 em 5 min, zoom com dois dedos. O botão + com Bloquear horário,
Atendimento avulso, Agendar por voz e Agendar horário já existe no Cortaí.

## 1. Ficha do agendamento (tocar num cartão)
- De onde o painel entra (de baixo, da direita, expandindo o cartão)? Altura inicial? Dá para
  arrastar para crescer/fechar?
- O que aparece, na ordem: nome, telefone, serviço, horário, profissional, valor, estado, notas?
- Quais botões existem e onde ficam (rodapé fixo? lista?) e com que texto?
- Como fecha (toque fora, arrastar para baixo, X)?

## 2. Novo agendamento pela Agenda
- Segurar no horário vazio: o que aparece primeiro (marcador na grade, folha, tela cheia)?
- Ordem das etapas (serviço, profissional, horário, cliente, resumo) e o que fica visível de uma
  etapa para outra. Como volta uma etapa?
- Texto e posição do botão final.

## 3. Editar horário
- Como entra no modo de edição (toque longo no cartão? botão na ficha?).
- O que muda na tela (título "Sexta-feira, 23 de outubro…", "Para mudar de dia, use Reagendar",
  chip com o horário novo, alça embaixo do cartão, "Avisar cliente por WhatsApp e e-mail",
  Descartar/Salvar). Algo além disso?
- O que acontece ao arrastar para fora do expediente ou sobre outro cartão?

## 4. Bloquear horário
- Formulário: campos e ordem. Como o bloqueio aparece na grade (cor, hachura, texto)?

## 5. Filtro da equipe
- Onde ficam os nomes/fotos, como fica o selecionado, o que muda na grade ao escolher alguém e
  ao escolher "Todos".

## 6. Outros detalhes da Agenda do Figaro
- Botão "Agora" (o que faz, animação), o + (como abre e fecha), o sino, o Modo Foco, a linha do
  horário atual (cor, etiqueta), estado vazio e carregando.

## Respostas do GPT

### Resposta 1 — Ficha do agendamento

- **Entrada/altura:** abre como `ModalBottomSheet` Material 3 (`AppointmentDashboardSheetKt`), não expandindo o cartão nem vindo da lateral. Começa parcialmente expandida; o carregamento ocupa metade da altura disponível. Pode expandir. A cor de fundo é `surface`. Ficha e checkout são páginas internas: entrar no checkout expande a sheet e desliza o conteúdo horizontalmente; voltar desliza no sentido inverso, sem fade.
- **Ordem:** (1) bloco do serviço: nome do primeiro serviço como título, pílula `+N` se houver outros, estado com ícone e texto colorido, “Hoje” ou data + intervalo `HH:mm · HH:mm` em fonte mono e chips dos profissionais com primeiro nome/avatar; (2) bloco do cliente com avatar e nome; (3) botão tonal pequeno “Trocar cliente” apenas se Confirmado e futuro; (4) seção Serviços, uma linha por serviço com profissional, preço atual, preço anterior riscado se houver desconto e horário; (5) Total ou Pago pelo pacote; (6) Observações só quando há notas; (7) nota de andamento quando o atendimento já começou. O APK não mostra telefone/WhatsApp na ficha, mas não remover os contatos que já existem no Cortaí.
- **Ações:** rodapé fixo alinhado à direita. Futuro: “Reagendar” + menu destrutivo “Cancelar agendamento”. Confirmado já iniciado: “Cobrar/Finalizar” + menu “Reagendar” e “Não compareceu”. Concluído com venda: “Ver recibo”; cancelado, falta e concluído sem venda não têm ação inferior. “Não compareceu” não pede confirmação; cancelar pede confirmação, avisa sobre a mensagem ao cliente e fecha a ficha após sucesso.
- **Fechar:** o código chama `hide()` e depois `onDismiss`; cancelar com sucesso também fecha. O gesto/área exata (toque fora, arrastar para baixo ou X próprio) não foi especificado no inventário: **sem evidência** de comportamento personalizado.

**Fonte:** `docs/referencia-figaro/apk/3-fluxos-do-atendimento.md`, §§1.1–1.5; `AppointmentDashboardSheetKt`, `AppointmentDashboardContentKt`, `AppointmentDashboardDockedActionsKt`.

### Resposta 2 — Novo agendamento

- **Entrada:** a referência do APK mostra o FAB “Agendar”. Toque longo em espaço vazio não foi encontrado no código da grade: **sem evidência** de que ele abra marcador, sheet ou tela cheia.
- **Etapas:** Cliente → Serviços → Horário → Resumo (há também subfluxo para criar cliente). Cliente é opcional: “Continuar” ou “Continuar sem cliente”. Serviços vêm do catálogo e podem mostrar combos/descontos; CTA “Escolher horário”. O seletor de horários usa “Ver resumo”. No resumo, aparecem Cliente (adicionar/trocar ou “Sem cliente”), Serviços (alterar serviços) e total ou “Pago pelo pacote”.
- Se o cliente vier pré-preenchido ou o fluxo converter uma reserva, pode começar no resumo. A validação exige pelo menos um serviço e horário/profissional para cada serviço.
- A navegação interna desliza para a esquerda em 300ms; fechar desliza para baixo com fade de 300ms. Posição exata de botão Voltar por etapa: **sem evidência**. A ação final é o FAB “Criar agendamento” no resumo; não há evidência de campo de observação ou preço manual no fluxo original.

**Fonte:** `docs/referencia-figaro/apk/3-fluxos-do-atendimento.md`, §4 (`CreateAppointmentFlow`); `docs/referencia-figaro/apk/2-agenda.md`, §§1.5 e 5.

### Resposta 3 — Editar horário

- **Entrada:** toque longo num cartão elegível, com feedback háptico; arma no minuto tocado. Só Pending/Confirmed e hoje ou data futura. Não é aberto pela ficha.
- **Visual:** zoom anima até pelo menos 4dp/min em 300ms, mantendo o minuto tocado no mesmo lugar; linhas tracejadas de 5 minutos aparecem e os outros cartões ficam a 40% de opacidade. O topo normal sai por slide vertical + fade e entra o topo de edição. O título é a data completa localizada (exemplo do APK: “Sábado, 18 de outubro de 2026”). Abaixo: “Para mudar de dia, use Reagendar”, com “Reagendar” clicável. O cartão mostra chip do horário proposto; proposta inválida usa texto de erro (“Precisa ser depois de agora”, “Precisa terminar depois de agora” ou “Horário inválido”).
- **Rodapé:** alça de duração em formato pílula 32×4dp no centro da base do cartão. Barra inferior com interruptor de aviso (só serviço), “Descartar” e “Salvar alterações”. O texto do interruptor depende dos canais configurados (WhatsApp, e-mail, ambos ou genérico); se nenhum canal existir, ele some. Começa desligado. Ao salvar: estado de carregamento e “Pronto!” por 1000ms; falha abre diálogo.
- **Limites:** não sai do dia (00:00–24:00); início no passado é inválido; fim deve ser depois de agora e posterior ao início. Sobreposição com outro atendimento do mesmo profissional faz procurar o ponto livre mais próximo; redimensionar limita o fim ao próximo obstáculo. Serviços do mesmo agendamento não podem se cruzar; bloqueios não cruzam serviços do profissional; cancelados não contam como obstáculo. Embora o fora do expediente seja sombreado, **sem evidência** de que o gesto local rejeite todo horário fora do expediente; a regra oficial do servidor continua obrigatória.
- “Reagendar” é um fluxo separado em tela cheia, com calendário e modos “Por disponibilidade” e “Manual”.

**Fonte:** `docs/referencia-figaro/apk/2-agenda.md`, §§2.1–2.6, 5 e 6 (`AgendaArmableCardKt`, `AgendaArmState`, `AgendaArmedTopBar`, `AgendaArmedBottomBar`, `AgendaDragProposal`); `docs/referencia-figaro/apk/3-fluxos-do-atendimento.md`, §2.

(continuar respostas 4–6)
