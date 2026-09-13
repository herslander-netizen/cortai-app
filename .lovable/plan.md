# Refinamento visual e performance do Cortaí

## Objetivo
Tornar a entrada pública mais elegante e acelerar o primeiro carregamento e a navegação, sem alterar autenticação, regras de negócio ou funcionalidades.

## Implementação
- Redesenhar o CTA principal como ação compacta e premium, com dourado contido, estados sutis e proporções adequadas em mobile e desktop.
- Rebaixar visualmente a busca de barbearias para uma ação secundária, refinando largura, espaçamento e alinhamento do bloco inicial.
- Reduzir o trabalho global feito antes da primeira pintura, adiando personalização, guias, redes sociais e parceiros quando não forem críticos para a tela atual.
- Aplicar divisão de código nas rotas e carregamento sob demanda para blocos públicos secundários e módulos pesados.
- Otimizar imagens da landing com variantes modernas e responsivas, dimensões estáveis, prioridade somente na imagem principal e carregamento tardio abaixo da dobra.
- Enxugar as fontes globais para a família e pesos realmente utilizados, sem bloquear mais recursos que o necessário.
- Evitar chamadas duplicadas ou antecipadas na landing, busca e login; manter cache adequado e sem espera artificial.
- Remover apenas código ou recursos comprovadamente sem uso e preservar PWA, login, busca e navegação.

## Validação
- Conferir landing, busca e login em mobile e desktop, incluindo foco, toque e ausência de overflow.
- Medir recursos e chamadas do primeiro carregamento antes e depois.
- Confirmar verificação de tipos e build sem erros.
