# Mapa do código do Cortaí

Guia para quem chega ao código (pessoa ou IA). Gerado em 09/10/2026 a partir do commit `7ed1c6a`. As regras obrigatórias ficam nos `AGENTS.md`; este arquivo diz **onde cada coisa mora**.

## Números

- 997 arquivos versionados; 667 arquivos `.ts`/`.tsx` em `src/`, com cerca de 108 mil linhas.
- 102 arquivos de teste (`*.test.ts(x)`, Vitest) e testes SQL em `supabase/tests/` e `tests/sql/`.
- Banco: cerca de 87 tabelas e 69 funções públicas (ver `src/integrations/supabase/types.ts`).
- Migrações:
  - `supabase/migrations/`: cerca de 150 arquivos, até 01/10/2026.
  - `drizzle/migrations/`: 0000 a 0028, a partir de 01/10/2026, aplicadas com `LOVABLE_DB_MIGRATION_URL`.

## Stack

- **Front e servidor:** TanStack Start (React 19) roda em Cloudflare Workers (`src/server.ts`, `ctx.waitUntil` em `segundo-plano.server.ts`). Usa Vite 8, Tailwind 4 e shadcn/Radix.
- **Banco:** Supabase (Postgres, Auth e Storage), com RLS. O navegador fala direto com o Supabase usando o login do usuário.
- **Servidor:** funções do servidor (`createServerFn`) nos arquivos `*.functions.ts` e rotas HTTP em `src/routes/api/public/*`.
- **IA:** Lovable AI Gateway (`src/lib/brain/gateway.server.ts`), via Responses API com streaming.
- **WhatsApp:** Meta Cloud API (oficial) e Evolution API (número próprio).
- **Pagamentos dos planos:** Asaas.
- **PWA:** service worker próprio (`/sw.js`) e Web Push com VAPID.
- **MCP:** `/mcp` expõe ao usuário logado as ferramentas `listar_servicos` e `listar_agendamentos`.

## Rodar localmente

```sh
npm install --no-package-lock   # o bun.lock aponta para um cache privado do Lovable (403 fora dele)
npx tsc --noEmit                # tipos
npx vitest run                  # testes
npx eslint .                    # lint
npx vite build                  # build
```

Variáveis: `.env` só traz as chaves públicas do Supabase. Os segredos do servidor estão no Lovable Cloud:
- `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`, `LOVABLE_CRON_SECRET`
- `META_APP_SECRET`, `META_VERIFY_TOKEN`, `WHATSAPP_API_KEY`, `EVOLUTION_*`
- chave do Asaas e chaves internas, guardadas na tabela `chaves_internas`

## Rotas (`src/routes`, roteamento por arquivo)

- **Públicas, sem login:**
  - `index.tsx` (`/`): só despacha conforme o login.
  - `apresentacao.tsx`: home comercial (`ShowroomCortai`).
  - `$slug.tsx`, `b.$slug.tsx`, `barbearia.$id.tsx`: página do negócio (`PaginaPublica`).
  - `agendar.$slug.tsx`: agendamento como convidado (formatos Direta, Vitrine e Conversa).
  - `f.$slug.tsx`: fila de chegada pelo link.
  - `loja.$slug.tsx`: loja.
  - `vaga.$token.tsx`: oferta da lista de espera.
  - `avaliar.$token.tsx`: avaliação.
  - `configurar-minha-barbearia.tsx`: rascunho sem login (`rascunho.functions`).
  - `visitante.tsx`, `barbearias.tsx`, `privacidade.tsx`.
- **Conta:** `login.tsx`, `recuperar-senha.tsx`, `redefinir-senha.tsx`, `entrar.retorno.tsx` (OAuth), `escolher.tsx` (cliente ou negócio), `comecar.tsx` (criar negócio), `convite.tsx` (convite de equipe).
- **Cliente final, `/app`:** `app.index`, `app.agendar`, `app.historico`, `app.carteira`, `app.espera`, `app.perfil`.
- **Negócio, `/barbeiro`** (o Knowledge fala em `/painel`, mas **essa rota não existe no código**):
  - **Operação:** `barbeiro.hoje` (início), `barbeiro.agenda`, `barbeiro.agendamentos`, `barbeiro.fila`, `barbeiro.casa` (Visão Casa).
  - **Clientes:** `barbeiro.clientes.index`, `barbeiro.clientes.$id`, `barbeiro.avaliacoes`, `barbeiro.fidelidade`, `barbeiro.indicacoes`, `barbeiro.crescimento`.
  - **Dinheiro:** `barbeiro.financeiro`, `barbeiro.caixa`, `barbeiro.comissoes`, `barbeiro.plano`.
  - **Cadastro:** `barbeiro.servicos`, `barbeiro.profissionais`, `barbeiro.equipe`, `barbeiro.horarios`, `barbeiro.produtos`.
  - **Marca e divulgação:** `barbeiro.marca`, `barbeiro.temas`, `barbeiro.divulgar`, `barbeiro.redes`.
  - **CortAI e WhatsApp:** `barbeiro.cortai` (conexão do WhatsApp e configuração) e `barbeiro.cortai-atividade`.
  - **Ajustes:** `barbeiro.configurar`, `barbeiro.conta`, `barbeiro.funcionalidades`, `barbeiro.mais`, `barbeiro.barbearias`.
- **Dono da plataforma, `/admin`:** `admin.index`, `admin.barbearias`, `admin.monetizacao` (planos, cupons, condições, banners), `admin.asaas`, `admin.whatsapp`, `admin.recursos`, `admin.home`, `admin.marketing`, `admin.parceiros`, `admin.pedidos`, `admin.ajustes`, `admin.perfil`.
- **API pública (`api/public`):** veja a seção Integrações.

A guarda de rota é feita por `exigirPapel()` em `src/lib/guarda.ts`, no `beforeLoad`. A proteção real fica no servidor e no RLS.

## Domínios em `src/lib`

### Sessão, conta e permissões
- `sessao.functions.ts`: `getSessao` (papel, negócio ativo, permissões, contextos), `criarBarbearia`, `escolherContexto`.
- `contextos.ts`: uma conta pode ter dois contextos, cliente e negócio.
- `tenant.ts`: `tenantIdDoMembro` e `exigirPermissao` (chama `has_tenant_permission` no banco).
- `permissoes.ts`: matriz de permissões por papel (dono, gerente, barbeiro, recepção). As chaves são as mesmas do banco.
- `planos.ts`, `planos.functions.ts`, `capacidades*.ts`, `guarda-capacidade.ts`, `funcionalidades*.ts`: o que cada plano libera.
- `seguranca-conta*.ts`, `consentimento.ts` (LGPD e cookies).

### Agenda (núcleo)
- `disponibilidade.ts`: **motor único de horários livres**, usado pela tela, pelo público, pelo servidor e pela IA.
- `agenda-regras.server.ts`: `regrasDaBarbearia`, `validarAgendamento`, `STATUS_QUE_OCUPAM`.
- `ocupacoes-extras.server.ts`: bloqueios e escalas entram como ocupações.
- `horarios.ts`, `fuso.server.ts`, `format.ts`: hora de parede no fuso do negócio.
- `intervalos-agenda.functions.ts` + `excecoes_intervalo_agenda`: exceção de intervalo válida só em uma data; o padrão semanal permanece em `horarios_de_funcionamento`.
- `agendamento.functions.ts`, `agendamentos.functions.ts`, `agendamento-publico.functions.ts`, `agenda-chat.functions.ts`, `bloqueios.functions.ts`, `substituicao.server.ts`.
- Banco: RPCs `criar_agendamento` e `cancelar_agendamento`. Gatilhos de máquina de estados: `agendado → chegou → na_cadeira → finalizado`, além de `cancelado`, `remarcado` e `nao_compareceu`. A trava de sobreposição é `agendamentos_sem_sobreposicao`.
- Telas: `components/barbeiro/AgendaOperacional.tsx`, `AgendaTimeline.tsx`, `AgendaFocoMobile.tsx`, e `components/barbeiro/agenda/*` (lógica pura testada: `gesto-dia`, `cockpit-foco`, `pilula-agora`, `toque-longo-vazio` e outras). Regras em `components/barbeiro/agenda/AGENTS.md`.

### Comanda, caixa e financeiro
- `comanda-ticket.ts` e `comanda-ticket.functions.ts`: ticket da comanda, com versão pública protegida por token.
- `financeiro.functions.ts` (1055 linhas): caixa, comissões, pagamentos, fiado.
- `carteira.functions.ts`, `fidelidade.functions.ts`: créditos, pacotes e selos. A tabela `movimentos` é só de inclusão e recalcula `carteiras` por gatilho.
- Banco:
  - `garantir_comanda`: a comanda nasce com o agendamento.
  - `confirmar_pagamento_comanda_segura`: baixa feita pela equipe.
  - `informar_pagamento_pix_cliente`: o cliente só informa o Pix.
  - `pagamentos` é só de inclusão.
- Telas: `components/financeiro/FechamentoComanda.tsx`, `components/comanda/*`.

### Fila e lista de espera
- `fila-chegada.server.ts`, `fila-publica.functions.ts`, `atendimento.functions.ts`: quem chega sem horário marcado.
- `fila-compatibilidade.ts` e `whatsapp/fila-ofertas.server.ts`: vaga liberada vira oferta, com aceite atômico (`ofertas_da_fila`).

### CortAI (IA)
- **Atual:** `brain/agente.server.ts` (`pensarCortai`), `brain/acoes.server.ts` (catálogo e `acaoPermitida`), `brain/guardas.ts`, `brain/uso.server.ts` (cotas e pausa), `brain/secretaria-publica.functions.ts` (site).
- **Ações de domínio:** `ia/acoes.server.ts`, que grava com a chave de serviço e filtra por `tenant_id`.
- **Painel:** `assistente.functions.ts`. Usa `ia/assistente.server.ts` (legado) só para cadastrar serviços e horários em lote.
- **Legado (ALVO IA):** `ia/alvo-ia.server.ts`, `ia/ponte.server.ts`, `ia/eventos.server.ts`, `ia/contrato.ts`, e as rotas `api/public/ai/$`, `api/public/cortai/acoes` e `api/public/alvo-ia`.
- Telas: `components/ia/*` (`AssistenteCortai`, `FolhaCortai`, `IconeDaIA`, `BotaoAssistente`).

### WhatsApp (`src/lib/whatsapp`)
- **Entrada:** rotas `api/public/whatsapp/{webhook (Meta), evolution, eventos}`, depois `fluxo.server.ts` (`processarMensagemRecebida`). A ordem é:
  1. verificação de telefone da equipe;
  2. número compartilhado ou Central;
  3. resposta a lembrete (`lembretes.server.ts`);
  4. cérebro CortAI;
  5. texto fixo de reserva.
- **Saída:** `notificacoes.server.ts` (motor único de avisos ao cliente), `conexao-envio.server.ts` (escolhe o remetente), `modelos.ts` (formato dentro e fora da janela de 24h), `gateway.server.ts` (Meta ou Evolution), `erros-meta.ts` e `falhas-envio.server.ts`.
- **Varredura a cada 15 min** (`api/public/whatsapp/automacoes`, via pg_cron): lembretes, teste grátis, postagens nas redes e saúde das conexões (`monitor-conexoes.server.ts`).
- **Equipe:** `identidade.server.ts` (telefone verificado), `aviso-equipe*.server.ts`, `aviso-atraso.server.ts`.
- **Motor determinístico antigo:** `motor/motor.server.ts` (1334 linhas) e `motor/agrupador.server.ts` **não são importados por nenhum arquivo**. Só `vocabulario`, `intencoes`, `estado` e `entendimento-whatsapp` continuam em uso.

### Avisos, sininho e push
- `avisos/catalogo.ts` e `avisos/emitir.server.ts`: catálogo de eventos que decide quem recebe e por qual canal.
- Banco: `notificacoes`. Gatilhos chamam `api/public/push/{aviso,evento}`.
- `push/*`: regras, inscrição e envio WebCrypto.

### Página pública, marca e crescimento
- `publico.functions.ts`, `pagina-config.ts`, `marca.functions.ts`, `cor-marca.ts`, `familias-tema.ts`, `previa.ts`, `schema-negocio.ts`, `tenant-slug.ts` (com aliases de endereço).
- `home-publica.ts`, `home.functions.ts`, `apresentacao-*.ts`: home da plataforma.
- `crescimento.functions.ts`, `divulgacao*`, `redes-sociais*`, `postagens-sociais*`, `funil.ts` e `api/public/funil`.

### Cobrança dos planos (Asaas)
- `cobranca.ts` (regras puras), `cobranca.server.ts`, `cobranca.functions.ts`, `asaas.server.ts`, `monetizacao*.ts`, `teste-gratis*.ts` (45 dias).
- Webhook em `api/public/asaas/webhook`, varredura em `api/public/asaas/varredura`.

### Admin da plataforma
- `admin.functions.ts`: toda função confere `has_role(admin)`.
- Também: `suporte.functions.ts`, `whatsapp-central.functions.ts`, `monetizacao.functions.ts`, `parceiros.functions.ts`, `institucional.functions.ts`.

### Infraestrutura
- `webhook-guard.server.ts`: limite de taxa no banco e registro de rejeições.
- `pwa/*`: service worker, recuperação de chunk, atualização obrigatória.
- `versao.ts` e `novidades.ts`: versão do app.
- `erro-amigavel.ts`, `error-capture.ts`.

## Banco por domínio (tabelas principais)

- **Negócio e equipe:** `tenants`, `tenant_usuarios`, `perfis`, `user_roles`, `profissionais`, `escalas_de_profissional`, `telefones_da_equipe`, `tenant_slug_aliases`, `tenant_page_configs`, `tenant_branding_versions`.
- **Agenda:** `agendamentos`, `agendamento_transicoes`, `servicos`, `horarios_de_funcionamento`, `bloqueios_de_agenda`, `fila_de_espera`, `ofertas_da_fila`.
- **Clientes:** `clientes`, `memoria_do_cliente`, `preferencias_do_cliente_avisos`, `avaliacoes`, `convites_de_avaliacao`, `indicacoes`, `fotos_de_corte`.
- **Dinheiro:** `comandas`, `comanda_itens`, `pagamentos`, `caixa_sessoes`, `caixa_movimentos`, `comissoes`, `comissao_pagamentos`, `carteiras`, `movimentos`, `fiados`, `vendas`, `venda_itens`, `produtos`, `configuracoes_financeiras`, `regras_de_plano`.
- **WhatsApp:** `conexoes_whatsapp`, `conversas_whatsapp`, `mensagens_whatsapp`, `envios_de_whatsapp`, `modelos_whatsapp`, `whatsapp_webhook_events`, `whatsapp_contexto_numero`, `config_atendimento_ia`.
- **IA:** `conversas_de_ia`, `mensagens_de_ia`, `acoes_de_ia_log`, `integracoes_de_ia` (legado), `eventos_de_ia`, `eventos_recebidos_de_ia`, `automacoes_de_ia`.
- **Avisos:** `notificacoes`, `notificacoes_preferencias`, `push_inscricoes`, `push_entregas`.
- **Plataforma:** `planos_da_plataforma`, `recursos_de_plano`, `recursos_do_tenant`, `assinaturas`, `faturas`, `eventos_asaas`, `cupons`, `cupons_usos`, `condicoes_comerciais`, `dados_de_cobranca`, `configuracoes_da_plataforma`, `home_publica`, `banners_da_plataforma`, `parceiros_da_plataforma`, `chaves_internas`, `alertas_da_plataforma`, `webhook_limites`, `webhook_rejeicoes`, `exclusoes_permanentes`, `emails_admin_autorizados`.

## Código que ninguém importa (candidatos a revisão, nunca apagar sem autorização)

- **WhatsApp:** `lib/whatsapp/motor/motor.server.ts` (1334 linhas) e `motor/agrupador.server.ts`.
- **Painel:** `lib/painel.functions.ts` (534 linhas).
- **Telas:** `components/home/SecoesHome.tsx` (863 linhas), `components/barbeiro/HubModulos.tsx`, `PainelComercial.tsx`, `agenda/AgoraProximos.tsx`, `layout/FaixaPendencias.tsx`, `painel/Blocos.tsx`, `planos/RecursoBloqueado.tsx`.
- **IA:** `components/ia/FabCortai.tsx`. O plano da CortAI quer reaproveitá-lo no cabeçalho.
- **Bibliotecas de base:** `components/ai-elements/prompt-input.tsx` e `suggestion.tsx`, e vários componentes shadcn sem uso em `components/ui/` (sidebar, carousel, chart, form, table e outros).

## Divergências conhecidas

- **Rota `/painel` inexistente:** o Knowledge diz que a área do negócio é `/painel/...`, com `/barbeiro` só redirecionando. No código, tudo está em `/barbeiro`. Mesmo assim, alguns avisos apontam para `/painel` e caem na página "não encontrada": `whatsapp/fluxo.server.ts` (cliente pediu atendimento humano) e o link padrão em `push/aviso-sininho.server.ts`.
- **Casts sem efeito:** há 63 `as never` em chamadas ao banco, mas os tipos (`types.ts`) já incluem essas tabelas e RPCs. Os casts são sobras que só escondem erros de tipo.
- **Auditoria de segurança:** `docs/auditoria-2026-10-09.md`.

## Estado da verificação (09/10/2026, commit `7ed1c6a`)

| Verificação | Resultado |
|---|---|
| `tsc --noEmit` | passa, sem erros |
| `vite build` | passa (gera o worker Cloudflare em `.output/`) |
| `vitest run` | 888 passam, 8 falham, 1 pulado |
| `eslint .` | 5.042 problemas: 4.825 de formatação Prettier (corrigíveis com `--fix`), 184 `no-explicit-any`, 29 avisos |

- **As 8 falhas** são todas de `src/lib/whatsapp/lembretes-numeros.test.ts`. O teste usa horários fixos (`2026-10-09T13:00Z` e `2026-10-10T17:00Z`) e passou a falhar quando esse horário ficou no passado. Com as mesmas datas deslocadas uma semana para frente, os 10 casos passam. **O código está correto; o teste vence com o tempo.** A correção é gerar as datas a partir de `Date.now()`, como o próprio teste já faz em `futuro`.
- **O lint** nunca foi aplicado ao repositório inteiro. Rodar `prettier --write .` resolveria os 4.825 de formatação de uma vez, mas é uma mudança grande em quase todos os arquivos. Isso só deve ser feito com autorização, porque gera um commit enorme no Lovable.
