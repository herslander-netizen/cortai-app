# Unificação visual P0 do Cortaí

## Resultado
- Carregar somente a família Manrope no aplicativo.
- Usar `#111110` na barra do navegador e no manifesto instalável.
- Remover todas as ocorrências das cores antigas `#D4AF6A` e `#C9A227`.

## Aplicação
- Trocar cores visuais em componentes por `var(--gold)`.
- Na página de erro isolada, declarar o token localmente porque ela não carrega o CSS do aplicativo.
- Em configurações e migrações que aceitam apenas hexadecimal, substituir pelas cores atuais resolvidas do design system, preservando o formato esperado.
- Não alterar comportamento, dados, permissões ou fluxos.

## Verificação
- Confirmar por busca que as cores antigas e as famílias removidas não existem mais.
- Validar o carregamento da página, os metadados e o manifesto.
- Conferir o app em celular e desktop, além do resultado automático do build.
