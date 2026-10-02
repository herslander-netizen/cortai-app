# Corrigir rolagem da Timeline e toque longo no vazio

## O que será alterado
- Trocar o clique simples no vazio por toque longo de 450 ms em telas de toque, preservando clique simples com mouse.
- Manter a mesma conversão da posição em horário e o indicador `+ HH:MM`, com vibração curta ao confirmar.
- Cancelar o toque longo ao mover mais de 8 px, rolar, terminar cedo, cancelar o ponteiro ou detectar outro dedo.
- Impedir menu de contexto e seleção somente na Timeline usada por toque, sem bloquear os gestos nativos de rolagem.

## Rolagem livre
- Ajustar o gesto lateral de troca de dia para não manter uma observação não passiva depois que o movimento vertical for identificado.
- Confirmar que o bloqueio global continua existindo apenas durante arrasto ativo de cartão.
- Tornar camadas exclusivamente visuais transparentes a ponteiros e manter `pan-y` na Timeline e seus contêineres.

## Testes e validação
- Extrair a máquina pequena do toque longo para `toque-longo-vazio.ts` e cobrir: toque curto, 450 ms parado, movimento acima de 8 px e scroll.
- Executar os testes relacionados, lint e verificação de tipos.
- Conferir o resultado no Chrome móvel simulado, iniciando a rolagem em uma área vazia da Timeline.

## Limites
- Nenhuma regra de agenda, cartão, FAB ou outra tela será alterada.
- Nada será publicado.
