# Preparo entre atendimentos — referência Figaro e contrato de evolução

## Fase 1: visível na prévia (sem migração)
A linha pontilhada **Preparo N min** na Timeline representa `tenants.intervalo_entre_min`, o intervalo geral que o motor de agendamento **já respeitava**. Não é um agendamento, não bloqueia um segundo horário, não altera disponibilidade nem configura tempo individual por serviço. O número não é fixado em 20: se o negócio usa 0, nenhuma faixa aparece.
- A fonte é `getAgendaDia`, que consulta `intervalo_entre_min` junto ao passo de agendamento, sem expor dados privados.
- Desenhar após atendimentos ativos, no trilho de um profissional, sem sobrepor cartões em encaixe, pausa ou bloqueio cadastrado; na timeline unificada com vários profissionais não sobrepor faixas visualmente.
- Altura real do intervalo, linha tracejada, passiva (pointer-events none), legível no tema claro/escuro. Não mudar arrasto, zoom, rolagem ou clique.
- Cache antigo não possui campo: a UI omite o preparo, sem afirmar reserva inexistente.

## Fase 2: preparo específico por serviço (NÃO implementado)
O pedido do dono também inclui preparo **antes ou depois** de cada serviço. Essa função precisa de persistência e validação transversal. A migração fica **bloqueada até coordenar com Claude**, que reservou `drizzle/migrations/0059+` e `src/integrations/supabase/types.ts`.
1. Proposta: `servicos.preparo_antes_min` e `servicos.preparo_depois_min`, inteiros 0–120, padrão 0; snapshots desses valores nos agendamentos criados ou remarcados, para mudanças futuras no catálogo não reescreverem implicitamente reservas existentes.
2. Política de horários: tempo ocupado por cada agendamento inclui **antes + duração + depois**. Entre dois atendimentos, exigir pelo menos o maior entre a folga geral atual e a soma dos preparos depois do anterior e antes do próximo. **Não somar a folga geral mais uma vez** à soma dos preparos.
3. Atualizar o motor único usado por agendamento público, manual, Flow Chat/IA, WhatsApp, arrasto, reagendamento, séries, lista de espera e recomendações de horários. Exceções de encaixe devem aparecer como tal, sem representar preparo falso.
4. Se houver profissional ou equipamento compartilhado, bloquear a disponibilidade real por recurso; não usar meras faixas visuais como fonte de verdade. O tempo de preparo pertence ao profissional/serviço, não ao cliente.
5. Editor de serviço: ajustes por etapa `Antes` / `Depois` (0, 5, 10, 15, 20 min, valor personalizado) e explicação de impacto na agenda. Mostrar na Timeline **antes/depois**, não duplicar preparo ao agendar serviços consecutivos no mesmo atendimento.
6. Testar conflitos, fusos, cruzamento de dia, indisponibilidade do banco, duas reservas simultâneas, compatibilidade de registros antigos, invariantes por tenant e mobile 390/360px, claro/escuro.
7. Criar somente migração aditiva e testes locais depois da liberação; **jamais aplicar em banco da prévia ou da produção sem autorização explícita do dono**.

Nenhum comando remoto Oracle/Railway ou segredo é necessário para a fase visual.
