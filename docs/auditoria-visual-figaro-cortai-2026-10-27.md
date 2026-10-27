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
