# Painel do dono da plataforma

## Objetivo
Criar uma área `/admin` exclusiva para o dono da plataforma, sem vínculo com um tenant, usando somente dados reais. Quando não houver base suficiente, os indicadores mostram zero e “sem dados ainda”.

## Estrutura do painel

### Visão
- Mostrar receita mensal, total de barbearias, conversão de grátis para pago e cancelamento.
- Calcular receita somando o preço configurado do plano de cada tenant ativo, considerando ciclo mensal/anual e desconto do tenant; anual aplica 20% antes do cupom.
- Permitir configurar preços dos planos; preços ainda não informados começam em zero, sem inventar valores.
- Exibir ranking de sinais de conversão por correlação observada: fidelidade ativa, venda de pacote e uso da fila de espera.
- Não exibir correlação quando a amostra não for suficiente.

### Barbearias
- Lista pesquisável e filtrável por todas, pagantes e em risco.
- Cada linha mostra plano, agendamentos, ciclo e status.
- “Em risco” quando o último acesso foi há mais de 7 dias, nunca houve acesso ou nenhuma regra de plano foi ativada.
- Detalhe da barbearia com os motivos do risco, histórico de contatos e contexto de uso.
- Mostrar WhatsApp com mensagem de ajuda pré-preenchida e telefone somente quando o canal existir.
- Após o contato, registrar canal, resultado, observação, responsável e data.

### Design system
- Tela global para editar paleta base, tipografia e raio de borda.
- Exibir princípios de design como toggles visíveis e travados.
- Aplicar as configurações globais como base em toda a plataforma; a marca de cada tenant continua sobrescrevendo apenas os tokens permitidos.

### Pedidos
- Lista de sugestões cadastradas pelo admin, ordenada pela quantidade de barbearias que pediram.
- Cadastro com pedido literal, motivo obrigatório, canal, barbearias solicitantes e status.
- Status: em análise, no roteiro, em desenvolvimento, implementada ou recusada.
- Detalhe mostra as barbearias solicitantes, seus planos e porte por volume de agendamentos.

## Dados e segurança
- Adicionar a `tenants`: ciclo, desconto percentual, estado ativo e último acesso consolidado.
- Criar histórico de plano alimentado automaticamente a cada mudança de plano.
- Criar contatos de retenção, sugestões e configurações globais da plataforma.
- Registrar o acesso do tenant por atividade autenticada do painel da barbearia.
- Restringir leitura e escrita dessas informações ao papel `admin`; tenants não enxergam dados da plataforma nem de outros tenants.
- Criar todas as tabelas com permissões explícitas, proteção por linha, índices e validações no mesmo conjunto de alterações.

## Entrega técnica
- Criar funções autenticadas específicas do admin para métricas, listas e alterações.
- Transformar o layout admin em painel amplo e separado, com navegação própria adaptada a celular e desktop.
- Substituir as páginas vazias atuais por Visão, Barbearias, Design system e Pedidos.
- Remover “Usuários” da navegação admin nesta versão, pois não faz parte do pedido.
- Validar compilação, acesso negado sem papel admin e telas responsivas.
