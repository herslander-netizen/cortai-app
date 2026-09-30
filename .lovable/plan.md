# Refinar a experiência pública da Secretária Cortaí

## Implementação
- Ajustar o cabeçalho compartilhado para mostrar primeiro o nome configurado de quem atende e, abaixo, o estabelecimento, mantendo o estado Online/Digitando discreto.
- Reutilizar o indicador existente e tornar a pausa entre etapas curta e controlada pelo tamanho da próxima resposta, sem atraso perceptível para quem prefere menos movimento.
- Remover a repetição automática do nome do cliente após a identificação.
- Reforçar o contraste das opções de data e horário no tema claro, preservando cores e estrutura atuais.
- Manter a assinatura pública “By Alvo Digital • Cortaí” no rodapé.

## Limites
- Nenhuma alteração em disponibilidade, agendamento, banco, autenticação ou segurança.
- Nenhum componente paralelo: serão ajustados apenas `ChatHeader`, `AgendamentoChat`, a prévia e os tokens visuais existentes.

## Validação
- Conferir o fluxo em 390 px e 1280 px.
- Rodar TypeScript, testes disponíveis, lint dos arquivos alterados e build.
- Não publicar.
