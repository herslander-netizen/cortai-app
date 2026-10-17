# CortAI — conexão real do WhatsApp e conversa fluida

Auditoria feita: a base já existe e será aproveitada inteira. Nada de banco, permissões, gateway ou webhook será recriado.

## O que já existe (não será refeito)
- Conexão por barbearia guardada no banco (sessão, número, nome, status, QR, validade, último erro).
- Camada única do serviço de WhatsApp com criar sessão, pegar QR, status, enviar, reiniciar e desconectar — recusando tudo com honestidade enquanto o serviço externo não estiver configurado.
- Aviso "Serviço de WhatsApp não configurado" com as variáveis que faltam.
- Recebimento de avisos do serviço (mensagem recebida, QR atualizado, conectado, desconectado) com assinatura conferida e sem processar duas vezes.
- Conversas, mensagens, assumir/devolver/encerrar, CortAI respondendo só com dados reais da barbearia, isolamento por barbearia.

## O que será corrigido e implementado

### 1. Tela "Conectar WhatsApp" com todos os estados reais
Cada situação ganha texto, ícone e ação próprios: desconectado, preparando a conexão, gerando QR, QR na tela (com contagem e instrução "WhatsApp Business → Aparelhos conectados → Conectar um aparelho"), QR expirado com "Gerar novo QR Code", conectando, conectado (número, nome, data/hora), erro com "Tentar novamente" e queda de sessão com "Reconectar WhatsApp". O botão principal muda de texto conforme o estado.

### 2. Status que se atualiza sozinho
Enquanto a conexão não estiver pronta, a tela consulta o serviço a cada poucos segundos (e para sozinha quando conecta, quando a aba sai de foco ou depois de alguns minutos). Assim que o serviço confirma, a tela vira "WhatsApp conectado" sem recarregar a página. A consulta usa a função de status que já existe no servidor; nenhuma conexão é dada como certa pelo navegador.

### 3. QR Code real também quando vem como texto
Alguns serviços devolvem o QR como imagem e outros como texto. Hoje só a imagem aparece. Passa a desenhar o código a partir do texto recebido do serviço, no próprio navegador. Continua sendo o código real do serviço — nada estático, decorativo ou inventado.

### 4. Conversa que não corta mais nada
A conversa passa a ter três faixas independentes: cabeçalho fixo, lista de mensagens com rolagem própria e campo de escrita sempre visível. Nenhuma mensagem fica atrás do campo, nada escapa da tela, sem rolagem dupla e sem conteúdo saindo de lado.

### 5. Rolagem inteligente
Se a pessoa está no fim da conversa, a nova mensagem rola sozinha. Se está lendo mensagens antigas, nada se mexe e aparece discretamente "Nova mensagem ↓" para voltar ao fim com um toque.

### 6. Indicador "● ● ●"
Enquanto o CortAI processa (consulta, agenda, decide), aparece o balãozinho com três pontos animados no lugar da resposta. Some quando a resposta chega; se der erro, some e aparece o aviso do erro. Animação curta e discreta, respeitando quem prefere menos movimento.

### 7. Erro de envio com "Tentar novamente"
A mensagem que não saiu continua na tela marcada como não enviada, com ação para reenviar. Nada some em silêncio.

### 8. Mensagens de sistema e quem está respondendo
"Agendamento realizado", "WhatsApp conectado" e afins ganham estilo próprio, separado das falas. A conversa mostra claramente "Atendimento humano" ou "Atendimento pelo CortAI".

### 9. Celular e computador
Celular (390 e 430 px): altura real da tela, área segura do aparelho respeitada, botão enviar sempre alcançável. Computador (1024 a 1920): lista de conversas à esquerda e conversa aberta à direita, sem ser a versão esticada do celular.

### 10. A folha do CortAI (bottom sheet)
Mesma ideia de hoje, arrastável e fechável, mas com a área de mensagens rolando por dentro, o campo de escrita sempre acessível e nada cortado.

## Segurança (mantida)
Chaves e segredos continuam só no servidor. Cada barbearia enxerga apenas as próprias conversas, mensagens e sessão. O CortAI segue respondendo só com dados cadastrados e encaminha para a equipe quando não souber.

## Detalhes técnicos
- Nova função de servidor `sincronizarConexao` (permissão `gerenciar_whatsapp`) consultando `gatewayDeWhatsapp.consultarStatus` e gravando em `conexoes_whatsapp`; usada pelo polling com `refetchInterval` condicional no React Query.
- `gateway.server.ts`, `eventos.ts`, migrações e RLS: sem alteração.
- QR em texto desenhado no cliente com a biblioteca `qrcode` (import dinâmico, só quando há QR).
- `barbeiro.cortai.tsx` dividido em componentes menores (`ConexaoWhatsapp`, `ListaDeConversas`, `JanelaDaConversa`, `Digitando`) para evitar renders desnecessários.
- Layout com `100dvh`/`min-h-0` e `env(safe-area-inset-bottom)`; tokens e classes atuais preservados.
- `FolhaCortai` e `AssistenteCortai`: cabeçalho, lista rolável e formulário como faixas irmãs em coluna.

## Verificação final
Tipos, build e console limpos; conferência visual em 390, 430, 1024, 1280 e 1920 px; teste dos estados de conexão, do indicador de três pontos, de resposta longa, de rolagem e de erro de envio.

## Continua dependendo de fora
Publicar o serviço de WhatsApp e cadastrar `WHATSAPP_GATEWAY_URL`, `WHATSAPP_GATEWAY_API_KEY` e `WHATSAPP_WEBHOOK_SECRET`. Sem isso, a tela avisa honestamente e nenhum QR é mostrado.
