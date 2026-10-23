# Auditoria de desempenho da Agenda (23/10/2026)

Pedido do dono: comparar a Agenda do Cortaí com a do Figaro, entender por que a do Figaro era mais fluida e deixar a atual
melhor ou igual, nos dois modos (cartões e linha do tempo).

## Limites desta auditoria (ler primeiro)

- **Não houve comparação código a código com o Figaro.** O APK e o código descompilado não estão no repositório nem na
  sessão; só existe a especificação escrita (`docs/referencia-figaro/apk/`). A comparação foi com os princípios que a
  spec descreve (o Figaro atualiza só o cartão arrastado, sem recompor a lista; o relógio e o alfa são animados por estado).
- **Nada foi medido em aparelho real.** As medidas abaixo são de contagem de renderizações em teste (jsdom, 40 cartões).
  O ganho em quadros por segundo no celular **não foi confirmado**: precisa de conferência no aparelho.

## Medido e corrigido

| Item | Antes | Depois | Como |
|---|---|---|---|
| Arrastar a alça de duração: renderizações da linha do tempo em 120 movimentos de 1 px | 121 | 13 | `desempenho-timeline.test.tsx` |

**Causa:** `AgendaTimeline.tsx` chamava `setRedim`/`setArrasto` a cada `pointermove`. Cada chamada re-renderizava o componente
inteiro (1190 linhas, todos os cartões, o cálculo de colunas), dezenas de vezes por segundo. Isso passa do orçamento de um
quadro (16 ms): no teste, cada renderização levou cerca de 16 ms com 40 cartões.

**Correção:**
- Alça de duração: o estado só muda quando o **passo arredondado** muda (5 min). Tudo o que lia `redim.dy` já arredondava ao
  passo, então nada que se vê mudou.
- Arrasto do cartão: o deslocamento fino vai direto no estilo do cartão (`translateY`, só compositor); o estado só muda
  quando o passo muda (o fantasma do alvo e o rótulo do horário dependem só do passo).
- Teste de orçamento: o teste falha se voltar a ser um render por movimento.

## Observado e não alterado (hipóteses para a próxima rodada)

1. **`AgendaOperacional.tsx` tem 1718 linhas, 19 `useState` e nenhum `memo`.** Qualquer mudança de estado (menu, folha, fila)
   re-renderiza a linha do tempo e a lista, porque as props são novas a cada render (`itens.filter(...)`, `bloqueiosDoDia(...)`,
   funções inline). Estabilizar as props e usar `React.memo` na `AgendaTimeline` provavelmente é o maior ganho que sobra, mas é
   uma cirurgia grande e precisa de medição no aparelho antes e depois.
2. **Leitura de layout durante o arrasto** (`area.getBoundingClientRect()` em `moverGesto`, rolagem automática da borda): lê o
   layout e escreve a rolagem no mesmo quadro. Dá para guardar a medida no início do gesto.
3. **Lista de períodos** (`ListaPeriodo.tsx`): renderiza todos os dias carregados (até 365). `content-visibility: auto` nos grupos
   por dia ajudaria, mas mexe no cabeçalho fixo de cada dia e precisa de conferência visual. A atualização a cada 60 s com
   consulta infinita rebusca todas as páginas carregadas.
4. **Cada cartão calcula várias cadeias e classes a cada render**; só pesa quando a lista inteira renderiza (item 1).

## O que já estava bom

- O relógio (`useAgora`) é compartilhado e bate uma vez por minuto; só quem lê re-renderiza.
- As animações da Agenda usam opacidade e transformação (compositor).

## Pendente de decisão ou de aparelho

- Medir quadros por segundo no celular com o perfil de desempenho do Chrome (antes e depois desta mudança).
- Decidir se a cirurgia do item 1 vale o risco (recomendado, em lotes, com teste de contagem de renderizações).
