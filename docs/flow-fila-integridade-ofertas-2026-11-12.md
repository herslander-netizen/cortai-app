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

O módulo `src/lib/fila-ofertas-transacional.ts` implementa o contrato
TypeScript das RPCs, com retornos validados e falha fechada. **O motor já
chama o adaptador nesta branch isolada do PR #55**, substituindo as escritas
separadas de reserva, recusa, cancelamento e expiração. Essa integração
**não deve ser mesclada/publicada antes da migração**, que ainda falta.
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
4. Conferir a integração já preparada no PR #55: o backend chama
   `reservar_oferta_da_fila` e `encerrar_oferta_da_fila` sem manter
   `UPDATE fila` + `INSERT oferta` como segundo caminho; rejeitar deploy
   se a migração estiver ausente.
5. Confirmar índices, grants, RLS, monitoramento e comportamento mobile.
6. Somente então aplicar na prévia mediante revisão/autorização específica.
   Produção permanece sem alteração automática.

### Preflight PostgreSQL de leitura (12/11/2026)

Adicionado `tests/sql/fila-ofertas-preflight-leitura.sql`, executado no
**Supabase de prévia** com somente `SELECT`, sem migração nem alteração
de dados. O resultado verificado foi: `ofertas_ativas = 0`,
`entradas_avisadas = 0`, duplicidades por entrada/vaga = 0,
ofertas sem entrada do tenant = 0, avisados sem oferta = 0, ofertas com
estado de fila incompatível = 0, ofertas sem vaga de origem = 0.
`pronto_para_revisao = true` indica apenas que o estado observado não
contém essas inconsistências. **Não é autorização de migração nem
evidência de concorrência transacional testada.**

O SQL proposto também bloqueia a migração se houver oferta ativa
sem `agendamento_liberado_id`. A função de notificação interna do motor
passou a ser independente da progressão da oferta: falha em registrar
um sininho não impede classificar o envio, com teste de regressão.

### Revalidação de vaga antes da reserva

A proposta `reservar_oferta_da_fila` faz uma segunda conferência de
colisões de Agenda **sob `pg_advisory_xact_lock` do mesmo profissional**
utilizado pela RPC oficial `criar_agendamento`. A verificação usa os
mesmos estados ocupantes observados no motor (agendado, chegou,
na cadeira e finalizado) e a margem entre atendimentos definida pelo
negócio. Se a vaga ficou ocupada depois da leitura inicial, a RPC
retorna `ocupada`, sem cadastrar a oferta nem marcar a pessoa como
avisada. Essa verificação é apenas uma proteção de código planejada;
não foi ensaiada com sessões PostgreSQL concorrentes.

### Proteção de prioridade em falhas transitórias

O motor também passou a distinguir **negativa comprovada de canal** de
**consulta de consentimento/titularidade indisponível**. Erro de consulta não
é prova de que a pessoa recusou o WhatsApp: fica em `entrega_indeterminada`
(em vez de descartar sua vez) e a mensagem NÃO é enviada sem autorização.
Casos de número inválido, opt-out, telefone não confirmado e conexão ausente
continuam falhando fechados. O teste `src/lib/fila-ofertas-canal.test.ts`
cobre a distinção. A posterior reconciliação precisa continuar vinculada
à oferta específica, não à posição genérica da fila.

## Lote de integridade das ações manuais (12/11/2026)

A auditoria identificou dois caminhos que continuavam fora do ciclo
transacional: `removerDaFila` atualizava a entrada e depois cancelava
a oferta, e `converterFilaEmAgendamento` criava o agendamento e alterava
fila/ofertas em gravações separadas. Ambos foram preparados no PR para
usar RPCs **no mesmo commit**:

- `retirar_entrada_da_fila`: bloqueia oferta e entrada na ordem do
  aceite; cancela a oferta da entrada e marca `saiu` atomicamente,
  com rejeição de corrida. A fila de chegada (janela NULL) continua
  removível mesmo sem oferta; não foi confundida com espera de horário.
- `converter_entrada_da_fila`: só converte entrada `aguardando`
  sem oferta atual; cria o horário com `criar_agendamento` oficial e
  marca `atendido` na mesma transação. Se já houver oferta, orienta
  a equipe a aguardá-la ou encerrá-la antes de converter.
- `editarFila`: só permite mudar preferência enquanto a entrada
  ainda está `aguardando`, impedindo mudar uma oferta já reservada.
- `reservar_oferta_da_fila`: valida novamente dia, horário e faixa
  no fuso do tenant e rejeita `janela_preferida NULL` (fila de
  chegada) antes de gravar. A interface não é mais fonte única
  de compatibilidade para os dados que podem ser editados.

O script SQL proposto foi restaurado após detectar definições duplicadas
na edição: um teste passa a exigir **uma definição por função e um COMMIT**.
Os testes estáticos em `src/lib/fila-ofertas-transacional.test.ts`
e `src/lib/fila-ofertas-integracao-manual.test.ts` conferem a arquitetura.
O roteiro para duas sessões PostgreSQL reais está em
`tests/sql/fila-ofertas-concorrencia-roteiro.md`.

**Limite obrigatório:** não existe PostgreSQL local neste ambiente e
o Supabase de prévia não recebeu escrita. A homologação concorrente
real e os efeitos dos gatilhos do banco **não foram comprovados**.
Não mesclar o PR nem executar migração até o ensaio em um banco
descartável, revisão de locks/permissões e implantação coordenada.
