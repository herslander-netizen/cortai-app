# Ajustes pós-componentes

## O que será ajustado
- Tratar a recusa de acesso ao WhatsApp na própria tela, mantendo a permissão atual e exibindo “Você não tem acesso a esta área”.
- Consolidar uma tela de erro padrão para rotas, com mensagem clara e ação Voltar.
- Manter uma única tesoura na Agenda: botão flutuante de 56 px, redondo quando ocioso e estendido com o nome correto ao iniciar ou finalizar.
- Mostrar acima da tesoura um menu curto sem ações repetidas, reutilizando os fluxos atuais de atendimento manual, agendamento, bloqueio e fila.
- Fazer Agenda, menu lateral e CortAI abrirem o mesmo fluxo de novo agendamento.
- Revisar apenas regressões visuais nas áreas do barbeiro, recepção e dono em 375 px e desktop.

## Detalhes técnicos
- A recusa continuará sendo feita no servidor; somente o tratamento visual do erro será alterado.
- O tratamento global usará o mecanismo de erro do TanStack Router, sem criar rotas paralelas.
- O botão fixo respeitará a área segura e reservará espaço no fim da lista.
- Serão adicionados testes enxutos para variantes/espera/toque duplo/acessibilidade do Button e texto/ícone de cada Status.

## Validação
- Executar tipos, testes e compilação.
- Conferir as telas prioritárias em 375 px e desktop, incluindo o menu da tesoura e os estados com nome.
- Confirmar que a recusa de acesso não produz tela em branco.
