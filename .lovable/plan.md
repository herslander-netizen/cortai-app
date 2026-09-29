# Consolidação completa do Cortaí

## Resultado esperado

Um único produto coerente, com base visual central, rotas públicas canônicas e motores compartilhados. O domínio raiz continuará sendo a porta do aplicativo: sem sessão vai para `/login`; com sessão segue para a área do papel. A página institucional ficará pública somente em `/apresentacao`, sem entrada no menu interno.

## Premissas confirmadas

- Preservar integralmente `src/lib/guarda.ts`, a autenticação atual, o retorno OAuth, RLS e permissões.
- Reaproveitar a Home institucional e o editor que já existem, hoje sem rota pública ativa, em vez de criar outra arquitetura.
- Adotar `/b/$slug` como página pública canônica. Os links antigos continuarão funcionando por redirecionamento.
- Manter `/agendar/$slug` para convidado e `/app/agendar` para cliente autenticado, mas ambos usarão o mesmo núcleo de seleção e disponibilidade.
- Criar `Barbearia Cortaí Teste` como fixture isolada, sem usuário ou senha inventados, e sem alterar `Jjjuu` ou `Teste`.
- Aplicar a consolidação de forma incremental nos fluxos prioritários desta solicitação, sem reescrever a agenda operacional inteira.

## Execução

### 1. Base visual e componentes compartilhados

- Normalizar em `src/styles.css` a escala 4/8/12/16/24/32/48, tipografia, raios, bordas, sombras, superfícies e estados.
- Consolidar variantes de botão, campos, seletores, estados vazios, carregamento, erro e skeleton nos componentes já existentes.
- Remover combinações conflitantes como `Button variant="ghost"` junto de classes antigas de botão, migrando as telas tocadas para as variantes centrais.
- Padronizar `Screen`, cabeçalhos, conteúdo, navegação inferior/lateral e formulários, mantendo a identidade e os modos existentes.

### 2. Home institucional discreta

- Criar `/apresentacao` usando `getHomePublicada`, `SecaoHero` e `SecaoDaHome` já existentes.
- Ajustar a configuração padrão para blocos curtos: problema, funcionamento, recursos, público, benefícios e CTA.
- Manter o conteúdo editável no admin e corrigir seus links de prévia para `/apresentacao`.
- Adicionar metadados próprios, canonical e Open Graph; a leitura será pública e independente de sessão privada.
- Não adicionar a rota ao menu interno e não alterar `/`, `/login` ou o retorno OAuth.

### 3. Contexto explícito do negócio no app do cliente

- Criar uma fonte única de contexto atual do cliente, persistida no navegador apenas como slug público e sempre revalidada no servidor.
- Prioridade: slug explícito vindo da página pública, contexto persistido válido, ficha única; com várias fichas e sem escolha, exibir seleção.
- Remover a escolha silenciosa da ficha mais recente como fallback quando houver múltiplos negócios.
- Fazer Início, Agendar, Meus horários, Espera, Carteira e remarcação propagarem o mesmo contexto.
- Ao vincular um agendamento de convidado à conta, adotar o negócio daquele agendamento como contexto atual.

### 4. Rotas públicas e motor de agendamento

- Manter `/b/$slug` como canônica e transformar `/$slug` e `/barbearia/$id` em aliases compatíveis que redirecionam para ela.
- Preservar `/f/$slug` e `/loja/$slug` como experiências distintas.
- Extrair do agendamento público e autenticado um núcleo compartilhado para serviço, profissional, dias, disponibilidade, horário, conflito e resumo.
- Manter adaptadores finos: convidado informa nome/WhatsApp; cliente autenticado usa ficha, carteira e formas de pagamento.
- Reutilizar `disponibilidade.ts` e as validações atuais do servidor; não duplicar regra de horário.

### 5. Página pública e editor da marca

- Reorganizar o editor existente em quatro camadas: Identidade, Marca, Conteúdo e Ajustes avançados.
- Transformar os estilos existentes em presets completos: Premium, Urbano, Clean, Editorial, Clássico, Street, Dark e Natural, cada um definindo composição, tipografia, densidade, imagem, logo e botões.
- Manter todas as opções atuais nos ajustes avançados e preservar rascunho, publicação, versões e prévia.
- Consolidar compartilhamento em uma ação com menu para compartilhamento nativo, WhatsApp, copiar link e QR.
- Continuar omitindo seções vazias e respeitando os controles de conteúdo e recursos.

### 6. App do cliente

- Preservar e consolidar as quatro áreas existentes: Início, Agendar, Meus horários e Perfil.
- Fazer Início mostrar o contexto atual e o próximo atendimento daquele negócio, com uma ação principal.
- Fazer histórico/remarcação manter o negócio correto.
- Padronizar estados e navegação sem duplicar funções entre telas.

### 7. Agenda, atendimento manual e modo foco

- Consolidar a ação principal como “Novo atendimento”, abrindo as opções já existentes de agendar, atender agora e encaixar, condicionadas a permissão/recurso.
- Remover a grade fixa 09–19 do formulário manual e gerar opções com funcionamento, intervalo, bloqueios, duração, profissional e fuso reais.
- Revalidar no servidor com a regra compartilhada antes de criar; criar cliente somente após a disponibilidade ser confirmada ou dentro de uma operação segura que não deixe órfão.
- Preservar a trava de conflito no banco, a permissão de encaixe e a interface otimista existente.
- No modo foco, derivar cliente atual, duração, decorrido, restante, previsão, próximo cliente, intervalo e atraso por profissional usando o Realtime atual.

### 8. CRM, navegação e recursos

- Melhorar a lista responsiva e a ficha usando os componentes centrais, mantendo busca e filtros atuais.
- Manter “Arquivar cliente” como ação principal quando houver histórico e mostrar exclusão permanente somente quando o servidor realmente permitir.
- Reduzir a navegação do barbeiro a Agenda, Clientes, Financeiro e Mais; ocultar itens sem permissão ou recurso ativo.
- Preservar os papéis Administrador, Barbeiro e Cliente e toda validação no servidor.
- Manter o Pix atual e não adicionar QR Pix.

### 9. Fixture isolada

- Adicionar migração retrocompatível e idempotente para `Barbearia Cortaí Teste`, com slug exclusivo e dados suficientes: serviços de durações diferentes, dois profissionais, clientes, horários, intervalo/bloqueio, agenda futura, atendimento em andamento, fila e produtos habilitados.
- Não tocar nos registros `Jjjuu` e `Teste`.
- Não criar credenciais. Se não houver associação segura com um usuário existente, documentar que a fixture valida superfícies públicas e dados, enquanto fluxos autenticados usam a sessão de teste disponível.

## Detalhes técnicos

- Registrar em `AGENTS.md` as decisões estruturais: rota institucional, rota pública canônica, contexto explícito e núcleo compartilhado de booking.
- Atualizar `roadmap.md` com os blocos desta execução e concluir cada item verificável.
- Toda nova função sensível continuará com autenticação, tenant, permissão e recurso no servidor.
- Toda tabela nova, se realmente necessária, terá GRANT, RLS e políticas na mesma migração; a preferência é não criar tabela nova para contexto efêmero.
- Redirecionamentos preservarão os endereços antigos e seus parâmetros relevantes.
- Cada rota de conteúdo terá metadados únicos; rotas internas permanecem `noindex`.

## Validação

- TypeScript, lint focalizado, testes existentes e build.
- Testes de navegador em 390×844 e 1280×1800.
- Fluxos: raiz sem sessão, `/apresentacao`, login existente, seleção/contexto do cliente, convidado e autenticado, conflito, manual/encaixe, foco ao vivo, arquivamento, papéis, recursos ocultos, página pública com seções desativadas e aliases.
- Conferir logs de build, console, rede e runtime antes de concluir.
- Não publicar.

## Limites de segurança

- Nenhuma empresa existente será usada como massa de teste ou alterada.
- Nenhum dado de autenticação será fabricado.
- Se a criação atômica de cliente + agendamento exigir mudança de banco maior que uma função transacional restrita, a implementação para exatamente nesse ponto e reporta o risco em vez de improvisar.
