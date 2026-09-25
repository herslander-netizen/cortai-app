# Timeline operacional da Agenda

## Implementação
- Ativar a alternância Lista | Timeline mantendo a Lista atual intacta.
- Criar uma régua vertical leve, calculada no navegador a partir do expediente e dos agendamentos, sempre no fuso da barbearia.
- Posicionar cada atendimento pela hora marcada e dimensioná-lo pela duração, com identificação visual do estado.
- Exibir no bloco o horário marcado e os horários reais disponíveis: chegada, início e término.
- Adicionar a linha “Agora”, atualizada uma vez por minuto sem animação contínua.
- Ao abrir a Timeline de hoje, rolar diretamente para a linha atual; depois, respeitar a rolagem manual.
- Mostrar “Voltar para agora” quando a linha atual sair da área visível.
- Reutilizar a seleção existente: tocar no bloco seleciona o cliente e atualiza o botão da tesoura.
- Preservar atualização otimista, sincronização em tempo real, fuso, permissões e fechamento existentes.

## Detalhes técnicos
- Sem biblioteca de calendário: somente React, CSS e cálculos de minutos.
- Grade em intervalos de 30 minutos, com faixa derivada do horário de funcionamento e dos eventos do dia.
- Usar referências do DOM apenas para rolagem e visibilidade; nenhum listener repetido.
- Garantir alvos de toque de pelo menos 48 px e rolagem vertical fluida no celular.

## Validação
- Conferir Lista e Timeline em 360×679, sem rolagem horizontal.
- Confirmar posicionamento da linha “Agora”, seleção de cliente, retorno ao agora e atualização por realtime.
- Executar TypeScript e testes automatizados.
