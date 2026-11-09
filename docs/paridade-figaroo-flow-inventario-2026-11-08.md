# Paridade integral Figaroo → Flow — inventário mestre e critérios de aceite
**Decisão do proprietário: 8 de novembro de 2026. Referência: Figaroo APK 1.0.0 build 168 (07/11/2026).**

## Objetivo, sem redução de escopo

Todas as telas, subpáginas, fichas, estados, navegações, movimentos e funções
comprovadas do Figaroo entram no inventário, inclusive aquilo que ainda não
existe no Flow. O objetivo é **implementar os equivalentes funcionais no Flow**,
sem suprimir o que o Flow já faz e mantendo sua marca. *Não usar o Figaroo
apenas como catálogo de cores ou inspiração.*

Uma correspondência visual aparente NÃO equivale a paridade funcional.
Não classificar um módulo como concluído sem validar lista → ficha → edição →
salvamento → estados de erro e vazio → ações destrutivas → retorno →
permissões → persistência → mobile 360/390 px → claro/escuro.

O APK de referência e a especificação em
\`docs/referencia-figaro/apk/\` são fontes para compreender comportamento.
Implementar código próprio em React/TanStack/Supabase/Cloudflare, sem copiar
bibliotecas proprietárias ou conteúdo protegido de terceiros sem licença.
Dados pessoais, cadastro real, autenticação e regras de segurança ficam
nas fontes oficiais do Flow.

## Cobertura obrigatória

| Módulo Figaroo | Flow atual / rota de referência | Situação e diferença a verificar |
| --- | --- | --- |
| Entrada e autenticação | \`/login\`, \`/comecar\`, \`/recuperar-senha\`, \`/redefinir-senha\` | **Paridade não demonstrada**: etapas de e-mail, credenciais, códigos, login social, estados e animações |
| Onboarding | \`/barbeiro/configurar\`, \`/configurar-minha-barbearia\` | **Parcial**: comparar cada etapa, progresso, criação de equipe, disponibilidade, serviços e confirmação |
| Home / navegação | \`/barbeiro\`, \`/barbeiro/mais\`, \`/app\` | **Parcial**: hierarquia da gaveta, cartões, transições, indicadores e atalhos |
| Agenda | \`/barbeiro/agenda\`, \`/barbeiro/agendamentos\` | **Reservada/protegida**: não alterar visual sem autorização específica; comparar movimentos e regras separadamente |
| Ficha do agendamento | \`/barbeiro/agendamento\`, UI de Agenda | **Parcial**: gestos, status, etapas, edição, eventos, ações, segurança e confirmação |
| Clientes e fichas | \`/barbeiro/clientes\`, \`/barbeiro/clientes/$id\`, \`/barbeiro/crm\` | **Parcial**: lista → ficha → editores, história, recorrência, fidelidade, mensagens |
| Equipe e profissional | \`/barbeiro/equipe\`, \`/barbeiro/profissionais\` | **Lacuna prioritária**: Flow separa permissões e portfólio; faltava ficha unificada com indicadores, disponibilidade, serviços, gestão |
| Serviços | \`/barbeiro/servicos\`, \`/barbeiro/categorias\` | **Parcial**: ficha individual, taxas/variações, disponibilidades, regras, categorias, desativar/excluir |
| Combos | Serviços, pacotes e motor de agendamento | **Não comprovado**: criação em etapas, descontos, sugestão durante agendamento e dependências |
| Localidades | \`/barbeiro/negocio\`, \`/barbeiro/horarios\` | **Não equivalente comprovado**: múltiplos endereços, comodidades, horários especiais, equipe por localidade |
| Pacotes/loyalty | \`/barbeiro/pacotes\`, \`/barbeiro/fidelidade\` | **Parcial**: composição, vender, visitas, reprogramar, validade, desativação e assinatura |
| Checkout / cobranças | \`/barbeiro/caixa\`, \`/barbeiro/financeiro\` | **Parcial**: fluxo em etapas, método, recibo, pendências, falhas e conciliação |
| Vendas e caixa | \`/barbeiro/caixa\`, \`/barbeiro/produtos\` | **Parcial**: painel/itens, estoque/vendas, estornos e detalhamento |
| Campanhas/marketing | \`/barbeiro/divulgar\`, \`/barbeiro/crescimento\`, \`/barbeiro/indicacoes\` | **Não auditado integralmente**: criar campanha, público, execução, histórico, métricas |
| Avaliações | \`/barbeiro/avaliacoes\`, \`/avaliar/$token\` | **Parcial**: painel próprio com média, distribuição, comentários, filtros e ficha |
| Notificações | \`/barbeiro/notificacoes\`, \`/barbeiro/whatsapp-avisos\` | **Parcial**: canais, eventos, horários, configurações por cliente/equipe |
| Configurações do negócio | \`/barbeiro/negocio\`, \`/barbeiro/funcionalidades\` | **Parcial**: telas individuais, acessos, comodidades, horários, regras |
| Configurações da conta | \`/barbeiro/conta\` | **Parcial**: informações, e-mail, senha, integrações de login, encerramento |
| Assinatura | \`/barbeiro/plano\` | **Parcial**: painel/estados de contratação, limites, alterações e cobrança |
| Galeria e mídia | editor de \`/barbeiro/marca\`, perfil \`/barbeiro/profissionais\` | **Parcial**: biblioteca, corte de imagem, seleção, remoção e prévia |
| Página pública | \`/barbeiro/marca\`, \`/barbeiro/marca/layout-tema\`, \`/f/$slug\` | **Parcial**: comparação estrutural já iniciada, mas faltam editores e testes visuais por tema |
| Agendamento público | \`/agendar/$slug\` e variantes | **Parcial**: etapas, disponibilidade, telefone, validação, confirmação e cancelamento |
| Relatórios e desempenho | \`/barbeiro/crescimento\`, \`/barbeiro/financeiro\` | **Não auditado integralmente**: períodos, números, detalhamento e consistência |

**Estado global:** NÃO CONCLUÍDO. Ter uma rota semelhante não prova que a
página está completa. As ~100 rotas de página do Flow não foram verificadas
uma por uma. A execução precisa mapear também subpáginas, folhas e diálogos
que não possuem URL própria.

## Equipe: confronto funcional específico

A documentação do APK (\`7-modulos.md\` §4) comprova: lista de membros,
criação em duas etapas, painel individual com foto, indicadores de
agendamentos/receita/avaliação, disponibilidade semanal e por data, dados
pessoais, serviços, desativar e excluir, com confirmação e reativação;
editores separados por seção.

No Flow foram identificados:
- \`/barbeiro/equipe\`: conta/login, convite, papéis, permissões,
  recuperação, suspensão de acesso e remoção de vínculo;
- \`/barbeiro/profissionais\`: foto, descrição e portfólio;
- \`EscalaDaEquipe\` em Horários: expediente individual;
- \`/barbeiro/servicos\`: vínculo dos serviços por \`profissional_ids\`.

**Início da implementação da ficha (nesta entrega):**
- Rota própria \`/barbeiro/equipe/$userId\`, alcançável a partir da lista,
  com identidade, papel, vínculo explícito \`profissionais.user_id\`,
  métricas verificáveis, escala semanal, serviços e ações para os
  editores já existentes.
- Conta com mais de um profissional vinculado é sinalizada, não associada
  automaticamente; conta sem profissional não inventa números.
- Edição de escala reutiliza \`EscalaDaEquipe\` e a função de gravação
  autorizada do Flow (não cria um segundo motor de disponibilidade).
- **Lote seguinte (09/11/2026):** tela separada `/barbeiro/equipe-dados/$userId`
  para editar nome público e descrição do profissional. Usa a função de perfil
  existente, com `userId` opcional verificável, sem alterar conta de login,
  foto ou portfólio. A tela detecta alterações não salvas e usa a confirmação
  de saída do `TelaDeFormulario`. O servidor recusa vínculos ausentes ou
  duplicados, confere `tenant_id` e exige permissões reais.
- **Lote de disponibilidade por data (09/11/2026):** nova tela exclusiva
  `/barbeiro/equipe-data/$userId` ligada à ficha. Reutiliza as funções
  oficiais `listarHorariosEspeciaisDoDia`, `salvarHorarioEspecial`,
  `removerHorarioEspecial` e o seletor de horário do Figaroo; fixa
  o alvo ao profissional vinculado, respeita data atual no fuso do negócio,
  exige salvar e confirma remoções com diálogo.
  Isto implementa janelas excepcionais, **não uma folga integral por data**
  (o motor de horários especiais atual não representa um dia inteiramente
  fechado). Não confundir o recurso com o calendário de bloqueios.
- **Atenção:** ainda não é paridade completa: folgas/exceções de fechamento
  por data, editor de serviços atribuído ao profissional, criação em duas
  etapas, exclusão/desativação independente do login e validação visual
  autenticada continuam pendentes. Não apagar dados/profissionais sem
  autorização e avaliação dos agendamentos futuros.

## Contratos a preservar na reconstrução

1. **Não confundir entidades:** \`tenant_usuarios.user_id\` (acesso) não é
   \`profissionais.id\` (agenda). Vincular somente por
   \`profissionais.user_id\` real e por \`tenant_id\`.
2. Desativar profissional de agenda não implica apagar conta, cancelar
   agendamentos já realizados ou remover vínculo de autenticação.
3. Excluir um perfil com compromissos futuros requer política clara,
   confirmação e compatibilidade com obrigações legais; não fazer
   exclusão forçada.
4. Qualquer novo dado ou regra de negócio só por backend oficial,
   RLS/tenant, migração aditiva ensaiada e autorização para aplicar em banco.
5. Não substituir recurso original do Flow por uma imitação vazia ou
   número fictício visto em vídeos de divulgação.
6. Nenhuma mudança visual geral na Agenda sem pedido específico.
7. Sem mudanças em produção, \`main\`, segredos ou \`evolution-crm\`.
8. Referências visuais devem ser capturadas em estados comparáveis no
   Figaroo build 168 e no Flow, em 360/390 px, escuro/claro e com movimento reduzido.

## Critério verificável para chamar "completo"

Uma matriz de **cada módulo → lista → painel → telas/editor de cada seção
→ criação → exclusão/desativação → estados → animação → fonte de dados →
testes** com evidência de funcionamento e screenshot comparativo.
Sem evidência de algum item, classificar como **pendente**, nunca "feito".
Mudanças devem ser testadas/implantadas apenas na branch oficial com CI
aprovado, sem publicação no site principal sem autorização expressa.
