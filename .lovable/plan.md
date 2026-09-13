# Upgrade incremental do Cortaí

## Objetivo
Reorganizar a experiência mobile sem recriar o produto, apagar módulos ou alterar dados e regras atuais. A base visual preta/grafite, branca e dourada será preservada.

## Navegação e ações rápidas
- Substituir somente a navegação da área da barbearia por cinco posições: **Início, Agenda, tesoura, Clientes e Mais**.
- Manter a tesoura dourada elevada, sem legenda, com estados acessíveis e animação curta.
- Abrir uma folha de ações rápidas com **Novo agendamento, Novo atendimento, Nova venda e Novo cliente**, reutilizando os fluxos atuais sempre que existirem e adicionando apenas a apresentação mínima necessária quando não houver um atalho direto.
- Garantir fechamento por toque fora, botão de fechar, tecla Escape e após navegar.
- Manter a Fila dentro da experiência de Agenda e retirar Financeiro da barra sem remover sua rota.

## Organização das áreas
- Ajustar **Início** para reforçar resumo do dia, próximos atendimentos, faturamento, ocupação e alertas, preservando as consultas existentes.
- Incluir atalhos contextuais em **Agenda** para calendário do dia, profissionais, fila e bloqueios, sem duplicar módulos.
- Reforçar em **Clientes** histórico, frequência, inativos e a comunicação **Voltaí**.
- Reorganizar **Mais** em grupos claros para Caixa/Financeiro, Loja/Estoque, Equipe/Profissionais, Serviços, Relatórios/Crescimento, Marketing, Configurações e os demais módulos que já existem. Itens ainda não implementados não ganharão rotas fictícias.

## Identidade e consistência
- Refinar hierarquia, espaçamento, superfícies e estados ativo/inativo usando os tokens centrais existentes.
- Conter o dourado em ações principais, tesoura, seleção e detalhes premium.
- Manter linguagem direta de barbearia e a mensagem **“Sua barbearia, no controle.”**.
- Preservar o comportamento visual atual e preparar tokens consistentes para claro/escuro sem alterar a identidade oficial ou as imagens aplicadas.
- Corrigir qualquer overflow mobile relacionado aos elementos alterados.

## Onboarding e Voltaí
- Atualizar a conclusão da criação da barbearia com **“🔥 Tá tudo pronto pra começar os cortes!”**, **“Seu Cortaí tá no jeito. Bora atender?”** e o botão **“✂️ Entrar no Cortaí”**.
- Apresentar a fidelidade existente como **Voltaí**, dentro do Cortaí, com **“Seu cliente corta. Ganha. Volta.”**, sem criar produto, tabela ou regra paralela.

## Validação
- Verificar em 390×844 e desktop: ausência de rolagem horizontal, cinco posições estáveis, estado ativo correto, abertura/fechamento da tesoura e navegação de todos os atalhos.
- Validar as rotas existentes afetadas, estados de carregamento/erro, console e runtime.
- Confirmar verificação de tipos e build limpos, sem publicar e sem migração de banco.

## Premissas técnicas
- “Equipe”, “Relatórios”, “Marketing” e “Configurações” serão representados pelos módulos equivalentes já existentes na base restaurada; não serão inventadas telas vazias.
- A alteração fica concentrada no shell da barbearia, componentes de navegação/ações, páginas de Início/Agenda/Clientes/Mais, onboarding, fidelidade e tokens globais.
