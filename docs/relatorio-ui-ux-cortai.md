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
