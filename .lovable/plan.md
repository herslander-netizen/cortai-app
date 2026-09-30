# Auditoria técnica de pré-lançamento do Cortaí

## Objetivo
Produzir um diagnóstico completo, somente leitura, dos riscos para produção, sem alterar arquivos, banco, configurações ou publicação.

## Escopo da auditoria
1. **Qualidade de entrega**
   - Verificar TypeScript, lint, testes existentes, status do build, erros de execução, console e rede.
   - Separar falhas que bloqueiam o lançamento de avisos de manutenção e formatação.

2. **Autenticação, autorização e banco**
   - Revisar login, retorno social, troca de sessão, saída e proteção das áreas administrativa, equipe e cliente.
   - Conferir RLS, permissões públicas, funções `SECURITY DEFINER`, RBAC e isolamento entre negócios.
   - Confirmar cada alerta do analisador do banco antes de classificá-lo como vulnerabilidade.

3. **Agenda e jornada do cliente**
   - Auditar disponibilidade, fuso, antecedência, intervalo, duração, profissional compatível e trava contra sobreposição.
   - Percorrer agendamento tradicional e Cortaí Chat, confirmação, conflito, cancelamento, remarcação, lista de espera e persistência no aparelho.
   - Comparar as validações da tela, servidor e banco para identificar divergências e condições de corrida.

4. **Operação e experiência**
   - Validar onboarding, página pública, painel, clientes, atendimento, estados de carregamento/vazio/erro e navegação.
   - Examinar as telas em 390 px e 1280 px, claro e escuro, incluindo teclado, foco, áreas seguras e sobreposições.

5. **Financeiro e integrações**
   - Revisar caixa, comandas, pagamentos, comissões, estornos, fidelidade e consistência transacional.
   - Auditar Asaas: segredo, assinatura do webhook, idempotência, concorrência, retries, reconciliação e suspensão de plano.
   - Auditar notificações e Secretária Cortaí sem reabrir atendimento livre no WhatsApp.

6. **PWA e performance**
   - Conferir manifesto, ícones, instalação, atualização obrigatória, cache e comportamento offline declarado.
   - Revisar consultas mais frequentes/lentas, carregamento de imagens, tamanho dos pacotes e chamadas duplicadas.

## Validação prática
- Usar somente a conta e o tenant de demonstração para fluxos autenticados.
- Evitar confirmações, pagamentos ou qualquer ação que crie/edite dados; quando uma gravação for indispensável para provar um risco, registrar como não testada em vez de executá-la.
- Não publicar e não executar migrações.

## Entrega
Relatório objetivo contendo, para cada achado:
- prioridade P0, P1 ou P2;
- evidência concreta e local afetado;
- impacto e forma de reprodução;
- correção recomendada;
- indicação de correção segura imediata ou mudança que exige decisão/migração.

O relatório também distinguirá itens confirmados, riscos condicionais e verificações que não puderam ser concluídas sem alterar dados ou usar serviços externos.
