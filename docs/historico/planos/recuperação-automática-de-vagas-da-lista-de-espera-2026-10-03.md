# Recuperação automática de vagas da Lista de Espera

## O que já existe (auditado)
- Motor de ofertas pronto em `src/lib/whatsapp/fila-ofertas.server.ts`: `ofertarVaga` (vaga liberada -> primeiro compatível, valida pelo motor oficial `validarAgendamento`), `aceitarOferta` (RPC atômica `aceitar_oferta_da_fila`), `recusarOferta` (passa ao próximo), `cancelarOfertasDaVaga` e `processarListaDeEspera` (expira vencidas e reoferta; cobre cancelamentos das últimas 24 h).
- Varredura já integrada: `/api/public/whatsapp/automacoes` (agendador do banco, chave interna) -> `processarAutomacoesDeWhatsapp` -> `processarListaDeEspera`. Não será criado outro agendador.
- Disparos imediatos: cancelamento pelo painel (`barbeiro.functions.ts` ~l.281) e cancelamento do cliente (`lembretes.server.ts` `avisarListaDeEspera`).
- Configuração por negócio hoje:
  - `recursos_do_tenant` + `recurso_do_tenant_ativo(_, 'fila_espera')`: liga a funcionalidade inteira da Lista/Fila (telas, ações). Desligar isso bloquearia a lista — não serve como interruptor da automação.
  - "Fila de chegada" fica em `pagina.filaDeChegada` (configuração da página), com `InterruptorFilaDeChegada` em `/barbeiro/horarios`.
- Problemas confirmados: a consulta de candidatos usa `.limit(200)` sem `order`, então a fila real pode ser cortada antes de ordenar; o prazo enviado ao cliente usa `expira_em` (já é `min(agora+30, início-10)`), mas a tela pública/aviso interno não deixam claro quando o prazo é menor que 30 min.

## O que muda para o dono
- Novo interruptor em `/barbeiro/fila` (topo, aba Lista de espera) e também em `/barbeiro/horarios` logo abaixo do da Fila de chegada: **"Oferecer vagas automaticamente à lista de espera"**, com dica "Quando um horário é cancelado, o Cortaí oferece a vaga ao próximo da lista. Desligado, ninguém é removido da lista."
- Ligado por padrão (comportamento atual preservado).
- Ao desligar: nenhuma oferta nova; ofertas já enviadas continuam válidas até vencer/serem respondidas (o cliente que já recebeu não é prejudicado), mas vencidas/recusadas não passam ao próximo. Pessoas continuam na lista; agenda intacta.
- Ao religar: a varredura volta a ofertar vagas futuras ainda livres (janela de 24 h de cancelamentos já existente).

## Etapas técnicas
1. **Migração aditiva (sem dados alterados)**
   - `ALTER TABLE public.tenants ADD COLUMN lista_espera_automatica boolean NOT NULL DEFAULT true;` + `COMMENT`.
   - Escolha da coluna em `tenants` em vez de `recursos_do_tenant`: `recurso_do_tenant_ativo` combina plano + interruptor e é usado para liberar telas; um interruptor de comportamento não deve depender de linha em `recursos_de_plano`. Alternativa possível: nova chave em `recursos_do_tenant` — descartada por exigir cadastro no catálogo de recursos e afetar a matriz de planos.
   - RLS de `tenants` já existente cobre leitura pela equipe; a escrita vai por server function com permissão `alterar_dados_barbearia`, usando o cliente do usuário (sem admin) — conferir política de UPDATE na implementação; se não permitir, criar RPC `definir_lista_espera_automatica(_tenant, _ativo)` security definer validando `has_tenant_permission`.
2. **Regra pura** em `src/lib/fila-compatibilidade.ts`:
   - `prazoDaOferta(agoraMs, inicioMs)` = `min(agora+30min, inicio-10min)`; exportar constantes; `ofertaViavel` (prazo ≥ 5 min).
   - `candidatosDaVaga` mantém ordem `posicao`, `criadoEm`, e desempate estável por `id`.
3. **`fila-ofertas.server.ts`**
   - `automacaoAtiva(db, tenantId)` lendo `tenants.lista_espera_automatica`; checar em `ofertarVaga` logo após `recurso_do_tenant_ativo` (motivo `automacao_desligada`). Isso cobre os três caminhos (painel, cliente, varredura, recusa/expiração) num ponto só.
   - Consulta da fila: `.order("posicao", { ascending: true, nullsFirst: false }).order("criado_em").order("id")` e paginação em blocos de 200 até achar candidato válido (ou buscar todos com teto alto, ex. 1000, já ordenados). Pular quem já recebeu oferta desta vaga e filtrar por `profissional_id` compatível no próprio SQL (`profissional_id.is.null,profissional_id.eq.X`) para reduzir volume.
   - Usar `prazoDaOferta` para `expira_em`; o texto do WhatsApp e a variável `prazo` do modelo já saem de `expira_em` — manter e garantir formato "até HH:MM" no fuso do negócio.
   - Aviso interno do sino passa a citar o prazo ("responde até HH:MM").
   - `processarListaDeEspera`: expira vencidas sempre (status coerente), mas só reoferta se o negócio tiver a automação ligada (já garantido por `ofertarVaga`).
4. **Tela pública `/vaga/$token`** (`src/routes/vaga.$token.tsx`): mostrar "Responda até HH:MM" a partir de `expiraEm`, igual ao WhatsApp.
5. **Server functions** em `src/lib/barbeiro.functions.ts` (ou `onboarding.functions.ts`, junto da Fila de chegada): `getListaEsperaAutomatica` e `salvarListaEsperaAutomatica` com `requireSupabaseAuth` + permissão; sem efeito em dados da lista.
6. **UI**: novo `src/components/barbeiro/InterruptorListaDeEspera.tsx` (mesmo padrão do `InterruptorFilaDeChegada`, `Switch` de ui/, 48 px, textos via `termos(segmento)` quando citar o negócio), usado em `barbeiro.fila.tsx` e `barbeiro.horarios.tsx`. Sem valores financeiros, sem popups.
7. **Testes**
   - `fila-compatibilidade.test.ts`: ordem por posição com >200 entradas embaralhadas; desempate; `prazoDaOferta` (30 min normal, limitado pela antecedência, inviável perto do horário).
   - Novo `fila-ofertas.server.test.ts` com cliente de banco simulado (sem banco real): automação desligada não cria oferta; religada cria; recusa passa ao próximo; expiração passa ao próximo; `expira_em` = prazo calculado; consulta usa ordenação.
   - Regressão: aceite continua via RPC atômica (não alterada).
8. **Validação**: prettier, tsgo, vitest, eslint, build; conferência visual do interruptor em 390/1280 só se houver acesso como dono (pendente de autorização); nenhum dado real alterado; não publicar. Registrar regra em `AGENTS.md`: "Automação da lista de espera decidida só em `ofertarVaga` por `tenants.lista_espera_automatica`".

## Arquivos envolvidos
- Migração nova (coluna em `tenants`, possivelmente RPC de escrita)
- `src/lib/fila-compatibilidade.ts` e `.test.ts`
- `src/lib/whatsapp/fila-ofertas.server.ts` (+ teste novo)
- `src/lib/barbeiro.functions.ts` ou `src/lib/onboarding.functions.ts`
- `src/components/barbeiro/InterruptorListaDeEspera.tsx` (novo)
- `src/routes/barbeiro.fila.tsx`, `src/routes/barbeiro.horarios.tsx`, `src/routes/vaga.$token.tsx`
- `AGENTS.md`

## Riscos
- Política de UPDATE em `tenants` pode não permitir à equipe gravar a coluna -> mitigado com RPC security definer validando permissão.
- Desligar com oferta em andamento: decidido manter a oferta já enviada até vencer (alternativa: cancelar na hora — me diga se prefere).
- Varredura a cada 15 min: após expirar, o próximo pode receber com até 15 min de atraso (já é o comportamento atual; sem novo agendador).
- Listas grandes: paginação limita custo; `validarAgendamento` roda por candidato — manter teto de tentativas por vaga (ex. 20) para não estourar o tempo da varredura.
- Concorrência já protegida pelo índice único de oferta ativa por vaga e pela RPC de aceite.
