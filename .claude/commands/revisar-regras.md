---
description: Confere o que mudou no código contra as regras do projeto (contrato de design e AGENTS.md)
argument-hint: "[intervalo de commits, ex.: abc123..def456; padrão: os commits novos da branch de trabalho]"
---

Revise as mudanças recentes contra as regras do Flow. Intervalo: `$ARGUMENTS` (vazio = o que chegou à branch `cloudflare-workers-migration-2026-10-13` desde a última revisão; se não souber qual foi, use `git log --oneline -15 origin/cloudflare-workers-migration-2026-10-13` e pergunte). Somente leitura: não edite nada.

Leia primeiro `docs/contrato-de-design.md`, `CLAUDE.md` e os `AGENTS.md` das pastas tocadas (`src/lib`, `src/lib/brain`, `src/lib/whatsapp`, `src/components/barbeiro/agenda`, `src/components/comanda`). Depois rode `git fetch origin` e `git diff <intervalo> --stat` para listar os arquivos.

## O que procurar nas linhas **novas** (não no que já existia)

**Design (arquivos `.tsx`)**
- Cor solta: hexadecimal (`#...`) ou cor nativa do Tailwind (`cyan-400`, `white`, `red-500`...). Só valem os tokens (`ink`, `paper`, `gold`, `rosa`, `sage`, `brick`, `status-*`...). Exceções: `lib/cor-marca.ts`, logos e o verde do WhatsApp.
- `<button` cru fora de `components/ui/`; `className="btn-primary|btn-secondary|btn-tertiary"` dentro de `Button`; botão de ícone sem `aria-label`.
- `window.confirm`, `alert`, `prompt`; chamada direta a `toast` em vez de `aviso.*` e `comDesfazer`.
- `!important`, `body:has(`, classe nova em `styles.css` para uma tela só.
- Rota ou componente com mais de 300 linhas.
- Alvo de toque menor que 48px ou texto menor que 12px.

**Regras de negócio e arquitetura**
- Cálculo de horário livre fora de `disponibilidade.ts`; `setHours(0` ou `new Date().getHours` em vez de `hojeNoFuso` e `inicioDoDiaNoFuso`.
- Segunda fonte para algo que já tem um lugar único (links de tela em `links-de-tela.ts`, formato de aviso em `whatsapp/modelos.ts`, entendimento do texto em `conversa/entender.ts`).
- Palavras de segmento ("barbeiro", "barbearia") em nome de função, tabela, tipo ou texto fixo: devem aparecer só na tela, via `termos(segmento)`. Rotas `/barbeiro/*` já existem; só aponte novas.
- Pagamento marcado como confirmado sem passar pela função oficial; texto da IA afirmando algo que o sistema não confirmou.
- Funções do servidor novas sem `requireSupabaseAuth` e sem justificativa de serem públicas; `supabaseAdmin` sem `exigirPermissao`; `ilike` com texto digitado.
- `any` e `as never` novos.

**Banco (arquivos em `drizzle/migrations`)**
- `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `DELETE` de dados.
- Política de escrita só com `is_tenant_member`.
- Função `SECURITY DEFINER` sem `search_path` fixo.
- Migração sem entrada em `meta/_journal.json`.

**Produto**
- Algo que desliga agenda, comanda ou notificações essenciais quando a IA é desligada.
- Mudança de versão: `src/lib/novidades.ts` e `public/versao.json` devem andar juntos; o campo `minima` só sobe depois de publicar.
- Arquivo de plano criado em `docs/` para um ajuste pequeno.

## Resposta

Lista por gravidade (**quebra regra**, **atenção**, **sugestão**), cada item com arquivo, linha, a regra violada (com o arquivo onde ela está escrita) e como corrigir. Se nada violar, diga isso em uma frase. Não corrija: para consertar, sugira o pedido exato para uma das IAs aplicar na branch de trabalho.
