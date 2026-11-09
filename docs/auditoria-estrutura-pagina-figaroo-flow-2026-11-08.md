# Paridade estrutural da página Figaroo → Flow
**Auditoria focal de código — 08/11/2026**

## Referências verificáveis

- `docs/referencia-figaro/apk/4-pagina-publica.md`: especificação decompilada do
  `PageSettingsScreen`, `LayoutThemeScreen`, editores e visualização pública.
- `docs/referencia-figaro/apk/5-navegacao-e-transicoes.md`: `drawerPush`,
  `intraFlow` e `crossFlow`.
- `docs/referencia-figaro/apk/6-animacoes.md`: catálogo de animações.
- `docs/referencia-ux-figaroo-cortai.md`: resumo de APKs e gravações previamente inspecionados.
- Fontes Flow examinadas nesta etapa: `barbeiro.marca.index.tsx`,
  `barbeiro.marca.layout-tema.tsx`, `barbeiro.marca.layout-tema_.preview.tsx`,
  `barbeiro.marca.secao.$secao.tsx`, `SecaoConteudo.tsx`,
  `SecaoLayoutsETemas.tsx`, `CartoesDeLayoutTema.tsx`,
  `PaginaPublica.tsx`, `modelos/SiteCompleto.tsx`,
  `modelos/Raizes.tsx`, `PreviaDaExperiencia.tsx`.
- APK de referência mais recente: `Figaroo(20261107-202238).apk`,
  build 168, 21.362.399 bytes. Recursos multimídia foram inspecionados
  diretamente nesta auditoria, mas a `spec 4` da tela `PageSettingsScreen`
  ainda se baseia em decompilação anterior. Não tratar os vídeos de divulgação
  como prova de todas as rotas internas do editor.
- Vídeos de demonstração extraídos e conferidos do build 168:
  `res/raw/landing_peek_site.mp4`, `landing_peek_booking.mp4`
  e `landing_peek_reviews.mp4`. Não houve instalação nem execução do APK,
  nem navegação visual autenticada do Flow.

## Estrutura de referência da tela Personalizar Página

Ordem **comprovada na spec 4 §2**:

1. `FigarooCollapsingHeaderScaffold`: voltar, título e subtítulo;
   menu ⋮ com Editar Link, QR Code e tirar do ar quando aplicável.
2. Se houver rascunho: faixa com alterações não publicadas e prévia própria;
   ícone compacto da prévia ao rolar além da faixa.
3. Card Layout & Tema: capa 16:9, duas colunas (layout + tema),
   contagem das seções ativas, CTA em pílula.
4. Três grupos ordenados pelo catálogo: Seções obrigatórias, ativas e inativas;
   linha com ícone e chevron quando editável, **sem switch na lista**.
5. Se houver rascunho: rodapé para publicar e menu para descartar.

Ordem **comprovada na spec 4 §4** de Layout & Tema:

1. Título e rolagem com dois acordeões exclusivos, `LAYOUT` e `TEMA`;
   cabeçalho 68 dp e leading de 40 dp.
2. Carrosséis horizontais com snap, cartões de **286 dp**, seletor visual,
   informações e prévia de capa.
3. Barra inferior: **Ver Exemplo** em rota de tela cheia e
   **Salvar Alterações**; salvar volta com recarga.
4. Tela de exemplo com título `Layout · Tema` e voltar.

## Comparação no código da branch autorizada

| Área | Evidência no Figaroo | Estado observado no Flow | Próximo cuidado |
|---|---|---|---|
| Entrada pela gaveta | Card `Sua Página`, status e métricas quando disponíveis | `/barbeiro/sua-pagina` redireciona ao editor; drawer próprio | Verificar status/miniaturas no Android |
| Cabeçalho | Título recolhível e ações no ⋮ | `Screen` + menu ⋮ presentes | Confirmar movimento e posição visual |
| Aviso de rascunho | Banner com prévia em rota independente | `FaixaDeEstado` presente; prévia principal ainda usa `Sheet` | Não mexer no editor principal com reserva ativa |
| Card Layout & Tema | Capa 16:9, colunas, CTA de 48 dp | 16:9 e duas colunas; CTA atual 56 px | Ajustar medidas só após captura comparativa |
| Grupos de seções | Obrigatórias, ativas, inativas, sem switches | `SecaoConteudo` organiza os três grupos | Confirmar estados reais de ativação |
| Layout & Tema | Acordeões exclusivos, cards 286 dp, snap | `SecaoLayoutsETemas` e `CartoesDeLayoutTema` têm os padrões | Revisar microespaçamentos por captura |
| Ver Exemplo | Nova rota de exemplo em tela cheia, com voltar e seleção | **Corrigido neste lote:** botão usa rota já existente com `layout` e `tema` correntes; remove overlay local | Testar voltar e seleção na prévia |
| Barra da seleção | Ver Exemplo + Salvar Alterações | Flow mantém Ver Exemplo, Salvar Rascunho e Publicar | Não remover Publicar sem migrar sua função |
| Editores de seção | Uma tela por seção; ativar/ocultar e salvar | Rotas `marca/secao/$secao` e mecanismos correspondentes | Comparar formulário por seção e estados de erro |
| Site público | Capa, equipe, serviços, galeria, avaliações, localização e contato conforme layout | `PaginaPublica`, `SiteCompleto` e `Raizes` oferecem composições próprias | Conferir cada variante no celular; não presumir paridade pixel a pixel |
| Dados e temas | Catálogo dinâmico do servidor no Figaroo | Catálogo estático com layouts próprios no Flow | Não fingir integração com o servidor Figaroo ou inventar dados |

## Evidências visuais extraídas do build 168

- **Página pública / site** (`landing_peek_site.mp4`): herói com
  foto de fundo, nome do negócio no topo e menu à direita, chamada
  central com título/descrição/CTA, seta para avançar; variação de
  imagem/tema escuro e amarelo. Na continuação aparecem profissionais,
  seção de serviços com "Mais procurados", categorias recolhíveis
  e linhas de serviço com valor, duração e botão "Agendar".
  O vídeo também apresenta o início da galeria. No código do Flow,
  `SiteCompleto.tsx` já possui herói, menu, equipe, seção de serviços
  com categorias e galeria, e deve preservar essas peças antes
  de se ajustar espaçamento por captura.
- **Avaliações** (`landing_peek_reviews.mp4`): título, descrição,
  cartão de nota média, distribuição por estrelas e cartões com comentários,
  autor, nota e data. No `SiteCompleto.tsx` atual, a seção de
  Avaliações oferece apenas a nota média e a contagem.
  **Lacuna real de estrutura:** não desenhar barras ou comentários
  fictícios; antes conferir dados disponíveis, contratos e permissão.
- **Agendamento** (`landing_peek_booking.mp4`): grupos de serviço,
  calendário em faixa, horários, profissional e verificação do telefone
  antes de concluir. Esse fluxo não deve ser refeito dentro da página
  pública; deve continuar utilizando as ações oficiais de reserva.

As capturas evidenciam hierarquia, seções e relações visuais, mas
não estabelecem valores exatos de CSS, comportamento de todas as telas,
nem o resultado no navegador do Flow.

## Correção deste lote

Em `src/routes/barbeiro.marca.layout-tema.tsx`, o botão inferior que
abria `Prévia ao vivo` como uma sobreposição agora abre **Ver Exemplo**
pela rota que já existia:
`/barbeiro/marca/layout-tema/preview?layout=…&tema=…` (rota gerada pelo TanStack; arquivo com sufixo `_`).
Essa página reutiliza `PaginaPublicaConteudo`, `PreviaDireta` e
`ChatPreview` para apresentar o exemplo correspondente, com título
`Layout · Tema` e retorno à seleção sem gravar dados.

**Preservado:** salvar rascunho, publicar, ordem de seleção, permissões,
motor de agenda, dados e prévia ao vivo do editor principal. Nenhuma
tecnologia, layout, animação, regra ou catálogo adicional foi inventado.

## O que ainda não está provado

- Fidelidade visual a 360 e 390 px, temas claro/escuro e redução de
  movimento exige capturas do Figaroo build 168 e do Flow no mesmo estado.
- O editor principal usa uma `Sheet` para prévia; o Figaroo usa
  rota exclusiva. Essa diferença **não foi corrigida** pois
  `barbeiro.marca.index.tsx` está em reserva abrangente de outra tarefa.
- O footer da tela Layout & Tema continua diferente do APK porque
  o Flow também permite publicar. Não eliminar um comando real
  apenas por parecer diferente da referência.
- Nenhuma revisão completa das 84 rotas de páginas operacionais
  do Flow foi concluída nesta entrega. O foco foi a estrutura
  da experiência de **Página Pública e Personalizar Página**.
- Não foi possível testar navegação autenticada por toque na tela
  nesta interface; CI valida código, não aparência.

## Próximos lotes sem invenções

1. **Revisão visual por captura pareada** da tela Personalizar Página,
   Layout & Tema, seções e site publicado, a 360/390 px.
2. Concluir prévia do rascunho como tela própria **após liberação da reserva**,
   preservando a edição local ainda não salva.
3. Comparar editor Hero, Serviços, Equipe, Galeria, Redes, Avaliações e
   Localidade individualmente com os campos comprovados na spec §5.
4. Validar todos os layouts públicos com dados reais de teste, inclusive
   estados de vazio/erro, sem misturar identidade Flow e estilos do Figaroo.
5. Só classificar paridade como concluída após testes de interação, captura
   e conferência das decisões mais recentes do dono sobre a Agenda.
