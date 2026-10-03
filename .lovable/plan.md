# Agenda com visão de equipe e individual

## Resultado
A Agenda existente será reorganizada para mostrar primeiro o dia, a equipe e o que acontece agora, preservando todos os dados, ações, filtros e regras atuais.

## Implementação
- Substituir o calendário semanal expandido por um cabeçalho compacto com mês/data, setas e botão Hoje somente fora da data atual; o mês completo abrirá em uma folha e fechará após a seleção.
- Evoluir o seletor horizontal para `Todos` + profissionais com avatar, nome e estado claro (`Livre` ou `Em atendimento`), sem contagens ambíguas.
- Em `Todos`, usar a Timeline existente em colunas compactas por profissional também no celular, mantendo os nomes fixos e legíveis; no profissional selecionado, usar uma coluna ampla.
- Remover o bloco grande de “Agora/Próximos” do topo da Timeline e manter o contexto na linha `AGORA`; quando ninguém estiver em atendimento, exibir apenas `Agora · Livre` de forma discreta.
- Abrir a Timeline próxima ao horário atual e oferecer `Mostrar horários anteriores` para acessar o histórico do começo do dia sem removê-lo.
- Manter no máximo três indicadores claros: em atendimento, concluídos e agendados/horários livres.
- Manter o botão azul `+` e ajustar seu menu para as três ações pedidas: Agendamento, Atendimento avulso e Bloqueio de horário, preservando acessos secundários existentes em seus locais atuais.
- Unificar a leitura visual de Livre, Agendado, Em atendimento, Concluído e Bloqueado usando os tokens e componentes atuais.

## Detalhes técnicos
- Reutilizar `AgendaOperacional`, `AgendaTimeline`, `CabecalhoAgenda`, `FaixaCalendario`, `ResumoDia` e os painéis existentes; nenhuma rota ou tabela nova.
- Centralizar a seleção de data/profissional no estado já existente e fechar a folha mensal ao trocar qualquer um deles.
- Extrair componentes visuais pequenos para respeitar o limite de tamanho e manter a lógica operacional intacta.
- Não alterar disponibilidade, mutações, tempo real, comanda, WhatsApp, autenticação ou banco.

## Validação
- Conferir em 390px e 1280px: Todos, profissional individual, hoje/outro dia, calendário mensal, linha Agora, horários anteriores, estado livre, blocos e menu `+`.
- Conferir overflow horizontal, textos, sobreposições, toque, teclado e acessibilidade.
- Executar testes relevantes, TypeScript e confirmar build do preview; não publicar.