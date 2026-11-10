# FLOW — Padronização sistêmica de UX/UI com referência no Figaroo

**Data:** 10/11/2026  
**Estado:** etapa inicial de engenharia — NÃO é auditoria visual completa nem implementação das 112 telas.  
**Escopo:** produto FLOW, mobile-first, áreas de gestão, agendamento, cliente e páginas públicas.  
**Fonte do código:** branch `main` do repositório e regras `AGENTS.md` / `docs/contrato-de-design.md`.  
**Fontes de referência:** `Figaroo(20261107-202238).apk`, vídeos `1000946588.mp4`, `1000946596.mp4`, `1000946630.mp4`, `1000946631.mp4`, `docs/referencia-ux-figaroo-cortai.md` e referências já fornecidas. O APK está disponível para análise estática; não foi executado em emulador Android nesta etapa. Os vídeos curtos registram principalmente comportamentos da Agenda e não cobrem o aplicativo completo.

## Diagnóstico inicial verificável

1. O Flow tem 82 arquivos `.tsx` em `src/routes`, mas isso **não significa** 82 telas independentes ou 82 fluxos validados: algumas rotas são layouts, aliases, redirecionamentos e loaders.
2. O Figaroo foi descrito em material anterior como tendo cerca de 112 telas e 24 módulos. A lista foi extraída de estrutura de classes e inferências: NÃO comprova telas acessíveis, regras de negócio ou navegação completa. A paridade deve ser validada em execução e por gravações.
3. Tokens de movimento estão em `src/lib/motion.ts` (120/200/280 ms), espelhados em `src/styles.css`. Transição de páginas usava `transicaoBase` mesmo sob preferência de reduzir movimento; agora usa `transicaoReduzida` quando apropriado.
4. `src/styles.css` inclui regras gerais e exceções de tema, agenda, chats e showroom. Há 6.400 linhas; é necessário auditar precedência e isolamento antes de qualquer reescrita global.
5. A Timeline já possui tratamento de rolagem nativa até 600 px, mas o breakpoint móvel do sistema é 767 px. Corrigimos esse limite em `src/styles.css`, sem mexer em disponibilidade, cartões ou estados da agenda.
6. O contrato de design manda compartilhar `Screen`, `Button`, `Sheet`, `Dialog`, campos, avisos e estados. Novas telas não podem criar overlays, botões, cores e movimentos paralelos.

## Matriz de cobertura — pontos de entrada do Flow (evidência de código, NÃO validação funcional)

| Domínio | Entrada ou componente existente | O que falta verificar visual/funcionalmente |
| --- | --- | --- |
| Login, conta e onboarding | `login`, `comecar`, `escolher` | Estados, recuperação, progressão, retorno, teclado e identidade Flow |
| Agenda diária | `barbeiro.agenda`, `AgendaOperacional`, `AgendaTimeline` | Cabeçalho, semana, Linha Agora, gesto horizontal, rolagem, tempo de troca |
| Lista, cartões, Modo Foco | `ListaAgenda`, `AgendaFocoMobile` | Transição Lista/Timeline, ações, estados, seleção, conteúdo e foco |
| Edição de agendamento | `AgendamentoManual`, `CabecalhoDeEdicao` | Somente uma gaveta/cabeçalho; arrasto só após pressão contínua; duração só pela borda |
| Agendamento do cliente | `agendar.$slug`, `app.agendar` | Serviço → profissional → data → horário → resumo, retorno sem perder dados |
| Fila e espera | `barbeiro.fila`, `app.espera` | Ações, ordem, avisos, rolagem e permissões |
| Serviços e catálogo | `barbeiro.servicos`, editor de serviços | Categoria, duração, valores e separação de combos/pacotes |
| Equipe e horários | `barbeiro.equipe`, `barbeiro.profissionais`, `barbeiro.horarios` | Negócio com 1 profissional, escalas, exceções por data |
| Clientes e histórico | `barbeiro.clientes.*`, `app.historico` | Ficha, privacidade, estados vazios, transição para agendamento |
| Financeiro, caixa e comanda | `barbeiro.financeiro`, `barbeiro.caixa` | Fluxo integral até pagamento, estados de erro, sem falsa confirmação |
| Produtos, fidelidade | `barbeiro.produtos`, `barbeiro.fidelidade`, `app.carteira` | Se pacotes, créditos e combos têm telas próprias ou faltantes |
| Marca e temas | `barbeiro.marca`, `barbeiro.temas` | Editor, rascunho, prévia e publicação, claro/escuro |
| Páginas públicas | `b.$slug`, `f.$slug`, `$slug` | Clássica/Site/Chat por segmento, navegação, carregamento e personalização |
| Automação e notificações | `barbeiro.automacao`, `barbeiro.cortai` | IA, confirmações, estados, saídas e feedbacks |
| Avaliações, indicadores | `barbeiro.avaliacoes`, `barbeiro.crescimento` | Terminologia, filtros, fonte dos números e estados |
| Administração e planos | `admin.*`, `barbeiro.plano`, `barbeiro.configurar` | Coerência visual, separação de permissões, responsividade |
| Recursos sem comprovação de equivalência | combos avançados, pacotes, multiunidade e campanhas do Figaroo | Identificar lacuna por fluxo real antes de criar rotas e tabelas |

## Contrato único de experiência

**Identidade:** manter nome/logotipo Flow e tokens de marca aprovados; os valores legados de identidade ainda presentes em `src/styles.css` precisam ser reconciliados com a decisão visual Flow por um PR separado, acompanhado de testes de contraste. Não trocar paleta global às cegas: `--gold` é nome legado do acento azul e as páginas públicas admitem personalização por negócio.

**Primitivos únicos:** `Screen`, `CabecalhoDeTela`, `Button`, `Sheet`, `Dialog`, `AlertDialog`, formulários comuns, estado vazio, erro, esqueleto e avisos. Uma alteração nesses componentes só entra após verificar todas as áreas consumidoras.

**Tamanhos:** validar 360, 390 e 430 px (celulares), 768 px (limite tablet) e 1280 px (desktop). Alvos de toque >=48 px, zoom de texto, contraste suficiente, foco visível, áreas seguras e teclado virtual.

**Hierarquia:** uma ação principal, um título primário por superfície e somente uma gaveta/modal ativo por tarefa. Ao entrar na edição, substituir conteúdo do cabeçalho, não empilhar outro cabeçalho por cima. Preservar o histórico e o retorno.

**Movimento:** usar `motion.ts`, transições 120/200/280 ms, sem quique, evitando animar altura/layout pesado. Respeitar `prefers-reduced-motion`; não segurar a navegação à espera de animação. Carregamento progressivo, manter dados já exibidos enquanto atualiza.

**Gestos:** rolagem vertical nativa; deslizar horizontal para mudar dia só quando gesto horizontal confirmado; cartão só muda de posição com toque longo continuamente ativo; redimensionar somente pela alça/borda; nunca deixar arrasto pendente após o toque terminar.

**Domínio e segurança:** Agenda, disponibilidade, RLS, cobranças, planos, contexto do negócio, tenant e dados de cliente permanecem nas fontes de verdade existentes. Nenhuma nova tela autoriza motores paralelos ou SQL destrutivo.

## Critério de aceite por fluxo (obrigatório antes de dizer "igual ao Figaroo")

1. Registrar fonte de referência: versão/tela/fluxo, vídeo ou captura com timestamp.
2. Capturar a tela equivalente do Flow na mesma resolução e estado; comparar navegação, layout e movimento lado a lado.
3. Conferir happy path, erro, loading, vazio, sem rede, sem permissão, teclado aberto e volta.
4. Testar toque, swipe, toque longo, arrasto pela borda, redução de movimento e leitor de tela.
5. Executar TypeScript, Vitest, ESLint e build. Fazer teste visual autenticado de 360/390/430/768/1280.
6. Verificar consistência com todas as áreas que compartilham os mesmos primitivos e tokens.
7. Revisão em PR separado; **sem merge ou publicação automática**.

## Etapas e status

- [x] Recuperar APK e quatro clipes de referência que estavam na Biblioteca.
- [x] Ler o contrato e a árvore do código; identificar os pontos de entrada por domínio.
- [x] Corrigir breakpoint da rolagem nativa da Timeline (601–767 px).
- [x] Usar transição reduzida em troca de página.
- [x] Adicionar teste estático de regressão para tokens de duração e a regra de rolagem.
- [ ] Executar Figaroo em Android, percorrer TODAS as telas acessíveis e registrar os fluxos; não inferir pela lista de classes.
- [ ] Capturar todas as telas do Flow autenticado nos mesmos estados para comparação.
- [ ] Verificar e fechar as sobreposições de gaveta/cabeçalho e a captura de gestos na Agenda.
- [ ] Consolidar identidade Flow e tokens com auditoria de contraste e escopos de personalização.
- [ ] Padronizar telas de cliente, catálogo, equipe, financeiro, automação, marca, plano e administração; criar somente as lacunas comprovadas.
- [ ] Passar QA visual e funcional do produto inteiro, corrigir regressões e entregar relatório de cobertura.

**Limite desta etapa:** alterações em CSS e transição são de baixo escopo e ainda necessitam CI e teste no dispositivo. O material disponível não autoriza afirmar que as telas do Figaroo foram percorridas integralmente nem que todas as telas do Flow foram padronizadas.
