# Auditoria de limpeza — 24/10/2026

Método (só leitura, nada foi apagado): `knip` (arquivos, exports e dependências sem uso, com as rotas e os testes como entradas), `jscpd`
(código repetido), varredura das classes de `styles.css` contra `src/` e conferência dos links entre rotas. Os testes contam como uso:
tudo abaixo que aparece como "sem uso" não é importado nem por tela, nem por servidor, nem por teste.

## Resumo

| Item | Tamanho | Risco de apagar | Situação |
|---|---|---|---|
| A. Componentes shadcn sem uso (`components/ui/*`, 29 arquivos) | 3.370 linhas | nenhum (ninguém importa) | pendente de autorização |
| B. `components/ai-elements/prompt-input.tsx` e `suggestion.tsx` | 1.355 linhas | nenhum | pendente |
| C. Dependências npm sem uso (25 + `drizzle-orm`/`postgres` de dev) | só `package.json`/`bun.lock` | baixo (conferir build) | pendente; vem junto com A |
| D. Telas órfãs (8 arquivos) | 1.541 linhas | baixo | pendente |
| E. ALVO IA legado em `lib/ia/` (5 arquivos; rotas já respondem 410) | 519 linhas | baixo | pendente |
| F. Painel antigo (`painel.functions.ts`, `painel/oportunidades.server.ts`) | 716 linhas | baixo | pendente |
| G. CSS morto em `styles.css` (62 classes, ~118 regras) | ~740 linhas | baixo (conferir visual) | pendente |
| H. Motor antigo do WhatsApp (`motor.server.ts`, `agrupador`, `financeiro-cliente`) | 1.499 linhas | **decisão do dono** | pendente |
| I. Exports sem uso (258 valores, 246 tipos) | só tirar `export` | nenhum | opcional |
| J. 73 `as never` em chamadas ao banco | — | médio (pode mostrar erros de tipo) | decisão |
| K. Rotas/funcionalidades sobrepostas | — | **decisão do dono** | lista abaixo |

Total apagável sem decisão de produto (A–G): **~8.200 linhas** em 44 arquivos + 27 dependências. Com H: ~9.700.

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

## Como executar (depois da autorização)
1. Apagar os arquivos aprovados; 2. `bun install` para atualizar o `bun.lock` sem as dependências; 3. `bun run tsc --noEmit`,
`bun run vitest run`, `bun run build`; 4. nova rodada do `knip` para achar o que ficou sem uso por causa da remoção; 5. registrar no `DIARIO.md`.
