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

## Etapa adicional — proposta SQL e adaptador tipado (12/11/2026)

O [SQL proposto](sql/fila-ofertas-transacionais-proposta-2026-11-12.sql)
fica intencionalmente em **docs/sql**, não em `drizzle/migrations`:
a faixa `0059+` segue reservada por outro trabalho. **Não foi executado**.

O script reúne, para futura revisão/migração aditiva:
- `fila_de_espera.oferta_atual_id`, chave estrangeira e índice único parcial
  por `fila_id` das ofertas ativas;
- `reservar_oferta_da_fila`: bloqueio de entrada com `FOR UPDATE`, conferência
  do mesmo tenant e vaga cancelada/remarcada, criação de oferta e marcação
  da entrada na **mesma transação**;
- `encerrar_oferta_da_fila`: fim da oferta e liberação apenas se a entrada
  ainda aponta para aquela oferta, também na mesma transação;
- revisão da RPC `aceitar_oferta_da_fila` para rejeitar token antigo e
  limpar o vínculo quando aceita, expira ou perde a vaga;
- função privilegiada somente para `service_role`, com revogação explícita
  para `PUBLIC`, `anon` e `authenticated`;
- abortar a migração quando houver ofertas ativas duplicadas ou estados
  históricos incongruentes, em vez de adivinhar qual vincular.

O módulo `src/lib/fila-ofertas-transacional.ts` já implementa o contrato
TypeScript das futuras RPCs, com retornos validados e falha fechada; **ainda
não é chamado pelo motor** (falta a migração e a integração coordenada).
Os testes de contrato e estrutura em `fila-ofertas-transacional.test.ts`
são verificações de código, **não equivalem a ensaio SQL com concorrência**.

Leituras agregadas na prévia em 12/11/2026: zero ofertas ativas, zero
entradas `avisado` e nenhuma duplicidade de oferta ativa por `fila_id`
naquele instante. Esse retrato não substitui conferência imediatamente
antes de eventual migração, nem comprova ausência de corridas futuras.

### Critérios antes de publicar

1. Revisar a migração e a RPC de aceite contra o schema/código atual.
2. Coordenar e obter migração livre, sem sobrepor `0059+`.
3. Testar com banco descartável **duas vagas/mesma pessoa em paralelo**,
   duas pessoas/mesma vaga, recusa de token antigo, aceite idempotente,
   perda de vaga, expiração, WhatsApp não conectado e consentimento revogado.
4. Substituir no backend o par `UPDATE fila` + `INSERT oferta` pela RPC
   `reservar_oferta_da_fila`; substituir cada transição por
   `encerrar_oferta_da_fila`. Nenhuma camada deve manter os dois caminhos.
5. Confirmar índices, grants, RLS, monitoramento e comportamento mobile.
6. Somente então aplicar na prévia mediante revisão/autorização específica.
   Produção permanece sem alteração automática.
