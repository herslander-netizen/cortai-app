# Referência de UX: Figaroo → Flow

**Status:** referência oficial de recuperação, atualizada em 18/10/2026 após o dono reencontrar e enviar `Figaroo.apk`.  
**Escopo:** recuperar a experiência Figaro dentro do Flow: layout, cards, fluxos, agenda, transições e animações verificáveis; substituir a marca antiga pela marca Flow e integrar as funções novas.  
**Segurança da mudança:** esta documentação foi criada em uma branch separada. Nenhum código de produção ou banco foi alterado.

## Resumo executivo

O Figaroo é a base visual e comportamental de referência, não apenas inspiração. O APK confirma uma aplicação Android nativa em Compose com módulos completos de agenda, clientes, serviços, combos, equipe, locais, fidelidade/pacotes, checkout/comandas, vendas, histórico, indicadores, marketing, avaliações, notificações, configurações e editor da página pública. O Flow mantém sua arquitetura web, backend, permissões e regras atuais; a recuperação é feita adaptando componentes e fluxos existentes, área por área, sem substituir o produto por uma réplica isolada.

A experiência observável usa superfícies claras e neutras, títulos pesados, cartões e folhas arredondadas, ações principais evidentes, formulários em etapas e áreas de ação persistentes quando necessário. A marca/logomarca deve ser a atual do Flow. Não introduzir uma nova direção visual nem misturar camadas visuais posteriores sem evidência de que pertencem ao Figaro.

## O que foi observado na gravação

Os tempos são aproximados e servem para localizar as partes do vídeo.

| Tempo aproximado | Área / fluxo observado | Aprendizado de UX |
|---|---|---|
| 00:05–01:05 | Apresentação inicial, resumo de negócio, notificações e prévias de agenda/serviços | Explicar o valor do produto rapidamente; apresentar indicadores sem transformar a tela em um painel carregado. |
| 01:20–02:05 | Entrada, autenticação e criação de conta | Formulários diretos, etapas legíveis e ação principal evidente. |
| 02:35–03:10 | Agenda em diferentes recortes de calendário | Seleção de dia e navegação temporal devem manter o contexto visual; a grade precisa permanecer legível no celular. |
| 03:35–04:10 | Página do negócio, indicadores e itens de administração | Separar visão geral do negócio de configurações profundas. |
| 04:05–04:55 | Dados da conta e seleção de layout/tema | Exibir opções como cartões e oferecer um caminho claro para pré-visualizar antes de salvar. |
| 04:35–05:30 | Prévia de site e temas Classic / Rock'n'Roll / Retrô | Tema muda a apresentação do site público; o editor deve preservar consistência e permitir comparação clara. |
| 05:30–06:00 | Serviços, combos e itens populares | Categorias, preço, duração e seleção devem ser escaneáveis; combos não devem confundir-se com serviços individuais. |
| 05:50–06:35 | Personalização da página e publicação | Indicar seções obrigatórias/opcionais e deixar clara a diferença entre salvar rascunho e publicar. |
| 06:20–07:23 | Agenda, escolha de data/disponibilidade, resumo e escolha de cliente | Mostrar os dados selecionados, permitir corrigir etapas sem reiniciar tudo e distinguir horários livres de seleção manual. |

## Evidências adicionais extraídas do APK

O APK contém cinco vídeos internos da própria apresentação (`landing_peek_booking.mp4`, `landing_peek_site.mp4`, `landing_peek_reviews.mp4`, `landing_peek_analytics.mp4` e `landing_peek_notifications.mp4`). Eles permitem mapear detalhes que não aparecem apenas no inventário de módulos:

- **Agendamento público / serviços:** lista clara em fundo neutro; nome do serviço à esquerda, preço e duração juntos; ação “Agendar” alinhada à direita. Categorias aparecem como linhas recolhíveis, em vez de uma sequência interminável de cartões indistintos.
- **Data e horário:** cabeçalho de mês/ano com navegação lateral; dias em faixa horizontal; horários em linhas altas com a hora em destaque e informação de profissional à direita. A seleção de horário segue para um painel de dados do cliente, com telefone, e-mail e ação de continuar fixa na parte inferior.
- **Página pública do negócio:** capa/hero com nome, slogan e CTA; equipe apresentada em cartões com foto; serviços em lista por categoria; galeria abaixo. O tema público pode ser escuro no hero e neutro/claro na área de serviços — não aplicar uma cor única a todas as seções.
- **Avaliações:** nota média e distribuição visual das avaliações em um cartão-resumo; lista de comentários em cartões individuais, com autor, data, estrelas e opção de ações.
- **Indicadores/marketing:** métricas em cartões compactos e agrupados por assunto; formulários de campanha em folha dedicada, com rótulos curtos e uma ação principal no rodapé.
- **Notificações:** notificações do negócio e avisos ao cliente aparecem em grupos separados; a demonstração não autoriza misturar públicos nem mostrar dados de um cliente a outro.

Essas evidências orientam paridade de composição e navegação, mas não autorizam inventar colunas, categorias ou dados que o Flow não fornece. Quando faltar a mesma estrutura de dados (por exemplo, categoria de serviço), preservar o motor atual e registrar a diferença em vez de simular informação.

## Comparação com a base atual do Flow

A documentação existente do Flow já descreve:
- Agenda operacional com Timeline, Lista e Modo Foco.
- Navegação de data, pílula “Agora”, ações contextuais e menu de ações.
- Motor único de disponibilidade e validação de agendamento.
- Bloqueios/escala como ocupações e prevenção de sobreposição no banco.
- Editor de marca/temas e página pública.
- Catálogo de serviços, profissionais, clientes, fidelidade, avaliações e financeiro.

Arquivos/registros internos consultados:
- `CLAUDE.md` — arquitetura, identidade, princípios de segurança e produto.
- `AGENTS.md` — regras globais de interação e navegação.
- `docs/contrato-de-design.md` — componentes permitidos, tokens, acessibilidade e responsividade.
- `docs/agenda-refino-estado.md` — estado registrado do refino da agenda mobile.
- `docs/mapa-do-codigo.md` — rotas, domínios e componentes por área.
- `src/components/barbeiro/agenda/AGENTS.md` — regras específicas da agenda.

A existência de um módulo não prova, por si só, que todo fluxo está perfeito em execução. Antes de implementar, comparar o comportamento real e os componentes atuais da branch de trabalho.

## Recomendações priorizadas

### P0 — Antes de qualquer redesign

1. Fazer inventário da Agenda, do fluxo de novo agendamento e do editor de temas, com componentes/rotas e seus testes.
2. Capturar o estado atual do Flow em viewport de 390 px e 1280 px para comparação objetiva.
3. Identificar, em cada diferença observada, se é um problema de hierarquia visual, navegação, acessibilidade ou regra funcional.
4. Manter regras de negócio intactas: disponibilidade, fuso horário do negócio, sobreposição, permissões, estados dos agendamentos, pagamentos e isolamento por negócio.

### P1 — Maior ganho provável de experiência

1. **Agenda:** reforçar a leitura do dia, hierarquia entre hora/cliente/serviço/estado, legibilidade de cartões e descoberta das ações sem acrescentar controles concorrentes. Validar Timeline, Lista e Modo Foco como vistas da mesma fonte de dados.
2. **Novo agendamento:** revisar a sequência serviço/profissional/data/horário/cliente/resumo conforme o fluxo já existente; mostrar progresso/contexto e facilitar voltar para corrigir uma escolha.
3. **Disponibilidade:** tornar inequívoco o que é horário livre, horário selecionado e seleção manual; manter o motor atual como única fonte de verdade.
4. **Editor de temas:** separar claramente seleção do tema, prévia do site público, edição de seções e publicação; mostrar o estado salvo/publicado sem falsas confirmações.
5. **Serviços e combos:** diferenciar visualmente serviço, combo e categoria; apresentar duração e preço com hierarquia consistente.

### P2 — Refinamento visual

1. Padronizar espaçamento, títulos, cartões, estados vazios, carregamento e mensagens de erro usando componentes e tokens existentes.
2. Usar cor como sinal semântico, nunca como único indicador do estado.
3. Preservar áreas de toque de pelo menos 48 px, foco visível, texto mínimo de 12 px e preferência por movimento reduzido.
4. Comparar telas de administração e site público como produtos distintos, compartilhando identidade sem forçar a mesma composição.

## Direção visual

- Usar o APK e as capturas/vídeos disponíveis como referência de paridade visual e comportamental, não como sugestão genérica.
- Preservar a geometria, espaçamentos, hierarquia, cards, fluxos, gestos e transições originais que possam ser verificados. Trocar a logomarca/nome antigos pela marca atual do Flow e encaixar as funções novas sem alterar a estrutura antiga desnecessariamente.
- Continuar usando tokens de cor, componentes de segurança, acessibilidade e regras de negócio do Flow; a marca nova não autoriza hexes avulsos nem mudanças de backend.
- Priorizar mobile-first e validar também em desktop. Respeitar a preferência por movimento reduzido sem remover a animação normal.

## Critérios de aceite antes de aprovar alterações

- Nenhuma mudança na regra de negócio apenas para resolver um problema visual.
- Nenhuma cópia de lógica de disponibilidade, agenda ou criação de agendamento.
- Nenhuma mudança destrutiva de banco.
- Fluxos principais validados em 390 px e 1280 px.
- Testes dos componentes/domínios afetados executados; types, lint e build quando o ambiente de desenvolvimento estiver disponível.
- Rascunho, salvar e publicar distinguíveis no editor de site.
- Sem confirmação de operação que não tenha sido concluída com sucesso.

## Próxima etapa técnica

Auditar detalhadamente os arquivos reais relacionados a:
1. `AgendaOperacional`, `AgendaTimeline`, `AgendaFocoMobile` e o fluxo de criação do agendamento.
2. Rotas/componentes de marca, temas e prévia da página pública.
3. Os testes existentes dessas áreas.

Após esse inventário, propor alterações pontuais, arquivo por arquivo, antes de implementá-las. Não enviar alterações à `main` nem publicar o site sem autorização explícita.


## Inventário técnico inicial do Flow

Consulta à branch `main` em 12/10/2026. Contagem física de linhas dos arquivos consultados (serve como sinal de complexidade, não como avaliação automática da qualidade):

| Arquivo | Linhas | Observação |
|---|---:|---|
| `src/components/barbeiro/AgendaOperacional.tsx` | 1.562 | Superfície central com estado, fluxo operacional e composição de várias subáreas. Evitar adicionar mais responsabilidades diretamente aqui. |
| `src/components/barbeiro/AgendaTimeline.tsx` | 975 | Renderização e interações da timeline; alterações visuais devem preservar gestos, rolagem nativa, estado “Agora” e acessibilidade. |
| `src/components/barbeiro/AgendaFocoMobile.tsx` | 244 | Orquestra o Modo Foco e os alertas; parece estar abaixo do limite de 300 linhas indicado pelo contrato. |
| `src/routes/barbeiro.marca.tsx` | 293 | A página de personalização já reúne componentes focados e está perto do limite de 300 linhas. |
| `src/components/marca/editor/SecaoTema.tsx` | 81 | Já existe um componente específico para seleção de tema. |
| `src/components/marca/editor/PreviaDaExperiencia.tsx` | 84 | Já existe prévia reutilizável da experiência pública, incluindo apresentação mobile. |
| `src/components/onboarding/EditorDeServicos.tsx` | 429 | Editor atual de serviços; avaliar antes de criar qualquer editor paralelo. |

Outras confirmações da estrutura:
- `src/routes/barbeiro.temas.tsx` redireciona para `/barbeiro/marca`: temas e personalização já foram consolidados em um lugar.
- `src/routes/barbeiro.agenda.tsx` é uma rota fina que carrega `AgendaLazy`, separando a rota do componente operacional.
- O contrato de design orienta dividir rotas/componentes com mais de 300 linhas. Portanto, uma evolução da Agenda deve preferir extrações pequenas e coesas, sem misturar mudança visual com mudança de regra de negócio.
- O Flow já tem componentes de Timeline, Lista e Modo Foco, assim como uma prévia de experiência pública. A oportunidade principal parece ser comparar detalhes de experiência e refinar componentes existentes, não criar novas superfícies concorrentes.

### Implicação para implementação

Antes de mudar a Agenda, mapear responsabilidades e testes de `AgendaOperacional` e `AgendaTimeline`. Caso seja necessário tocar nesses arquivos extensos, limitar o diff e extrair apenas uma responsabilidade que já esteja claramente delimitada. No editor público, começar por `SecaoTema`, `PreviaDaExperiencia` e pelos componentes chamados em `barbeiro.marca.tsx`. No catálogo, reutilizar `EditorDeServicos` e catalogar as diferenças antes de alterar seu fluxo.


## Inventário confirmado no APK reencontrado (18/10/2026)

A inspeção estática do APK identifica estes domínios de telas e fluxos. A lista é um mapa de escopo, não uma afirmação de que cada comportamento interno foi executado:

- **Agenda:** timeline diária `FigarooDayTimeline`, visualização em lista, cards de eventos/serviços/reservas, indicador do minuto atual, filtro de equipe/local, zoom por pinça, arraste de cards, estados de agendamento, bloqueios, painel detalhado, ações de reserva, criação de agendamento, criação de reserva, edição de horário e seletor de horários.
- **Fluxos de agendamento/reserva:** seleção de serviços, datas/horários, cliente, motivo e resumo; editar horário sem perder o contexto; ações fixas de descartar/salvar quando em edição.
- **Serviços e combos:** lista, categoria, detalhes, preço/tarifas, regras de agendamento e concorrência, equipe habilitada, combos e descontos.
- **Equipe e locais:** lista, dashboard, dados, serviços, disponibilidade semanal/personalizada, endereço, comodidades e horários de funcionamento.
- **Clientes e relacionamento:** visão geral, ficha/dashboard, criação/edição, notas e notificações.
- **Página pública:** editor de tema/layout, prévia, hero, serviços, equipe, galeria, avaliações, redes sociais, localização, formulário de contato, QR code e publicação.
- **Operação/comercial:** checkout, seleção de pagamento, resumo, desconto, edição de serviço na comanda, vendas, histórico de vendas/agendamentos, pacotes/fidelidade, indicadores, campanhas de marketing, avaliações, notificações, configurações e conta.

### Ordem de recuperação

1. **Agenda e cartões** — prioridade máxima, porque são o núcleo de operação e há referência adicional em vídeos/capturas do dono. Preservar a versão aprovada pelo dono e corrigir apenas regressões/bugs.
2. **Novo agendamento, reagendamento e reservas** — recuperar a sequência e o comportamento das etapas, mantendo a fonte de disponibilidade e as validações atuais do Flow.
3. **Cards, folhas, menus e navegação geral** — estabelecer um padrão fiel à referência antes de aplicar ajustes de acabamento às telas dependentes.
4. **Serviços, combos, equipe, locais e clientes** — recuperar layout e fluxo de cada domínio usando os componentes atuais.
5. **Página pública, checkout, vendas, fidelidade, marketing, avaliações, indicadores e configurações** — mapear paridade e integrar as funções novas em etapas.

### Evidência e limites

- O APK é um artefato compilado de Android/Compose, não o código-fonte React do Flow. Ele permite inventariar telas, fontes e recursos, mas não deve ser copiado como se fosse um projeto web.
- Recursos de animação genéricos do Android não provam por si só a animação de cada tela. Usar os vídeos/capturas fornecidos para validar o movimento; sem evidência, registrar a lacuna.
- O APK contém fontes Plus Jakarta Sans, Poppins (pesos Medium/Semibold/Bold) e JetBrains Mono. Antes de alterar tipografia global, verificar se os arquivos podem ser incorporados de forma íntegra e licenciada e se a troca não interfere em legibilidade/identidade da marca atual.
- Não marcar a recuperação como concluída até a validação visual/funcional das áreas principais em 390 px e 1280 px e a execução de TypeScript, testes e build.

## Mapa de recuperação: Configurações, onboarding e página pública

A matriz detalhada de paridade, com as rotas atuais do Flow, as telas identificadas no APK, as lacunas confirmadas e o que ainda precisa de validação visual, está em `docs/referencia-figaro/matriz-recuperacao-cortai.md`. Ela complementa esta referência e a especificação `docs/referencia-figaro/apk/4-pagina-publica.md`.

Prioridade de recuperação: (1) hub “Sua Página” + Layout & Tema + prévia de rascunho/publicação; (2) onboarding e primeiros passos; (3) configurações de conta/negócio e preferências de agendamento/notificações; (4) funcionalidades e navegação; (5) módulos administrativos e demais fluxos. O objetivo é paridade de experiência, não copiar a arquitetura Android nem recriar funções que o Flow já tem.
