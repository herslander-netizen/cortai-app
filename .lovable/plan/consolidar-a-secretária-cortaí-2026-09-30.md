# Consolidar a Secretária Cortaí

## Objetivo
Transformar o WhatsApp existente em canal exclusivamente transacional, mantendo webhooks, conexões, registros, deduplicação, isolamento por negócio e mutações oficiais. Cortaí Chat assume agendamento e gerenciamento; CortAI deixa de responder mensagens livres no WhatsApp.

## Implementação
1. **Fechar o runtime de conversa livre**
   - Depois de registrar a mensagem recebida, aceitar somente ações válidas de uma notificação pendente.
   - Desligar o caminho ativo de saudação, menu, intenção geral, motor determinístico/IA, transferência humana e atendimento fora de horário.
   - Para mensagem sem contexto, enviar uma única resposta neutra com o link real do Cortaí; deduplicar e impedir loop.
   - Preservar Meta/Evolution, assinatura, inbox de webhook, roteamento por conexão, mensagens, status e auditoria.

2. **Consolidar notificações**
   - Manter `notificacoes.server.ts` como único motor e ampliar os tipos transacionais compatíveis.
   - Centralizar textos segment-aware para confirmação, lembretes, alteração, cancelamento, vaga, pagamento, pós-atendimento, avaliação, recuperação e retorno.
   - Separar avisos essenciais de relacionamento; aplicar consentimento e silêncio apenas onde cabível.
   - Manter idempotência e tentativas limitadas; falhas nunca bloqueiam a operação principal.

3. **Avaliação da experiência**
   - Reutilizar `avaliacoes`; inspecionar políticas e acrescentar somente os campos necessários.
   - Criar link público opaco, expirável e idempotente, vinculado ao atendimento finalizado e ao negócio correto.
   - Oferecer nota geral, dimensões opcionais e comentário; nota baixa gera atenção interna, nota positiva só oferece avaliação pública quando há link real.

4. **Reposicionar o painel**
   - Renomear para “Secretária Cortaí” e reorganizar em Conexão, Notificações, Experiência do cliente e Histórico de envios.
   - Retirar inbox/conversa humana, chatbot, FAQ, saudação e instruções de IA da superfície ativa.
   - Exibir conexão, notificações, entregas, avaliações e experiências que precisam de atenção.

5. **Validação**
   - Cobrir ações contextuais, expiração, isolamento, dedupe, silêncio, fallback sem loop, avaliação segura, ausência de conexão e segmentação.
   - Rodar typecheck, testes, build e lint disponível.
   - Validar 390px e 1280px, claro/escuro e estados loading/empty/error quando houver acesso de teste.
   - Não publicar.

## Limites
- Sem app, motor ou tabela paralelos.
- Sem remover histórico necessário ou mudar contratos internos só por nomenclatura.
- Sem marketing, campanhas, aniversário ou conversa livre no módulo da Secretária.
- Mudança de banco somente se a avaliação segura exigir, de forma aditiva e compatível.
