# Matriz de recuperação Figaro → Cortaí
**Data da auditoria:** 21/10/2026  
**Branch analisada:** `cloudflare-workers-migration-2026-10-13`  
**Referências:** APK completo `Figaroo.apk` fornecido pelo dono; documentação técnica existente em `docs/referencia-figaro/apk/`; código atual do Cortaí.  
**Escopo desta rodada:** configurações do aplicativo/negócio, onboarding, painel de funcionalidades e personalização/layout da página pública. A Agenda tem sua própria frente de recuperação e não é alterada nesta tarefa.

## Objetivo e regra de interpretação

Recuperar no Cortaí a experiência que o dono perdeu ao deixar de ter o Figaro: organização das telas, navegação, cartões, editores, prévias, etapas, estados e feedbacks. **Não** portar o app Android literalmente nem substituir o backend atual.

- **Confirmado no APK:** nome/classe/tela identificada no pacote; para os detalhes visuais, usar a especificação ou vídeo citado.
- **Confirmado no Cortaí:** rota/componente encontrado no código da branch. Isso não prova que esteja visualmente equivalente nem que todos os estados estejam corretos em execução.
- **Diferença confirmada:** há uma diferença concreta de estrutura ou capacidade no código/documentação atual.
- **Validar visualmente:** pode existir a função, mas falta conferir a experiência real em celular e desktop.
- **Sem evidência suficiente:** não transformar a ausência de documentação em afirmação de que o recurso não existe.

## Resumo executivo

O Cortaí já possui uma base funcional ampla: onboarding em etapas, painel de funcionalidades, conta/negócio, temas, editor da página pública com prévia, rascunho/publicação e componentes de conteúdo. A recuperação mais importante, portanto, é **restaurar o modelo de navegação e edição do Figaro** — especialmente o centro “Sua Página”, a experiência Layout & Tema e a organização de configurações — sem criar uma segunda lógica de agendamento ou de publicação.

A lacuna mais nítida é a diferença entre os modelos de personalização:

- **Figaro:** hub “Sua Página” → cartão “Layout & Tema” → catálogo de layouts/temas → prévia de exemplo → salvar; editores independentes por seção; prévia do rascunho; ações de publicar, descartar, editar link/QR e tirar do ar.
- **Cortaí:** editor unificado em `/barbeiro/marca`, com painéis para experiência, conteúdo, textos, tema/cores, imagens, ajustes finos, link/contato, redes e versões, mais prévia ao vivo e ações de salvar rascunho/publicar. É uma base útil, mas **não é ainda a mesma arquitetura de experiência do Figaro**: o catálogo de temas é local/fixo e os controles estão agrupados num único editor.

A prioridade é reorganizar a experiência e fechar as diferenças comprovadas, não reescrever funcionalidades que já funcionam.

## 1. Personalização da página pública — prioridade máxima

### 1.1 Fluxo original do Figaro

A especificação do APK em `docs/referencia-figaro/apk/4-pagina-publica.md` confirma este fluxo:

1. A partir da gaveta da Agenda, abrir o cartão **Sua Página**, que informa o estado da página (Online, Offline ou Draft).
2. Entrar no hub **Personalizar Página**, que reúne estado, seções editáveis e o cartão **Layout & Tema**.
3. Em Layout & Tema, selecionar layout e tema em dois acordeões exclusivos. Cada painel abre um carrossel horizontal de cartões com imagem, descrição, seções disponíveis e marca de seleção.
4. Abrir **Ver Exemplo** para comparar a combinação layout/tema antes de salvar.
5. Salvar alterações e voltar ao hub com atualização dos dados.
6. Abrir editores separados de Hero, Serviços, Equipe, Galeria, Avaliações, Localidades, Formulário de contato e Redes sociais.
7. Ver uma prévia do rascunho; publicar apenas depois de validar as seções obrigatórias do layout; descartar alterações com confirmação.
8. Pelo menu de contexto, editar o link/slug, abrir QR Code ou tirar uma página publicada do ar com confirmação.

**Comportamentos importantes do Figaro documentados:** catálogo de layouts e temas vindo do servidor; seções disponíveis e obrigatórias dependem do par layout/tema; ao mudar layout, manter o tema se compatível, senão escolher o primeiro tema disponível; erro de catálogo com opção “Tentar novamente”; barra inferior persistente com “Ver Exemplo” e “Salvar Alterações”; retorno aos hubs recarrega os dados depois de salvar. Publicar, descartar e tirar do ar têm estados de carregamento e erros explícitos.

### 1.2 Estado atual do Cortaí

**Confirmado no código:**

- Rota de entrada/hub: `src/routes/barbeiro.sua-pagina.tsx`, com o negócio, link público, indicador de alterações pendentes, resumo visual de Layout & Tema e avisos acionáveis para as lacunas reais retornadas pelo backend (serviços ativos, profissionais e dias abertos). As lacunas são avisos, não bloqueios de publicação. O status Online/Offline do Figaro ainda não tem equivalente comprovado no contrato Cortaí e não é simulado.
- Rota principal do editor: `src/routes/barbeiro.marca.tsx`.
- Painéis: `src/components/marca/editor/PaineisDoEditor.tsx`.
- Seleção de tema: `SecaoTema.tsx`; prévia: `PreviaDaExperiencia.tsx`; estado e ações: `useEditorDaPagina.ts`.
- O editor já oferece experiência de agendamento, conteúdo/seções, textos e CTA, temas/cores, imagens, detalhes visuais, link/contato, redes sociais e versões anteriores.
- Existe prévia ao vivo e alternância mobile/desktop para a experiência vitrine; em celular a prévia abre em uma folha.
- Existem ações distintas **Salvar rascunho** e **Publicar**, link público, compartilhar/copiar e restauração de versões como rascunho.
- `src/lib/pagina-config.ts` define localmente sete layouts (os cinco originais do Cortaí mais “Site Completo” e “Agendamento” recuperados da referência Figaro), 16 IDs de tema (13 originais mais “Clássico”, “Retro” e “Rock n’ Roll” em versões com paleta adaptada) e uma lista de componentes configuráveis.
- `/barbeiro/temas` redireciona para `/barbeiro/marca`; o editor exige a capacidade `branding_avancado`.

### 1.3 Diferenças e recuperação recomendada

| Item | Diagnóstico | Recuperação recomendada |
|---|---|---|
| Hub “Sua Página” | **Primeira etapa implementada na branch:** `/barbeiro/sua-pagina` apresenta o negócio, endereço público, situação de alterações no editor e ações de abrir/copiar link; a navegação de Aparência leva ao hub. Ainda falta confirmar visualmente os estados Online/Offline/Draft e métricas do Figaro. | Validar na prévia e depois completar estado real, métricas e ações extras como QR/offline apenas quando houver suporte comprovado. |
| Catálogo Layout & Tema | **Implementado de forma compatível com o modelo atual do Cortaí:** a seleção continua local e validada por `pagina-config.ts`; não foi encontrado contrato equivalente ao catálogo remoto do Figaro. Foram acrescentados os dois nomes de layout vistos nos quadros (“Site Completo” e “Agendamento”), preservando os cinco layouts anteriores. | As sete opções são suportadas pelo schema atual, sem migrar dados. Catálogo dinâmico, metadados/compatibilidade por layout e seções obrigatórias dependentes do par layout/tema continuam pendentes, pois exigiriam contrato e decisão de produto. |
| Seleção visual | **Implementado na branch:** a aba “Layout & Tema” abre por padrão; dois acordeões exclusivos mostram carrosséis horizontais com encaixe por cartão, miniaturas, descrições, estado selecionado e seções ativas no Cortaí. O hub `Sua Página` exibe resumo gráfico do layout/tema, paleta e contagem de seções. O selo de seleção aparece com uma animação curta de escala/opacidade; o acordeão do Cortaí mantém o movimento de abrir/fechar existente. **Fidelidade restante:** o APK usa fade de conteúdo e mola de chevron (stiffness 1500, damping ratio 0,75); confirmar/ajustar a execução visual do Cortaí para esses detalhes. Não representa matriz dinâmica de compatibilidade por layout. | Conferir cartões e hub na prévia em 390 px/1280 px; validar abertura, fechamento, seleção, gesto de rolagem horizontal e preferência de movimento reduzido. |
| “Ver Exemplo” | **Implementado como prévia da edição atual:** o botão abre a prévia que usa o conteúdo real e as escolhas atuais; no celular usa uma folha animada do Cortaí. **Diferença funcional/animada:** o Figaro navega para uma tela de exemplo independente em WebView e retorna ao Layout & Tema; a folha não é a mesma transição. | A prévia deve refletir cada troca de layout/tema antes de salvar. Na próxima rodada, recuperar a transição de ida/volta mais próxima do Figaro sem retirar a prévia responsiva atual; manter separadas “Salvar rascunho” e “Publicar”. |
| Seções disponíveis/obrigatórias | **Validar:** o Cortaí possui interruptores de componentes e um painel de lacunas; ainda é necessário verificar, em execução, se a lista é dependente do layout/tema e se a publicação bloqueia seções obrigatórias exatamente quando necessário. | Comparar `LacunasDaPagina`, `SecaoConteudo` e o servidor de publicação com a regra do APK. Não duplicar a validação no cliente como fonte de verdade. |
| Edição por seção | **Melhorada na branch:** os blocos da página foram agrupados visualmente em “Seções ativas” e “Seções inativas”, com ícone, nome, descrição e controle para ocultar/ativar. O foco do teclado é restaurado quando uma seção muda de grupo. **Diferença restante:** a edição dos dados de cada seção continua a usar os formulários existentes; não foi criada uma tela de edição individual por cada seção. | Testar o comportamento de ativação/desativação e a acessibilidade em celular e desktop; depois decidir quais seções precisam de tela dedicada. |
| Estado Online/Offline/Draft | **Parcial/validar:** Cortaí distingue rascunho e publicação, mas falta confirmar que o estado publicado/offline é exibido de forma evidente e que “tirar do ar”/reativar segue o mesmo ciclo visual do Figaro. | Exibir status real da página e oferecer ações coerentes com o estado. Nunca mostrar sucesso antes da confirmação do servidor. |
| Descartar rascunho | **Parcial:** há ação para descartar alterações e voltar ao publicado, além de versões anteriores. | Comparar confirmação, texto, efeito e tratamento de erro com o Figaro; preservar histórico e deixar explícito que o publicado não muda ao salvar rascunho. |
| Link/slug e QR Code | **Parcial:** o Cortaí edita o slug em `SecaoLink` e compartilha/copia o link; QR Code separado não foi confirmado nesta inspeção. | Verificar se há QR Code equivalente. Se não houver, decidir se é prioritário implementá-lo sem criar outro sistema de links. |
| Galeria/mídia | **Parcial:** o Cortaí aceita logo/capa e imagens no editor; o APK tem seletor de mídia compartilhado entre Hero e Galeria. | Comparar seleção, reutilização, múltiplas imagens, ordenação, remoção, carregamento e limites de arquivo. Não assumir paridade só porque há upload. |

**Arquivos Cortaí a auditar na execução da próxima etapa:** `PaineisDoEditor.tsx`, `LacunasDaPagina.tsx`, `SecaoConteudo.tsx`, `SecaoTema.tsx`, `SecaoImagens.tsx`, `SecaoLink.tsx`, `SecaoVersoes.tsx`, `useEditorDaPagina.ts`, `pagina-config.ts`, `marca.functions.ts` e funções de publicar/rascunho.

## 2. Onboarding — prioridade alta

### 2.1 Evidência do APK

A inspeção estática do APK identifica as telas/componentes `WelcomeScreen`, `TeamOnboardingScreen`, `ServicesOnboardingScreen`, `LocationsOnboardingScreen`, `OnboardingCompleteScreen` e `InlineOnboardingDashboard`, além de um scaffold de etapas e estado persistido de onboarding. Isso confirma um fluxo guiado com entrada, equipe, serviços, localidades e conclusão. **A sequência exata, regras de obrigatoriedade, transições e layout de cada etapa ainda precisam ser descritos quadro a quadro antes de declarar paridade visual.**

### 2.2 Estado atual do Cortaí

- `/comecar`: escolha de contexto/segmento e criação do negócio.
- `/barbeiro/configurar`: wizard de configuração do negócio com etapas persistidas: Negócio, Equipe, Serviços, Horários, Regras, Agendamento, Link e Pronto.
- `src/components/onboarding/PrimeirosPassos.tsx`: checklist pós-onboarding, baseado em itens detectados no banco, com progresso e links diretos.
- Há componentes reutilizados para editar serviços e horários; o progresso pode ser retomado e as etapas podem ser puladas quando permitido.
- O Cortaí tem uma etapa explícita de horário/regras/modo de agendamento que não coincide exatamente com o inventário de telas do APK. O APK identifica uma etapa de localidades, mas a existência de uma etapa equivalente no Cortaí não foi confirmada nesta inspeção.

### 2.3 Recuperação recomendada

1. Separar a jornada de **criar conta/negócio** do onboarding de **configurar e ativar o negócio**, mantendo o fluxo atual de autenticação e recuperação de sessão.
2. Recuperar a apresentação guiada do Figaro: uma tarefa principal por etapa, estado de progresso legível, ações Voltar/Continuar/Pular coerentes e persistência ao sair/retornar.
3. Manter o atalho “Trabalho sozinho” e os casos de negócio sem equipe; não obrigar a cadastrar funcionários quando o dono trabalha sozinho.
4. Comparar o passo de serviços: inclusão, edição, preço, duração, profissional associado, sugestão e estado vazio. Reaproveitar o editor existente, sem criar um segundo catálogo.
5. Investigar a etapa de localidades do Figaro. **Não** criar um modelo de filiais/localizações no banco por suposição: primeiro decidir se no Cortaí ela corresponde a endereço do negócio, locais de atendimento da equipe ou múltiplos negócios separados.
6. A conclusão deve levar para a área operacional e manter um checklist útil, sem prender o usuário num onboarding obrigatório depois que o negócio já está configurado.

**Critérios de aceite:** reabrir e continuar na etapa salva; voltar sem perder os dados; erro de gravação recuperável; estado “Pronto” só após confirmação; nenhuma etapa marcada como concluída sem que a condição tenha sido realmente satisfeita ou explicitamente pulada.

## 3. Configurações do aplicativo e do negócio — prioridade alta

### 3.1 Telas identificadas no APK

O APK contém módulos específicos de:
- **Configurações da conta:** perfil, métodos de login, verificação de e-mail, alteração de e-mail, senha, configuração de acesso e assinatura.
- **Configurações do negócio:** informações do negócio, configurações de agendamento, configurações de notificações e edição do link da página.
- **Personalizar Página:** especificada separadamente na seção 1.

A existência dessas classes no APK confirma módulos; não basta, sozinha, para afirmar os detalhes visuais exatos de cada tela.

### 3.2 Mapeamento atual do Cortaí

| Área | Onde está no Cortaí | Estado da recuperação |
|---|---|---|
| Hub de Ajustes | `DrawerAjustes.tsx` e `/barbeiro/mais` | O drawer inclui agora “Sua Página” e distingue “Aparência do aplicativo” da configuração da página pública; “Avisos e notificações” leva à seção de preferências. A folha de Ajustes abre/fecha com a animação existente do Cortaí. Comparar ainda com o caminho de tela do Figaro e validar a navegação por toque/volta. |
| Conta e segurança | `/barbeiro/conta`, `AlterarSenha`, `SegurancaDaConta`, preferências de privacidade e instalação PWA | Base existe. Validar estados de e-mail verificado, método de login, alteração de senha/e-mail, falha e confirmação; não criar fluxo de autenticação paralelo. |
| Informações do negócio | `/barbeiro/conta` e etapas de `/barbeiro/configurar` | Há dados do negócio e configuração inicial, mas a separação entre perfil, informações comerciais e preferências precisa ser comparada ao Figaro. |
| Preferências de agendamento | `/barbeiro/configurar`, `/barbeiro/horarios` | Há regras, horários e modo de agendamento. Verificar se o usuário encontra cada configuração na área esperada e se valores atuais são mostrados antes de salvar. |
| Notificações | `/barbeiro/mais`, `PreferenciasDeAvisos` e abas de `/barbeiro/cortai` | Há preferências e configurações de WhatsApp. Precisa de auditoria de agrupamento e clareza entre notificações do negócio e mensagens ao cliente. |
| Assinatura | `/barbeiro/plano` | Há planos, cobrança e histórico. Comparar somente apresentação e caminho de navegação; não copiar planos/preços do Figaro. |
| Aparência do app | `ThemeToggle` e identidade do painel | Há tema/identidade. Separar visualmente a aparência do painel da aparência da página pública; são configurações diferentes. |
| Funcionalidades opcionais | `/barbeiro/funcionalidades`, `src/lib/funcionalidades.ts` | Painel real com grupos, dependências e fontes de interruptor. Não substituir por interruptores cosméticos. |

### 3.3 Diferenças e recuperação recomendada

- **Uma arquitetura clara de Ajustes:** manter título/descrição fixos no topo da gaveta de Ajustes (correção recente) e permitir que a lista de opções role independentemente. Preservar espaçamento e separação visual.
- **Agrupamento consistente:** “Conta”, “Negócio”, “Agendamento”, “Notificações”, “Aparência do aplicativo”, “Página pública”, “Funcionalidades” e “Plano” precisam ser encontráveis sem espalhar a mesma configuração em vários lugares. Esta é uma recomendação de arquitetura de informação; a localização final deve respeitar as rotas e permissões atuais.
- **Configuração do negócio versus configuração da conta:** nunca misturar e-mail/senha da pessoa com horário de funcionamento, página pública ou notificações do negócio.
- **Feedback de salvamento:** cada tela deve diferenciar carregando, alterado/não salvo, salvando, salvo e erro; não usar toast de sucesso quando o servidor falhar.
- **Permissões:** a interface deve esconder ou desabilitar apenas o que a permissão realmente impede; a autorização do servidor/RLS continua sendo a proteção real.

## 4. Painel de funcionalidades — prioridade média/alta

O Cortaí já tem `/barbeiro/funcionalidades` e `GRUPOS_DE_FUNCIONALIDADES`, com grupos Atendimento, Comunicação, Relacionamento, Financeiro, Vendas, Crescimento, Aparência e Equipe. Os itens se ligam a interruptores reais, plano, dependências e permissões; a tela confirma o estado salvo e pede confirmação quando desligar uma função afeta dependentes.

**Não reconstruir a lógica.** A recuperação deve comparar a apresentação do Figaro e, sobretudo, verificar:
- se o catálogo é agrupado por objetivo com descrições claras;
- se funções indisponíveis pelo plano ficam explicadas sem parecer falha;
- se dependências e efeitos de desligar estão claros antes de confirmar;
- se cada item leva à tela correta para configurar detalhes;
- se o estado visual reflete o estado persistido após erro/recarregamento.

A lista de funcionalidades do Figaro não está descrita em profundidade na especificação atual do APK. Até fazer a leitura específica desse módulo, qualquer alegação de paridade de itens deve ficar como **sem evidência**.

## 5. Navegação e módulos restantes

O inventário do APK confirma áreas de clientes, equipe, serviços, combos, locais, fidelidade/pacotes, comandas/checkout, vendas, histórico, indicadores, marketing, avaliações e notificações. O Cortaí tem rotas para boa parte dos domínios — entre elas `/barbeiro/clientes`, `/barbeiro/equipe`, `/barbeiro/servicos`, `/barbeiro/fidelidade`, `/barbeiro/financeiro`, `/barbeiro/caixa`, `/barbeiro/avaliacoes`, `/barbeiro/crescimento`, `/barbeiro/indicacoes` e `/barbeiro/produtos`.

A próxima rodada deve avaliar cada módulo com a mesma matriz: ponto de entrada no menu, lista, detalhe, criar/editar, folhas de ação, estados vazio/carregando/erro, confirmação, retorno e mobile. A presença de uma rota não significa que todos os fluxos do Figaro tenham sido recuperados.

## 6. Ordem de execução proposta

### P0 — Restaurar a experiência central
1. **Feito na branch, validação visual pendente:** criado o hub `Sua Página` e reorganizado `Layout & Tema` em acordeões e carrosséis; confirmar a experiência real em 390 px/1280 px e o ciclo rascunho/publicação.
2. Definir o hub `Sua Página` como entrada da personalização e ligar cada seção ao editor focado correspondente.
3. Conferir se layouts/temas e seções obrigatórias são uma configuração dinâmica ou um catálogo estático; decidir a lacuna antes de mexer no contrato de dados.
4. Fazer auditoria visual do onboarding em 390 px, incluindo retomar, voltar, pular, erro e conclusão.

### P1 — Configurações e organização
5. Comparar todas as opções de Ajustes e sua navegação com os módulos de conta/negócio do APK.
6. Verificar configurações de agendamento, notificações e acesso, incluindo estados salvos e mensagens de erro.
7. Fazer auditoria de painel de funcionalidades sem alterar a matriz de planos, permissões ou dependências.

### P2 — Paridade dos outros módulos
8. Clientes, equipe, serviços, combos, locais, fidelidade/pacotes, comandas/vendas, indicadores, marketing, avaliações e notificações.
9. Revisar estados vazios, skeletons, erros recuperáveis, acessibilidade, movimento reduzido e comportamento de rolagem.

## 7. Critérios de aceite globais

- **Animações fazem parte da paridade:** preservar direção, duração, curva/mola, resposta ao toque, fade, expansão/recolhimento, navegação de ida/volta, progressos e estados de sucesso/erro documentados no APK/vídeos. Não substituir por telas estáticas nem remover movimentos existentes sem evidência.
- Respeitar `prefers-reduced-motion`; registrar quando a variante reduzida altera somente o movimento, não as informações nem o estado funcional.
- Comparação com o APK/vídeos e referência específica registrada; observação direta separada de inferência.
- Fluxos principais testados em viewport de **390 px** e **1280 px**, tema claro e escuro.
- Sem duplicar regras de disponibilidade, publicação, autenticação, permissões ou cobrança.
- Sem mudanças de banco, publicação principal ou `main` sem autorização.
- Rascunho, publicar, descartar e tirar do ar com estados e confirmações verdadeiros.
- Nenhum texto de sucesso se a operação não foi confirmada pelo servidor.
- TypeScript, testes e build passando; validação visual da prévia registrada separadamente.
- Quando não houver evidência suficiente no APK, registrar **“sem evidência”** e não inventar a experiência perdida.

## Fontes verificadas nesta auditoria

- `docs/referencia-figaro/apk/README.md`
- `docs/referencia-figaro/apk/1-design-system.md`
- `docs/referencia-figaro/apk/4-pagina-publica.md`
- APK completo recebido em `Figaroo-para-Codex.zip` (pacote Android identificado como `com.figaroo.android`; classes de onboarding, account settings, company settings e page settings).
- Código da branch de trabalho: `src/routes/barbeiro.marca.tsx`, `src/components/marca/editor/PaineisDoEditor.tsx`, `src/components/marca/editor/useEditorDaPagina.ts`, `src/lib/pagina-config.ts`, `src/routes/barbeiro.configurar.tsx`, `src/components/onboarding/PrimeirosPassos.tsx`, `src/routes/barbeiro.conta.tsx`, `src/routes/barbeiro.funcionalidades.tsx`, `src/components/layout/DrawerAjustes.tsx`, `src/routes/barbeiro.mais.tsx`.
