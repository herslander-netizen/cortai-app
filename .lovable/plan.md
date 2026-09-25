# Correção imediata da Agenda V3.0

## Resultado
- Tornar a Agenda uma central operacional compacta: data, Agora/Próximos, lista e uma única ação contextual.
- Preservar consultas, realtime, permissões, estados, fila, comanda, seleção, perfil e WhatsApp.

## Implementação
- Adaptar `Screen` para aceitar uma apresentação compacta usada somente pela Agenda, sem repetir a identidade da barbearia.
- Enxugar navegação de data, destaques, filas e lista com divisores e hierarquia tipográfica clara.
- Manter Lista como padrão móvel e conter a Timeline em sua própria área, com blocos legíveis e retorno ao agora discreto.
- Consolidar o FAB existente e seu menu em uma folha inferior compacta com ações únicas.
- Exibir duração normal como tempo decorrido e, quando excedida, como `+X excedido`, sem mudar o cálculo.
- Ajustar estilos da Agenda com tokens existentes, safe area e contenção horizontal.

## Verificação
- Validar a Agenda em 360, 375, 390 e 412 px, além do desktop.
- Conferir seleção, alternância Lista/Timeline, abertura das ações e ausência de sobreposição ou rolagem horizontal.
- Confirmar testes relevantes, TypeScript e compilação automática.
