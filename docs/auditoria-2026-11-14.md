# Auditoria do Cortaí / FLOW — 14/11/2026

Revisão somente leitura. Nada foi alterado no código, no banco ou na publicação.

## Escopo e cobertura

**Ponto de partida:** auditoria anterior (`docs/auditoria-2026-10-09.md`, commit `7ed1c6a7`). Cada achado de lá foi conferido no estado atual do código.

**Código lido nesta rodada (cerca de 40 arquivos):**
- Todos os arquivos citados na rodada anterior: `sessao.functions.ts`, `cobranca.server.ts`, `monetizacao.functions.ts`, `rascunho.functions.ts`, `fila-publica.functions.ts`, `assistente.functions.ts`, `brain/acoes.server.ts`, `brain/acesso-painel.server.ts`, `brain/secretaria-publica.functions.ts`, `vinculo-ativo.ts`, `comparacao-exata.ts`, `webhook-guard.server.ts`
- Arquivos novos desde a última auditoria: `agenda-chat.functions.ts`, `atendimento.functions.ts`, `barbearias.functions.ts`, `dono.functions.ts`, `voz.functions.ts`, `institucional.functions.ts`, `prazo-cancelamento.ts`, `prazo-cancelamento.server.ts`, `fila-publica-limite.ts`, `links-de-tela.ts`
- Rotas públicas: `api/public/oauth/$plataforma.ts`, `api/public/alvo-ia.ts`
- Código de suporte: `redes-sociais.server.ts`, `postagens-sociais.server.ts`

**Banco de produção:** sem acesso ao catálogo nesta rodada (MCP Supabase não disponível no ambiente de execução). Os achados 2, 3, 6, 12 e 14 que dependem do banco são marcados com **(banco não verificado)** — o estado informado é o da última rodada.

**Não lido:**
- Componentes e telas
- Motor de disponibilidade (`disponibilidade.ts`) e motor do WhatsApp (`whatsapp/motor/*`)
- A maioria dos `*.functions.ts` (além dos listados acima)
- O corpo das RPCs no banco

---

## Resumo executivo

A maior parte das correções da rodada anterior foi confirmada no código. O sistema continua com boa postura: webhooks fechados, isolamento por tenant, IA nunca confirma ação sozinha, chaves só no servidor.

**Pontos que ainda merecem atenção:**

| # | Severidade | Tema | Estado |
|---|---|---|---|
| 4-R | Média | WhatsApp equipe: sem checagem de permissão por ação (resíduo do achado 4) | **Aberto** |
| 8 | Baixa | Secretaria do site: `barrarAbusivo` global, mas sem `consumirLimite` por IP separado | **Aberto** |
| 9 | — | Fila de chegada pública sem limite | **Corrigido** |
| 10 | Baixa | 217 `as never` / `as any` no código | **Parcialmente aberto** |
| 11 | Média | Agendamento com telefone de terceiros | **Aberto** (produto) |
| 13 | Baixa | Remarcação pela IA recria o original como novo | **Aberto** |
| 15 | Baixa | Legado ALVO IA exposto (desabilitado sem segredo) | **Parcialmente melhorado** |
| 16 | Média | Rascunho: salvar e publicar sem rate limiting | **Parcialmente aberto** |
| N1 | Baixa | Curinga `_` não escapado em buscas ilike | **Novo** |
| N2 | Baixa | `enviarPedidoDeProjeto` sem rate limiting | **Novo** |
| N3 | Baixa | Tokens OAuth em texto puro no banco | **Novo** |

---

## Estado dos achados anteriores

### Achado 1 — Admin por curinga no e-mail ~~Crítica~~
> **CORRIGIDO (confirmado no código).** `sessao.functions.ts:66` usa `mesmoEmail` de `comparacao-exata.ts`. A lista de e-mails autorizados é lida e comparada por igualdade exata (sem diferenciar maiúsculas).

### Achados 2, 3 e 6 — Escrita irrestrita pela equipe no banco ~~Alta/Média~~
> **Marcados como corrigidos pela migração `0027` (09/10/2026). Banco não verificado nesta rodada.** Na rodada anterior, 76 de 76 casos RBAC passaram após a migração.

### Achado 4 — CortAI no painel ignora papel e permissões ~~Alta~~
> **CORRIGIDO no código (painel).** `assistente.functions.ts:119,241` usa `vinculoDoMembro`, `exigirPermissao(visualizar_clientes)` e `acessoDoPainel`, que resolve papel e permissões efetivas via `has_tenant_permission`. `brain/acesso-painel.server.ts` confirma a implementação.

> **Resíduo ABERTO (4-R):** no canal do WhatsApp, `acaoPermitida` para `ehEquipeNoWhatsapp` confere apenas `a.papeis` (campo `papeis` da definição) e, quando esse campo não existe, cai em `a.canais.includes("painel")`. O campo `a.permissoes` (usado no painel) **não** é consultado para WhatsApp. Resultado: gerente e recepção classificados como `"profissional"` podem invocar `cancelar_agendamento` e `reagendar_agendamento` via WhatsApp mesmo sem as permissões `cancelar_agendamento` e `agendamento_manual`. **Local:** `src/lib/brain/acoes.server.ts:948-956`.

### Achado 5 — `tenantIdDoMembro` ignora o negócio escolhido ~~Alta~~
> **CORRIGIDO no código.** `src/lib/vinculo-ativo.ts` implementa `escolherVinculo`: prefere o `tenant_ativo` do perfil se o acesso estiver ativo, senão o primeiro ativo em ordem estável.

### Achado 7 — Cupom aceita curinga ~~Média~~
> **CORRIGIDO (confirmado no código).** `cobranca.server.ts:139` e `monetizacao.functions.ts:227` chamam `codigoDeCupomValido` antes do `ilike`. Só letras, números e hífen chegam à busca.

### Achado 8 — Secretária do site: limite por visitante burlável
> **IP corrigido.** `secretaria-publica.functions.ts:24,35` usa `barrarAbusivo` e `ipDaChamada`. O `barrarAbusivo` aplica um limite global por endpoint.
> **Aberto:** o limite extra por visitante individual com `consumirLimite` (separado do limite global) ainda não foi adicionado. Um atacante com múltiplos IPs legítimos pode continuar esgotando a cota de um negócio sem atingir o limite do endpoint.

### Achado 9 — Fila de chegada pública sem limite de taxa
> **CORRIGIDO (confirmado no código).** `fila-publica.functions.ts:85-95` usa `ipDaChamada` e `consumirLimite` via `aplicarLimiteDaFila` de `fila-publica-limite.ts`.

### Achado 10 — Dois sistemas de migração e casts desnecessários
> **Parcialmente aberto.** Contagem atual: **217 ocorrências** de `as never` ou `as any` em `src/`. O prazo de migração dupla persiste.

### Achado 10b — Avisos apontam para `/painel` (rota inexistente)
> **CORRIGIDO (confirmado no código).** `push/aviso-sininho.server.ts:74` usa `LINKS_DE_TELA.inicio` (= `/barbeiro`). `whatsapp/fluxo.server.ts:960` também usa `LINKS_DE_TELA.inicio`. Não há mais `/painel` como destino de aviso nesses dois arquivos.

### Achado 11 — Agendamento público com telefone de terceiros
> **Aberto (decisão de produto pendente).**

### Achado 12 — Dados internos legíveis pelo visitante anônimo
> **Banco não verificado nesta rodada.** Comissão e `user_id` de profissionais ainda podem estar acessíveis via `anon`. Aguarda ação de banco.

### Achado 13 — Remarcação pela IA recria o original como novo
> **Aberto (decisão arquitetural pendente).**

### Achado 14 — Painel admin com números errados acima de 1000 linhas
> **Banco não verificado nesta rodada.** Sem mudança no diagnóstico.

### Achado 15 — Pontos menores
> **Parcialmente melhorado.** Legado ALVO IA: o endpoint `/api/public/alvo-ia` ainda existe, mas responde 503 quando `ALVO_IA_WEBHOOK_SECRET` não está configurado — ou seja, está desabilitado no ambiente padrão. Outros pontos (contador de cupom, JSON sem try, consultas sem limite) não foram verificados nesta rodada.

### Achado 16 — Criação de negócios sem login com freio forjável
> **IP corrigido.** `rascunho.functions.ts:114` usa `ipDaChamada`.
> **Aberto:** `salvarRascunhoDeBarbearia` (linha 220) e `publicarRascunhoDeBarbearia` (linha 242) **não** têm `freioDeAbuso` nem `consumirLimite`. Só `criarRascunhoDeBarbearia` (linha 183) tem o freio. Um atacante pode salvar e publicar rascunhos sem limite depois de criar apenas um.

### Achado 17 — Prazo de cancelamento configurado, mas não aplicado ~~Média~~
> **CORRIGIDO no código.** `prazo-cancelamento.ts` e `prazo-cancelamento.server.ts` existem. `acoes.server.ts:797` chama `exigirPrazoDeCancelamento` quando `ehCliente(ctx)`.

---

## Achados novos

### N1 — Baixa — Curinga `_` não escapado em buscas ilike autenticadas

**Onde:**
- `src/lib/barbeiro.functions.ts:1105`: `data.termo.replace(/[%,()]/g, "")`
- `src/lib/comanda-ticket.functions.ts:296`: `termo.replace(/[%,()]/g, " ")`
- `src/lib/descoberta.functions.ts:31`: `termo.replace(/[%,()]/g, " ")`

**O que acontece:** o escape remove `%` e `()` mas não `_`. Em PostgreSQL, `_` em um padrão `ilike` casa com **qualquer caractere único**. Um usuário que digitar `A_a` receberá "Ana", "Ara", "Aba", etc.

**Efeito:** resultados mais amplos do que o esperado em buscas de clientes (autenticado, dentro do tenant) e de negócios públicos. Não expõe dados além do escopo normal, não permite injeção SQL. Risco principalmente de degradar a precisão da busca.

**Correção sugerida:** adicionar `_` ao escape: `.replace(/[%_,()]/g, (c) => c === "%" || c === "_" ? `\\${c}` : " ")` e usar `.ilike(..., { escape: "\\\\" })` ou mudar para `.textSearch` onde couber. A função `padraoDoBanco` em `brain/busca-cliente.ts` já usa `_` intencionalmente como curinga (para acentos); o escape não deve ser aplicado lá.

---

### N2 — Baixa — `enviarPedidoDeProjeto` sem limite de taxa

**Onde:** `src/lib/institucional.functions.ts:28`, função pública sem `requireSupabaseAuth`.

**O que acontece:** qualquer visitante pode chamar o endpoint sem limite, inserindo linhas na tabela `pedidos_de_projeto`.

**Efeito:** spam no banco de pedidos. O impacto é operacional (ruído nas notificações), não compromete dados de outros usuários.

**Correção sugerida:** adicionar `barrarAbusivo` ou `consumirLimite` por IP, como nas demais funções públicas.

---

### N3 — Baixa — Tokens OAuth em texto puro

**Onde:** `src/routes/api/public/oauth/$plataforma.ts:45-46`; leitura em `src/lib/postagens-sociais.server.ts`.

**O que acontece:** `token_acesso` e `token_refresh` do Instagram e TikTok são gravados em texto puro na tabela `conexoes_sociais`. Se o banco for comprometido (vazamento de backup, serviço mal configurado), os tokens ficam diretamente legíveis.

**Efeito:** um atacante com acesso ao banco pode publicar conteúdo nas contas sociais dos negócios sem interação do dono.

**Mitigantes presentes:** os tokens só são usados pelo servidor (`postagens-sociais.server.ts` lê com `supabaseAdmin`), e o RLS impede leitura pelo cliente. A janela de risco é a de acesso direto ao banco.

**Correção sugerida:** cifrar o token com `pgcrypto` (`pgp_sym_encrypt`) ou com uma chave de envelope gerenciada externamente, decifrando só no servidor antes de usar. Pede decisão de produto sobre o custo operacional.

---

## O que está bem feito (mantido da rodada anterior)

- Webhooks conferem assinatura em tempo constante e têm idempotência.
- O tenant nunca vem do cliente: vem da sessão ou do token do servidor.
- A IA nunca confirma ação sozinha; escrita requer confirmação.
- Funções de admin conferem papel em todas as chamadas.
- Tokens de API e de ticket são guardados como hash.
- Contadores de rate limit ficam no banco (funciona com múltiplas instâncias).
- O OAuth para redes sociais verifica o `state` com HMAC antes de gravar.
- Novas funções autenticadas adicionadas desde outubro (`agenda-chat`, `atendimento`, `barbearias`, `dono`, `voz`) usam corretamente `requireSupabaseAuth` e `tenantIdDoMembro`.
- O `.env` só tem chaves públicas; nenhuma `service_role` ou `sk_` foi encontrada.

---

## Ordem sugerida de correção

1. **Achado 4-R (Média):** conferir `a.permissoes` também para o canal WhatsApp equipe em `acaoPermitida`.
2. **Achado 16 (Média):** adicionar `freioDeAbuso` / `consumirLimite` em `salvarRascunhoDeBarbearia` e `publicarRascunhoDeBarbearia`.
3. **Achado 8 (Baixa):** adicionar `consumirLimite` por IP na secretaria do site, separado do `barrarAbusivo` global.
4. **Achado N2 (Baixa):** `barrarAbusivo` em `enviarPedidoDeProjeto`.
5. **Achado N1 (Baixa):** escapar `_` nos ilike de busca (não em `padraoDoBanco`).
6. **Achados 11 e 13 (produto/arquitetura):** decidir e implementar.
7. **Achado N3 (Baixa):** avaliar cifrar tokens OAuth; envolve migração.
8. **Achados 12, 14 (banco):** reverificar no catálogo após próxima janela de acesso.
