# Auditoria técnica do Cortaí — 11/10/2026 (somente leitura)

Nada foi alterado no código, no banco, nas configurações nem na publicação. Este documento é o relatório da auditoria. Ao aprovar, ele vira `docs/auditoria-2026-10-11.md` e nenhuma correção é feita.

## 1. Resumo executivo

- **Build e testes estão saudáveis:** a checagem de tipos rodou sem erros e a suíte inteira passou (126 arquivos, 1038 testes, 1 ignorado).
- **Servidor:** os pontos já revisados continuam sólidos. O webhook da Evolution recusa chamadas sem segredo válido (503 sem segredo configurado, 401 com segredo errado) e o IP vem só de `ipDaChamada()`. Os cupons comparam o código sem curinga.
- **Falhas confirmadas que continuam abertas:** fila de chegada pública sem limite de tentativas; avisos que apontam para `/painel`, uma página que não existe; 76 conversões `as never`; transcrição de áudio nunca testada com áudio real; gesto de arrastar para fechar nunca testado em aparelho.
- **Conclusão:** não há achado grave confirmado no que foi lido. A cobertura é parcial (ver seção 9), então isso **não** prova que o projeto está seguro.

## 2. Tabela de achados

| ID | Sev. | Domínio | Onde | Evidência | Impacto | Como reproduzir | Recomendação |
|---|---|---|---|---|---|---|---|
| A1 | P1 | Fila pública | `src/lib/fila-publica.functions.ts` `entrarNaFilaPublica` (l.73-95) | Usa a chave de serviço e não chama `limitarPublico`/`barrarAbusivo` | Um robô pode encher a fila de chegada de qualquer negócio com nomes e telefones falsos | Repetir POST com o slug de um negócio que tem a fila ligada | Limite por IP e por slug com `limitarPublico` |
| A2 | P2 | Notificações | `src/lib/push/aviso-sininho.server.ts:72`, `src/lib/whatsapp/fluxo.server.ts:943` | O link padrão é `"/painel"`, mas essa rota não existe (as rotas reais são `/barbeiro/...`) | Tocar no aviso abre "página não encontrada" | Aviso sem link próprio → tocar no push | Usar `links-de-tela.ts` como link padrão |
| A3 | P2 | Público | Agendamento público (achado 11 de 09/10) | Não mudou no que foi lido | Alguém pode agendar com o telefone de outra pessoa | Agendar pelo link com um número que não é seu | Confirmação leve ou limite por telefone |
| A4 | P2 | Cliente anônimo | Permissões de coluna (achado 12) | Não reverificado no banco nesta rodada | Comissão e `user_id` podem estar visíveis a qualquer visitante | — | Reconferir no catálogo e revogar as colunas |
| A5 | P2 | WhatsApp áudio | `transcricao.server.ts`, `fluxo.server.ts:461-463` | Está ligado ao fluxo, mas não há teste automático nem teste real | Áudio de cliente pode falhar sem ninguém perceber | Mandar áudio para a Aurora | Teste de ponta a ponta e testes unitários com áudio simulado |
| A6 | P2 | UX gavetas | `useArrastarParaFechar.ts`, `sheet.tsx` | Fecha clicando o botão interno do Radix; nunca validado em aparelho | O gesto pode não funcionar ou dar "pulo" no iOS ou no Android | Arrastar o menu no celular | Teste em aparelho; fechar pelo contexto do Dialog em vez do botão |
| A7 | P3 | Qualidade | 76 `as never` em `src` | Contagem por busca no código | Escondem erros de tipo em chamadas ao banco | — | Remover aos poucos, junto com os tipos gerados |
| A8 | P3 | Arquitetura | Dois sistemas de migração (Supabase e Drizzle) | `supabase/migrations` e `drizzle/migrations` | Risco de histórico divergente | — | Documentar qual vale e congelar o outro |
| A9 | P3 | Legado | `/api/public/cortai/acoes`, `/api/public/alvo-ia`, `ia/ponte.server.ts` | Ainda publicados, com token e `barrarAbusivo` | Superfície de ataque sem uso no fluxo novo | — | Desligar por interruptor e depois remover, sem DROP |
| A10 | P3 | Busca de comanda | `comanda-ticket.functions.ts:293` | `ilike(prefixo%)` com prefixo validado e filtro por tenant | Baixo; vale confirmar que `prefixoDeCodigo` remove `%` e `_` | — | Escapar curingas |
| A11 | P3 | IA | `config_atendimento_ia.cortai_ativa` | Não existe no código (busca vazia) | Ainda não há um interruptor geral da CortAI fora do WhatsApp | — | Fase 3 do plano da CortAI |

## 3. Segurança e isolamento entre negócios

- **Confirmado no código atual:** o negócio vem do vínculo da pessoa logada (`vinculoDoMembro` + `escolherVinculo`) e acesso suspenso é recusado. As permissões passam por `exigirPermissao` → `has_tenant_permission`. O webhook da Evolution recusa por padrão. Os cupons não aceitam curinga. O IP não é forjável.
- **Comparação com a auditoria de 09/10:**
  - Corrigidos: 1, 7 e 16 (a parte do IP), confirmados no código. Os itens 2, 3 e 6 aparecem como corrigidos pela migração 0027, mas não foram reverificados no banco nesta rodada.
  - Os itens 4, 5, 8 (IP) e 17 continuam "corrigidos no código". Não é possível confirmar se já estão publicados.
  - Abertos e confirmados: 9 (= A1), 10 (= A7/A8) e 10b (= A2).
  - Não verificáveis nesta rodada: 11, 12, 13, 14 e 15.

## 4. Bugs funcionais e regras

- Links `/painel` quebrados (A2).
- Remarcação feita pela IA pode recriar o horário como agendamento novo (achado 13; não reverificado).
- Agendamentos antigos com origem `app` continuam assim: a migração 0026 não fez backfill, que depende de autorização.

## 5. Visual e celular

- Não houve verificação visual nesta rodada: a sessão disponível não tem estabelecimento. Ficam pendentes: gavetas com arrasto, o sino nas três identidades, o cadastro inicial em 360/390px e o banner de cookies.

## 6. Confiabilidade e integridade

- A suíte cobre dedupe, envios presos, números 1/2/3, Pix com token, fila e gestos.
- Contadores não atômicos e consultas sem limite (achado 15) não foram reverificados.

## 7. Integrações

| Integração | Estado |
|---|---|
| Evolution (texto) | Implementada; depende de URL, chave e segredo configurados no ambiente publicado e do envio do cabeçalho `x-webhook-secret` |
| Evolution (áudio) | Implementada, não testada |
| Meta Cloud | Implementada (coexiste com a Evolution) |
| Asaas | Implementada; a chave só circula em funções de admin |
| Push | Implementado; o link padrão está quebrado (A2) |
| CortAI | Implementada pelo gateway de IA; falta o interruptor geral (A11) |
| ALVO IA | Legado, ainda exposto (A9) |

## 8. Testes e build executados nesta rodada

- `npx tsc --noEmit`: sem erros.
- `npx vitest run`: 126 arquivos, 1038 testes passaram e 1 foi ignorado. Os 8 testes de números que falhavam na rodada anterior agora passam.
- Lint e build de produção: **não executados** nesta rodada.

## 9. O que não foi verificado e por quê

- **Banco de produção** (RLS, permissões de coluna, funções `SECURITY DEFINER`, buckets): o modo de leitura desta rodada não consultou o catálogo.
- Motor de disponibilidade, `whatsapp/motor/*`, `barbeiro.functions` e a maioria das telas: não foram lidos linha a linha, por limite de tempo.
- **Visual em 390/1280px:** não há sessão com estabelecimento.
- **Ambiente publicado** (segredos presentes, logs, áudio real): não consultado.
- Service worker e recuperação de chunk: só cobertos pelos testes existentes.

## 10. Plano de correção priorizado (não executado)

1. A1: limite de tentativas na fila pública.
2. A2: link padrão dos avisos via `links-de-tela.ts`.
3. Rodada de banco somente leitura: reconferir 0027, A4 e as funções expostas.
4. A5 e A6: teste real de áudio e do gesto no celular, com testes automáticos.
5. Rodar lint e build e registrar o resultado.
6. A3: proteção do telefone no agendamento público.
7. A9 e A11: interruptor da CortAI e desligamento do legado ALVO IA.
8. A7, A8 e A10: limpeza técnica gradual.
