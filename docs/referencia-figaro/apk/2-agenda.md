# Spec 2 — Agenda (tela principal) — Figaro → referência para o Cortaí

> Fonte: APK descompilado (jadx). Raiz: `sources/com/figaroo/android` (abreviado abaixo; `ui/` = `agenda/ui`, `comp/` = `agenda/ui/components`, `model/` = `agenda/logic/model`, `ds/` = `designsystem`).
> Legenda: **[código]** = observado no código (arquivo + identificador). **[inferência]** = dedução minha. **sem evidência** = não encontrado.
> **Strings:** o APK tem só `res/values/strings.xml` (não há `values-pt`). Parte das strings da agenda já está em português e parte em inglês. Abaixo os textos aparecem **literais**. Quando estão em inglês, sugiro uma tradução para PT-BR marcada como [inferência].
> **Cores:** decodificadas de `ds/theme/ColorKt` (ARGB `0xFF…` → `#RRGGBB`). Os tokens seguem os nomes do Material 3.
> Muitas funções Compose saíram com "Code decompiled incorrectly". Nesses casos, os valores vieram de constantes, de lambdas legíveis e dos parâmetros das chamadas.

---

## 0. Tokens usados pela agenda (tema claro)

[código] `ds/theme/ThemeKt.LightColorScheme`, `LightExtendedColors`, `ColorKt`:

| Token | Origem | Hex |
|---|---|---|
| primary | Primary50 | #2467BB |
| onPrimary | branco | #FFFFFF |
| primaryContainer / onPrimaryContainer | Primary90 / Primary10 | #D5E2FF / #001A40 |
| secondary | Secondary40 | #884F59 |
| tertiary | Tertiary40 | #B61055 |
| tertiaryContainer | Tertiary90 | #FFDADE |
| background = surface | Neutral94 | #EAF2EC |
| onSurface | Neutral10 | #2A2F2C |
| onSurfaceVariant | Neutral50 | #7B7977 |
| outlineVariant | NeutralVariant80 | #D7C7C2 |
| surfaceContainerLowest | branco | #FFFFFF |
| surfaceContainerLow | Neutral96 | #F0F7F2 |
| surfaceContainerHigh | Neutral92 | #E4EDE7 |
| error | Error40 | #B3261E |
| ext.onSurfaceHint | Neutral50 | #7B7977 |
| ext.brandMagenta (linha "agora") / onBrandMagenta | Tertiary50 / branco | #D3145D / #FFFFFF |
| ext.success | SuccessTone40 | #2E7D32 |

**Dimensões** [código] `ds/theme/Dimensions` (valores padrão): spacingXxs 2 · Xs 4 · Sm 8 · MdSm 12 · **Md 16** · MdLg 20 · Lg 24 · Xl 32; dividerThickness 1dp; iconSizeXs 16 · Sm 20 · Md 24; agendaTopBarLeadingSize 44; fabMargin 16; topAppBarHeight 64; touchTargetMin 48; drawerWidth 348.
**Formas** [código] `ds/theme/FigarooBrandShapes`: chip 8dp · card 12dp · pill 50%.
**Mola de expansão** [código] `ds/theme/BrandMotionKt.expandSizeSpring*`: `spring(dampingRatio=1.0, stiffness=400)`. `PressScaleTarget = 0.98`.

**Cores de categoria de serviço** (barra lateral do card e zonas de buffer) [código] `services/ui/ServiceCategoryColorsKt.toComposeColor`:
Default/Unknown #9E9E9E · AmethystBloom #B388FF · CrimsonFlame #E53935 · EmeraldMeadow #43A047 · LagoonTeal #00838F · RosyGlow #EC407A · SaphireSkies #1E88E5 · SilverSlate #607D8B · SunbeamGold #FBC02D · TangerineTwist #FB8C00 · TropicalTides #26A69A.
> A cor do card vem da **categoria do serviço**, não do status (`model/DayEventBuilderKt.buildDayEvents` → `ServiceEvent.serviceColor`). O status aparece só no ícone (seção 4.4).

---

## 1. Estrutura da tela (de cima para baixo)

Composable raiz: `ui/AgendaScreenKt.AgendaScreen` → `AgendaScreenContent` (Scaffold). Regra geral [código] `model/AgendaArmState.isChromeHidden() = isArmed()`: no modo "armado" (seção 6) a barra superior e a inferior normais são trocadas pelas versões de edição.

### 1.1 Barra superior — `ds/components/FigarooAgendaTopBarKt.FigarooAgendaTopBar`
[código] `TopAppBar` do M3, cor `surface`, com `scrollBehavior`.
- **Ícone inicial:** círculo de 44dp (`agendaTopBarLeadingSize`) com o logo `figaroo_app_logo` (crop). Abre o drawer. a11y: "Open navigation menu" (`navigation_open_menu`).
- **Título:** AnnotatedString com **mês em negrito** + espaço + **ano em Medium**, `titleLarge`, cor onSurface. O mês sai de `formatMonthName` com a primeira letra maiúscula (ex.: "Outubro 2026").
- **Subtítulo** (só quando há mais de uma localidade, flag `z`): nome da localidade em `labelLarge` primary + `ArrowDropDown` de 20dp. É clicável e abre `AgendaLocationPickerSheet` (a11y "Trocar localidade"). Sem localidade: "Selecionar localidade".
- **Ações:**
  1. Alternar calendário: `icon_calendar_day`, que vira `icon_calendar_day_filled` em **primary** quando o mês está expandido. a11y "Toggle calendar" [PT sugerido: "Mostrar/ocultar calendário"].
  2. Sininho: `icon_bell`, que vira `icon_bell_on` em **tertiary** (#B61055) quando há não lidas (`unreadNotificationsCount > 0`). a11y "Open notifications" [PT: "Abrir notificações"].

### 1.2 Seletor de data (faixa da semana ↔ mês) — `ds/components/datepicker`
- [código] `FigarooAgendaDateSelectorKt`: painel com cantos **inferiores** de 16dp (`SelectorPanelShape`), elevação `FigarooMediumFloatingElevation`, padding horizontal 6dp. Cabeçalho com as iniciais dos dias da semana em 11.5sp e padding vertical de 8dp. As iniciais vêm de `agenda_weekday_initial_0..6` = "S M T W T F S" (em inglês) [PT sugerido: "D S T Q Q S S"].
- **Dois estados** [código] `FigarooDateSelectorState` + `SelectorAnchor { Week, Month }`, sobre `AnchoredDraggableState`:
  - Animação: `expandSizeSpringFloat()` = spring(1.0, 400). Decay exponencial. Limiar de posição de **50%** (`POSITIONAL_THRESHOLD_FRACTION = 0.5`). Limiar de velocidade = `+∞`, ou seja, só vale a posição e não existe "fling" para abrir.
  - Abre e fecha **arrastando** o painel ou tocando no ícone de calendário (`setExpanded`). Durante a transição o conteúdo faz "morph" (`MorphingSelectorCard`, `MorphHitTestMidpoint = 0.5`).
  - Primeiro dia da semana padrão: **domingo** (`rememberFigarooDateSelectorState`, `DayOfWeek.SUNDAY`).
- **Faixa da semana** [código] `FigarooWeekStripKt`:
  - **7 dias** por página (`datesForWeekPage`), dentro de um `HorizontalPager`. As páginas vão do início da semana de (hoje − 2 meses) até o fim de (hoje + 6 meses) (`DateSelectorPaginationKt.weekPageCount`).
  - Pílula do dia: círculo de **38dp**, número em 16sp, padding vertical 8dp na faixa e 4dp na linha, raio da linha 12dp.
  - **Selecionado:** círculo **primary** com texto onPrimary. A seleção "desliza" entre os dias com `GlidingSelectionCircle`. As cores animam com `MotionScheme.fastSpatialSpec` (rótulos `weekStripPillBg`, `weekStripPillText`).
  - **Hoje (não selecionado):** texto primary e **anel de 1.5dp** primary (`TodayRingStroke`).
  - **Outros dias:** texto onSurface.
  - **Bolinha de "tem agendamento":** 5dp (`MarkDotSize`) na cor **tertiary**, abaixo do número, e só quando a data está em `marks`. [inferência] `marks` = dias com dados (`populatedAgendaDays`).
- **Grade do mês** [código] `FigarooMonthGridKt`: altura fixa de 292dp. Célula 38dp, fonte 15sp, padding vertical da linha 1dp. Bolinha de 4dp a 5dp do fundo. Anel de hoje 1.5dp. Cabeçalho do mês com recuo de 8dp e 6dp abaixo. Páginas: **9 meses** (−2 … +6), `monthPageCount()`. Dias de fora do mês ficam vazios (`cellsForMonthPage` devolve null).
- **Sumir no modo lista** [código] `ui/AgendaScreenKt$AgendaScreenContent$44$3`: `AnimatedVisibility(viewMode == Calendar)` com entrada `slideInVertically(-h) + fadeIn` e saída `slideOutVertically(-h) + fadeOut` (specs padrão).
- **Revelação ao armar/desarmar** [código]: `animateFloatAsState(…, armChromeTween, "agendaDateSelectorReveal")` = tween de 300ms com FastOutSlowIn.

### 1.3 Conteúdo — `AnimatedContent(viewMode, label="agendaViewModeSwap")`
[código] Transição `fadeIn togetherWith fadeOut` + `SizeTransform` (specs padrão).
- **Calendar** → pager de dias com a linha do tempo (seções 2 a 5).
- **List** → `comp/AgendaListViewKt.AgendaListView` (seção 7).

### 1.4 Barra inferior flutuante — `ui/AgendaScreenKt.AgendaBottomBar`
[código] `Row(fillMaxWidth, navigationBarsPadding, padding start/end/bottom = 16dp, SpaceBetween)` contendo `FigarooFloatingToolbar` com `FigarooFloatingToolbarElevation`. Itens, da esquerda para a direita:
1. **Botão "Today"** (`AgendaTodayButton`): pílula 50%, padding 14×10dp, ícone `icon_target` de 20dp + texto "Today" (`agenda_go_to_now`) com `labelLarge` SemiBold onSurface. Espaço interno de 6dp. [PT sugerido: "Hoje"]. Ação: volta o pager para hoje e **anima** o scroll até "agora" (seção 2.6).
2. **Divisor** (`AgendaToolbarDivider`): 1×24dp em outlineVariant.
3. **Alternar modo** (`FigarooIconButton` Standard): em Calendar mostra `icon_agenda_list` ("Switch to list view"). Em List mostra `icon_agenda_schedule` ("Switch to calendar view").
4. **Filtro de profissional** (`AgendaTeamMemberFilterTrigger`, só se `canFilterTeamMembers`): avatar circular de 38dp com as iniciais do profissional (placeholder `Barber`). a11y "Trocar agenda".

### 1.5 FAB "+" — `comp/AgendaCreateFabMenuKt.AgendaCreateFabMenu`
[código] `FloatingActionButtonMenu` + `ToggleFloatingActionButton` do M3, alinhado em BottomEnd com `navigationBarsPadding`. Container **primaryContainer**, ícone onPrimaryContainer. O ícone faz morph de `Add` para `Close` (`checkedProgress`). a11y "Create" / "Close".
Itens do menu, na ordem de declaração (de cima para baixo) [código] `AgendaCreateFabMenu$6` + `ComposableSingletons$AgendaCreateFabMenuKt`:
| # | Texto | Ícone |
|---|---|---|
| 1 | "Sell package" [PT: "Vender pacote"] | `icon_cart` |
| 2 | "Reserve time" [PT: "Reservar horário"] | `icon_lock_fill` |
| 3 | "Block time" [PT: "Bloquear horário"] | `icon_calendar_xmark` |
| 4 | "Schedule appointment" [PT: "Agendar"] | `icon_calendar_plus` |
- Botão extra "Resume setup" (ícone `Checklist`) quando `shouldShowAgendaOnboardingFabAction = status != Completed && flag` [código] `ui/AgendaOnboardingToastVisibilityKt`.
- O FAB só aparece quando `shouldShowAgendaFab = flag || onboarding Completed`.
- Fundo dos itens: surfaceContainerHigh [código, há 3 ocorrências]. [inferência] Esse é o container dos itens do menu.

### 1.6 Toast de onboarding — `onboarding/ui/components/AgendaOnboardingToastKt`
[código] Card **primaryContainer**, elevação 8dp, padding interno de 16dp, slide de **320ms** (`TOAST_SLIDE_DURATION_MS`).
- Título: "Continue setting up your barbershop" [PT: "Continue configurando seu negócio"].
- Subtítulo: "Just a few steps left." [PT: "Faltam só alguns passos."].
- a11y: "Open onboarding".
- Aparece só se `status == NotStarted && a && b && c` (`shouldShowAgendaOnboardingToast`).

### 1.7 Banners (verificar e-mail, WhatsApp, push) — ficam **no drawer**, não na tela da agenda
[código] `ui/AgendaScreenKt.buildAgendaDrawerEntrySpecs`, nesta ordem:
1. `AccountHeader`, sempre (nome · papel: "Owner/Manager/Staff").
2. `PageCard`, se a página pública existe (status Online/Offline/Draft/Pending; "Share page").
3. `VerifyEmail`, se `showVerifyEmailBanner`: "Confirm your email" / "Verify your email address to secure your account" / botão "Verify now".
4. `Banner` (push), se não registrado para push: "Turn on notifications" / "Don't miss new bookings and last-minute cancellations" / "Turn on" · "Not now".
5. `WhatsappReminders`, se houver alerta, mas **não** quando o banner de e-mail e o de push aparecem juntos (`z13 && (!z12 || !z11)`): "WhatsApp messages running low" ("%1$d of %2$d left this month · renews on %3$s") ou "WhatsApp messages paused" ("Back on %1$s · …"). Botões: "See notifications" e "Got it". Datas em `dd/MM`.
6. `AgendaHero`: "Agenda", com subtítulo "Today · closed" / "next HH:mm" / "%1$s · %2$s · %3$s".
7. Seção "Your barbershop": My profile, Basic Information, Locations, Services, Combos (badge "New"), Team, Insights, Ratings, Appointment Options, Payment Options. Cada item depende de permissão.
8. Seção "Loyalty": Clients, Promotional Campaigns, Packages (badge "New").
9. `SupportHero`: "Support" / "Human support on WhatsApp".

---

## 2. Linha do tempo (Calendar)

### 2.1 Geometria — `comp/FigarooDayTimelineKt`, `ds/components/agenda/MinuteHeight`, `model/AgendaZoom`
| Item | Valor | Fonte |
|---|---|---|
| Coluna de horas (gutter) | **50dp** | `DayTimelineGutter` |
| Espaço entre o rótulo e a grade | 10dp (texto alinhado à direita em `gutter − 10dp`) | `HourLabelToGridGap` |
| Faixa do dia | **00h → 24h** (dia inteiro; `startHour=0`, `endHour=24`) | chamada em `DayTimelinePage` |
| dp/minuto padrão (zoom de repouso) | **2.0 dp/min = 120 dp/hora** (`MinuteHeight.Comfortable`) | `AgendaZoom.Default` |
| Zoom mínimo | 1.0 dp/min (60 dp/h) | `AgendaZoom.Minimum = Comfortable/2` |
| Zoom máximo | 4.0 dp/min (240 dp/h) | `AgendaZoom.Maximum = Armed` |
| Zoom no modo armado | `max(repouso, 4.0)` | `AgendaZoom.armed` |
| Outras constantes | Default 2.5 · Compact 1.0667 (não usadas como padrão da agenda) | `MinuteHeight` |
| Altura do dia | 1440 × dp/min (2880dp no padrão) | `AgendaTimelineGeometry` |
- O zoom fica salvo entre sessões: SharedPreferences, chave `agenda_minute_height`, sempre com clamp [código] `logic/repository/AgendaZoomStore`.
- Acima e abaixo do dia há um `Spacer` (inset do cromo) e um **separador de fronteira do dia** (`DayBoundarySeparator`): **5 bolinhas de 3dp**, outlineVariant com α 0.5, espaçadas 8dp, padding vertical 12dp, vão total de 27dp.

### 2.2 Grade [código] `FigarooDayTimelineKt.HourGridLayer` (Canvas)
- **Linha de hora:** contínua, espessura 1dp (`dividerThickness`), cor **onSurfaceHint com α 0.5** (`HourGridLineAlpha`). Vai de x = 50dp até largura − 16dp. São desenhadas as horas de 0 a 23.
- **Rótulo de hora:** só dois dígitos, **"07", "08"…** (sem ":00"). Fonte `monoMedium` 13sp Medium em onSurfaceHint. A baseline fica em `y + fonte/3`, ou seja, o rótulo fica centrado verticalmente na linha.
- **Linhas de 5 em 5 minutos** (exceto as horas cheias) [código] `model/AgendaArmedGrid`:
  - Tracejadas, **4dp traço / 2dp vão**, espessura 2/3 de 1dp, cor onSurfaceHint α 0.5 × opacidade.
  - Opacidade: no modo armado é **1.0**. Em repouso vale `clamp((dpPorMin − 2.5)/0.5, 0, 1)`, isto é, invisível até 2.5 dp/min e totalmente visível a partir de 3.0 dp/min. No zoom padrão (2.0) **não aparecem**.
  - Meia hora e quarto de hora não têm estilo próprio. **sem evidência** de linhas de 15 ou 30 minutos diferentes.

### 2.3 Fora do expediente / fechado — `comp/DayTimelineUnavailableBlockKt`, `model/UnavailablePeriodsKt`
- Os blocos são calculados por localidade: antes da abertura, depois do fechamento e os intervalos (`offPeriods`). Também consideram horários personalizados por data. Dia sem horário = bloco de 0 a 1440 (dia fechado).
- Visual: retângulo de x = 50dp até largura − 16dp, topo `y + 1dp`, altura `h − 2dp`. Fundo **surfaceContainerLow** (#F0F7F2), canto chip 8dp, **listras diagonais** (`DiagonalStripeSurface`) onSurface α **0.025**, traço 1dp e espaçamento 8dp.
- Rótulo opcional em MAIÚSCULAS, 11sp Bold, espaçamento 0.06em, onSurfaceVariant, padding 12dp/7dp. Os blocos gerados aqui vêm com `label = null`. As strings "Fechado", "Almoço", "Abre às %1$s" existem, mas não achei o uso delas nesse bloco [inferência: outra tela].

### 2.4 Indicador de "agora" — `comp/CurrentMinuteFlowKt.AgendaNowIndicator`
[código] Aparece só no dia de hoje e dentro de [startHour, endHour].
- **Linha:** 1.5dp em **brandMagenta #D3145D**, de x = gutter até largura − 16dp, centrada no minuto atual.
- **Pílula:** dentro do gutter (largura gutter − 6dp, alinhada à direita), y = linha − 8dp. Fundo brandMagenta, raio 999, padding 5×2dp. Texto **"HH:mm"** 10sp Bold, espaçamento 0.01em, cor branca.
- Posição animada com `MotionScheme.fastSpatialSpec`. O relógio "tica" alinhado à virada do minuto (`delay(60000 − ms atuais)`).

### 2.5 Paginação de dias [código] `ui/AgendaScreenKt` + `$44$3$2$2`
- `HorizontalPager` com **241 páginas** (`PAGER_TOTAL_PAGES`): **60 dias para trás** e **180 para frente**. Hoje = índice 60. O dia da página é `hoje + (página − 60)`.
- `beyondViewportPageCount = 1` (pré-carrega 1 página de cada lado). `pageSize = Fill`. Sem espaçamento entre páginas.
- Limiar de swipe: o padrão do `PagerDefaults`. **sem evidência** de valor customizado.
- **Swipe desligado** quando o mês está expandido **ou** quando há um card armado: `userScrollEnabled = !(dateSelector.isExpanded || armState.isArmed)`.
- Bordas: depois de −60 e +180 dias o pager simplesmente para. Os dados são buscados de hoje − 2 meses até hoje + 6 meses (`model/AgendaFetchBounds.of`).
- Selecionar uma data na faixa ou no mês faz `animateScrollToPage(dias entre hoje e a data + 60)` (`AgendaScreenContent$32$1`).
- O **ScrollState vertical é um só, compartilhado entre as páginas** (`$dayTimelineScrollState`). Ao trocar de dia, a hora visível continua a mesma.

### 2.6 Scroll vertical
- Abertura: `scrollTo` (sem animação) até `y(agora) − 200dp` (`ScrollToNowLeadInBand = 200dp`), ou seja, "agora" aparece 200dp abaixo do topo [código] `AgendaScreenContent$41$1`.
- Botão Today: o mesmo cálculo, mas com `animateScrollTo` [código] `$42$1`.

### 2.7 Zoom por pinça [código] `comp/AgendaPinchZoomKt.agendaPinchZoom`, `model/AgendaZoom`
- Exige 2 dedos (`MinimumPinchPointers = 2`) e está aplicado no próprio pager. Novo valor = `clamp(repouso × escala, 1.0, 4.0)`.
- O ponto focal é mantido: `focalMinute = (scroll + focalY − dayTop)/unidadesPorMinuto` e `AgendaPinchScrollAnchor` reposiciona o scroll.
- Ao soltar, `commitZoom` grava o valor. Só funciona quando `canPinchZoom` está ativo [inferência: fora do modo armado].

---

## 3. Layout dos eventos (sobreposição) — `comp/AgendaEventLayoutKt.layoutEvents`, `AgendaEventCardsLayerKt`
- **Clusters:** os eventos são ordenados por início (e por fim). Um cluster junta eventos cujas "pegadas" se cruzam. A pegada termina em `endTime` + minutos removidos durante o redimensionamento e **não inclui** o buffer de limpeza.
- **Coluna** dentro do cluster = (maior coluna entre os eventos que ainda estão ativos no início deste) + 1. Começa em 0. Total de colunas do cluster = maior coluna + 1. Não é o "primeiro slot livre": é empilhamento crescente.
- **Largura:** área = largura − 50dp − 16dp. Vão entre colunas = **4dp**. `largura = (área − (n−1)×4dp)/n`. `x = 50dp + col × (largura + 4dp)`.
- Mudanças de coluna animam com `tween(300ms, FastOutSlowIn)` (`RepackAnimationSpec`). Na primeira composição é `snap`.
- O card armado fica com `zIndex = 1`.
- `GapEvent` (intervalo livre > 60min entre serviços) **não aparece** na timeline. Também é filtrado na lista.

---

## 4. Cards de agendamento — `comp/AgendaServiceEventViewKt`, `CardTier`, `AgendaArmableCardKt`

### 4.1 Recipiente
- Fundo **surfaceContainerLowest (#FFFFFF)**, canto **8dp** (`CardCornerRadius`). O canto vira 0 no lado que encosta num buffer de preparo ou limpeza.
- Altura mínima **28dp** (`MinCardHeight`). Altura = duração × dp/min.
- **Barra lateral:** 3.5dp de largura (`AccentBarWidth`), canto 2dp, inset de 6dp à esquerda e 6dp em cima e embaixo, cor = **categoria do serviço**.
- Não há sombra no repouso. **sem evidência** de elevação.

### 4.2 Faixas por altura (`CardTier.forCard`)
| Faixa | Condição (altura do card) | Padding (início/topo/fim/base) | Ícone | Gap | Mostra |
|---|---|---|---|---|---|
| ExtraSmall | < 15min | 8/2/8/2 | 12dp | 2 | só o serviço, centrado na vertical |
| Small | < max(30min, 48dp) | 9/7/10/7 | 15dp | 3 | serviço + glifo de combo |
| Medium | < max(45min, 68dp) | 9/7/10/7 | 15dp | 3 | + linha de horário |
| Large | < max(60min, 96dp) | 10/9/11/9 | 16dp | 4 | + **nome do cliente** + horário |
| ExtraLarge | ≥ isso | 11/11/12/11 | 17dp | 5 | tudo + linhas aninhadas (reservas) |
Tipografia fixa: título 13.5sp / altura de linha 17 · secundário 12sp / 15 · horário 11.5sp.

### 4.3 Textos
- **Título = nome do serviço**: Bold, 1 linha, reticências, cor onSurface. Reserva espaço à direita para os ícones (ícone + 8dp; com combo: 2 ícones + 5dp + 8dp).
- **Cliente:** Medium 12sp, onSurfaceVariant. Sem cliente: "Sem cliente" (`agenda_no_client_assigned`).
- **Horário:** ícone `Schedule` (outlined) + texto "HH:mm - HH:mm" Medium 11.5sp em onSurfaceHint. Espaçamento 4dp.
- **Cancelado:** título **riscado** e em onSurfaceVariant. O cliente passa para onSurfaceHint.

### 4.4 Ícone de status (canto superior direito) — `comp/AgendaStatusGlyphKt`
| Status | Ícone | Cor |
|---|---|---|
| Confirmed | `icon_circle_check` | primary #2467BB |
| NoShow | `icon_warning_triangle` | error #B3261E |
| Pending + canal Online | `icon_clock` | success #2E7D32 |
| Pending + canal Manual | `icon_person_walking_duo` | secondary #884F59 |
| Pending + canal desconhecido | `icon_clock` | onSurfaceVariant |
| Cancelled | `icon_xmark_circle` | onSurfaceVariant |
| Completed | `icon_check_fill` | onSurfaceVariant |
- Combo: `icon_combos` (a11y "Combo") ao lado, com gap de 5dp, nas faixas a partir de Small.
- Promoção vira tag no modelo (`ServiceEventTag.Promotion`). **sem evidência** de ícone na timeline.

### 4.5 Buffers de preparo e limpeza
[código] `AgendaBufferZone`, usando `leadingTimeMinutes` e `trailingTimeMinutes` do serviço:
- Faixa colada acima (preparo) ou abaixo (limpeza) do card.
- Fundo na cor da categoria α **0.03**, com listras diagonais α **0.07** de 3dp.
- Barra lateral **tracejada** (traço 4dp, vão 3dp) na cor da categoria. Padding 4dp, espaço 8dp.
- Rótulo "Preparo 10min" / "Limpeza 10min" só quando a faixa tem ≥ 20dp de altura.

### 4.6 Estados de exibição — `model/AgendaCardDisplayState`
- `Resting`: α 1. `Dimmed`: **α 0.4** (todos os outros cards enquanto um está armado). `Armed`.
- Alpha animado com `tween(300ms, FastOutSlowIn)` (`AgendaCardDisplayAlphaKt`).
- Quando a duração diminui, a parte removida fica desenhada com **α 0.5** (`DurationChangeAlpha`, BlendMode DstIn).

### 4.7 Reservas (horário fixo recorrente) — `comp/AgendaReservationEventViewKt`
- Fundo surfaceContainerLowest + véu **tertiaryContainer α 0.06**. Canto 8dp.
- Barra de 3.5dp em **tertiary #B61055**.
- Ícone `icon_lock_fill`.
- Linha principal = cliente, ou o motivo se não houver cliente. Linha secundária = motivo ("%1$s +%2$d" quando há serviços extras).
- Linhas aninhadas (11sp/14, 17dp cada, separadas por bolinhas de 3dp com α 0.6) mostram "HH:mm serviço profissional".
- Não pode ser armada. Tocar abre `ReservationActionsSheet`, e isso fica bloqueado enquanto há algo armado.

### 4.8 Bloqueios (folga do profissional) — `comp/DayTimelineOffTimeBlockKt`
- Card de canto 8dp com listras onSurface α **0.06**.
- Barra de identidade de 3.5dp em onSurfaceVariant α **0.3**, inset 6dp.
- Texto: título **Bold** (label ou nome do profissional; fallback "Block") + horário em Medium onSurfaceVariant.
- Ícone `icon_calendar_xmark` em cima à direita. a11y "Blocked time".
- Pode ser armado se ainda não acabou (`AgendaArmState.canArm(offTime, now)`). Tocar abre `BlockingDetailSheet`.

---

## 5. Gestos

| Gesto | Comportamento | Fonte |
|---|---|---|
| Toque no card | abre `AppointmentDashboardSheet` (bloqueado enquanto há algo armado) | `AgendaArmableCard` lambda$15, `AgendaScreen$8` |
| **Toque longo no card** | **haptic `LongPress`** + arma o card no minuto tocado (`onArm(target, y/pxPorMin)`). Só funciona se `canArm`: status Pending/Confirmed **e** dia ≥ hoje | `AgendaArmableCard` lambda$8, `AgendaArmState.canArm` |
| Toque longo em espaço vazio | **sem evidência** (não há detector de toque na grade; criar agendamento é pelo FAB) | — |
| Arrastar (armado) | move o card; a alça do card é decidida por `AgendaCardGrip.forTouch`: tocar a menos de min(alturaDaAlça, metade do card) do fundo = **BottomEdge** (redimensionar), senão **Card** (mover) | `AgendaArmedCardDragKt`, `AgendaCardGrip` |
| Alça de redimensionar | barrinha de 32×4dp, pílula, centralizada embaixo. a11y "Drag to change the duration" | `AgendaArmableCardKt.AgendaResizeGrip` |
| Encaixe | **5 minutos** (`SnapMinutes`). Duração mínima de **5min**. Ímã no horário original (se estiver mais perto que o múltiplo de 5) | `AgendaDragProposal.snapToFiveMinutes/nearestStop/nearestEndStop` |
| Obstáculos | o serviço não pode cruzar **os outros serviços do mesmo agendamento**. O bloqueio não pode cruzar serviços do mesmo profissional (cancelados ficam de fora). Se cruzar, pula para o ponto livre mais próximo. Redimensionar para no início do próximo obstáculo | `AgendaDragProposal.of`, `movedTo`, `resizedTo` |
| Limites | o card fica dentro do mesmo dia (0–1440) | `getLatestStartMinute` |
| Rolagem na borda | faixa de **72dp** no topo e na base. Velocidade proporcional à profundidade, até **900dp/s**. Tick máximo de 1/30s | `ArmedEdgeScrollBand`, `ArmedEdgeScrollMaximumSpeedPerSecond`, `model/AgendaEdgeAutoScroll` |
| Toque fora | um toque curto (antes do `longPressTimeout`, sem passar o slop) sai do modo armado | `AgendaArmedChromeKt.detectArmedExitTap` [escopo exato: inferência] |
| Pinça | zoom (2.7) | — |
| Swipe horizontal | troca de dia (desligado com mês aberto ou card armado) | 2.5 |

---

## 6. Modo "armado" (editar horário arrastando)

**Estado** [código] `model/AgendaArmState`: `armedTarget` (`AgendaArmTarget.Service(serviceEventId)` ou `.OffTime(teamMemberId, offTimeId)`) · `anchorMinute` · `notifiesClient` (começa **false**) · `proposal: AgendaDragProposal` · `saveStatus ∈ {Idle, Saving, Saved, Failed}`.
`ui/ArmedChromeTarget` só guarda o último alvo armado, para o cromo continuar renderizando durante a animação de saída [inferência a partir do campo mutável `value`].

**Fluxo:**
1. Toque longo → `onArm`. O zoom anima até `max(atual, 4dp/min)` com `tween(300ms, FastOutSlowIn)` (`ArmZoomAnimationSpec`). O scroll é ajustado para o minuto tocado ficar no mesmo lugar (`anchoredScrollTarget`, `armedTopReserve`). As linhas de 5min aparecem. Os outros cards ficam com α 0.4. Swipe de dia e cromo normal são desligados.
2. **Troca de cromo:** barras normais saem e as de edição entram com `slideVertically(±altura) + fade`, tween 300ms FastOutSlowIn (`armChromeEnter/Exit/Tween`). Topo desliza para cima e base para baixo [código, sinal pelo parâmetro booleano].
3. **Barra superior armada** (`AgendaArmedTopBar`): `FigarooTopAppBar` sem navegação. Título = **data completa localizada** (FormatStyle.FULL, primeira letra maiúscula, ex.: "Sábado, 18 de outubro de 2026"), titleLarge com AutoSize entre titleSmall e titleLarge. Embaixo, um aviso em labelMedium:
   - Serviço: "To move to another day, **reschedule** instead." ("reschedule" em Bold primary e clicável → fluxo de remarcar) [PT: "Para mudar de dia, use **remarcar**."].
   - Bloqueio: "Blocks can only move within this day." [PT: "Bloqueios só podem ser movidos dentro do mesmo dia."].
4. **Chip de horário no card** (`AgendaArmedTimeChip`): fundo surfaceContainerHigh, canto chip 8dp, padding 6×2dp, SemiBold centralizado. Mostra "HH:mm - HH:mm" (uma linha, empilhado ou só o início, conforme o espaço: `AgendaArmedChipLayout`). Quando a proposta é inválida, o texto fica em **error**:
   - "Must be after now" (começa no passado)
   - "Must end after now"
   - "Invalid time"
5. **Barra inferior armada** (`AgendaArmedBottomBar`), fundo surfaceContainerHigh:
   - Linha com switch (`FigarooSwitch`, linha inteira clicável) **só para serviço**. O texto segue os canais do cliente: "Notify client" / "Notify client by WhatsApp" / "…by email" / "…by WhatsApp and email".
   - Botões: **"Discard"** (Outlined; desativado enquanto salva) e **"Save changes"** (estado Loading em `Saving`, Success em `Saved`, Idle se `canSave`, senão Disabled).
   - `canSave` = armado, sem salvamento em curso, com mudança e proposta válida.
6. **Salvar** (`AgendaViewModel.saveArmedAppointment` → `IAgendaRepository.rescheduleAppointment(id, RescheduleAppointmentRequest(services, notifyClient))`; bloqueio → `ITeamMembersRepository.updateOffTime(…, proposedStart, proposedEnd)`): Saving → sucesso → **Saved** e o botão mostra "Done!" por **1000ms** (`AgendaArmedSave.SuccessDwellMillis`, `delay(1000)`) → desarma.
7. **Falha** (`RescheduleError`/`ApiError`) → `Failed` → `FigarooErrorDialog` com "Couldn't save" e "We couldn't reschedule this appointment. Try again or discard the change." (para bloqueio: "We couldn't move this block. …").
8. Regras de validade (`invalidReason`): início no passado é inválido, exceto quando só a duração mudou num bloqueio já iniciado (`keepsPastStart`). O fim precisa ser > agora. Exige fim > início e fim ≤ 1440.

---

## 7. Modo lista — `comp/AgendaListViewKt`
- `LazyColumn` com **cabeçalho fixo por dia** (`stickyHeader "header-<data>"`). Intervalo = do menor ao maior dia com dados (`populatedAgendaDays`), passando por **todos os dias do meio**, inclusive os vazios. O título da navegação é "Agendamentos".
- Ordem: por horário de início dentro do dia (`buildDayEvents`). Gaps são removidos.
- **Status do dia** (`AgendaListDayStatus`): HasEvents · Closed (bloqueio de 0 a 1440) · Empty. Placeholders: "Fechado" e "Nada marcado".
- **Cabeçalho do dia** (`AgendaListDayHeaderKt`): número "d MMM" em 20sp/24, espaçamento −0.3. Dia da semana em 13.5sp/17. Pílula **"Hoje"** (11sp, raio 999, padding 8dp) no dia atual. À direita, 12.5sp: "**N cortes · R$ X**" (plural `agenda_day_total_cuts`: "%d corte" / "%d cortes"; total em centavos de `DayTotals`), ou "Livre" / "Fechado". Padding superior de 14dp.
- **Linha** (`AgendaListRowKt`): coluna de hora à esquerda ("HH:mm" 14sp/18 + duração 11.5sp, deslocamento de 13dp no topo). Espaço de 12dp até o card. Card com altura mínima de 64dp, barra de **4dp** em pílula na cor da categoria (inset 6dp e 10dp). Padding 11×10dp. Título 14sp/18, subtítulo 12.5sp/16. Linha de metadados 11.5sp com bolinhas de 3dp (α 0.6). Glifo de status de 17dp em cima à direita. Combo com recuo de 54dp. 10dp entre linhas.
- Reservas: `AgendaListReservationRow`.
- Vazio: `FigarooTopLeftEmptyState` com "No appointments yet" / "Appointments will appear here as soon as they're booked." [PT já existe em `agenda_empty_title/subtitle`: "Sem agendamentos" / "Os agendamentos aparecerão aqui assim que forem marcados."].
- **Busca e filtros na lista: sem evidência** nesta tela. Existe `AppointmentSearchPage`/`searchAppointments` no repositório [inferência: outra tela].
- O filtro de profissional e de localidade vale para os dois modos (`filteredAppointments`).

---

## 8. Filtro de profissional e localidade
- **Uma agenda por vez:** `filteredAppointments` mantém só os serviços com `teamMemberId == profissional selecionado`. **Não existem colunas por profissional** [código] `AgendaViewModel$filteredAppointments$1`.
- Sheet `AgendaTeamMemberFilterSheet`: título "Agenda", subtítulo "Escolha qual agenda você deseja visualizar.", lista com disponibilidade ("Hoje · %1$s - %2$s." / "Não disponível hoje."), botão Tonal "Ver minha agenda".
- Sheet de localidade: "Localidade" / "Escolha qual localidade você deseja visualizar.".

## 9. Carregando, erro e vazio
- **Carregando** (`Loadable.Loading`): `FigarooContainedLoadingIndicator` centralizado, com padding superior = altura do seletor + 20dp.
- **Erro:** coluna centralizada com padding horizontal de 24dp e espaço de 8dp:
  - "Não foi possível carregar a agenda" (onSurface)
  - "Verifique sua conexão e tente novamente." (onSurfaceVariant)
  - botão de texto "Tentar novamente".
- **Dia vazio na timeline:** só a grade, sem mensagem [inferência; não achei estado vazio no `DayTimelinePage`].
- **Snackbars:** "Time blocked", "Block removed", "Appointment created, but the client wasn't added. You can add it from the appointment.".

## 10. Animações (resumo)
| O quê | Spec |
|---|---|
| Armar/desarmar: zoom, cromo, revelação do seletor | tween 300ms FastOutSlowIn |
| Alpha dos cards (dimmed/armed) | tween 300ms FastOutSlowIn |
| Reorganizar colunas | tween 300ms FastOutSlowIn (snap na 1ª vez) |
| Semana ↔ mês | spring(damping 1.0, stiffness 400), limiar de posição de 50% |
| Cores da pílula do dia / seleção deslizante / linha "agora" | `MotionScheme.fastSpatialSpec` (M3 Expressive) |
| Calendar ↔ List | fadeIn/fadeOut + SizeTransform (padrão) |
| Seletor some no modo lista | slide vertical + fade (padrão) |
| Toast de onboarding | slide de 320ms |
| Scroll para agora | instantâneo na abertura, `animateScrollTo` padrão no botão |
| Troca de dia | `animateScrollToPage` padrão |

## 11. Strings da tela (literais)
PT já no app: Agenda · Hoje · Livre · Fechado · Almoço · Abre às %1$s · Nada marcado · Sem cliente · Sem agendamentos · Os agendamentos aparecerão aqui assim que forem marcados. · Não foi possível carregar a agenda · Verifique sua conexão e tente novamente. · Tentar novamente · Localidade · Selecionar localidade · Trocar localidade · Trocar agenda · Ver minha agenda · Hoje · %1$s - %2$s. · Não disponível hoje. · Preparo · Limpeza · Agendamentos · %d corte(s).
EN no app (com PT sugerido [inferência]): Today→Hoje · Switch to list view→Ver em lista · Switch to calendar view→Ver calendário · Toggle calendar→Mostrar calendário · Open notifications→Abrir notificações · Create/Close→Criar/Fechar · Sell package→Vender pacote · Reserve time→Reservar horário · Block time→Bloquear horário · Schedule appointment→Agendar · Resume setup→Retomar configuração · Combo · Blocked time→Horário bloqueado · Block→Bloqueio · Drag to change the duration→Arraste para mudar a duração · Must be after now→Precisa ser depois de agora · Must end after now→Precisa terminar depois de agora · Invalid time→Horário inválido · Notify client (by WhatsApp / email / WhatsApp and email)→Avisar cliente (por WhatsApp / e-mail / WhatsApp e e-mail) · Discard→Descartar · Save changes→Salvar alterações · Saving…→Salvando… · Done!→Pronto! · Couldn't save→Não foi possível salvar · To move to another day, reschedule instead.→Para mudar de dia, use remarcar. · Blocks can only move within this day.→Bloqueios só podem ser movidos no mesmo dia.

## 12. Notas para o Cortaí [inferência]
- O "armado" equivale ao "Desfazer"/edição local do Cortaí. O Figaro **não grava ao soltar o dedo**: exige "Salvar alterações" e tem o switch "Avisar cliente". A validação local (passado, mesmo dia, obstáculos) não substitui o motor oficial, e o Cortaí deve continuar travando no banco (`agendamentos_sem_sobreposicao`).
- No Figaro a timeline do dia vai de 0 a 24h e marca o fora do expediente com listras. Isso não muda a regra do Cortaí: a disponibilidade vem só de `disponibilidade.ts`.
- Datas no Figaro usam `ZoneId.systemDefault()` (fuso do aparelho). No Cortaí continua valendo o fuso do tenant.
