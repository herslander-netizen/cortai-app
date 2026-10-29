# Referência de UX: Figaroo → Cortaí

**Status:** diagnóstico inicial baseado na gravação recebida em 12/10/2026 e na leitura da documentação/código do repositório.  
**Escopo:** referência de experiência e organização visual; não é uma cópia de marca ou de implementação.  
**Segurança da mudança:** esta documentação foi criada em uma branch separada. Nenhum código de produção ou banco foi alterado.

## Resumo executivo

O Figaroo oferece uma experiência que combina onboarding, painel do negócio, agenda, catálogo de serviços e combos, personalização visual do site público e criação de agendamentos em etapas. O Cortaí já contém módulos equivalentes e uma arquitetura de agenda mais específica, então o caminho recomendado é **aprimorar componentes existentes**, não reconstruir o produto ou criar um motor paralelo.

A gravação apresenta uma interface clara, com superfícies verde-claras/neutras, cartões arredondados, botões de ação bem destacados e um tema público com opções visuais distintas. Esses padrões podem orientar espaçamento, hierarquia e fluxo; cores, marca, ícones e componentes devem continuar obedecendo ao contrato visual do Cortaí.

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

## Comparação com a base atual do Cortaí

A documentação existente do Cortaí já descreve:
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
2. Capturar o estado atual do Cortaí em viewport de 390 px e 1280 px para comparação objetiva.
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

- Usar o Figaroo como referência de **clareza, organização e fluxo**, sem copiar identidade, assets ou desenho pixel a pixel.
- Manter a identidade e os tokens definidos no contrato visual atual do Cortaí; não introduzir hexes, classes de cor ou estilos locais fora das exceções previstas.
- Priorizar mobile-first e validar também em desktop.
- Movimentos devem respeitar as regras atuais do projeto e a preferência por movimento reduzido.

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


## Inventário técnico inicial do Cortaí

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
- O Cortaí já tem componentes de Timeline, Lista e Modo Foco, assim como uma prévia de experiência pública. A oportunidade principal parece ser comparar detalhes de experiência e refinar componentes existentes, não criar novas superfícies concorrentes.

### Implicação para implementação

Antes de mudar a Agenda, mapear responsabilidades e testes de `AgendaOperacional` e `AgendaTimeline`. Caso seja necessário tocar nesses arquivos extensos, limitar o diff e extrair apenas uma responsabilidade que já esteja claramente delimitada. No editor público, começar por `SecaoTema`, `PreviaDaExperiencia` e pelos componentes chamados em `barbeiro.marca.tsx`. No catálogo, reutilizar `EditorDeServicos` e catalogar as diferenças antes de alterar seu fluxo.


## Atualização — mapa funcional ampliado (29/10/2026)

### Como interpretar o material recebido

O segundo mapa do Figaroo informa **112 telas e 24 módulos**, mas declara expressamente que os nomes vieram do aplicativo e que os encadeamentos entre telas foram inferidos; o corpo das funções não foi lido. Portanto, esse mapa é uma hipótese de navegação útil para orientar uma auditoria, não uma especificação verificada do comportamento interno do Figaroo. Não tratamos os nomes das classes como contrato técnico nem copiamos sua arquitetura Android/Compose para o Cortaí.

### Fluxos do Figaroo convertidos em diretrizes para o Cortaí

| Área do fluxo enviado | Diretriz de produto para o Cortaí | Situação no Cortaí / cautela |
|---|---|---|
| Entrada, login, cadastro e onboarding | Manter entrada direta e recuperar o contexto após concluir cada etapa; não duplicar contas para papéis diferentes. | Autenticação, conta única e onboarding já fazem parte da arquitetura. Revisar a sequência real, não recriar o fluxo. |
| Agenda e novo agendamento | Tratar Agenda como centro operacional; mostrar data, profissional, serviço, estado e ações contextuais; permitir corrigir escolhas sem reiniciar o fluxo. | Timeline, Lista, Modo Foco, agendamento manual/público, motor oficial de disponibilidade e bloqueios existem. O trabalho de exibir bloqueios na Timeline segue em PR isolado. |
| Reserva e bloqueio | Diferenciar atendimento, reserva e indisponibilidade; tornar duração e motivo legíveis sem permitir toques na faixa interferirem nos gestos da Timeline. | Bloqueios por período e escalas já têm funções no servidor. A visualização deve permanecer passiva; gravação/liberação continua nos fluxos autenticados existentes. |
| Intervalo pontual | Ao tocar no intervalo, permitir ajustar seu início/fim apenas para a data selecionada, com confirmação e opção de restaurar o padrão semanal. | **Não editar diretamente `horarios_de_funcionamento` para resolver uma data isolada.** Essa tabela representa regra semanal e alimenta o site público, o motor TypeScript, a validação do servidor e a função SQL. A exceção por data precisa ser integrada a todas as fontes de disponibilidade antes de liberar a UI. |
| Caixa, comanda e vendas | Preservar a sequência atendimento → comanda → cobrança → pagamento confirmado → recibo/histórico. | O domínio de comanda/financeiro já existe. Nenhuma melhoria visual pode criar falsa confirmação, retirar Pix/fiado ou contornar idempotência e permissões. |
| Clientes e marketing | Reutilizar a ficha 360°, histórico, preferências e notas com acesso restrito por negócio; separar comunicação operacional de campanhas promocionais. | Ficha de cliente e preferências estruturadas existem. Antes de reproduzir todas as telas de campanha do Figaroo, auditar a cobertura real, consentimento e canais disponíveis. |
| Pacotes e fidelidade | Deixar claros créditos/sessões restantes, validade e consequência de consumir uma sessão; impedir saldo duplicado. | Carteira e fidelidade têm domínio próprio e regras de gravação por movimentos. A cobertura de cada fluxo de pacote deve ser conferida antes de criar novas telas. |
| Serviços, categorias e combos | Diferenciar visualmente item individual, categoria e pacote de serviços; exibir preço, duração e profissionais habilitados sem repetir campos em várias telas. | O catálogo e seu editor já existem. Combos e regras avançadas devem passar por inventário funcional antes de serem marcados como completos ou reconstruídos. |
| Equipe, disponibilidade e locais | Separar jornada semanal de exceção pontual e deixar explícito a quem a regra se aplica. Não presumir que um negócio equivale a várias filiais. | Escala de profissional e bloqueio pontual existem. Modelo real de multiunidade precisa ser confirmado antes de implementar locais/filiais como nova entidade. |
| Página pública e publicação | Diferenciar salvar rascunho, prévia e publicar; usar o mesmo catálogo e identidade do negócio, sem anunciar publicação antes do sucesso real. | Editor de marca, prévias e página pública já existem. Melhorias devem reutilizar os editores atuais. |
| Avaliações, indicadores e histórico | Mostrar origem e período dos números, estados vazios e caminhos até os registros detalhados. | Há módulo de avaliações e dados financeiros/operacionais; a cobertura completa dos indicadores sugeridos precisa ser auditada sem inventar métricas. |
| Notificações e configurações | Cada aviso deve abrir o destino correto e respeitar o papel; opções de conta, negócio e assinatura não devem se misturar. | Sino/central de avisos e configurações de preferências existem. O roadmap registra itens de validação real de push e links de remarcação. |
| Galeria e funções de desenvolvedor | Reusar o seletor de mídia e validar tipo/tamanho; superfícies de desenvolvimento nunca devem aparecer para usuários comuns. | Usar utilitários de mídia existentes quando aplicáveis. Ferramentas internas não são requisito de produto para o cliente final. |

### Sequência de trabalho recomendada

1. **Estabilizar a Agenda:** terminar a camada visual das faixas de bloqueio em PR separado, validar erros de carregamento, filtro por profissional, fuso do negócio, toque/rolagem e responsividade.
2. **Implementar intervalo excepcional por data com segurança:** primeiro modelar a exceção, permissões/RLS e testes; depois integrar o mesmo resultado no motor TypeScript, na consulta pública, na validação do servidor, no SQL que confirma o agendamento e em qualquer consumidor de disponibilidade; só então expor o ajuste rápido no painel.
3. **Auditar os fluxos transacionais:** novo agendamento → atendimento → comanda → pagamento → histórico. Testar sucesso, falha, repetição, concorrência e desfazer sem transações financeiras reais.
4. **Auditar módulos de negócio por evidência:** serviços/combos, pacotes, clientes/campanhas, equipe/escala, página pública, avaliações/indicadores, notificações e assinatura. Classificar cada fluxo como confirmado, parcial, ausente ou não validado em execução.
5. **Aplicar polimento visual de forma transversal:** usar tokens e componentes existentes, movimento reduzido, alvos de toque de pelo menos 48 px, texto mínimo de 12 px e foco visível; testar 390 px e 1280 px.
6. **Congelar a versão e executar piloto real** antes de ampliar funcionalidades ou escalar.

### Regras de implementação

- Não importar literalmente os 112 nomes de tela nem criar 24 módulos paralelos.
- Não considerar uma rota ou um arquivo como prova de que o fluxo está completo.
- Não alterar a regra semanal para simular uma exceção de data.
- Não criar nova fonte de verdade para horários, status, pagamentos ou permissões.
- Nenhuma migração destrutiva; novas tabelas/colunas devem ser aditivas, justificadas e cobertas por RLS/testes.
- Cada entrega deve permanecer em branch/PR, passar por TypeScript, testes e build e receber revisão visual real antes de ser integrada.
- Não publicar o site nem mesclar mudanças automaticamente como consequência deste mapa.

### Decisão de produto

O Figaroo serve como referência de organização e descoberta, não como lista obrigatória de funcionalidades. A prioridade é **fechar lacunas reais no Cortaí existente**, começando por clareza e confiabilidade da Agenda e do fluxo de cobrança. Recursos como multiunidade ou campanhas avançadas só entram depois de confirmada a necessidade, a viabilidade do modelo atual e o valor para os segmentos atendidos.
