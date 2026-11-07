# Flow Core — fase 1: suporte operacional sobre o cérebro existente

**Data:** 07/11/2026. **Ambiente:** branch `cloudflare-workers-migration-2026-10-13`.
**Escopo:** primeira capacidade operacional, sem migração, sem serviço novo, sem credenciais, sem mudança na Agenda ou nos webhooks.

## Decisão de arquitetura

A Flow IA continua sendo a interface conversacional. **Flow Core** é o nome da evolução do cérebro existente, não uma segunda IA. Preservar `src/lib/brain` como fonte única, `brain/acoes.server.ts` como catálogo, `acaoPermitida` como guardião de autorização e `brain/guardas.ts` como verificador de respostas. Não renomear publicamente a interface até existir uma decisão explícita de design.

OpenCode e OpenClaw **não** podem ser acessados por mensagens de clientes. Quando houver infraestrutura isolada e licença/custos validados, poderão ser ferramentas do modo administrativo autenticado e auditável; não foram instalados ou executados nesta etapa. LangGraph continua opcional após protótipo de persistência, CPU e Workers. Não existem duas fontes de memória.

## Entrega desta fase

- `src/lib/brain/ajuda-operacional.ts`: consulta sem rede e sem escrita que utiliza diretamente `MODULOS_DE_NAVEGACAO` e `GUIAS` existentes, sem criar catálogo de URLs paralelo. Pesquisa por sinônimos em português e devolve título, caminho oficial e passos apenas quando o guia existe. Dúvida desconhecida retorna `encontrado: false`, nunca instruções inventadas.
- `brain/acoes.server.ts`: nova ação oficial **`consultar_ajuda_flow`**, `risco: leitura`, canal painel. O catálogo existente expõe automaticamente a ação também à equipe com telefone verificado no WhatsApp, mas nunca a cliente/visitante. A execução reforça a restrição de canal.
- `brain/agente.server.ts`: orienta o modelo a consultar a ferramenta antes de explicar o funcionamento da plataforma, e a informar a falta de confirmação em vez de inventar opções ou afirmar alterações.
- A voz no painel continua seguindo o caminho já existente: gravar → `transcreverComandoDeVozDoPainel` → `perguntarAoCortai` → `pensarCortai`. Não foi adicionada captura de áudio nova.
- O catálogo passa das **24 ações inventariadas** na etapa anterior para **25**, com uma nova leitura. Nenhuma ação existente muda de permissão ou modo de execução.

## Contrato de segurança

1. O cliente e o visitante não recebem a nova ferramenta. A equipe recebe apenas as áreas que a navegação autoriza por papel/permissão.
2. A ferramenta nunca escreve, altera configurações, envia WhatsApp, cria agendamento, consulta dados pessoais nem dá acesso a GitHub/infraestrutura.
3. Textos de ajuda são originados nos guias existentes, não em conteúdo fornecido por clientes.
4. Uma rota encontrada não prova que o usuário tem uma funcionalidade contratada ou habilitada. O assistente deve declarar essa limitação.
5. O novo suporte depende de o canal possuir IA configurada, habilitada e com cota. A consulta em si não chama provedor; o modelo que decide chamá-la pode ter custo de inferência. Sem provedor, prevalecem os mecanismos de indisponibilidade e fallback existentes.

## Testes

`src/lib/brain/ajuda-operacional.test.ts` cobre busca por voz/texto, guias existentes, página do WhatsApp, ausência de alteração, papel do profissional, equipe verificada, clientes/visitantes barrados e pedido desconhecido; também confere a integração no catálogo oficial.

Executar antes de declarar pronto:
```sh
bun install --frozen-lockfile
bun run tsc --noEmit
bun run vitest run
bun run eslint src/lib/brain/ajuda-operacional.ts src/lib/brain/ajuda-operacional.test.ts src/lib/brain/acoes.server.ts src/lib/brain/agente.server.ts
bun run build
bash scripts/verificar-protocolo.sh
```

## Próximas etapas — ainda não executadas

1. Resolver P1/P2/P8/P10 do atendimento; respeitar a reserva WhatsApp da Claude.
2. Medir qualidade das respostas de ajuda, cobertura de roteiros, erros de transcrição e permissões no banco de prévia com dados fictícios.
3. Ampliar ajuda às áreas sem guia, reaproveitando documentação de interface sem criar segunda política de acesso.
4. Habilitar progressivamente comandos por voz de outras áreas, sempre via ações oficiais e confirmação para escrita.
5. Criar, se autorizado e sem custo extra, ambiente técnico isolado para integração OpenClaw/OpenCode. O modo administração nunca compartilha a sessão do cliente.
6. Avaliar LangGraph.js somente se persistência e retomada não forem resolvidas adequadamente no motor próprio.

**Não foi feita instalação de OpenClaw, OpenCode ou LangGraph; não há publicação em produção, migração, secret ou chamada real ao WhatsApp nesta fase.**
