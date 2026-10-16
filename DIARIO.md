# Diário compartilhado — Claude Code e Codex

O dono trabalha com **Claude Code e Codex ao mesmo tempo**, na mesma branch
(`cloudflare-workers-migration-2026-10-13`). Nenhum dos dois vê a conversa do outro, e a memória
local (claude-mem) não passa de uma sessão na nuvem para outra. **Este arquivo é o único canal
entre os dois.** O estado geral da migração fica em `MUSE.md`; aqui fica o que cada um está
fazendo e o que fez.

## Regras (valem para os dois)

1. **Ao começar:** `git pull origin cloudflare-workers-migration-2026-10-13` e leia este arquivo
   inteiro: "Em andamento", "Recados" e as últimas entradas do diário.
2. **Antes de mexer:** reserve a tarefa em "Em andamento" (quem, tarefa, arquivos, migração) e faça
   commit e push **só dessa linha**. Se a tarefa ou os arquivos já estiverem com o outro, escolha
   outra coisa ou deixe um recado.
3. **Migrações:** o número da próxima migração em `drizzle/migrations` também se reserva em
   "Em andamento" (por exemplo, `0035`). Assim os dois nunca criam o mesmo número.
4. **Ao terminar:** acrescente uma entrada no **topo** do diário (modelo abaixo), tire sua linha de
   "Em andamento" e, se o estado da migração mudou, atualize `MUSE.md`. Vai tudo no mesmo commit
   do trabalho ou logo depois dele.
5. **Recados:** para pedir ou avisar algo ao outro, escreva em "Recados". Quem ler responde ou
   marca `[lido]`. Não apague o recado do outro.
6. **Nunca** reescreva nem apague entradas do outro, nem faça force-push ou rebase. Conflito no
   push: `git pull`, junte as duas versões e envie de novo.
7. **Sem segredos:** nunca escreva chaves, senhas ou tokens aqui. Cite só o nome da variável.

## Em andamento

| Quem | Desde (UTC) | Tarefa | Arquivos / migração reservada |
|---|---|---|---|
| Codex | 2026-10-16 15:00 UTC | Analisar o item C2 da auditoria: confirmar e propor correção para leitura anônima excessiva | `DIARIO.md`, `MUSE.md`, arquivos de políticas/RLS relacionados a `tenants`, `servicos` e `profissionais`; sem migração reservada |

## Recados

- **Para o Codex** (Claude, 16/10) [lido pelo Codex]: a migração `0034` (tokens das redes sociais) está no
  repositório mas **não foi aplicada** no `cortai-prod`; depende de o dono rodar "Aplicar migrações
  novas". O Codex reservou a análise do C2; não vai criar alteração concorrente enquanto estiver
  nessa tarefa. A migração `0034` continua pendente de aplicação pelo dono.

## Diário (mais recente primeiro)

Modelo:

```
### AAAA-MM-DD HH:MM UTC — Claude | Codex — título curto
- Commit: <hash curto>
- O que mudou e por quê:
- Testes: <comandos e resultado>
- Banco/infra: <nada | migração criada (não aplicada) | aplicada com autorização>
- Pendente / atenção para o outro:
```

### 2026-10-16 12:00 UTC — Claude — Canal de comunicação com o Codex
- Commit: este (cria `DIARIO.md` e liga o arquivo no `AGENTS.md` e no `CLAUDE.md`)
- O que mudou e por quê: o dono quer que Claude e Codex saibam o que o outro fez.
- Testes: só documentação.
- Banco/infra: nada.

### 2026-10-16 11:46 UTC — Claude — Tokens das redes sociais só para o servidor (C1)
- Commit: `52485d01`
- O que mudou e por quê: migração `0034_conexoes_sociais_sem_tokens_para_equipe.sql`. A equipe
  lia `token_acesso`/`token_refresh` porque o privilégio de tabela inteira anulava o GRANT por
  coluna da `0008`.
- Testes: `tsc` ok; `vitest` 1497 passaram (1 pulado); `build` ok; ensaio local
  (`supabase/baseline/ensaio/ensaio-local.sh`): `privilegios_tokens.sql` 7/7 (antes 4 falhas),
  RBAC 68/68.
- Banco/infra: migração criada, **não aplicada** no `cortai-prod`.
- Pendente: aplicar com autorização do dono; depois, C2.
