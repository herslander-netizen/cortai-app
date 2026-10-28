# Auditoria visual global — Fígaro → Cortaí

**Data:** 27/10/2026  
**Referência autoritativa:** APK Fígaro já analisado e especificações em docs/referencia-figaro/apk/.  
**Objetivo do dono:** nenhuma tela interna deve continuar visualmente herdando a antiga aplicação web do Cortaí.

## Princípio de implementação

O APK define a composição e a hierarquia, não só a paleta. A marca Cortaí, os dados, permissões, regras de negócio, integrações e ações reais continuam do Cortaí. A aplicação visual é mobile-first, validada primeiro em 390 px e conferida em 360 px; desktop é adaptação. Não se aplica um tema artificial às páginas públicas com personalização ativa.

## Problemas concretos identificados nesta tranche

1. **Moldura interna de página:** Screen colocava a ação de voltar e o título no mesmo alinhamento, desenhava um divisor inferior e usava o fundo antigo no cabeçalho. Agora separa a barra de ação de 44 dp da hierarquia de título/subtítulo, usa o token de fundo Figaro e não desenha o divisor legado.
2. **Rodapé institucional automático:** o componente inseria a assinatura Alvo Digital/Copyright em todas as telas internas, inclusive no celular. Isso fazia as áreas operacionais parecerem páginas web; passou a ser opt-in explícito, apenas em telas largas.
3. **Estado vazio:** EmptyState era uma faixa com bordas horizontais. Agora é uma superfície arredondada e neutra do padrão Figaro.
4. **Profissionais:** os registros eram linhas separadas por borda e fundo antigo, com botão btn-tertiary artesanal. Passaram a cartões oficiais Card, com espaço de 8 dp e ação usando o primitivo Button.
5. **Serviços:** o intervalo entre cartões foi reduzido para o espaço de 8 dp do padrão de lista e o ícone deixou de usar o acento coral como cor operacional; agora usa os tokens azuis do Figaro.

## Regra para todas as páginas

- Toda rota interna será comparada ao módulo equivalente descrito em docs/referencia-figaro/apk/2–11.
- Hierarquia padrão: barra superior com ação redonda; título e texto auxiliar abaixo; grupos de cartões sem divisórias decorativas; estados vazios/erro/carregamento explícitos; ação principal claramente reconhecível.
- Cada controle usa o primitivo oficial correspondente. Proibido copiar classes antigas como btn-tertiary, rounded-xl border border-line, faixas border-y ou rodapés comerciais automáticos.
- As animações seguem src/lib/movimento-figaro.ts e src/lib/motion.ts, respeitando redução de movimento.
- A Agenda fica fora desta mudança global por decisão explícita do dono; mudanças visuais nela exigem pedido específico. A página pública do negócio mantém os temas escolhidos pelo estabelecimento.

## Limite honesto do estado atual

Esta entrega corrige a base compartilhada e exemplos concretos de duas áreas; **não declara concluída a auditoria de todas as rotas**. A lista de módulos restantes deve ser verificada e corrigida em lotes, sem mexer em telas/arquivos com reserva ativa. O teste de componente protege a hierarquia da moldura, o comportamento do rodapé e o estado vazio. A fidelidade final ainda precisa ser conferida na prévia em celular, modo claro/escuro e redução de movimento.


## Atualização da execução — 27/10/2026

### Correções verificadas por código e CI

- **Concluído:** o modal de QR Code do WhatsApp passou a usar o componente compartilhado `Dialog` em vez de overlay manual, mantendo expiração e regeneração do QR. Isso removeu uma sombra Tailwind que fazia a suíte falhar.
- **Concluído:** removidas duas classes `btn-primary` antigas da rota de WhatsApp; ambos os botões usam a variante oficial do componente `Button`.
- **Concluído:** os campos “De” e “Até” em Histórico usam a mesma superfície de formulário preenchida e sem borda.
- **Concluído nesta tranche:** erro geral de rota usa `Card` como superfície tonal com raio Figaro de 28 dp, sem divisor horizontal legado.
- **Concluído nesta tranche:** métricas genéricas de carregamento passam a usar token semântico Figaro. Esqueletos exclusivos da Agenda (`EsqueletoAgenda`, `EsqueletoTimeline` e `EsqueletoCockpit`) foram preservados.
- **Concluído por CI no commit `2a67176e`: build, TypeScript, suíte de testes, deploy isolado e smoke test passaram. Este commit mais novo ainda precisa de validação própria.**

### Varredura estática e pendências

- **Parcial:** 90 arquivos de rota TSX de interface foram varridos fora de Agenda/adjacências e APIs. O tree contém 113 arquivos de rota, incluindo endpoints, layout raiz e páginas específicas; a varredura por padrões é detector de possíveis resíduos, não inspeção visual.
- **Pendente/reserva ativa:** referências `--agenda-cartao` e/ou `border-y` permanecem em `barbeiro.configurar.tsx`, `barbeiro.hoje.lazy.tsx`, `barbeiro.equipe.tsx` e `barbeiro.marca.index.tsx`; não foram alteradas por sobreposição com reservas existentes e/ou proximidade da área operacional protegida.
- **Pendente/contrato público:** classes antigas `btn-*` foram detectadas em `f.$slug.tsx` e `vaga.$token.tsx`; por serem páginas públicas/fluxos externos, exigem revisão de tema e contrato antes de converter. Não considero isso concluído só por existir uma classe antiga.
- **Não verificado:** comparação visual manual em 390 px e 360 px, tema claro/escuro, teclado móvel, reduced motion e todos os estados condicionais. A sessão não dispõe de navegador conectado para screenshots e comparação direta; smoke test automatizado não substitui isso.
- **Não concluído:** paridade visual integral de todas as rotas e transições. O inventário `docs/referencia-figaro/apk/8-inventario-de-animacoes.md` ainda marca itens parciais ou ausentes; estes precisam ser abordados em lotes que respeitem reservas de módulos.


## Hierarquia dos cabeçalhos — 27/10/2026

- **Implementado:** removido o botão de ajuda com interrogação dos cabeçalhos compartilhados de páginas e da barra própria de `/barbeiro/hoje`.
- **Hierarquia:** o botão de voltar aparece apenas quando há destino real; páginas sem retorno não mantêm uma linha superior vazia antes do título.
- **Preservado:** sistema de guias e ajuda contextual no menu da Agenda; o pedido remove a interrogação das páginas, não elimina o recurso de orientação.
- **Teste adicionado/ajustado:** `Screen.test.tsx` cobre ausência da interrogação e a hierarquia “Voltar → título”. O resultado do GitHub Actions para este commit ainda deve ser confirmado.


## Refinamento compartilhado de tipografia e superfícies — 27/10/2026

- **Cabeçalhos de páginas internas:** escala móvel ajustada para 22/28 px, peso semibold e subtítulo 14/20 px; telas largas recebem um título de 24 px. Eyebrow passou a 11/16 px. Isso aproxima a hierarquia da escala observada no Figaro e libera mais espaço vertical para o conteúdo.
- **Superfícies:** `LinhasDeConfiguracao`, `LinhaDeOpcoes` e `GrupoDeCartoes` usam tokens `--figaro-surface-container-*` no lugar de fundo rígido ou alias visual da Agenda. A mudança atinge apenas os componentes de configuração reutilizados fora da Agenda.
- **Regressões:** `Screen.test.tsx` verifica a nova escala do cabeçalho; `estilo-figaro.test.ts` verifica tipografia e independência dos componentes de configuração em relação aos tokens da Agenda.
- **Estado:** código registrado no commit `f7b030952801847b28791e12f783893f717d5d09`. A execução automática e o smoke test da prévia ainda precisam confirmar esta rodada. A análise de rotas segue em andamento; não declarar paridade integral até inspeção de todos os estados e conferência visual móvel em 390/360 px e claro/escuro.


## Barra de publicação e perfil administrativo — 27/10/2026

- **Publicação da apresentação:** removido o divisor e o fundo de página legado da barra fixa. Ela acompanha o token de fundo do app e mantém o “Publicar” como ação principal de 56 dp; salvar rascunho e descartar seguem secundários. A lógica de publicação e as mutations não foram alteradas.
- **Perfil administrativo:** configurações e saída da conta passam a usar cartões neutros arredondados de 12 dp em vez de linhas separadas por borda inferior.
- **Regressões:** `estilo-figaro.test.ts` verifica que esses dois fluxos não reintroduzam os divisores/fundos antigos.
- **Estado:** a validação da rodada com esses arquivos e o smoke test da prévia precisam passar antes de considerar esse lote pronto. Não houve publicação principal nem alteração em banco real.


## Automação, ficha do cliente e fila da Visão Casa — 27/10/2026

- **Automação:** cabeçalho local agora usa a mesma escala tipográfica das outras telas internas, evitando o título 30 px com peso pesado.
- **Ficha do cliente:** a seção “Situação do cliente” fica separada por espaçamento, sem linha horizontal decorativa.
- **Visão Casa:** a lista de espera usa os cartões arredondados já existentes, separados por 8 dp, sem bordas/linhas em torno da lista.
- **Regressões:** testes estruturais protegem a escala tipográfica e as duas remoções de divisores.
- **Estado:** pendente de CI e smoke test do último commit. A revisão é estática; sem sessão de navegador conectada ainda não há conferência visual interativa em 390/360 px, claro/escuro ou redução de movimento.


## Jornada do cliente: agendamento e avaliação — 27/10/2026

- **Agendamento dentro do app:** passos de serviço/profissional/horário/pagamento usam espaçamento consistente em vez de traços horizontais; resumo da confirmação e progresso de fidelidade mantêm a hierarquia por espaçamento.
- **Avaliação pós-atendimento:** o título excessivamente grande (30 px bold) agora usa 22/28 px semibold no celular e 24 px em telas largas.
- **Regressões:** testes verificam a ausência de divisores legados em `app.agendar.tsx` e a escala do título em `avaliar.$token.tsx`.
- **Preservação:** o fluxo público `/agendar/$slug`, que pode ter personalização visual do negócio, não foi alterado nesta tranche.
- **Estado:** aguardando CI e smoke test do commit final; ainda não há navegação manual por navegador conectado nem conferência visual de todos os estados em 390/360 px, temas claro/escuro e movimento reduzido.


- **Ajuste adicional:** a primeira execução de testes detectou que a linha “Sair da conta” ainda mantinha `border-b border-line`. Essa segunda ocorrência foi convertida para cartão neutro; o teste de regressão foi mantido para impedir o retorno do divisor.


## Seleção de contexto, fidelidade e notificações — 27/10/2026

- **Seleção de contexto:** cartões de entrada mantêm alvo de toque de 76 dp, mas agora usam o primitivo oficial, superfície Figaro e token sem dependência da Agenda. O estado de entrada também fica exposto via aria-busy; navegação/autenticação não mudou.
- **Fidelidade:** a pista de fundo de progresso troca o bg-ink3 rígido pelo token de superfície Figaro equivalente.
- **Administração do WhatsApp:** ativação de notificações fica separada por espaçamento, sem divisor de página.
- **Regressões:** teste estrutural cobre o componente oficial, tokens, ausência do alias da Agenda e ausência de divisor.
- **Estado:** validar com CI e publicar somente a prévia isolada. A sessão não tem navegador conectado para conferir visualmente todos os caminhos.


## Verificação consolidada da tranche — 27/10/2026

- **Commit validado:** `58c6b82f9eb7000c1aae1d5c414b89c4f8ced1e1`.
- **CI:** build, TypeScript e testes passaram; deploy isolado da prévia e smoke test concluídos com sucesso na execução [40578121194](https://github.com/herslander-netizen/cortai-app/actions/runs/40578121194).
- **Prévia:** `https://previa.cortaiapp.pages.dev`.
- **Limite de validação:** a varredura estática e os testes dos componentes tocados foram feitos; não houve navegação visual manual por tela, porque não há sessão de navegador conectada. Conferência renderizada em 360/390 px, claro/escuro, redução de movimento e estados condicionais permanece pendente.
- **Isolamento:** a Agenda operacional, o banco de produção, DNS e a produção não foram alterados; páginas públicas com tema personalizado foram preservadas.


## Cadastro de cliente — 27/10/2026

- Título de acesso/cadastro alinhado para 22/28 px semibold em celular, 24 px em telas largas.
- “Continuar com Google” e alternância entre Entrar/Criar usam agora o componente `Button` compartilhado com alvo de toque adequado. Os handlers de autenticação, retorno e navegação foram mantidos.
- Regressão estrutural adicionada para evitar o retorno de botões nativos e tipografia excessiva.
- Ainda precisa de verificação visual renderizada em dispositivo real e os estados de erro/carregamento; nenhuma regra de autenticação foi alterada.


## Continuação — componentes compartilhados

- **Concluído no código:** `PainelDeLembretes` deixou de usar bordas externas superior/inferior duplicadas em torno da lista; mantém apenas divisores entre linhas.
- **Concluído no código:** a linha contextual do painel de suporte usa apenas o divisor inferior, sem criar duas bordas que pareciam um bloco web.
- **Concluído no código:** foram adicionadas verificações estáticas para impedir o retorno desses dois padrões.
- **Não verificado até CI:** build, TypeScript e suíte completa após este commit.
- **Pendente:** `AssistenteCortai` ainda contém referências visuais a `--agenda-cartao` e `btn-primary`; a migração exige conferir o contrato de botão e as cores de conversa em todos os estados (mensagens vazias, confirmações, escolha de cliente, gravação de voz, erro e envio). Não alterado neste lote para evitar troca parcial de tema em um fluxo interativo longo.


## Cabeçalho global nas subpáginas — 28/10/2026

- **Implementado no layout mobile:** a barra global com logo, atalho CortAI e sino permanece na Agenda e nas subrotas da Agenda; em outras subpáginas de `/barbeiro`, a barra deixa de ocupar o topo e a moldura `Screen` passa a exibir o botão redondo de voltar e a hierarquia título/subtítulo diretamente no alto da tela.
- **Retorno seguro:** quando uma subpágina de `/barbeiro` usa `Screen` sem destino explícito, o botão volta à Agenda (`/barbeiro`). Destinos de retorno explicitamente definidos continuam sendo respeitados.
- **Desktop preservado nesta tranche:** o cabeçalho global continua presente em telas largas para não deslocar a navegação lateral existente. A prioridade desta correção é o uso mobile, conforme decisão do dono.
- **Proteção da Agenda:** o novo critério reconhece também `/barbeiro/agenda/…`; a moldura e o cabeçalho global dessas rotas não entram na regra das subpáginas comuns.
- **Testes:** `Screen.test.tsx` cobre subpágina mobile, fallback de retorno, altura/offset no desktop e preservação da Agenda. O teste automático e o smoke test do commit final ainda precisam ser confirmados; a inspeção visual em 390/360 px permanece separada.


## Continuação — CortAI e linguagem neutra (28/10/2026)

- **Conversa da CortAI:** migradas as ações interativas para `Button`; os botões de confirmação, envio, gravação/controle de voz, escolha de cliente e fechamento mantêm seus handlers e estados. A caixa de mensagem usa `field-control`, avisos de indisponibilidade/erro usam `Aviso`, mensagens e superfícies usam tokens Figaro. Removidas as referências de estilo `--agenda-cartao`, `btn-primary` e os elementos `<button>` crus desse componente. Teste de regressão em `estilo-figaro.test.ts` protege o contrato. A lógica do cérebro, transcrição, tenant e confirmação não foi alterada.
- **Posicionamento multi-serviços:** o CTA de visitante passou a “Tenho um negócio no Cortaí”; a monetização usa “negócios novos/já clientes” e “O negócio paga o preço padrão”. Só os textos foram alterados; filtros, tipos de público, rotas e permissões permaneceram.
- **Validação:** o CI dos commits anteriores do cabeçalho passou em build, TypeScript, testes e publicação isolada; o commit mais recente que inclui o chat/linguagem ainda aguarda CI e smoke test. A validação visual móvel em 390/360 px segue pendente. Não houve alteração de banco nem publicação principal.


## Fluxos públicos da fila e animações existentes — 28/10/2026

- **Fila pública (`/f/$slug`):** substituiram-se os três botões HTML/classes `btn-primary`/`btn-secondary` pelo primitivo `Button`; cartões de serviço usam `size="bloco"`, superfície Figaro e `aria-pressed`; nome e WhatsApp usam `field-control`; erro e aviso de proximidade usam `Aviso`. O botão de agendar continua apontando para o mesmo destino `/b/{slug}`. Seleção de serviço, token, status, consulta e gravação da fila não mudaram.
- **Oferta de vaga (`/vaga/$token`):** a ação principal usa `Button`, mensagens de status e erro usam `Aviso`, e o título foi reduzido para a escala de título interna. A mutação aceitar/recusar, consulta da oferta e refetch permanecem iguais.
- **Tema público:** essas duas rotas não usam o wrapper de branding customizado das páginas públicas de agendamento; a alteração foi restrita a controles e superfícies do padrão Cortaí/Figaro. As páginas de agendamento com tema escolhido pelo negócio não foram alteradas.
- **Animação:** foi conferido o caminho existente `TransicaoDePagina` → `transicoes-de-tela.ts`, com `intra` (20% + fade, 300 ms), `cruzada` (100% da altura + fade, 350 ms), `gaveta` (largura inteira com mola Figaro) e variante de movimento reduzido. Não foi criada uma segunda camada que competisse com a transição global.
- **Validação:** testes de regressão protegem os controles Figaro e a linguagem multi-serviços. Build, TypeScript, suíte de testes, deploy isolado e smoke test do commit final ainda precisam terminar antes de declarar a tranche validada. Conferência visual manual em 390/360 px permanece pendente.


## Painel WhatsApp / CortAI — 28/10/2026

- **Avisos de estado:** estados de falha do painel, experiência do cliente e histórico de envios, problema de elegibilidade/pagamento da Meta, necessidade de template aprovado, indisponibilidade do remetente oficial e falha ao salvar agora usam o componente compartilhado `Aviso` nos tons correspondentes. Removidos os contornos e fundos artesanais nos dois alertas da Meta; os títulos passam a explicar o motivo e a ação esperada.
- **Ações e navegação:** as abas Conexão, Notificações, Experiência e Histórico continuam usando os mesmos handlers e estado, agora expondo a seleção por `aria-pressed`. O divisor horizontal dentro do cartão de notificações foi removido, preservando separação por espaçamento.
- **Preservação funcional:** nenhum endpoint, regra de WhatsApp, permissão, sessão QR, lógica de reconexão, envio ou configuração mudou.
- **Regressão:** `estilo-figaro.test.ts` verifica o uso de `Aviso`, o estado selecionado das abas e que os padrões de alerta/divisor substituídos não retornem. Validação CI e smoke da prévia do commit atual ainda necessários; conferência visual manual 390/360 px pendente.


## Linguagem multi-serviços no resumo administrativo — 28/10/2026

- O overview do admin consulta todos os registros da tabela `tenants`; o rótulo de métrica “Barbearias” foi corrigido para “Negócios”, e a amostra agora usa singular/plural correto. A propriedade técnica `totalBarbearias` e o cálculo de métricas foram preservados para não quebrar o contrato existente.
- O teste multi-serviços em `estilo-figaro.test.ts` também cobre os rótulos do overview. Validação do CI para o commit consolidado ainda pendente; não declarar o lote validado até build, TypeScript, testes e smoke test passarem.
