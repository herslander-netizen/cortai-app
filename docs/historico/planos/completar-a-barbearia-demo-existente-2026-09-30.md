# Completar a Barbearia Demo existente

## Objetivo
Transformar o tenant `demonstracao` já existente em uma vitrine coerente do Cortaí, sem recriar a demo, sem publicar e sem alterar motores ou permissões.

## Implementação
- Atualizar a identidade fictícia premium, mantendo o mesmo tenant, slug público, horários e recursos existentes.
- Ajustar o catálogo atual para os seis serviços pedidos e manter três profissionais ativos, com especialidades e compatibilidade já suportadas.
- Consolidar exatamente dois clientes fictícios principais, removendo somente fixtures excedentes deste tenant de demonstração de forma segura e ordenada.
- Popular, com IDs determinísticos e datas relativas ao fuso do tenant, histórico, agenda atual/próxima, cancelamento ou fila, fidelidade, avaliações, pagamentos, comanda/caixa e comissões onde os módulos existentes permitirem.
- Usar a página pública e o Cortaí Chat oficiais, sem duplicar disponibilidade ou mutações.
- Reaproveitar imagens existentes; só usar URLs públicas leves se nenhum asset adequado estiver disponível.
- Reutilizar uma conta demo existente e limitar sua associação ao tenant da demo; não expor credenciais.
- Adicionar uma indicação discreta de “Demonstração” apenas nas superfícies da demo e manter a navegação pelos módulos oficiais.

## Segurança e compatibilidade
- Alterações aditivas/idempotentes e restritas ao UUID fixo do tenant demo.
- Nenhuma mudança em RLS/RBAC, autenticação, engines, contratos financeiros ou dados de outros tenants.
- Nenhuma publicação.

## Validação
- Conferir contagens e isolamento no banco.
- Validar login dedicado, página pública e agendamento oficial.
- Verificar painel em 390 px e desktop, incluindo os dois clientes e os módulos demonstráveis.
- Rodar lint dos arquivos tocados, suíte de testes, typecheck e build.
- Informar o SHA atual do repositório; não criar commit porque o versionamento é gerenciado pelo ambiente.
