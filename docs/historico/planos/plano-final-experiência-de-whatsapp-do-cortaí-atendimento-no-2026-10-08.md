# Plano final — Experiência de WhatsApp do Cortaí (Atendimento + Notificações pela Central)

Nada será implementado antes da aprovação. Sem publicação automática.

## 1. Roteamento de Notificações (regra definitiva)

Uma única função decide: `escolherConexaoDeNotificacao` (pura, em `finalidade-conexao.ts`), chamada por `conexaoDeEnvio(tenantId, "notificacoes")`.

```text
notificacoes_whatsapp_ativas = false
    -> não envia por WhatsApp; registra "notificacoes_desativadas"; sininho/push seguem.

EXISTE conexão própria tipo=notificacoes do tenant (qualquer status)
    -> conectada: envia pela própria
    -> desconectada/pendente/qr/erro: FALHA registrada + aviso ao dono. Nunca usa a Central.

NÃO existe conexão própria tipo=notificacoes
    -> tenant habilitado para a Central (ver item 2) E Central conectada: envia pela Central
    -> habilitado, mas Central indisponível: FALHA registrada ("Nossa equipe precisa verificar a conexão"),
       alerta ao Admin. Não usa o Atendimento do tenant nem o número oficial antigo.
    -> NÃO habilitado: comportamento atual inalterado (legado: conexão única do tenant atende
       os dois papéis; sem conexão própria, a reserva oficial existente).
```

- "Própria existente porém desconectada" é tratada como falha; "nunca teve própria" é o único caso que pode ir à Central.
- Nenhum fallback silencioso: toda troca de remetente fora da regra acima é proibida e toda falha fica em `envios_de_whatsapp` com motivo específico.
- Atendimento (conversa do CortAI) não muda: continua com `escolherConexaoPorFinalidade(…, "atendimento")` e nunca usa a Central.

## 2. Rollout gradual da Central

Duas colunas novas em `tenants`, separando serviço e migração:

- `notificacoes_whatsapp_ativas boolean NOT NULL DEFAULT true` — interruptor do estabelecimento ("Notificações pelo WhatsApp"). Mantém a semântica atual: hoje todos recebem avisos.
- `notificacoes_central_habilitada boolean NOT NULL DEFAULT false` — controlado somente pelo Admin. Publicar a Central não migra ninguém.

**Condição exata para um tenant usar a Central:**
`notificacoes_whatsapp_ativas = true` AND `notificacoes_central_habilitada = true` AND não existe conexão própria `tipo = notificacoes` do tenant AND a Central está `conectado`.

Operações:
- Ativar para um tenant: Admin liga `notificacoes_central_habilitada` (função protegida por `has_role(admin)`, com auditoria).
- Desativar: Admin desliga; o tenant volta imediatamente ao comportamento legado.
- Legado: tenants com conexão própria de notificações nunca são afetados, mesmo habilitados.
- Rollback sem apagar dados: desligar a flag (por tenant ou todos de uma vez via Admin); colunas, linha da Central e conexões existentes permanecem.
- Ordem sugerida: Aurora (demonstração) → 1–2 tenants reais → demais.

## 3. Armazenamento da Central (com segurança contra código antigo)

Linha em `conexoes_whatsapp` com:
- `escopo = 'central'`, `tenant_id = NULL`, `tipo = 'notificacoes'`, `provedor = 'evolution'`, `sessao_id` próprio (`cortai_central_…`).
- `compartilhada = false` — de propósito: o código antigo procura o número oficial com `compartilhada = true` sem filtro de tenant; com `false` ele nunca encontra a Central.
- Índice único parcial: no máximo uma linha `escopo='central'`.
- `CHECK`: `escopo='tenant'` exige `tenant_id NOT NULL`; `escopo='central'` exige `tenant_id IS NULL`.
- RLS: políticas atuais filtram por membro do tenant; `tenant_id NULL` nunca satisfaz `is_tenant_member`. Leitura/escrita da Central só pelo servidor após checar `has_role(admin)`.

Por que é seguro mesmo com rollback de código:
- `escolherConexaoPorFinalidade` recebe linhas buscadas com `.eq("tenant_id", tenantId)` → ignora NULL.
- Busca do número oficial antigo filtra `compartilhada = true` → ignora a Central.
- `gatewayDaSessao`/`podeEnviarPelaConexao` exige mesmo tenant ou compartilhada → bloqueia a Central para qualquer tenant.
- Webhook antigo que receber evento da sessão central encontra `tenant_id NULL` e não processa (registra e descarta). No código novo, respostas a avisos na Central são associadas ao tenant pelo envio original (`envios_de_whatsapp` + telefone), nunca pela conexão.

## 4. Telas

- `/barbeiro/cortai` (estabelecimento): dois cartões.
  - "Meu WhatsApp de Atendimento": QR grande, instrução curta, "Outras formas de conexão" secundárias; depois 🟢 Conectado + número + Gerenciar/Reconectar/Desconectar.
  - "Notificações pelo WhatsApp": só interruptor e estado (🟢 Notificações ativas / 🟢 Envio disponível, 🟠 Restabelecendo envio, ⚪ Desativadas). Tenant com conexão própria de notificações legada continua vendo esse cartão de conexão até migrar.
  - Remover termos técnicos (reserva, Evolution, sessão, instância, webhook, Meta, canal). Erros sempre com ação.
- `/admin` (nova seção "WhatsApp Central"): conectar/QR/código de vinculação/reconectar/desconectar, saúde do monitor, lista de tenants com a flag da Central.
- "Secretária" → "CortAI — Assistente Virtual" nas telas tocadas.

## 5. Validação antes da migration (somente leitura, resultados mostrados antes de aplicar)

1. `SELECT count(*) FROM conexoes_whatsapp WHERE tenant_id IS NULL` = 0.
2. Após adicionar `escopo DEFAULT 'tenant'`: todas as linhas existentes com `escopo='tenant'` (verificação por consulta, a coluna nasce com default).
3. Nenhum conflito no índice: nenhuma linha atual cumpre o predicado `escopo='central'`; índices atuais (`tenant+tipo`, `sessao_id`) sem duplicatas.
4. Inventário de toda query a `conexoes_whatsapp` (`rg`), classificando cada uma: filtra por tenant / filtra por sessao / global. Cada consulta global ou por sessão será revisada para tratar `tenant_id NULL` (listagem anexada ao relatório da etapa).
5. Revisar `types.ts` regenerado: `tenant_id` passa a `string | null`; corrigir todos os pontos que o typecheck apontar, sem `!` cego.

Migration (aditiva, sem DROP, sem apagar dados): `escopo text NOT NULL DEFAULT 'tenant'`, `tenant_id DROP NOT NULL` (só após as checagens; requer confirmação), CHECKs, índice parcial, duas colunas em `tenants`, função `admin_definir_central_do_tenant`.

## 6. Arquivos previstos

- Novo: `whatsapp/central.server.ts` (ler/conectar Central, só admin), `central.functions.ts`, testes.
- Alterados: `finalidade-conexao.ts`, `conexao-envio.server.ts`, `fluxo.server.ts` (resposta recebida na Central), `monitor-conexoes.server.ts` (inclui Central, alerta ao Admin), `whatsapp.functions.ts`, `routes/barbeiro.cortai.tsx`, `routes/admin.*` (seção Central), `whatsapp/AGENTS.md`.
- Não mexe: agenda, preços, permissões de tenant, CortAI/cérebro, opções numeradas, dedup/idempotência, gateway.

## 7. Testes obrigatórios

Roteamento (regra pura):
- própria conectada → própria; própria desconectada → falha, sem Central; sem própria + habilitado + Central ok → Central; sem própria + habilitado + Central fora → falha; sem própria + não habilitado → legado idêntico ao atual; serviço desativado → nada enviado.

Compatibilidade / rollback:
- `escolherConexaoPorFinalidade` com lista contendo a Central nunca a escolhe.
- Busca de conexões do tenant ignora `tenant_id IS NULL`.
- Busca do número oficial antigo (`compartilhada = true`) não retorna a Central.
- `podeEnviarPelaConexao(central, qualquerTenant)` = false.
- Funções antigas (`conexaoDeEnvio` sem finalidade, atendimento, legado com uma conexão) com resultados iguais aos de hoje.
- Simulação de rollback: lógica antiga executada sobre dados com Central presente → Central nunca exposta.

Segurança / isolamento:
- usuário de tenant chamando funções da Central → negado; admin → permitido.
- listagem de conexões do tenant (RLS) nunca inclui a Central.
- resposta "1" recebida na Central vai só para o tenant do envio original; dois tenants com avisos para o mesmo telefone → pergunta "qual horário", sem cruzar dados.

Central: conectar/QR, monitor marca queda, alerta ao Admin deduplicado.

Etapas de execução após aprovação: (1) validações + migration, (2) roteamento + testes, (3) Central/Admin + segurança, (4) telas, (5) suíte completa, typecheck, lint, teste visual 390px. Relatório com resultados reais; sem afirmar funcionamento não validado. Publicação só com sua autorização.

## Riscos
- `tenant_id` nullable exige revisar todas as consultas — mitigado pelo inventário do item 5 e typecheck.
- Mesmo telefone recebendo avisos de vários tenants pela Central — mitigado pela associação ao envio original e pergunta de desambiguação.
- Central fora do ar afeta todos os habilitados — mitigado por rollout gradual, monitor e flag de rollback imediato.
