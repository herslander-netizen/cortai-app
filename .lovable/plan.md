# Reorganizar a edição administrativa de barbearia

## Objetivo
Transformar o modal atual em uma área administrativa curta, escaneável e segura, preservando integralmente retenção, WhatsApp/telefone, edição assistida, ativação, exclusão e auditoria.

## Implementação
1. **Estrutura responsiva**
   - Manter a abertura a partir da lista atual.
   - Usar uma folha quase completa no celular e um painel amplo centralizado no desktop, com altura limitada, cabeçalho fixo e somente o conteúdo ativo rolando.
   - Reservar espaço inferior seguro para que nenhuma ação fique atrás da interface do celular.

2. **Cabeçalho de contexto**
   - Aproximar o fechar do título.
   - Exibir nome, segmento, plano, quantidade de agendamentos e situação/risco em poucas linhas.
   - Manter esse contexto visível durante a rolagem.

3. **Três seções claras**
   - **Visão geral:** situação da barbearia, agendamentos, motivos de risco compactos e ações administrativas de ativar/desativar e excluir.
   - **Contato:** telefone/WhatsApp como ações pequenas, histórico compacto e estado vazio curto. “Registrar contato” abre e fecha o formulário sob demanda; ação final será “Salvar contato”.
   - **Suporte:** explicação explícita, formulário e histórico já existentes, sem misturar dados comerciais. Preservar o motivo obrigatório e toda auditoria.

4. **Segurança de edição**
   - Detectar alterações operacionais no formulário de suporte.
   - Antes de salvar mudanças em plano, loja, serviços, profissionais ou produtos, pedir confirmação clara no próprio fluxo.
   - Não alterar funções, permissões, banco ou contratos existentes.

5. **Refino visual**
   - Reduzir bordas, caixas, alturas de campos e espaços verticais.
   - Usar os componentes e tokens atuais do Cortaí.
   - Garantir uma ação principal por seção e controles legíveis por toque.

## Validação
- Conferir abertura, troca de seções, fechamento, formulário de contato e edição de suporte sem efetivar alterações em dados.
- Inspecionar visualmente em 390px e 1280px.
- Rodar TypeScript, lint dirigido, testes e conferir o build automático.
- Não publicar.
