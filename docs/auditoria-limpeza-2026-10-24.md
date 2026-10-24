# Auditoria de limpeza — 24/10/2026

**Estado atualizado em 24/10/2026:** este relatório registra o diagnóstico original, antes da limpeza. A execução posterior dos itens A–H foi confirmada no `DIARIO.md` (“Limpeza executada (A–H autorizados pelo dono”): 49 arquivos, 24 dependências e CSS morto foram removidos; `tsc`, `vitest`, build, `bun install --frozen-lockfile` e `knip` passaram naquela execução. A tabela abaixo foi atualizada para não tratar essa limpeza concluída como trabalho pendente.

**Método original:** `knip` (arquivos, exports e dependências sem uso, com rotas e testes como entradas), `jscpd` (código repetido), varredura de `styles.css` e conferência dos links entre rotas.

## Resumo

| Item | Tamanho | Risco de apagar | Situação |
|---|---|---|---|
| A. Componentes shadcn sem uso (`components/ui/*`, 29 arquivos) | 3.370 linhas | nenhum (ninguém importa) | **concluído** |
| B. `components/ai-elements/prompt-input.tsx` e `suggestion.tsx` | 1.355 linhas | nenhum | **concluído** |
| C. Dependências npm sem uso | 24 dependências removidas; `bun.lock` validado | baixo | **concluído** |
| D. Telas órfãs (8 arquivos) | 1.541 linhas | baixo | **concluído** |
| E. ALVO IA legado em `lib/ia/` (5 arquivos; rotas já respondem 410) | 519 linhas | baixo | **concluído** |
| F. Painel antigo (`painel.functions.ts`, `painel/oportunidades.server.ts`) | 716 linhas | baixo | **concluído** |
| G. CSS morto em `styles.css` (62 classes, ~118 regras) | ~740 linhas | baixo | **concluído** (121 regras/147 seletores; −671 linhas) |
| H. Motor antigo do WhatsApp (`motor.server.ts`, `agrupador`, `financeiro-cliente`) | 1.499 linhas | decisão do dono (resolvida) | **concluído com autorização** |
| I. Exports sem uso (258 valores, 246 tipos) | só tirar `export` | nenhum | opcional |
| J. Casts `as never` em chamadas ao banco | — | médio (pode esconder erros de tipo) | **auditar antes de mudar**; a contagem diverge entre documentos (63/73) |
| K. Rotas/funcionalidades sobrepostas | — | **decisão do dono** | lista abaixo |

Limpeza concluída: **49 arquivos (~9.000 linhas), 24 dependências e 671 linhas de CSS** removidos. Os itens I–K continuam como observações separadas; casts e sobreposições precisam de nova contagem/decisão antes de qualquer modificação.

## Detalhe

**D. Telas órfãs:** `home/SecoesHome.tsx` (863), `barbeiro/agenda/AgoraProximos.tsx` (228), `barbeiro/PainelComercial.tsx` (166),
`painel/Blocos.tsx` (114), `layout/FaixaPendencias.tsx` (59), `barbeiro/HubModulos.tsx` (50), `planos/RecursoBloqueado.tsx` (45),
`ia/BigodeCortai.tsx` (16). A home pública oficial é `/apresentacao` (`ShowroomCortai`); `SecoesHome` era a home antiga.

**E. ALVO IA:** `ia/alvo-ia.server.ts`, `ponte.server.ts`, `eventos.server.ts`, `contrato.ts`, `limite.server.ts`. Já desligado em 10/10
(rotas `/api/public/alvo-ia`, `/api/public/ai/*` e `/api/public/cortai/acoes` respondem 410 por `ia/legado-desligado.ts`, que fica).
Não apagar `ia/assistente.server.ts` (ainda usado pelo painel).

**F. Painel antigo:** `lib/painel.functions.ts` (534) e `lib/painel/oportunidades.server.ts` (182). Nenhuma tela chama.

**H. Motor do WhatsApp:** `whatsapp/motor/motor.server.ts` (1.334), `agrupador.server.ts`, `financeiro-cliente.server.ts`. O fluxo atual
usa outro caminho (`mapa-do-codigo.md` §119). Só apagar se o dono confirmar que não há plano de reaproveitar.

**K. Sobreposições (decisão de produto, nada será mexido sem pedido):**
- `/barbeiro/agendamentos` (156 linhas): sem nenhum link no app; repete a lista de confirmados da Agenda.
- Crescimento: `barbeiro.crescimento`, `divulgar`, `indicacoes`, `redes`, `fidelidade` cobrem temas vizinhos (divulgação/retorno).
- `barbeiro.equipe` (512) × `barbeiro.profissionais` (128): dois cadastros de pessoas da equipe.
- `barbeiro.sua-pagina` × `barbeiro.marca`: hub da página e editor (o Figaro tem um só fluxo).
- Redirecionamentos finos que podem ficar: `barbeiro.temas`, `painel.$`/`painel.index` (avisos antigos ainda apontam para `/painel`),
  `barbearia.$id`, `$slug`.

**Código repetido (jscpd, 0,19%):** praticamente limpo. Maiores trechos: `FolhaDoTicket` × `TicketDaConfirmacao` (32 linhas),
`SinoDeAvisos` × `TelaDeAvisos` (25), `DrawerAjustes` (23, dentro do próprio arquivo), `TelaReagendar` × `TrocarCliente` (21),
`ConteudoDoPerfil` × `PerfilClienteSheet` (20), `api/public/push/aviso.ts` × `evento.ts` (17), `admin.mais` × `barbeiro.mais` (13).

**Configuração:** `@tanstack/router-plugin` aparece como sem uso, mas é carregado pelo plugin do TanStack Start; **não remover**.

**G. CSS morto (classes sem nenhuma ocorrência em `src/`, nem montadas por template):**
`.auth-google-mark`, `.auth-login-brand`, `.chat-hero`, `.chat-status-online`, `.cortai-clipper-lamina`, `.cortai-lamina`, `.cortai-ponto`, `.cortai-progresso`, `.cortai-pulso`, `.cortai-splash`, `.drawer-link-active`, `.landing-page`, `.modo-foco-ao-vivo`, `.modo-foco-cliente`, `.modo-foco-cockpit`, `.modo-foco-contexto`, `.modo-foco-corpo`, `.modo-foco-cronometro`, `.modo-foco-data`, `.modo-foco-estado`, `.modo-foco-observacao`, `.modo-foco-principal`, `.modo-foco-profissionais`, `.modo-foco-resumo`, `.modo-foco-rotulo`, `.modo-foco-rotulo-atendimento`, `.modo-foco-rotulo-atrasado`, `.modo-foco-rotulo-chegou`, `.modo-foco-rotulo-encaixe`, `.modo-foco-sair`, `.modo-foco-secundarias`, `.modo-foco-sem-atendimento`, `.modo-foco-sequencia`, `.modo-foco-sequencia-topo`, `.modo-foco-sequencia-vazia`, `.modo-foco-tempo-livre`, `.modo-foco-tempo-livre-textura`, `.modo-foco-topo`, `.modo-foco-topo-acoes`, `.modo-foco-vazio`, `.mov-conteudo-entrada`, `.presentation-controls`, `.presentation-copy`, `.presentation-final-media`, `.presentation-header`, `.presentation-hero-media`, `.presentation-phone`, `.presentation-product`, `.presentation-progress`, `.presentation-progress-active`, `.presentation-scene`, `.presentation-signature`, `.presentation-stage`, `.presentation-visual`, `.shadow-lg`, `.shadow-xl`, `.showroom-foco-cliente`, `.showroom-foco-demo`, `.showroom-foco-nota`, `.showroom-hero-cliente`, `.showroom-prova-pontos`, `.showroom-proximo`
`modo-foco-*`, `showroom-*` e `presentation-*` vêm de telas que já não usam essas classes.

## Estado de execução
Os itens A–H foram removidos e validados na branch de migração, conforme a entrada “Limpeza executada” no `DIARIO.md`. **Não repetir o plano de remoção** como uma tarefa pendente. O que resta: decidir se os 258 exports sem uso (246 tipos) devem perder o `export`, recontar os casts `as never` em uma única varredura e discutir as sobreposições de módulos/rotas listadas no item K. Nenhum desses itens foi modificado por esta auditoria.
