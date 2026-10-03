# Auditoria: ficha do atendimento, comanda e pagamento (sem alterações)

## 1. Diagnóstico atual

O problema vem de superfícies abertas por cima de outras sem fechar a anterior. Há três camadas diferentes, e elas não respeitam a mesma ordem de sobreposição.

| Superfície | Componente | Tipo | Camada |
|---|---|---|---|
| Ficha rápida (cliente, horário, "Finalizar e cobrar", "Notas", "Comanda", "Ver comanda") | `PainelAtendimento` | Sheet padrão | z-50 |
| Tela de cobrança "Comanda #23" (Pix, "Verificar e confirmar recebimento", "Receber de outra forma") | `FechamentoComanda` | div fixa própria | **z-80** |
| Ticket "Ver comanda" | `FolhaDoTicket` (aberto via `VerTicketDoAgendamento` ou pelo fechamento) | Sheet padrão | z-50 |
| Confirmação "Confirmar recebimento?" | AlertDialog dentro de `FechamentoComanda` | AlertDialog padrão | z-50 |
| Botão "+" da Agenda | `.agenda-acao-fixa` | fixo | z-25 (sobe em regras posteriores do CSS) |

## 2. Fluxo atual resumido

**Equipe**
```text
Agenda -> toque no atendimento -> Ficha (Sheet z-50)
  "Finalizar e cobrar" -> setFechando(id) -> FechamentoComanda (z-80)
                          a ficha NAO fecha: continua montada por baixo
     "Ver comanda" -> FolhaDoTicket (Sheet z-50) -> abre ATRAS do fechamento
     "Verificar e confirmar" -> AlertDialog (z-50) -> tambem ATRAS do fechamento
  "Ver comanda" (na ficha) -> FolhaDoTicket por cima da ficha (2 Sheets ao mesmo tempo)
  "Comanda" (na ficha) -> mesma ação de "Finalizar e cobrar" (duplicada)
  "Notas" -> fecha a ficha e abre o perfil (correto, uma superfície)
```

**Cliente (confirmação pública)**
```text
TicketDaConfirmacao (página) -> bloco Pix inline (valor, copiar chave, WhatsApp, "Já paguei")
  "Ver comanda" -> Sheet com o ticket por cima da página
```
O lado do cliente tem só uma camada sobre a página. Não há empilhamento real, mas o Pix aparece duas vezes: no bloco da página e dentro do ticket.

## 3. Problemas encontrados

1. **Causa exata da comanda "por baixo":** `FechamentoComanda` usa z-80, enquanto tudo que ele abre (o ticket e o AlertDialog de confirmação) usa a camada padrão z-50 e vai para o fim da página. Por isso essas superfícies ficam atrás dele. Na prática, a janela "Confirmar recebimento" pode ficar escondida atrás da cobrança. Isso é o mais grave, porque trava a baixa do Pix.
2. **Ficha não fecha ao cobrar:** `onComanda` só chama `setFechando`. A ficha continua aberta, ficam dois overlays e dois controles de foco, e o texto "Cliente avulso 28" aparece duplicado.
3. **Ficha + ticket:** "Ver comanda" na ficha monta um segundo Sheet por cima do primeiro.
4. **Ações duplicadas:** "Finalizar e cobrar" e "Comanda" chamam a mesma função. "Ver comanda" aparece na ficha e no fechamento. No cliente, o bloco Pix se repete no ticket.
5. **Altura e safe-area do fechamento:** usa 94vh em vez de 94dvh e não reserva espaço no topo (corte no Android). O cabeçalho fixo fica no mesmo container que rola.

## 4. "Finalizar e cobrar" depende da comanda?

Não depende da tela de ticket. A comanda já nasce com o agendamento (`garantir_comanda`). `FechamentoComanda` já faz tudo sozinho: carrega com `getFechamentoComanda`, edita itens e desconto, cobra com `pagarComanda` (cartão, dinheiro, fiado, plano, Pix escolhido), envia para a recepção, confirma o Pix com o AlertDialog e conclui com `onConcluido` (finaliza, invalida e chama o próximo). O ticket (`FolhaDoTicket`) é só visualização e compartilhamento. Não é preciso abri-lo para cobrar.

## 5. Impacto em dados

Nenhuma mudança de banco, status ou pagamento é necessária. É um problema de apresentação. Os estados da comanda (aberta → em_atendimento → aguardando_pagamento → aguardando_confirmacao_pix → paga/cancelada), o histórico só de inclusão, a idempotência e a confirmação só pela equipe continuam como estão.

## 6. Casos especiais que precisam continuar

Pix pendente, Pix informado pelo cliente (com atualização a cada 15 s), comprovante pelo WhatsApp, "Receber de outra forma", edição de itens e desconto, fiado/plano, envio para a recepção, notas (perfil), falta/cancelar/remarcar na ficha, reabrir uma comanda que aguarda Pix e ver ou compartilhar o ticket.

## 7. Avaliação das arquiteturas

- **A) Uma superfície com etapas internas:** é a melhor experiência, mas fundir a ficha e o fechamento num componente só exige uma refatoração grande e arriscada (o fechamento tem cerca de 600 linhas).
- **B) Ficha → pagamento → conclusão na mesma superfície:** é o mesmo resultado de A.
- **C) Comanda só por ação explícita:** está correto, mas sozinho não resolve o empilhamento.
- **D) Recomendada: troca de superfície com uma ativa por vez + ticket como etapa interna.**
  - A ficha fecha quando a cobrança abre e volta a abrir se a cobrança for cancelada sem concluir.
  - Dentro da cobrança, "Ver comanda" vira uma etapa interna (troca o conteúdo, com botão "Voltar"), não outra folha.
  - Na ficha, "Ver comanda" fecha a ficha e abre o ticket. Ao fechar o ticket, a ficha volta.
  - A cobrança passa para a mesma camada padrão dos outros modais, para que a confirmação de recebimento sempre fique por cima.
  - O botão "Comanda" sai da ficha durante o atendimento (fica "Finalizar e cobrar"). Depois de finalizado ou com pagamento pendente, o botão vira "Cobrar" ou "Ver pagamento".

Isso entrega "uma ação = uma superfície ativa" sem reescrever a lógica financeira.

## 8. O que precisaria mudar

- `AgendaOperacional`: ao cobrar, fechar o painel e guardar o item para devolver a ficha se o usuário sair sem concluir.
- `PainelAtendimento`: tirar a duplicação "Comanda"/"Finalizar e cobrar". "Ver comanda" passa a pedir a troca para o pai em vez de montar um Sheet próprio.
- `FechamentoComanda`: o ticket vira etapa interna (reaproveitando `TicketComanda` + `useAcoesDoTicket`), sem `FolhaDoTicket` aninhado. Passar para a camada padrão (ou subir a camada do AlertDialog só nesse contexto), usar 94dvh, safe-area no topo e cabeçalho separado da rolagem.
- `VerTicketDoAgendamento`: aceitar um modo controlado pelo pai (abrir sem empilhar).
- `styles.css`: garantir que `.agenda-acao-fixa` fique sempre abaixo de qualquer modal.
- `TicketDaConfirmacao` (cliente): no ticket aberto pela página, esconder o bloco Pix repetido (o Pix fica só na página). Sem mudança de lógica.

## 9. Riscos

- Voltar à ficha depois de cancelar a cobrança pode reabrir um item já alterado. É preciso usar os dados atualizados da agenda.
- O Modo Foco e o desktop (painel lateral) usam o mesmo `PainelAtendimento`, então é preciso testar os dois.
- O fechamento também é usado no Caixa e na busca de comandas. A mudança de camada precisa ser validada lá.
- A atualização a cada 15 s não pode reiniciar a etapa interna do ticket.

## 10. Recomendação final

Seguir a opção D em uma entrega pequena, só na interface, sem banco e sem mudança nas funções do servidor. A primeira prioridade é a camada do AlertDialog de confirmação, porque ela pode impedir a baixa do Pix.

## 11. Critérios de aceitação

1. Em nenhum momento há duas folhas ou modais visíveis ao mesmo tempo, exceto a confirmação de recebimento, que aparece sempre por cima e com foco.
2. "Finalizar e cobrar" fecha a ficha e abre a cobrança. Ao fechar sem concluir, a ficha volta. Ao concluir, volta para a Agenda.
3. "Ver comanda" dentro da cobrança troca o conteúdo, e "Voltar" retorna à mesma etapa de pagamento.
4. "Confirmar recebimento?" fica visível e clicável em 390px e no desktop. Uma confirmação gera 1 pagamento e 1 movimento de caixa, e repetir não duplica.
5. Não há mais o botão "Comanda" duplicado durante o atendimento. "Notas", contato, falta, cancelar e remarcar continuam funcionando.
6. Pix informado pelo cliente aparece na cobrança sem fechar a etapa aberta. "Receber de outra forma", fiado, plano, cartão e dinheiro funcionam como antes.
7. Lado do cliente: o Pix aparece uma vez só, "Já paguei" continua idempotente e o ticket abre como uma única camada.
8. Em 390px e Android: sem corte no topo, cabeçalho fixo sem texto passando por baixo e botão "+" nunca acima de um modal.
9. Funciona também no Modo Foco, no desktop (painel lateral), no Caixa e na busca de comandas. Os testes, a checagem de código e o build passam.
