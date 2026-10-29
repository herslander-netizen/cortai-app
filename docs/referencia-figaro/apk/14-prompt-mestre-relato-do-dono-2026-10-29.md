# Spec 14 — "Prompt Mestre" e mapa de páginas (relato enviado pelo dono, 29/10/2026)

Texto colado pelo dono no chat (gerado por outra IA), pensado para ser passado ao GPT. Vai abaixo **como chegou**.
É **[relato]**: as regras do `AGENTS.md`, as decisões do dono no `DIARIO.md`, as specs 1 e 2 (lidas no código do APK)
e as capturas do dono **valem acima dele**.

**Conferência feita pelo Claude em 29/10.** Todas as rotas citadas existem. Antes de usar este texto:

- **Não aplicar — contradiz o código do Figaro ou as capturas do dono (medidas pixel a pixel em 29/10):**
  - Fundo `#0A101D`, cards `#121A2A` com borda branca 8 %, sheets `#192233`: não são do Figaro. O Figaro usa
    `background` #1B1F1C/#EAF2EC, cartões da Agenda `surfaceContainerLowest` #141816/#FFFFFF, `cardTile`
    #3E4440/#FFFFFF e `surfaceContainer` #303632 (spec 1 §2; já aplicados na Agenda em 29/10).
  - "Premium Glass", gradiente translúcido, borda iluminada, neon: o Figaro não tem; cartões num padrão só (decisão do
    dono de 18/10, teste `timeline-rolagem-celular.test.ts` proíbe "Premium Glass").
  - CTA com gradiente Navy/Cyan: proibido (identidade do Cortaí de 27/10: sem ciano, sem o gradiente antigo).
  - Poppins em todos os títulos: no Figaro Poppins é só display/headline; títulos de tela e topo são `titleLarge` em
    Plus Jakarta Sans (spec 1 §3; confirmado na captura).
  - JetBrains Mono em preços e horários: no Figaro o mono aparece em painéis de disponibilidade e insights; as horas da
    Agenda na captura usam a mono do sistema (zero liso) e valores usam Jakarta com algarismos tabulares.
  - Pílulas de status com fundo a 15 %: o Figaro usa pares de container (#C8E6C9/#2E7D32 etc., spec 1 §2.4).
  - Linha "agora" atualizando a cada 30 s: o Figaro tica na virada do minuto (spec 2 §2.4).
  - Barra de navegação inferior de 80 px: a Agenda do Figaro e a do Cortaí usam gaveta lateral, não bottom nav.
- **Exigem decisão do dono antes (regra de negócio, segurança ou funcionalidade nova):** entrada por PIN de 6 dígitos
  (muda a autenticação), gorjeta/desconto em chips no checkout (regra de cobrança), canal SMS (não existe), métricas
  de LTV e metas de comissão (cálculo novo), mapa no onboarding (custo/serviço externo), "Primeiro disponível" no
  agendamento público (regra do motor).
- **Agenda protegida:** itens do Módulo 2 só com pedido específico do dono para a Agenda.
- **Já feito ou em andamento:** zoom 1–4, cinco níveis de cartão, modo armado, ficha em folha de 28 dp com ações
  embaixo, linha "agora" com pílula, hachuras, botões com carregando → ✓ 700 ms, gaveta do menu no padrão Figaro.

---

Aqui está o Prompt Mestre completo e pronto para você copiar e colar para o GPT (ou qualquer outra IA), seguido pelo Mapa Comparativo Detalhado de todas as páginas existentes no Cortaí: como estão hoje e como devem ser refatoradas no padrão Figaroo.

---

PARTE 1: O PROMPT MESTRE PARA O GPT

```markdown
# PROMPT MESTRE: TRANSFORMAÇÃO VISUAL E UX DO CORTAÍ PARA O PADRÃO FIGAROO

Você é o Arquiteto Front-end e Lead Designer do Cortaí. Sua missão é refatorar a interface de todas as páginas do sistema Cortaí para reproduzir com 100% de fidelidade a estética, a ergonomia tátil e os padrões de interação do aplicativo FIGAROO (Android Jetpack Compose / Material 3 Tonal), mantendo rigorosamente intactas todas as regras de negócio, chamadas de backend, banco de dados e APIs do Cortaí.

---

## 1. DIRETRIZES FUNDAMENTAIS E INEGOCIÁVEIS

1. **PRESERVAÇÃO DO BACKEND E REGRAS DE NEGÓCIO:**
   - O motor de agendamento, RPCs, queries do Supabase, TanStack Start e validações existentes NÃO devem ser alterados.
   - Apenas a camada visual (JSX/TSX, CSS, Tailwind 4, componentes de UI e motion) é refatorada.
   - Nenhuma tabela, migração ou rota de API deve ser modificada ou quebrada.

2. **DESIGN SYSTEM DO FIGAROO (TOKENS OFICIAIS):**
   - **Paleta Navy Tonal (Primary):**
     * Primary 10: `#001A40` | Primary 20: `#002E66` | Primary 30: `#00408F`
     * Primary 40: `#00509D` | Primary 50: `#2467BB` | Primary 80: `#9FBEF6` | Primary 90: `#D5E2FF`
     * Destaque/Acento: `#4DA3FF` (Dark) / `#00509D` (Light)
   - **Paleta Magenta Tonal (Tertiary):**
     * Tertiary 40: `#B61055` | Tertiary 50: `#D3145D` | Acento: `#FF4D8D`
   - **Neutros e Superfícies Orgânicas:**
     * Fundo da Aplicação: `#0A101D` (Dark) / `#F8FAFC` (Light)
     * Cards e Contêineres de Superfície: `#121A2A` com borda sutil `rgba(255, 255, 255, 0.08)`
     * Superfície Elevada / Modais / Sheets: `#192233`
     * Hachura de Horário Fora de Expediente (OffTime): Linhas diagonais com `alpha = 0.06`
     * Hachura de Bloqueios/Indisponível: Linhas com `alpha = 0.025`
   - **Tipografia:**
     * Títulos e Destaques: `Poppins` (Font-weight: 600 ou 700)
     * Textos Corridos e Labels: `Plus Jakarta Sans` (Font-weight: 400 ou 500)
     * Preços, Horários, Códigos e Contadores: `JetBrains Mono` (Tabular figures)
   - **Formas e Raios (Border Radius):**
     * Cards Comuns: `12px` (`--fg-radius-card`)
     * Hero Cards e Diálogos: `28px` (`--fg-radius-hero`)
     * Bottom Sheets (Topo Arredondado): `28px 28px 0 0` (`--fg-radius-sheet`)
     * Chips e Tags: `8px` (`--fg-radius-chip`)
     * Botões Principais / Pílulas: `9999px` (Pill shape 50%)
     * Extended FAB: `28px` expandido, `16px` recolhido
   - **Dimensões e Toque Móvel (Mobile-First 390px):**
     * Área Mínima de Toque: `48px` (Botões de ação rápida: `52px`, CTA Principal: `56px`)
     * TopBar Superior: `64px` (Compacta) / `152px` (Expandida com título grande)
     * Bottom Navigation: `80px` (com ícones de 24px e labels de 12px)
     * Navigation Drawer: Largura fixa de `348px`
   - **Física e Motion:**
     * Mola física: `spring(stiffness: 400, damping: 1.0)` (Zero overshoot ou quique artificial)
     * Efeito de toque (Press Scale): Redução instantânea para `0.98` ao pressionar (`active:scale-[0.98]`)
     * Duração perceptual de transições: entre `180ms` e `220ms`

---

## 2. REQUISITOS DE IMPLEMENTAÇÃO POR TELA

Ao refatorar cada página do Cortaí, você deve:
1. Analisar os componentes da rota e identificar dados e estados já existentes.
2. Substituir a estrutura visual antiga pela hierarquia de componentes Figaroo:
   - `FigarooTopBar` no cabeçalho com ações contextuais.
   - Cards com gradiente translúcido sutil (Premium Glass), cantos de 12px/16px e borda iluminada de 1px.
   - Pílulas de status (`StatusPill`) com fundo colorido em 15% de opacidade e texto vibrante.
   - Bottom Sheets com raio de 28px no topo para formulários, fichas e seletores secundários.
   - Extended FAB no canto inferior direito que encolhe automaticamente ao rolar a página.
3. Garantir contraste perfeito no tema escuro (Dark Mode padrão do Figaroo) e suporte limpo ao tema claro.
4. Manter todo o código modular, legível e tipado em TypeScript com Tailwind 4 e shadcn/Radix.

Agora, aplique essa transformação nas páginas solicitadas a seguir.
```

---

PARTE 2: MAPA COMPARATIVO DAS PÁGINAS (ATUAL vs FIGAROO)

Abaixo está o mapeamento minucioso de como cada módulo do Cortaí está estruturado hoje e exatamente como deve ficar na nova roupagem do Figaroo:

---

MÓDULO 1: ENTRADA & AUTENTICAÇÃO

| Rota Cortaí | Como está hoje no Cortaí | Como deve ser no padrão Figaroo |
| :--- | :--- | :--- |
| `/login` | Formulário clássico centralizado em card escuro, inputs simples e botão reto. | Login Progressivo em 2 Fases (`LandingScreen` + `LoginScreen`):<br>• Fase A (`EmailEntry`): Campo de e-mail estilizado com validação RFC em tempo real.<br>• Transição fluida horizontal (300ms) para a Fase B.<br>• Fase B (`CredentialEntry`): Campo de senha com toggle revelador ou entrada de PIN numérico de 6 dígitos (`AccessCodeInput`) com animação de shake (±8px) em caso de erro.<br>• Botão de login com estado morphing (Idle 56px → Loading spinner 32px → Success checkmark 700ms). |
| `/comecar` e `/configurar-minha-barbearia` | Wizard de onboarding tradicional em passos lineares com cartões planos. | Onboarding Dinâmico Figaroo (4 Steps Imersivos):<br>1. Local do Negócio: Hero card 28px com endereço e mapa integrado.<br>2. Serviços Principais: Chips de seleção rápida com tempo e preço em JetBrains Mono.<br>3. Equipe: Adição ágil de profissionais com avatars 40px.<br>4. Conclusão: Animação de sucesso com Confetti Gold (`#FFD700`) e CTA pílula 56px. |
| `/recuperar-senha` e `/redefinir-senha` | Telas estáticas com formulário de envio de e-mail. | Bottom Sheet de recuperação com contador de reenvio regressivo em JetBrains Mono e feedback tátil. |

---

MÓDULO 2: AGENDA OPERACIONAL (SUPERFÍCIE CENTRAL)

| Rota Cortaí | Como está hoje no Cortaí | Como deve ser no padrão Figaroo |
| :--- | :--- | :--- |
| `/barbeiro/agenda` (Timeline e Lista) | Grid contínuo com blocos azuis escuros, faixa fixa e rolagem vertical comum. | Timeline Dinâmica Figaroo:<br>• Zoom Dinâmico (Pinça): Escala de 1.0 a 4.0 dp/minuto.<br>• 5 Níveis de Cartão (`CardTier`): Adaptação do conteúdo (XS, SM, MD, LG, XL) com avatar de 40px, serviços e cliente legíveis conforme o tempo do serviço.<br>• Modo Armado (`ArmedCard`): Toque longo segura o cartão, expande a escala para 4.0 dp/min, escurece o restante da tela (`alpha = 0.4`), ativa linhas guias de 5 minutos e permite arrastar e redimensionar duração pela borda inferior.<br>• Indicador de Horário Atual: Linha vibrante com pílula flutuante que atualiza o horário exato a cada 30 segundos.<br>• Áreas Vazias / OffTime: Hachura diagonal sutil (`alpha = 0.06`) no horário fechado. |
| `/barbeiro/hoje` (Modo Foco / Cockpit) | Cockpit escuro com cartões estáticos de "Agora" e "Próximo". | Hero Cockpit Interativo Figaroo:<br>• Cartão "Agora" em destaque elevado (raio 28px, borda neon iluminada com a cor do status).<br>• Barra de progresso circular ou linear em tempo real indicando quanto tempo falta para o término do atendimento atual.<br>• Botões de ação rápida de 52px ("Finalizar Atendimento", "Cobrar", "Notificar Chegada"). |
| Folha de Agendamento (Novo / Detalhe) | Modais e gavetas com abas e formulários verticais normais. | `AppointmentDashboardSheet` Figaroo:<br>• Bottom Sheet deslizante com topo arredondado de 28px.<br>• Header com Hero Card do cliente (Avatar, telefone, atalho WhatsApp direto).<br>• Lista de serviços empilhados com tempo e valor discriminados.<br>• Barra dockada inferior com ações contextuais: Remarcar, Cancelar, Ir para Comanda. |

---

MÓDULO 3: FINANCEIRO, COMANDAS E CHECKOUT

| Rota Cortaí | Como está hoje no Cortaí | Como deve ser no padrão Figaroo |
| :--- | :--- | :--- |
| `/barbeiro/caixa` e Comanda Aberta | Tabelas ou listas com itens, botão de cobrança e modal de Pix/Dinheiro. | Checkout Tátil Guiado (4 Etapas):<br>1. Revisão de Itens: Cartões de 12px com serviços e produtos adicionais somados.<br>2. Desconto / Gorjeta: Chips táteis de acréscimo rápido (+R$5, +R$10, 10%).<br>3. Forma de Pagamento: Grid de pílulas grandes (Pix, Cartão de Crédito, Débito, Dinheiro, Fiado). Para Pix, QR Code grande e botão "Copiar Chave".<br>4. Resumo & Ticket: Visual de recibo digital de alta precisão com cantos serrilhados estilizados ou ticket limpo Figaroo. |
| `/barbeiro/financeiro` | Gráficos convencionais e tabelas de lançamentos diários/mensais. | Insights Financeiros Figaroo:<br>• TopBar com saldo acumulado em destaque (`Poppins 700`, números `JetBrains Mono`).<br>• Mini cards de métricas (Faturamento, Ticket Médio, Clientes Atendidos) com setas de tendência em verde (`#4CAF50`) ou vermelho.<br>• Lista de transações agrupadas por data com ícones de método de pagamento (24px) e badge de status. |
| `/barbeiro/comissoes` | Lista textual de percentuais e valores por profissional. | Cards individuais por membro da equipe mostrando barra de meta alcançada, valor bruto, taxa da casa e comissão líquida a pagar. |

---

MÓDULO 4: GESTÃO DO NEGÓCIO (CLIENTES, SERVIÇOS, EQUIPE)

| Rota Cortaí | Como está hoje no Cortaí | Como deve ser no padrão Figaroo |
| :--- | :--- | :--- |
| `/barbeiro/clientes` e `clientes.$id` | Listagem em tabela ou cards simples com busca textual básica. | CRM Boutique Figaroo:<br>• `ListRow` com Avatar circular de 40px, nome em Poppins 600, última visita e frequência em chips discretos.<br>• Busca instantânea com campo pill arredondado de 48px e filtro por tags.<br>• Ficha do Cliente (`ClientSheet`): Métricas de LTV (total gasto), média de retorno em dias, histórico de atendimentos e bloco de notas privadas da equipe. |
| `/barbeiro/servicos` | Lista com preço, duração e botão de editar abrindo modal comum. | Catálogo de Serviços em Categorias Coloridas:<br>• Chips de categoria no topo para filtragem rápida.<br>• Cards com cantos de 12px, badge lateral com a cor da categoria (paleta `ServiceCategoryColors`), duração e preço em JetBrains Mono.<br>• Editor em Bottom Sheet 28px: sliders de duração (passos de 5/15 min) e seletor tátil de comissão. |
| `/barbeiro/profissionais` e `/barbeiro/equipe` | Cards retos com foto e dados cadastrais. | Team Dashboard Figaroo:<br>• Cards com status em tempo real (Pílula verde: Disponível, Âmbar: Em Atendimento, Cinza: Folga).<br>• Configuração visual de escala semanal em matriz de horários.<br>• Seletor de serviços habilitados para cada profissional através de switches animados. |

---

MÓDULO 5: COMUNICAÇÃO, AUTOMAÇÃO & NOTIFICAÇÕES

| Rota Cortaí | Como está hoje no Cortaí | Como deve ser no padrão Figaroo |
| :--- | :--- | :--- |
| `/barbeiro/automacao` e `/barbeiro/cortai` | Formulários de configuração do WhatsApp e logs de IA simples. | Central de Comando da IA / Automação:<br>• Card Hero com status da conexão (Pílula animada "Conectado" ou "Aguardando QR Code").<br>• Seletor visual de canais de lembrete (WhatsApp, Push, SMS) via chips selecionáveis.<br>• Feed de atividade recente da CortAI em cards translúcidos mostrando agendamentos gerados automaticamente. |
| `/barbeiro/avaliacoes` | Lista de notas em formato textual. | Review Cards Figaroo:<br>• Média geral com estrelas douradas (`#FFD700`).<br>• Cards de avaliação com avatar do cliente, data em JetBrains Mono e feedback com botão de resposta rápida. |

---

MÓDULO 6: EXPERIÊNCIA PÚBLICA DO CLIENTE

| Rota Cortaí | Como está hoje no Cortaí | Como deve ser no padrão Figaroo |
| :--- | :--- | :--- |
| `/b/$slug` (Página Pública da Barbearia) | Página de apresentação com botões e visual genérico. | Página Boutique Figaroo:<br>• Hero imersivo com imagem de capa panorâmica e logo sobreposto em pill de vidro translúcido.<br>• Abas horizontais suaves: Serviços, Profissionais, Galeria, Sobre.<br>• Barra inferior flutuante fixa (Bottom Bar 80px) com o botão CTA principal: "Agendar Horário" (Pill 56px, gradiente Navy/Cyan). |
| `/agendar.$slug` e `/app/agendar` | Passos de agendamento em páginas separadas ou accordion vertical. | Fluxo de Agendamento em 4 Etapas Sem Fricção (`CreateAppointmentFlow`):<br>1. Escolha do Serviço: Lista com fotos, tempo e preço.<br>2. Escolha do Profissional: Carrossel horizontal de avatares com indicação de "Primeiro disponível".<br>3. Seleção de Data e Hora: Grade de horários em pills de 48px agrupadas em Manhã, Tarde e Noite (utilizando o algoritmo de slots livres `SlotPacker`).<br>4. Confirmação: Resumo do pedido com botão de confirmação e salvamento instantâneo. |

---

MÓDULO 7: SHELL, NAVEGAÇÃO GLOBAL E COMPONENTES GERAIS

| Componente Global | Como está hoje no Cortaí | Como deve ser no padrão Figaroo |
| :--- | :--- | :--- |
| Menu Lateral (Drawer) | Drawer padrão shadcn/ui ocupando quase toda a tela com lista de links. | `FigarooNavigationDrawer` (348px):<br>• Suporte a arrasto de borda (`EdgeSwipeToOpen`).<br>• Fundo escuro profundo (`#0A101D`) com scrim de 95% de opacidade.<br>• Header com perfil do negócio (Foto redonda 48px, nome e badge do plano).<br>• Itens de menu com ícone em caixa arredondada de 40px e label em `Poppins 600`. |
| Barra Superior (TopBar) | Header fixo comum com botões de ícone simples. | `FigarooAgendaTopBar`:<br>• Altura adaptável: 64px compacta, expandindo para 152px ao rolar para o topo.<br>• Título do dia/tela em tipografia nobre com transição de opacidade.<br>• Ações contextuais (Filtro de profissionais, Seletor de data e Sininho de notificações). |
| Botão de Ação Rápida (FAB) | FAB circular padrão ou botões espalhados pela tela. | `FigarooExtendedFAB`:<br>• Pílula expandida de 56px de altura com ícone (+) e texto ("Novo Agendamento").<br>• Encolhe suavemente para um círculo de 56px ao rolar para baixo.<br>• Efeito morphing para spinner circular durante operações de salvamento. |
