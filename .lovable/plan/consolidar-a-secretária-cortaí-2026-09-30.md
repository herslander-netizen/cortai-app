# Consolidar a Secretária Cortaí

## Objetivo
Transformar o caminho ativo do WhatsApp em um canal exclusivamente proativo e transacional, mantendo o Cortaí Chat como experiência de agendamento e o CortAI separado como inteligência do produto.

## Implementação
1. **Fechar o runtime transacional**
   - Manter webhooks, assinatura, roteamento por conexão, deduplicação e auditoria existentes.
   - Aceitar somente ações válidas de uma notificação pendente, verificando tenant, telefone, identificador externo/payload, validade, ação permitida e resposta única.
   - Remover do caminho ativo menu, conversa livre, IA, FAQ, serviços, preços e transferência humana; mensagens sem contexto recebem fallback curto deduplicado.

2. **Completar o motor único de notificações**
   - Evoluir `notificacoes.server.ts`, sem criar motor paralelo, para os tipos oficiais e templates segmentados.
   - Separar avisos essenciais de relacionamento, respeitar consentimento, frequência, silêncio, fuso e janela do provedor.
   - Reagendar relacionamento bloqueado por silêncio para a primeira janela válida, com retries limitados e idempotência por evento.
   - Garantir que falhas do WhatsApp nunca interrompam agenda, atendimento, comanda ou financeiro.

3. **Tornar a avaliação segura e atômica**
   - Reutilizar `avaliacoes`, mantendo uma avaliação por agendamento e dimensões opcionais em JSONB.
   - Finalizar convite público por token opaco, expiração e consumo atômico, sem expor IDs e sem permitir corrida ou repetição.
   - Gerar sinal interno para nota baixa e oferecer avaliação pública somente quando houver link real.

4. **Reposicionar o painel**
   - Organizar em Conexão, Notificações, Experiência do cliente e Histórico de envios.
   - Exibir conexão, automações ativas, próximo envio, entrega, avaliações e experiências que precisam de atenção.
   - Remover da interface ativa inbox, atendimento automático, saudação, FAQ, horário/instruções de IA e controles de atendimento humano.
   - Preservar aliases antigos apenas para redirecionar ao histórico, sem reativar conversa.

5. **Cobertura e validação**
   - Adicionar testes para dedupe/concorrência, janelas e silêncio, isolamento multi-tenant, ações contextuais, expiração, fallback, avaliação e segmentação.
   - Validar typecheck, suíte completa, build e lint disponível.
   - Exercitar as telas em 390px e 1280px, claro/escuro, incluindo loading, vazio, erro, avaliação válida e convite expirado.

## Banco e compatibilidade
- Sem `DROP`, sem apagar dados e sem alterar contratos oficiais de agenda.
- Reutilizar tabelas e índices atuais; qualquer extensão mínima será aplicada por migration, com GRANT, RLS e política na ordem exigida.
- Código histórico de conversa pode permanecer no repositório quando removê-lo representar risco, mas ficará inalcançável pelo runtime e pela navegação ativa.

## Entrega
Relatório final com caminhos desativados, infraestrutura preservada, arquivos e migrations, pipeline, tipos/templates, avaliação, fallback, testes, pendências reais e confirmação explícita de que nada foi publicado.
