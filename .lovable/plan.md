# Carregamentos consistentes no Cortaí

## Objetivo
Eliminar telas vazias e unificar toda espera real em esqueletos que imitam o conteúdo, sem alterar regras de negócio nem publicar.

## Implementação
- Consolidar blocos, regiões acessíveis e esqueletos nomeados em `Esqueleto.tsx`, com brilho único sincronizado, atraso anti-pisca, redução de movimento e entrada suave do conteúdo.
- Fazer o componente visual genérico de esqueleto usar o mesmo padrão; manter indicadores dentro de botões e os três pontos somente para chats.
- Corrigir as animações reais de espera que hoje são desligadas no fim dos estilos.
- Adicionar esqueletos do casco aos layouts de equipe, cliente e administração, mais um fallback geral do roteador com tempos mínimos estáveis.
- Substituir carregamentos visíveis nas telas prioritárias por esqueletos do formato correspondente, preservando conteúdo durante atualizações com dados já presentes.
- Padronizar placeholders de imagens prioritárias sem mudança de proporção.
- Reaproveitar os componentes de erro existentes para esperas prolongadas onde o fluxo já oferece repetição segura.
- Registrar o padrão no contrato de design e adicionar testes de estrutura, acessibilidade e movimento.

## Verificação
- Confirmar no HTML inicial, com JavaScript desligado, que equipe, cliente e administração não ficam vazios.
- Conferir as telas principais em 390 px e 1280 px, claro e escuro, incluindo uma simulação de rede lenta quando o acesso permitir.
- Rodar formatação dirigida, tipos, lint, testes e montagem completa.

## Premissas
- A tela de retorno do acesso pode manter o splash da marca, com barra animada.
- Ações em botões continuam usando o indicador pequeno dentro do próprio botão.
- Sem credencial aprovada para um perfil, a verificação visual autenticada será registrada como pendente sem bloquear as demais validações.
