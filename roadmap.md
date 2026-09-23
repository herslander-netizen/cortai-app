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

## Evolução do CortAI (concluída)
- [x] Memória do cliente (histórico, preferências, serviço/profissional habituais)
- [x] Contexto curto da conversa (serviço, dia, opções, "o primeiro") persistido
- [x] Intenção identificada e registrada em conversas e logs
- [x] Informações oficiais da barbearia (FAQ) com CRUD na tela do CortAI
- [x] Tons premium e objetivo; sugestão de clientes sumidos (sem envio automático)
- [x] Transcrição real de áudio quando o serviço entrega a mídia (sem simulação)
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
