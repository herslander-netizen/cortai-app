# Agenda: horário ocupado, encaixe explícito e espera por horário

Regra central: um horário ocupado nunca vira disponível para o cliente. A checagem final continua no servidor e no banco (`validarAgendamento`, trava de sobreposição, RPC atômica).

## Etapas

1. **Estados dos horários (sem criar outro motor)**
   - Em `disponibilidade.ts`, adicionar `estadosDoDia()`, que reaproveita `horariosDisponiveis`, `profissionalLivre`, `motivoForaDoHorario` e `motivoAntecedencia`.
   - Cada horário recebe um estado: `livre`, `ocupado` (com quem ocupa), `bloqueado` (bloqueio, escala ou intervalo) ou `passado`.
   - A conta usa a duração do serviço e o intervalo entre atendimentos.
   - Com "Não tenho preferência", o horário só aparece ocupado se todos os profissionais aptos estiverem ocupados.
   - Os agendamentos do dia são carregados de uma vez. Nada de uma consulta por horário.

2. **Novo agendamento feito pela equipe** (`SecoesAgendamento.tsx`, `useAgendamentoManual.ts`)
   - Os horários aparecem como Livre, Ocupado ("João · Corte") ou Bloqueado.
   - Tocar num horário ocupado abre os detalhes, com "Ver atendimento" e "Encaixar".
   - "Encaixar" pede confirmação ("Este horário já possui um atendimento...") e depois usa o `encaixe=true` atual. A regra do servidor não muda.
   - O nome do cliente vem da agenda que a equipe já pode ver hoje.

3. **Agendamento pelo cliente** (`useSelecaoAgendamento.ts`, página pública e app do cliente)
   - Horários ocupados aparecem desabilitados com a etiqueta "Ocupado". Eles não podem ser escolhidos.
   - Quando a lista de espera está ligada, aparece a ação "Entrar na lista de espera". Nenhum nome de outro cliente é mostrado.

4. **Espera por horário específico (mesma lista de espera de hoje)**
   - Uma alteração pequena e sem perda de dados na tabela da lista de espera: um campo opcional `horario_desejado`. Dia, profissional e serviço já existem ou também ficam opcionais.
   - As preferências por período continuam como estão.
   - A entrada na lista usa a RPC atual (`entrar_na_fila_publica`), estendida só com esse campo opcional.
   - Em `fila-compatibilidade.ts`, quem pediu exatamente aquele horário passa a valer como compatível e entra primeiro em empates. A ordem da fila é respeitada.

5. **Vaga liberada → oferta, nunca reserva automática**
   - Cancelamento e remarcação continuam chamando `ofertarVaga()`.
   - O aceite continua por `aceitar_oferta_da_fila`, que valida tudo de novo e garante que só um cliente fica com a vaga.
   - Quem perder a vaga para outro cliente vê uma mensagem clara, e a fila segue.

6. **WhatsApp**
   - A mesma oferta ganha um texto próprio para quem pediu aquele horário ("Seu horário ficou disponível! Sexta às 15:00 · Corte · João", com os botões Quero agendar / Não posso).
   - Usa o envio oficial atual (`decidirFormato`, remetente por `conexaoDeEnvio`). Nenhum envio novo é criado.

## Testes
- **Motor:** livre, ocupado, serviço de 45 min cruzando 10:30, intervalo, bloqueio, "qualquer profissional".
- **Equipe:** etiqueta com nome e serviço; encaixe só depois da confirmação.
- **Cliente:** ocupado não é selecionável; entrar na espera não cria agendamento.
- **Lista de espera:** prioridade do horário específico, oferta sem reserva, expiração passa para o próximo, aceite concorrente com um só vencedor (teste SQL que já existe ou unitário).
- Typecheck, lint, build e conferência visual em 390 px e 1280 px.

## Fora do escopo
Redesenho da Agenda, novo motor, nova lista de espera, novo envio de WhatsApp, publicação.

## Detalhes técnicos
- Uma única migration, só com acréscimos: coluna opcional, índice e extensão compatível da RPC. Sem DROP.
- Os dados de ocupação para a equipe saem da função do painel que já respeita permissões. Na página pública só chegam intervalos ocupados, sem nomes.
