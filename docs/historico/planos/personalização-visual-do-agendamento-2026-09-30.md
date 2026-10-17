# Personalização visual do agendamento

## Objetivo
Retirar a aparência fixa do Cortaí do agendamento público e fazer a experiência refletir a identidade de cada negócio, reaproveitando a personalização que já existe no painel.

## O que será alterado
- Fazer o Cortaí Chat usar a capa, o logo e as cores publicadas pelo negócio, em vez do fundo e da paleta azul fixos.
- Manter a marca Cortaí apenas como assinatura discreta da plataforma, sem competir com o nome e o logo do estabelecimento.
- Reorganizar a área **Personalizar página** para deixar mais claro o resultado de cada escolha:
  - capa do agendamento;
  - logo/avatar do negócio;
  - paleta pronta ou cores personalizadas;
  - prévia do modo Conversa e do modo Tradicional.
- Aplicar automaticamente contraste e camada de proteção sobre a capa, garantindo leitura em fotos claras ou escuras.
- Usar a mesma identidade publicada na página pública e no link de agendamento, sem criar uma segunda configuração.
- Preservar o comportamento atual quando o negócio ainda não tiver capa, logo ou cores próprias.

## Experiência esperada
- O cabeçalho destaca primeiro o negócio: logo, nome e recepção configurada.
- A capa ocupa o fundo da conversa com tratamento leve; não será usada uma imagem genérica quando o negócio tiver enviado a própria.
- Balões, botões, seleção, foco e confirmação usam as cores do negócio com contraste acessível.
- A prévia no painel muda imediatamente, antes da publicação.
- O fluxo, disponibilidade, confirmação, cancelamento e demais regras de agenda permanecem intactos.

## Detalhes técnicos
- Ampliar a configuração visual do chat existente, mantendo compatibilidade com configurações já publicadas.
- Incluir capa e cores publicadas na leitura da agenda pública; URLs privadas continuam assinadas no servidor.
- Expor as escolhas ao chat por variáveis semânticas, sem cores soltas nos componentes.
- Reutilizar upload, compressão, rascunho, publicação e histórico já existentes.
- Não criar tabela nova, motor paralelo ou migração destrutiva.

## Validação
- Conferir painel e agendamento em 390 px e 1280 px, com e sem capa/logo.
- Validar contraste, texto longo, carregamento, erro e redução de movimento.
- Percorrer o chat até a confirmação sem concluir uma reserva real.
- Rodar TypeScript, testes existentes, build e lint dirigido aos arquivos alterados.
- Não publicar.
