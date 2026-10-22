# Spec 6 — Catálogo de animações do Figaro

Fonte: APK completo reenviado em 22/10/2026, descompilado com o jadx, e os cinco vídeos de demonstração
que vêm dentro do próprio APK (`res/raw/landing_peek_*.mp4`, 928×1364, 30 fps). Os vídeos não vão para
o repositório; aqui fica só a descrição.

Este arquivo junta **todas** as animações achadas no código, por lugar onde aparecem. Os valores já
descritos em `1-design-system.md` §5 (botões, FAB, acordeão, seletor de data, progresso de publicação)
e em `2-agenda.md` §10 e `3-fluxos-do-atendimento.md` §8 (Agenda, ficha, Reagendar) são repetidos só
em resumo, com a referência. Marcação: **[código]**, **[vídeo do APK]**, **[inferência]**, **sem evidência**.

Valores-padrão do Compose usados quando o código não passa a curva [inferência: padrão da biblioteca]:
- `tween(n)` sem curva = **FastOutSlowIn** (`cubic-bezier(0.4, 0, 0.2, 1)`).
- `fadeIn()` / `fadeOut()` sem spec = mola `stiffness 400`, sem quique.
- `AnimatedVisibility` sem transição numa coluna = `fadeIn + expandVertically` ao abrir e
  `fadeOut + shrinkVertically` ao fechar, com molas sem quique.
- `animateFloatAsState` sem spec = mola `dampingRatio 1, stiffness 1500`.
- `SizeTransform` padrão = mola `stiffness 400`, sem cortar o conteúdo.

## 1. Troca de tela (navegação)

Detalhado em `5-navegacao-e-transicoes.md`. Resumo:

| Movimento | Valores | Onde |
|---|---|---|
| `intraFlow` | deslize de 20 % da largura + fade, 300 ms, FastOutSlowIn | telas internas de cada área |
| `crossFlow` | sobe 100 % da altura + fade, 350 ms; a tela de trás só esmaece | criar, cobrar, onboarding, assinatura, galeria, entrar/criar conta |
| `drawerPush` | largura inteira, mola `1 / 1500`, sem fade | Agenda ↔ áreas da gaveta |
| Etapas de fluxo interno | largura inteira, 300 ms, sem fade | cobrança, novo agendamento, editar venda, vender pacote |
| Etapas de cadastro | largura inteira + fade, 220 ms, na direção do passo | criar serviço, combo, pacote, cliente, profissional, localidade, campanha |
| Título da etapa | largura inteira, mola `defaultSpatial` + fade `defaultEffects` | barra dos cadastros em etapas |

## 2. Componentes compartilhados (design system)

| Componente | Animação | Fonte |
|---|---|---|
| Botão principal (carregando → sucesso) | entra `fadeIn 220 ms` com atraso de 90 ms + `scaleIn` de 0,92; sai `fadeOut 90 ms` | `FigarooPrimaryButtonKt` (ver spec 1 §5) |
| Escala ao tocar (botões) | 0,98 com a mola `fastSpatial` | `SnappyPressAnimationKt` |
| FAB estendido (salvar) | pílula → círculo em 220 ms LinearOutSlowIn; rótulo 0,7 → 1; "sucesso" fica 700 ms; ícone troca com fade + escala (`FigarooCtaGlyphSwap`) | `FigarooExtendedFABKt` |
| **Odômetro (número que muda)** | cada dígito troca sozinho: o novo **sobe de baixo** quando o número aumenta (desce de cima quando diminui), deslize da altura do dígito com a mola `defaultSpatial` + fade `fastEffects`; rótulo `odometer-digit` | `FigarooOdometerKt` [código] |
| **Pulso de estatística** | escala 0,85 → **1,05 em 140 ms** → 1,0 em 100 ms; opacidade 0 → 1 em 240 ms; tudo FastOutSlowIn | `FigarooStatPulseKt` [código] |
| Indicador de carregamento | aparece por no mínimo 400 ms; 48 dp | `FigarooLoadingIndicatorKt` |
| Progresso de publicação | barra linear de 8 s; depois 2,5 s LinearOutSlowIn; marca de concluído com 650/200/700 ms | `FigarooPublishProgressKt` (spec 1 §5) |
| Seta do botão dividido | gira com `animateFloatAsState` (rótulo `FigarooSplitButtonChevron`) | `FigarooSplitButtonKt` |
| Seta do acordeão | mola `0,75 / 1500` | `AccordionSectionKt` |
| Folha de baixo (`FigarooSheetScaffold`, 43 telas) | folha do Material 3: sobe de baixo; dois modos, `Partial` (abre na metade e arrasta para cheia) e `ContentHeight` (abre na altura do conteúdo, sem meio-termo); alça de arrastar padrão | `FigarooSheetScaffoldKt`, `FigarooSheetExpansion` [código] |
| Diálogo de confirmação (25 telas) | diálogo padrão do Material 3 [inferência] | `FigarooConfirmDialogKt` |
| Avatar com foto (enviar foto) | troca foto/estado com fade 300 ms FastOutSlowIn + ajuste de tamanho | `PhotoUploaderAvatarKt` (`PhotoUploaderAvatar`) |

Molas do tema (`MotionScheme.expressive()`, spec 1 §5.2): fastSpatial 0,6/800 (leve quique),
defaultSpatial 0,8/380, slowSpatial 0,8/200, fastEffects 1/3800, defaultEffects 1/1600, slowEffects 1/800.

## 3. Gaveta da Agenda (Início do Figaro)

| Elemento | Animação | Fonte |
|---|---|---|
| Seções recolhíveis ("Sua barbearia", "Fidelidade") | conteúdo abre/fecha com o padrão do `AnimatedVisibility` (fade + expandir/recolher na vertical); seta gira de **−90° (fechada) para 0° (aberta)** com a mola padrão | `FigarooDrawerCollapsibleSectionKt` (`drawerSectionChevronRotation`) [código] |
| Cartão "Sua Página" → "Desempenho dos últimos 7 dias" | a faixa de números abre/fecha com o mesmo padrão; seta gira **0° → 180°** | `FigarooDrawerPageCardKt` (`drawerInsightsChevronRotation`) [código] |
| Números de desempenho (Visitas, Agend., Conversão) | contam de 0 até o valor e ganham uma seta ↗ ao lado | [vídeo do APK `landing_peek_analytics`, 0–3 s] |
| Destaque de cartão | o fundo escurece e os cartões de números (Sua Página 7 dias, Serviço 30 dias, Campanha) aparecem em sequência, com números que contam e o botão "Ver campanha" | [vídeo do APK `landing_peek_analytics`, 3–12 s] |

Ordem dos itens da gaveta [código: `AgendaScreenKt`]: cabeçalho da conta ("Opções da Conta",
"Nome · Papel"); cartão **Sua Página** (estado, compartilhar, desempenho de 7 dias, "Página bloqueada"
quando falta completar o perfil); avisos (ativar notificações, confirmar e-mail, saldo de WhatsApp
baixo/pausado); **Agenda** (hoje · fechado / atendimentos · próximo horário); grupo **Sua barbearia**:
Informações Básicas, Localidades, Serviços, Combos (selo "Novo"), Equipe, Vendas, Avaliações, Opções
de Agendamento; grupo **Fidelidade**: Clientes, Campanhas Promocionais, Pacotes (selo "Novo");
**Suporte** ("Atendimento humano no WhatsApp").

## 4. Telas

| Tela | Animação | Fonte |
|---|---|---|
| Agenda | troca Calendário ↔ Lista (`agendaViewModeSwap`), revelação do seletor de data, zoom armado, barra de edição sobe/desce, alfa do cartão por estado (300 ms), indicador de "agora" | spec 2 §10 |
| Toast "Continue configurando sua barbearia" (na Agenda) | **sobe da altura inteira + fade, 320 ms**; sai descendo com fade; sombra 8 dp | `AgendaOnboardingToastKt` (`TOAST_SLIDE_DURATION_MS = 320`) [código] |
| Reagendar: linha de horário | a linha do horário escolhido abre e mostra os profissionais (`SlotRowExpandCollapse`), fade padrão + ajuste de tamanho | `TimeSlotSelectorAvailabilityListKt` [código] |
| Personalizar Página e Painel do serviço | carregando → conteúdo com **fade in 220 ms / fade out 180 ms** | `PageSettingsScreenKt` (`PageSettingsContent`), `ServiceDashboardScreenKt` (`ServiceDashboardHero`) [código] |
| Editores Equipe e Localidades da página | lista troca com `AnimatedContent` (`TeamEditorMembers`, `LocationsEditorList`) | [código] |
| Cobrança → pagamento | ao escolher **Dinheiro**, a área de "Valor recebido / Troco" aparece com fade padrão + ajuste de tamanho (`CashSectionReveal`) | `CheckoutPaymentSelectionScreenKt` [código] |
| Painel da venda | modo ver ↔ editar com `AnimatedContent` (`saleDashboardEditSwap`); blocos abrem/fecham com `expandVertically`/`shrinkVertically` + fade; etapas 300 ms | `SaleDashboardScreenKt` [código] |
| **Onboarding concluído** | carregando ("Preparando sua página…") → sucesso com **fade de 520 ms** (`HERO_MORPH_MS`); o conteúdo sobe e aparece com `slowEffects`; o logotipo aparece **800 ms depois** (`WORDMARK_REVEAL_DELAY_MS`); o link da página é **digitado letra a letra, 32 ms por letra**, com cursor piscando a cada 450 ms; ícone de 140 dp | `OnboardingCompleteScreenKt` [código] |
| **Tela de entrada (Landing)** | cinco passos com vídeo (Seu site, Agendar, Lembretes, Avaliações, Desempenho); o passo ativo cresce com curva de **quique `cubic-bezier(0.3, 1.75, 0.4, 1)` em 500 ms** e brilho (0,7 / 0,35); barra de progresso por passo (tique de 40 ms); troca de vídeo com 260 ms de antecedência; marca final com pulso (300/500/340 ms) | `LandingSequenceViewKt`, `LandingSequenceController` [código] |

## 5. O que os vídeos do APK mostram [vídeo do APK]

Os cinco vídeos são do próprio Figaro, em português, e mostram animações que o código sozinho não deixa
ver por inteiro.

1. **`landing_peek_booking` (agendamento pelo cliente, 7,3 s):** faixa de dias com o dia escolhido em
   verde-escuro (o toque mostra um círculo de pressão); lista de horários com o primeiro profissional e
   "+2"; ao tocar num horário, **a linha abre no lugar** e lista os profissionais com "Selecionar"; ao
   escolher, o botão vira a pílula **"✓ Selecionado"**; a barra de baixo mostra "28 de Agosto · 09:15 às
   10:15 com Lucas Martins" + **Continuar**; a folha **"Seus Dados"** sobe com telefone (+55) e e-mail,
   botão verde **"Verificar via WhatsApp"** e o link "Não tem WhatsApp? Verifique via e-mail"; o código
   de 4 dígitos é preenchido caixa a caixa, com a caixa ativa destacada, e o botão "Verificar" fica ativo.
2. **`landing_peek_notifications` (8,7 s):** notificações na tela de bloqueio entrando uma a uma
   ("Agendamento confirmado", "Nova avaliação ★★★★★"), depois agrupadas ("Figaroo · 3"); uma folha
   **"Para seu cliente"** sobe de baixo e mostra o lembrete de WhatsApp ("Lembrete do seu horário") e o
   e-mail de avaliação ("Como foi seu corte?") entrando em sequência.
3. **`landing_peek_reviews` (8 s):** tela Avaliações: a nota **conta de 0,0 a 4,6**, as estrelas
   preenchem, as barras de 5 a 1 crescem da esquerda e a palavra "Excelente" aparece; depois os cartões
   de avaliação sobem em sequência (cada um entra esmaecido e fica firme) e a lista rola.
4. **`landing_peek_site` (10,3 s):** a página pública trocando de tema; a troca acontece com um
   **círculo que se abre a partir de um ponto e revela o tema novo** (quadro 8); depois a página rola até
   "Equipe" e "Mais procurados".
5. **`landing_peek_analytics` (12,5 s):** gaveta do Início com os números de desempenho contando,
   destaque escurecendo o fundo e os cartões de números aparecendo um a um (§3).

## 6. Sem evidência

- Animação de entrada de listas (cascata) no app: **sem evidência no código**; aparece só nos vídeos
  de demonstração (avaliações), que podem ter sido montados para o vídeo.
- Esqueleto (skeleton/shimmer) de carregamento: **sem evidência**; o Figaro usa o indicador de
  carregamento com exibição mínima de 400 ms.
- Puxar para atualizar existe em Notificações, Avaliações e Vendas (`PullToRefresh`), com o
  indicador padrão do Material 3.
