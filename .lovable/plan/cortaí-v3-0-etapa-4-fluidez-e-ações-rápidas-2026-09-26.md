# Cortaí V3.0 — Etapa 4: fluidez e ações rápidas

## Resultado
Tocar num horário ou num agendamento resolve a ação em um ou poucos toques, sem janelas de confirmação, com resposta imediata e "Desfazer".

## Implementação
1. **Painel do agendamento**
   - Tocar num agendamento abre um painel inferior (lateral no desktop) com ações de um toque: Chegou, Iniciar, Concluir, Remarcar, Falta, Cancelar, WhatsApp e Comanda.
   - Só aparecem as ações válidas para o estado atual; todas usam a mudança de estado já existente, com resposta otimista e "Desfazer" por 5 s.
   - A tesoura continua como ação principal com o nome do cliente.

2. **Agendamento rápido no horário vazio**
   - Tocar num espaço livre da visão por horário abre o agendamento já com dia, horário e profissional preenchidos.
   - Busca de cliente com recentes primeiro, escolha do serviço e confirmar; duração vem do serviço.
   - Reaproveita a criação de agendamento atual (com a trava de sobreposição do banco).

3. **Remarcar arrastando**
   - Segurar e arrastar o bloco na visão por horário (celular e desktop), encaixando em passos de 15 min.
   - Ao soltar: aviso "Remarcado · Desfazer", sem janela. Se o horário estiver ocupado, o bloco volta e aparece o motivo.
   - Remarcar pelo painel abre o mesmo fluxo com escolha de novo horário.

4. **Fluidez**
   - Esqueleto só no primeiro carregamento; troca de dia mantém a tela anterior enquanto carrega e desliza em 150–200 ms.
   - Deslizar o dedo para trocar de dia no celular.
   - Agendamentos novos vindos do WhatsApp ou da página pública ganham destaque leve por alguns segundos.
   - A agenda continua buscando só o dia visível.

## Detalhes técnicos
- Remarcação usa uma função no servidor que valida permissão e tenant e atualiza o horário; a trava de sobreposição do banco rejeita conflitos. Se já existir função equivalente, ela será reaproveitada.
- Arrastar com eventos de ponteiro nativos, sem biblioteca nova; segurar 300 ms antes de arrastar no toque, para não atrapalhar a rolagem.

## Validação
- Celular e desktop, claro e escuro: marcar num horário vazio, remarcar arrastando e desfazer, chegada, concluir, falta, cancelar, troca de dia deslizando.
- Tipos e build OK.
