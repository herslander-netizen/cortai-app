# Redesenho visual do menu lateral

## Objetivo
Recriar o drawer móvel com a hierarquia da referência, mantendo os dados, permissões, rotas, gestos e identidade atuais do Cortaí. Nada será publicado.

## Implementação
- Reorganizar o cabeçalho com marca do negócio, nome, pessoa/papel, saudação compacta e botão de Ajustes.
- Promover “Sua Página” e “Agenda” a cartões principais, usando slug, estado e agenda já carregados.
- Renderizar apenas grupos operacionais e administrativos no drawer, com listas agrupadas, expansão persistida e Agenda removida da lista comum.
- Criar a folha inferior de Ajustes sobre o drawer, reunindo Conta, Plano, Aparência, Avisos, Ajuda e saída confirmada, sem criar rotas.
- Aplicar a geometria, superfícies e movimento descritos usando somente tokens e componentes existentes.
- Acrescentar testes de estrutura e atualizar a regra arquitetural do drawer.

## Validação
- Conferir claro e escuro em 360 px e 412 px, incluindo abertura pela borda, rolagem e fechamento.
- Rodar verificação de tipos, lint dirigido, testes e build.

## Premissas
- “Sua Página” abrirá a página pública em `/b/$slug`; o compartilhamento usará essa mesma URL.
- A identidade visual completa será oferecida em Ajustes apenas se a sessão e a permissão atuais já permitirem sua alteração.