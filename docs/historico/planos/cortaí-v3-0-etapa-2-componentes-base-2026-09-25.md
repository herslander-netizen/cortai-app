# CORTAÍ V3.0 · Etapa 2 — Componentes base

## Objetivo
Unificar botões, cartões, status, ícones e números nas telas do barbeiro, recepção e dono, preservando exatamente a navegação, a ordem visual, os dados e todas as regras atuais.

## Implementação
1. **Button único**
   - Incorporar no `Button` a espera segura: bloqueio de toque duplo, indicador interno atrasado e largura estável.
   - Padronizar variantes primária, secundária, ghost, texto, ícone e destrutiva; alturas de 48 px e 56 px; raio de 12 px.
   - Migrar controles artesanais das telas operacionais e remover `BotaoAcao` quando não houver usos.
   - Manter somente uma ação primária por tela, sem mudar a posição ou o fluxo das ações.

2. **Card único**
   - Evoluir `Card` com variantes superfície, elevada e tocável, além de densidades padrão e compacta.
   - Substituir contêineres que apenas imitam cartões nas áreas priorizadas.
   - Preservar listas como linhas com divisores, sem transformar cada item em cartão.

3. **Status único**
   - Evoluir o `Badge` para representar estados de atendimento e pagamento com pílula, ícone Lucide, texto e cor semântica.
   - Aplicar o mesmo status na Agenda, Timeline, fila, perfil, comanda, Visão Casa e pagamentos.
   - Remover selos e spans de estado feitos manualmente nessas superfícies.

4. **Consistência visual**
   - Fixar traço Lucide em 1,75 globalmente e 2 no estado ativo.
   - Padronizar valores monetários com peso 600 e números tabulares.
   - Usar somente tokens de cor existentes.

5. **Correções específicas da Agenda**
   - Manter como primária apenas a ação fixa inferior com tesoura; remover ou rebaixar qualquer duplicata superior.
   - Tornar o topo sólido para impedir conteúdo visível por trás do nome da barbearia.
   - Garantir contraste do rótulo inativo em Lista | Timeline no modo claro.

## Validação
- Confirmar que não restaram usos de `BotaoAcao` nem botões/cartões/status artesanais nas telas priorizadas.
- Rodar verificação de tipos e testes existentes.
- Validar Agenda, Timeline, Visão Casa, Hoje, fila, perfil e comanda em celular e desktop, incluindo espera de ação, status e modo claro/escuro.
- Conferir que nenhuma lógica, consulta, permissão, banco, WhatsApp ou CortAI foi alterada.
