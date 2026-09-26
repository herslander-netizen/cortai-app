# Cortaí V3.0 — Etapa 2: paleta sóbria e base visual

## Resultado
Atualizar a aparência do aplicativo para uma base neutra, sóbria e consistente, mantendo intactos regras de negócio, dados, permissões, navegação e fluxos.

## Implementação
1. **Paleta e identidades**
   - Aplicar ao modo claro: fundo `#F7F7F5`, superfície `#FFFFFF`, borda `#E6E5E1`, texto `#1C1C1A`, texto secundário `#6E6D69` e destaque Moderno `#2F6B52`.
   - Aplicar ao modo escuro: fundo `#121211`, superfície `#1A1A18`, borda `#2A2926`, texto `#EDEDEA`, texto secundário `#A09F9A` e destaque Moderno `#6FB08E`.
   - Manter Blue, Indigo, Copper e Clássico com a mesma base neutra; somente o destaque muda, em tons dessaturados e com contraste adequado.
   - Preservar aliases antigos necessários à compatibilidade, mas fazê-los apontar para os novos tokens semânticos.

2. **Tokens compartilhados**
   - Consolidar cores de fundo, superfície, texto, borda, foco, ação, feedback e sombras.
   - Consolidar espaçamento em múltiplos de 4 e raio padrão de 14 px para cartões.
   - Manter Manrope como fonte do aplicativo e eliminar estilos visuais concorrentes na base operacional.
   - Sincronizar a cor do navegador e do aplicativo instalável com o modo ativo.

3. **Estados da agenda**
   - Criar tokens fixos e independentes da identidade para agendado/pendente, confirmado, chegou, em atendimento, concluído, falta, cancelado, remarcado e encaixe.
   - Exibir estados com ícone, texto e cor discreta, usando borda e fundo leve em vez de blocos fortes.
   - Aplicar o mesmo tratamento na Lista, Timeline, bloco “Agora” e confirmação pelo WhatsApp.
   - Garantir tipografia mínima de 12 px em toda a agenda.

4. **Limpeza visual restrita à Etapa 2**
   - Remover sobrescritas globais de raio que conflitam com o padrão de 14 px.
   - Reduzir sombras e contrastes excessivos sem alterar estrutura ou posição das telas.
   - Não alterar ações, estados, consultas, banco, WhatsApp, permissões ou navegação.

## Validação
- Comparar a Agenda e telas-base em 390 px e 1280 px, nos modos claro e escuro, usando as capturas da auditoria como “antes”.
- Conferir contraste, foco visível, ausência de rolagem lateral, legibilidade dos estados e sincronização da cor do navegador.
- Validar o resultado automático do projeto e registrar capturas “depois”.
