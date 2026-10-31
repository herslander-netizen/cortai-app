# ORDEM PERMANENTE — toda página do Flow nasce no padrão Figaro

**Origem:** decisão do dono em 24/10/2026 ("manter o padrão Figaro sempre, em tudo"). Vale para **todas as
IAs** (Claude, GPT e Muse), para telas novas, telas refeitas e qualquer ajuste em tela existente. Não há
exceção por pressa, por "só um detalhe" nem por "já era assim".

Referência visual e de comportamento: `docs/referencia-figaro/apk/` (começar por `1-design-system.md`).
Contrato de design do projeto: `docs/contrato-de-design.md`. Esta ordem diz **como** cumprir os dois.

## 1. Identidade do Flow (logo trocado em 29/10/2026; paleta e fontes de 27/10 continuam)

- Marca: lettering "flow" em minúsculas com o F fluido e o ponto rosa (Manual da Marca Flow v1.0). Usar só `MarcaFlow` / `SimboloFlow` / `IconeFlow`; sem símbolos exclusivos de um segmento. Detalhes em `docs/marca-flow.md`.
- Quando o dono disser “Flow” de forma geral, a identidade aplica-se a todo o produto. Cada tela usa a mesma paleta-base, superfícies e movimento; não crie um tema paralelo para uma área.
- O Figaro dita composição, hierarquia, raios, folhas e movimento; o Flow mantém sua própria marca (só o logo mudou: cores e fontes continuam as de antes, decisão do dono de 29/10). Azul é ação operacional conforme a referência; coral é acento de marca, não fundo dominante.
- Personalizações escolhidas para páginas públicas dos negócios continuam valendo.

## 2. A regra

1. **Use os primitivos. Não invente estilo.** Cada necessidade de interface tem um componente único (tabela
   abaixo). Se o componente não existe, **crie-o em `src/components/ui` seguindo o spec do Figaro** e use-o
   em todo lugar; não escreva `className` ad hoc numa tela.
2. **Uma tela, uma superfície.** Cartões em grupo, folhas de baixo para escolhas e confirmações, botão
   principal em pílula embaixo. Sem modais centrais para formulário.
3. **Cores só por token** (`--figaro-*`, `--agenda-cartao`, `--paper`, `--mute`, `--gold`…). Nada de hex solto,
   nada de cinza improvisado. Claro e escuro têm que funcionar (contraste mínimo 4,5:1 no texto).
4. **Movimento só com as molas e tempos oficiais** (`src/lib/motion.ts` e `src/lib/movimento-figaro.ts`),
   `transform` e `opacity`, respeitando `prefers-reduced-motion`.
5. **Mobile é o alvo principal e vem primeiro**: desenhar, implementar e validar inicialmente em 390 px e conferir 360 px; só depois adaptar para desktop. Nenhuma decisão de layout ou animação é aprovada apenas pela aparência em tela grande. Alvos de toque de 48 dp quando aplicável, sem rolagem horizontal, sobreposição de conteúdo, gestos conflitantes ou zoom acidental fora das superfícies previstas. Conferir claro/escuro e `prefers-reduced-motion` no fluxo móvel.
6. **Textos neutros de segmento** no código (`termos(segmento)` só na tela) e em português do Brasil.
7. **Nada de herança visual de site nas telas internas.** Screen usa cabeçalho de aplicativo: ação redonda na barra superior e título/subtítulo em uma hierarquia própria abaixo; não adiciona divisor horizontal nem assinatura institucional por padrão. Listas, estados vazios e ações devem usar os primitivos Figaro, não linhas/rodapés antigos. Esta regra vale para todas as telas internas; a Agenda permanece protegida sem pedido específico e as páginas públicas mantêm os temas personalizados já escolhidos.

## 3. O que usar em cada caso

| Preciso de… | Use | Figaro |
|---|---|---|
| Moldura de tela (título, voltar, conteúdo) | `Screen` (`components/layout/Screen.tsx`) | top bar com botão redondo de 44 dp |
| Formulário em passos | `TelaDeFormulario` (`ui/formulario`) | `FigarooCreationFlowScaffold` |
| Lista de linhas / configurações | `GrupoDeLinhas` + `LinhaDeConfiguracao` / `LinhaDeOpcoes` / `LinhaComInterruptor` | list group: 28 dp nas pontas, 4 dp entre linhas |
| Cartão | `surface`, `surface-card` ou `Card` | `card` 12 dp, `cardHero` 28 dp, sem contorno |
| Botão | `Button` (`variant` `default`, `outline`, `text`, `destructive`; `size` `sm`, `lg`, `bloco`) | pílula, 40/48/56 dp |
| Botão de salvar/confirmar | `Button` com `loading` e `success` (✓ + rótulo por 700 ms) via `acao.concluiu(chave)` (`useAcao`) ou `useSucessoDoBotao`; nunca trocar o rótulo por "Salvando…" | `FigarooPrimaryButton` (Idle → Loading → Success) |
| Cartão clicável feito com botão | `Button` com `size="bloco"` | altura do conteúdo, nunca `h-12` |
| Escolha entre 2–4 opções | `OpcoesConectadas` (`ui/opcoes-conectadas.tsx`) | `ConnectedButtonGroup` |
| Escolha em lista de muitas opções | `Chip` (`ui/chip.tsx`) ou `LinhaDeOpcoes` (folha) | `FilterChip` 36 dp, raio 8 dp |
| Campo de texto, data, hora, select | classe `field-control` (`Input`, `Textarea`) | `TextField` preenchido, 8 dp no topo |
| Caixa de seleção | `<input type="checkbox">` ou `Checkbox` | `SquareCheckbox` 18 dp, raio 5 dp |
| Interruptor | `Switch` | `FigarooSwitch` |
| **Folha de baixo (gaveta) — modelo obrigatório** | `FolhaPadrao` + `SecaoDaFolha`, `CartaoDaFolha`, `LinhaDaFolha`, `NotaDaFolha`, `AcaoDaFolha` (`ui/folha-padrao.tsx`). Desenho da ficha do atendimento: fundo da tela, conteúdo em cartões, título no primeiro cartão, uma pílula principal no rodapé, sem "Cancelar". Ver §3.1 | `ModalBottomSheet` 28 dp só no topo |
| Confirmação | `useConfirmar` / `AlertDialog` | diálogo de 28 dp |
| Ação principal flutuante ("Salvar alterações") | `BotaoFlutuante` (`ui/botao-flutuante.tsx`) | `ExtendedFloatingActionButton` |
| Escolher um horário (nunca `<input type="time">`: o relógio do Android sai cortado) | `SeletorDeHorario` (`ui/seletor-de-horario.tsx`) | `TimePickerDialog` do Material 3 |
| Selo de estado / contagem | `Badge` | pílula |
| Carregando | `Esqueleto*` (`layout/Esqueleto.tsx`) | esqueleto com o desenho da tela |
| Aviso rápido (some sozinho) | `aviso` (`lib/avisos`) | snackbar |
| Aviso ou erro dentro da tela | `Aviso` (`ui/aviso.tsx`, `tom` `info`, `atencao`, `sucesso`, `acao`) | banner tonal de 20 dp, sem faixa lateral |

### 3.1 Modelo de gaveta (dono, 31/10/2026)

O dono escolheu a **ficha do atendimento na Agenda** como o modelo de toda gaveta nova ("cartão 1"). Toda gaveta
criada a partir de agora usa `ui/folha-padrao.tsx`; as antigas passam para ele quando forem mexidas.

- **Fundo e forma:** a gaveta tem a cor da tela (não branca), cantos de 28 só no topo, alça e arrastar para fechar.
- **Conteúdo em cartões:** `CartaoDaFolha` (branco no claro, um degrau acima do fundo no escuro, cantos de 20).
  O **primeiro cartão** traz o título (20 px, negrito), a descrição e o resumo (ex.: horário em fonte de horário).
- **Grupos:** `SecaoDaFolha` com rótulo curto acima de cada cartão ("Horário", "Serviços").
- **Linhas:** `LinhaDaFolha` (rótulo à esquerda, valor e seta à direita) para o que se toca e escolhe.
- **Avisos:** `NotaDaFolha` (ícone + texto de 13 px); `tom="erro"` para o que impede salvar.
- **Ações:** no rodapé, **uma** pílula principal à direita (`AcaoDaFolha`) e no máximo uma secundária em texto.
  Sem "Cancelar": a gaveta fecha pela alça ou tocando fora.
- **Uma função, um controle.** Nada de repetir o mesmo ajuste em botões diferentes (ex.: relógio + −15/+15 +
  "aumentar duração" para o mesmo horário). Valores derivados (duração) aparecem como informação.
- Primeiro exemplo: `AjustarIntervaloSheet` (Agenda).

## 4. Proibido (o teste de guarda falha)

- Seletor em pílula feito à mão (`rounded-full border` com `aria-pressed`) ou componente `Chip` local.
- `className` de botão com caixa própria (`rounded-md border border-line`) em vez de `variant`.
- Cartão feito com `rounded-* border border-line bg-ink*` em vez de `surface`/`Card`.
- `<select>` ou `<input>` sem `field-control`.
- Mensagem de erro/aviso com faixa lateral (`border-l-2 border-brick`) em vez de `Aviso`.
- Link "Voltar" em texto: o voltar é o botão redondo do `Screen`.
- Botão com altura fixa (`h-12`) usado como cartão de conteúdo.
- Cor em hex, sombra ou raio inventados; animação com mola ou duração fora de `motion.ts`.

## 5. Como cumprir (fluxo obrigatório de qualquer tela)

1. Abra o spec do Figaro da tela equivalente (`apk/2` a `apk/11`). Sem equivalente, componha com os primitivos
   da tabela; nunca com CSS novo.
2. Construa a tela só com primitivos. Precisou de algo novo? Crie o primitivo, com teste, e registre na tabela
   acima.
3. Confira **no navegador a 390 px**, claro e escuro, estados vazio, carregando e erro. Capturas anexadas ao
   `DIARIO.md` quando a mudança for visual.
4. Rode `bun run tsc --noEmit`, `bun run vitest run` e `bun run build`. O teste `src/lib/estilo-figaro.test.ts`
   precisa continuar verde; ele não pode ser enfraquecido para passar.
5. Registre no topo do `DIARIO.md` (o que mudou, arquivos, validação) e avise os outros por recado se mexeu
   num primitivo.

## 6. Quando a regra conflitar com um pedido

Se um pedido do dono contradisser o Figaro, **aponte o conflito antes de agir** (regra do `AGENTS.md`). Sem
decisão registrada em "Decisões do dono", vale o Figaro. Telas públicas de agendamento do cliente final usam o
tema escolhido pelo negócio em Personalizar Página, mas montadas com os mesmos primitivos de forma, tamanho,
raio e movimento.

## 7. Estado da unificação (24/10/2026)

**Feito e conferido em captura (390 px):** Chip único, cartões sem contorno, diálogos de 28 dp, selos em pílula,
`Aviso` em banner tonal, campos e selects, caixas de seleção quadradas, controle segmentado conectado, botão de
voltar redondo, Layout & Tema, plano, as 36 telas da área do negócio (claro) e 12 delas no escuro, as telas
principais do app do cliente (Início, Lista de espera, Perfil, Agendar) e 8 telas do admin. Teste de guarda
ativo (`src/lib/estilo-figaro.test.ts`).

**Ainda não conferido em captura (conferir e corrigir quando mexer):** página pública de agendamento do cliente
final no endereço real (a prévia "Ver Exemplo" usa os mesmos componentes e foi conferida), telas de acesso
(login em fluxo animado do Figaro; recuperar e redefinir senha em fundo claro próprio), demais telas do admin,
escuro nas telas restantes e a passada final no celular real do dono.

Novos itens e exceções decididas pelo dono entram aqui.
