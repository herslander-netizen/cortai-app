# Auditoria somente leitura — Secretária Cortaí e personalização do Chat

## Objetivo
Entregar um inventário preciso do que existe hoje, sem alterar código, banco, configurações ou dados.

## Escopo verificado
1. Nome exibido da recepção digital.
2. Foto ou ícone de perfil.
3. Exibição e possibilidade de ocultar a marca Cortaí.
4. Fundo personalizado da conversa.
5. Cores dos balões de mensagem.
6. Persistência por negócio e aplicação no agendamento público.

## Como o relatório será organizado
- Separar claramente **Secretária Cortaí no WhatsApp** de **Cortaí Chat no agendamento público**.
- Para cada item, classificar como **completo**, **parcial** ou **ausente**.
- Informar os controles já visíveis no painel.
- Rastrear os campos validados, a gravação por tenant, a publicação e a leitura no link público.
- Listar arquivos, componentes, funções, tabelas e campos envolvidos.
- Indicar exatamente o que falta para cada requisito, sem propor redesign ou executar correções.

## Evidências já confirmadas
- A personalização do Cortaí Chat fica dentro da configuração publicada da página do tenant.
- O painel já possui controle para nome da recepção e três opções de cor de destaque.
- O modelo de configuração aceita uma URL de avatar, mas o painel atual não oferece controle para preenchê-la.
- A capa e a logo do negócio são reaproveitadas no Chat público.
- A assinatura Cortaí no cabeçalho do Chat está fixa no componente e não usa o controle de assinatura da página pública.
- A Secretária do WhatsApp possui configuração operacional própria e não compartilha essas opções visuais com o Chat público.

## Restrições
- Nenhuma edição em arquivos do produto.
- Nenhuma migração ou escrita no banco.
- Nenhuma alteração de dados reais.
- Nenhuma publicação.
