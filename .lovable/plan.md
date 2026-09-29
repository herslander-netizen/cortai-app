# Corrigir a confirmação de exclusão permanente

## Implementação
- Substituir o overlay interno do `ExclusaoPermanente` pelo `AlertDialog` já usado no app, preservando a confirmação por caixa marcada, erros reais e estado de processamento.
- Ajustar o `AlertDialog` para funcionar como folha inferior no celular e janela centralizada no computador, sempre acima do diálogo do negócio e com retorno correto do foco ao cancelar.
- Revisar apenas a apresentação do diálogo de detalhes do negócio no computador: largura, altura útil, rolagem e separação das seções.

## Validação
- Conferir exclusão de negócio no admin em 1280 px e 390 px, incluindo abertura, cancelamento, retorno do foco e botão bloqueado até a confirmação.
- Conferir os outros usos da exclusão permanente em clientes e indicações.
- Confirmar a verificação automática e os testes relacionados, sem alterar cobrança, segmentos ou regras de exclusão.
