# Consolidar identidade e segmentação do Cortaí

## Objetivo
Registrar o Cortaí como produto principal de gestão e tecnologia e impedir que conteúdo de barbearia apareça em negócios de outros segmentos de Beleza. Preservar a experiência específica de barbearia quando o tenant estiver explicitamente nesse segmento.

## Fonte única e compatibilidade
- Tratar `tenants.segmento`, normalizado por `src/lib/segmentos.ts`, como a única fonte do contexto do negócio.
- Manter os valores e contratos persistidos atuais; não criar schema, tabela ou motor paralelo.
- Quando o segmento estiver ausente ou inválido na apresentação, usar linguagem neutra de negócio/Beleza em vez de assumir barbearia.
- Manter suporte técnico a registros legados, mas expor na criação apenas os segmentos de Beleza oficialmente ativos. A fixture `/demonstracao` continua contextualizada como barbearia.

## Auditoria e correções
- Revisar interface, SEO, onboarding, painel, agenda, clientes, serviços, profissionais, booking, páginas públicas, branding, CortAI, WhatsApp e notificações.
- Substituir fallbacks, títulos, exemplos, placeholders, empty states, ícones e assets específicos de barbearia quando usados globalmente.
- Fazer componentes compartilhados consumirem o vocabulário e os exemplos já centralizados em `segmentos.ts`, com fallback neutro.
- Preservar textos personalizados pelo tenant e textos operacionais legítimos de barbearia.
- Garantir que prompts e mensagens automáticas recebam o segmento real; sem segmento, usar “negócio”, “profissional”, “serviço” e “atendimento”.
- Condicionar imagens específicas de barbearia ao segmento; fora dele, usar marca Cortaí, asset neutro de Beleza ou asset do próprio tenant.

## Identidade institucional
- Registrar em `AGENTS.md` e `roadmap.md`: Cortaí é a marca principal; segmentos ativos pertencem a Beleza; barbearia é uma aplicação; paleta azul-marinho + azul/ciano + rosa/magenta + branco; assinatura “Simplifica. Conecta. Cresce.”; logo atual e “í” proprietário são preservados.
- Alinhar apenas textos institucionais claramente contraditórios. Não mudar o visual nem conteúdo contextual específico de um segmento.
- Não reintroduzir verde, dourado ou Barlow por documentação antiga.

## Validação
- Adicionar testes para fallback neutro e para ao menos um segmento não barbearia já suportado, além de preservar os testes de barbearia.
- Validar `/demonstracao` como barbearia e usar configuração segura existente de Salão/Estética para o caminho não barbearia, sem criar credenciais ou misturar dados.
- Conferir em 390×844 e 1280px as superfícies disponíveis: onboarding, painel, agenda, clientes, serviços, profissionais, booking/página pública, branding e CortAI; verificar claro/escuro quando acessível.
- Rodar busca global final e classificar ocorrências restantes como contextual legítima, fixture/demonstração ou nome técnico legado.
- Rodar typecheck, lint, todos os testes e build; revisar logs de execução e compilação.

## Limites
- Sem publicação, alterações destrutivas, mudanças de RLS/RBAC, dados reais ou identidade visual.
- Nomes técnicos e rotas legadas como `/barbeiro` podem permanecer por compatibilidade quando não são texto exibido ao usuário.
- Se a validação de outro segmento exigir alterar um tenant real, ela ficará documentada em vez de ser feita.
