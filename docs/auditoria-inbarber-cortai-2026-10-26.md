# Auditoria InBarber → Cortaí

**Data:** 26/10/2026  
**Arquivo analisado:** InBarber.apk  
**Escopo:** leitura estática do APK, revisão de materiais públicos e comparação com o código do Cortaí na branch cloudflare-workers-migration-2026-10-13.

## Evidência direta do APK

- Pacote Android: com.inbarberapp.schedule.twa; evidência de aplicação centrada em web/TWA.
- Componentes relacionados a widget: SchedulerWidgetReceiver e componentes Android Glance.
- Permissão e referências a seleção de contatos: READ_CONTACTS e componentes de Contact Picker.
- Integração de notificações: referências ao Firebase Cloud Messaging.
- Não foi feita execução autenticada em aparelho/emulador; a análise de telas internas e funcionamento em tempo real permanece limitada.

## Comparação com o Cortaí

| Área | Estado no Cortaí | Resultado |
|---|---|---|
| Agenda, timeline, lista e semana | Já existe | Não duplicar |
| Página pública, layouts, temas e chat | Já existe | Não duplicar |
| Produtos e estoque | Cadastro, loja e alerta de estoque baixo | Não duplicar |
| Caixa, receitas e ganhos extras | Já existe | Melhorar acesso aos dados existentes |
| Comissão e fidelidade | Já existe | Não duplicar |
| WhatsApp e lembretes | Já existe | Priorizar confiabilidade e estados de envio |
| Seleção de contatos do Android | Não foi localizada integração equivalente no código web | Implementar como melhoria progressiva com fallback |
| Widget nativo na tela inicial | Não há projeto Android no repositório | Exige camada Android, autenticação segura e distribuição próprias |

## Decisões de implementação

1. Selecionar apenas um contato por gesto explícito, solicitando somente nome e telefone. Em navegadores sem Contact Picker API, manter busca e cadastro manual funcionais.
2. Ao importar um contato, pesquisar primeiro pelo telefone ou nome para permitir escolher uma ficha existente antes de criar uma nova.
3. Acrescentar a opção financeira “Hoje”, calculada com início e fim do dia no fuso do negócio, sem alterar as fontes existentes do financeiro.
4. Não tocar na interface visual da Agenda nesta etapa: o projeto protege alterações gerais nessa tela.
5. Especificar o widget separadamente, porque o Cortaí atual não possui projeto Android nativo.

## Limitações

A auditoria não prova que todos os recursos promocionados do InBarber funcionem hoje ou estejam disponíveis em todos os planos. Os elementos internos do APK são evidência de código presente, não prova de que todos os fluxos foram testados. Nenhuma alteração foi feita em produção ou em bancos de dados.
