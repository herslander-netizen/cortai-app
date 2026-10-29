# Proposta técnica — widget Android do Flow

**Origem:** auditoria comparativa InBarber × Flow, 26/10/2026  
**Status:** especificação; nenhum aplicativo Android ou widget nativo foi criado nesta etapa.

## O que foi confirmado

A estrutura do APK InBarber contém classes relacionadas a um widget Android (SchedulerWidgetReceiver e componentes Glance) e seleção de contatos. Já o repositório Flow analisado possui aplicação web/PWA, mas não contém pasta Android, Kotlin/Java, configuração Gradle ou projeto Capacitor/TWA.

Um widget Android real não pode ser entregue apenas por JSX/React ou por uma PWA. Ele precisa de um pacote Android instalado, registro do provedor de widget no manifesto, layouts de widget, um mecanismo de atualização e um contrato de autenticação para obter dados com segurança.

## Experiência sugerida

- **Tamanho compacto:** próximo atendimento, hora e serviço; toque abre o atendimento no Flow.
- **Tamanho expandido:** próximos três atendimentos e botão “Abrir agenda”.
- **Privacidade padrão:** não mostrar telefone, observações privadas ou nome completo na tela bloqueada; deixar o proprietário escolher se o nome do cliente aparece.
- **Estado offline:** mostrar a última atualização e um atalho para abrir o aplicativo; não apresentar dados antigos como atuais.
- **Acessibilidade:** alvo de toque amplo, texto legível, contraste dos temas Figaro e atualização compatível com economia de bateria.

## Arquitetura recomendada

1. Definir pacote Android oficial, origem web canônica, método de distribuição e chave de assinatura. O domínio cortai.dev ainda não está apontado; não assumir configuração de Digital Asset Links.
2. Criar uma camada Android mínima com AppWidgetProvider/RemoteViews ou Jetpack Glance. Se for usada uma Trusted Web Activity, o widget continuará sendo código Android separado da página web.
3. Definir um fluxo de autenticação aprovado. O widget não deve embutir chaves Supabase de serviço, tokens permanentes em texto simples nem confiar em tenant_id recebido do cliente.
4. Expor/consumir somente dados mínimos autorizados para o usuário autenticado, com isolamento por negócio e permissões de equipe. Nunca permitir consulta pública dos atendimentos.
5. Atualizar com política compatível com limites do Android (por exemplo, atualização periódica via WorkManager, ações de atualização e abertura do app). Não prometer atualização instantânea via polling frequente.
6. Testar em Android real: widget redimensionável, login expirado, troca de negócio, profissional sem permissão, ausência de rede, dados desatualizados, logout, modo escuro, tamanhos de fonte e remoção do widget.

## Critério de aceite

O widget só pode ser considerado entregue depois de existir um APK assinado/instalável e demonstrar, em Android real, que mostra apenas os próximos atendimentos autorizados, abre a rota correta e deixa de expor dados após logout ou perda de permissão.

**Bloqueio atual:** o repositório não possui estrutura Android nem identidade de assinatura. A especificação não adiciona custo, não altera o backend e não finge que a PWA por si só fornece um widget nativo.
