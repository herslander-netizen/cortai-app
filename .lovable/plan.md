# Consistência global de UX/UI do Cortaí

## Objetivo

Transformar a experiência existente em um sistema visual e de navegação único, preservando todas as rotas, dados, permissões e regras de negócio. A intervenção será incremental: corrigir primeiro a base compartilhada e depois aplicar essa base aos fluxos públicos, cliente, gestão da barbearia e administração da plataforma.

## Diagnóstico da auditoria

- A área da barbearia já usa a estrutura principal correta com cinco posições, mas atalhos, ações rápidas e módulos ainda não refletem integralmente as permissões do papel ativo.
- A administração da plataforma expõe oito destinos com o mesmo peso, inclusive no celular; configurações, parceiros, pedidos e perfil competem com as áreas operacionais principais.
- “Recursos e planos” aparece separado de Monetização, apesar de pertencer ao mesmo domínio.
- Botões, campos, cards, avisos, folhas, diálogos e estados vazios misturam componentes reutilizáveis com estilos locais, criando diferenças de altura, raio, contraste e comportamento.
- O tema claro existe por variáveis, mas vários controles e superfícies ainda assumem o tema escuro diretamente.
- Algumas telas densas usam cards em excesso ou controles horizontais; outras têm pouca distinção entre conteúdo, ação principal e configuração avançada.
- Estados globais de erro e página inexistente ainda estão em inglês e fora da linguagem visual do produto.

## Implementação

### 1. Consolidar o design system

- Refinar os tokens semânticos de superfície, texto, borda, destaque, sucesso, atenção, perigo e elevação para dark e light mode.
- Padronizar tipografia, espaçamento, raios, foco, alturas de toque e movimento reduzido.
- Consolidar componentes reutilizáveis de botão, campo, seleção, textarea, badge, card, aviso, estado vazio, seção, modal e folha inferior.
- Remover estilos locais duplicados onde já houver um componente-base equivalente.
- Corrigir contraste, sobreposição, largura mínima e overflow na origem.

### 2. Arquitetura por perfil

- Criar uma definição única de navegação e visibilidade baseada no papel e nas permissões efetivas da sessão.
- Proprietário e gerente: Início, Agenda, ação central, Clientes e Mais; módulos de gestão ficam agrupados em Mais e no hub, conforme permissão.
- Profissional/barbeiro: foco em agenda, clientes e ações operacionais autorizadas; financeiro, equipe, marca e configurações não aparecem sem permissão.
- Recepção/atendimento: foco em agenda, clientes, balcão e ações autorizadas; áreas gerenciais ficam ocultas.
- Cliente: manter a navegação curta e orientada a agendar, horários, carteira e perfil.
- A ocultação visual complementará, sem substituir, as verificações de segurança já existentes no servidor.

### 3. Navegação da gestão da barbearia

- Manter a barra de cinco posições já definida e melhorar estados ativos, áreas de toque, safe area e adaptação a telas estreitas.
- Filtrar ações rápidas por permissão e manter a tesoura como ação central sem rótulo.
- Reorganizar o hub e o menu Mais por Operação, Gestão e Configurações, sem duplicar entradas nem remover rotas.
- Ajustar cabeçalhos e retornos para deixar localização e ação principal evidentes.

### 4. Navegação da administração da plataforma

- Reduzir o celular a quatro áreas: Visão geral, Barbearias, Monetização e Mais.
- Organizar no Mais administrativo: Pedidos, Parceiros, Aparência/Design, Perfil e demais ferramentas secundárias.
- No desktop, manter uma lateral hierárquica com grupos “Principal”, “Comercial” e “Administração”, em vez de uma lista plana.
- Incorporar “Recursos e planos” como subseção de Monetização, preservando a tela e suas capacidades por meio de navegação interna coerente.

### 5. Aplicação global nas telas

- Uniformizar shells, cabeçalhos, listas, indicadores, formulários, tabelas, modais, mensagens e estados vazios nas áreas pública, cliente, barbearia e admin.
- Reduzir altura e aninhamento excessivos em celular; preservar densidade e leitura em desktop/tablet.
- Ajustar telas densas prioritárias: Início, Agenda, Clientes, Mais, Equipe, Conta, Monetização, Barbearias, Pedidos, Parceiros e Aparência.
- Traduzir e alinhar estados globais de erro e página inexistente ao Cortaí.

### 6. Validação

- Verificar navegação e visibilidade para proprietário, gerente, profissional/barbeiro, recepção e cliente, usando sessões disponíveis ou estados controlados quando uma conta real não estiver disponível.
- Testar larguras 320, 360, 390 e 430 px, tablet e desktop 1280 px.
- Conferir ausência de scroll horizontal, sobreposição, texto cortado e alvos de toque pequenos.
- Validar dark e light mode, modais, folhas, formulários, carregamento, vazio, sucesso e erro.
- Executar testes relevantes, typecheck e build; não publicar.

## Limites preservados

- Nenhuma funcionalidade, rota, dado, integração ou regra de negócio será removida.
- Nenhuma alteração de banco será feita, salvo se uma falha visual depender comprovadamente de informação já existente e inacessível — não é esperado neste trabalho.
- A identidade preta/grafite, branca e dourada será mantida; dourado continuará reservado a ação principal, foco e estado ativo.
- O comportamento definido aqui passa a ser a referência permanente para novas telas e funcionalidades.
