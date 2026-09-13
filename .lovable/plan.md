# Navegação, equipe e permissões do Cortaí Gestão

## Resultado
- Trocar a barra inferior da barbearia por cinco posições confortáveis: Visão geral, Agenda, ação rápida central, Pedidos e Mais.
- Eliminar rolagem horizontal e quebra de labels, preservando área segura, contraste e estados ativos.
- Manter o painel global visualmente distinto; no mobile, seus sete atalhos deixam de ficar espremidos e os menos frequentes passam para um menu próprio.

## Ações rápidas
- Criar um botão central circular, levemente elevado, em preto/dourado, que abre uma folha compacta de ações.
- Reutilizar o agendamento manual e os fluxos existentes de produtos, clientes e fila.
- Exibir somente ações permitidas e recursos habilitados no plano: agendamento manual, confirmar pagamento, registrar venda, novo cliente e adicionar à fila.
- Confirmar pagamento somente após escolher um atendimento pendente, revisar cliente/serviço/valor/forma e confirmar explicitamente.

## Pedidos e pagamentos
- Criar `/barbeiro/pedidos` para centralizar atendimentos aguardando confirmação financeira e seu histórico recente.
- Registrar no atendimento quando, por quem e como o pagamento foi confirmado, sem confirmar por um toque acidental.
- Não inventar pedidos de loja online: enquanto não há checkout de produtos no Cortaí, a tela usará os atendimentos reais e seus pagamentos.

## Equipe e permissões
- Ampliar os perfis da barbearia para Dono, Gerente, Barbeiro e Recepção.
- Criar permissões individuais, isoladas por barbearia, para todos os grupos pedidos: agenda, cancelamento, pagamento, venda, preço, estoque, clientes, financeiro, relatórios, profissionais, dados da barbearia, permissões e ações destrutivas.
- Aplicar perfis padrão como ponto de partida e permitir exceções por funcionário.
- Criar em “Mais” o Gerenciador de equipe para vincular contas existentes por e-mail, alterar perfil/permissões e remover acesso com confirmação.
- Garantir que sempre exista um dono e impedir que alguém remova ou rebaixe o último dono.

## Segurança e auditoria
- Validar cada permissão no servidor; esconder botões será apenas uma camada adicional de interface.
- Manter o isolamento por barbearia em todas as consultas e alterações.
- Reutilizar a confirmação por senha existente para ações destrutivas e mudanças sensíveis de equipe/permissões.
- Registrar ações críticas com barbearia, usuário, ação, alvo, detalhes e data/hora em histórico imutável.
- Restringir a visualização da equipe e da auditoria a quem tiver autorização.

## Reorganização de “Mais”
- Preservar todas as páginas atuais e agrupá-las por frequência e permissão: conta/perfil, clientes, financeiro, estoque/loja, crescimento, indicações, avaliações, serviços, fila, fidelidade, profissionais, marca, equipe/permissões e auditoria.
- Não duplicar rotas nem remover recursos; atalhos indisponíveis ficam ocultos ou apresentam o bloqueio de plano já existente, conforme o caso.

## Verificação
- Conferir a navegação e os modais em largura mobile, incluindo tela estreita e área segura inferior.
- Testar usuário com permissões reduzidas, dono e separação entre duas barbearias.
- Testar confirmação de pagamento em duas etapas, ações rápidas e histórico de auditoria.
- Revisar todas as rotas da barbearia, metadados, TypeScript e build.

## Detalhes técnicos
- Novas estruturas no banco: permissões individuais por vínculo, auditoria da barbearia e campos de confirmação de pagamento no atendimento.
- Funções de autorização centralizadas serão usadas por leituras e alterações sensíveis; o administrador global continuará usando suas regras próprias.
- Componentes atuais serão reutilizados antes de criar formulários equivalentes.