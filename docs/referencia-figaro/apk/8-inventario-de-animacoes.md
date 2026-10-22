# Spec 8 — Inventário completo de animações do Figaro (lista de controle)

Decisão do dono (22/10/2026): **recuperar todas as animações, sem exceção**. Este arquivo é a lista de controle:
uma linha por animação, com valores, fonte e a situação no Cortaí. Substitui como lista-mestra o catálogo parcial
de `6-animacoes.md` (que continua valendo para os detalhes), e foi feito por varredura de **todo** o código
descompilado (`com.figaroo.android`), sem filtrar por rótulo: toda chamada de `AnimatedVisibility`,
`AnimatedContent`, `animate*AsState`, `Animatable`, `animateContentSize`, `updateTransition`, pager, rolagem com
cabeçalho que encolhe, arrastar, vibração e `delay` de efeitos. Também os 5 vídeos do APK (`res/raw`).

Situação no Cortaí: **✔** feito (commit e dia no diário) · **◐** parcial ou a conferir · **✘** falta · **—** o Cortaí não
tem essa tela/função (não criar tela só para ter a animação).
Valores: **[código]** lido no APK · **[padrão]** padrão do Compose, convertido (tabela em P.3 do diário) ·
**[vídeo]** só visto nos vídeos do APK · **sem evidência**.

Padrões do Compose usados quando o código passa `null` (todos no `DIARIO.md`, P.3):
`fadeIn/fadeOut()` = mola 1/400 · `AnimatedVisibility` em coluna = fade + expandir/recolher em altura (mola 1/400) ·
`animateXAsState()` = mola 1/1500 · `SizeTransform` = mola 1/400 · `slideIntoContainer` = mola 1/1500.

**Achado importante:** as listas do Figaro **não** animam itens (`animateItem`: 0 usos; o termo nas primeiras
buscas era só o tipo `LazyItemScope`). Não existe entrada em cascata, reordenação animada nem esqueleto de carregamento.
O Cortaí **não** deve ganhar cascata de listas "para parecer Figaro" (a regra de cascata do `motion.ts` é do Cortaí,
fica como está).

## 1. Troca de tela e de passo

| ID | Animação | Valores | Fonte | Cortaí |
|---|---|---|---|---|
| N1 | Dentro de uma área (`intraFlow`) | desliza 20 % + fade, 300 ms, FastOutSlowIn; voltar inverso | `NavTransitionsKt` | ✔ 22/10 |
| N2 | Fluxo à parte (`crossFlow`) | sobe 100 % + fade 350 ms; a de trás só esmaece; fechar desce | `NavTransitionsKt` | ✔ 22/10 (só `/barbeiro/configurar` e `/plano`) |
| N3 | Entrada pela gaveta (`drawerPush`) | largura inteira, mola 1/1500, sem fade | `NavTransitionsKt` | ✔ 22/10 |
| N4 | Variante "irmã" (lista → criar): a lista só esmaece, 350 ms | `crossFlowExitToSibling` | ◐ mesma regra de N2; conferir quando as telas de criar virarem rotas |
| N5 | Passos de fluxo interno (novo agendamento, cobrança, editar venda, vender pacote) | largura inteira, 300 ms, sem fade | `CheckoutFlowScreenKt`, `SaleDashboardScreenKt` | ✔ Novo agendamento 22/10 · ✘ cobrança/comanda · — editar venda e vender pacote |
| N6 | Passos de cadastro (serviço, combo, pacote, cliente, profissional, localidade, campanha, perfil do dono) | largura inteira + fade, 220 ms | `Create*FlowScreenKt` | ✔ onboarding 22/10 · ✘ cadastros de serviço, profissional, cliente |
| N7 | Título do passo na barra | largura inteira, mola 0,8/380 + fade 1/1600 | `SteppedFlowTitle` | ✔ Novo agendamento 22/10 · ✘ nos outros |
| N8 | Ficha ↔ Checkout dentro da ficha | slide horizontal (mola padrão), `SizeTransform(clip=false)` | `AppointmentDashboardSheetKt` | ◐ verificar na ficha (GPT/Claude fizeram a ficha em 17–18/10) |

## 2. Botões e toque

| ID | Animação | Valores | Fonte | Cortaí |
|---|---|---|---|---|
| B1 | Escala ao tocar (primário, secundário, texto, passo +/−, foto) | 0,98 com mola 0,6/800 | `SnappyPressAnimationKt`, `FigarooTextButtonKt`, `FigarooOutlinedButtonKt`, `FigarooStepperIconButtonKt`, `FigarooPhotoUploadFieldKt` | ✔ 22/10 (`button.tsx` e `Card` tocável) · ✘ foto de perfil e passo +/− (não existem no Cortaí hoje) |
| B2 | Conteúdo do botão principal (texto → carregando → ✓) | entra 220 ms (atraso 90) com escala 0,92; sai 90 ms | `FigarooPrimaryButtonKt` | ✔ 22/10 |
| B3 | Carregando fica no mínimo 400 ms | — | `FigarooLoadingIndicatorKt` | ✔ 22/10 (botão) · — o contrato de design manda esqueleto, não indicador solto |
| B4 | FAB estendido (salvar): pílula → círculo | 220 ms LinearOutSlowIn; rótulo escala 0,7→1; ✓ por 700 ms; espera 700 ms e volta | `FigarooExtendedFABKt` | ✘ (Cortaí usa botão fixo embaixo; ver decisão no §10) |
| B5 | Troca do ícone/rótulo do FAB (`FigarooCtaGlyphSwap`) | fade + escala padrão + `SizeTransform` | idem | ✘ junto de B4 |
| B6 | Seta do botão dividido | gira 0↔180°, `standard().defaultEffects` | `FigarooSplitButtonKt` | ✘ (conferir se há botão dividido no Cortaí: Agenda "+"?) |

## 3. Componentes

| ID | Animação | Valores | Fonte | Cortaí |
|---|---|---|---|---|
| C1 | Corpo do acordeão (abre/fecha) | `AnimatedContent` fade + `SizeTransform` (mola 1/400) | `AccordionSectionKt` | ✔ 22/10 (altura com `--mola-tamanho`: 360 ms amostrados da mola 1/400) |
| C2 | Seta do acordeão | 0↔180°, mola 0,75/1500 | idem | ✔ 22/10 (`--mola-seta`, 220 ms da mola 0,75/1500) |
| C3 | Corpo do acordeão com carrossel (Layout & Tema) | `AnimatedContent` fade + `SizeTransform` | idem (`accordion-body-carousel`) | ✔ 22/10 (usa o mesmo `Accordion`) |
| C4 | Odômetro (número que troca dígito a dígito) | desliza a altura, mola 0,8/380 + fade 1/3800 | `FigarooOdometerKt` | ✔ componente · ✘ usar nas telas (assento do plano; desempenho) |
| C5 | Pulso de estatística | 0,85→1,05 (140 ms)→1 (100 ms); opacidade 0→1 em 240 ms | `FigarooStatPulseKt` | ✔ componente · ✘ usar nas telas |
| C6 | Progresso de publicação | barra 0→92 % em 8 s linear; depois 85 % em 2,5 s; 100 % em 650 ms; ✓ com escala/opacidade (mola 0,6/800); esperas 700 e 200 ms | `FigarooPublishProgressKt` | ✘ (Cortaí publica em um passo; usar só se a publicação demorar de verdade) |
| C7 | Cartão de modelo (Layout & Tema) ao selecionar | recuo do cartão 0→8 dp e raio 12→8 dp (mola 1/1500); selo e legenda aparecem com fade padrão | `TemplateCardKt` | ◐ 22/10 recuo animado 0→8 px, raio 12→8 e selo com entrada animada em `SecaoLayoutsETemas`; legenda segue visível, conferir visualmente |
| C8 | Miniatura da galeria ao selecionar | recuo 0→8 dp e raio muda (mola 1/1500) | `MediaGalleryPickerScreenKt` | ◐ 22/10 miniatura de logo em `SecaoImagens` anima recuo adicional de 8 px, escala e raio; conferir equivalência com galeria de fotos do Figaro |
| C9 | Linha de passo (onboarding): marcador enche de cor; detalhe abre | cor do marcador animada (mola 1/1500); fade + expandir em altura | `StepRowKt` | ◐ 22/10 marcador do checklist preenche e o ícone anima em `PrimeirosPassos`; detalhe expansível não existe no componente atual |
| C10 | Painel de disponibilidade semanal | corpo: fade 1/1600 + `SizeTransform`; seta 0↔180° mola 0,8/380 | `FigarooWeeklyAvailabilityPanelKt` | ◐ 22/10 troca Aberto/Fechado anima altura e fade em `EditorDeHorarios`; painel recolhível e seta não existem no componente atual |
| C11 | Carregando da página dentro de WebView | fade padrão | `FigarooWebViewKt` | ✘ (prévia em iframe) |
| C12 | Foto de perfil (enviar): troca com ajuste de tamanho | fade 300 ms FastOutSlowIn | `PhotoUploaderAvatarKt` | ◐ 22/10 foto da recepção troca com fade e escala 0,96→1 em 300 ms em `SecaoRecepcao`; confirmar equivalência com foto de perfil |
| C13 | Folha de baixo | M3 `ModalBottomSheet`: modos meia e do tamanho do conteúdo | `FigarooSheetScaffoldKt` | — sem valor no APK (é o `ModalBottomSheet` padrão do M3); mantém os tempos do Cortaí |
| C14 | Puxar para atualizar (Notificações, Avaliações, Vendas) | indicador padrão do M3 | `FigarooPullToRefreshBoxKt` | ✘ (PWA: avaliar) |
| C15 | Cabeçalho grande que encolhe ao rolar (`exitUntilCollapsed`) | o título grande vira pequeno conforme a rolagem; usado nas telas de lista/configuração/notificações e no criar | `FigarooCollapsingHeaderScaffoldKt`, `FigarooTopAppBarKt`, `FigarooCreationFlowScaffoldKt` | ✘ (`Screen` tem título fixo) |
| C16 | Cor da barra do topo ao rolar | `surface` → `surfaceContainer` quando há rolagem (mola `defaultEffects` na Agenda) | `FigarooTopAppBarKt`, `AgendaScreenKt` | ✘ lote 3 (a barra do topo é do GPT: `cabecalho-edicao-mobile`) |
| C17 | Cartão de avaliação "ver mais/ver menos" | `animateContentSize` padrão (mola 0,5…/ média) | `RatingsReviewCardKt` | ✘ |
| C18 | Resumo de avaliações | contagem da nota, barras, rótulo | [vídeo] `landing_peek_reviews` | ✔ 22/10 |
| C19 | Tela "Configurações de notificação" salvando | opacidade 0,6 (sem animação) | `NotificationSettingsScreenKt` | — estática |

## 4. Gaveta e Início

| ID | Animação | Valores | Fonte | Cortaí |
|---|---|---|---|---|
| D1 | Grupo recolhível da gaveta | conteúdo: fade + altura (mola 1/400); seta −90°→0° mola 1/1500 | `FigarooDrawerCollapsibleSectionKt` | ✔ 22/10 (`GruposDoMenu`: altura+fade pela mola 1/400, seta pela mola 1/1500) |
| D2 | Faixa de desempenho 7 dias | abre com fade + altura; seta 0↔180° mola 1/1500 | `FigarooDrawerPageCardKt` | ✔ 22/10 (`FaixaDesempenho`: grade de altura pela mola 1/400; seta pela mola 1/1500) |
| D3 | Números de desempenho contam e ganham ↗ | [vídeo] `landing_peek_analytics` | ◐ 22/10 contagem por dígito (Odômetro) e pulso nos 3 números · ✘ o ↗ (exige o período anterior, que o servidor não manda) |
| D4 | Gaveta modal arrastável (348 dp) | gesto do dedo, mola padrão do M3 | `FigarooNavigationDrawerKt` | ✔ o menu já tem arrastar pela borda (`ManagementDrawer`); o deslize em si usa a folha do Cortaí (no APK é o padrão do M3, sem valor) |
| D5 | Destaque com fundo escurecido nos números | [vídeo] só demonstração | — não implementar sem decisão do dono |

## 5. Agenda (referência: `2-agenda.md` §10; feito pelo GPT/Claude em 17–21/10, conferir cada item)

| ID | Animação | Valores | Fonte | Cortaí |
|---|---|---|---|---|
| G1 | Armar/desarmar: zoom, cromo e revelação do seletor | tween 300 ms FastOutSlowIn; zoom volta com `snap` quando desarma | `AgendaScreenKt` (`agendaArmZoomLevel`, `agendaDateSelectorReveal`) | ✔ GPT/Claude (conferir valores) |
| G2 | Barra de cima sobe/desce ao armar | `slideInVertically` + fade, 300 ms | idem | ✔ |
| G3 | Altura do seletor de data | mola 1/400 (`agendaDateSelectorHeight`) | idem | ◐ |
| G4 | Alfa dos cartões por estado | 300 ms FastOutSlowIn | `AgendaCardDisplayAlphaKt` | ✔ |
| G5 | Reorganizar colunas dos cartões (esquerda e largura) | 300 ms FastOutSlowIn (`RepackAnimationSpec`) | `AgendaEventCardsLayerKt` | ◐ |
| G6 | Cartão armado cresce (`armedCardGrowth`) | `Animatable` 300 ms | `AgendaScreenKt` | ✔ |
| G7 | Calendário ↔ Lista | fade + `SizeTransform` padrão (`agendaViewModeSwap`) | `AgendaScreenKt` | ✔ |
| G8 | Seletor some no modo lista | slide vertical + fade padrão | idem | ✔ |
| G9 | Linha "agora" | cor/posição com `fastSpatial` (`AgendaNowIndicatorMinute`); `delay` por minuto | `CurrentMinuteFlowKt` | ◐ |
| G10 | Semana ↔ mês | arrastar âncoras; mola 1/400; limiar 50 % | `FigarooDateSelectorState` | ✔ |
| G11 | Pílula do dia / anel de hoje / círculo deslizante | cores com `fastSpatial` | `FigarooWeekStripKt` | ✔ |
| G12 | Faixa da semana e grade do mês | `HorizontalPager` / `VerticalPager` | `FigarooWeekStripKt`, `FigarooMonthGridKt` | ✔ |
| G13 | Troca de dia | `animateScrollToPage` padrão | `AgendaScreenKt` | ✔ |
| G14 | Zoom por pinça | gesto do dedo | `AgendaPinchZoomKt` | ✔ |
| G15 | Reagendar: linha do horário abre | fade + `SizeTransform` padrão | `TimeSlotSelectorAvailabilityListKt` | ◐ |
| G16 | Ficha em folha: meia altura → cheia | M3 padrão | `AppointmentDashboardSheetKt` | ✔ |
| G17 | Toast "Continue configurando" | sobe a altura inteira + fade, 320 ms | `AgendaOnboardingToastKt` | ✘ (`PrimeirosPassos`/`FaixaPendencias`) |

## 6. Entrada, onboarding e assinatura

| ID | Animação | Valores | Fonte | Cortaí |
|---|---|---|---|---|
| E1 | Sequência da tela de entrada (5 passos com vídeo) | chip ativo cresce 500 ms com curva de quique (0,3; 1,75; 0,4; 1); brilho 0,35/0,7; vídeo some em 600 ms; marca final entra 600 ms e escurece para 0,5 em 1000 ms; legenda 300 ms; progresso a cada 40 ms; antecipação do próximo vídeo 260 ms linear; esperas 300/340/450/500 ms; tempo limite 20 s | `LandingSequenceViewKt`, `LandingSequenceController` | ✘ (home `/apresentacao`: decidir com o dono se vale recriar) |
| E2 | Campo de código de acesso/senha: 1 s de espera (reenvio) | `delay` 1000 | `LoginScreenKt`, `PaywallScreenKt` | — |
| O1 | Boas-vindas: entrada com fade `fastEffects` na primeira visita + vibração | — | `WelcomeScreenKt` | ✘ |
| O2 | Passos do onboarding | `intraFlow` | `OnboardingFlowScreenKt` | ✔ via N6 |
| O3 | Conclusão do onboarding | herói 520 ms; conteúdo com `slowEffects`; logo 800 ms depois; link digitado 32 ms/letra; cursor 450 ms | `OnboardingCompleteScreenKt` | ✔ 22/10 |
| O4 | Assentos da assinatura | botão da página de plano troca com fade padrão; +/− com vibração | `PaywallScreenKt` | ✘ (`/barbeiro/plano`) |

## 7. Páginas, serviços, cobrança

| ID | Animação | Valores | Fonte | Cortaí |
|---|---|---|---|---|
| P1 | Personalizar Página: carregando → conteúdo | fade in 220 ms / out 180 ms | `PageSettingsScreenKt` | ✔ 22/10 fade de entrada 220 ms e saída 180 ms em `barbeiro.marca.tsx` |
| P2 | Banner de rascunho | fade + expandir em altura | idem | ✔ GPT 21/10 (conferir valores) |
| P3 | Editores Equipe e Localidades: lista ↔ vazio | fade 220/180 + `SizeTransform` | `TeamEditorScreenKt`, `LocationsEditorScreenKt` | ◐ 22/10 transição lista↔vazio em `barbeiro.equipe.tsx`; editor de localidades equivalente não identificado |
| S1 | Painel do serviço: herói troca | fade 220/180 | `ServiceDashboardScreenKt` | — (sem painel de serviço no Cortaí) |
| S2 | Seleção de variação do serviço abre | expandir 220 ms + fade 220 ms; seta 0↔180° | `ServiceRateSelectionListKt` | ✘ (`barbeiro.servicos`) |
| S3 | Grupos de categoria recolhíveis | altura + fade padrão; seta 0↔180° | `CategorisedServicesListKt` | ✘ |
| S4 | Regras de simultaneidade aparecem | altura + fade padrão | `EditServiceConcurrencyRulesContentKt` | — |
| L1 | Campos de endereço aparecem depois do CEP | fade padrão | `EditLocationAddressScreenKt` | — Cortaí não tem etapa de endereço com CEP; endereço atual é texto livre |
| V1 | Comanda: dinheiro revela "recebido/troco" | fade + `SizeTransform` | `CheckoutPaymentSelectionScreenKt` | ✘ (`comanda/`) |
| V2 | Painel da venda: ver ↔ editar; blocos abrem | fade + altura (alinhada ao topo); 300 ms nos passos | `SaleDashboardScreenKt` | ✘ |
| V3 | Canal de notificação: horários de lembrete aparecem | fade + altura | `NotificationChannelSheetKt` | ◐ 22/10 `PreferenciasDoCliente`: frequência e silêncio aparecem com fade+altura quando WhatsApp ou celular está ativo; conferir visualmente e validar equivalência |
| V4 | Cobrança concluída: espera de 1,2 s antes de fechar | `delay` 1200 | `CheckoutFlowScreenKt` | ◐ conferir tempo de `ConfirmacaoRapida` (~600 ms) |

## 8. Vibração (háptico)

| ID | Quando | Tipo | Fonte | Cortaí |
|---|---|---|---|---|
| H1 | Armar o cartão da Agenda (segurar) | pressão longa | `AgendaArmableCardKt` | ◐ conferir |
| H2 | Reagendamento por arrastar salvo | confirmar | `AgendaScreenKt` | ✘ |
| H3 | Assentos +/− na assinatura | pressão longa | `PaywallScreenKt` | ✘ |
| H4 | Conta criada com sucesso | pressão longa | `SignUpScreenKt` | ✘ |
| H5 | Entrada concluída | pressão longa | `LoginScreenKt` | ✘ |
| H6 | Primeira visita às boas-vindas | pressão longa (uma vez) | `WelcomeScreenKt` | ✘ |
| H7 | Aviso "Continue configurando" aparece | confirmar (Android 11+) | `AgendaOnboardingToastKt` | ✘ |

Na web: `navigator.vibrate` (Android/Chrome; iOS não tem). Padrão sugerido: pressão longa = 15 ms; confirmar = [10, 40, 15]
[inferência]. Respeitar "reduzir movimento" e a preferência de vibração do aparelho.

## 9. Vídeos do APK (`res/raw/landing_peek_*.mp4`)

| ID | Vídeo | O que mostra | Cortaí |
|---|---|---|---|
| M1 | `booking` (7,3 s) | página pública: dia escolhido, linha do horário abre com profissionais, pílula "✓ Selecionado", barra "28 de Agosto · 09:15 … Continuar", folha "Seus Dados" que sobe, código de 4 dígitos | ✘ (`agendar.$slug`, `src/components/agendamento/`) |
| M2 | `notifications` (8,7 s) | notificações entrando, agrupando e a folha "Para seu cliente" | — (peça de marketing) |
| M3 | `reviews` (8 s) | resumo de avaliações e lista | ✔ C18 (resumo) · ✘ lista entrando em sequência (no app real não existe, ver §Achado) |
| M4 | `site` (10,3 s) | troca de tema da página com círculo que se abre | ✘ prévia do editor |
| M5 | `analytics` (12,5 s) | números do Início contando | ✘ D3 |

## 10. Decisões que precisam do dono

1. **FAB estendido de salvar (B4/B5):** o Figaro usa um botão que vira círculo e mostra ✓. O Cortaí usa o botão fixo
   em pílula embaixo (contrato de design). Recuperar a animação **no botão fixo** (pílula que encolhe e mostra ✓ por
   700 ms) é possível sem mudar o layout; confirmar se é isso que se quer.
2. **Cabeçalho que encolhe ao rolar (C15):** muda como as telas de gestão se parecem. É característica forte do
   Figaro; recomendo fazer, em uma tela primeiro (Avaliações), e ver na prévia.
3. **Tela de entrada animada (E1):** é peça de marketing; a home do Cortaí é `/apresentacao`. Só recriar se o dono quiser.
4. **Vibração (H1–H7):** na web só funciona no Android; confirmar se entra.
5. **Cascata de listas:** o Figaro não tem; o `motion.ts` do Cortaí tem. Manter como está.

## 11. Contagem

Linhas deste inventário: 8 de navegação, 6 de botões, 19 de componentes, 5 de gaveta, 17 de Agenda, 6 de entrada e
onboarding, 12 de páginas/serviços/cobrança, 7 de vibração e 5 de vídeos. Ver a ordem de execução em "P.12" do diário.
