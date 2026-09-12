# Refinamento visual do app cliente — Direção C

## Resultado
Aplicar a composição premium calm nas telas do cliente, mantendo a paleta, Montserrat, dados e comportamentos atuais.

## Alterações
- Tornar `/` uma entrada direta para a experiência do cliente, removendo o seletor demonstrativo de papéis sem apagar as rotas de barbeiro e administração.
- Reduzir a navegação inferior para Início, Agendar, Carteira e Horários, com área segura inferior e aparência discreta.
- Reconstruir a Home com identidade da barbearia em primeiro plano, informações secundárias reais, frase “Seu estilo, no seu horário.” compacta e CTA proporcional.
- Compactar títulos, espaçamentos e seções das telas de agendamento, carteira e horários.
- Manter listas com divisores; usar cartão apenas no saldo da carteira e no resumo de próximo horário.
- Refinar o cartão de saldo, preservando a faixa de poste de barbeiro.
- Separar próximo horário do histórico, com status discreto e ações secundárias equivalentes quando aplicáveis.
- Manter a assinatura discreta ao fim do conteúdo.

## Verificação
- Conferir as quatro rotas do cliente em 390px.
- Testar troca de abas e ausência de rolagem horizontal.
- Confirmar que carregamento, seleção e ações existentes continuam acessíveis.

## Detalhes técnicos
- Alterações apenas em apresentação e navegação; sem banco, regras ou novos recursos.
- Reutilizar os tokens atuais e componentes de botão existentes.
- Preservar suporte a cores configuráveis por barbearia e preferência de movimento reduzido.
