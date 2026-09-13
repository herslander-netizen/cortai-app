# Assistente CortAI + configuração inicial do barbeiro

## O que vou construir

Uma configuração inicial curta para quem acabou de criar a barbearia, um assistente de IA de verdade dentro do produto, um tour curto no painel, um cartão "Primeiros passos" que lembra o progresso, e a entrada na fila pelo link público sem login.

Nada do que já existe é removido: agenda, clientes, financeiro, Voltaí, loja, equipe, administração e a página pública continuam iguais.

## Premissas

- A identidade continua a atual (fundo quase preto, cartões grafite, dourado/âmbar na ação). Entendo "laranja/amarelo" como essa mesma família; não troco a paleta do produto.
- WhatsApp fica opcional em todo o fluxo e a integração fica preparada, sem simular conexão.
- Se a chave da IA não estiver disponível, o assistente responde com um aviso claro e atalhos úteis — nunca inventa resposta.

## 1. Configuração inicial (4 passos)

Nova tela `/barbeiro/configurar`, aberta logo depois de criar a barbearia:

1. **Dados** — nome (obrigatório) e WhatsApp; logo/foto opcionais.
2. **Horários** — botão "Usar Seg–Sáb, 09:00 às 19:00" já selecionado + personalizar por dia. Campo de texto livre: "segunda a sábado das 9 às 19 e domingo fechado" → prévia antes de salvar.
3. **Serviços** — sugestões prontas (Corte, Barba, Corte + Barba, Pezinho, Sobrancelha, Platinado) com preço/duração editáveis + bloco "✨ Quer que o CortAI configure isso para você?" que interpreta texto e mostra prévia editável.
4. **Pronto** — "Sua barbearia está pronta!", status do que foi configurado, link da fila, Copiar, Compartilhar e Ver fila.

Cada passo salva sozinho; sair e voltar retoma onde parou. O botão de saída vira "Configurar depois". WhatsApp aparece como recomendado, nunca bloqueia.

## 2. Assistente "Perguntar ao CortAI"

- Botão fixo no painel e item no menu de ajuda; abre um painel lateral (celular: folha de baixo para cima).
- Entende português natural e resolve tarefas: cadastrar serviços, ajustar horários, explicar a fila, mostrar o que já está cadastrado, levar para a tela certa.
- Toda alteração passa por prévia em cartões + botão **Confirmar**; nada é gravado antes disso.
- Respostas de navegação trazem atalhos ("Ir para serviços", "Abrir fila", "Abrir horários").
- Conversa fica salva por barbearia, para continuar depois.

## 3. Tour curto e Primeiros passos

- Ao terminar a configuração, vai para o painel com o convite "Começar tour" ou "Explorar sozinho" (reaproveita o guia contextual que já existe, sem cobrir a tela).
- Passos: fila atual → adicionar cliente → chamar próximo → serviços → assistente.
- Cartão "Primeiros passos" no painel com progresso gravado: configurar barbearia, cadastrar serviços, publicar a fila, conhecer o painel da fila, conectar o WhatsApp (opcional), personalizar.
- Menu de ajuda reúne: Primeiros passos, Fazer tour novamente, Perguntar ao CortAI, Central de ajuda.

## 4. Fila pública para o cliente

Na página pública da barbearia: escolher serviço, informar nome e WhatsApp, confirmar e entrar na fila — sem login. Depois mostra posição, estimativa de espera e status, com atualização automática. Aviso por WhatsApp fica preparado, desligado por enquanto.

## Detalhes técnicos

**Banco (uma migração)**
- `horarios_de_funcionamento` (tenant, dia da semana, abre/fecha, fechado) + grants, RLS por membro do tenant, leitura pública mínima para a página da fila.
- `onboarding_do_tenant` (etapa atual, concluído em, itens do checklist em jsonb, tour visto).
- `conversas_de_ia` / `mensagens_de_ia` (tenant, autor, conteúdo, ação estruturada em jsonb), RLS por tenant.
- `fila_de_espera`: colunas `nome_visitante`, `telefone_visitante`, `servico_id`, `status`, `token_publico`; `cliente_id` passa a aceitar nulo para entrada anônima, com RPC `entrar_na_fila_publica` (security definer) e leitura de posição só pelo token.

**IA (server-side)**
- `src/lib/ia/assistente.server.ts`: chamada ao Lovable AI Gateway com `openai/gpt-6-astra` na Responses API, em streaming, prompt de sistema com vocabulário de barbearia, regra de nunca inventar dados e de sempre pedir confirmação.
- Saída estruturada: `resposta`, `intencao`, `acao`, `parametros`, `precisaConfirmar`.
- `src/lib/ia/assistente.functions.ts`: `perguntarAoCortai`, `confirmarAcaoDaIa`, `interpretarServicos`, `interpretarHorarios` — todas com `requireSupabaseAuth`, permissão do tenant e validação Zod do lado do servidor; a execução da ação é reescrita no servidor a partir dos parâmetros, nunca confiando no texto do modelo.
- Sem chave: retorno de fallback explícito (`disponivel: false`) com atalhos.

**Interface**
- `src/components/ia/AssistenteCortai.tsx` (painel + mensagens + ações rápidas), `BotaoAssistente.tsx`.
- `src/components/onboarding/*` para os 4 passos e `PrimeirosPassos.tsx` no painel.
- Rotas novas: `/barbeiro/configurar`, `/barbeiro/horarios`; `/barbeiro/servicos` (hoje vazia) ganha o CRUD real + bloco de IA.
- `src/lib/guia/tours.ts` ganha o tour "primeiros-passos" apontando para `data-guia` reais.

**Validação**: `bunx tsgo --noEmit`, `bun run build` e passagem pelos dois fluxos no navegador (barbeiro novo → configuração → serviços com IA → painel → tour → assistente; cliente → link público → entrar na fila → acompanhar).
