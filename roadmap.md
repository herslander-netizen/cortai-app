# Roadmap

- [x] Aplicar identidade urbana Cortaí nos tokens e componentes compartilhados
- [x] Substituir marca e ícones PWA mantendo todos os pontos de uso
- [x] Revisar telas principais em celular e computador, claro e escuro

- [x] V3 Etapa 2: aplicar paleta neutra e destaques dessaturados por identidade
- [x] V3 Etapa 2: consolidar tokens de espaçamento, raio e estados da agenda
- [x] V3 Etapa 2: sincronizar cor do navegador e validar Agenda em 390/1280, claro/escuro

- [ ] Compactar header global: remover nome gigante da barbearia e H1 "Agenda"
- [ ] Corrigir logo escura invisível na home de início (/index, DescobrirBarbearias)
- [x] A1: fuso da barbearia na página pública de agendamento (lista de dias usava fuso do navegador)
- [x] A3: cache de permissões — RLS confirmada no banco; sessão atualiza em tempo real via tenant_usuarios
- [x] M3: desvinculado vê tela clara em /comecar (acesso desativado ou vínculo removido), sem loop
- [x] M2: recuperação de senha com resposta neutra (não revela se o e-mail existe)
- [x] B1: logo do Cortaí e da barbearia legíveis em todas as identidades e nos dois modos
- [x] B2: metatags padronizadas (og:url + canônica nas páginas públicas, noindex nas internas)

## Conversa Padrão (docs/conversa-padrao.md)

- [x] Textos padrão + variáveis + editar/desligar (conversa-padrao.ts, colunas em config_atendimento_ia)
- [x] Lista de templates Meta (docs/templates-meta.md)
- [x] 8 conversas de teste (7 passam; atraso é lacuna)
- [ ] Ligar os textos ao motor e acrescentar vocabulário
- [ ] Situações novas no motor (atraso, elogio, objeto esquecido, eventos, terceiros...)
- [ ] Seção "Conversa" no painel (textos, liga/desliga, FAQ)
- [ ] Notificações novas no agendador (horário próximo, pós-atendimento, falta, valor a pagar, aniversário)

## Agenda móvel em modo foco

- [x] Timeline móvel em tela cheia com ações diretas e menu mínimo
- [x] Leitura offline da última agenda e bloqueio seguro de ações sem conexão
- [x] Validar ações, toque longo, tela cheia e atualização ao vivo em 390 px

## Revisão barbeiro + cliente público (set/2026)

- [x] Agendamento público: busca de cliente pelo telefone (com/sem 9), horários ocupados iguais à trava do banco, "Alterar" sem duplicar, confirmação salva ao recarregar, aviso quando a barbearia não tem profissionais
- [x] Testes de disponibilidade
- [ ] Barbearias sem profissional ativo (o-barbeiro, nando-do-corte, teste) precisam cadastrar equipe para abrir agenda online
- [x] Agenda móvel: resumo do dia (faturado, faltam/atrasados, tempo médio) e finalizados recolhíveis
- [x] Confirmação pública explica alterar/cancelar e convite de conta com fidelidade
- [ ] WhatsApp: barbearias sem WhatsApp conectado — confirmações falham (precisa conectar em Integrações)

## Nova identidade visual Cortaí

- [x] Aplicar tokens Grafite/Creme e uso restrito do rosa em todo o app
- [x] Tornar escuro padrão, atualizar identidades, cliente, página pública e PWA
- [x] Migrar preferências e padrões do tenant no banco
- [x] Limpar cores fixas, atualizar documentação/novidades e validar telas em 390px
- [x] Fechar contraste destrutivo e da landing nos dois modos
- [x] Tratar azuis Cortaí como marca padrão e validar pares preenchidos
- [x] Recolorir o verde-lima dos sete PNGs oficiais sem alterar o desenho
- [x] Aplicar a nova logo oficial e simplificar a experiência de login
- [x] Aplicar capa social 1200×630 e ícone oficial do “í” em fundo branco no favicon e PWA

## Segmentos de beleza — Etapa 1

- [x] Adicionar segmento seguro ao negócio, preservando barbearias existentes
- [x] Centralizar vocabulário, sugestões, horários e aparência por segmento
- [x] Criar identidade Rosé e temas públicos Rosé, Rosé Creme e Nude
- [x] Adaptar criação, cadastro guiado, serviços, horários e página pública

## Segmentos de beleza — Etapa 2

- [x] Corrigir vínculos dos serviços, concordância, criação e textos de entrada
- [ ] Adaptar linguagem visível do painel, agenda, páginas públicas e app da cliente
- [x] Trocar o ícone da CortAI conforme o segmento
- [x] Ampliar conversa e vocabulário do WhatsApp sem alterar o motor determinístico
- [ ] Validar barbearia e negócio de beleza em 390/1280px, claro/escuro

## Segmentos de beleza — Etapa 3

- [x] A1 Escolha de serviço no WhatsApp: nome igual > único que contém > perguntar > lista (sem comparação invertida)
- [x] A2 Status "Em atendimento" fora da barbearia em todo o painel (segmento via contexto do painel)
- [x] A3 Textos com "barbearia" no menu Mais, ficha, atalhos da CortAI e saudação do WhatsApp
- [x] A4 Ícone "pingo" como acento inclinado do "í" (Sparkles abaixo de 15px)
- [x] B Retorno por serviço (servicos.retorno_dias), aviso no WhatsApp, ficha e filtro "Hora de voltar"
- [x] C Atalhos da ficha por segmento na criação e oferta de troca na Conta
- [x] D Testes, typecheck e conferência em 390/1280px

## Correções técnicas confirmadas — P0/P1

- [x] Corrigir o diálogo de exclusão permanente em camadas sobrepostas e validar em 390/1280px
- [x] P0: validar Desfazer da agenda em 5 segundos no servidor, sem condição de corrida
- [x] P0: auditar autorização das mutações de agenda, fila, clientes, financeiro e exclusões
- [x] P0: revisar funções SECURITY DEFINER tocadas e confirmar índices de envios_de_whatsapp antes de qualquer mudança
- [x] P1: reduzir atualizações redundantes da agenda preservando Realtime, polling e interface otimista
- [x] P1: usar funcionamento e fuso reais no próximo horário livre e revisar o cálculo mensal da fila
- [x] P2: executar typecheck, lint e todos os testes disponíveis; revisar apenas erros e transições concretos

## Consolidação arquitetural e UX (set/2026)

- [x] Publicar a Home institucional existente somente em /apresentacao, preservando / e /login
- [x] Consolidar contexto explícito do negócio no app do cliente e propagá-lo entre as quatro áreas
- [x] Canonicalizar a página pública em /b/$slug e preservar aliases por redirecionamento
- [x] Compartilhar o núcleo de seleção e disponibilidade entre booking público e autenticado
- [x] Unificar a ação de compartilhamento da página pública
- [x] Corrigir agendamento manual com funcionamento, fuso, duração e validação compartilhada antes de criar cliente
- [x] Reorganizar editor de marca em Identidade, Marca, Conteúdo e Ajustes avançados
- [x] Criar fixture idempotente Barbearia Cortaí Teste sem alterar Jjjuu ou Teste
- [x] Validar raiz/login, rotas públicas, contexto, booking, conflito, manual, permissões, mobile/desktop, TypeScript, testes e build
