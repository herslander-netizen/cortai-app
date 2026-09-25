# CORTAÍ V3.0 — Auditoria visual sistêmica

## Objetivo
Produzir um diagnóstico do código e das telas atuais, sem alterar a aplicação, regras, dados ou integrações. O relatório classificará cada achado como 🟢 manter, 🟡 refinar, 🔵 padronizar, 🔴 substituir ou ⚫ remover.

## Escopo da auditoria
1. **Base visual e componentes**
   - Mapear tokens de identidade e modo, Manrope, cores semânticas, espaçamentos, raios, bordas, sombras e tipografia.
   - Inventariar Button, Card, StatusBadge, campos, avisos, loading, vazio, erro, navegação, modais e folhas inferiores.
   - Identificar componentes compartilhados, estilos artesanais e versões concorrentes da mesma solução.

2. **Telas e fluxos**
   - Auditar splash, login, onboarding, Hoje, Visão Casa, Agenda, Lista, Timeline, atendimento manual, clientes, serviços, profissionais, equipe, loja, estoque, financeiro, planos, perfil, configurações, página pública e notificações.
   - Avaliar hierarquia, densidade, quantidade de CTAs, clareza dos estados e consistência entre telas.

3. **Agenda e ações operacionais**
   - Comparar tesoura/FAB, barra de ação, Ações rápidas, Ações da agenda e entradas pelo menu.
   - Verificar duplicações de apresentação sem propor novo motor ou fluxo paralelo.
   - Auditar os estados Agendado, Confirmado, Na cadeira, Finalizado, Cancelado, Encaixe e Bloqueado.
   - Avaliar clareza de “Cliente avulso”, tempo decorrido e variações de cards/linhas da Agenda.

4. **Responsividade e desempenho visual**
   - Verificar 360, 375, 390 e 412 px, tablet e desktop.
   - Procurar cortes, sobreposição, scroll horizontal, problemas de teclado móvel e safe area.
   - Mapear animações contínuas, blur, gradientes, sombras e elementos flutuantes concorrentes.

5. **Design System V3.0 proposto**
   - Consolidar uma especificação compartilhada para spacing 4/8/12/16/24/32/40, raios, bordas, sombras, cores semânticas, tipografia, botões, badges, cards, sheets, modais, navegação e estados de interface.
   - Preservar Modern como identidade padrão, Classic como alternativa e modos Light/Dark/System independentes da identidade.

## Entrega
O diagnóstico será organizado em:
1. resumo executivo;
2. inventário de componentes;
3. duplicações;
4. inconsistências por tela;
5. hierarquia;
6. spacing, raios e sombras;
7. cores e tipografia;
8. navegação e interação;
9. responsividade e performance;
10. Design System V3.0 proposto;
11. Agenda;
12. Ações rápidas/Ações da agenda/FAB;
13. Planos;
14. ordem segura de refatoração;
15. riscos;
16. itens que não devem ser alterados.

## Limites técnicos
- Nenhuma alteração em código da aplicação nesta etapa.
- Nenhuma mudança em banco, autenticação, permissões, RLS/RPCs, regras de agendamento, financeiro, planos, WhatsApp, CortAI ou ALVO IA.
- Nenhum componente V2/New paralelo: toda recomendação partirá dos componentes existentes.
- Toda afirmação sobre o estado atual será vinculada a evidência do código ou da tela real.
