# Movimento e polimento da Agenda

## Objetivo
Dar resposta visual imediata e leve à Agenda e ao agendamento público, reaproveitando os componentes atuais, sem alterar dados, regras operacionais ou integrações.

## Implementação
1. **Fundação única de movimento**
   - Criar tokens CSS globais de 120 ms, 200 ms e 280 ms, com curvas de entrada e saída.
   - Alinhar os tokens existentes de movimento aos mesmos valores e revisar as animações tocadas para que nenhuma ultrapasse 300 ms.
   - Manter apenas `transform` e `opacity` em movimento; converter barras e marcadores que hoje animam `width`/`left` para `scaleX`/`translateX`.
   - Reforçar o modo “reduzir movimento”, deixando mudanças de estado instantâneas e mantendo apenas cor/opacidade sem deslocamento.
   - Limitar entradas em cascata aos seis primeiros itens; os demais aparecem sem animação.

2. **Agenda operacional**
   - Aplicar pressão `scale(0.98)` aos controles e blocos clicáveis, sem deslocar o conteúdo.
   - Manter o botão “+” visível e transformá-lo visualmente em “×” enquanto o menu estiver aberto; ajustar folha e fundo para entrada/saída curta.
   - Usar a direção correta no painel de atendimento: de baixo no celular e da direita no desktop.
   - Suavizar mudança de status por cor/barra lateral e mostrar o visto existente ao finalizar, sem atrasar a ação.
   - Reduzir o realce de novo atendimento para uma ocorrência de aproximadamente 2 s, usando somente opacidade/transform.
   - Fazer a troca de dia respeitar a direção das setas e do gesto, com deslocamento curto e sem bloquear toque.
   - Fazer a linha “Agora” mover por `transform` e o botão “Voltar para agora” surgir por fade.
   - Refinar arrastar/remarcar com elevação leve, escala e encaixe curto ao soltar, preservando o aviso de Desfazer.
   - Trocar o texto de carregamento restante no Modo Foco pelo esqueleto existente e suavizar a passagem para o conteúdo.
   - Aplicar `ValorAnimado` somente na primeira carga dos números do resumo, sem reiniciar em atualizações ao vivo.
   - Dar entrada/saída curta ao Modo Foco e converter o preenchimento do cronômetro para `scaleX`.

3. **Polimento funcional já solicitado**
   - Conferir no navegador botão de ações, painel compartilhado, cabeçalho, calendário, menu, Agora/Próximos, barras de status, dica, bloqueio de horário, atalhos e estados por atendimento.
   - Corrigir apenas falhas visuais ou de interação encontradas, preservando desfazer, fila, arrastar, deslizar, link direto, múltiplos profissionais, tenants e segmentos.
   - Garantir ação principal clara por estado, destrutivas separadas, alvos de 44 px, foco visível e operação por teclado.

4. **Agendamento público leve**
   - Reutilizar a entrada curta das mensagens com subida de 8 px.
   - Limitar a cascata dos horários aos seis primeiros e deixar os demais imediatos.
   - Dar realce suave à seleção e usar o visto animado já existente na confirmação final, sem impedir o próximo toque.
   - Remover esperas artificiais longas do fluxo; o indicador de digitação continuará curto e não bloqueará ações já disponíveis.

5. **Avisos, esqueletos e desempenho**
   - Estilizar o aviso de Desfazer com entrada/saída curta e barra visual de 5 s, sem alterar a janela atômica existente.
   - Padronizar o brilho leve dos esqueletos e garantir dimensões reservadas para evitar saltos.
   - Usar `will-change` somente nos estados realmente ativos de arrasto/animação.
   - Não adicionar dependências nem criar temporizadores por quadro; manter o relógio compartilhado de um minuto isolado.

## Detalhes técnicos
- Alterações concentradas em `styles.css`, tokens de movimento existentes, componentes compartilhados de esqueleto/visto/aviso e componentes atuais da Agenda e do agendamento.
- Nenhuma mudança em banco, autenticação, cobrança, WhatsApp, permissões ou contratos de servidor.
- Decisões estruturais de movimento serão registradas nas regras técnicas do projeto.

## Validação
- Rodar tipos, lint dos arquivos alterados com formatação corrigida e testes.
- Abrir Agenda autenticada e agendamento público em 390 px e 1280 px, com movimento normal e reduzido.
- Conferir ausência de rolagem lateral, sobreposição, saltos de layout e regressões de teclado/toque.
- Emular CPU 4× e medir troca de dia, rolagem da timeline e abertura do painel com registros do navegador; comparar tamanho do bundle antes/depois.
- Não publicar.

## Limites
- Bloqueio de data específica e escala individual por profissional continuam fora desta etapa porque exigem banco de dados.
- A validação não criará agendamentos, encaixes, comandas ou pagamentos reais; os fluxos serão exercitados até o ponto anterior à gravação.