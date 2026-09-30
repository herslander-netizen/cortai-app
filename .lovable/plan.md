# Redesenho operacional do Modo Foco

## Objetivo
Transformar o Modo Foco na tela de trabalho do profissional durante o expediente: leitura imediata, uma ação principal por momento e acesso às exceções sem sair da agenda. A implementação deve reutilizar a agenda, transições, fila, perfil do cliente, comanda, pagamentos e permissões existentes, sem criar motor paralelo nem alterar regras de disponibilidade.

## Auditoria do estado atual

- No celular, a agenda já troca automaticamente para `AgendaFocoMobile`; no desktop permanece a agenda completa. O “Modo foco” atual apenas solicita tela cheia e esconde resumo, profissionais e dicas, portanto ainda não é um modo operacional consistente entre tamanhos.
- O modo atual já oferece: hoje/dia, filtro por profissional, status online, fila, resumo, linha do tempo, cliente em atendimento, próximo cliente, progresso, ações Chegou/Começar/Terminar, novo agendamento, encaixe, bloqueio e venda.
- A agenda principal já concentra as fontes corretas: atualização a cada 15 segundos e em tempo real, cache somente para leitura sem internet, estado otimista com desfazer, proteção contra dois atendimentos simultâneos, fluxo de comanda, pagamentos pendentes, “Meu dia” e ficha completa do cliente.
- Informações importantes já carregadas, mas pouco visíveis no foco: `ficha`/condições especiais, confirmação pelo WhatsApp, forma de pagamento, valor, tempo de chegada/início e situação da comanda.
- Lacunas confirmadas: ausência de uma visão desktop do foco; ausência de erro/tentar novamente na experiência móvel; ações secundárias dependem de toque longo; notas e histórico ficam escondidos; “atraso” não tem ação explícita no foco; o estado encerrado não existe; o texto de contato móvel assume “barbearia”; pagamentos pendentes e resumo individual não aparecem no foco.
- Não é necessária migração de banco: os dados e fluxos essenciais já existem.

## Experiência proposta

### O que precisa ser entendido em 3 segundos

A primeira dobra mostrará somente:

1. **Estado do expediente:** “Próximo”, “Agora”, “Atrasado”, “Intervalo” ou “Encerrado”, sempre calculado no fuso do negócio.
2. **Cliente em contexto:** nome, horário, serviço, duração e confirmação.
3. **Alerta crítico:** alergia/condição especial ou observação relevante, quando houver.
4. **Relógio operacional:** tempo até começar, tempo decorrido/restante ou minutos de atraso.
5. **Próxima ação:** um botão dominante adequado ao estado — Chegou, Iniciar atendimento, Concluir e cobrar, ou Chamar fila.
6. **Próximo da sequência:** nome e horário, em uma linha, para antecipação sem desviar o foco.

### Estados do dia

- **Próximo:** nenhum atendimento em curso; destaca o primeiro agendamento válido e o tempo restante. Ações: confirmar chegada, avisar atraso operacional, abrir notas.
- **Agora:** cliente `na_cadeira`; mostra progresso real, serviço, duração, observação crítica e próximo horário. Ação dominante: “Concluir e abrir comanda”.
- **Atrasado:** agendamento passou da tolerância oficial e ainda está `agendado`; mostra minutos de atraso. Ações: “Chegou”, “Aguardar”, “Marcar falta” e aviso contextual.
- **Intervalo:** não há atendimento em curso e existe folga antes do próximo; mostra duração da pausa e próximo compromisso. Ações: encaixe, chamar fila ou bloquear período.
- **Encerrado:** não restam atendimentos operacionais no dia; mostra atendimentos concluídos e pendências reais de pagamento. Ações: resolver pagamento pendente ou voltar ao painel.
- **Sem agenda:** estado distinto de encerrado; oferece novo agendamento, encaixe e fila, sem métricas decorativas.
- **Sem internet:** mantém somente leitura do último cache identificado pelo tenant; toda mutação permanece desabilitada e há ação “Tentar sincronizar”.
- **Erro sem cache:** mensagem clara, tentar novamente e saída para o painel normal.

### Ações sem sair da tela

- Marcar chegada, iniciar, concluir e desfazer dentro da janela oficial.
- Abrir e concluir a comanda oficial: serviço, produtos, desconto quando permitido, Pix/cartão/dinheiro/fiado/plano ou envio à recepção.
- Ver ficha rápida do cliente: alerta, preferências, última foto/resultado, último atendimento, faltas e observação; editar usando o componente oficial quando permitido.
- Remarcar, cancelar, marcar falta e aguardar, sempre pelas transições existentes.
- Criar agendamento, iniciar encaixe, chamar fila e bloquear horário pelos fluxos oficiais.
- Exibir pagamentos pendentes somente a quem pode receber.
- Enviar apenas avisos operacionais contextuais existentes; não transformar WhatsApp em chat livre/SAC.

### O que fica escondido

- Relatórios completos, configurações, branding, equipe, crescimento, comissões e demais gestão.
- Agenda semanal, métricas amplas e histórico completo de finalizados durante o atendimento.
- Filtros de toda a equipe para o barbeiro: abrir focado automaticamente no profissional vinculado; “Todos” permanece disponível para dono/recepção conforme permissões.
- Ações destrutivas ou raras ficam em “Mais ações”, com confirmação. Nada depende de toque longo; o gesto pode continuar apenas como atalho.
- Valores financeiros detalhados ficam ocultos para quem não tem permissão. Para o barbeiro, “Meu dia” permanece resumido e recolhível.

## Estrutura por dispositivo

### Mobile — 390 px

```text
[logo/menu]  Hoje · Ao vivo  [sair do foco]
[estado + relógio operacional]
[cliente atual/próximo + alerta crítico]
[ação principal em largura total]
[próximo atendimento]
[agenda restante recolhida]
[+ ações rápidas]
```

- Alvos de toque mínimos de 44 px, ação principal fixa sem cobrir conteúdo, safe areas e teclado preservados.
- Folhas inferiores para cliente, ações secundárias, fila e comanda; fechar devolve exatamente ao mesmo item e posição.
- Finalizados recolhidos por padrão; rolagem automática apenas na primeira entrada ou mudança real do atendimento ativo.

### Desktop — 1280 px

- Modo Foco passa a ser uma escolha explícita, sem substituir a agenda completa.
- Área principal larga com atendimento atual/próximo e ação dominante; faixa lateral compacta com sequência do dia, fila e pendências permitidas.
- Ficha e comanda abrem na lateral ou modal existente, sem navegar para outra página.
- Botão persistente “Voltar ao painel normal” restaura dia, profissional e item selecionado.

## Arquitetura e reutilização

- `src/components/barbeiro/AgendaOperacional.tsx`: continuará sendo o único controlador de queries, tempo real, cache, filtros, transições, conflito, fila e abertura de modais.
- `src/components/barbeiro/AgendaFocoMobile.tsx`: evoluir para apresentação compartilhada do foco; separar pequenos blocos de estado somente se reduzirem duplicação.
- `src/lib/barbeiro.functions.ts`: manter `getAgendaDia`, `getAgoraProximo` e `mudarEstadoAtendimento`; nenhuma nova regra de agenda na interface.
- `src/lib/atendimento.functions.ts` e `src/components/barbeiro/AtendimentoRapido.tsx`: reutilizar encaixe e fila com suas permissões atuais.
- `src/components/financeiro/FechamentoComanda.tsx` e `src/lib/financeiro.functions.ts`: reutilizar fechamento, pagamento, envio à recepção, pendências e “Meu dia”.
- `src/components/cliente-perfil/PerfilClienteSheet.tsx` e `src/lib/perfil-cliente.functions.ts`: reutilizar ficha, alertas, fotos e histórico.
- `src/lib/resumo-dia.ts`: ampliar apenas cálculos puros de apresentação, sem reinterpretar disponibilidade.
- `src/components/layout/ManagementDrawer.tsx` e `src/lib/navegacao-barbeiro.ts`: fornecer saída clara ao painel e navegação compatível com permissões.
- `src/styles.css`: consolidar os estilos responsivos e tokens sem criar identidade paralela.
- `src/routes/barbeiro.index.tsx` e `src/routes/barbeiro.agenda.tsx`: preservar as rotas atuais; o estado do modo pode ser busca validada ou preferência local, sem nova rota concorrente.

## Etapas de implementação

1. Extrair um modelo puro de apresentação que derive estado do expediente, cliente em contexto, próximo, atraso, intervalo e encerramento a partir dos itens já carregados e do fuso oficial.
2. Tornar o Modo Foco explícito e disponível em mobile e desktop, mantendo a Agenda normal como alternativa e preservando contexto ao alternar.
3. Reorganizar a hierarquia para estado, cliente, alerta, relógio e ação principal; substituir dependência de toque longo por um botão acessível de mais ações.
4. Conectar ficha rápida, comanda, pagamento pendente, fila, encaixe, remarcação, cancelamento e falta aos componentes e funções atuais.
5. Implementar loading, erro com retry, cache somente leitura, sincronização, vazio e encerrado; anunciar mudanças de estado com `aria-live` sem excesso.
6. Remover texto específico de barbearia onde o segmento não estiver explícito e usar `segmentos.ts` para rótulos; manter a proposta otimizada para o papel barbeiro.
7. Cobrir comportamento com testes unitários do modelo de estados e testes de interação dos fluxos principais, sem modificar banco.
8. Validar em 390 px e 1280 px: entrada/saída do foco, próximo→chegou→agora→comanda, atraso/falta, intervalo/fila, encerrado, permissões, offline, loading e erro. Rodar TypeScript, lint dirigido, testes e build.

## Critérios de aceite

- Em até 3 segundos, o profissional identifica quem atende, o estado do horário e a próxima ação.
- Chegada, início, conclusão/comanda, notas, atraso, falta, remarcação, fila e encaixe funcionam sem sair da agenda.
- Nenhuma mutação é executada offline; nenhuma regra de disponibilidade ou conflito é duplicada na interface.
- Ações e dados respeitam permissões e isolamento por tenant já aplicados no servidor.
- Mobile e desktop têm o mesmo modelo de estado, com composição apropriada a cada tamanho.
- O retorno à agenda normal preserva o contexto operacional.
- Nenhuma migração ou alteração de dados reais é necessária para esta entrega.
