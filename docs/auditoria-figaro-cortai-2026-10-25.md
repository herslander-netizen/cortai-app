# Auditoria comparativa Figaro/Figaroo → Cortaí

**Data:** 25/10/2026  
**Branch avaliada:** `cloudflare-workers-migration-2026-10-13`  
**APK de referência:** `Figaroo_reunido.apk`  
**SHA-256 conferida localmente:** `9fd5763de71cedf734f7565fb3f868dbb776a254a941eebad3a23dac1cc98528`  
**Versão Android documentada:** `versionCode 136`, `versionName 1.0.0`, pacote `com.figaroo.android`.

## Resumo executivo

A revisão confirma que o Cortaí já recuperou uma parte relevante da base visual Figaro: tokens e primitivos compartilhados, transições em algumas rotas, painel de horários recolhível, fluxo de conclusão animada do onboarding, botão principal e elementos de Layout & Tema. O maior valor agora está em fechar lacunas funcionais e de jornada específicas, em vez de aplicar uma reformulação visual genérica.

Esta é uma auditoria estática do APK, da documentação técnica derivada dele, das capturas de onboarding enviadas e do código/documentação do Cortaí. **Não é uma declaração de paridade completa em execução**: a validação manual no celular (390 px, claro/escuro e redução de movimento) ainda é necessária, e o APK não foi executado em emulador nesta rodada.

## Achados confirmados

| Prioridade | Área | Evidência do Figaro | Estado verificado no Cortaí | Ação recomendada |
|---|---|---|---|---|
| P0 | Localidades/unidades | `apk/7-modulos.md` §6: lista e criação em quatro etapas — detalhes, endereço com CEP, horário semanal e comodidades; painel com mapa, horários especiais e equipe disponível. As capturas fornecidas mostram os mesmos passos. | Não foi localizada uma rota/modelo equivalente de Localidades. O cadastro de negócio contém endereço textual e o editor de horários opera por negócio. A especificação de animações registra P3/L1 como ausente/parcial. | Projetar um modelo aditivo de localidades e seus vínculos antes de criar a interface. Confirmar impacto em equipe, horários, agendamentos e página pública; ensaiar migração na prévia. Não apresentar uma tela de múltiplas unidades que não persista os dados. |
| P1 | Boas-vindas/checklist | `apk/7-modulos.md` §2: cartão de boas-vindas, três passos principais (localidades, equipe, serviços), estados concluído/atual/não iniciado e “Configurar depois”. `apk/8-inventario-de-animacoes.md` C9: marcador animado e detalhes expansíveis. | `PrimeirosPassos.tsx` é um checklist posterior à conclusão com quatro ações úteis; a descrição expansível não existia. O fluxo de configuração principal do Cortaí inclui passos adicionais que não devem ser removidos só para copiar a contagem do Figaro. | Implementada nesta rodada a expansão/recolhimento de descrições nos quatro itens existentes, preservando rotas, marcação de conclusão, ação “Pular” e movimento reduzido. A equivalência do onboarding inicial de três passos continua parcial por depender de Localidades. |
| P1 | Horários semanais | Captura do Figaro: cartões compactos por dia, estado aberto/fechado e faixa de horário; painel de horários especiais descrito em `apk/7-modulos.md`. | `EditorDeHorarios.tsx` já permite abrir/fechar dias, editar início/fim e configurar intervalos; o grupo semanal é recolhível e usa `MOLA`. | Conferir hierarquia visual, quebras em 390 px, foco/toque, modo claro/escuro e redução de movimento. Não declarar cópia exata do fluxo antes da conferência manual. |
| P1 | Cadastros em etapas | `apk/6-animacoes.md` e `apk/8-inventario-de-animacoes.md` N6/N7: criação de serviço, profissional, cliente e localidade com transição direcional de 220 ms, esmaecimento e título animado. | O onboarding geral usa `EtapasAnimadas`, mas o inventário ainda marca vários cadastros individuais como sem recuperação das transições de cadastro. | Aplicar os primitivos compartilhados por rota, em lotes pequenos, com testes de avanço/retorno e preservação do rascunho. |
| P1 | Padrão visual | `apk/1-design-system.md`, `docs/ordem-padrao-figaro.md` e `docs/contrato-de-design.md`. | Já há tokens/primitivos e teste de guarda `estilo-figaro.test.ts`; alguns componentes possuem estilos históricos e precisam de conferência no dispositivo. | Continuar usando os primitivos e tokens existentes. Não adicionar hex, CSS ad hoc ou uma segunda linguagem visual. |
| P2 | Painéis de itens | `apk/7-modulos.md`: padrão recorrente Lista → Painel do item → Editores por seção; estado vazio instrutivo, erro com “Tentar novamente”, desativar separado de excluir. | A matriz de recuperação identifica diferenças em módulos como serviços, equipe e clientes; várias rotas atuais são listas/editores, mas a equivalência funcional varia por módulo. | Comparar e melhorar por módulo sem duplicar regras de negócio, permissões ou fontes de dados. Exigir confirmação para ações destrutivas conforme os componentes já existentes. |
| P2 | Localização por CEP e horários especiais | `apk/7-modulos.md` §6 e captura de Endereço. | O onboarding atual aceita endereço como texto; não foi confirmada uma etapa específica de CEP nem uma entidade de horário especial vinculada a uma localidade. | Implementar somente depois de aprovar o modelo persistente, a consulta de CEP e suas validações. |
| P2 | Validação de movimento | `apk/5-navegacao-e-transicoes.md`, `apk/6-animacoes.md` e inventário `apk/8`. | Diversos movimentos já têm testes automatizados, mas a documentação mantém a validação visual no celular como pendente. | Testar 390 px e 1280 px, claro/escuro, redução de movimento e navegação de ida/volta. O CI sozinho não comprova fidelidade visual. |

## Alteração entregue nesta rodada

- `src/components/onboarding/PrimeirosPassos.tsx`: adicionados detalhes expansíveis e recolhíveis aos itens existentes. Cada descrição tem seu botão acessível (`aria-expanded`/`aria-controls`), transição de altura + opacidade pelas molas oficiais do Figaro e respeito a `prefers-reduced-motion`.
- `src/components/onboarding/PrimeirosPassos.test.tsx`: cobertura para expansão/recolhimento, região acessível e preservação do link de navegação.
- Não houve alteração de banco, regra de negócio, permissão, integração ou site principal nesta rodada.

## Plano de execução priorizado

1. Validar por CI a mudança do checklist e corrigir toda falha antes de considerar a prévia pronta.
2. Planejar a capacidade de Localidades: inspecionar o schema completo e todos os pontos que assumem endereço/horário únicos por negócio; definir chaves, permissões e migração estritamente aditiva. Aplicar apenas no banco de teste após o fluxo de migração autorizado e ensaiado.
3. Recuperar a jornada inicial de três passos do Figaro com estados reais, preservando as configurações adicionais do Cortaí como tarefas secundárias — sem fingir que Localidades existe antes de persistir.
4. Recuperar N6/N7 nos cadastros de serviço, equipe e cliente, com testes de movimento, volta e rascunho.
5. Fazer conferência manual na prévia, no Android, incluindo claro/escuro e redução de movimento; registrar capturas e diferenças restantes.

## Limites desta auditoria

- Os símbolos e recursos empacotados confirmam a presença dos módulos no APK, mas não garantem o comportamento em execução.
- A hash coincide com a referência já registrada no repositório; não há APK anterior independente nesta sessão para afirmar diferenças incrementais entre versões.
- Nenhuma tela deve ser marcada como “igual ao Figaro” sem validação visual e funcional correspondente.
- A principal produção, o banco real e a branch `main` não foram alterados.
