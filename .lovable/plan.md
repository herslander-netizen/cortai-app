# Entrada emergencial e autenticação estável

## Objetivo
Substituir a página inicial pesada por uma porta de entrada mínima, mantendo a apresentação atual em uma rota secundária e eliminando bloqueios ou disputas de redirecionamento no login e cadastro.

## Implementação
- Transformar `/` em uma tela leve, mobile-first, com a marca oficial, uma frase curta e ações diretas para **Entrar**, **Criar conta** e, em segundo plano, **Encontrar uma barbearia**.
- Mover a apresentação institucional atual, sem apagar conteúdo ou funcionalidades, para `/apresentacao` e manter metadados próprios.
- Criar `/cadastro` como entrada direta para o formulário de criação de conta, reutilizando a mesma experiência de autenticação de `/login`.
- Extrair o formulário compartilhado de login/cadastro para um componente leve, sem dependências da landing, agenda, notificações ou painéis.
- Remover verificações de sessão que bloqueiam a montagem do formulário; a tela aparece imediatamente e a recuperação de sessão ocorre em segundo plano.
- Coordenar o retorno de e-mail/Google e o listener global para impedir consultas duplicadas, navegação concorrente e ciclos entre `/`, `/login`, `/cadastro` e as áreas autenticadas.
- Preservar os guardas atuais de cliente, barbeiro e administrador, sem alterar permissões ou regras de segurança.

## Validação
- Testar `/`, `/login` e `/cadastro` em 390×844 e 1280px, incluindo links, voltar/avançar, atualização e ausência de overflow.
- Restaurar uma sessão de teste com segurança e confirmar o redirecionamento pelo papel, além do bloqueio cruzado entre usuário comum e admin quando as contas disponíveis permitirem.
- Conferir console, erros de execução, rede, rotas e o registro automático de build; corrigir qualquer falha relacionada encontrada.
- Não publicar.

## Detalhes técnicos
- Usar somente TanStack Router e os componentes/tokens existentes.
- Manter a autenticação independente de consultas públicas e módulos internos.
- Não instalar pacotes, não alterar banco/RLS e não reconstruir áreas fora do caminho de entrada.
