# Spec 4: Página Pública ("Personalizar Página") no Figaro

Fonte: APK do Figaro decompilado com jadx. Raiz: `sources/com/figaroo/android/`. Pacotes analisados: `pagesettings/**`, `pagehub/**`, `designsystem/components/{LayoutThemeCard,LayoutCard,ThemeCard,AccordionSection}Kt`, `core/navigation/{NavigationRoute,AppNavHostKt*}` e `agenda/ui/AgendaScreenKt` (gaveta).

Convenções deste documento:
- **[código]**: observado no código, com o arquivo e o identificador.
- **[inferência]**: dedução minha, sem prova direta.
- **sem evidência**: não encontrei no código.

> **Aviso sobre os textos.** O APK traz só `res/values/strings.xml`, em inglês. Não há `values-pt*` nem string em português no `resources.arsc` (procurei "Personalizar", "Ver Exemplo" e "Salvar Alterações"). Os textos em PT-BR vistos no app real ("Personalizar Página", "Ver Exemplo", "Salvar Alterações") devem vir de um split APK de idioma, que não foi extraído **[inferência]**. Por isso cito sempre a **chave** e o **texto EN** observados, com uma tradução PT sugerida. Exceção: os dados de exemplo das `@Preview` e algumas constantes do repositório estão em português no código.
>
> Os **nomes, descrições, paletas e imagens de layouts e temas vêm do servidor** (`GET pages/layouts`, com header `Accept-Language`, padrão `pt-BR`). O app não tem um catálogo fixo de temas. Os únicos temas literais no código são dados de *preview* (seção 4.3).

---

## 1. Telas e navegação

### 1.1 Rotas [código: `core/navigation/NavigationRoute.java`]

| Tela | Rota | Composable |
|---|---|---|
| Personalizar Página | `page-settings` | `pagesettings/ui/PageSettingsScreenKt.PageSettingsScreen` |
| Layout & Tema | `page-settings/layout-theme` | `layouttheme/LayoutThemeScreenKt.LayoutThemeScreen` |
| Exemplo de layout/tema (WebView) | `page-settings/layout-theme/preview?layoutType=&themeType=&layoutName=&themeName=` | `layouttheme/LayoutThemePreviewScreenKt.LayoutThemePreviewScreen` |
| Prévia do rascunho (WebView) | `page-settings/draft-preview?uri=` | `draftpreview/DraftPagePreviewScreenKt.DraftPagePreviewScreen` |
| Editor Hero | `page-settings/hero` | `heroeditor/HeroEditorScreenKt` |
| Editor Serviços | `page-settings/service-list` | `servicelisteditor/…` |
| Editor Equipe | `page-settings/team` | `teameditor/…` |
| Editor Galeria | `page-settings/photo-gallery` | `photogalleryeditor/…` |
| Editor Avaliações | `page-settings/ratings` | `ratingseditor/…` |
| Editor Localidades | `page-settings/locations` | `locationseditor/…` |
| Editor Formulário de contato | `page-settings/contact-form` | `contactformeditor/…` |
| Editor Redes sociais | `page-settings/social-networks` | `socialnetworkseditor/…` |
| QR Code | `page-settings/qr-code` | `qrcode/PageQrCodeScreenKt` |
| Editar link (slug) | `company-settings/edit-page-slug` | fora do escopo (`NavigationRoute.EditPageSlug`) |
| Seletor de mídia | `MediaGalleryPicker.forPicker(tags, includeCommunity, multiple, communityTags)` | usado pelo Hero e pela Galeria |

### 1.2 Fluxo [código: `AppNavHostKt$AppNavHost$4$1$153.java`, `$154`, `$163`–`$174`]

```
Agenda (gaveta) ── card "Sua Página" ──▶ Personalizar Página
   ├─ card Layout & Tema ─────────────▶ Layout & Tema ──"Ver Exemplo"──▶ Preview WebView
   │                                      └─"Salvar Alterações" → volta e recarrega
   ├─ linha de seção (editável) ──────▶ Editor da seção → "Salvar" → volta e recarrega
   ├─ banner/ícone de rascunho ───────▶ Prévia do rascunho (WebView)
   └─ menu ⋮ ─▶ Editar link | QR Code | Tirar página do ar (diálogo)
```

- **Volta com atualização**: ao salvar num editor ou no Layout & Tema, a navegação grava `pageSettingsUpdated=true` no `SavedStateHandle` da entrada anterior e faz `popBackStack()`. Ao ativar ou desativar uma seção, grava a mesma flag e **não** sai do editor. `PageSettingsViewModel` observa a flag e chama `retry()` (recarga) [código: `PageSettingsViewModel` `AnonymousClass3`, `NavigationRoute.PageSettings.ArgPageSettingsUpdated`].
- A tela também recarrega quando muda `publicPageState.version` [código: `PageSettingsViewModel` `AnonymousClass1`].
- `PageSettings` faz parte de `DrawerTargetRoutes`, com transição "drawer push" [código: `AppNavHostKt.DrawerTargetRoutes`, `getDrawerPushEnter`].

### 1.3 Entrada pela Agenda, card "Sua Página" [código: `agenda/ui/AgendaScreenKt.agendaDrawerEntries`, `buildAgendaDrawerEntrySpecs`]

- Entrada `FigarooDrawerEntry.PageCard`, logo abaixo do `AccountHeader`, exibida quando `showPageCard` é verdadeiro. Os nomes dos parâmetros vêm do metadata Kotlin.
- Título: `navigation_drawer_sua_pagina` = "Your Page" ("Sua Página").
- Status (chip e tom), a partir de `PublicPage.status`: Online → "Online", Offline → "Offline", Draft ou nulo → "Draft" (`page_hub_page_status_*`, tons `DrawerPageStatusTone.Online/Offline/Draft`). Quando `hasDraftPage` é verdadeiro, aparece um segundo rótulo "Draft".
- **Bloqueada** (`pageLocked`): status "Pending", ícone de cadeado, ação "Page locked" e legenda "Complete your profile to activate your page". Sem ações e sem métricas.
- **Desbloqueada**: ação "Share page" (`onShareSuaPagina`, texto `page_hub_share_page_url_message` = "Take a look at our barbershop!") e métricas dos últimos 7 dias. Métricas: Visitas (`page_hub_page_insights_views_label` "Visits") e Agend. ("Appt."), com legendas "Performance over the last 7 days" / "See performance · last 7 days" / "Performance will show here".
- Tocar no card executa `onOpenSuaPagina`: fecha a gaveta e navega para `page-settings` com `popUpTo(Agenda)` e `launchSingleTop`.
- Métricas: `GET company/page/insights` → `PageInsights(views, appointments, conversionPercent, viewsVariation, appointmentsVariation, conversionVariation)`, com `InsightVariation` = Up/Down/Neutral [código: `pagehub/logic/model/PageInsights.java`, `InsightVariation.java`, `PublicPageApiService`]. O card mostra só views e appointments; o rótulo "Conv." existe nos strings, mas não é usado nesse trecho.

---

## 2. Personalizar Página (`PageSettingsScreen`)

### 2.1 Estrutura [código: `PageSettingsScreenKt.SuccessState`, `PageSettingsScreen`]

- Scaffold `FigarooCollapsingHeaderScaffold`, título `page_settings_title` = "Customize Page" ("Personalizar Página").
- Subtítulo `page_settings_description`: "Choose your layout, theme, and which sections appear on your public page."
- **Banner de rascunho** (animado com fade e expand), só quando `status == Draft`:
  - título "Unpublished changes";
  - mensagem "You have a draft with changes that aren't yet visible on your public page.";
  - ação "Preview draft", que abre `draft-preview?uri=<pageUri>`.
- **Botão de rascunho na app bar** (`DraftAppBarButton`, ícone `icon_draft_duo`, descrição "Open draft preview"): aparece só quando o banner sai da tela por rolagem (`isDraftBannerScrolledAway`).
- **Card Layout & Tema**, com cabeçalho `page_settings_layout_theme_header` = "Layout & theme" (componente da seção 2.2).
- **Grupos de seções** (`SectionGroup`). Cada grupo só é renderizado se não estiver vazio:
  1. "Required sections": `isRequired == true`, ativa ou não.
  2. "Active sections": `isEnabled && !isRequired`.
  3. "Inactive sections": `!isEnabled && !isRequired`.
- **Rodapé de rascunho** (`DraftFooter`), quando `status == Draft`: botão dividido `FigarooSplitButton` "Publish Changes", cujo menu tem "Discard".
- Estados extras: `LoadingState`, `ErrorState` ("We couldn't load your page settings. Check your connection and try again." + "Try again") e `PublishProgressOverlay`.

### 2.2 Card Layout & Tema [código: `designsystem/components/LayoutThemeCardKt.LayoutThemeCard`]

- Parâmetros: `layoutLabel` (nome do layout), `themeLabel` (nome do tema), número de seções ativas, `themeColors`, imagem (`theme.largeCoverImageUri`), CTA e texto de contagem.
- Visual:
  - imagem de capa 16:9 (`aspectRatio 1.7777778f`, recorte *crop*);
  - duas colunas "meta" separadas por divisor vertical de 1 dp:
    - Layout: ícone `icon_section_layout` 22 dp, nome e "%d active sections";
    - Tema: ícone `icon_section_theme`, nome e `ColorBar` de 6 dp de altura, raio 3 dp, com um segmento de mesma largura por cor;
  - CTA em pílula de 48 dp com fundo `primaryContainer`: `page_settings_change_layout_theme` = "Choose Layout & Theme".
- Na tela Personalizar Página, `themeColors` é passado como **lista vazia**, então a barra de cores fica vazia [código: `SuccessState`, `CollectionsKt.emptyList()`].
- Contagem: `page_settings_section_count_format` "%1$d active sections", calculada como o número de `availableSections` com `isEnabled`, **incluindo as obrigatórias**.
- O preview do componente traz em PT: "Site Completo", "Rock n' Roll", "9 seções ativas", "Escolher Layout & Tema", e as cores `#111316`, `#D3145D`, `#F4F4F5` [código: `ComposableSingletons$LayoutThemeCardKt$lambda1$1`].

### 2.3 Linha de seção [código: `PageSettingsScreenKt$SectionGroup$1$1`, `iconRes`, `unknownTypeDescription`]

- `FigarooListRow` com o nome vindo do servidor (`section.name`) e ícone de 26 dp na cor `primary`.
- Descrição só aparece em tipo `Unknown` com descrição não vazia.
- Clicável só se `type.isEditable`. `Bio` e `BookingFlow` não são editáveis, então a linha fica sem ação.
- O clique despacha para o editor conforme o tipo: ServiceList, Hero, ContactForm, SocialNetworks, Ratings, PhotoGallery, Team, Locations [código: `PageSettingsScreenKt$PageSettingsScreen$16$3`].
- Ícones: `icon_section_hero` (Hero e Bio), `_services`, `_team`, `_gallery`, `_ratings`, `_location`, `_contact`, `_social`, `_booking`, `_layout` (Unknown).
- **Ordenação**: a ordem é a de `availableSections` devolvida pelo servidor. **Não há arrastar para reordenar** (sem evidência de drag/reorder em `pagesettings`).
- **Ativar ou desativar**: não há switch na lista. Isso é feito dentro de cada editor (seção 5).

### 2.4 Menu ⋮ (`PageSettingsOverflowMenu`) [código: `PageSettingsScreenKt$PageSettingsOverflowMenu$1$3`, `ComposableSingletons$PageSettingsScreenKt`]

- Descrição do botão: "More actions".
- Itens, na ordem:
  1. **"Edit Link"**: sempre visível; abre `EditPageSlug`.
  2. **"QR Code"**: visível só se `shouldShowQrCodeItem(pageUri não vazio, permissão ModifyPublicPage)`.
  3. **"Take Page Offline"**: visível só se `canTakeOffline` (página ativa com `PageStatus.Online`). Abre um diálogo:
     - título "Deactivate Page?";
     - mensagem "Your page will become inaccessible to visitors. You can reactivate it at any time.";
     - ação "Deactivate" e "Cancel";
     - executa `PUT company/page/status {status:"offline"}`;
     - em caso de erro, título "Couldn't take page offline".

### 2.5 Publicar e descartar [código: `PageSettingsViewModel.publish`, `missingRequiredSections$app_release`, `PageSettingsViewModel$publish$1`, `discardDraft`]

- **Publicar**:
  - Validação local: lista as seções com `isRequired && !isEnabled`. Se houver alguma, mostra o diálogo "Missing Sections" com "The following sections are required for this layout: %1$s" (nomes separados por ", ") e **não chama a API**.
  - Sem pendências, chama `POST company/page/publish` em paralelo com um `delay` mínimo de **2500 ms** (`FigarooPublishProgressFillMillis`), para dar tempo à animação.
  - Sucesso: overlay de progresso (anel), depois o evento `PublishSucceeded` e o toast "Page published successfully!".
  - Constantes do componente de progresso: `FillCreepMillis` 8000, `RingCloseMillis` 650, `RingSettleMillis` 200, `SuccessHoldMillis` 700 [código: `FigarooPublishProgressKt`].
- **Descartar**:
  - Confirmação com título "Discard changes?", mensagem "Your unpublished changes will be lost. This action cannot be undone." e botões "Discard" / "Cancel".
  - Chama `DELETE company/page/draft`. Em sucesso, toast "Changes discarded".
- Erros de publicar, descartar e tirar do ar usam `DismissOnlyErrorDialog` (botão "OK").

---

## 3. Modelo de rascunho e publicação

**[código]**
- `CompanyPageStatus`: `draft`, `online`, `offline`. Valor desconhecido vira `Online` no mapper (`PageSettingsMapper.toDomain`).
- Toda edição (layout/tema, conteúdo de seção, ativar/desativar) é um `PUT` em `company/page/*` que devolve `CompanyPageSettingsDto`. O repositório atualiza `PublicPageState` com `toPublicPage`.
- Endpoints do ciclo de rascunho:
  - `GET company/page/preview`: token de prévia (`CompanyDraftPagePreviewTokenDto.token`);
  - `POST company/page/publish`;
  - `DELETE company/page/draft`;
  - `PUT company/page/status`.
- A prévia do rascunho abre `FigarooWebView(<pageUri>?preview=<token>)`.
- O exemplo de layout/tema abre `FigarooWebView(<WEB_BASE_URL>/preview?layout=<layoutType>&theme=<themeType>)`. `WEB_BASE_URL` é o domínio web público do app (`BuildConfig`).

**[inferência]**
- O servidor mantém uma versão rascunho separada da publicada. O `status` volta `draft` enquanto houver alterações não publicadas, e por isso o banner e o rodapé dependem só de `status == Draft`.
- O publicado continua visível até `publish`.

---

## 4. Layout & Tema (`LayoutThemeScreen`)

### 4.1 Comportamento [código: `LayoutThemeViewModel`, `LayoutThemeUiState.Loaded`]

- **Carga**: `fetchPageSettings` e `fetchAvailableLayouts` em paralelo (`load$1$1$a/b`). O estado inicial seleciona o layout e o tema atuais da página.
- **Estado `Loaded`**: `layouts: List<PageLayoutProfile>`, `selectedLayoutId`, `selectedThemeId`, `isSaving`, `blockingError`, `expandedPanel` (Layout, Theme ou nenhum).
- **`onLayoutSelected(id)`**: mantém o tema atual se ele existir no novo layout. Se não existir, seleciona o **primeiro** tema do layout.
- **`togglePanel`**: acordeão exclusivo. Abrir um painel fecha o outro; tocar no painel aberto fecha ele.
- **`canSave`**: não está salvando e há layout e tema selecionados. Não exige que a seleção seja diferente da atual (sem evidência de checagem de "sujo").
- **"Save Changes" ("Salvar Alterações")**: `PUT company/page/layout {layoutId, themeId}`. Em sucesso, `completionEvents` faz voltar com `pageSettingsUpdated=true`. Em erro, `FigarooApiErrorDialog`, dispensado por `dismissBlockingError`.
- **"View Example" ("Ver Exemplo")**: `FigarooOutlinedButton` com ícone `Visibility`. Navega para o preview em WebView com `layoutType` e `themeType`. Título da tela de preview: "%1$s · %2$s" (layout · tema).
- **Barra inferior** (`BottomSaveBar`): `Surface` com `imePadding`, contendo "View Example" e o botão primário "Save Changes", nos estados Loading, Idle ou Disabled.
- **Erro de carga**: "We couldn't load the layout catalog. Check your connection and try again." + "Try again".

### 4.2 Layout visual [código: `LayoutThemeScreenKt.LoadedContent`, `designsystem/components/AccordionSectionKt`]

- Título: `layout_theme_title` = "Layout & Theme".
- Coluna rolável com dois `AccordionSection`.

**Acordeão**
- Cabeçalho com mínimo de 68 dp e *leading tile* de 40 dp (raio do token `chip`).
- Rótulo em caixa alta, 11 sp, espaçamento 0.06 em: "LAYOUT" / "THEME".
- Valor: 17 sp, espaçamento −0.005 em (nome selecionado).
- Chevron de 26 dp, gira 180° com mola (amortecimento 0.75, rigidez 1500).
- Badge: só no Layout, "%d themes" (número de temas do layout selecionado), em `CountBadge`.
- Leading do Tema: miniatura de `theme.largeCoverImageUri` em 40 dp. Leading do Layout: ícone `icon_section_layout` 24 dp sobre `surfaceContainerHighest`.

**Carrossel** (painel expandido)
- `LazyRow` horizontal com `rememberSnapFlingBehavior` (encaixa item a item).
- Itens de 286 dp (`CarouselItemWidth`), espaçamento `spacingMdSm`, padding lateral `spacingMd`.
- `rememberLazyListState(0,0)`: **sempre começa no primeiro item**, sem rolar até o selecionado (sem evidência de `scrollToItem`).
- Troca entre expandido e recolhido com `AnimatedContent` (fade).

**Card de Layout** (`LayoutCardKt.LayoutCard`)
- Largura 286 dp, padding 20 dp, forma `cardHero`, fundo `surfaceContainerLowest`.
- Nome: 22 sp / 26 sp, espaçamento −0.01 em, cor `primary`, 1 linha.
- Descrição: até 2 linhas, entrelinha 20 sp, altura mínima 40 dp.
- Linha "%d themes available": ícone 15 dp, 12 sp.
- Grade de seções com 2 colunas (`GridColumns = 2`), altura mínima 78 dp, ícone 18 dp e rótulo 13 sp. As seções são a **união distinta por tipo** das `availableSections` de todos os temas do layout.
- Com **mais de 6 seções**, mostra 5 e um item "+%d sections" (`MoreSections(size − 5)`, ícone `MoreHoriz`).
- Seleção: borda de 2 dp na cor `primary` e *check badge* de 24 dp (ícone 16 dp). Sem seleção: borda de 1 dp `outlineVariant` e badge vazio com contorno de 2 dp.

**Card de Tema** (`ThemeCardKt.ThemeCard`)
- Largura 286 dp, forma `cardHero`.
- Banner com proporção **2.9:1**, imagem `largeCoverImageUri` (vazia vira null; fundo neutro).
- "Pílula" de destaque de 56×6 dp, a 14 dp da esquerda e 12 dp da base, pintada com a **primeira cor** do tema (`firstAccent`).
- Rodapé: nome 22 sp e descrição; padding 16 dp nas laterais e 20 dp em cima e embaixo.
- Seleção: borda de 2 dp na cor **brandMagenta** e check badge de 24 dp no canto superior direito (padding 12 dp) com fundo brandMagenta. Sem seleção: borda de 1 dp `outlineVariant` e badge com contorno `outline`.
- `firstAccent`: primeira `PageLayoutColor` com `hexCodeLight` não vazio. `parseHexColorOrNull` aceita `#RRGGBB` (completa com alfa FF) ou `#AARRGGBB`. Se falhar, usa `primary` do tema do app. **Só `hexCodeLight` é usado**; `hexCodeDark` é ignorado na UI.

### 4.3 Layouts e temas disponíveis

**[código] Catálogo dinâmico.**
- `GET pages/layouts` → `PageLayoutsResponseDto.layouts: List<PageLayoutProfileDto>`.
- Cada layout: `layout {id, type, name, description}` + `availableThemes`.
- Cada tema: `theme {id, type, name, description, details, smallCoverImageUri, largeCoverImageUri}` + `colors [{hexCodeLight, hexCodeDark}]` + `availableSections` (cada uma com `type`, `name`, `description`, `details`, `compactPreviewImageUri`, `expandedPreviewImageUri`, `isRequired`).
- Isso implica que **as seções e quais são obrigatórias dependem do par layout+tema**. Nomes e descrições chegam localizados via `Accept-Language`.
- Fontes e tipografia por tema: **sem evidência**. O DTO não traz fonte; só cores e imagens.

**[código] Dados literais (só em `@Preview`, não são o catálogo de produção):**

| Origem | Layout (type, nome, descrição) | Tema (id, type, nome, descrição) | Cor |
|---|---|---|---|
| `LayoutThemeScreenKt.sampleLoaded` | `single-scroll`, "Site Completo", "Layout completo com todas as seções organizadas em rolagem única." | 11, `rock-n-roll`, "Rock n' Roll", "Visual intenso e cheio de atitude." | `#D3145D` (claro e escuro) |
| idem | idem | 12, `classic`, "Clássico", "Visual moderno e minimalista." | `#5F6469` |
| `PageSettingsScreenKt.sampleSettings` | `full-site`, "Site Completo", "Layout completo com todas as seções" | 1, `rock`, "Rock n' Roll" | — |
| `ComposableSingletons$ThemeCardKt` | — | "Rock n' Roll", "Visual intenso e cheio de atitude para barbearias de personalidade forte que valorizam o impacto visual." | `#D3145D` |
| `onboarding/ui/OnboardingCompleteScreenKt.PREVIEW_PAGE` | `classic`, "Classic" | `classic`, "Classic" | — |

**[inferência]** Em produção há pelo menos um layout de "site completo" com rolagem única e temas como "Rock n' Roll" (magenta `#D3145D`) e "Clássico" (cinza `#5F6469`). A contagem real de layouts e temas só se obtém consultando a API.

### 4.4 Tokens do app usados nessas telas (tema claro) [código: `designsystem/theme/ColorKt`, `ThemeKt.LightColorScheme`, `LightExtendedColors`]

| Token | Origem | Hex |
|---|---|---|
| primary | Primary50 | `#2467BB` |
| primaryContainer | Primary90 | `#D5E2FF` |
| brandMagenta (seleção de tema) | Tertiary50 | `#D3145D` |
| draftBannerSurface | Tertiary95 | `#FFECEF` |
| outline | NeutralVariant50 | `#827572` |
| outlineVariant | NeutralVariant80 | `#D7C7C2` |
| surfaceContainerHighest | Neutral90 | `#DEE8E1` |
| surfaceContainerLowest | branco | `#FFFFFF` |
| actionBlue | Primary40 | `#00509D` |

- Forma `cardHero`: padrão de 28 dp **[inferência]**; o construtor decompilado está com os argumentos reordenados.
- O tema escuro existe (`DarkExtendedColors`, brandMagenta igual), mas não foi detalhado.

---

## 5. Editores de seção

Padrão comum a todos os editores [código: `*EditorUiState`, `*EditorViewModel`]:
- **Carga**: `fetchPageSettings` + `fetch<Seção>` em paralelo. `isEnabled` vem de `availableSections` do tipo correspondente.
- **Botão "Save changes"** (`editor_save_changes`): habilitado quando os dados carregaram, a validação passa e não há operação em curso (`isSaving`, `saveSucceeded`, `isActivating`, `isDeactivating`).
- **Ativa**: o rodapé mostra "Hide <Seção>" e chama `PUT company/page/{type}/deactivate`.
- **Inativa**: aparece o card "<Seção> Hidden" com mensagem e o botão "Activate <Seção>", que chama `PUT company/page/{type}/activate`.
- **Seção obrigatória**: nenhum editor, exceto Serviços, consulta `isRequired`. O app deixa ocultar uma seção obrigatória e só bloqueia na publicação (sem evidência do contrário).
- **Título e subtítulo**: só Hero, Galeria e Formulário de contato expõem campos. Para Serviços, Equipe, Avaliações e Localidades, o app envia **título fixo em PT** e subtítulo `null`: "Serviços", "Equipe", "Avaliações", "Localidades". O formulário de contato envia "Contato" [código: `PageSettingsRepositoryImpl.ServiceListTitle/TeamTitle/RatingsTitle/LocationsTitle/ContactFormTitle`].

### 5.1 Hero Banner (`hero`) [código: `heroeditor/HeroEditorUiState`, `HeroEditorViewModel`, `HeroEditorScreenKt`]

- Título "Hero Banner"; descrição "Highlight section with a background image and an impactful headline."
- Grupo "Background image":
  - imagem atual + "Change image";
  - vazio: "Select one of our curated images to use as background.";
  - abre `MediaGalleryPicker` com tags próprias `["hero"]`, tags da comunidade `["hero", <layout.type>]`, `includeCommunityAssets=true` e **seleção única**.
- Grupo "Texts":

| Campo | Placeholder | Mín. | Máx. (corte na digitação) | Erros |
|---|---|---|---|---|
| Headline | "Ex: Your style is our priority" | 8 | 25 | "Required" / "Minimum %d characters" |
| Subheadline | "Ex: We are passionate about your hairstyle and your look." | 10 | 100 | idem |

- Válido quando os dois textos são válidos **e existe uma imagem**.
- Envio: `PUT company/page/hero {mediaAssetId, headline, subheadline}`.
- Preview PT: "Tradição e modernidade" / "O melhor da barbearia clássica com um toque atual."

### 5.2 Serviços (`service-list`) [código: `servicelisteditor/*`]

- Título "Services"; descrição "Showcase the services your barbershop offers, with prices and duration."
- Grupo "Popular services": botões conectados "Show" / "Hide", que mapeiam `PopularServicesType.Automatic` ("automatic") e `Disabled` ("disabled").
- Nota fixa: "This section of the page is required for this layout and cannot be deactivated." Não há ativar/ocultar.
- Envio: `PUT company/page/service-list {title:"Serviços", subtitle:null, popularServicesType}`.

### 5.3 Equipe (`team`) [código: `teameditor/*`, `PageSettingsConstantsKt.BIO_MAX_LENGTH`]

- Título "Team"; descrição "Show the professionals who make up your team."
- Switches:
  - "Show photo" (dica: "The profile photo set to the team member will displayed.");
  - "Show extra details" (dica: "Show a bio and weekly working hours of the team member.").
- `showAverageRating` existe no modelo e no ViewModel (`onShowAverageRatingChange`), mas **não tem controle na tela** (sem evidência de uso na UI). O valor carregado é reenviado.
- Lista de membros com nome e função ("Barber", "Receptionist", "Manager", "Other"). Ação "Bio" ou "Edit bio"; aviso "Missing bio".
- Folha `BioEditorSheet`:
  - campo "Bio" com placeholder "Ex: Making sure clients look good since the 90s, this professional …";
  - contador "%d/%d", **máximo de 2000** caracteres; erro "Bio cannot exceed %d characters.";
  - botões "Cancel" / "Save";
  - o texto é salvo após `trim`; bio vazia remove a entrada.
- Validação: com "Show extra details" ligado, **todas** as bios são obrigatórias. Erro: "All team member bios are required to show details."
- Envio: `PUT company/page/team {title:"Equipe", subtitle:null, showProfilePhoto, showAverageRating, showDetails, members:[{teamMemberId, bio}]}`.

### 5.4 Galeria (`photo-gallery`) [código: `photogalleryeditor/*`]

- Título "Gallery"; descrição "Showcase photos of your shop, your work, and the atmosphere to attract new clients."
- Grupo "Photos":
  - grade com "Add photo" e "Remove photo" por item;
  - o picker usa as tags `["photo-gallery"]` e as da comunidade `["photo-gallery", <layout.type>]`, com **seleção múltipla**;
  - novos itens entram sem duplicar `id`.
- Limite de fotos e mínimo de fotos: sem evidência; a validação não olha `assets`.
- Grupo "Title":

| Campo | Placeholder | Regra |
|---|---|---|
| Title | "Ex: Some Of Our Work" | obrigatório, mínimo 5, máximo 25 |
| Subtitle | "Ex: A showcase of our work, we're proud of our looks!" | opcional; se preenchido, mínimo 5; máximo 100 |

- Envio: `PUT company/page/photo-gallery {title, subtitle, assetIds}`.
- Preview PT: "Conheça nossos trabalhos" / "Alguns dos cortes que mais nos orgulham."

### 5.5 Avaliações (`ratings`) [código: `ratingseditor/*`]

- Título "Ratings"; descrição "Showcase what your clients say about your barbershop."
- "Sort by": "Date" (`date`, padrão) ou "Rating" (`rating`).
- Switch "Show Summary" (padrão ligado).
- Sem validação de campos.
- Envio: `PUT company/page/ratings {title:"Avaliações", subtitle:null, sortType, showSummary}`.

### 5.6 Localidades (`locations`) [código: `locationseditor/*`]

- Título "Locations"; descrição "Show your barbershop address and help clients find you."
- Grupo "Extra Details": switch "Show extra details" (dica: "Display your location bio to increase emotional link with your clients.").
- Lista de unidades com endereço (preview "Rua Exemplo, 100 · 00000-000", "Vila Mariana", "São Paulo") e ação "Bio" / "Edit bio".
- Folha de bio igual à da Equipe:
  - placeholder "Ex: Since 1930 our barbershop has been located in this region …";
  - máximo de 2000 caracteres.
- Validação: com detalhes ligados, todas as bios são obrigatórias. Erro: "All location bios are required to show details."
- Envio: `PUT company/page/locations {title:"Localidades", subtitle:null, showDetails, locations:[{locationId, bio}]}`.

### 5.7 Formulário de contato (`contact-form`) [código: `contactformeditor/*`]

- Título "Contact Form"; descrição "Let clients send questions or messages directly through the page."
- Grupo "Settings": campo "Email Address".
  - placeholder "Ex: email@domain.com";
  - dica: "If left blank, the account holder email will be used as recipient.";
  - opcional; se preenchido, deve casar com `^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$` após `trim`. Erro: "Wrong format".
- Vazio é enviado como `null`.
- Envio: `PUT company/page/contact-form {title:"Contato", subtitle:null, emailAddress}`.

### 5.8 Redes sociais (`social-networks`) [código: `socialnetworkseditor/*`]

- Título "Social Networks"; descrição "Add links to your social networks to grow your online reach."
- Grupo "Links": "Facebook" e "Instagram", ambos com placeholder "Ex: my_barbershop". O usuário informa só o @/handle, não a URL **[inferência]**.
- Regra: espaços proibidos ("Spaces are not allowed"). Os campos são opcionais.
- Envio: `PUT company/page/social-networks {facebook, instagram}`.

### 5.9 Tipos sem editor

- `bio` e `booking-flow` têm `isEditable=false` [código: `PageSectionType`]. A linha aparece, mas não é clicável.
- `Unknown(wire)` cobre tipos futuros: ícone de layout e descrição exibida.

### 5.10 QR Code [código: `qrcode/*`, `logic/model/PageQrCodeVariant/Format`]

- Título "QR Code".
- Variantes "Paper" / "Sticker" (`paper`, `sticker`).
- Busca `GET company/page/qr-code?format=png|pdf&size=1024&variant=`.
- Ações:
  - "Save to Gallery": salva PNG `figaroo-qr` no MediaStore; abaixo do Android 10 pede `WRITE_EXTERNAL_STORAGE`;
  - "Print": PDF via `PdfBytesPrintDocumentAdapter`.
- Mensagens: "Saved to your gallery", "Couldn't save the QR code. Please try again.", "Couldn't open the print dialog. Please try again."

---

## 6. Modelo de dados (`pagesettings/logic/model`) [código]

| Classe | Campos |
|---|---|
| `PageSettings` | `pageUri`, `status: CompanyPageStatus`, `layout: PageLayoutSummary`, `theme: PageThemeSummary`, `availableSections: List<CompanyPageSection>` |
| `CompanyPageSection` | `type: PageSectionType`, `name`, `description`, `details`, `compactPreviewImageUri`, `expandedPreviewImageUri`, `isEnabled`, `isRequired` |
| `PageSectionType` (selada, `wire` + `isEditable`) | Hero `hero`(✓), Bio `bio`(✗), ServiceList `service-list`(✓), Team `team`(✓), PhotoGallery `photo-gallery`(✓), Ratings `ratings`(✓), Locations `locations`(✓), ContactForm `contact-form`(✓), SocialNetworks `social-networks`(✓), BookingFlow `booking-flow`(✗), `Unknown(wire)`(✗) |
| `PageLayoutSummary` | `id`, `type`, `name`, `description` |
| `PageThemeSummary` | `id`, `type`, `name`, `description`, `details`, `smallCoverImageUri`, `largeCoverImageUri` |
| `PageLayoutProfile` | `layout: PageLayoutSummary`, `availableThemes: List<PageLayoutThemeProfile>` |
| `PageLayoutThemeProfile` | `theme: PageThemeSummary`, `colors: List<PageLayoutColor>`, `availableSections: List<CompanyPageSection>` |
| `PageLayoutColor` | `hexCodeLight`, `hexCodeDark` |
| `CompanyPageStatus` | `Draft("draft")`, `Online("online")`, `Offline("offline")` |
| `CompanyPageHero` | `backgroundImage: MediaLibraryAsset`, `headline`, `subheadline` |
| `PageServiceList` | `title`, `subtitle`, `popularServicesType` (`automatic` \| `disabled`) |
| `CompanyPageTeam` | `title`, `subtitle`, `showProfilePhoto`, `showAverageRating`, `showDetails`, `members: List<TeamMemberBio{teamMemberId, bio}>` |
| `CompanyPagePhotoGallery` | `title`, `subtitle`, `assets: List<MediaLibraryAsset>` |
| `CompanyPageRatings` | `title`, `subtitle`, `sortType` (`date` \| `rating`), `showSummary` |
| `CompanyPageLocations` | `title`, `subtitle`, `showDetails`, `locations: List<LocationBio{locationId, bio}>` |
| `CompanyPageContactForm` | `title`, `subtitle`, `emailAddress` |
| `CompanyPageSocialNetworks` | `facebook`, `instagram` |
| `MediaLibraryAsset` (core) | `id`, `uri`, `thumbnailUri`, `type`, `size`, `isCommunityAsset` |
| `PageQrCodeVariant` / `PageQrCodeFormat` | `paper`/`sticker`; `png`/`pdf` |

- DTO da página: `CompanyPageSettingsDto{page:{uri,status,layout,theme}, availableSections, enabledSections: List<String>}`.
- `isEnabled` é calculado no cliente como `enabledSections.contains(type)` [código: `PageSettingsMapper`].

### Estado de UI (`logic/state` e `ui/*UiState`)

- `PageSettingsUiState`: Loading, Success(settings) ou Error(message).
- `AsyncTaskStatus`: Idle, InProgress, Succeeded ou Failed(message), para publicar, descartar e tirar do ar.
- `PageQrCodeUiState`: Loading, Success(pngBytes) ou Error. `PageQrCodeEvent` cobre salvar e imprimir.
- `LayoutThemeUiState`: seção 4.1.

---

## 7. Pontos para o Cortaí (inferência)

1. O catálogo de layouts e temas é **dado do servidor** (tabela), não código. Cada tema define paleta e imagens, e as seções e obrigatoriedades valem por par layout+tema.
2. O ciclo é rascunho → prévia por token → publicar ou descartar, com validação de obrigatórias **antes** de publicar e status Online/Offline separado.
3. Ativar e ocultar fica dentro de cada editor. A lista principal só agrupa em Obrigatórias / Ativas / Inativas, sem reordenar.
4. Limites úteis para copiar: headline de 8 a 25, subheadline de 10 a 100, título da galeria de 5 a 25, subtítulo de até 100, bio de até 2000, e-mail opcional com regex, handles sem espaço.
