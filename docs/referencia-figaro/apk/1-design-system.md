# Spec 1 — Design system do Figaro (referência visual do Cortaí)

Fonte: APK descompilado (jadx → Java), pacote `com.figaroo.android.designsystem` (`theme/` e `components/`, incluindo `components/agenda`, `components/datepicker` e `components/drawer`). Recursos em `resources/res`.

Convenções deste documento:
- **Observado**: valor lido diretamente no código, com arquivo e identificador.
- **Inferência**: dedução (por exemplo, valores-padrão do Material 3 que não estão no APK ou leitura de fluxo ofuscado pelo jadx).
- **Sem evidência**: não encontrado.
- Nenhuma chave, token ou URL com credencial foi registrada.

---

## 0. Como as cores foram decodificadas

As cores aparecem como `androidx.compose.ui.graphics.ColorKt.Color(4278190080L)`. A função `Color(Long)` do Compose recebe um **inteiro ARGB de 32 bits** guardado num `long`. Ela não recebe o valor interno já deslocado (`argb << 32`, ULong); o deslocamento acontece dentro da função. Basta converter o decimal para hexadecimal de 8 dígitos:

| Decimal | Hex | Leitura |
|---|---|---|
| 4278190080 | 0xFF000000 | alfa FF, preto |
| 4280575931 | 0xFF2467BB | alfa FF, #2467BB |
| 4294967295 | 0xFFFFFFFF | branco |

Todas as cores da paleta têm alfa `FF` (opacas). A transparência é aplicada em tempo de execução com `Color.copy(alpha = …)` (ver §1.6).

---

## 1. Cores

### 1.1 Paleta tonal (observado: `theme/ColorKt.java`, linhas 10–104)

**Primary (azul da marca)**

| Token | Hex |
|---|---|
| Primary0 | #000000 |
| Primary10 | #001A40 |
| Primary20 | #002E66 |
| Primary30 | #00408F |
| Primary40 | #00509D |
| Primary50 | #2467BB |
| Primary60 | #4881D6 |
| Primary70 | #6B9CE9 |
| Primary80 | #9FBEF6 |
| Primary90 | #D5E2FF |
| Primary95 | #EBF0FF |
| Primary99 | #FBFCFF |
| Primary100 | #FFFFFF |

**Secondary (rosa-vinho dessaturado)**

| Token | Hex |
|---|---|
| Secondary10 | #3A0E1A |
| Secondary20 | #54222E |
| Secondary30 | #6E3843 |
| Secondary40 | #884F59 |
| Secondary50 | #A36770 |
| Secondary60 | #BE808A |
| Secondary70 | #DA9AA4 |
| Secondary80 | #F7B5BF |
| Secondary90 | #FFDADE |
| Secondary95 | #FFECEF |
| Secondary99 | #FFFBFB |

**Tertiary (magenta da marca)**

| Token | Hex |
|---|---|
| Tertiary0 | #000000 |
| Tertiary10 | #3E0017 |
| Tertiary20 | #65052A |
| Tertiary30 | #8E0E3F |
| Tertiary40 | #B61055 |
| Tertiary50 | #D3145D |
| Tertiary60 | #E64B7E |
| Tertiary70 | #F37AA0 |
| Tertiary80 | #FFA6BF |
| Tertiary90 | #FFDADE |
| Tertiary95 | #FFECEF |
| Tertiary99 | #FFFBFB |

**Neutral.** Observado: a escala não é monotônica. Os tons 4–24 e 87–98 têm leve matiz verde-menta; os tons 20–80 são cinza quente.

| Token | Hex | Nota |
|---|---|---|
| Neutral0 | #000000 | |
| Neutral4 | #141816 | escuro esverdeado |
| Neutral6 | #1B1F1C | fundo escuro |
| Neutral10 | #2A2F2C | texto claro / container escuro |
| Neutral12 | #303632 | |
| Neutral17 | #3E4440 | |
| Neutral20 | #322F2E | cinza quente (inverseSurface claro) |
| Neutral22 | #4E5550 | |
| Neutral24 | #545B56 | |
| Neutral30 | #4A4745 | |
| Neutral40 | #62605E | |
| Neutral50 | #7B7977 | |
| Neutral60 | #969391 | |
| Neutral70 | #B0AEAB | |
| Neutral80 | #CDCAC7 | |
| Neutral87 | #D6E0D9 | menta |
| Neutral90 | #DEE8E1 | |
| Neutral92 | #E4EDE7 | |
| Neutral94 | #EAF2EC | fundo claro |
| Neutral95 | #EDF5EF | |
| Neutral96 | #F0F7F2 | |
| Neutral98 | #F3FBF5 | |
| Neutral100 | #FFFFFF | |

**NeutralVariant (cinza rosado)**

| Token | Hex |
|---|---|
| NeutralVariant30 | #4F4644 |
| NeutralVariant40 | #685D5A |
| NeutralVariant50 | #827572 |
| NeutralVariant60 | #9D8F8B |
| NeutralVariant80 | #D7C7C2 |
| NeutralVariant90 | #F4E1DB |

**Erro, sucesso, aviso e acentos**

| Token | Hex |
|---|---|
| Error40 | #B3261E |
| Error50 | #DC362E |
| Error90 | #F9DEDC |
| Error95 | #FCEEEE |
| DarkError | #F2B8B5 |
| DarkOnError | #601410 |
| DarkErrorContainer | #8C1D18 |
| DarkOnErrorContainer | #F9DEDC |
| SuccessTone30 | #1B5E20 |
| SuccessTone40 | #2E7D32 |
| SuccessTone50 | #43A047 |
| SuccessTone90 | #C8E6C9 |
| WarningTone30 | #7A4A07 |
| WarningTone40 | #B6730F |
| WarningTone50 | #E08E22 |
| WarningTone90 | #FFE0B2 |
| AccentPrimary | #00509D |
| AccentPrimaryDark | #4DA3FF |
| AccentSecondary | #D3145D |
| AccentSecondaryDark | #FF4D8D |
| ConfettiGold | #FFD700 |
| WarmTonalContainer | #F7DFC9 |
| OnWarmTonalContainer | #4A2E16 |
| WarmTonalContainerDark | #4A3625 |
| OnWarmTonalContainerDark | #F7DFC9 |
| RatingPoorTone | #DD4425 |
| RatingFairTone | #E2622E |
| RatingRegularTone | #FFDC00 |
| RatingVeryGoodTone | #0D9B8A |
| RatingExcellentTone | #3E9B4F |

Literal avulso em `ThemeKt` (onErrorContainer claro): `4282453515` → **#410E0B**.

### 1.2 ColorScheme do Material 3 (observado: `theme/ThemeKt.java`, bloco `static`)

A ordem dos argumentos segue `lightColorScheme`/`darkColorScheme` do M3 1.4. O `surfaceTint` não é passado (fica o padrão, igual ao `primary`).

| Papel | Claro | Hex claro | Escuro | Hex escuro |
|---|---|---|---|---|
| primary | Primary50 | #2467BB | Primary80 | #9FBEF6 |
| onPrimary | branco | #FFFFFF | Primary20 | #002E66 |
| primaryContainer | Primary90 | #D5E2FF | Primary30 | #00408F |
| onPrimaryContainer | Primary10 | #001A40 | Primary90 | #D5E2FF |
| inversePrimary | Primary80 | #9FBEF6 | Primary40 | #00509D |
| secondary | Secondary40 | #884F59 | Secondary80 | #F7B5BF |
| onSecondary | branco | #FFFFFF | Secondary20 | #54222E |
| secondaryContainer | Secondary90 | #FFDADE | Secondary30 | #6E3843 |
| onSecondaryContainer | Secondary10 | #3A0E1A | Secondary90 | #FFDADE |
| tertiary | Tertiary40 | #B61055 | Tertiary80 | #FFA6BF |
| onTertiary | branco | #FFFFFF | Tertiary20 | #65052A |
| tertiaryContainer | Tertiary90 | #FFDADE | Tertiary30 | #8E0E3F |
| onTertiaryContainer | Tertiary10 | #3E0017 | Tertiary90 | #FFDADE |
| background | Neutral94 | #EAF2EC | Neutral6 | #1B1F1C |
| onBackground | Neutral10 | #2A2F2C | Neutral90 | #DEE8E1 |
| surface | Neutral94 | #EAF2EC | Neutral6 | #1B1F1C |
| onSurface | Neutral10 | #2A2F2C | Neutral90 | #DEE8E1 |
| surfaceVariant | NeutralVariant90 | #F4E1DB | NeutralVariant30 | #4F4644 |
| onSurfaceVariant | Neutral50 | #7B7977 | NeutralVariant80 | #D7C7C2 |
| inverseSurface | Neutral20 | #322F2E | Neutral90 | #DEE8E1 |
| inverseOnSurface | Neutral95 | #EDF5EF | Neutral20 | #322F2E |
| error | Error40 | #B3261E | DarkError | #F2B8B5 |
| onError | branco | #FFFFFF | DarkOnError | #601410 |
| errorContainer | Error90 | #F9DEDC | DarkErrorContainer | #8C1D18 |
| onErrorContainer | literal | #410E0B | DarkOnErrorContainer | #F9DEDC |
| outline | NeutralVariant50 | #827572 | NeutralVariant60 | #9D8F8B |
| outlineVariant | NeutralVariant80 | #D7C7C2 | NeutralVariant30 | #4F4644 |
| scrim | preto | #000000 | preto | #000000 |
| surfaceBright | Neutral98 | #F3FBF5 | Neutral24 | #545B56 |
| surfaceContainer | Neutral94 | #EAF2EC | Neutral12 | #303632 |
| surfaceContainerHigh | Neutral92 | #E4EDE7 | Neutral17 | #3E4440 |
| surfaceContainerHighest | Neutral90 | #DEE8E1 | Neutral22 | #4E5550 |
| surfaceContainerLow | Neutral96 | #F0F7F2 | Neutral10 | #2A2F2C |
| surfaceContainerLowest | branco | #FFFFFF | Neutral4 | #141816 |
| surfaceDim | Neutral87 | #D6E0D9 | Neutral6 | #1B1F1C |

Observações:
- No tema claro, `background`, `surface` e `surfaceContainer` são o mesmo menta claro (#EAF2EC). Cards brancos se destacam por `surfaceContainerLowest`/`cardTile` = #FFFFFF.
- O tema segue o sistema: `FigarooTheme(darkTheme = isSystemInDarkTheme())`. Não há cor dinâmica (Material You).
- O tema também injeta `MotionScheme.expressive()`, `FigarooShapes`, `FigarooTypography`, `LocalExtendedColors`, `LocalDimensions`, `LocalShapes` e `LocalBrandTypography`.

### 1.3 ExtendedColors (observado: `theme/ExtendedColors.java` + `ThemeKt` `LightExtendedColors`/`DarkExtendedColors`)

| Papel | Claro | Hex | Escuro | Hex |
|---|---|---|---|---|
| success | SuccessTone40 | #2E7D32 | SuccessTone50 | #43A047 |
| successContainer | SuccessTone90 | #C8E6C9 | SuccessTone30 | #1B5E20 |
| onSuccessContainer | SuccessTone40 | #2E7D32 | SuccessTone90 | #C8E6C9 |
| warning | WarningTone40 | #B6730F | WarningTone50 | #E08E22 |
| warningContainer | WarningTone90 | #FFE0B2 | WarningTone30 | #7A4A07 |
| onWarningContainer | WarningTone40 | #B6730F | WarningTone90 | #FFE0B2 |
| info | Primary50 | #2467BB | Primary80 | #9FBEF6 |
| confettiGold | ConfettiGold | #FFD700 | ConfettiGold | #FFD700 |
| **actionBlue** (CTA principal) | Primary40 | #00509D | Primary80 | #9FBEF6 |
| onActionBlue | branco | #FFFFFF | Primary20 | #002E66 |
| brandMagenta | Tertiary50 | #D3145D | Tertiary50 | #D3145D |
| onBrandMagenta | branco | #FFFFFF | branco | #FFFFFF |
| onDarkLinkTint | Primary80 | #9FBEF6 | Primary80 | #9FBEF6 |
| onSurfaceHint (texto auxiliar) | Neutral50 | #7B7977 | Neutral60 | #969391 |
| draftBannerSurface | Tertiary95 | #FFECEF | Tertiary10 | #3E0017 |
| ratingPoor/Fair/Regular/VeryGood/Excellent | ver §1.1 | | iguais | |
| warmTonalContainer / on | #F7DFC9 / #4A2E16 | | #4A3625 / #F7DFC9 | |
| **cardTile** (fundo de card) | Neutral100 | #FFFFFF | Neutral17 | #3E4440 |

Observado: `ratingTone(nota)` (`ThemeKt`): menos de 0,5 = cor neutra passada; menos de 1,5 = Poor; menos de 2,5 = Fair; menos de 3,5 = Regular; menos de 4,5 = VeryGood; o resto = Excellent.

Inferência importante: o botão primário **não usa `colorScheme.primary`** (#2467BB). Ele usa `actionBlue` (#00509D, mais escuro) com texto branco (ver §5.1).

### 1.4 Status pill (observado: `components/FigarooStatusPillKt.java`, função `palette()`)

| Tom (`StatusPillTone`) | Container | Conteúdo | Ponto (dot) |
|---|---|---|---|
| Success | successContainer | onSuccessContainer | success |
| Warning | warningContainer | onWarningContainer | warning |
| Error | errorContainer | onErrorContainer | error |
| Info | primaryContainer | onPrimaryContainer | primary |
| Brand | tertiaryContainer | onTertiaryContainer | tertiary |
| Neutral | surfaceContainerHighest | onSurface | onSurfaceVariant |

Medidas observadas: padding 10 dp × 4 dp; dot de 6 dp; gap entre dot e texto de 4 dp; ícone de 16 dp; borda opcional de 1 dp em `outlineVariant`; forma `button` (círculo/pílula); texto `labelSmall` (11 sp). Existe ainda uma sobreposição opcional da cor custom a 12% de alfa sobre o container (`compositeOver`, linha ~214). Há um literal #E91E63 no preview.

### 1.5 Estados de agendamento (fora do design system: `agenda/ui/components/AgendaStatusGlyphKt.java`)

Os estados vêm de `AppointmentStatus`: Pending, Confirmed, NoShow, Cancelled, Completed. Valores de wire: `pending`, `pending-approval`, `confirmed`, `no-show`, `completed`. O canal vem de `AppointmentChannel`: Online, Manual, Unknown.

| Estado | Ícone | Cor |
|---|---|---|
| Confirmed | `icon_circle_check` | primary |
| NoShow | `icon_warning_triangle` | error |
| Pending + Online | `icon_clock` | success (ext.) |
| Pending + Manual | `icon_person_walking_duo` | secondary |
| Pending + Unknown | `icon_clock` | onSurfaceVariant |
| Cancelled | `icon_xmark_circle` | onSurfaceVariant |
| Completed | `icon_check_fill` | onSurfaceVariant |

Inferência: a ordem dos ramos foi reconstruída pelo `WhenMappings` (Confirmed=1, NoShow=2, Pending=3, Cancelled=4, Completed=5). O alfa do card por estado anima com `tween(300 ms, FastOutSlowIn)` (`AgendaCardDisplayAlphaKt`, `AgendaArmCurveDurationMillis = 300`).

### 1.6 Opacidades (observado)

| Uso | Alfa | Fonte |
|---|---|---|
| State layer: hover | 0,08 | `StateLayerOpacity` |
| State layer: focus | 0,10 | idem |
| State layer: pressed | 0,12 | idem |
| State layer: dragged | 0,16 | idem |
| FAB desabilitado (container) | 0,55 | `FigarooExtendedFABKt.DisabledContainerAlpha` |
| FAB desabilitado (conteúdo) | 0,85 | `DisabledContentAlpha` |
| Placeholder do text field desabilitado | 0,38 | `FigarooTextFieldKt` ~572 |
| Gradiente do cabeçalho do drawer | 0,95 → 0,95 (até 72%) → 0 | `DrawerHeaderScrimAlpha`, paradas 0 / 0,72 / 1,0 |
| Overlays de `TemplateCard` | 0,40 / 0,45 / 0,78 | `TemplateCardKt` |
| Fundo de `ImagePreviewCard` | 0,94 | `ImagePreviewCardKt` |
| Scrim do bottom sheet | padrão M3 | sem valor próprio. Inferência: `scrim` a 32% |

---

## 2. Tipografia

### 2.1 Famílias (observado: `theme/TypographyKt.java`; `res/font/`)

| Família | Arquivos | Pesos declarados | Papel |
|---|---|---|---|
| **Poppins** (`FigarooDisplayFontFamily`, alias `Branded`) | poppins_medium, poppins_semibold, poppins_bold | 500, 600, 700 | display e headline (títulos grandes, marca) |
| **Plus Jakarta Sans** (`FigarooBodyFontFamily`, alias `Default`) | plus_jakarta_sans.ttf (variável, eixo `wght`) | 400, 500, 600, 700, 800 | title, body, label e quase todos os estilos de marca |
| **JetBrains Mono** | jetbrains_mono.ttf (variável) | 400, 500, 600 | números monoespaçados (horários, valores) |

### 2.2 Escala Material (observado: `FigarooTypography`)

| Estilo | Família | Tamanho/altura de linha (sp) | Peso | Espaçamento entre letras |
|---|---|---|---|---|
| displayLarge | Poppins | 57/60 | Bold | -0,025 em |
| displayMedium | Poppins | 45/50 | Bold | -0,02 em |
| displaySmall | Poppins | 36/42 | Bold | -0,015 em |
| headlineLarge | Poppins | 32/38 | SemiBold | -0,01 em |
| headlineMedium | Poppins | 28/34 | SemiBold | -0,005 em |
| headlineSmall | Poppins | 24/30 | SemiBold | padrão |
| titleLarge | Jakarta | 22/28 | Medium | padrão |
| titleMedium | Jakarta | 16/24 | SemiBold | 0,015 em |
| titleSmall | Jakarta | 14/20 | SemiBold | 0,01 em |
| bodyLarge | Jakarta | 16/24 | Normal | 0,03 em |
| bodyMedium | Jakarta | 14/20 | Normal | 0,018 em |
| bodySmall | Jakarta | 12/16 | Normal | 0,033 em |
| labelLarge | Jakarta | 14/20 | SemiBold | 0,01 em |
| labelMedium | Jakarta | 12/16 | SemiBold | 0,04 em |
| labelSmall | Jakarta | 11/16 | SemiBold | 0,05 em |

### 2.3 Estilos de marca (observado: `theme/FigarooBrandTypography.java`, valores-padrão do construtor sintético, linhas ~200–420)

| Estilo | Família | Tamanho/linha (sp) | Peso | Espaçamento | Extra |
|---|---|---|---|---|---|
| onboardingLoadingTitle | Jakarta | 32/40 | Bold | -0,01 em | |
| stepperCounter | Jakarta | 56/56 | Bold | -0,025 em | |
| priceFocal | Jakarta | 32/38 | Bold | -0,015 em | |
| eyebrowChip | Jakarta | 12/16 | Bold | 0,08 em | |
| stepRowTitle | Jakarta | 17/24 | SemiBold | -0,005 em | |
| formSectionLabel | Jakarta | 13/18 | SemiBold | 0,06 em | |
| sheetHeader | Jakarta | 22/28 | Bold | -0,005 em | |
| **monoMedium** | JetBrains Mono | 14/20 | Medium | | |
| **monoSmall** | JetBrains Mono | 12/16 | Normal | | |
| **monoNumeric** | JetBrains Mono | 16/24 | SemiBold | | |
| trialCardTitle | Jakarta | 20/24 | ExtraBold | -0,015 em | |
| setupChecklistTitle | Jakarta | 20/26 | Bold | -0,005 em | |
| dashboardTitle | Jakarta | 18/24 | Bold | -0,005 em | |
| listRowTitle | Jakarta | 14/18 | SemiBold | -0,005 em | |
| statusBadgeLabel | Jakarta | 13/18 | SemiBold | 0 sp | |
| **agendaMonthTitle** | Poppins | 19/24 | Bold | -0,01 em | |
| drawerSectionHeader | Jakarta | 14/20 | Bold | 0,01 em | |
| drawerMenuItem | Jakarta | 15/20 | Medium | | |
| drawerAccountName | Jakarta | 18/24 | Bold | | |
| drawerHeroSubtitle | Jakarta | 13/18 | Medium | | |
| drawerStatValue | Jakarta | 22/22 | Bold | -0,02 em | |
| displayStatValue | Poppins | 22/22 | Bold | -0,44 sp | |
| **agendaMonthHeader** | Jakarta | 22/28 | Bold | -0,01 em | |
| appointmentDashboardHeroTitle | Poppins | 26/32 | Bold | -0,02 em | |
| appointmentDashboardHeroStatusLabel | Jakarta | 16/24 | Bold | | |
| appointmentDashboardServiceName | Jakarta | 15/20 | Bold | | |
| appointmentDashboardServicePrice | Jakarta | 14,5/20 | Bold | | |
| appointmentDashboardServiceMeta | Jakarta | 13/18 | Normal | | |
| appointmentDashboardTotalLabel | Jakarta | 14/20 | SemiBold | | |
| appointmentDashboardTotalValue | Poppins | 20/24 | Bold | -0,02 em | |
| offerCardHeading | Jakarta | 17/24 | Bold | | |
| offerCardBody | Jakarta | 12,5/17 | Normal | | |
| insightHeadline | Jakarta | 28/34 | ExtraBold | -0,02 em | `tnum` |
| insightHeroHeadline | Jakarta | 36/44 | ExtraBold | -0,02 em | `tnum` |
| insightEmptyTitle | Jakarta | 22/28 | SemiBold | | |
| **insightInsetValue** | JetBrains Mono | 14/20 | Medium | -0,3 sp | `tnum` |

**Onde o mono é usado (observado):** `FigarooWeeklyAvailabilityPanel` (horários, `monoMedium`) e `insightInsetValue` (valores de insight). Os estilos `monoSmall`/`monoNumeric` existem no tema; o uso fora do design system não foi rastreado. Números grandes de insight usam Jakarta com `tnum` (algarismos tabulares), não mono.

### 2.4 Tipografia por componente (observado)

| Componente | Estilo |
|---|---|
| Top bar (padrão/large) | titleMedium, titleLarge, headlineMedium, displaySmall (conforme a variante) |
| Top bar da agenda | titleLarge (título) + labelLarge |
| Chip | labelLarge (padrão) / labelMedium (denso) |
| Text button / connected group | labelLarge (botão de texto com override de 13 sp) |
| Status pill | labelSmall |
| List row | bodyLarge com override 15/20 sp SemiBold (título) ou Medium; bodyMedium (suporte) |
| Text field (suporte) | bodySmall |
| Avatar (iniciais) | Inferência por ordem de enum: Small/Medium = labelMedium; Large = titleMedium; Hero/Strip = titleLarge; Tile/Jumbo = displaySmall |
| Grade do mês | `agendaMonthHeader`; dia 15 sp |
| Faixa da semana | dia 16 sp; letra do dia da semana 11,5 sp |

---

## 3. Formas (raios)

### 3.1 Shapes do Material (observado: `theme/ShapesKt.java`)

| Slot | Raio |
|---|---|
| extraSmall | 4 dp |
| small | 8 dp |
| medium | 12 dp |
| large | 16 dp |
| extraLarge | 28 dp |

### 3.2 FigarooBrandShapes (observado: `theme/FigarooBrandShapes.java`, construtor sintético, linhas 80–106)

| Shape | Valor | Uso típico |
|---|---|---|
| extraLarge2 | 36 dp | |
| extraLarge3 | 52 dp | |
| **button** | `CircleShape` (pílula total) | botões, status pill, channel pill, draft badge |
| **fab** (repouso) | 28 dp (`FigarooFabCornerRestDp`) | |
| fabPressed | 16 dp (`FigarooFabCornerPressedDp`) | |
| **card** | 12 dp | cards comuns, list row, stat tile |
| **cardHero** | 28 dp | cards de destaque, list group (cantos externos), drawer |
| dialog | 28 dp | ConfirmDialog, ErrorDialog |
| **bottomSheet** | 28 dp só no topo (TL/TR), 0 embaixo | ModalBottomSheet |
| chip | 8 dp | FilterChip, dropdown chip |
| listGroupInner | 4 dp | cantos internos de grupos de linhas |
| textFieldOutlined | 4 dp | |
| textFieldFilled | 8 dp só no topo | text field (estilo filled) |
| snackbar | 4 dp | |
| **avatar** | 12 dp (quadrado arredondado, **não é círculo**) | |
| pill | `RoundedCornerShape(50%)` | |

### 3.3 Composições (observado)

- **List group** (`FigarooListGroupShapeKt`): a primeira linha tem o topo em `cardHero` (28 dp) e a base em `listGroupInner` (4 dp); a última linha faz o inverso; as linhas do meio ficam com 4 dp em todos os cantos. Há versões horizontal e em grade (`figarooListGroupCellShape`).
- **Drawer** (`FigarooNavigationDrawerKt` ~642): os cantos topEnd/bottomEnd vêm de `cardHero` (28 dp) e o lado inicial fica reto.
- **Painel do seletor de data** (`FigarooAgendaDateSelectorKt` ~80): 16 dp só nos cantos inferiores.
- **Day pill, célula do mês, círculo de seleção e dots**: `CircleShape`.
- **FAB estendido**: morfa o raio de 28 dp até o diâmetro/2 (28 dp com 56 dp de altura, ou seja, círculo) durante o colapso.

---

## 4. Espaçamento, dimensões e elevação

### 4.1 Escala de espaçamento (observado: `theme/Dimensions.java`, linhas 197–314)

| Token | dp |
|---|---|
| spacingNone | 0 |
| spacingXxs | 2 |
| spacingXs | 4 |
| spacingSm | 8 |
| adaptiveListGroupGap | 2 |
| spacingMdSm | 12 |
| **spacingMd** | 16 |
| spacingMdLg | 20 |
| **spacingLg** | 24 |
| spacing7 | 28 |
| spacingXl | 32 |
| spacing2xl | 48 |
| spacingHeroToFooter | 52 |
| spacing3xl | 64 |

### 4.2 Paddings e layout

| Token | dp |
|---|---|
| screenPaddingHorizontal | 20 |
| screenEdgePadding | 16 |
| nativeAppBarHorizontalMargin | 16 |
| fabMargin | 16 |
| flowHeaderTitleStartInset | 3 |
| flowHeaderSubtitleStartInset | 4 |
| flowHeaderSubtitleToContent | 28 |
| heroCardTopPadding | 28 |
| dashboardSectionSpacing | 32 |
| readingWidthMd | 280 |
| landingWordmarkMaxWidth | 260 |
| stepperCardMaxWidth | 260 |

Nota: o jadx mostra 260 como `LandingSequenceController.FADE_LEAD_MS`, que é uma constante inteira igual a 260 inlinada.

### 4.3 Alturas e tamanhos

| Token | dp |
|---|---|
| ctaHeight | 56 |
| socialButtonHeight | 52 |
| otpBoxHeight | 56 |
| touchTargetMin | 48 |
| topAppBarHeight | 64 |
| topAppBarHeightLarge | 152 |
| bottomNavHeight | 80 |
| scheduleRowMinHeight | 56 |
| amenityRowMinHeight | 64 |
| timePillHeight | 32 |
| availabilityDaySquareHeight | 36 |
| addRowButtonHeight | 40 |
| inlineTextButtonHeight | 20 |
| progressBarHeight | 6 |
| progressBarSegmentGap | 6 |
| dividerThickness | 1 |
| stepperButtonSize | 44 |
| stepperCountWidth | 72 |
| stepperInnerSpacing | 20 |
| iconSizeXs / Sm / Md | 16 / 20 / 24 |
| iconSizeTopBarExpressive | 28 |
| amenityIconSize / chevronSize | 22 / 22 |
| sectionHeroIconSize | 36 |
| agendaTopBarLeadingSize | 44 |
| statusBadgeSize | 40 |
| heroIconHaloSize | 72 |
| heroIconContainerSize | 80 |
| heroIconSize | 46 |
| formHeaderIconSize | 72 |
| emptyStateIconSize / Promo / Clients | 56 / 64 / 44 |
| intervalDotSize | 10 |
| bulletCircleSize / bulletCheckSize | 28 / 18 |
| categorySwatchSize / categorySwatchRowSize | 40 / 28 |
| photoPlaceholderSize | 144 |
| **Drawer:** drawerWidth | 348 |
| drawerAccountAvatarSize / drawerAccountButtonSize | 44 / 44 |
| drawerShareButtonSize | 40 |
| drawerCardThumbnailSize | 48 |
| drawerCardStatusDotSize | 8 |
| drawerPageStatusDotSize | 7 |
| drawerHeroRowMinHeight | 60 |
| drawerHeroStatusDotSize | 8 |
| drawerSectionHeaderHeight | 32 |
| drawerSectionHeaderSpacingBottom | 8 |
| drawerSectionHeaderPaddingStart | 18 |
| drawerSectionRowHeight | 56 |
| drawerSegmentGap | 3 |
| drawerModuleInset | 4 |
| drawerStatValueToLabelGap | 5 |
| drawerInsightsTrendingIconSize | 14 |

### 4.4 Elevação e sombra (observado)

| Elemento | Elevação |
|---|---|
| `FigarooMediumFloatingElevation` (toolbar flutuante, FAB do toolbar, borda inferior do seletor de data) | 3 dp (`FloatingElevationKt`) |
| FAB estendido em repouso | 6 dp (`FabRestElevation`) |
| `FigarooSurface` variante Elevated | 2 dp de sombra; as demais variantes 0 dp |
| Bottom sheet, top bar, cards | 0 dp de tonal elevation. A hierarquia vem de cor (surfaceContainer*), não de sombra |

### 4.5 Superfícies (`FigarooSurfaceKt.resolveSurfaceColor`, observado)

| Variante | Cor |
|---|---|
| Filled | surfaceContainerLow |
| Elevated | surface (+ 2 dp de sombra) |
| Tonal | surfaceContainer |
| FilledHigh | surfaceContainerHigh |
| TonalHigh | surfaceContainerHighest |
| PrimaryContainer | primaryContainer |
| CardTile | `cardTile` estendido (branco no claro, #3E4440 no escuro) |

Forma por `SectionCardStyle`: FormSection = `card` (12 dp); Informational = `cardHero` (28 dp). Padding interno observado: 20 dp e 16 dp.

---

## 5. Movimento

### 5.1 Specs observados

| Onde | Spec | Fonte |
|---|---|---|
| Tema inteiro | `MotionScheme.expressive()` | `ThemeKt.FigarooTheme` |
| Expansão de tamanho (Dp, Float, IntSize) | `spring(dampingRatio = 1,0, stiffness = 400)` | `BrandMotionKt.expandSizeSpring*` |
| Escala ao pressionar (botões primário, outlined, texto e stepper) | alvo **0,98** com `motionScheme.fastSpatialSpec()` | `SnappyPressAnimationKt`, `BrandMotionKt.PressScaleTarget` |
| Conteúdo do botão primário (idle → loading → success) | entrada: `fadeIn(tween 220 ms, delay 90 ms, FastOutSlowIn)` + `scaleIn(inicial 0,92, mesmo tween)`; saída: `fadeOut(tween 90 ms, FastOutSlowIn)` | `FigarooPrimaryButtonKt$…content$1` linha 77 |
| Colapso do FAB estendido (pílula → círculo) | `tween(220 ms, LinearOutSlowIn)`; o rótulo escala de 0,7 a 1,0; mantém "success" por 700 ms | `FigarooExtendedFABKt` (`MorphCollapseDurationMillis`, `LabelMinScale`, `FigarooExtendedFabSuccessHoldMillis`) |
| Troca de conteúdo do FAB | `fadeIn` + `scaleIn` padrão / `fadeOut`, com `SizeTransform` | `FigarooExtendedFAB$5` |
| Chevron do accordion | `spring(0,75, 1500)` | `AccordionSectionKt` |
| Pulso de estatística | tweens de 100, 140 e 240 ms, FastOutSlowIn | `FigarooStatPulseKt` |
| Progresso de publicação | 8000 ms linear (barra), 2500 ms LinearOutSlowIn, 650 ms, 200 ms e 700 ms | `FigarooPublishProgressKt` |
| Indicador de carregamento | exibição mínima de 400 ms (`FigarooLoadingMinDisplayMillis`); tamanho padrão de 48 dp | `FigarooLoadingIndicatorKt` |
| Cores da day pill, do anel de hoje e do círculo deslizante | `animateColorAsState(fastSpatialSpec)` | `FigarooWeekStripKt` |
| Seletor de data semana ↔ mês | `AnchoredDraggable` com `expandSizeSpringFloat` (1,0/400) + `exponentialDecay`; limiar posicional de 50%; ponto médio do morph em 0,5 | `FigarooDateSelectorState`, `FigarooDateSelectorStateKt` |
| Alfa do card de agenda por estado | `tween(300 ms, FastOutSlowIn)` | `AgendaCardDisplayAlphaKt` |
| Scaffold do fluxo de criação, painel semanal, insights | `motionScheme.defaultSpatialSpec` / `defaultEffectsSpec` / `fastSpatialSpec` | vários |

### 5.2 Valores do MotionScheme expressive (inferência: tokens do Material 3, que não estão no APK)

| Spec | dampingRatio | stiffness |
|---|---|---|
| fastSpatial | 0,6 | 800 |
| defaultSpatial | 0,8 | 380 |
| slowSpatial | 0,8 | 200 |
| fastEffects | 1,0 | 3800 |
| defaultEffects | 1,0 | 1600 |
| slowEffects | 1,0 | 800 |

Leitura: o Figaro usa **molas** para movimento espacial (com leve overshoot em fastSpatial) e reserva **tween** com FastOutSlowIn só para fades e trocas de conteúdo (90 a 300 ms).

---

## 6. Componentes compartilhados

### 6.1 Botões

**FigarooPrimaryButton** (observado: `FigarooPrimaryButtonKt`)
- Variantes (`ButtonVariant`): Primary (resolvida como Filled), Filled, Tonal, Elevated, Outlined, Text. Tom (`ButtonTone`): Default ou Destructive. Estado (`ButtonState`): Idle, Loading, Disabled, Success.
- Cores do Filled/Default: `actionBlue`/`onActionBlue` (#00509D/branco no claro). Destructive: error/onError. Success: `success` com texto branco. Tonal: primaryContainer/onPrimaryContainer (destrutivo: errorContainer/onErrorContainer).
- Forma: `brandShapes.button` = pílula (círculo).
- Alturas (`FigarooPrimaryButtonSize`) via M3 `ButtonDefaults`:

| Tamanho | Altura | Origem |
|---|---|---|
| ExtraSmall | `ExtraSmallContainerHeight` (inferência: 32 dp) | M3 |
| Small, Inline | `MinHeight` (inferência: 40 dp) | M3 |
| **SmallMedium** | **48 dp** (observado) | Figaro |
| Medium, Default | `MediumContainerHeight` (inferência: 56 dp); **ocupa a largura toda** | M3 |
| Large | `LargeContainerHeight` (inferência: 96 dp) | M3 |
| ExtraLarge | `ExtraLargeContainerHeight` (inferência: 136 dp) | M3 |

- Loading: indicador de 22 dp. Pressionado: escala 0,98.
- O CTA padrão (`ctaHeight`) é de 56 dp, coerente com Medium/Default.

**FigarooOutlinedButton**: altura de 40 dp; borda `outlineVariant`; texto `actionBlue`; pílula. Tamanhos Default e Compact.

**FigarooTextButton**: altura de 40 dp (Inline: 0/20 dp); 13 sp sobre labelLarge; tons Brand (`actionBlue`) e Destructive (`error`); pílula.

**FigarooExtendedFAB**: altura e diâmetro de 56 dp; padding horizontal da pílula de 20 dp; gap ícone/rótulo de 12 dp; elevação de 6 dp; container primary/onPrimary (com variante secondaryContainer); raio de repouso de 28 dp; loading de 32 dp; pendente de 20 dp; morfa para círculo (§5.1).

**FigarooIconButton** (`IconButtonVariant`): Standard (onSurfaceVariant), Filled (`actionBlue`/`onActionBlue`), FilledTonal (primaryContainer), FilledTonalTertiary (tertiaryContainer), Outlined. Container neutro: surfaceContainer. Tamanho: sem evidência de dp próprio; usa os padrões do M3.

**FigarooSplitButton**: tamanhos XS a XL (M3 Expressive); primary/onPrimary; ação de erro; forma `medium` (12 dp); valores observados de 12, 16, 20 e 24 dp.

**FigarooStepperIconButton**: 56 dp; primaryContainer (ativo) ou surfaceContainer (inativo).

**FigarooFloatingToolbar**: `HorizontalFloatingToolbar` do M3 Expressive; elevação de 3 dp; FAB em forma `fab`; cores primaryContainer, surfaceContainerLow e `actionBlue`.

### 6.2 Controle segmentado (`FigarooConnectedButtonGroupKt`, observado)
- M3 Expressive `ToggleButton` com `ButtonGroupDefaults.connectedLeading/Middle/TrailingButtonShapes` e `ConnectedSpaceBetween` (inferência: cerca de 2 dp).
- Selecionado: primaryContainer/onPrimaryContainer. Não selecionado: surfaceContainerHighest/surface.
- Texto: labelLarge.

### 6.3 Chips (`FigarooChipKt`, observado)
- M3 `FilterChip` com forma `chip` (8 dp) e borda de 1 dp em `outlineVariant`.
- Altura densa: 36 dp. Ícone inicial: 20 dp (denso: 16 dp). Padding de 8 a 16 dp.
- `FigarooDropdownChip`: 36 dp, forma chip. `DiscountChipGroup`: 36 dp, borda de 1 dp.
- **Channel pill** (`FigarooChannelPillKt`): pílula; 12 sp; primaryContainer (ativa) ou surface com borda outlineVariant; valores de 26, 16, 13, 8 e 5 dp.
- **Count badge**: pílula; 11 sp; surfaceContainerHighest/onSurface; padding de 3 dp e mínimo de 11 dp.

### 6.4 Bottom sheet (`FigarooSheetScaffoldKt`, `FigarooHelpBottomSheetKt`)
- M3 `ModalBottomSheet`: forma `bottomSheet` (28 dp só no topo); container `surface`; tonal elevation 0.
- Alça: `BottomSheetDefaults.DragHandle()` padrão. Inferência: 32 × 4 dp, onSurfaceVariant a 40%, 22 dp de margem vertical.
- Scrim: cor padrão. Inferência: `scrim` (#000000) a 32%.
- Conteúdo: padding horizontal de 16 dp (`spacingMd`); cabeçalho com 16 dp em cima e 24 dp embaixo; título `sheetHeader` (22/28 Bold).
- `skipPartiallyExpanded = true` no help sheet (`rememberModalBottomSheetState(true)`).
- `FigarooSheetExpansion`: há estados de expansão (enum); o detalhe não foi aberto.

### 6.5 Top bars
- `TopBarVariant`: Small, Medium, Large, Compact, Sheet, Dashboard.
- Cores: container surface; com rolagem, surfaceContainer.
- Títulos: titleMedium/titleLarge (small), headlineMedium (medium) e displaySmall (large).
- Alturas: `topAppBarHeight` 64 dp; `topAppBarHeightLarge` 152 dp.
- **FigarooAgendaTopBar**: título titleLarge; ação líder circular de 44 dp em surfaceContainerHighest; ícones de 28 dp (`iconSizeTopBarExpressive`) e 20 dp; seletor de unidade clicável em `CircleShape`; acentos primary e tertiary; container surface → surfaceContainer ao rolar.

### 6.6 List rows (`FigarooListRowKt`, observado)

| Item | Valor |
|---|---|
| Slot líder | 48 dp (avatar ou ícone em círculo primaryContainer) |
| Slot final | 24 dp |
| Altura mínima (settings) | 56 dp; com trailing, 64 dp |
| Padding | 16 dp horizontal × 12 dp vertical (padrão contido: 12 × 14 dp) |
| Título | 15/20 sp SemiBold (ou Medium), cor onSurface |
| Suporte | bodyMedium, cor onSurfaceVariant / onSurfaceHint |
| Divisor | 1 dp `outlineVariant`, com recuo inicial de 16 dp |
| Container | `cardTile` com forma card (12 dp) ou forma de list group |

`FigarooDetailRow`: altura mínima de 56 dp e largura de leitura de 280 dp.

### 6.7 Avatar (`FigarooAvatarKt`, `AvatarSize`, observado)

| Tamanho | dp |
|---|---|
| Small | 24 |
| Medium | 32 |
| Large | 40 |
| Hero | 56 |
| Strip | 64 |
| Tile | 104 |
| Jumbo | 144 |

- Forma padrão: `avatar`, um **quadrado arredondado de 12 dp** (personalizável).
- Fundo: surfaceContainerHigh.
- Imagem com `ContentScale.Crop` (Coil `SubcomposeAsyncImage`).
- Fallback (`AvatarPlaceholder`): **Initials** (padrão), Barber (desenho `barber_avatar` com Fit) e ícone `icon_user_circle_fill` tingido de outlineVariant.
- Texto das iniciais: onSurface; estilo por tamanho em §2.4.
- `FigarooTeamMemberAvatar`: valores de 12 e 16 dp.

### 6.8 Snackbar (`SnackbarKt`, observado)
M3 `Snackbar` com forma `snackbar` (4 dp), container `inverseSurface` (#322F2E no claro), conteúdo `inverseOnSurface` e ação `primaryContainer`. Host: `FigarooSnackbarHost`. Toast próprio: sem evidência.

### 6.9 Text field (`FigarooTextFieldKt`, observado)
M3 `TextField` (filled) com forma `textFieldFilled` (8 dp no topo). Container `surfaceContainerHighest` em todos os estados (focado, sem foco, desabilitado, erro). Indicador: padrão M3. Texto de suporte: bodySmall, cor error em caso de erro (`SupportingTextKt`). Placeholder desabilitado: onSurfaceVariant a 0,38. Também existem as variantes Currency, Percent e TextArea.

### 6.10 Outros

| Componente | Valores observados |
|---|---|
| FigarooSwitch | M3 Switch; 12 e 16 dp (ícone do thumb) |
| FigarooSquareCheckbox | 18 dp, raio 5 dp, check de 13 dp |
| FigarooRadioDot | 18 dp, miolo de 13 dp; primary/outline |
| FigarooRatingStars | estrela de 16 a 20 dp, gap de 2 dp |
| FigarooDashboardStatTile | altura de 128 dp, padding de 16 e 22 dp, valor `drawerStatValue`, forma card |
| AccordionSection | forma cardHero; surfaceContainerHighest; 68 e 286 dp |
| DraftBanner | forma cardHero; `draftBannerSurface` + `brandMagenta`; 16 e 14 sp |
| FigarooNavigationDrawer | largura de 348 dp; área de swipe na borda de 20 dp; cabeçalho translúcido com gradiente (§1.6); container surface; dot de status success |
| FigarooPullToRefreshBox | indicador surfaceContainerHigh + primary |
| FigarooProgressIndicator | 16, 22 e 32 dp (`FigarooProgressIndicatorSize`) |

---

## 7. Seletor de data e calendário (`components/datepicker`, observado)

### 7.1 Faixa da semana (`FigarooWeekStripKt`)

| Item | Valor |
|---|---|
| Day pill | círculo de 38 dp, texto de 16 sp |
| Padding vertical da faixa | 8 dp |
| Linha: raio / padding vertical | 12 dp / 4 dp |
| Espaço interno da pill | 5 dp |
| Dot de marcação | 5 dp, cor **tertiary** (magenta) |
| Anel de "hoje" | 1,5 dp, cor primary (aparece quando o dia não está selecionado) |
| Seleção | círculo primary que **desliza** entre os dias (`GlidingSelectionCircle`); texto onPrimary |
| Dias comuns | onSurface |
| Paginação | `HorizontalPager` por semana |
| Cores | animadas com fastSpatialSpec |

Inferência: a semântica exata dos booleanos de `DayPill` está ofuscada; a leitura acima combina os nomes das animações (`weekStripPillBg`, `weekStripPillText`, `weekStripTodayRing`) com as cores.

### 7.2 Grade do mês (`FigarooMonthGridKt`)

| Item | Valor |
|---|---|
| Altura da grade | 292 dp |
| Célula | 38 dp, texto de 15 sp, `CircleShape` |
| Cabeçalho do mês | `agendaMonthHeader` (22/28 Bold), recuo inicial de 8 dp, 6 dp abaixo |
| Padding da página (topo / base) | 8 / 8 dp |
| Padding vertical da linha | 1 dp |
| Dot de marcação | 4 dp, 5 dp acima da base, cor tertiary |
| Anel de hoje | 1,5 dp |
| Toque mínimo | desabilitado (`LocalMinimumInteractiveComponentSize = 0`) |

### 7.3 Seletor da agenda (`FigarooAgendaDateSelectorKt`)
- Card que morfa entre semana e mês (âncoras `SelectorAnchor.Week`/`Month`) com arraste.
- Painel com 16 dp nos cantos inferiores e elevação de 3 dp na borda inferior.
- Padding horizontal do conteúdo de 6 dp; cabeçalho dos dias da semana com padding vertical de 8 dp e letras de **11,5 sp** em `onSurfaceHint`.
- Galeria: padding externo de 16 dp e espaçamento de 12 dp.
- Fundo surface/surfaceContainer.

### 7.4 Paginação (`DateSelectorPaginationKt`)
Janela de meses de **-2 a +6** a partir de hoje (`MONTH_OFFSET_PAST = -2`, `MONTH_OFFSET_FUTURE = 6`). As semanas são paginadas dentro dessa janela, com `firstDayOfWeek` configurável.

### 7.5 Escala da timeline da agenda (`components/agenda/MinuteHeight`)

| Densidade | dp por minuto | Equivale a dp por hora |
|---|---|---|
| Compact | 1,0667 | 64 |
| Comfortable | 2,0 | 120 |
| **Default** | 2,5 | 150 |
| Armed (arrastando) | 4,0 | 240 |

A hora inicial do dia é **7h** (`LocalDayStartHour`). O deslocamento vertical é calculado por `yOffsetFor(min) = min × dpPerMinute`.

---

## 8. Outros recursos (observado em `res/`)

- Splash: fundo branco (`windowSplashScreenBackground = @android:color/white`), ícone `logo_icon_splash`.
- Barras de status e navegação transparentes (edge-to-edge).
- Não há cores da marca em `colors.xml`: todas ficam no Compose.

---

## 9. Lacunas (sem evidência)

- Duração de toasts próprios: só existe snackbar do M3, com duração padrão.
- Tamanho em dp de IconButton e Switch: usam os padrões do M3.
- Valores numéricos do `MotionScheme.expressive()` e das alturas de `ButtonDefaults`: vêm da biblioteca, não do APK (estão marcados como inferência).
- Raio de toque do `FigarooSheetExpansion`, especificação de `FigarooOdometer` e gráficos em `components/insights`: não detalhados.
