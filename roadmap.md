# Upgrade do Cortaí

- [x] Reorganizar a navegação mobile em cinco posições
- [x] Implementar a folha de ações rápidas e reutilizar os fluxos existentes
- [x] Reorganizar Início, Agenda, Clientes e Mais
- [x] Atualizar conclusão do onboarding
- [x] Apresentar fidelidade como Voltaí
- [x] Refinar tokens e consistência visual sem descaracterizar
- [x] Validar rotas, responsividade, interações, tipos e build
- [ ] Concluir autenticação Google real após a escolha da conta (bloqueado: navegador de teste sem sessão Google)
- [x] Aplicar e validar a nova hierarquia global de cores dark/light

## Consistência global de UX/UI

- [ ] Consolidar tokens e componentes-base para dark/light, formulários, estados e superfícies
- [ ] Aplicar navegação hierárquica e compacta por perfil
- [ ] Filtrar módulos e ações visíveis pelas permissões efetivas da equipe
- [ ] Reorganizar Monetização e áreas administrativas sem remover capacidades
- [ ] Uniformizar telas públicas, cliente, gestão e administração
- [ ] Validar celular, tablet e desktop nos principais perfis
- [ ] Validar tipagem, testes relevantes e build
- [ ] Validar explicitamente dark/light e mobile/desktop antes da entrega

## Interface V3.0

- [x] Separar identidades Moderno, Blue, Indigo, Copper e Clássico dos modos Claro, Escuro e Sistema
- [x] Tornar Moderno a identidade padrão e manter Clássico como opção preta e dourada
- [x] Unificar tokens, Manrope, contraste, alvos de toque e ícones Lucide
- [x] Adicionar controles de aparência nas telas de Conta
- [x] Validar visualmente identidades e modos no celular e no desktop

## Assistente Cortaí e configuração inicial (aprovado)

- [ ] Banco: horários, onboarding, conversas de IA e fila pública
- [ ] Camada de IA server-side com fallback sem chave
- [ ] Configuração inicial em 4 passos
- [ ] Serviços e horários com interpretação por IA
- [ ] Assistente no painel e na ajuda
- [ ] Tour curto e cartão Primeiros passos
- [ ] Fila pública sem login com acompanhamento
- [ ] Typecheck, build e teste dos dois fluxos

## Pedidos de 14/09

- [x] Fechar execução anônima das funções internas restantes (fila por link, home, aparência, contato)
- [x] Validar fila por link e horários públicos após o fechamento
- [ ] Credenciais reais da ALVO IA (bloqueado: valores só a ALVO IA emite)
- [ ] Histórico de agendamentos e status na ficha do cliente
- [ ] Tour contextual dentro da folha da CortAI
- [ ] Tela admin para criar barbearias e gerir contas de administrador
- [ ] Restringir fila de espera e agenda ao acesso da barbearia

## CortAI no WhatsApp (aprovado 14/09)

- [x] Banco: conexões, conversas, mensagens, configurações, automações, registro de ações e novas permissões
- [x] Camada única do serviço de WhatsApp (sessão, QR, status, envio, reconectar, desconectar)
- [x] Entrada de avisos do serviço com assinatura conferida e entrega repetida ignorada
- [x] Cérebro do atendimento com ferramentas reais e confirmação antes de agendar/cancelar/remarcar
- [x] Tela do CortAI: conexão, conversas com assumir/retomar/encerrar, ajustes e automações
- [ ] Publicar o serviço de WhatsApp e configurar WHATSAPP_GATEWAY_URL, WHATSAPP_GATEWAY_API_KEY e WHATSAPP_WEBHOOK_SECRET (bloqueado: depende de infraestrutura fora do site)
- [ ] Transcrição de áudio (hoje o CortAI avisa que só lê texto)
- [x] Correção incremental dos diálogos reais: disponibilidade, menu contextual, informações básicas, hora exata e confirmação da remarcação

## Evolução do CortAI (concluída)
- [x] Memória do cliente (histórico, preferências, serviço/profissional habituais)
- [x] Contexto curto da conversa (serviço, dia, opções, "o primeiro") persistido
- [x] Intenção identificada e registrada em conversas e logs
- [x] Informações oficiais da barbearia (FAQ) com CRUD na tela do CortAI
- [x] Tons premium e objetivo; sugestão de clientes sumidos (sem envio automático)
- [ ] Transcrição real de áudio (módulo disponível, mas a Meta atual não entrega a mídia ao fluxo; mantém aviso honesto por texto)
- [x] Métricas base (conversas, agendamentos, encaminhamentos, assuntos)
- [ ] Pendente externo: publicar o serviço de WhatsApp e cadastrar as credenciais

## Novo pedido (14/09)
- [ ] Tela de acompanhamento do CortAI no painel (conversas, intenções, ferramentas usadas e falhas) — somente leitura, sem mexer no atendimento
- [ ] Cadastrar credenciais reais da ALVO IA (ALVO_IA_BASE_URL, ALVO_IA_API_KEY, ALVO_IA_WEBHOOK_SECRET) e conferir envio/recebimento de eventos
- [ ] Publicar o serviço de WhatsApp e conectar o QR de verdade (bloqueado: depende de servidor fora do site)
- [ ] Teste de atendimento completo no WhatsApp real (bloqueado pelo item acima)
- [ ] Aviso de nova versão: modal bloqueante quando abaixo da versão mínima e aviso discreto quando só recomendada

## Pedido 14/09 (segunda leva)
- [ ] Recuperação real de senha (resetPasswordForEmail + tela nova senha)
- [ ] WhatsApp via Evolution API (instância, QR base64, status, webhook)
- [ ] Endpoints reais Cortaí para a ALVO IA (barbearia, serviços, profissionais, clientes, agenda, disponibilidade, CRUD de agendamento)
- [ ] Área administrativa do barbeiro dentro do ALVO IA
- [ ] Indicador ••• e rolagem suave na conversa

## Evolution API (14/09)
- [x] gateway.server.ts vira abstração de provider (evolution padrão, generico legado)
- [x] webhook /api/public/whatsapp/evolution (segredo em x-webhook-secret, QR base64, connection.update, messages.upsert)
- [x] tela avisa exatamente quais variáveis faltam
- [ ] Publicar a Evolution API e cadastrar EVOLUTION_API_URL / EVOLUTION_API_KEY / EVOLUTION_WEBHOOK_SECRET (externo)
- [ ] Endpoints /api/ai/* : hoje atendidos por /api/public/cortai/acoes (avaliar se precisa alias REST)

## Financeiro V1 (20/09)
- [ ] Criar comanda transacional ligada ao agendamento, cliente e profissional
- [ ] Implementar fechamento mobile com serviços, produtos, desconto e pagamento
- [ ] Implementar Pix manual, confirmação, fiado e quitação posterior
- [ ] Implementar caixa rastreável, abertura/fechamento, saídas, despesas e sangrias
- [ ] Implementar regras configuráveis e lançamentos append-only de comissão
- [ ] Integrar Agenda, Início, Financeiro, Caixa, Comissões e permissões
- [ ] Validar o cenário Corte R$ 40 + Pomada R$ 35, Pix e comissão R$ 23,50
- [ ] Validar tipos, build, RLS, transações e experiência mobile

## Painel de Controle da Operação — v1.6.0 (23/09)
- [x] `getPainelDeControle` (leitura agregada única, permissões verificadas no servidor)
- [x] Motor determinístico de oportunidades (`src/lib/painel/oportunidades.server.ts`)
- [x] Início do barbeiro reescrito: saudação, Hoje, Atenção, Próximos movimentos, Agenda, Clientes, Financeiro, Profissionais, WhatsApp
- [x] Estados de carregamento, erro, vazio e sem permissão
- [x] Ocupação pelo horário de funcionamento real; faturamento do dia pela mesma fonte do caixa
- [x] Removidos `getPainelHoje` e `getOportunidades` (expunham valores sem checar permissão)
- [x] `/barbeiro/agendamentos` passa a incluir o status `confirmado`

## Cortaí 2.0 — Motion, feedback e notificações — v1.7.0 (23/09)
- [x] Tokens de movimento (`src/lib/motion.ts`) e hooks (`useMenosMovimento`, `useContagem`, `useDebounce`)
- [x] Transição de página com fade + subida, respeitando "menos movimento"
- [x] Botão de ação com trava de clique duplo, largura fixa, carregando após 300ms e ✓ por 600ms
- [x] Tabelas novas `notificacoes` e `notificacoes_preferencias` com RLS por barbearia/usuário
- [x] Gatilhos novos: agendamento novo, cancelado, remarcado, fila, fiado e Pix recebido
- [x] Sino no cabeçalho com badge, pulso, tempo real, agrupamento Hoje/Ontem/Anteriores e "marcar todas como lidas"
- [x] Avisos rápidos embaixo no celular e no canto superior direito no computador, com helper "Desfazer"
- [x] Faixa de configuração pendente que encolhe ao rolar
- [x] Prefetch ao tocar nos itens da barra de navegação; números do Início com contagem animada
- [x] Respostas imediatas (otimistas) na fila e na quitação de fiado do caixa
- [x] Preferências de avisos (App/WhatsApp por tipo) em Mais, usando `notificacoes_preferencias`
- [x] Esqueletos no formato do conteúdo (clientes e agenda) em vez de carregamento genérico
- [x] Busca de clientes com espera de 250ms
- [x] Agenda abre rolada até o próximo atendimento (ou a abertura), nunca na madrugada
- [x] Toque com resposta imediata em botões, links e cartões (com respeito a "menos movimento")
- [x] Entrada em cascata (30ms, até 8 itens) nas listas de clientes e da fila
- [x] Visto animado ao confirmar um agendamento manual
- [x] Tirar da fila usa "Desfazer" por 5 segundos em vez de pergunta de confirmação

## v2.0.0 — Evolução de produto, identidade e Home pública

- [x] Design system Cortaí 2.0 (ink/paper/stone/gold/sage/clay, Manrope, cantos 12–18px)
- [x] Versão 2.0.0 centralizada (src/lib/versao.ts, public/versao.json, changelog)
- [x] Aviso de novidades da versão maior (uma vez por versão, só nas áreas logadas)
- [x] "Sobre o Cortaí" em Mais, com versão e histórico
- [x] Home pública editorial: hero, quatro pilares, módulos reais, identidade, Voltaí, experiência do cliente e crescimento
- [x] Imagens editoriais novas (hero, identidade, chamada final)
- [x] SEO e metadados com o novo posicionamento
- [x] Conteúdo antigo da Home guardado no histórico de versões antes da troca

## v2.0.0 — Página pública como apresentação e conversão

- [x] Rascunho e publicação separados, com histórico e isolamento por barbearia
- [x] Editor modular em Visual, Conteúdo, Seções e Links
- [x] Oito temas, cinco layouts, fontes, cores, densidade, cantos e botões controlados
- [x] Prévia ao vivo no computador e celular usando o mesmo conteúdo da página publicada
- [x] Página pública com agendamento como ação principal e WhatsApp como ação secundária
- [x] Serviços, profissionais, galeria, avaliações agregadas, produtos, horários e localização exibidos somente com dados reais
- [x] Preservados agenda, clientes, equipe, caixa, WhatsApp, permissões e segurança existentes

- [x] Fuso horário por barbearia (painel de Horários; agenda, disponibilidade e lembretes respeitam o fuso)
- [x] Barbearia demo comercial "Barbearia Prime" (slug barbearia-prime), com serviços, profissionais, horários e página pública
- [x] Avisos: App e WhatsApp podem ficar ativos ao mesmo tempo, por tipo de aviso

## Implantação guiada e navegação (2.0)
- [x] Cache de sessão na navegação (fim do atraso entre telas)
- [x] Pré-carregamento das telas ao encostar no menu
- [x] Módulo central de capacidades por plano
- [x] Onboarding guiado em etapas com salvamento incremental
- [x] Tela "Recursos do seu plano" dentro da configuração
- [x] Menu filtrado pelo plano (some o que não está incluído)
- [x] Validação no navegador: troca de tela em ~43 ms e volta preservando a tela anterior


## Planos, onboarding adaptativo e cadastro público (2.0)
- [x] Tela "Plano da barbearia" (`/barbeiro/plano`) lendo planos e limites reais da plataforma; troca de plano sem perder dados.
- [x] Rotas dependentes de plano com guarda de capacidade (fila, produtos, fidelidade, indicações, crescimento, temas, marca).
- [x] Menu e onboarding derivados da mesma fonte central de capacidades.
- [x] Rota pública "Configurar minha barbearia" com rascunho protegido por código secreto, freio contra abuso e reivindicação de acesso com conta.
- [x] Primeira dobra da landing com nova mensagem e melhor leitura no celular.
- [x] Tela "Minhas barbearias" com plano, etapa pendente e troca segura de contexto (`perfis.tenant_ativo`).
- [x] Agendamento público da Barbearia Prime validado de ponta a ponta no celular (serviço → profissional → data → horário → dados → confirmação).

## Experiência operacional light e Agenda-first (24/09)

- [x] Substituir a navegação inferior por cabeçalho compacto e Drawer acionado pela marca
- [x] Tornar `/barbeiro` uma entrada Agenda-first reutilizando a Agenda existente
- [x] Aplicar tokens light/editorial/technical/urban ao painel de gestão
- [x] Reduzir cartões e manter módulos secundários sob demanda
- [x] Uniformizar as principais telas sem alterar regras, permissões ou backend
- [x] Validar TypeScript, build, navegação, Agenda e mobile

## Agenda operacional mobile-first (25/09)

- [x] Redesenhar topo, AGORA, próximos, lista e estados vazios
- [x] Ligar seleção e botão de tesoura à máquina de estados com Desfazer
- [x] Integrar atraso, WhatsApp, falta, fila e fechamento atual
- [x] Validar o fluxo operacional no celular e preservar a sincronização em tempo real

## Timeline operacional da Agenda (25/09)

- [x] Ativar a alternância Lista | Timeline sem biblioteca de calendário
- [x] Posicionar blocos e horários reais no fuso da barbearia
- [x] Adicionar linha Agora, abertura posicionada e retorno rápido
- [x] Validar seleção, realtime e rolagem fluida no celular

- [x] Prompt 7: finalizar → comanda → pagamento (plano/Pix/Cartão/Dinheiro/fiado), recepção, retorno, Meu dia

- [x] Perfil do cliente em folha (ficha de corte, alergias, foto com consentimento, histórico)
- [ ] Validar perfil/foto na tela com conta de barbeiro

## WhatsApp — gatilhos de lembrete (Prompt 9)
- [x] Lembrete com Confirmar / Remarcar / Cancelar (botão na API oficial, número nos demais)
- [x] "Cheguei" no lembrete do dia (30 min antes a 15 min depois)
- [x] Cancelar libera horário e avisa a lista de espera
- [x] Lembrete de retorno com consentimento e SAIR
- [ ] Teste ponta a ponta com WhatsApp real (depende de número conectado e modelos aprovados na Meta)
