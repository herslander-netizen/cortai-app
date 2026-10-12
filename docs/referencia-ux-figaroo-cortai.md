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
