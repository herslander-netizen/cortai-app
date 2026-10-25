# ORDEM PERMANENTE — toda página do Cortaí nasce no padrão Figaro

**Origem:** decisão do dono em 24/10/2026 ("manter o padrão Figaro sempre, em tudo"). Vale para **todas as
IAs** (Claude, GPT e Muse), para telas novas, telas refeitas e qualquer ajuste em tela existente. Não há
exceção por pressa, por "só um detalhe" nem por "já era assim".

Referência visual e de comportamento: `docs/referencia-figaro/apk/` (começar por `1-design-system.md`).
Contrato de design do projeto: `docs/contrato-de-design.md`. Esta ordem diz **como** cumprir os dois.

## 1. A regra

1. **Use os primitivos. Não invente estilo.** Cada necessidade de interface tem um componente único (tabela
   abaixo). Se o componente não existe, **crie-o em `src/components/ui` seguindo o spec do Figaro** e use-o
   em todo lugar; não escreva `className` ad hoc numa tela.
2. **Uma tela, uma superfície.** Cartões em grupo, folhas de baixo para escolhas e confirmações, botão
   principal em pílula embaixo. Sem modais centrais para formulário.
3. **Cores só por token** (`--figaro-*`, `--agenda-cartao`, `--paper`, `--mute`, `--gold`…). Nada de hex solto,
   nada de cinza improvisado. Claro e escuro têm que funcionar (contraste mínimo 4,5:1 no texto).
4. **Movimento só com as molas e tempos oficiais** (`src/lib/motion.ts` e `src/lib/movimento-figaro.ts`),
   `transform` e `opacity`, respeitando `prefers-reduced-motion`.
5. **Mobile primeiro, 390 px de referência**, área de toque de 48 dp, nada de rolagem horizontal da página.
6. **Textos neutros de segmento** no código (`termos(segmento)` só na tela) e em português do Brasil.

## 2. O que usar em cada caso

| Preciso de… | Use | Figaro |
|---|---|---|
| Moldura de tela (título, voltar, conteúdo) | `Screen` (`components/layout/Screen.tsx`) | top bar com botão redondo de 44 dp |
| Formulário em passos | `TelaDeFormulario` (`ui/formulario`) | `FigarooCreationFlowScaffold` |
| Lista de linhas / configurações | `GrupoDeLinhas` + `LinhaDeConfiguracao` / `LinhaDeOpcoes` / `LinhaComInterruptor` | list group: 28 dp nas pontas, 4 dp entre linhas |
| Cartão | `surface`, `surface-card` ou `Card` | `card` 12 dp, `cardHero` 28 dp, sem contorno |
| Botão | `Button` (`variant` `default`, `outline`, `text`, `destructive`; `size` `sm`, `lg`, `bloco`) | pílula, 40/48/56 dp |
| Cartão clicável feito com botão | `Button` com `size="bloco"` | altura do conteúdo, nunca `h-12` |
| Escolha entre 2–4 opções | `OpcoesConectadas` (`ui/opcoes-conectadas.tsx`) | `ConnectedButtonGroup` |
| Escolha em lista de muitas opções | `Chip` (`ui/chip.tsx`) ou `LinhaDeOpcoes` (folha) | `FilterChip` 36 dp, raio 8 dp |
| Campo de texto, data, hora, select | classe `field-control` (`Input`, `Textarea`) | `TextField` preenchido, 8 dp no topo |
| Caixa de seleção | `<input type="checkbox">` ou `Checkbox` | `SquareCheckbox` 18 dp, raio 5 dp |
| Interruptor | `Switch` | `FigarooSwitch` |
| Folha de baixo | `Sheet` (`side="bottom"`) com alça | `ModalBottomSheet` 28 dp só no topo |
| Confirmação | `useConfirmar` / `AlertDialog` | diálogo de 28 dp |
| Ação principal flutuante ("Salvar alterações") | `BotaoFlutuante` (`ui/botao-flutuante.tsx`) | `ExtendedFloatingActionButton` |
| Selo de estado / contagem | `Badge` | pílula |
| Carregando | `Esqueleto*` (`layout/Esqueleto.tsx`) | esqueleto com o desenho da tela |
| Aviso rápido (some sozinho) | `aviso` (`lib/avisos`) | snackbar |
| Aviso ou erro dentro da tela | `Aviso` (`ui/aviso.tsx`, `tom` `info`, `atencao`, `sucesso`, `acao`) | banner tonal de 20 dp, sem faixa lateral |

## 3. Proibido (o teste de guarda falha)

- Seletor em pílula feito à mão (`rounded-full border` com `aria-pressed`) ou componente `Chip` local.
- `className` de botão com caixa própria (`rounded-md border border-line`) em vez de `variant`.
- Cartão feito com `rounded-* border border-line bg-ink*` em vez de `surface`/`Card`.
- `<select>` ou `<input>` sem `field-control`.
- Mensagem de erro/aviso com faixa lateral (`border-l-2 border-brick`) em vez de `Aviso`.
- Link "Voltar" em texto: o voltar é o botão redondo do `Screen`.
- Botão com altura fixa (`h-12`) usado como cartão de conteúdo.
- Cor em hex, sombra ou raio inventados; animação com mola ou duração fora de `motion.ts`.

## 4. Como cumprir (fluxo obrigatório de qualquer tela)

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

## 5. Quando a regra conflitar com um pedido

Se um pedido do dono contradisser o Figaro, **aponte o conflito antes de agir** (regra do `AGENTS.md`). Sem
decisão registrada em "Decisões do dono", vale o Figaro. Telas públicas de agendamento do cliente final usam o
tema escolhido pelo negócio em Personalizar Página, mas montadas com os mesmos primitivos de forma, tamanho,
raio e movimento.

## 6. Estado da unificação (24/10/2026)

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
