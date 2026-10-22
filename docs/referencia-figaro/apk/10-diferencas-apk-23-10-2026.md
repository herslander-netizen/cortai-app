# Diferenças do APK de 23/10/2026 em relação à especificação (18/10 e 22/10)

Complementa `9-auditoria-apk-atualizado-2026-10-23.md` (GPT), que identificou o arquivo mas não pôde dizer o que mudou.
Aqui está o que mudou, **comparando o código descompilado deste APK com os valores e o mapa de telas que já estavam
nesta especificação**. O APK e o código descompilado **não** vão para o repositório (público); só esta descrição.

## 1. Arquivo e método

| Item | Valor |
|---|---|
| Entrega | 6 partes `.bin` (14.808.848 bytes cada; a última com 14.808.846) |
| Juntado | 88.853.086 bytes; **SHA-256 `9fd5763de71cedf734f7565fb3f868dbb776a254a941eebad3a23dac1cc98528`**, igual ao da auditoria 9 |
| Integridade | ZIP com 593 entradas; `testzip` sem nenhum erro de CRC |
| Descompilação | JADX 1.5.1 → 31.825 arquivos Java (5.338 em `com.figaroo.android`); 110 métodos que o JADX não converteu (Kotlin/coroutines), nenhum de tela |
| Limite | Não há cópia do APK anterior: "o que mudou" vem da **comparação com a especificação escrita**, não de um diff binário |

## 2. O que NÃO mudou (conferido no código novo)

Valores da especificação que continuam idênticos:

- **Animações** (`FigarooExtendedFABKt`): colapso do FAB 220 ms (`MorphCollapseDurationMillis`), escala mínima do rótulo 0,7,
  sucesso 700 ms; `FigarooLoadingMinDisplayMillis` 400 ms; `BrandMotionKt.PressScaleTarget` 0,98;
  `OnboardingCompleteScreenKt` `HERO_MORPH_MS` 520 e `WORDMARK_REVEAL_DELAY_MS` 800.
- **Agenda:** faixa de rolagem na borda 72 dp e 900 dp/s (`AgendaScreenKt`); alfa dos outros cartões 0,4
  (`AgendaCardDisplayState.DimmedAlpha`); chave do zoom `agenda_minute_height`; `AgendaZoom` (mínimo = confortável/2, máximo =
  armado, armado = `max(repouso, armado)`, minuto focal limitado a 0–1440).
- **Cores:** as 87 cores `#RRGGBB` de `1-design-system.md` existem todas no `ColorKt`/tema novo; nenhuma foi alterada ou
  removida. Cinco cores a mais só aparecem em prévias dos cartões de tema/layout (`ThemeCard`, `LayoutThemeCard`).
- **Textos:** dos textos em inglês que a especificação cita, nenhum fluxo documentado perdeu texto de forma relevante.

Conclusão: **as telas, os tempos e as cores já recuperados no Cortaí continuam valendo**; não há retrabalho de visual.

## 3. O que mudou ou apareceu (evidência: `NavigationRoute` e `strings.xml`)

O mapa de telas de `5-navegacao-e-transicoes.md` §3 tem 94 rotas. O APK novo tem **100 classes de rota**:

| Situação | Rotas |
|---|---|
| Só na especificação (não existem mais no código novo) | `ClientAppointmentHistory`, `SalesOverview` |
| Só no código novo (a especificação não lista) | `AppointmentHistory`, `SaleHistory`, `InsightsDashboard`, `PaymentSettings`, `Authentication` (as telas `Landing`, `Login` e `SignUp` já estavam documentadas em 5 e 7) |

### 3.1 Histórico generalizado (substitui `ClientAppointmentHistory` e `SalesOverview`) — **mudança confirmada**

Duas telas com a mesma estrutura (`history/ui/appointments`, `history/ui/sales`, paginação em `history/logic/paging`), abertas pelo
cliente, pela gaveta e por cada bloco de Insights (`HistoryEntryPointsKt`: `revenueHistoryHero`, `forecastHistoryHero`,
`teamHistoryHero`):

- **Títulos:** "Appointments", "Sales", "Appointment history" (do cliente).
- **Período:** Today, This week, This month, This year, Last 7 days, Last 30 days, All time, Next 7/30 days, All upcoming,
  Custom… (de uma data a outra, **no máximo 1 ano**: "Choose a period of up to 1 year."); seções "Past"/"Upcoming".
- **Filtros** (folha com "Apply (n)" e "Clear"): Channel (Manual/Online), Client, Professional (inclui "Former members"),
  Service, Status, Type (Appointment/Package). "Clear filters".
- **Linha:** "No client", "N professionals", "Package · …", "Package item ×n"; status "Not checked out — past its time, no
  checkout"; totais "Revenue" e "Value".
- **Vazios/erro:** "No appointments in this period", "No sales in this period", "No no-shows in this period — Every client
  showed up", "No data matches these filters", "Couldn't load more", tentar de novo.
- Carregamento por páginas ("load more").

### 3.2 Painel de Insights (tela cheia) — **provavelmente novo**

A gaveta já tinha o item "Insights" e a faixa recolhível "See performance · last 7 days" (já em `2-agenda.md`). A rota
`InsightsDashboard`, com blocos próprios, **não estava no mapa de 94 rotas**:

- **Períodos:** Today, Week, Month, Year; comparação "vs. last week/month/year/day" ou "No data for the previous period".
- **Blocos** ("Show on dashboard": folha para escolher quais aparecem, "n of m visible"): **Revenue** (top services,
  "previous average", legenda "Sales finished at checkout, before card fees"), **Revenue forecast** e **Team**.
- **Previsão:** janelas Today / Next 7 / Next 30 / Next 90 days; "Expected for …, based on bookings. Not received yet."; compara
  com "your normal · R$/day" (above / at / below your normal); "By professional"; vazio: "Share your page to get bookings."
- **Equipe:** "Who earned the most in the period. Swipe to see appointments and no-shows."; três páginas (Revenue,
  Appointments, No-shows com "value lost"); "revenue leader"; "Former member".
- Cada bloco abre o histórico filtrado (3.1). "Statistics from the last 30 days". Pedido de métrica: "Want another metric? Chat
  on WhatsApp".
- Estados: carregando, erro com "Try again", vazio com ação ("Go to agenda"/"Share page").

### 3.3 Opções de pagamento (`PaymentSettings`) — **provavelmente novo**

O item "Payment Options" já aparecia na gaveta (`2-agenda.md`), mas a tela não estava no mapa:

- Lista as formas de pagamento da empresa com **taxa por forma** (`FeeRuleSheet`): campo **Percentage** (máximo 100%: "The fee
  can't be more than 100%.") ou **Fixed amount**; "Remove fee"; "No fee".
- Regra declarada: "The payment method's fee is applied automatically at checkout. The client pays the same total." (a taxa
  não muda o que o cliente paga; é só custo do negócio, e por isso o Insights diz "before card fees").
- **Só o dono altera:** "Only the shop owner can change these options." Erros: "Couldn't load the payment options",
  "Couldn't save the change".

## 4. Cortaí hoje (conferido nas rotas)

| Função do APK | No Cortaí |
|---|---|
| Histórico de atendimentos e vendas com período e filtros | **Não existe.** Há `barbeiro.agendamentos` (confirmados), `barbeiro.caixa` (dia), `barbeiro.financeiro` (receita do mês e movimentações recentes) |
| Painel de Insights com receita, previsão e equipe | **Não existe.** `barbeiro.financeiro` só soma o mês; `barbeiro.comissoes` e `barbeiro.crescimento` cobrem outros temas |
| Taxa por forma de pagamento | **Não existe** (nenhuma coluna ou tela de taxa por forma) |

## 5. Pendências desta análise (não verificado)

- Valores de **layout, animação e cor** das três telas novas: li os textos e a estrutura de rotas; ainda não li o código de cada
  `@Composable` (tempos, curvas, dimensões, gráficos). Fazer por tela, antes de implementar.
- As novidades 3.2 e 3.3 são **"provavelmente novas"**: as rotas não estavam no mapa de 94; mas o item da gaveta já existia, então
  é possível que a tela existisse e tivesse ficado fora do mapa. A troca de 3.1 é certa (as duas rotas antigas sumiram).
- Outras telas do APK que a especificação cita só por nome genérico (por exemplo `ClientNoteSheet`, `CopyToOtherDaysSheet`,
  `FeeRuleSheet`, `PackageRhythmEditor`) não foram diferenciadas: sem o APK antigo não dá para dizer se são novas.

## 6. Proposta de lotes (depende do dono; envolve banco e regra de negócio)

1. **Histórico com período e filtros** (atendimentos e vendas): só leitura sobre dados que já existem; sem migração. Menor risco.
2. **Painel de Insights** (receita, previsão, equipe): só leitura; a previsão usa agendamentos futuros e o "normal por dia".
3. **Taxa por forma de pagamento**: **regra de negócio e banco** (nova coluna/tabela de taxas e efeito no fechamento da comanda).
   Exige decisão do dono e autorização para migração; não começar sem ela.

## 7. Personalizar Página no APK novo (pedido do dono de 23/10: trazer a experiência completa e as atualizações)

Método: os 200 textos da área (`page_settings_*`, `page_hub_*`, `layout_theme_*`, `media_gallery_*`, `edit_page_*`…) foram
comparados com `4-pagina-publica.md`; os que a especificação não cita foram checados quanto ao **uso real no código** (um texto sem
`R.string.<nome>` em nenhuma classe é resto de recurso, não função).

**Conclusão: não há função nova verificável em Personalizar Página.** Hub, Layout & Tema, editores por seção, rascunho e
publicação seguem o que está em `4-pagina-publica.md`. O que não estava na especificação:

| Item | Situação no APK | O que é |
|---|---|---|
| Editor do link (`EditPageSlug`) | usado | A especificação o deixara "fora do escopo". Campo "Page Link" (`my-barbershop`), só minúsculas, números e hífens; erros: obrigatório, formato, longo demais, "já está em uso" |
| Biblioteca de imagens (`MediaGalleryPicker`) | usado | Seções "My images" e "Figaroo images" (imagens da comunidade, filtradas pelo layout), "Add from device", "Use Image"; erros: biblioteca não carregou, falha no envio, **arquivo acima de 5 MB**, formato que não é JPEG/PNG |
| Estado oculto de cada editor | usado | "<Seção> Hidden" + mensagem + "Activate/Hide <Seção>" nos 7 editores (a especificação já citava o estado oculto, sem os textos) |
| Contador de bio | usado | `n/máximo` na bio da equipe e das localidades; "Bio cannot exceed n characters" |
| QR Code | usado | erro de carga; "precisa de permissão de armazenamento para salvar" |
| Layout & Tema | usado | contadores "+N sections", "N themes (available)" |
| "Show ratings" por profissional e aviso de "alterações não publicadas" | **sem uso no código** | Textos soltos; não são função deste build |

**Cortaí hoje, por item:** link: já valida as mesmas regras (`marca.functions.ts`, texto em português); bio: já tem contador e
limite (`LIMITES_DA_SECAO.bio`); tirar do ar: já tem o diálogo; ocultar/ativar seção: já existe; **biblioteca de imagens: não
existe** (o Cortaí envia direto do aparelho, sem reaproveitar imagens já enviadas e sem imagens prontas por layout). A única função
que falta de fato é essa; o limite de envio do Cortaí é 2 MB (regra do projeto), o do Figaro é 5 MB.

## 8. Personalizar Página: o que já existe no Cortaí e o que falta (conferido no código em 23/10)

Já recuperado (conferido em `barbeiro.marca.tsx`, `SecaoConteudo.tsx`, `validacao.ts`, `barbeiro.sua-pagina.tsx`): menu ⋮ (Editar link, QR Code,
Tirar do ar com diálogo), banner "Alterações não publicadas", Publicar com bloqueio de seções obrigatórias, Descartar com confirmação, grupos
Obrigatórias/Ativas/Inativas sem switch, Layout & Tema em acordeões com carrossel e "Ver Exemplo", QR Code com Papel/Adesivo, salvar e imprimir,
limites de galeria (5–25 e até 100) e de bio (2000), bios obrigatórias, handles sem espaço. O progresso de publicação (C6) segue como decisão
do inventário: só usar se a publicação demorar de verdade.

Falta de fato:
1. **Hero:** o Figaro tem imagem de fundo escolhida da biblioteca + "Headline" (8–25) e "Subheadline" (10–100). O Cortaí tem "Frase principal" e capa
   em `SecaoTextos`/`SecaoImagens`, sem esses limites nem o seletor de biblioteca.
2. **Biblioteca de imagens** ("Minhas imagens" + imagens prontas por layout, seleção única no Hero e múltipla na Galeria): hoje só existe a lista de
   logos enviadas (`listarLogosDoNegocio`); capa e galeria sempre enviam do aparelho. Imagens prontas exigem assets (decisão do dono).
3. **Limite de envio:** Figaro 5 MB; Cortaí 2 MB (regra do projeto). Manter 2 MB salvo decisão do dono.
4. **QR Code** é uma seção no hub, não uma tela própria; "Salvar na galeria" vira download PNG (web).
Reservas do GPT em `marca/editor/*` e `barbeiro.marca.tsx` valem; qualquer item acima que toque nesses arquivos passa por recado.

