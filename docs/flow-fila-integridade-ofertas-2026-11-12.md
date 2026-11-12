# Flow — Integridade do ciclo de ofertas da lista de espera
**Data:** 12/11/2026. **Escopo:** branch de revisão, não aplicar em produção.

## Diagnóstico verificado no banco de prévia (somente SELECT)

- A tabela `ofertas_da_fila` permite apenas os estados `enviada`, `aceita`, `recusada`, `expirada`, `cancelada`. O fluxo hoje cria a oferta já como `enviada`, mesmo antes do envio externo.
- `fila_de_espera` tem `status` e `avisado_em`, mas **não possui `oferta_atual_id`**; isso impede provar a vinculação exata da reserva à oferta com os dados atuais.
- O índice único parcial por `agendamento_liberado_id` garante no máximo uma oferta com status `enviada` por vaga; outro índice impede ofertar a mesma vaga novamente à mesma entrada. Não há índice equivalente para uma oferta ativa por entrada da fila em vagas distintas.
- A RPC de aceite realiza `FOR UPDATE` da oferta e da fila, mas não confere um vínculo com a oferta atual da entrada.

## Correções de código preparadas neste PR

1. **Liberação condicionada:** ao recusar, perder, cancelar ou expirar uma oferta, atualizar a fila apenas se a entrada ainda estiver `avisado`, no mesmo tenant, e o carimbo `avisado_em` não for posterior a `criado_em` da oferta encerrada. Isso é uma barreira de compare-and-set: uma reserva posterior não deve ser liberada por um evento anterior.
2. **Ausência comprovada de canal:** número inválido, telefone não confirmado/consentimento ausente, conexão inexistente ou nova revogação antes do envio retornam `sem_canal`; a oferta é cancelada antes de liberar a mesma vaga para outra entrada elegível. Não gastar tentativas infinitas com a mesma entrada para a mesma vaga.
3. **Entrega indeterminada:** leitura de oferta falha, impossibilidade de gravar o envio, erro na chamada do provedor ou resposta ambígua não autorizam reoferta imediata. A reserva permanece para apuração/expiração, evitando envio duplicado enquanto o resultado é incerto.
4. **Notificação honesta:** a equipe vê que a oferta foi preparada, não a afirmação de que o cliente a recebeu antes do comprovante de envio.

## Limites e pendências antes de publicar

- O CAS por timestamps é **melhoria defensiva, não garantia transacional definitiva**. Diferenças de relógio/precisão e corrida simultânea entre aceite/expiração/segunda vaga exigem migração aditiva, `oferta_atual_id` ou equivalente e RPC transacional, sob coordenação com quem reserva `drizzle/migrations (0059+)`.
- **`enviada` não significa `entregue` nem `lida` pelo WhatsApp.** A entrega é outra etapa; sem webhook/comprovante de entrega não prometer que o cliente viu a oferta.
- Falha de envio depois de tentar contactar o provedor pode ser incerta mesmo com erro: bloquear/expirar de maneira conservadora, não criar oferta paralela, e sinalizar à equipe.
- Necessário verificar os testes de unidade, CI, concorrência real entre vagas, isolamento por tenant, cron e consentimento, além de homologar no Android.
- Este PR modifica `src/lib/whatsapp/fila-ofertas.server.ts`, que consta entre áreas com reserva histórica de integração WhatsApp. Por isso o PR fica **em rascunho, isolado e sem publicação** até coordenação e revisão das alterações concorrentes.

Não aplicar SQL, nem executar migrações em banco de prévia ou produção automaticamente.