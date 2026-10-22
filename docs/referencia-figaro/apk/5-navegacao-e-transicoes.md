# Spec 5 — Navegação e transições entre telas do Figaro

Fonte: APK completo reenviado pelo dono em 22/10/2026 (5 partes, 88 MB, `com.figaroo.android`),
descompilado com o jadx. Arquivos principais: `core/navigation/NavTransitionsKt.java` (as transições),
`core/navigation/AppNavHostKt.java` (o mapa de telas) e `core/navigation/NavigationRoute.java` (as rotas).
Convenção: **[código]** = lido no código, com o arquivo; **[inferência]** = dedução; **sem evidência** = não achado.

## 1. Os três tipos de transição [código: `NavTransitionsKt`]

O Figaro usa só três movimentos para trocar de tela. Cada tela registrada no `NavHost` diz qual
movimento usa ao entrar, ao sair, ao voltar para ela (pop enter) e ao ser fechada (pop exit).

### 1.1 `intraFlow`: avançar dentro de um assunto (ex.: Serviço → Editar preços)

| Momento | Tela nova | Tela de trás |
|---|---|---|
| Avançar (push) | entra **da direita, deslocada 20 % da largura**, e aparece (fade in) | sai **para a esquerda, 20 %**, e some (fade out) |
| Voltar (pop) | a tela de trás volta **da esquerda (−20 %)** com fade in | a tela atual sai **para a direita (+20 %)** com fade out |

- Duração **300 ms**, curva **FastOutSlowIn** (`cubic-bezier(0.4, 0, 0.2, 1)`), igual para deslize e fade
  (`IntraFlowDurationMillis = 300`, `IntraFlowSlideFraction = 0.2f`, `IntraFlowTween`, `IntraFlowSlideTween`).
- As duas telas se movem juntas (efeito de paralaxe curto), não é a tela inteira atravessando.

### 1.2 `crossFlow`: abrir um fluxo à parte (criar algo, cobrar, onboarding, assinatura)

| Momento | Tela nova | Tela de trás |
|---|---|---|
| Abrir (push) | **sobe de baixo, 100 % da altura**, com fade in | **só esmaece** (fade out), sem mover |
| Fechar (pop) | a tela de trás **só reaparece** (fade in) | a tela do fluxo **desce 100 % da altura** com fade out |

- Duração **350 ms**, FastOutSlowIn (`CrossFlowDurationMillis = 350`, `CrossFlowTween`, `CrossFlowSlideTween`).
- Variante "irmã" (`crossFlowExitToSibling` / `crossFlowReturnToSiblingPopEnter`): uma lista que abre
  um fluxo de criação **só esmaece** ao sair e **só reaparece** ao voltar (mesmos 350 ms), em vez do
  deslize lateral de 20 %.

### 1.3 `drawerPush`: entrar numa área a partir da gaveta da Agenda

| Momento | Tela nova | Tela de trás (Agenda) |
|---|---|---|
| Abrir (push) | entra **da direita, largura inteira** (`slideIntoContainer(Start)`) | sai **para a esquerda, largura inteira** |
| Voltar (pop) | a Agenda volta **da esquerda, largura inteira** | a área sai **para a direita, largura inteira** |

- Sem fade. Mola padrão do Compose para `slideIntoContainer`: **`spring(dampingRatio = 1, stiffness = 1500)`**
  (sem quique, assenta em ~0,2 s) [inferência: valor-padrão do Compose, o código passa `null` para a spec].
- Telas que usam esse movimento (`DrawerTargetRoutes`): Personalizar Página, Informações Básicas,
  Localidades, Serviços, Combos, Pacotes, Equipe, Vendas, Avaliações, Opções de Agendamento,
  Clientes, Campanhas e Opções da Conta.
- A Agenda decide na saída: se o destino é um desses itens, usa `drawerPush`; senão, `crossFlow`.

### 1.4 Dentro de fluxos com várias telas (navegação interna)

Fluxos que têm o próprio `NavHost` interno trocam de etapa com **deslize da largura inteira, sem fade,
300 ms** (`tween(300)`, curva padrão FastOutSlowIn): avançar entra pela direita e empurra a anterior para
a esquerda; voltar faz o contrário. Visto em:

- Cobrança (`CheckoutFlowScreenKt`): resumo → escolher cliente → adicionar serviço → editar serviço → pagamento.
- Novo agendamento (`CreateAppointmentFlowScreenKt`): serviços → horário → cliente → criar cliente → resumo.
- Editar venda (`SaleDashboardScreenKt`, `StepTransitionMillis = 300`) e Vender pacote (`SellPackageFlowScreenKt`).
- O onboarding (`OnboardingFlowScreenKt`: boas-vindas → equipe → localidades → serviços → concluído)
  usa o `intraFlow` (§1.1) entre as etapas.

### 1.5 Etapas de cadastro numa mesma tela (`FigarooCreationFlowScaffold`)

Os cadastros em etapas (criar serviço, combo, pacote, cliente, profissional, localidade, campanha e
completar o perfil do dono) trocam só o **conteúdo** da etapa, dentro da mesma tela:

- Conteúdo: **deslize da largura inteira + fade, 220 ms** (`tween(220)`), na direção do passo: avançar
  entra pela direita e a anterior sai pela esquerda; voltar, o contrário. Rótulos: `create_service_step`,
  `create_combo_step`, `create_package_step`, `create_client_step`, `create_team_member_step`,
  `create_location_step`, `create_marketing_campaign_step`, `complete_owner_profile_step`.
- Título da barra (`SteppedFlowTitle`, rótulo `FigarooFlowTitle`): também desliza pela largura inteira
  na direção do passo, com a mola `defaultSpatial` do tema e fade `defaultEffects`.

## 2. Gestos e confirmações ligados à navegação [código]

- Voltar com alterações não salvas abre a confirmação "Descartar alterações?" (Descartar / Continuar
  editando) em Criar localidade, Editar cliente e Configurações de notificação.
- Telas de edição voltam para a anterior depois de salvar, e a anterior recarrega (padrão já descrito
  para a página pública em `4-pagina-publica.md`).
- **Sem evidência** de gesto de arrastar a borda para voltar além do voltar do sistema Android.

## 3. Mapa de todas as telas do app [código: `AppNavHostKt`]

Colunas: rota do Figaro, tela (composable), movimento ao **entrar** e ao **sair para a próxima**. O
voltar é sempre o inverso do mesmo tipo (§1).

| Rota | Tela | Entrar | Sair para a próxima |
|---|---|---|---|
| `Agenda` | AgendaScreen | cross | gaveta quando o destino é item da gaveta; senão cross |
| `Onboarding` | OnboardingFlowScreen | cross | cross |
| `MarketingDashboard` | MarketingDashboardScreen | gaveta | gaveta (ou cross quando abre um fluxo de criação ou a galeria) |
| `AppointmentDashboard` | AppointmentDashboardScreen | cross (ou intra quando vem de Avaliações/Venda) | cross |
| `AppointmentCheckout` | CheckoutFlowScreen | cross | cross |
| `AppointmentClientPicker` | ClientSelectorScreen | intra | intra |
| `EditAppointmentTimeSlot` | EditAppointmentTimeSlotScreen | intra | intra |
| `CreateAppointmentFlow` | CreateAppointmentFlowScreen | cross | cross |
| `CreateReservationFlow` | CreateReservationFlowScreen | cross | cross |
| `CreateMarketingCampaignFlow` | CreateMarketingCampaignFlowScreen | cross | cross |
| `TeamMemberDashboard` | TeamMemberDashboardScreen | intra | intra |
| `ClientsOverview` | ClientsOverviewScreen | gaveta | intra (ou cross quando abre um fluxo de criação ou a galeria) |
| `CreateClientFlow` | CreateClientFlowScreen | cross | cross |
| `ClientDashboard` | AppointmentDashboardSheet,ClientDashboardScreen | intra | intra |
| `ClientAppointmentHistory` | AppointmentDashboardSheet,ClientAppointmentHistoryScreen | intra | intra |
| `EditClientDetails` | EditClientDetailsScreen | intra | intra |
| `EditClientNotifications` | EditClientNotificationsScreen | intra | intra |
| `CreateTeamMemberFlow` | CreateTeamMemberFlowScreen | cross | cross |
| `EditTeamMemberDetails` | EditTeamMemberDetailsScreen | intra | intra |
| `EditTeamMemberWeeklyAvailability` | EditTeamMemberWeeklyAvailabilityScreen | intra | intra |
| `EditTeamMemberCustomAvailability` | EditTeamMemberCustomAvailabilityScreen | intra | intra |
| `EditLocationCustomSchedule` | EditLocationCustomScheduleScreen | intra | intra |
| `LocationsList` | LocationsListScreen | gaveta | intra (ou cross quando abre um fluxo de criação ou a galeria) |
| `TeamMembersList` | TeamMembersListScreen | gaveta | intra (ou cross quando abre um fluxo de criação ou a galeria) |
| `CreateLocationFlow` | CreateLocationFlowScreen | cross | cross |
| `LocationDashboard` | LocationDashboardScreen | intra | intra |
| `EditLocationDetails` | EditLocationDetailsScreen | intra | intra |
| `EditLocationAddress` | EditLocationAddressScreen | intra | intra |
| `EditLocationOpeningTimes` | EditLocationOpeningTimesScreen | intra | intra |
| `EditLocationAmenities` | EditLocationAmenitiesScreen | intra | intra |
| `EditTeamMemberServices` | EditTeamMemberServicesScreen | intra | intra |
| `EditServiceAppointmentRules` | EditServiceAppointmentRulesScreen | intra | intra |
| `ServiceDashboard` | ServiceDashboardScreen | intra | intra |
| `ServiceCategoriesOverview` | ServiceCategoriesOverviewScreen | intra | intra (ou cross quando abre um fluxo de criação ou a galeria) |
| `CreateServiceCategory` | CreateServiceCategoryScreen | cross | cross |
| `EditServiceCategory` | EditServiceCategoryScreen | intra | intra |
| `EditServiceConcurrencyRules` | EditServiceConcurrencyRulesScreen | intra | intra |
| `EditServiceTeamMembers` | EditServiceTeamMembersScreen | intra | intra |
| `EditServiceDetails` | EditServiceDetailsScreen | intra | intra (ou cross quando abre um fluxo de criação ou a galeria) |
| `EditServiceRates` | EditServiceRatesScreen | intra | intra |
| `ServicesList` | ServicesListScreen | gaveta | intra (ou cross quando abre um fluxo de criação ou a galeria) |
| `CreateServiceFlow` | CreateServiceFlowScreen | cross | cross |
| `CombosList` | CombosListScreen | gaveta | intra (ou cross quando abre um fluxo de criação ou a galeria) |
| `CreateComboFlow` | CreateComboFlowScreen | cross | cross |
| `ComboDashboard` | ComboDashboardScreen | intra | intra |
| `EditComboDetails` | EditComboDetailsScreen | intra | intra |
| `EditComboServices` | EditComboServicesScreen | intra | intra |
| `EditComboDiscount` | EditComboDiscountScreen | intra | intra |
| `PackagesList` | PackagesListScreen | gaveta | intra (ou cross quando abre um fluxo de criação ou a galeria) |
| `CreatePackageFlow` | CreatePackageFlowScreen | cross | cross |
| `PackageDashboard` | PackageDashboardScreen | intra | intra |
| `EditPackageDetails` | EditPackageDetailsScreen | intra | intra |
| `EditPackageServices` | EditPackageServicesScreen | intra | intra |
| `EditPackageRules` | EditPackageRulesScreen | intra | intra |
| `SellPackageFlow` | SellPackageFlowScreen | cross | cross |
| `BookPackageVisit` | BookPackageVisitScreen | cross | cross |
| `BusinessInfo` | BusinessInfoScreen | gaveta | intra |
| `EditPageSlug` | EditPageSlugScreen | intra | intra |
| `SalesOverview` | SalesOverviewScreen | gaveta | intra |
| `SaleDashboard` | SaleDashboardScreen | intra | intra |
| `PackageSaleDashboard` | PackageSaleDashboardScreen | intra | intra |
| `UnsupportedSale` | UnsupportedSaleScreen | intra | intra |
| `AppointmentSettings` | AppointmentSettingsScreen | gaveta | intra |
| `NotificationSettings` | NotificationSettingsScreen | intra | intra |
| `MarketingCampaignDashboard` | MarketingCampaignDashboardScreen | intra | intra |
| `EditMarketingCampaignDetails` | EditMarketingCampaignDetailsScreen | intra | intra (ou cross quando abre um fluxo de criação ou a galeria) |
| `EditMarketingCampaignRules` | EditMarketingCampaignRulesScreen | intra | intra |
| `MarketingServiceSelector` |  | intra | intra |
| `EditMarketingCampaignDuration` | EditMarketingCampaignDurationScreen | intra | intra |
| `PageSettings` | PageSettingsScreen | gaveta | gaveta |
| `LayoutThemeSelector` | LayoutThemeScreen | intra | intra |
| `PageSettingsQrCode` | PageQrCodeScreen | intra | intra |
| `PageDraftPreview` | DraftPagePreviewScreen | intra | intra |
| `LayoutThemePreview` | LayoutThemePreviewScreen | intra | intra |
| `PageSettingsServiceListEditor` | ServiceListEditorScreen | intra | intra |
| `PageSettingsHeroEditor` | HeroEditorScreen | intra | intra (ou cross quando abre um fluxo de criação ou a galeria) |
| `PageSettingsContactFormEditor` | ContactFormEditorScreen | intra | intra |
| `PageSettingsSocialNetworksEditor` | SocialNetworksEditorScreen | intra | intra |
| `PageSettingsRatingsEditor` | RatingsEditorScreen | intra | intra |
| `PageSettingsPhotoGalleryEditor` | PhotoGalleryEditorScreen | intra | intra (ou cross quando abre um fluxo de criação ou a galeria) |
| `PageSettingsTeamEditor` | TeamEditorScreen | intra | intra |
| `PageSettingsLocationsEditor` | LocationsEditorScreen | intra | intra |
| `AccountSettings` | AccountSettingsScreen | gaveta | intra |
| `DeveloperSettings` | DeveloperSettingsScreen | intra | intra |
| `AccountSettingsAccessConfig` | AccessConfigScreen | intra | intra |
| `AccountSettingsChangeEmail` | ChangeEmailScreen | intra | intra |
| `AccountSettingsSetPassword` | SetPasswordScreen | intra | intra |
| `AccountSettingsEmailVerification` | EmailVerificationScreen | intra | intra |
| `MediaGalleryPicker` | MediaGalleryPickerScreen | cross | cross |
| `RatingsOverview` | RatingsOverviewScreen | gaveta quando vem da Agenda; senão intra | intra |
| `NotificationsOverview` | NotificationsOverviewScreen | intra | intra |
| `NotificationDetail` | NotificationDetailScreen | intra | intra |
| `Paywall` | PaywallScreen | cross | cross |
| `AdjustTeamSize` | AdjustTeamSizeScreen | cross | cross |

Fora do `AppNavHost`: Entrada (`Landing`), Entrar (`Login`) e Criar conta (`SignUp`) usam `crossFlow`
nos dois sentidos (`AuthNavGraphKt`, `LoginNavGraphKt`).

## 4. Correspondência com o Cortaí [inferência]

| Figaro | Cortaí (rota atual) | Movimento a usar |
|---|---|---|
| Agenda | `/barbeiro`, `/barbeiro/agenda` | raiz |
| Itens da gaveta (§1.3) | `/barbeiro/<área>` (ex.: `/barbeiro/servicos`, `/barbeiro/equipe`, `/barbeiro/clientes`, `/barbeiro/sua-pagina`, `/barbeiro/conta`) | `drawerPush` saindo da Agenda; `intraFlow` entre áreas |
| Telas internas (Editar…, Painel de…, Layout & Tema) | rotas mais fundas (ex.: `/barbeiro/clientes/$id`, `/barbeiro/marca/layout-tema`) | `intraFlow` |
| Onboarding, assinatura | `/barbeiro/configurar`, `/barbeiro/plano` | `crossFlow` |
| Fluxos de criação e cobrança | no Cortaí são folhas e painéis dentro da tela (não rotas) | sem troca de rota; manter as folhas |

A implementação no Cortaí está em `src/lib/transicoes-de-tela.ts` (regra de qual movimento usar) e
`src/components/layout/TransicaoDePagina.tsx` (o movimento), com teste em `src/lib/transicoes-de-tela.test.ts`.
