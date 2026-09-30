# Refinamento do sistema de chat do Cortaí

O Cortaí Chat atual (print enviado) já tem a direção certa. A entrega transforma essa tela em um sistema visual único, usado por todos os chats, sem mexer em agenda, disponibilidade, reservas, pagamentos ou WhatsApp.

## O que muda para o cliente
- **Fundo novo**: o fundo enviado vira a base oficial do chat, com o centro limpo para leitura e movimento quase imperceptível nos cantos (desligado para quem prefere menos movimento).
- **Cabeçalho**: fixo e translúcido, com foto, nome do negócio, "Aberto agora" e "Hoje • 08h–20h" quando houver horário, e a marca Cortaí à direita.
- **Mensagens**: assistente em vidro escuro discreto; cliente em ciano com texto azul-marinho à direita; horário pequeno, agrupamento e avatar só no início de cada sequência.
- **Três pontinhos** por cerca de meio segundo antes de cada resposta, depois entrada suave.
- **Bandeja inferior** fixa, respeitando a área segura do celular: botões de resposta rápida nos passos guiados e campo de texto só onde já é permitido.
- **Escolhas visuais**: serviços em carrossel com foto 4:5, preço, duração e check; profissionais com foto redonda, especialidade e próximo horário; faixa de dias (Hoje, Amanhã, Sex…); horários em 3 colunas agrupados em Manhã/Tarde/Noite, sem mostrar ocupados.
- **Confirmação estilo ingresso** (serviço, profissional, data, horário, duração, valor, endereço), aviso de sinal pendente quando existir, e sucesso com check animado e confete discreto ciano/rosa.
- Estados de vazio, erro e lista de espera no mesmo visual.

## Onde aplica
1. Cortaí Chat de agendamento público (link da bio, Stories, QR Code — sem exigir conta).
2. Prévia do chat nas configurações e no onboarding.
3. Folha e assistente da CortAI no painel (mesma casca visual, sem alterar o que ela faz).

## Personalização por negócio
Amplio a tela "Como seu cliente agenda?" que já existe: nome e foto da recepção, mensagem inicial e final, cor de destaque (só dentro da paleta Cortaí), confete ligado/desligado, e escolha do fundo (oficial Cortaí, versão suave ou lisa), com prévia ao vivo. Tudo salvo na configuração atual da página, sem tabela nova. Negócios que não mexerem continuam como estão.

## Decisões mantidas
- **Fonte continua Manrope** (regra oficial da marca); o roteiro sugere Nunito/Poppins, mas trocar reverteria a identidade. Peso 800 em títulos, 700–800 em botões.
- Cores: navy #06245A, azul #0A3F80, ciano #00B4FF, rosa #FF2D78 só como acento.
- WhatsApp segue como Secretária Cortaí (avisos), não vira chat aberto. Instagram/WhatsApp entram só como preparação do mesmo visual.
- Sem IA gerando telas: o chat continua determinístico.

## Fora desta entrega
Nova camada de IA ("Alvo IA"), temas extras além dos três fundos e troca de contexto entre canais ficam para uma etapa própria.

## Detalhes técnicos
- Nova pasta `src/components/chat/` com ChatShell, ChatHeader, ChatBackground, mensagens, TypingIndicator, ChatComposer, QuickReplies e cards contextuais (serviço, profissional, data, horário, confirmação, pagamento, sucesso, vazio, erro, lista de espera).
- `AgendamentoChat.tsx`, `ChatPreview.tsx`, `FolhaCortai.tsx` e `AssistenteCortai.tsx` passam a compor esses blocos; estado e dados continuam vindo de `useSelecaoAgendamento`/motor oficial.
- Fundo enviado subido como asset CDN; tokens de chat adicionados em `src/styles.css`.
- `pagina-config.ts`: campo opcional `chat.fundo` com padrão compatível.
- Validação em 390 px e 1280 px, claro/escuro, movimento reduzido; testes, typecheck e build. Não publicar.
