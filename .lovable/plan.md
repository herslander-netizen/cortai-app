# Reformulação operacional do Cortaí

## Resultado
Transformar o painel atual em um ambiente de trabalho leve, claro e centrado na Agenda, preservando dados, regras, permissões, rotas e os motores existentes.

## Implementação
1. **Sistema visual central**
   - Trocar os tokens do painel para off-white, superfícies brancas, texto grafite, cinza mineral e verde ácido controlado.
   - Manter os nomes semânticos atuais para atualizar as telas existentes com baixo risco, removendo o dourado da interface de gestão.
   - Reduzir sombras, raios e excesso de cartões; padronizar foco, toque, campos, listas, divisores e transições curtas.
   - Isolar a landing e páginas públicas quando necessário para não descaracterizar conteúdos externos já publicados.

2. **Shell de gestão e Drawer**
   - Substituir a barra inferior e o FAB global por um cabeçalho compacto compartilhado.
   - Logo/nome da barbearia abrirão um Drawer lateral imediato, alimentado pelo cache já existente de sessão e capacidades.
   - Organizar os links em Operação, Gestão, Relacionamento, Barbearia e Conta, filtrando pelas mesmas permissões e capacidades atuais.
   - Exibir contexto leve: usuário, função, barbearia, avisos e atalhos de configuração; módulos só carregarão após navegação.
   - “Equipe” será a entrada principal; a rota de profissionais continuará acessível para compatibilidade.

3. **Agenda como tela inicial**
   - Fazer `/barbeiro` reutilizar a experiência operacional e a consulta da Agenda, sem manter o painel financeiro pesado como primeira tela.
   - Destacar atendimento atual, próximo cliente e horários livres; manter criação, encaixe, fila, repetição e fechamento.
   - Preservar `/barbeiro/agenda` e links profundos, compartilhando a mesma experiência em vez de duplicar o motor.
   - Ajustar o detalhe do agendamento para interação contextual sem introduzir novo fluxo de negócio.

4. **Consistência das telas prioritárias**
   - Aplicar o novo cabeçalho e a linguagem de listas/divisores nas telas solicitadas por meio dos componentes e tokens compartilhados.
   - Refinar os pontos mais carregados de Agenda, agendamentos, clientes, equipe/profissionais, conta, configuração, Mais, horários e marca sem reescrever suas regras.
   - Corrigir altura, rolagem e espaços antes reservados à barra inferior.

5. **Desempenho e validação**
   - Retirar carregamentos globais desnecessários do shell e evitar que Drawer, CortAI ou módulos secundários disparem consultas pesadas.
   - Reaproveitar cache de sessão/capacidades e manter carregamento sob demanda das rotas.
   - Validar permissões, capacidades, abertura/fechamento do Drawer, ida/volta, Agenda, telas vazias/loading e responsividade mobile.
   - Rodar testes relevantes, checagem TypeScript, observar o build automático e testar visualmente no navegador.

## Limites deliberados
- Sem migrações, novas tabelas ou campos de profissional/comodidades nesta entrega.
- Sem alterações nos motores da Agenda, CortAI ou WhatsApp.
- Sem remoção de rotas antigas, dados, permissões ou funcionalidades.
- A landing pública não será redesenhada nesta mudança operacional, salvo ajustes estritamente necessários para isolar os novos tokens do painel.
