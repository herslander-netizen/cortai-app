# Correção incremental do WhatsApp/CortAI

## Escopo
- Ajustar o reconhecimento determinístico de pedidos de disponibilidade e perguntas simples sobre a barbearia.
- Preservar e limpar corretamente o menu/estado entre mensagens, sem perder seleções válidas.
- Interpretar “amanhã às 15” no fuso já adotado e não ampliar a busca para horários fora da faixa pedida.
- Manter mídia fora do motor textual, com resposta honesta quando o atendimento automático estiver ativo.
- Exigir confirmação explícita também na remarcação, reutilizando as ações de agenda existentes.
- Adicionar testes focados nos diálogos reportados e executar testes, tipagem e build.

## Limites
- Nenhuma mudança em página pública, autenticação, financeiro, agenda visual, credenciais, provedores ou conexões.
- Nenhum envio real, dado fictício, chamada de IA ou alteração destrutiva.
- Sem migração de banco; somente código do motor atual e seus testes.

## Detalhes técnicos
- Evoluir vocabulário/classificador e o roteamento de informações oficiais.
- Corrigir o filtro de período para retornar vazio quando a hora pedida não estiver disponível.
- Transformar a escolha de novo horário em etapa de confirmação antes da ação de remarcação.
- Reiniciar o contexto de fluxo ao apresentar o menu de fallback, preservando apenas a identidade do cliente.
