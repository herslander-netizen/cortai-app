# Evolução UI/UX do Cortaí

## Diagnóstico e prioridades

| Prioridade              | Evidência no código                                                                                                                                                                         | Ação                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Alta                    | `ListaAgenda` marcava o item `<li>` inteiro como botão, embora seus filhos incluíssem botões de ação. Isso criava controles interativos aninhados e deixava a semântica de teclado ambígua. | Corrigido com botão semântico para o resumo e ações como controles irmãos.                                                              |
| Média                   | Os campos do catálogo tinham 40 px e o botão de remover tinha 44 px, abaixo do alvo mínimo de 48 px especificado em `docs/contrato-de-design.md`.                                           | Ajustado para controles de ao menos 48 px e aplicado o token `field-control`.                                                           |
| Média                   | Compartilhar não fazia nada quando a API nativa não estava disponível, e falhas ao copiar não davam feedback.                                                                               | Compartilhar agora usa a cópia como alternativa e as falhas são comunicadas pela faixa de estado existente.                             |
| Média                   | O catálogo misturava botões nativos e estilos legados, e os erros/sugestões da configuração assistida não eram anunciados semanticamente.                                                   | Ações agora usam `Button`; remoção pede confirmação, a descrição tem rótulo e feedback usa `status`/`alert`.                            |
| Média                   | As sugestões rápidas ocupavam várias linhas no celular; o botão de salvar combinava a variante fantasma com um estilo de ação principal.                                                    | Sugestões agora formam uma faixa horizontal rolável no celular e o salvamento usa a variante principal compartilhada.                   |
| Alta                    | Na folha de agendamento manual, a ação de confirmar flutuava sobre a grade de horários e de pagamento durante a rolagem.                                                                    | A confirmação agora fica num rodapé próprio; o conteúdo rola acima dela, e o rodapé acompanha a abertura do teclado virtual.            |
| Média                   | No editor da página pública, o rótulo do link personalizado envolvia também um botão e opções de foto/cor não tinham nome ou estado anunciado adequadamente.                                | Rótulo agora aponta só para o campo; ação de foto tem nome acessível; cores expõem `aria-pressed` e controles principais atendem 48 px. |
| A verificar visualmente | A agenda tem linha do tempo, lista, foco mobile, navegação de datas, estados e ações próprias.                                                                                              | Mantidos. Esta execução não conseguiu fazer inspeção visual responsiva no navegador.                                                    |

## Telas examinadas

- Agenda operacional: `AgendaOperacional`, `AgendaTimeline`, `AgendaFocoMobile` e `ListaAgenda`.
- Editor da página pública: rota `/barbeiro/marca`, `SecaoTema` e `PreviaDaExperiencia`. Os seletores já expõem estado pressionado, e a prévia já alterna celular/computador.
- Catálogo: `EditorDeServicos`, incluindo serviços, preço, duração, categorias, equipe e recursos existentes de foto e sugestões. Capturas fornecidas pelo usuário mostraram as sugestões ocupando várias linhas e a lista rolável no celular.
- Agendamento público: `AgendamentoChat` e etapas de serviço, profissional e data. Os cartões exibem preço/duração e os dias sem opções são desabilitados.
- Agendamento manual: capturas fornecidas pelo usuário mostraram a ação fixa cobrindo opções de horário na folha de formulário. A área de conteúdo e a confirmação foram separadas em rolagem e rodapé.

No editor da página pública, os estados de salvamento, publicação e erro já usam uma faixa acessível, e o celular já recebe uma folha de prévia. Foram corrigidos o rótulo mal associado no endereço personalizado e os nomes/estados acessíveis dos controles de foto e cor. No fluxo público, revisão das escolhas, entradas de dados, horário e navegação por etapas já têm hierarquia e alvos de toque adequados; não alterei as regras nem esses elementos após a inspeção.

## Evidências e limitações da auditoria Figaroo

Os arquivos `auditoria-visual-figaroo.md` e `docs/referencia-ux-figaroo-cortai.md` não existem neste checkout. O usuário forneceu capturas de tela e as cinco partes do APK, além do `LEIA-ME-reconstrucao.zip`. As partes 000/001 reenviadas têm os mesmos hashes das cópias anteriores. O APK completo foi reconstruído em diretório temporário e validado como arquivo ZIP/APK; o inventário registrou 87.574.817 bytes, 589 entradas, 6 arquivos DEX, 31 recursos sob `res/anim`, cinco fontes (`Plus Jakarta Sans`, três pesos de `Poppins` e `JetBrains Mono`) e quatro imagens raster.

As capturas confirmam visualmente o reagendamento em grade horária com cabeçalho de data, instrução para trocar o dia pelo comando Reagendar e rodapé fixo com notificação, Descartar e Salvar. Também mostram o cartão reduzido durante uma das interações de horário; a captura sozinha não confirma a mecânica de animação usada. Os recursos `res/anim` incluem nomes genéricos de bibliotecas Android e não provam por si só quais animações o Figaroo usa em suas telas. O APK foi inspecionado estaticamente, sem instalação ou execução; detalhes de interação que não aparecem nas capturas permanecem hipóteses.

A inspeção de código do Cortaí não substitui a validação visual nos tamanhos de 320, 360, 390, 430, 768, 1024 e 1440 px.

## Validação

- `tsc --noEmit`: passou.
- ESLint nos arquivos TypeScript alterados: passou.
- `git diff --check`: passou.
- Vitest com configuração temporária isolada e pool `vmThreads`: a suíte completa passou anteriormente em 27 arquivos e 156 testes; após as capturas, passaram os 4 testes focados do editor de serviços e o teste focado do rodapé do formulário. A configuração padrão segue bloqueada pela validação de caminho do plugin Vite do projeto.
- Instalação das dependências terminou com aviso de scripts `esbuild` ignorados pelo pnpm; dependências foram instaladas. Nenhum lockfile foi criado.

## Escopo

As mudanças são de interface e acessibilidade. Não alteram reservas, preços, regras de disponibilidade, persistência, contratos de API ou integrações.

## Continuação: configurações da página profissional

As nove seções do editor `/barbeiro/marca` foram agrupadas em quatro áreas navegáveis: Conteúdo, Aparência, Divulgação e Histórico. Cada seção agora explica brevemente o que pode ser ajustado; os controles existentes, a prévia, o salvamento de rascunho e a publicação foram preservados. A navegação usa os componentes de abas e acordeão existentes, com alvos de toque de 48 px e suporte de teclado.

Validações desta continuação: `tsc --noEmit` passou; ESLint nos arquivos alterados passou; os testes focados de `PaineisDoEditor` e `SecaoTema` passaram (2 arquivos, 2 testes); `git diff --check` passou. A inspeção visual automatizada em larguras diferentes permanece pendente: não há configuração de Playwright no projeto e a build Vite local segue bloqueada pela checagem de caminho Windows do plugin Lovable. Os arquivos de referência visual do Figaroo continuam indisponíveis neste checkout, então a organização foi baseada na arquitetura e nos tokens existentes do Cortaí.

## Continuação: edição e reagendamento pela timeline

As capturas do usuário mostraram o motivo de validação "Deve ser após agora" comprimido sobre o nome do atendimento no cartão, além de repetido no painel inferior. A timeline agora mantém no cartão somente o intervalo proposto; o motivo aparece uma vez, destacado no painel de edição. O resumo do painel separa o rótulo "Horário proposto", o cliente e o intervalo, e o painel pode rolar dentro de uma altura máxima em telas baixas. O aviso ao cliente, Descartar e Salvar mantêm os comportamentos existentes.

Esta mudança é visual: as regras de validação, o bloqueio de horários passados e o fluxo de persistência permanecem no hook existente. Validações: `tsc --noEmit` passou; os 15 testes focados de timeline e rascunho de horário passaram; Prettier passou; `git diff --check` passou. ESLint reportou zero erros e um aviso preexistente de dependência de `useEffect` em `AgendaTimeline.tsx:479`, fora das linhas alteradas.

## Continuação: movimento e resposta visual

Foram adicionadas transições curtas às quatro áreas do editor da página profissional, com o token de entrada já usado no app. A prévia ao vivo agora anima a mudança de largura entre celular e computador. A seleção de tema apresenta o indicador de escolha com movimento sutil, e novos serviços entram usando o componente compartilhado de cascata. Os dados, campos, seleção, salvamento e limites do catálogo não mudaram. A agenda e o chat mantêm suas animações existentes.

Estas escolhas adaptam padrões de interface das capturas Figaroo ao sistema visual do Cortaí; não reproduzem cores, marca ou telas completas. A análise estática do APK e as capturas permitem confirmar tecnologias e aparências específicas, mas não comprovar a implementação exata de todas as animações observadas. O componente de cascata consulta a preferência por movimento reduzido, e as demais animações são controladas pela configuração global de movimento do app.

Validações desta continuação: Prettier e ESLint nos quatro arquivos alterados passaram; `git diff --check` passou. O TypeScript (`tsc --noEmit`) e Vitest iniciaram, mas permaneceram sem saída por mais de 30 segundos e foram interrompidos, sem resultado. A validação visual em navegador não foi executada.

## Padronização transversal dos layouts

O inventário encontrou três cascos internos distintos: gestão profissional, área do cliente e administração da plataforma. As áreas profissionais/clientes já compartilham `Screen`; as páginas de administração usam `AdminScreen`. Entrada de conta, onboarding, agendamento público e página pública têm jornadas próprias e devem compartilhar identidade, componentes e acessibilidade sem herdar a navegação interna.

Como primeiro passo da padronização, `Screen` e `AdminScreen` agora usam `CabecalhoDeTela` para o título, subtítulo e, quando aplicável, o identificador da área. Isso alinha tipografia e ritmo de leitura em dezenas de páginas sem alterar menus, permissões, conteúdo, contratos ou os limites de largura específicos de cada tela. A revisão das navegações por papel e das páginas com composição própria continua sendo trabalho pendente; esta etapa não declara a padronização global concluída.

### Continuação: cabeçalho administrativo em telas estreitas

O cabeçalho compartilhado das páginas administrativas mantinha título e ação em colunas rígidas, com a ação proibida de encolher. Em telas estreitas, isso podia disputar largura com o título. Agora as ações quebram em linhas e ficam abaixo do título em celular; a partir de `sm`, voltam ao alinhamento horizontal. Nenhuma rota, ação ou permissão mudou.

Validações desta etapa: ESLint e Prettier passaram em `AdminScreen.tsx`; `git diff --check` passou. A revisão transversal das navegações, formulários e estados por perfil continua pendente, assim como a validação visual em 390px e 1280px.

### Continuação: navegação mobile e desktop da administração

A barra inferior do administrador duplicava a navegação do cliente e não compartilhava os mesmos estados de foco, transição e área segura. Ela agora usa `TabBar`, preservando os quatro destinos e o rótulo acessível específico da plataforma. A lateral desktop do admin oferece alvo mínimo de 48 px e anuncia a rota atual com `aria-current="page"`. As opções, guardas e permissões não mudaram.

Validações: ESLint, Prettier e `git diff --check` passaram nos arquivos alterados. A revisão visual em dispositivo/navegador continua pendente.

### Continuação: acesso, notificações e privacidade

O login ainda tinha uma composição própria de campos; e-mail e senha agora usam `field-label` e `field-control`, preservando OAuth, cadastro, validação, destino pós-login e mensagens. A confirmação do convite de equipe usava botões/estilos legados e erro sem o componente padrão; agora usa `Button` e `Aviso`, sem alterar consulta, confirmação, permissões ou destino.

Nas configurações compartilhadas, Alterar senha agora usa campos e ações do sistema visual; preferências de lembrete do cliente e da equipe usam `Button` para opções com estado selecionado e alvos de toque consistentes. A tela de notificações usa os mesmos botões para voltar, marcar lidas, alternar abas e abrir itens. Preferências de cookies e o banner usam os botões compartilhados; o sucesso ao salvar preferências é anunciado pelo aviso padrão. Nenhuma chamada de API, regra de consentimento, preferência, texto de negócio ou fluxo de conta foi alterado.

Validações desta continuação: Prettier, ESLint e `git diff --check` passaram nos oito arquivos desta etapa. A validação visual em navegador/dispositivo não foi executada; os testes de integração desses fluxos também não foram executados nesta etapa.

### Validação geral da branch

Prettier nos 39 arquivos `.ts`/`.tsx`/`.md` alterados: passou. ESLint nos arquivos TypeScript da branch: zero erros e um aviso preexistente em `AgendaTimeline.tsx:479` (`acompanharAgora`). `git diff --check`: passou. ESLint no repositório inteiro não é uma verificação válida neste checkout: reportou mais de 110 mil erros de regra Prettier sobre CRLF em arquivos não alterados. A tentativa de build encerrou antes de compilar, porque o plugin Lovable compara `routesDir` com separadores de caminho diferentes no Windows. Não foi possível obter verificação visual responsiva nesta execução.

### Continuação: ações da semana e horários ocupados

Na agenda semanal, cabeçalho dos dias e compromissos agora usam o `Button` compartilhado, preservando os cartões e o clique que abre o dia. No agendamento público, horários ocupados só ficam habilitados quando a lista de espera oferece uma ação; o estado de expansão do convite é anunciado. O link da lista de espera segue o mesmo botão principal do restante do fluxo, mantendo os parâmetros atuais. Disponibilidade, reserva e fila permanecem inalteradas.

Validações: Prettier, ESLint e `git diff --check` passaram nos dois componentes afetados. Não houve teste automatizado específico nem inspeção visual nesta continuação.

### Continuação: navegação profissional e galeria do cliente

As ações Menu/Recolher da navegação lateral profissional e a abertura de fotos na ficha de cliente agora usam `Button`, mantendo seus eventos e estado; a galeria preserva o botão destrutivo separado para apagar. Os alvos interativos mantêm ao menos 48 px. Validações: Prettier, ESLint e `git diff --check` passaram nos dois componentes; não houve teste de componente nem inspeção visual específica.

### Continuação: lista de espera do cliente

Na entrada `/app/espera`, a escolha de período usava botões nativos sem anunciar qual opção estava selecionada, e a ação principal recorria a um estilo legado. O grupo agora tem `fieldset`/`legend`, cada opção usa o Button compartilhado com `aria-pressed` e alvo mínimo de 48 px, e o envio usa a variante principal. Mensagens de falha são anunciadas como alerta. Períodos, validação e chamada de entrada na fila não mudaram.

Validações: Prettier, ESLint e `git diff --check` passaram. Não foi feita validação visual em navegador nesta etapa.

### Continuação: ações administrativas em parceiros e WhatsApp

Na lista de parceiros, Editar e Remover tinham alvos menores que o mínimo acessível e estilos próprios; agora usam `Button` compartilhado, variantes semântica e destrutiva, e altura mínima de 48 px. O erro de carregamento da lista de conexões WhatsApp passou a ser anunciado com `role="alert"`, e a linha expansível usa o mesmo botão compartilhado com alvo mínimo. As operações, confirmações e dados mantêm o comportamento existente.

Validações: Prettier, ESLint e `git diff --check` passaram nos arquivos afetados.

### Continuação: horários e avaliações do profissional

A tela de Horários combinava `Button` com a classe legada `btn-primary`, que podia sobrescrever o visual compartilhado; a ação agora usa a variante principal e o seletor de fuso usa `field-control`. Em Avaliações, as ações usavam classe terciária dentro de `Button`; agora seguem variantes da biblioteca. A nota comunica a seleção com `aria-pressed` e alvos de 48 px, o comentário tem nome acessível e o resultado é anunciado como estado. Lógica de horário, avaliação e persistência não mudou.

Validações: Prettier, ESLint e `git diff --check` passaram.

### Continuação: agendamento e perfil do cliente

As opções do agendamento (serviço, profissional, data e pagamento) usavam botões nativos com alvos menores e estado visual próprio. Elas agora usam `Button` com alvos mínimos de 48 px e estado selecionado anunciado, preservando as escolhas e a ordem existentes. O atalho da lista de espera e a resolução de conflito também seguem as variantes compartilhadas; falhas de confirmação são anunciadas como alerta. No Perfil, a ação de sair usa o mesmo padrão de botão das demais linhas de conta. Nenhuma regra de disponibilidade, reserva, pagamento ou autenticação mudou.

Validações: Prettier, ESLint e `git diff --check` passaram nos arquivos afetados. A verificação visual em dispositivos segue pendente.

### Continuação: ficha e carteira do cliente no painel profissional

A ficha de cliente usava estilos legados junto ao Button compartilhado em baixa parcial, quitação e arquivamento; as ações agora usam variantes semânticas e alvos mínimos de 48 px. O campo da baixa segue `field-control`, a cobrança externa usa o botão compartilhado como link, e falhas ao arquivar são anunciadas. O link de retorno ganhou área de toque adequada. Cálculos, limites, exclusão, arquivo e chamadas de persistência não foram alterados.

Validações: Prettier, ESLint e `git diff --check` passaram.

### Continuação: estado de leitura das configurações de horário

O editor de Horários mostrava valores iniciais enquanto a configuração do negócio ainda carregava. Agora o formulário só aparece depois que a configuração foi lida e aplicada ao estado local; durante a leitura, permanece o esqueleto. Se a leitura falhar sem dados disponíveis, há uma mensagem de erro e tentativa de novo. Isso evita apresentar valores fictícios como configuração existente e impede interação prematura. Não houve mudança no formato ou no salvamento das regras.

Validações: Prettier, ESLint e `git diff --check` passaram.

### Continuação: configuração inicial do profissional

O onboarding tinha uma string local de estilos de campo e combinava classes legadas com `Button` no rodapé. Campos agora reutilizam `field-control`, voltar/continuar seguem variantes secundária/principal e o botão de pular tem alvo mínimo de 48 px. A seleção do modo de agendamento anuncia o estado pressionado, as ações de copiar/WhatsApp/prévia usam componentes compartilhados, e falha na cópia informa o usuário. As etapas, opções, convites e persistência do onboarding não mudaram.

Validações: Prettier, ESLint e `git diff --check` passaram. A tela de onboarding continua sendo um componente extenso preexistente; a separação estrutural fica como pendência para uma mudança dedicada que possa preservar seu estado entre etapas.

### Continuação: pedidos administrativos e lista de agendamentos

Em Pedidos, a linha expansível agora usa Button compartilhado, os campos do diálogo seguem `field-control` e a ausência de registros tem um estado vazio explicativo. Em Agendamentos confirmados, os filtros comunicam a seleção com `aria-pressed`, respeitam alvo mínimo de 48 px e a ação Atualizar deixou de sobrepor uma classe de botão legado. A falha da consulta é anunciada como alerta. Filtros, dados, períodos e atualizações permanecem iguais.

Validações: Prettier, ESLint e `git diff --check` passaram.

### Continuação: avaliação pública pelo cliente

A avaliação após o atendimento usava ciano local fora dos tokens Cortaí, estrelas com alvo de 44 px e botões nativos. Agora usa `gold` da marca, `Button` compartilhado com alvos de 48 px, estado escolhido via `aria-pressed`, campo `field-control` e botões padronizados para enviar/compartilhar. O grupo é identificado com rótulo acessível. A nota obrigatória, dimensões opcionais, texto e integração de envio permanecem os mesmos.

Validações: Prettier, ESLint e `git diff --check` passaram.

### Continuação: recuperação no Perfil e Histórico do cliente

Os estados de falha ao ler o perfil e o histórico já ofereciam nova tentativa, mas faltava o papel de alerta para leitores de tela. Ambos agora anunciam imediatamente a falha e mantêm a recuperação no mesmo lugar. Nenhum dado ou ação mudou.

Validações: Prettier, ESLint e `git diff --check` passaram.

### Continuação: navegação e sessão do administrador

O retorno de Recursos ainda usava uma classe de link legada; agora é um Button outline como link. Sair em Perfil usa o Button fantasma com alvo mínimo e alinhamento de linha, mantendo a função de encerrar sessão sem alterar o fluxo.

Validações: Prettier, ESLint e `git diff --check` passaram.

### Continuação: lista administrativa de estabelecimentos

Busca e filtros agora têm rótulos/alvos mais consistentes, e os filtros anunciam seleção. Linhas de desktop e celular usam o Button compartilhado e o mesmo alvo mínimo; a lista vazia explica que busca/filtro podem ser ajustados. Campos do histórico de contato usam `field-control`, com altura adequada também no texto livre. Dados, filtros, status e operações de contato não mudaram.

Validações: Prettier, ESLint e `git diff --check` passaram.

### Continuação: equipe e permissões do profissional

A tela de equipe agora dá 48 px ou mais aos campos e às opções de permissão; os checkboxes ficam alinhados com seus rótulos e são mais fáceis de tocar. Convidar, salvar, recuperar acesso e remover usam variantes semânticas do Button compartilhado. A falha ao salvar a configuração de recebimento é anunciada como alerta. Papéis, permissões, valores padrão e ações de convite/remoção não mudaram.

Validações: Prettier, ESLint e `git diff --check` passaram.

### Continuação: troca entre negócios do profissional

O seletor de negócio combinava `Button` com classes legadas. A ação agora escolhe explicitamente variante outline para o negócio em uso e primary para os demais, com altura de ação consistente. A troca, a indicação de configuração e as restrições de acesso não mudaram.

Validações: Prettier, ESLint e `git diff --check` passaram.

### Continuação: painel administrativo de monetização

As abas e ações de planos, condições, cupons e campanhas agora seguem o `Button` compartilhado; os campos usam `field-control` e os estados de sucesso/erro usam `Aviso`. A exclusão de campanha pede confirmação explícita. Mantive valores, cálculos, limites, chamadas de persistência e as demais ações.

Validações: Prettier e `git diff --check` passaram. O ESLint da rota aponta dois `no-explicit-any` preexistentes em conversões de segmento; desativando apenas essa regra para validar a rota, não há outros problemas. Não há teste específico dessa tela e a inspeção visual segue pendente.

### Continuação: primeiros passos e ciclo de cobrança

O comando Pular do checklist de configuração profissional e as opções Mensal/Anual da tabela comercial agora usam `Button` e anunciam o estado escolhido. O cálculo, os preços, o conteúdo dos planos e os destinos continuam iguais. Validações: Prettier, ESLint e `git diff --check` passaram nos dois componentes; não há testes de componente específicos e falta inspeção visual responsiva.

### Continuação: respostas do agendamento em conversa

O cartão de serviço e a resposta editável da conversa ainda eram botões nativos; agora usam `Button` sem perder seleção, estilo de cartão, nome acessível ou edição da resposta. Profissional, serviço, data, disponibilidade e sequência de etapas seguem intactos. Validações: Prettier, ESLint e `git diff --check` passaram nos dois componentes. Não há teste específico encontrado nem inspeção visual em celular nesta etapa.

### Continuação: configuração inicial de horários

O editor de horários do onboarding agora usa `Button`, `field-control`, `Textarea` e `Aviso` para ações, campos e feedback. Os campos de abertura, fechamento e intervalo ganharam rótulos acessíveis; os intervalos podem quebrar em mais de uma linha no celular. A interpretação assistida, os dias padrão e os valores aplicados continuam iguais. Validações: Prettier, ESLint e `git diff --check` passaram; não há teste específico encontrado nem inspeção visual em dispositivo nesta etapa.

### Continuação: personalizações por cliente

Os campos de desconto, condições e observações da ficha agora usam os controles compartilhados, com dicas que deixam explícito o que é herdado e o que é privado. O switch de WhatsApp ganhou área mínima de toque e o botão de salvar usa a variante primária. Valores, consentimento, persistência e feedback de sucesso/erro permanecem iguais.

Validações: Prettier, ESLint direcionado e `git diff --check` passaram. Não há teste de componente específico nem inspeção visual em aparelho nesta etapa.

### Continuação: campos do editor da página pública

Os controles compartilhados do editor da página do profissional agora usam `Field`, `Input` e `Select` do sistema visual do Cortaí, alinhando rótulos, foco, altura e bordas em todas as seções que os reutilizam. Mantive valores, opções e callbacks de edição.

Validações: Prettier, ESLint direcionado e `git diff --check` passaram. O teste existente de acessibilidade não iniciou por incompatibilidade preexistente do plugin Vite `@lovable.dev/mcp-js` com caminhos Windows (`routesDir`); não foi possível validar por navegador nesta etapa.

Os campos especiais das seções de textos, redes, recepção, link e ajustes finos também passaram a compartilhar a mesma classe visual `field-control` do Cortaí. Validei o helper alterado com Prettier, ESLint e `git diff --check`; executar ESLint nos arquivos consumidores antigos revelou somente os erros de quebra de linha CRLF já existentes nesses arquivos.

### Continuação: campos do catálogo de serviços

Nome, categoria, duração, preço e intervalo de retorno passaram a usar o `Input` compartilhado, que mantém o foco e o tamanho de texto consistentes em celular. A conversão para centavos, os limites, sugestões, fotos, atribuição a profissionais e remoção confirmada seguem iguais. Prettier, ESLint direcionado e `git diff --check` passaram. O teste existente `EditorDeServicos.test.tsx` não iniciou pela incompatibilidade preexistente de caminhos Windows no plugin Vite; não houve inspeção visual em dispositivo.

### Continuação: central de avisos

As ações de marcar como lido, fechar, abrir aviso e os convites de instalação/ativação agora usam o `Button` compartilhado com alvos de 48 px e foco consistente. Grupos, contagens, navegação, notificações do navegador e animações existentes não mudaram. Prettier, ESLint direcionado e `git diff --check` passaram; não encontrei teste específico desses componentes nem validei em aparelho.

As preferências de lembrete do cliente agora usam o `Input` compartilhado para as horas de silêncio; no celular, início e fim dividem o espaço disponível sem comprimir os controles. Persistência otimista, valores e regras de lembrete não mudaram. Prettier, ESLint direcionado e `git diff --check` passaram.
