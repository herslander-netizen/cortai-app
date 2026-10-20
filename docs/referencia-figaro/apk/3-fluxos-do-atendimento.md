# Spec 3 — Fluxos de atendimento do Figaro (referência para o Cortaí)

> Fonte: APK do Figaro decompilado (jadx), pacote `com.figaroo.android`. Caminhos relativos a `agenda/ui/` salvo indicação.
> Convenção: **[código]** = observado no código (arquivo + identificador). **[inferência]** = dedução. **sem evidência** = não encontrado.

## 0. Avisos gerais

- **Textos em português: sem evidência no APK.** O APK analisado é o *base split*; `res/xml/splits0.xml` aponta as traduções para `config.pt` (split ausente) e `locales_config.xml` declara `en` e `pt-BR`. O `res/values/strings.xml` contém só inglês, exceto 3 textos fixos em PT: `agenda_today_pill = "Hoje"`, `agenda_team_member_availability_format = "Hoje · %1$s - %2$s."`, `agenda_team_member_not_available_today = "Não disponível hoje."`. Todas as outras strings abaixo são **o valor inglês do recurso** e, entre parênteses, uma **tradução sugerida [inferência]**.
- Tokens de espaçamento (`designsystem/theme/Dimensions`, valores padrão): xxs 2, xs 4, sm 8, mdSm 12, md 16, mdLg 20, lg 24, xl 32, 2xl 48, screenEdgePadding 16, screenPaddingHorizontal 20, dashboardSectionSpacing 32, adaptiveListGroupGap 2, iconSizeXs 16, iconSizeSm 20, iconSizeMd 24, sectionHeroIconSize 36, touchTargetMin 48, ctaHeight 56.
- Cores semânticas (`designsystem/theme/ColorKt`, `ThemeKt`): primary claro `Primary50 #2467BB`, primary escuro `Primary80 #9FBEF6`; success claro `#2E7D32` / escuro `#43A047`; warning claro `#B6730F` / escuro `#E08E22`; error claro `Error40 #B3261E` / escuro `#F2B8B5`; `cardTile` claro `#FFFFFF` / escuro `Neutral17 #3E4440`.

## 1. Ficha do agendamento (`appointmentdashboard`)

### 1.1 Entrada e navegação [código]
- Duas variantes:
  - **Sheet** `AppointmentDashboardSheetKt.AppointmentDashboardSheet(appointmentId, navController, onDismiss)` — usada pela Agenda (`AgendaScreenKt$AgendaScreen$8`), pelo painel do cliente (`AppNavHostKt$AppNavHost$4$1$32`) e pelo histórico (`$34`). É um `ModalBottomSheet` M3 com `rememberModalBottomSheetState(skipPartiallyExpanded = false)` (abre em meia altura e pode expandir), cor `colorScheme.surface`.
  - **Tela cheia** `AppointmentDashboardScreenKt.AppointmentDashboardScreen` na rota `NavigationRoute.AppointmentDashboard` (`AppNavHostKt` l.360), com `FigarooTopAppBar` de título `appointment_dashboard_navigation_title` = "Appointment" ("Agendamento").
- Dentro da sheet há duas "páginas" (`SheetPage.Appointment` / `SheetPage.Checkout`) trocadas por `AnimatedContent` com slide horizontal (entra pela direita indo para Checkout, volta pela esquerda), sem fade, `SizeTransform(clip=false)`, especificação padrão (spring). Ir para Checkout chama `sheetState.expand()` (`...$2$2$1$1`).
- Fechar: `sheetState.hide()` e depois `onDismiss` (`...$2$1$1`). Depois de cancelar com sucesso a sheet **se fecha sozinha** (`AppointmentDashboardSheetBody$4$1`: `cancelSucceeded` → `onHide`).
- Navegações saindo da sheet (`AppointmentDashboardSheetKt` l.1463–1481 e efeitos `SheetBody$5..8`):
  - Toque na linha do cliente → `ClientDashboard.forClient(clientId)` (só se houver cliente).
  - "Trocar cliente" → `AppointmentClientPicker.forAppointment(id)` (tela cheia). O resultado volta por `savedStateHandle[ArgSelectedClientId]` → `viewModel.onClientPickerResult` → `setAppointmentClient` (PATCH). Erro: snackbar `appointment_dashboard_set_client_error` = "Could not update client." ("Não foi possível atualizar o cliente.").
  - "Reagendar" → `rescheduleNavigation` → `EditAppointmentTimeSlot.forAppointment(id)` (**tela cheia**, não sheet).
  - Ver recibo → `SaleDashboard.forSale(saleId)`.
  - Renovar pacote → `sheetState.hide()` + `SellPackageFlow.buildRenewal(...)`.
- Depois de salvar o reagendamento, a tela de edição faz `popBackStack()` e grava `ArgAppointmentUpdated = true` na entrada anterior (`AppNavHostKt$AppNavHost$4$1$19`). A sheet observa (`SheetBody$8$1`) → `onRescheduleResult()` → `retry()` → `load()`, que **volta para `Loading`** (indicador) e recarrega. **A sheet continua aberta** [código], mas passa rapidamente pelo estado de carregamento.

### 1.2 Estados [código]
- `AppointmentDashboardUiState`: `Loading`, `Error(e)`, `Success(appointment, client, notes, packageLinked, isLastPackageVisit)`.
- Loading na sheet: `Box(fillMaxWidth, fillMaxHeight(0.5f))` centralizado com `FigarooContainedLoadingIndicator` (`SheetPeekLoaderFraction = 0.5f`).
- Erro (`SheetErrorState`): texto `appointment_dashboard_error_title` = "Couldn't load this appointment" ("Não foi possível carregar este agendamento") + `FigarooTextButton` `appointment_dashboard_error_retry` = "Try again" ("Tentar novamente").
- Snackbars (`FigarooSnackbarHost`, alinhado embaixo): erro ao cancelar "Could not cancel appointment.", erro de não comparecimento "Could not mark appointment as no show.", erro ao trocar cliente.

### 1.3 Layout, de cima para baixo (`AppointmentDashboardContentKt`)
Coluna com `verticalScroll`, padding horizontal `screenEdgePadding` 16, topo `spacingXs` 4, base `spacingMd` 16.

1. **Grupo hero** (`AppointmentHeroGroup`): `FigarooListGroup` com espaço de 2dp e dois blocos `Surface` de cor `cardTile`, com cantos de grupo (o primeiro tem os cantos de cima externos e o segundo os de baixo).
   - **Bloco de serviço** (`HeroServiceTile`, padding 16/12/16/14):
     - Linha: **título = nome do PRIMEIRO SERVIÇO** (não o nome do cliente), `titleLarge` Bold, `onSurface`, 1 linha com reticências. Se houver mais de um serviço, aparece uma pílula `+N` (Surface em círculo, `primary`/`onPrimary`, `labelMedium` Bold, padding 8×2, margem esquerda 8).
     - **Status** (`StatusIndicatorRow`): ícone de 20dp + texto `bodySmall` Bold na cor do status, com espaço de 4 (tabela em 1.4).
     - Linha de data (topo 4, espaço 4): `heroWhenLabel` = "Hoje" se a data for hoje, senão data `FormatStyle.MEDIUM` do locale (ex.: "18 de out. de 2026"), `bodySmall` SemiBold, `onSurfaceVariant` + `heroTimeRange` = "HH:mm · HH:mm" (formato curto do locale, **separador " · "**, não "-") em `brandTypography.monoMedium`, `onSurfaceVariant`.
     - **Profissionais**: `FlowRow` (topo 8, espaço 8) de `FigarooMemberChip` com o **primeiro nome** e o avatar (thumbnail) de cada profissional distinto entre os serviços.
   - **Bloco do cliente** (`HeroClientRow`, altura mínima 64, padding 16/12/20/12, clicável → perfil do cliente): avatar circular de 36dp `surfaceContainerHighest` com ícone `icon_user` de 20dp `onSurfaceVariant`; nome em `bodyLarge` SemiBold `onSurface` 1 linha; sem cliente → `appointment_dashboard_no_client_assigned` = "No client" ("Sem cliente"). **Telefone/WhatsApp: sem evidência na ficha** (a linha mostra só avatar + nome).
2. **"Trocar cliente"**: `FigarooPrimaryButton` **Tonal**, tamanho **Small**, ícone `SwapHoriz`, texto `appointment_dashboard_change_client` = "Change Client" ("Trocar cliente"), topo 8. **Só aparece quando `isEditable` = status Confirmed E início no futuro** (`AppointmentDashboardContentKt.isEditable`). Agendamentos pendentes ou já iniciados não mostram o botão.
3. Cabeçalho de seção `FigarooSectionHeader(style=Form)` "Services" ("Serviços"), topo 32, base 8.
4. **Cartão de serviços** (`components/ServicesCardKt.ServicesCard`): `FigarooListGroup`, um bloco por serviço (`ServiceRow`, padding 16/12):
   - à esquerda: nome do serviço (`bodyLarge` Bold) e, abaixo, **nome completo do profissional** (`bodySmall` Medium, `onSurfaceVariant`);
   - à direita: preço original riscado (`bodySmall`, "tnum", LineThrough) quando `originalPrice != price`, depois o preço (`bodyLarge` Bold, tnum) e, abaixo, "HH:mm · HH:mm" do serviço (mono);
   - último bloco `TotalRow`: "Total" (`appointment_dashboard_total_price`), ou "Paid by package" ("Pago pelo pacote") quando ligado a pacote; valor em `titleMedium` Bold tnum. A moeda é BRL, salvo locale US (`formatCurrency`).
   - `PackageRenewalNotice` quando é a última visita do pacote: "This is the last appointment." (SemiBold) + "The package can be renewed at the last appointment's checkout.".
5. "Notes" ("Observações", seção Form) + `AppointmentNotesCard` — só se houver notas do cliente.
6. `FigarooInfoNote` com `icon_info_circle`: "In progress - the client and services can be adjusted at checkout." ("Em andamento — cliente e serviços podem ser ajustados na cobrança."), topo 16. Aparece quando o atendimento já começou (a condição decompilada está invertida pelo jadx; [inferência]: Confirmed e início ≤ agora).

### 1.4 Status e cores [código: `statusIndicator`, `AppointmentStatus`]
Status do modelo: `Pending` ("pending"/"pending-approval"), `Confirmed`, `Completed`, `NoShow` ("no-show"), `Cancelled`. **Não existe "chegou" nem "em atendimento" como status**; "Em andamento" é derivado (`isOngoing` = Confirmed e agora entre o início e o fim).

| Situação | Ícone | Cor | Texto (en → pt sugerido) |
|---|---|---|---|
| Em andamento (derivado) | `icon_play_fill` | `primary` | "In Progress" → "Em andamento" |
| Pending | `icon_calendar_clock` | warning | "Pending Approval" → "Aguardando aprovação" |
| Confirmed | `icon_checkmark_circle` | success | "Confirmed" → "Confirmado" |
| Completed | `icon_checkmark_circle` | `onSurfaceVariant` | "Completed" → "Concluído" |
| NoShow | `icon_user_slash_duo` | warning | "No Show" → "Não compareceu" |
| Cancelled | `icon_trash` | error | "Cancelled" → "Cancelado" |

### 1.5 Ações fixas embaixo (`AppointmentDashboardDockedActionsKt`) [código]
Container: `Box(fillMaxWidth, navigationBarsPadding, padding 16/16/16/24)` com `Alignment.CenterEnd`, ou seja, **botão alinhado à direita**, flutuando sobre o conteúdo. O ramo vem de `dockedActionsBranch(appointment, now)`:

1. **Checkout** — `canCheckout` = Confirmed e início ≤ agora. Botão principal **"Checkout" ("Cobrar/Finalizar")** com ícone `icon_cart_checkout`. Se houver itens no menu, vira `FigarooSplitButton` (Medium) com chevron. Itens, nesta ordem:
   1. "Reschedule" ("Reagendar"), ícone `EditCalendar` — se `canReschedule` (Pending/Confirmed);
   2. "No Show" ("Não compareceu"), ícone `PersonOff` — se `canSetNoShow` (Confirmed e início ≤ agora).
   Sem itens → `FigarooExtendedFAB` simples.
2. **Reschedule** — status Pending ou Confirmed com início no futuro. Botão principal **"Reschedule" ("Reagendar")**:
   - se `canCancel` (Pending/Confirmed e início > agora): `FigarooSplitButton` com um único item **"Cancel Appointment" ("Cancelar agendamento")**, ícone `DeleteOutline`, flag destrutiva = `true`;
   - senão: `FigarooExtendedFAB` com ícone `icon_calendar_clock`.
3. **Receipt** — Completed com `saleId`: `FigarooExtendedFAB` **tonal** "View Receipt" ("Ver recibo"), ícone `ReceiptLong`.
4. **None** — nada (Cancelled, NoShow, Completed sem venda).

- **Cancelar** → `onCancelClick` mostra o `AlertDialog` (`AppointmentDashboardScreenKt.CancelConfirmationDialog`):
  - título "Cancel Appointment" ("Cancelar agendamento");
  - texto "We will send a message letting your client know and this appointment will be removed from your agenda." ("Vamos avisar o cliente por mensagem e este agendamento sairá da sua agenda.");
  - confirmar: `FigarooTextButton` tom **Destructive** "Cancel Appointment"; dispensar: "Keep Appointment" ("Manter agendamento").
  - Confirmar chama `cancelAppointment`, muda o status localmente para Cancelled e fecha a sheet.
- **Não compareceu**: **sem diálogo de confirmação** — chama `setAppointmentStatus(NoShow)` direto e atualiza a ficha (`onNoShowClick$1`).
- **Checkout**: na sheet, troca para a página interna `SheetPage.Checkout` e expande a sheet; na tela cheia, navega para `AppointmentCheckout`.

## 2. Reagendar — `editappointmenttimeslot` + `timeslotselector`

### 2.1 Tela [código]
- Rota `EditAppointmentTimeSlot` (tela cheia, transições intra-fluxo: slide horizontal de 20% + fade, 300 ms, `FastOutSlowIn` — `core/navigation/NavTransitionsKt`).
- `FigarooTopAppBar` com título "Reschedule" ("Reagendar") e voltar.
- Estados: `Loading` (indicador), `Error` ("Couldn't load this appointment" + "Try again"), `Loaded(appointment, initialServices, isSubmitting, justSucceeded, submitError)`.
- Conteúdo: `TimeSlotSelectorScreen`, que tem:
  1. Subtítulo `FigarooFlowHeaderSubtitle`: "Pick one of the available time slots, or choose Manual to set any start time." ("Escolha um dos horários disponíveis ou use Manual para definir qualquer horário de início.");
  2. **Cartão do mês** (`TimeSlotMonthCalendar`);
  3. `FigarooConnectedButtonGroup` com duas opções: "By availability" ("Por disponibilidade") / "Manual";
  4. a lista correspondente (`TimeSlotSelectorAvailabilityList` ou `TimeSlotSelectorManualList`).
  - Tudo em `verticalScroll` com padding horizontal de 20.

### 2.2 Calendário do mês (`TimeSlotSelectorMonthCalendarKt`) [código]
- Cartão: `clip(shapes.large)`, fundo `cardTile`, padding 12/12/12/14.
- Cabeçalho: "MMMM yyyy" com a primeira letra maiúscula (ex.: "Outubro 2026"), na tipografia de marca da agenda. Chevrons `KeyboardArrowLeft`/`Right` de 40dp (ícone de 24), com rótulos "Previous month"/"Next month". O chevron anterior usa a cor `onSurfaceHint` (mais apagada) e o seguinte `onSurface`. **Não há trava** para voltar meses [código: `minusMonths(1)` sem condição].
- Linha de dias da semana: `onSurfaceHint`, centralizada; espaço até a grade de 6.
- Célula do dia (`DayCell`, 40dp, círculo; espaço entre linhas de 2):
  - selecionado: fundo `primary`, texto `onPrimary` Bold;
  - hoje (não selecionado): anel `primary` de 1,5dp e texto `primary` SemiBold;
  - **dias passados: desabilitados** (`clickable(enabled = !isPast)`), alfa 0,45, cor `onSurfaceHint`;
  - os demais dias, inclusive futuros sem horário, ficam **habilitados**;
  - número em `headlineSmall` base 16sp/20sp, tnum;
  - ponto de marcação de 4dp embaixo quando a data está no conjunto marcado (`onPrimary` se selecionada, `tertiary` se não). No reagendamento o conjunto **não é passado** (vazio), então não há pontos.

### 2.3 "Por disponibilidade" [código]
- Horários de `SlotPacker.pack`: **passo de 15 min** (`STRIDE_MINUTES = 15`) a partir do início da primeira janela de disponibilidade do dia, arredondado para cima. Os serviços são encaixados **em sequência** (o fim de um é o início do seguinte). Cada serviço precisa de pelo menos um profissional qualificado (`qualifiedTeamMemberIdsByRateId`) com janela cobrindo seu intervalo. Só entram horários depois de `now`. As janelas vêm de `IAgendaRepository.fetchAvailability()` (servidor).
- Ao trocar de dia, os horários escolhidos são limpos.
- Lista: `FigarooListGroup`, uma `SlotRow` por horário.
  - Fechada: `SlotTopTile` com altura mínima de 56, padding 16, hora "HH:mm" (`titleMedium` Medium, 17sp/22sp, tnum, `onSurface`).
  - **Selecionada: expande** (`AnimatedContent` com fadeIn/fadeOut padrão + `SizeTransform`):
    - topo `primaryContainer`, hora em `headlineSmall` Bold 19sp/24sp, `onPrimaryContainer`;
    - `SlotBottomTile` ligado com borda de 2dp `primaryContainer` e cantos de "slot expandido" (`rememberExpandedSlotShapes`);
    - dentro, um `PackedServiceRow` por serviço: nome do serviço (`bodyLarge` Bold 15sp/20sp), "HH:mm – HH:mm" (travessão, `bodySmall` Medium 13sp, tnum, `onSurfaceVariant`), rótulo "Team member" ("Profissional") e o `ProDropdown`: nome do profissional em `bodyMedium` SemiBold 14sp, cor `primary`, com `ArrowDropDown` de 20dp.
  - Ao escolher um horário, cada serviço recebe o **primeiro** profissional elegível (`onSlotSelected`).
- Vazio: `EmptySlotsCard` "There are no available team members on this day." ("Não há profissionais disponíveis neste dia.").
- **Seletor de profissional** (`ProPickerSheet`): `FigarooSheetScaffold` com `FigarooSheetExpansion.Partial`, título "Team member" e `FigarooListGroup` de `AgendaTeamMemberPickerRow` (avatar + nome + linha de disponibilidade).
  - A linha de disponibilidade (`components/TeamMemberAvailabilityKt`): ícone `CheckCircle` em success + **"Hoje · HH:mm - HH:mm."**, montado do horário semanal do profissional (`weeklyAvailability`, `workingHours` com `%02d:%02d`) **para o dia de HOJE** (`LocalDate.now()`, porque `ProPickerSheet` é chamado com `localDate = null`), **não para o dia escolhido** [código; possível defeito].
  - Sem horário hoje: ícone `DoNotDisturbAlt` + "Não disponível hoje.".
  - Na linha selecionada a cor é `onPrimaryContainer`.
  - A lista mostra só os profissionais qualificados para o serviço naquele horário (`slotService.teamMemberIds`).

### 2.4 Botão Salvar (FAB) [código]
- `FigarooExtendedFAB` "Save" ("Salvar"), ícone `Check`:
  - `expanded` = `rememberFabExpanded(scrollState)`: **recolhe para círculo de 56dp quando a rolagem desce** e volta a expandir ao subir ou no topo (`EditAppointmentTimeSlotScreenKt$rememberFabExpanded$1$1`). A animação de recolher dura `MorphCollapseDurationMillis = 220`, com o rótulo encolhendo até a escala 0,7;
  - `enabled` = `selectorState.isValid` (todos os serviços com horário e profissional, sem sobreposição; no modo disponibilidade também é preciso ter escolhido um horário);
  - `loading` = `isSubmitting || justSucceeded` (indicador de 32dp);
  - `success` = `justSucceeded` (check mantido por `FigarooExtendedFabSuccessHoldMillis = 700`);
  - desabilitado com alfa 0,55 no fundo e 0,85 no conteúdo; elevação 6dp; espaço ícone-rótulo de 12.
- Envio (`EditAppointmentTimeSlotViewModel.submit`): `RescheduleAppointmentRequest(services=[{appointmentServiceId, teamMemberId, startTime}], notifyClient = true)` — **o cliente é sempre notificado, sem opção na tela**.
  - Sucesso: `agendaState.upsert` + `notifyAppointmentChanged`, `justSucceeded = true`, **espera 700 ms** e emite a conclusão → `popBackStack` + `ArgAppointmentUpdated`.
  - Erros: `FigarooErrorDialog` com título "Couldn't save" ("Não foi possível salvar") e texto "This appointment can no longer be rescheduled." (`RescheduleError`) ou "Could not reschedule appointment." (erro de transporte).

### 2.5 Modo "Manual" (`TimeSlotSelectorManualListKt`) [código]
- Ao entrar em Manual sem horários definidos (`servicesForManualMode`), os serviços são encadeados a partir de: **hoje** → próxima hora cheia (`min(hora+1, 23):00`); **outro dia** → **09:00**. Cada serviço recebe o profissional padrão (o primeiro que faz o serviço, restrito ao próprio usuário quando `restrictToSelfTeamMemberId`).
- Um `ManualServiceCard` por serviço: título "Nome do serviço" + "HH:mm – HH:mm". Dentro de um `FigarooListGroup` há duas `FigarooListRow`:
  - "Start time" ("Horário de início"), que abre o `TimePickerDialog`; vazio mostra "--:--";
  - "Team member" ("Profissional"), que abre o seletor de profissional.
- Avisos:
  - `FigarooSupportingText` "No team member can perform this service. Assign it to a team member in settings to continue." ("Nenhum profissional faz este serviço. Atribua-o a um profissional nas configurações para continuar.");
  - `UnavailableTeamMemberBanner` "%1$s is unavailable at the selected time." ("%1$s não está disponível no horário escolhido."), via `isTeamMemberAvailable` contra as janelas — **é só aviso, não bloqueia o envio** (`computeIsValid` no Manual só exige horário e profissional, e nenhuma sobreposição);
  - `OverlappingServicesBanner` "The service times cannot overlap, adjust to continue." ("Os horários dos serviços não podem se sobrepor, ajuste para continuar."), que bloqueia.
- O cabeçalho da data usa o padrão `appointment_timeslot_selector_date_pattern` = "EEEE, MMMM d, yyyy" (no PT, sem evidência).
- Passo de minutos do `TimePicker`: sem evidência (é o seletor M3 padrão, minuto livre) [inferência].
- Mudar de dia no Manual reancora os horários na nova data, mantendo hora e minuto (`reanchorToDate`).
- Modo inicial: `SelectionMode.Availability` (`TimeSlotSelectorUiState`).

### 2.6 Aviso ao cliente (`refreshRescheduleClientChannels`) [código]
- **Não pertence à tela Reagendar.** É chamado em `AgendaViewModel.onArm(...)`, ou seja, quando se **arrasta/arma um card na grade da Agenda** para mover o horário.
- Busca `ICompanyRepository.fetchNotificationSettings()` e calcula `RescheduleClientChannels.from(...)` olhando o canal com público `Client` e tipo `AppointmentRescheduled`:
  - WhatsApp e e-mail → `WhatsappAndEmail`;
  - só WhatsApp → `Whatsapp`;
  - só e-mail → `Email`;
  - nenhum → `None`;
  - antes de carregar → `Unknown`.
- UI (`components/AgendaArmedChromeKt`): um `FigarooSwitch` cujo rótulo depende do canal:
  - "Notify client by WhatsApp" ("Avisar o cliente por WhatsApp");
  - "Notify client by email";
  - "Notify client by WhatsApp and email";
  - "Notify client" (genérico, para `Unknown`).
  - `showsNotifyToggle` = canal ≠ `None` (sem canal, o interruptor some).
- **Valor inicial: desligado** (`AgendaArmState.arm(...)` cria com `notifiesClient = false`); não dá para mudar enquanto salva.
- Botões da barra armada: "Discard" ("Descartar"), "Save changes" ("Salvar alterações") → "Saving…" → "Done!".
- Avisos da barra armada: "To move to another day, reschedule instead." e, para bloqueios, "Blocks can only move within this day.".
- Na tela Reagendar o envio usa sempre `notifyClient = true` (2.4), sem interruptor.

## 3. Escolha de cliente ("Trocar cliente") [código]
- Rota `AppointmentClientPicker` (tela cheia) → `marketingdashboard/ui/clientselector/ClientSelectorScreenKt.ClientSelectorScreen(client=null, ctaLabel="", ...)` (`AppNavHostKt$AppNavHost$4$1$17`).
- Estrutura: `FigarooCollapsingHeaderScaffold`, título "Select client" ("Selecionar cliente"), subtítulo "Select a client for the appointment", busca "Search client" ("Buscar cliente"), lista `LazyColumn` **agrupada por letra inicial** (`ClientGroup(letter, ...)`) em `FigarooListGroup`, com seleção por rádio (`RadioDot`).
- Botão "Add client" ("Adicionar cliente") → `CreateClientFlow`.
- Vazio: "No clients yet. Add a client to get started."; busca sem resultado: "No clients found".
- A linha mostra o nome. **O telefone não aparece** (só `getName` e, em outro modo, o aviso "No email — tap to add one").
- FAB `FigarooExtendedFAB`:
  - sem seleção: desabilitado, "Select a client" ("Selecione um cliente");
  - com seleção: "%1$s · %2$s" = `ctaLabel` · primeiro nome. Como aqui `ctaLabel=""`, o texto seria " · Nome" [inferência; pode ser defeito].
- Confirmar grava `ArgSelectedClientId` na entrada anterior e faz `popBackStack`. A ficha então faz o PATCH (1.1).

## 4. Novo agendamento (`createappointmentflow`) [código]
- Rota `CreateAppointmentFlow` = `agenda/create?reservationEventId={id}`. Ela pode **converter uma reserva** em agendamento (`convertReservation`); se a reserva não estiver carregada, mostra "Reservation not loaded".
- NavHost interno com os passos **`client` → `services` → `timeslot` → `summary`** (mais `create-client`). Começa em `summary` quando o cliente já veio preenchido ou quando é conversão (`getHasPrefilledClient`/`isConversion`).
- Transições internas de 300 ms: o passo novo entra deslizando para a esquerda (`slideIntoContainer` Left) e o anterior sai para a esquerda; fecha deslizando para baixo, com fade de 300 ms.
- Passos:
  1. **Cliente**: `ClientSelectorScreen` com CTA "Continue" (`appointment_client_selector_continue`) e alternativa "Continue without client" ("Continuar sem cliente"). Cliente é opcional.
  2. **Serviços**: `ServiceSelectorScreen` (catálogo) com CTA "Choose time slot" ("Escolher horário"). Mostra combos aplicados: "Combo %1$s", "%d combos", "Client saves %1$s".
  3. **Horário**: o mesmo `TimeSlotSelectorScreen`, com título "New appointment" e CTA "View summary" ("Ver resumo").
  4. **Resumo**: `FigarooCollapsingHeaderScaffold` "New appointment", subtítulo "Review the appointment details before confirming". Seções "Client" (TextButton "Add client"/"Change client"; vazio "No client") e "Services" ("Change services"). Total "Total · N service(s)" ou "Paid by package". FAB "Create appointment" ("Criar agendamento"). Erro: `FigarooApiErrorDialog`.
- Validação (`isDraftSubmittable`): pelo menos 1 serviço e todos com horário e profissional.
- Não há campo de observação nem de preço manual [sem evidência].

## 5. Reserva (horário fixo) (`createreservationflow`) [código]
- Passos `client` → `reason` ("Select services", CTA "Choose dates") → `dates` ("Select dates") → `summary` ("Reservation summary").
- Datas: modo "Specific dates" ("Datas específicas") ou "Weekly" ("Semanal"), com horizonte de "2 weeks", "1 month", "2 months" ou "6 months". Prévia: "Every %1$s at %2$s, %3$s." e "Starting %1$s.".
- Profissional por serviço: seção "Professionals". Avisos "No professional performs this service." e "%1$s doesn't work at this time.".
- CTA desabilitado com motivo: "Select a professional", "Select a day", "Select at least one date".
- Resumo:
  - quantidade: "%d slot(s) will be reserved";
  - cadência: "Every %1$s · %2$s · %3$s" ou "N dates · ...";
  - por ocorrência: "Overlaps an appointment" (conflito, "Tap to resolve") e "Outside working hours" (aviso);
  - banner "%d conflicts need resolving";
  - CTA "Reserve" / "Reserve anyway" / "Resolve the conflicts to continue".
- Variante de pacote (`PackageHoldSectionsKt`): "Reservation" + "Save".

## 6. Ações da reserva (`reservationactions`) [código]
`ReservationActionsSheet` (`FigarooSheetScaffold`, `ContentHeight`), cabeçalho "Reservation" com `icon_box_heart`. Ações em `ActionGroup`, nesta ordem:
1. "Use in package" ("Usar no pacote"), com subtítulo "%1$s · %2$s left". Variações desabilitadas mostram o motivo: sem saldo, janela ainda não aberta, fora da validade.
2. "Renew package" (`Autorenew`), com subtítulo "· no visits remaining". Mostra aviso se o pacote ainda está ativo. Exige e-mail ("Email required").
3. "Convert to appointment" ("Converter em agendamento", `EventAvailable`) → fluxo de criação em modo conversão.
4. "Delete this occurrence" ("Excluir esta ocorrência") — **cor de erro**.
5. "Delete the whole series" ("Excluir a série inteira") — **cor de erro**, ícone `Delete`.

Confirmações:
- Ocorrência: "Delete this reservation?" / "The reservation on %1$s will be removed." / "Delete" / "Cancel".
- Série: "Delete the whole series?" / "All future occurrences of this reservation will be removed. Occurrences that have already started won't be affected." / "Delete series".
- Erro: "Couldn't delete".

## 7. Bloqueio de horário (`blocking`) [código]
- **Criar** (`CreateBlockingSheetKt`): `ModalBottomSheet` com `FigarooSheetScaffold(ContentHeight)`.
  - Título "Block time" ("Bloquear horário"), subtítulo "%1$s's agenda" ("Agenda de %1$s"). O profissional é fixo, vindo do contexto (`seed(teamMemberId, memberName, date)`), **sem seletor de profissional na sheet**.
  - Campos (TextField *filled*, somente leitura, que abrem diálogos):
    - "Day" ("Dia"): `DatePickerDialog` que **só permite hoje em diante** (`SelectableDatesAtOrAfter`); o rótulo mostra "Today" quando é hoje;
    - "Start" ("Início") e "End" ("Fim"): `TimePickerDialog` com títulos "Start time"/"End time" e botões OK/Cancel;
    - "Reason (optional)" ("Motivo (opcional)"): texto livre.
  - Nota informativa: "Clients can't book during the block" ("Clientes não conseguem agendar durante o bloqueio").
  - Botões: "Cancel" e "Block time".
  - **Não existe "dia inteiro" nem intervalo de vários dias**: é sempre um dia com início e fim [código: `CreateBlockingUiState` só tem date/start/end/reason].
  - Padrões (`BlockingDefaultWindowKt`): outro dia, ou hoje antes de 12:00 → **12:00–13:00**. Hoje depois de 12:00 → próxima hora cheia até +1h; se passar da meia-noite → 23:00–23:59.
  - Hoje, o início não pode ser antes de agora, arredondado para cima em múltiplos de 5 min (`earliestSelectableStart`).
  - Validação: fim > início (`isValid`).
  - Erro: "Couldn't block the time.".
- **Detalhe** (`BlockingDetailSheetKt`):
  - título = motivo, ou "Block" se não houver;
  - dia "Today" ou "EEE, dd MMM";
  - intervalo de horário;
  - profissional com o papel ("Barber"/"Receptionist"/"Manager"/"Other");
  - botão "Unblock" ("Desbloquear") → diálogo "Delete block?" / "Clients will be able to book this time again." / "Delete" / "Cancel"; erro "Couldn't delete the block.".
- Na Agenda, o bloqueio também pode ser arrastado (barra armada; só dentro do mesmo dia).

## 8. Animações e durações (resumo) [código]
| Onde | Especificação |
|---|---|
| Navegação dentro do fluxo (`NavTransitionsKt`) | slide horizontal de 20% da largura + fade, 300 ms, FastOutSlowIn |
| Navegação entre fluxos | slide vertical de 100% + fade-in, 350 ms; saída só com fade |
| Passos do novo agendamento | slide para a esquerda / para baixo, 300 ms |
| Ficha: página Agendamento ↔ Checkout | slide horizontal (spring padrão), `SizeTransform(clip=false)` |
| Horário expandindo (Por disponibilidade) | `AnimatedContent` fadeIn/fadeOut padrão + SizeTransform |
| FAB estendido | recolher 220 ms, rótulo até a escala 0,7, sucesso mantido 700 ms; depois de salvar, espera 700 ms antes de voltar |
| Sheet da ficha | M3 ModalBottomSheet padrão (meia altura → expandida) |

## 9. Diferenças em relação ao entendimento atual do Cortaí
1. O título do hero é o **primeiro serviço** (+N), não o nome do cliente. O cliente fica num segundo bloco, só com avatar e nome, **sem telefone nem WhatsApp**.
2. O horário é "HH:mm · HH:mm" em fonte mono, com "Hoje" ou data média. Os profissionais aparecem como **chips com primeiro nome e avatar** dentro do hero.
3. "Trocar cliente" é botão Tonal Small com `SwapHoriz`, **só para Confirmado e no futuro**.
4. O cartão de serviços tem **uma linha por serviço**, com profissional, horário próprio e preço riscado quando há desconto, mais a linha Total ou "Pago pelo pacote".
5. O botão de baixo depende do estado:
   - futuro: **Reagendar** + chevron com só "Cancelar agendamento" (destrutivo);
   - já começou (Confirmado): **Cobrar/Checkout** + chevron com "Reagendar" e "Não compareceu";
   - concluído: "Ver recibo" (tonal);
   - cancelado ou não compareceu: nada.
6. "Não compareceu" não tem confirmação. "Cancelar" tem diálogo, avisa o cliente e **fecha a ficha**.
7. Não existe status "chegou" nem "em atendimento"; "Em andamento" é derivado do horário.
8. Reagendar abre em **tela cheia**. Depois de salvar: check por 700 ms, volta, e a ficha **continua aberta mas recarrega (passa por Loading)**. O cliente é sempre notificado.
9. A disponibilidade do profissional no seletor ("Hoje · 09:00 - 18:00.") vem do **horário semanal de HOJE**, não do dia escolhido.
10. O aviso ao cliente com WhatsApp/e-mail é do **arrastar na agenda**, começa **desligado** e some quando a empresa não tem canal configurado.
