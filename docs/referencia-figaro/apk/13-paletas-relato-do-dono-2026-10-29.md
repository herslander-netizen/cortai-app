# Spec 13 — Paletas de cores do Figaro (relato enviado pelo dono, 29/10/2026)

Levantamento colado pelo dono no chat, feito com outra ferramenta a partir do APK. Vai abaixo **como chegou**.
É **[relato]**: onde divergir das specs 1 e 2 (lidas no código descompilado) ou das capturas do dono, valem elas.

**Conferência feita pelo Claude em 29/10** (contra `1-design-system.md`, `2-agenda.md` e as capturas do dono):

- **Batem com o código e já estão no Cortaí** (tokens `--figaro-*` em `src/styles.css`): escalas Primary, Tertiary e
  Neutral; `actionBlue` #00509D/#9FBEF6, `AccentPrimary` #00509D/#4DA3FF, `onSurfaceHint` #7B7977/#969391, `cardTile`
  #FFFFFF/#3E4440 (usado em cards de lista, não nos cartões da Agenda); as 11 cores de categoria
  (`agenda/cartao-figaro.ts`); os pares das pílulas de status (success, warning, error, brand).
- **Divergem do código do APK — não aplicar:**
  - Linha "agora": o relato diz azul com ponto na coluna; o código (`CurrentMinuteFlowKt`, spec 2 §2.4) e a foto do
    dono mostram **brandMagenta #D3145D** com pílula "HH:mm" — é o que o Cortaí usa.
  - Fundo do cartão de agendamento: o relato diz `CardTile` #3E4440 no escuro; o código do cartão da timeline usa
    **surfaceContainerLowest** (#FFFFFF / #141816, spec 2 §4) — é o que o Cortaí usa.
  - Rótulos das horas: o relato diz onSurfaceVariant #827572; o código usa **onSurfaceHint** (spec 2 §2.2).
  - Linhas de 5 minutos: o relato diz α 33 %; o código usa onSurfaceHint α 0,5 × opacidade do zoom (spec 2 §2.2).
  - Fora do expediente e bloqueios: o relato troca os alfas; no código o fora do expediente é onSurface α 0,025 e o
    bloqueio (folga) α 0,06 (spec 2 §2.3 e §4.8).
  - Zona de preparo/limpeza: o relato diz barra α 0,07 e listras α 0,03; o código diz fundo α 0,03 e listras α 0,07.
- **Identidade:** as cores de marca do Figaro (navy/magenta) não substituem a marca do Cortaí (decisão de 27/10). Na
  Agenda valem os tokens de superfície, texto, estados e categorias acima.

---

Aqui está o levantamento minucioso e completo de todas as paletas de cores do Figaroo, extraídas diretamente da engenharia reversa do código-fonte do aplicativo (`ColorKt.java`, `ExtendedColors.java`, `ThemeKt.java`, `ServiceCategoryColorsKt.java` e componentes da Agenda).

---

1. Arquitetura Cromática do Figaroo

O Figaroo utiliza um sistema baseado em Material 3 Tonal Palettes (escalas de 0 a 100 de luminosidade) somado a um catálogo próprio de ExtendedColors (cores semânticas de negócio) e ServiceCategoryColors (as 11 cores que colorem os cartões da Agenda).

---

2. Paleta Fundamental (Escalas Tonais)

A. Tonalidade Primária (Navy Blue — Base da Marca e Ações)
Responsável pela identidade corporativa, cabeçalhos, barras de navegação e botões principais.

| Token | Hexadecimal | Papel / Onde é usado |
| :--- | :--- | :--- |
| Primary 10 | `#001A40` | Navy Profundo: Fundo do cabeçalho da Agenda (`AgendaTopBar`), telas de abertura e botões em modo escuro. |
| Primary 20 | `#002E66` | Superfícies ativas em modo escuro, containers de destaque escuros. |
| Primary 30 | `#00408F` | Fundo de botões primários com foco ou pressão. |
| Primary 40 | `#00509D` | Azul Ação Primário: Cor oficial de links, ícones ativos e botão principal no modo claro. |
| Primary 50 | `#2467BB` | Azul intermediário para badges e botões informativos. |
| Primary 60 | `#4881D6` | Destaque e bordas iluminadas. |
| Primary 70 | `#6B9CE9` | Elementos de apoio interativos. |
| Primary 80 | `#9FBEF6` | Azul Destaque Noturno: Cor primária de texto e ícones sobre fundos escuros. |
| Primary 90 | `#D5E2FF` | Fundo de pílulas informativas e seleção no modo claro. |
| Primary 95 | `#EBF0FF` | Superfície suave de seleção de linha. |
| Primary 100 | `#FFFFFF` | Branco puro para contraste absoluto. |

---

B. Tonalidade Terciária (Brand Magenta — Acento Vibrante)
Cor de assinatura secundária usada para selos especiais, status VIP, notificações urgentes e detalhes de brilho.

| Token | Hexadecimal | Papel / Onde é usado |
| :--- | :--- | :--- |
| Tertiary 10 | `#3E0017` | Fundo escuro profundo de banners promocionais. |
| Tertiary 20 | `#65052A` | Containers de acento no modo noturno. |
| Tertiary 30 | `#8E0E3F` | Bordas e estados pressionados de botões magenta. |
| Tertiary 40 | `#B61055` | Magenta institucional para textos e ícones em fundo claro. |
| Tertiary 50 | `#D3145D` | Magenta Vibrante oficial: Cor de destaque nos FABs e avisos. |
| Tertiary 60 | `#E64B7E` | Iluminação de borda e gradientes. |
| Tertiary 70 | `#F37AA0` | Textos de destaque suave em modo escuro. |
| Tertiary 80 | `#FFA6BF` | Elementos de contraste suave sobre fundo navy. |
| Tertiary 90 | `#FFDADE` | Fundo de pílula de status "Brand" / Destaque. |
| Tertiary 95 | `#FFECEF` | Superfície ultra-suave de cartões de fidelidade. |

---

C. Tonalidade Secundária (Vinho Terroso)
Utilizada para contraste sutil e estados de transição entre o navy e o magenta.

| Token | Hexadecimal | Papel |
| :--- | :--- | :--- |
| Secondary 10 a 40 | `#3A0E1A` a `#884F59` | Tons escuros para sombras cromáticas e fundos de diálogo. |
| Secondary 50 a 70 | `#A36770` a `#DA9AA4` | Bordas e divisores intermediários quentes. |
| Secondary 80 a 95 | `#F7B5BF` a `#FFECEF` | Superfícies quentes de agrupamento de clientes. |

---

D. Tons Neutros e Neutros Variantes (Estrutura, Superfícies e Vidros)

| Token | Hexadecimal | Papel / Onde é usado |
| :--- | :--- | :--- |
| Neutral 4 | `#141816` | Fundo de tela principal no modo escuro profundo. |
| Neutral 6 | `#1B1F1C` | Fundo da área de rolagem da Agenda no modo escuro. |
| Neutral 10 | `#2A2F2C` | Superfície elevada nível 1 (cartões da gaveta lateral). |
| Neutral 17 | `#3E4440` | CardTile Dark: O fundo padrão dos cartões de agendamento no modo escuro. |
| Neutral 22 | `#4E5550` | Fundo de modais e folhas inferiores (`BottomSheet`). |
| Neutral 50 | `#7B7977` | Texto secundário / dicas (`OnSurfaceHint`) no modo claro. |
| Neutral 60 | `#969391` | Texto secundário / dicas (`OnSurfaceHint`) no modo escuro. |
| Neutral 87 | `#D6E0D9` | Bordas sutis no modo claro. |
| Neutral 90 | `#DEE8E1` | Texto principal no modo escuro. |
| Neutral 94 | `#EAF2EC` | Fundo da tela principal da Agenda no modo claro. |
| Neutral 100 | `#FFFFFF` | CardTile Light: O fundo padrão dos cartões de agendamento no modo claro. |
| NeutralVariant 30 | `#4F4644` | Divisores e linhas de grade horária no modo escuro. |
| NeutralVariant 50 | `#827572` | Borda de inputs e caixas de seleção. |
| NeutralVariant 80 | `#D7C7C2` | Divisores e linhas de grade horária no modo claro. |

---

3. Cores de Negócio e Semântica (`ExtendedColors`)

Cores de ação rápida, alertas e estados do atendimento:

* Sucesso (Concluído / Pago):
  * `Success Tone 40`: `#2E7D32` (Texto e ícone no modo claro)
  * `Success Tone 50`: `#43A047` (Texto e ícone no modo escuro)
  * `Success Tone 90`: `#C8E6C9` (Fundo da pílula de status no modo claro)
  * `Success Tone 30`: `#1B5E20` (Fundo da pílula de status no modo escuro)
* Atenção (Pendente / Aguardando confirmação):
  * `Warning Tone 40`: `#B6730F` (Texto e ícone no modo claro)
  * `Warning Tone 50`: `#E08E22` (Texto e ícone no modo escuro)
  * `Warning Tone 90`: `#FFE0B2` (Fundo da pílula de status no modo claro)
  * `Warning Tone 30`: `#7A4A07` (Fundo da pílula de status no modo escuro)
* Erro / Cancelado:
  * `Error 40`: `#B3261E` (Texto e ícone no modo claro)
  * `DarkError`: `#F2B8B5` (Texto no modo escuro)
  * `Error 90`: `#F9DEDC` (Fundo de pílula e contêiner de erro)
* Acentos de Alto Contraste:
  * `AccentPrimary` (Claro: `#00509D` / Escuro: `#4DA3FF`)
  * `AccentSecondary` (Claro: `#D3145D` / Escuro: `#FF4D8D`)
  * `ConfettiGold`: `#FFD700` (Comemorações e agendamento concluído)
* Escala de Avaliação das Estrelas (1 a 5★):
  * 1★ (Péssimo): `#DD4425`
  * 2★ (Ruim): `#E2622E`
  * 3★ (Regular): `#FFDC00`
  * 4★ (Muito Bom): `#0D9B8A`
  * 5★ (Excelente): `#3E9B4F`

---

4. A Paleta Exclusiva da Agenda

Aqui está a especificação exata de como a Agenda do Figaroo é colorida:

A. As 11 Cores Oficiais das Categorias de Serviço (`ServiceCategoryColor`)
Cada serviço cadastrado pertence a uma categoria com sua própria cor. Essa cor pinta a faixa lateral do cartão (barra de 3.5dp) e seus elementos de intervalo:

| Categoria | Hexadecimal | Tom Visual | Aplicação Típica |
| :--- | :--- | :--- | :--- |
| Saphire Skies | `#1E88E5` | Azul Safira | Cor padrão do sistema (corte tradicional, barba básica). |
| Emerald Meadow | `#43A047` | Verde Esmeralda | Tratamentos capilares, hidratação, spa. |
| Crimson Flame | `#E53935` | Vermelho Carmesim | Serviços especiais, química pesada, coloração. |
| Lagoon Teal | `#00838F` | Azul Petróleo / Cerceta | Lavagem, terapia capilar, sobrancelhas. |
| Tangerine Twist | `#FB8C00` | Laranja Tangerina | Combos rápidos, acabamentos e pezinho. |
| Sunbeam Gold | `#FBC02D` | Dourado Solar | Serviços premium, pacote noivo, dia de beleza. |
| Rosy Glow | `#EC407A` | Rosa Vibrante | Estética facial, limpeza de pele, manicure. |
| Amethyst Bloom | `#B388FF` | Lavanda / Ametista | Descoloração, platinado, mechas. |
| Tropical Tides | `#26A69A` | Verde Água Tropical | Massagem, relaxamento, barboterapia. |
| Silver Slate | `#607D8B` | Cinza Ardósia Metálico | Serviços expressos ou manutenção. |
| Default | `#9E9E9E` | Cinza Neutro | Serviços sem categoria definida. |

---

B. Anatomia Cromática do Cartão de Agendamento (`AgendaServiceEventView`)
1. Fundo do Cartão (`CardTile`):
   * Modo Claro: `#FFFFFF` (branco limpo).
   * Modo Escuro: `#3E4440` (cinza-grafite orgânico com cantos arredondados de `8dp`).
2. Faixa Lateral de Categoria (Identity Bar):
   * Barra vertical à esquerda com 3.5dp de largura, pintada com o `ServiceCategoryColor` do serviço (ex.: Azul Safira `#1E88E5`).
3. Textos Internos:
   * Nome do cliente e serviço: Cor `onSurface` (`#2A2F2C` no claro / `#DEE8E1` no escuro).
   * Horário e ícone do relógio: Cor `onSurfaceHint` (`#7B7977` no claro / `#969391` no escuro).
4. Estados Visuais do Cartão:
   * Repouso (`Resting`): 100% de opacidade com sombra de elevação suave.
   * Armado (`Armed`): Ao segurar (toque longo), o cartão ganha destaque, as alças de redimensionamento (`ResizeGrip`) aparecem e a etiqueta de horário flutuante ganha fundo navy escuro `#001A40` com texto `#FFFFFF`.
   * Ofuscado (`Dimmed`): Quando você está arrastando um cartão, todos os outros cartões da timeline caem para 40% de opacidade (`alpha = 0.40f`), eliminando distrações visuais.
5. Zona de Intervalo / Buffer entre atendimentos (`AgendaBufferZone`):
   * Se o serviço tem tempo de intervalo (ex.: 10 min de limpeza da bancada), a área é preenchida com um padrão listrado da própria cor do serviço:
     * `BufferDashedAccentBar`: `alpha = 0.07f` (7% de opacidade da cor da categoria).
     * `BufferStripePattern`: `alpha = 0.03f` (3% de opacidade das listras).

---

C. Pílulas de Status do Agendamento (`FigarooStatusPill`)
Os status do atendimento (Confirmado, Pendente, Em atendimento, Cancelado) usam pares de fundo e texto pré-calculados:

| Status / Tom | Fundo da Pílula (Container) | Texto e Ícone | Significado na Agenda |
| :--- | :--- | :--- | :--- |
| Success | `#C8E6C9` (Verde claro) | `#2E7D32` (Verde escuro) | Atendimento finalizado / Comanda paga. |
| Warning | `#FFE0B2` (Laranja claro) | `#B6730F` (Laranja escuro) | Pendente / Cliente aguardando confirmação. |
| Error | `#F9DEDC` (Rosa claro) | `#B3261E` (Vermelho) | Agendamento cancelado ou falta do cliente. |
| Info | `#D5E2FF` (Azul claro) | `#2467BB` (Azul escuro) | Agendamento confirmado e no horário. |
| Brand | `#FFDADE` (Magenta suave) | `#B61055` (Magenta forte) | Atendimento VIP ou combo especial. |
| Neutral | `#CDCAC7` (Cinza claro) | `#2A2F2C` (Grafite) | Rascunho / Bloqueio interno de agenda. |

---

D. Grade e Linhas da Linha do Tempo (`FigarooDayTimeline`)
1. Coluna de Horários (`DayTimelineGutter`):
   * Largura fixa de `50dp`.
   * Fundo contínuo com os horários (08:00, 09:00...) renderizados em `onSurfaceVariant` (`#827572`).
2. Linha da Hora Cheia (`HourGridLayer`):
   * Linha horizontal sólida desenhada com `dividerColor` e opacidade reduzida de 50% (`HourGridLineAlpha = 0.5f`).
3. Linhas de 5 Minutos (Modo Zoom / Armado):
   * Linhas pontilhadas discretas (4dp traço / 2dp espaço) com espessura de 0.66px e opacidade suave de 33%, que só surgem quando o zoom ultrapassa 2.5 dp/min.
4. Linha do Minuto Atual ("Agora" / `NowIndicator`):
   * Linha horizontal sólida de alta visibilidade em Azul Primário (`#00509D` no claro / `#4DA3FF` no escuro), com um ponto circular marcador posicionado exatamente na coluna lateral de horários.
5. Horário Fora de Expediente (`OffTime`):
   * Hachura diagonal sutil com opacidade de 6% (`alpha = 0.06f`) sobre o fundo neutro, indicando visualmente que o estabelecimento está fechado.
6. Bloqueios de Indisponibilidade (`Unavailable`):
   * Hachura com opacidade ultra-leve de 2.5% (`alpha = 0.025f`) para horários em que o profissional não atende.