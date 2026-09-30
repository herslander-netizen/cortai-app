# Padronização dos chats do Cortaí

## Objetivo
Unificar as experiências públicas de conversa no padrão visual da Secretária de Agendamento, sem alterar regras, dados ou operações da agenda.

## Implementação
- Consolidar cabeçalho compartilhado com avatar configurado, nome da recepção e estado acessível `Online`/`Digitando...`.
- Tornar fundo, balões, botões, foco, cartões e confirmações neutros por padrão, usando os tokens existentes e mantendo a personalização já publicada por negócio.
- Aplicar o mesmo padrão à conversa pública, às prévias de configuração e ao onboarding, removendo variações visuais concorrentes.
- Manter a assinatura `By Alvo Digital • Cortaí` apenas no rodapé público; usar a logo oficial já existente no onboarding.
- Preservar link público, capa, avatar, nome, mensagens e cores configuradas atualmente.

## Limites
- Nenhuma mudança no motor de disponibilidade, criação, cancelamento ou remarcação.
- Nenhuma migração ou alteração de dados prevista; só será feita se surgir uma necessidade técnica comprovada e segura.
- CortAI interno permanece separado do Cortaí Chat público.

## Validação
- Verificar fluxo público em 390 px e 1280 px, incluindo teclado, rolagem, loading, erro e confirmação sem gravar reserva.
- Rodar TypeScript, testes relevantes, lint dos arquivos alterados e build.
- Confirmar que nenhuma rota pública, configuração ou regra existente sofreu regressão.
