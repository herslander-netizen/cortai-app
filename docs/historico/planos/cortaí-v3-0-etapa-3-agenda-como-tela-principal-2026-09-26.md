# Cortaí V3.0 — Etapa 3: Agenda como tela principal

## Resultado
A equipe abre o app direto na agenda de hoje, já no horário atual, com navegação curta e a agenda ocupando a tela. Sem mudar regras, dados ou fluxos.

## Implementação
1. **Entrada e navegação**
   - Equipe entra em `/barbeiro` (Agenda de hoje), já rolada até agora.
   - Celular: barra inferior curta — Agenda, Clientes, Caixa, Mais (Caixa só com permissão financeira; senão Fila).
   - Desktop: barra lateral enxuta e recolhível, com os mesmos itens e o Drawer atual para o restante.
   - Painel, relatórios e demais módulos continuam no "Mais"/Drawer, filtrados pelas permissões atuais.

2. **Topo da agenda**
   - Faixa da semana para trocar de dia, botão "Hoje" e uma linha de resumo ("12 agendados · 3 livres").
   - Remover cartões de números acima da agenda.
   - Fila de espera vira selo "Fila (3)" que abre painel inferior.

3. **Visão Dia**
   - Celular: um profissional por vez, troca por chips (e deslize); barbeiro vê a própria agenda por padrão, dono/gerente vê todos.
   - Desktop: uma coluna por profissional; Lista como alternativa. Semana fica para etapa posterior se exigir nova consulta.
   - Linha do "agora", grade discreta de 15 min, horários livres como espaço vazio.
   - Bloco: nome em destaque, serviço e horário; cor indica só o status. Encaixe lado a lado com borda tracejada.

4. **Sem botão flutuante sobre a agenda**
   - A ação principal (tesoura) passa a ficar integrada acima da barra inferior, sem cobrir blocos; no desktop, no topo da agenda.

## Limites
- Reutiliza a consulta, realtime, estados, fila e comanda existentes; sem migrações.
- Ações rápidas por toque, agendamento em horário vazio e arrastar para remarcar ficam para a Etapa 4.

## Validação
- Antes/depois em 390 px e 1280 px, claro e escuro.
- Conferir permissões (barbeiro x dono), troca de dia/profissional, rolagem até agora, ausência de sobreposição e build OK.
