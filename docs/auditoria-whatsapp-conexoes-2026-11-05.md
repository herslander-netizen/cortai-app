# Auditoria — conexões WhatsApp do Flow e Evolution API (prévia)

**Data:** 05/11/2026 · **Autor:** Claude · **Pedido do dono:** auditar se a falha de conexão vem de mistura entre o
WhatsApp administrativo do Flow e o WhatsApp dos estabelecimentos, antes de qualquer correção.
**Escopo:** só leitura — código da branch oficial, banco `cortai-preview`, Railway (projeto `Evolution-CortAI`),
Evolution v2.3.7 pelo workflow "Diagnóstico Evolution (prévia)" (execução 42077984866). Nada foi alterado,
desconectado, apagado ou pareado. `cortai-prod` não foi tocado.

---

## 1. Causa raiz (comprovada)

**O Redis da Evolution não consegue gravar no próprio volume.** Desde ~14:58 UTC (11:58 em Brasília) ele registra, a
cada 6 s:

```
Failed opening the temp RDB file temp-NNN.rdb (in server root dir /data) for saving: Permission denied
Background saving error
```

Com `stop-writes-on-bgsave-error` (padrão do Redis), ele passa a **recusar gravações** (`MISCONF … unable to persist
to disk`). A Evolution guarda o estado da sessão no Redis; sem gravar, toda conexão nova cai ~5 s depois de abrir:

```
15:40:47 state: connecting (200) → 15:40:52 state: close (401) · Instance … - LOGOUT · RedisCache ERROR MISCONF
15:41:17 Phone number: 557991787208 (código gerado) → 15:41:21 close (401) LOGOUT
```

O dono digitou o código HJZZ-RSL5 às 12:41:39 (15:41:39 UTC) — 18 s depois de a sessão ter caído. O WhatsApp responde
com a mensagem genérica "confira o número". O primeiro "Não foi possível conectar" do dono (11:58) coincide com a
primeira falha de gravação do Redis.

- A primeira gravação em disco do Redis só acontece 1 h depois do primeiro uso (`save 3600 1`): o uso começou ~13:58
  UTC (primeiro QR às 13:45), a gravação falhou às ~14:58. O volume `/data` nunca esteve gravável para o processo
  deste container (o "DB saved on disk" de 05:40 é do container anterior, no desligamento).
- Disco do Redis: 32 MB de 500 MB — não é falta de espaço; é permissão.

Falhas anteriores do mesmo dia (já corrigidas no código e publicadas): QR velho na tela (10 min de acompanhamento),
código por número ignorado com o QR rodando, e o 9 extra de celulares de DDD 31+.

## 2. Hipóteses do dono — comprovadas ou descartadas

| # | Hipótese | Resultado | Evidência |
|---|---|---|---|
| 1 | Mesma instância reutilizada | **Descartada** | Banco: `sessao_id` único (`conexoes_whatsapp_sessao_unica`); 2 linhas, 2 sessões. Evolution: 2 instâncias (`flow-bot-teste`, `cortai_6a0000000000_25cd027f4ad4`) |
| 2 | Dono da conexão identificado errado | **Descartada** | O webhook acha a conexão pelo `instance` e o negócio vem do banco (`conexaoPorSessao`); `tenant` enviado no corpo é ignorado (teste em `evolution.test.ts`) |
| 3 | Instância associada ao usuário admin | **Descartada** | Conexão é por negócio (`tenant_id`, `UNIQUE(tenant_id, tipo)`); o usuário só escolhe o negócio em uso (`perfis.tenant_ativo`) |
| 4 | Colisão de identificadores | **Descartada** | `cortai_` + 12 hex do negócio + 12 hex aleatórios (`sessaoDoTenant`) + restrição única no banco |
| 5 | Webhook compartilhado/errado | **Descartada (com ressalva)** | Uma URL para todas as instâncias, com o nome da instância no corpo — padrão da Evolution. Webhook da instância do Bella Rosa: URL da prévia, 3 eventos, `segredo_confere: true`. Ressalva: o segredo é **um só** para todas as instâncias (ver §5) |
| 6 | Variáveis apontando para a mesma instância | **Descartada** | As variáveis apontam para o **servidor** (`PREVIEW_EVOLUTION_*`), não para instância; cada negócio tem a sua |
| 7 | Sessão/credencial reutilizada | **Descartada** | A Evolution guarda a autenticação por instância; os logs mostram cada instância com o próprio ciclo |
| 8 | Falta de isolamento admin × operação | **Isolamento existe; o WhatsApp administrativo não existe** | Banco já separa: `escopo = 'central'` (sem `tenant_id`, no máximo 1) × `escopo = 'tenant'` (com `tenant_id`). Nenhuma linha `central` na prévia. Por decisão anterior ("sem número reserva", `src/lib/whatsapp/AGENTS.md`) a central fica **congelada e nunca envia** |
| 9 | Confusão usuário × admin × dono | **Descartada** | Conta do dono: admin da plataforma + dono de Estilo Raiz (sem conexão) e Bella Rosa (1 conexão). Papel de admin não entra na escolha da conexão |
| 10 | Gatilho usando conexão errada | **Descartada** | Todo envio passa por `conexaoDeEnvio(tenant)` (filtra `tenant_id` + `escopo='tenant'`) e `gatewayDaSessao` (trava de isolamento: sessão de outro negócio ou central lança erro) |

**Conclusão:** não há cruzamento entre os estabelecimentos nem entre admin e estabelecimento. A falha de hoje é de
infraestrutura (Redis), não de arquitetura.

## 3. Arquitetura encontrada

```
Flow (prévia, Cloudflare)  ──API (apikey global)──▶  Evolution v2.3.7 (Railway: evolution-api)
        ▲                                                  │  Postgres (Railway) — instâncias, mensagens
        │ webhook único /api/public/whatsapp/evolution     │  Redis (Railway) — cache/sessão  ✖ não grava
        └──────────── x-webhook-secret (global) ───────────┘
conexoes_whatsapp (banco do Flow)
  escopo=tenant  → bella-rosa-demo  → cortai_6a0000000000_25cd027f4ad4 (close)
  escopo=tenant  → barbearia-prime  → flow-bot-teste (close)
  escopo=central → (nenhuma)  — congelada por decisão
```

- Uma instalação da Evolution (um projeto no Railway, 1 serviço `evolution-api`, `clientName = evolution_flow`). Não
  existe instalação duplicada. O banco do Flow e o da Evolution são separados; a conversa é só por API e webhook.
- O site principal ainda não tem Evolution configurada (segredos `EVOLUTION_*` pendentes — a confirmar pelo dono).
- Notificações "sistêmicas" hoje **não usam WhatsApp**: login/recuperação por e-mail (Supabase), alertas da plataforma
  em `alertas_da_plataforma` + sininho/push.

## 4. O modelo pedido × o banco atual

O pedido (`connection_type = system | establishment`) **já existe** como `escopo = central | tenant`, com as regras
certas no banco:

- `CHECK (escopo='tenant' AND tenant_id IS NOT NULL) OR (escopo='central' AND tenant_id IS NULL AND compartilhada=false)`
- `UNIQUE (sessao_id)`, `UNIQUE (tenant_id, tipo)` e no máximo uma central (`conexoes_whatsapp_central_unica`).

Não é preciso tabela nova nem renomear coluna (renomear quebraria compatibilidade).

## 5. O que falta para a arquitetura desejada

1. **Infra (bloqueia tudo):** Redis gravando de novo. Opções: reiniciar o serviço Redis (refaz a permissão do volume)
   ou desligar o cache Redis na Evolution (`CACHE_REDIS_ENABLED=false`). Ambas precisam de autorização.
2. **WhatsApp administrativo (decisão do dono):** a central existe no banco mas foi congelada de propósito. Ativá-la
   contradiz a regra atual "sem número reserva / central nunca envia". Se o dono decidir ativar: remetente próprio
   `conexaoDoSistema()` usado **só** por eventos da plataforma (nunca por avisos de negócio), tela em `/admin/whatsapp`,
   e uma lista fechada do que ela envia (hoje não há nenhum aviso sistêmico por WhatsApp).
3. **Webhook por instância (segurança, recomendado):** hoje o segredo é global — quem o tiver pode se passar por qualquer
   instância. Melhoria: token próprio por conexão (coluna nova, migração só de acréscimo) no cabeçalho do webhook de
   cada instância, conferido junto com o `instance`.
4. **Estado e reconexão:** já existem (`saude-conexao.ts`, monitor de 15 min, evento mais novo vence). Falta mostrar na
   tela quando a queda é do serviço (Redis/Evolution) e não do número.

## 6. Testes A–F do pedido

Não executados: dependem do Redis voltando a gravar e de números reais pareados. O teste A depende também da decisão
sobre o WhatsApp administrativo. O isolamento entre negócios (B–E) já é coberto por testes automáticos
(`conexao-envio.server.test.ts`, `finalidade-conexao.test.ts`, `evolution.test.ts`); o teste com números reais fica
para depois do item 1.
