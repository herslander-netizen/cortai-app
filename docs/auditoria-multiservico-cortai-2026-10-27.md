# Auditoria multi-serviços do Cortaí — 27/10/2026

## Objetivo e critério de aprovação

O Cortaí deve ser entendido como uma plataforma de gestão e agendamento para negócios de serviços. Beleza é um segmento atendido; barbearia é um segmento dentro de Beleza, nunca a identidade global do produto.

A plataforma precisa distinguir três camadas:
1. **Núcleo universal:** negócio, serviço, profissional/equipe, cliente, agenda, disponibilidade, atendimento, pagamentos/recebimentos e página pública.
2. **Configuração por segmento:** vocabulário, sugestões iniciais, categorias, exemplos, identidade inicial e recursos que realmente fazem sentido para o segmento.
3. **Compatibilidade legada:** rotas, nomes de funções, chaves de templates e valores históricos que não devem ser renomeados em massa sem plano de compatibilidade.

Um resultado só é considerado concluído depois de TypeScript, testes, build, deploy isolado de prévia e conferência móvel. Esta rodada fez inspeção estática e correções focadas; não declara a auditoria integral concluída.

## Achados por prioridade

### P1 — Identidade e onboarding assumiam Beleza/barbearia como padrão

**Antes**
- `src/routes/comecar.tsx` descrevia o produto como destinado a negócios de Beleza.
- O estado inicial do seletor de segmento era `barbearia`, mesmo antes de a pessoa escolher um segmento.
- Os atalhos “Tenho um negócio” usavam ícone de tesoura e copy que limitava a entrada a Beleza.
- `src/lib/segmentos.ts` oferecia “Outro” como opção vaga, sem comunicar que aceita outras categorias de serviço.

**Correção aplicada**
- Copy de entrada passou a falar em diferentes tipos de serviço.
- O estado inicial usa `outro`, sem pré-selecionar barbearia.
- O atalho de negócio usa ícone neutro de negócio.
- A opção genérica passou a se chamar “Outro tipo de serviço” e cita exemplos amplos.

**Arquivos:** `src/routes/comecar.tsx`, `src/lib/segmentos.ts`.

### P1 — Fallback de vocabulário ainda podia transformar um segmento desconhecido em barbearia

**Antes**
- `segmentoParaApresentacao()` já tinha fallback neutro, mas `termos()` e `definicaoDoSegmento()` usavam `segmentoValido()`, cujo fallback histórico é `barbearia`.
- Assim, um valor ausente ou inválido podia mostrar “barbearia”, “barbeiro” ou termos associados na interface, apesar de existir uma função específica para apresentação neutra.

**Correção aplicada**
- `termos()` e `definicaoDoSegmento()` agora usam `segmentoParaApresentacao()`.
- `segmentoValido()` agora usa `outro` para valores ausentes/inválidos; segmentos explicitamente definidos continuam intactos.
- A alteração afeta o fallback em runtime: não reescreve registros, IDs, rotas, tabelas, funções nem chaves legadas. Os consumidores sensíveis devem continuar recebendo o segmento real do negócio.
- Testes cobrem ausência, valor inválido, termos, definição do segmento e preservação de segmentos explícitos.

**Arquivos:** `src/lib/segmentos.ts`, `src/lib/segmentos.test.ts`.

### P1 — Instruções da IA especializada descreviam somente negócios de Beleza

**Antes**
- `src/lib/ia/assistente.server.ts` apresentava a IA como inteligência para negócios brasileiros de Beleza.
- O texto de instrução não deixava explícito que Beleza é apenas um segmento e que a IA deve evitar suposições quando o segmento não está definido.
- O tipo interno `ContextoDaBarbearia` carregava uma denominação específica apesar de representar nome, segmento, serviços, horários e fila de um negócio.

**Correção aplicada**
- Prompt atualizado para uma plataforma de diferentes tipos de negócios de serviços e proibição explícita de presumir segmento.
- O tipo passou a ter nome neutro `ContextoDoNegocio`, mantendo `ContextoDaBarbearia` como alias de compatibilidade para não quebrar consumidores legados.
- O formato do histórico da conversa foi mantido para compatibilidade.

**Arquivo:** `src/lib/ia/assistente.server.ts`.

### P1 — Mensagens padrão do WhatsApp continham linguagem específica de barbearia

**Antes**
- `src/lib/whatsapp/conversa-padrao.ts` tinha mensagens padrão com `{{barbearia}}`, “último corte”, “visita” e “curtiu o resultado?”.
- O parâmetro de segmento das funções de texto/resposta assumia barbearia quando omitido.
- Isso podia produzir comunicação incoerente em negócios genéricos ou em chamadas sem contexto explícito.

**Correção aplicada**
- Mensagens padrão usam `{{negocio}}`, “atendimento” e “serviço”.
- O pós-atendimento e a mensagem de retorno são neutros.
- O segmento omitido agora cai em `outro`; os textos específicos da barbearia continuam disponíveis quando ela é explicitamente selecionada.
- Adicionado teste de saudação e pós-atendimento sem segmento.

**Arquivos:** `src/lib/whatsapp/conversa-padrao.ts`, `src/lib/whatsapp/conversa-padrao.test.ts`.

**Compatibilidade mantida:** a função de preenchimento ainda entende o alias histórico `{{barbearia}}` ↔ `{{negocio}}`; chaves persistidas como `cancelado_pela_barbearia` não foram renomeadas nesta rodada.

### P1 — Home pública e SEO posicionavam a plataforma em Beleza e usavam metáfora de cadeira

**Antes**
- `src/lib/home-publica.ts` tinha hero e metadados SEO com “Gestão e tecnologia para Beleza”.
- A seção de produto dizia “Tudo o que acontece na cadeira”, expressão que sugere um tipo específico de atendimento.
- O conteúdo padrão público é a base quando não existe conteúdo personalizado no banco.

**Correção aplicada**
- Hero e SEO passam a falar em gestão para negócios de serviços.
- “Cadeira” foi substituída por “atendimento”.
- Páginas públicas personalizadas continuam preservadas; não se sobrescreve conteúdo editorial salvo no banco.

**Arquivo:** `src/lib/home-publica.ts`.

### P1 — SEO estruturado classificava negócios genéricos como negócio de saúde e beleza

**Antes**
- `src/lib/schema-negocio.ts` retornava `HealthAndBeautyBusiness` para “outro”, segmento ausente ou desconhecido.

**Correção aplicada**
- Segmentos reconhecidos continuam usando tipos específicos.
- Segmento genérico, ausente ou desconhecido agora usa `LocalBusiness`, que não pressupõe beleza.
- Testes cobrem o fallback genérico e desconhecido.

**Arquivos:** `src/lib/schema-negocio.ts`, `src/lib/funil-schema.test.ts`.

### P1 — Apresentação principal e demonstrações usavam exemplos de barbearia como padrão

**Antes**
- `src/routes/apresentacao.tsx` selecionava `barbearia` quando a URL não informava segmento, apesar de usar `segmentoParaApresentacao()` para valores fornecidos.
- `src/lib/apresentacao-conteudo.ts`, fonte do conteúdo padrão de `/apresentacao`, dizia “FEITO PARA BELEZA”, mencionava “quem está na cadeira” e usava uma pergunta que colocava barbearia como referência.
- `src/components/apresentacao/DemoAgendamento.tsx` abria com “Corte” e “Corte + acabamento”.
- `src/components/apresentacao/ShowroomCortai.tsx` guardava detalhes de perfil como “degradê baixo na 1” e uma preferência relacionada ao acabamento; o segmento genérico não tinha serviços sugeridos e precisava de fallback próprio para a demonstração.

**Correção aplicada**
- A rota de apresentação usa `outro` quando não há segmento na URL.
- O conteúdo padrão da apresentação e o SEO falam de negócios de serviços; a seção de segmentos continua explicando que cada exemplo muda conforme a área.
- A demonstração de agendamento usa serviços fictícios genéricos.
- O showroom possui uma lista de serviços fictícios genéricos exclusivamente para a demonstração quando o segmento escolhido não fornece sugestões; isso não preenche automaticamente os serviços reais do negócio.
- O perfil demonstrativo perdeu a anotação exclusiva de corte e usa uma preferência neutra de atendimento.
- A seleção explícita de “Barbearia” continua disponível como um exemplo de segmento.

**Arquivos:** `src/routes/apresentacao.tsx`, `src/lib/apresentacao-conteudo.ts`, `src/components/apresentacao/DemoAgendamento.tsx`, `src/components/apresentacao/ShowroomCortai.tsx`.

**Limite:** conteúdo editorial personalizado já salvo por um administrador ou por um negócio não é sobrescrito automaticamente; precisa de revisão separada para preservar a escolha explícita do responsável.

## Mapa de arquitetura e áreas que exigem varredura adicional

### Segmentação e dados
- Fonte de segmento: `src/lib/segmentos.ts`; os IDs persistidos atuais devem ser preservados.
- `segmentoValido()` normaliza ausência/valor inválido para `outro`; o valor explícito armazenado no negócio continua sendo respeitado. Não há migração nem alteração dos dados existentes.
- O segmento genérico atualmente permite serviços personalizados, mas não é um catálogo de verticais completo. Não adicionar clínicas, aulas, assistência técnica ou outras categorias como segmentos oficiais sem verificar as regras e a cobertura funcional de cada uma.
- Não foi criada nem aplicada migração; nenhum banco foi consultado ou alterado.

### P1 — Rascunho, sessão e divulgação também tinham fallback específico de Beleza/barbearia

**Antes**
- `src/lib/rascunho.functions.ts` criava rascunhos novos com segmento e horários padrão de barbearia.
- `src/lib/sessao.functions.ts` expunha barbearia como segmento da sessão quando ainda não havia negócio vinculado; também usava o fallback legado ao ler um segmento ausente no negócio.
- `src/lib/whatsapp/motor/vocabulario.ts` interpretava palavras ambíguas usando barbearia quando o chamador não informava segmento.
- `src/lib/divulgacao.ts` gerava hashtags de Beleza para segmentos ausentes/desconhecidos e só tinha hashtags específicas para parte dos segmentos suportados.

**Correção aplicada**
- Rascunhos novos usam segmento `outro` e horários genéricos; dados de rascunhos já salvos com segmento explícito permanecem intactos.
- A leitura dos defaults de onboarding (`src/lib/onboarding.functions.ts`) usa `segmentoParaApresentacao()` para horários e chips de ficha quando o segmento está ausente/desconhecido.
- Sessões sem negócio começam com segmento neutro; ao carregar um negócio com segmento ausente/desconhecido, a sessão usa `segmentoParaApresentacao()` para não expor um rótulo de barbearia.
- O vocabulário conversacional usa `outro` quando o chamador omite o segmento; a escolha explícita de barbearia continua reconhecendo os aliases de corte.
- Hashtags sem segmento agora são `#servicos`, `#atendimento` e `#agendamento`; os segmentos de salão, cabeleireiro, esmalteria, sobrancelha/cílios e estética receberam grupos específicos.
- As legendas padrão usam a preposição neutra “em” no lugar de “na”, que pressupunha o gênero de “barbearia”.

**Arquivos:** `src/lib/rascunho.functions.ts`, `src/lib/sessao.functions.ts`, `src/lib/onboarding.functions.ts`, `src/lib/whatsapp/motor/vocabulario.ts`, `src/lib/whatsapp/motor/escolha-servico.test.ts`, `src/lib/divulgacao.ts`, `src/lib/divulgacao.test.ts`.

**Limite:** consumidores que dependem do segmento precisam receber o valor real do negócio; quando ele estiver ausente/inválido, o fallback agora é `outro`. A auditoria deve validar os fluxos operacionais em CI antes de declarar a tranche concluída.

### IA e conversação
- Núcleo canônico: `src/lib/brain/`; o modelo interpreta pedidos, mas regras, permissões, validação e execução permanecem no sistema.
- O extrator estruturado `src/lib/ia/assistente.server.ts` foi neutralizado. A próxima passada deve auditar prompts, fixtures e mensagens legadas em `src/lib/whatsapp/`, `src/lib/ia/`, `src/lib/brain/` e `promptfoo/` individualmente.
- Fixtures como “Barbearia Aurora” são aceitáveis quando claramente usadas como dados de teste de uma barbearia. Não devem servir de fallback real para um negócio sem segmento.
- Não renomear em lote tipos, funções e tabelas com “barbearia” no nome: algumas são contratos históricos, rotas persistentes ou funções usadas por outros módulos.

### Rotas e links
- Rotas antigas como `/barbeiro/*`, `/barbearias` e nomes como `criarBarbearia` são legados técnicos. Trocar nomes ou URLs sem redirecionamentos, compatibilidade de links, navegação, testes e dados pode quebrar sessões e links compartilhados.
- A interface deve usar rótulos neutros e termos de segmento; a remoção dos nomes técnicos exige uma migração arquitetural separada, com aliases preservados.

### Demonstração e conteúdo público
- A demonstração de barbearia pode continuar sendo uma demonstração contextualizada, desde que esteja identificada como exemplo de um segmento — não como definição do Cortaí.
- `HOME_PADRAO` é conteúdo padrão, não deve ser confundido com páginas públicas personalizadas salvas pelos negócios.
- Ainda é necessária uma conferência visual em 390 px e 360 px e uma leitura integral do fluxo público da apresentação, demonstração, onboarding e descoberta de negócios.

### Módulos, permissões e promessas de produto
- Caixa, fiado, comanda, produtos, comissões, fidelidade, fila, equipe e estoque não são igualmente relevantes para todo profissional autônomo. A comunicação deve distinguir núcleo universal, recurso opcional e recurso dependente de plano/segmento.
- Esta rodada não mudou regras de agenda, disponibilidade, permissões, cobrança, banco, notificações operacionais ou contratos de APIs.
- O catálogo de segmentos ainda é predominantemente de Beleza mais uma opção genérica. Para ampliar oficialmente para saúde, educação, manutenção, consultoria ou outros setores, é necessária uma matriz explícita de capacidade por segmento antes de anunciar suporte completo.

## Pendências de validação

- [ ] Confirmar GitHub Actions para o conjunto de commits desta rodada: TypeScript, testes, build e publicação isolada na prévia.
- [ ] Conferir onboarding no celular em 390 px e 360 px, incluindo seleção de segmento e criação de negócio genérico.
- [ ] Conferir apresentação pública, cards, ícones e imagens de demonstração para garantir que não existe estética de barbearia como fallback global.
- [ ] Fazer varredura completa de textos e assets em todas as rotas/componentes; separar ocorrência contextual legítima de vazamento de segmento.
- [ ] Auditar prompt do cérebro canônico, templates do WhatsApp, notificações, conteúdo SEO, fixtures e dados demo; adicionar testes de segmento ausente para cada caminho.
- [ ] Resolver a divergência de documentação na raiz: `AGENTS.md` ainda contém a formulação “Cortaí = Beleza; barbearia é segmento”. Esse arquivo está reservado pela tarefa simultânea de paridade da Agenda; deixei recado para atualizar a regra após a liberação, sem interferir na reserva.
- [ ] Não publicar no site principal, não tocar em `main`, DNS ou banco real sem autorização explícita.

## Critério definitivo

A auditoria não termina quando a busca por “barbearia” retorna zero. Termina quando:
1. um negócio sem segmento é apresentado com linguagem neutra;
2. um negócio explicitamente de barbearia continua recebendo sua experiência específica;
3. outros segmentos podem cadastrar serviços e horários sem dados de exemplo de barbearia;
4. a IA e as mensagens não inventam vocabulário, capacidade ou dados do negócio;
5. rotas, dados históricos, permissões e links continuam compatíveis;
6. o produto e a Home comunicam uma plataforma de serviços, sem parecer um software exclusivo de barbearia.


## Continuação segura — fallbacks neutros de segmento (27/10/2026)

**Corrigido nesta tranche**
- A descoberta pública agora converte segmento ausente/desconhecido para `outro`, em vez de rotular o negócio como barbearia por causa do fallback legado. O nome técnico da função e os tipos/rotas consumidores foram preservados.
- As notificações transacionais de retorno passam pelo normalizador de apresentação. Segmento ausente/desconhecido usa a mensagem neutra e a personalização configurada deixa de ser ignorada apenas porque o campo de segmento está vazio.
- Os textos especiais de Beleza são aplicados somente aos segmentos de Beleza explicitamente selecionados. O segmento `outro` usa a mensagem neutra; a barbearia explícita mantém seu vocabulário específico nas notificações determinísticas.
- Testes de regressão cobrem segmento ausente, segmento desconhecido e segmento genérico.

- A resposta de `getPaginaPublica` também normaliza segmento ausente/desconhecido para `outro`, sem mudar o contrato `PaginaPublica` nem os slugs/rotas. O segmento explícito de barbearia continua retornando `barbearia`.

**Limites de compatibilidade**
- O fallback global foi alterado intencionalmente para `outro`; isso não renomeia nem reescreve rotas, tipos, funções, tabelas ou colunas. Como o comportamento em runtime muda para segmento ausente/inválido, é necessário confirmar TypeScript, testes, build e prévia antes de encerrar a auditoria.
- Não houve renomeação em massa de `/barbeiro/*`, `/barbearias`, tipos, funções, tabelas ou colunas; não houve migração nem escrita em banco.
- A apresentação, onboarding, Agenda protegida e arquivos já reservados por outras tarefas não foram alterados. A auditoria global de termos e assets continua aberta para revisão por área após liberação das reservas.

## Diretriz permanente para eliminar o legado de barbearia como foco global — 28/10/2026

A solicitação do dono foi incorporada ao escopo da atualização global Figaro/multi-serviços. A remoção será semântica e por etapas, não uma exclusão indiscriminada de palavras ou arquivos.

**Regra de implementação**
- Padrão universal: “negócio”, “serviço”, “profissional/equipe”, “cliente” e “atendimento”. O termo “barbearia” só aparece quando o usuário escolhe esse segmento explicitamente, quando descreve um recurso realmente específico ou quando identifica claramente um exemplo/fixture.
- Fallback ausente, inválido ou desconhecido: usar a experiência neutra; nunca inferir barbearia por conveniência.
- Manter a experiência específica de barbearia quando ela for escolhida. Não remover seus serviços, templates ou recursos legítimos.
- Tratar `/barbeiro/*`, `/barbearias`, nomes como `criarBarbearia`, aliases de variáveis, chaves persistidas e tipos antigos como contratos técnicos. Não renomear nem excluir em lote; qualquer migração de rotas/identificadores exige compatibilidade de links, sessões, consumidores e testes.
- Em UI e marketing, corrigir o texto, ícone, exemplo ou fallback responsável pelo viés sem alterar a regra de negócio adjacente. Não mudar schema, dados, permissões, APIs, integrações ou banco para resolver um problema apenas de apresentação.
- Antes de editar, conferir `DIARIO.md` e as reservas ativas; não sobrepor a Agenda protegida nem arquivos reservados. Cada lote deve ser pequeno, testável e reversível.

**Próxima sequência segura**
1. Concluir a neutralização dos fallbacks de cadastro de serviços nos componentes atualmente reservados.
2. Concluir a normalização da página pública e verificar a execução CI associada.
3. Auditar os restantes prompts, templates/notificações, demonstrações, ícones, textos de interface e SEO por ocorrência e contexto; corrigir apenas arquivos livres.
4. Executar TypeScript, suíte de testes e build; depois validar a publicação isolada e conferir visualmente em 390/360 px.
5. Manter a versão principal, banco real, DNS e rotas persistentes intocados sem autorização específica.

**Não confundir** “eliminar o legado como foco” com apagar toda ocorrência de “barbearia”: o objetivo é que ela deixe de ser o padrão universal, sem quebrar negócios existentes, links, histórico ou a experiência do segmento explícito.
### Cadastro de serviços — fallback neutro (27/10/2026)

- O editor reutilizável de serviços agora usa o segmento `outro` quando o chamador não informa um segmento, em vez de abrir com sugestões de corte/barba. Os componentes de sugestões rápidas e de descrição assistida da IA também usam o normalizador de apresentação.
- Quando `barbearia` é selecionado explicitamente, as sugestões de barbearia permanecem inalteradas. O fluxo oficial de onboarding já passa o segmento escolhido; nenhuma rota ou payload foi renomeado.
- Foram adicionados testes para garantir que o fallback genérico não apresente sugestões de barbearia e use o exemplo neutro da IA, além de manter a faixa rolável quando barbearia é selecionada explicitamente.
- Arquivos: `src/components/onboarding/EditorDeServicos.tsx`, `EditorDeServicos.test.tsx`, `AssistenteDeServicos.tsx` e `SugestoesDeServicos.tsx`.

## Hotspots restantes — aguardando liberação ou auditoria própria (28/10/2026)

Estes pontos foram identificados, mas não foram alterados nesta tranche por estarem ligados a fluxos reservados ou operacionais:

- `src/components/onboarding/EditorDeHorarios.tsx`: ainda usa `barbearia` como segmento padrão do componente. A rota principal de configuração já passa o segmento normalizado com fallback `outro`; a mudança aqui fica para depois da reserva ativa desse arquivo, com teste do caso em que o prop é omitido.
- `src/lib/marca.functions.ts`: a resposta de dados do editor de Personalizar Página ainda deriva o segmento por `segmentoValido(tenant.segmento)`. Como a área `barbeiro.marca*` e os componentes do editor têm reserva ativa, o ajuste deve ser coordenado com essa tarefa para não conflitar com alterações de navegação/edição.
- `src/lib/barbeiro.functions.ts`: a normalização de segmento está no caminho central de funções operacionais. Não se altera globalmente sem testes direcionados de agenda, termos por segmento e negócio com campo ausente/desconhecido; a Agenda continua protegida.
- `CLAUDE.md` foi alinhado ao posicionamento multi-serviços. `AGENTS.md` ainda tem uma formulação antiga de posicionamento e permanece reservado por outra tarefa; o recado existente pede a correção quando ele for liberado.

A fixture da suíte de notificações foi corrigida para usar o ID válido `salao`, de modo que os testes sobre mensagens de outro segmento exercitem um segmento real, em vez de um alias inválido que cairia no fallback neutro.

### Resíduos de vocabulário no código auxiliar (28/10/2026)

- O fallback de slug vazio no fluxo de rascunho passa a usar `negocio`, não `barbearia`. A publicação exige um nome antes de gerar o slug; portanto essa alteração é apenas um último recurso neutro e não muda slugs de cadastros válidos.
- Comentários de implementação nos módulos de contexto da IA e loja foram generalizados para “negócio”. Nomes técnicos como `criarRascunhoDeBarbearia`, `rascunhos_de_barbearia`, permissões e RPCs foram mantidos deliberadamente por serem contratos de compatibilidade.

### FAQ pública — posicionamento multi-serviços (28/10/2026)

- A resposta à pergunta “Quais tipos de negócio podem usar o Cortaí?” agora começa pela definição do produto como plataforma de gestão e agendamento para negócios de serviços. Beleza e barbearia são apresentadas como exemplos de áreas, não como centro e exceção.
- Teste de regressão verifica a frase inicial, a menção de segmentos como exemplos e impede que a resposta volte a começar por “Não.”
- O showroom visual e conteúdo personalizado de estabelecimentos não foram alterados.

### Copy de interface ainda reservado por outra tarefa (28/10/2026)

A varredura encontrou estes textos na área da reconstrução visual global, mas não os alterou porque os arquivos estão reservados por outra tarefa:

- `src/routes/visitante.tsx`: “Tenho uma barbearia no Cortaí”. Substituição sugerida: “Tenho um negócio no Cortaí”, mantendo destino, permissões e fluxo de login.
- `src/routes/admin.monetizacao.tsx`: “barbearias novas/já clientes” nos rótulos de status. Substituir por “negócios novos/já clientes”, preservando filtros, IDs e regras.

O encaminhamento também foi registrado em `DIARIO.md` para que o responsável pela reconstrução visual faça a alteração junto do restante do lote, sem disputa de escrita nesses arquivos.


## Preferências pós-agendamento por segmento — 28/10/2026

A preferência pós-agendamento passou a receber o segmento explícito da agenda pública tanto no formulário quanto no modo conversa.

- Barbearia mantém o campo “Como costuma cortar”.
- Salão/cabeleireiro, esmalteria, sobrancelha/cílios e estética recebem rótulos apropriados ao serviço.
- Segmento ausente, inválido ou “outro” usa campos livres neutros e não apresenta automaticamente opções de ar, bebida, música ou corte.
- A chave histórica `corte_habitual` continua sendo usada internamente por compatibilidade; nenhum schema, API ou banco foi alterado.

Testes adicionados para default neutro, barbearia explícita, salão e esmalteria, além de regressões do modo conversa. CI e prévia ainda precisam confirmar a tranche completa.

### Linguagem interna neutra em contexto do cliente e monetização (28/10/2026)

- Comentários de domínio em `src/lib/contexto-cliente.functions.ts` e `src/lib/monetizacao.functions.ts` agora dizem “negócio” em vez de chamar todo tenant de “barbearia”.
- Foi uma mudança só de documentação do código: não alterei nomes de funções, contratos de payload, permissões, regras de cobrança, consultas, tabelas ou dados.

### Divulgação — legenda genérica neutra (28/10/2026)

- Corrigida a legenda padrão do modelo genérico de divulgação: “... com carinho **em** [nome]” em vez de “... **na** [nome]”. Isso evita pressupor que o nome representa uma barbearia ou outro nome gramaticalmente feminino.
- Teste de regressão cobre a legenda genérica; hashtags, links rastreados e mensagens específicas de segmentos não mudaram.
