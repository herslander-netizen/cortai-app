# Nova identidade visual completa do Cortaí

## Resultado
Aplicar em todo o produto a identidade Cortaí com grafite como modo padrão, creme no modo claro, azul para interação e rosa apenas para marca e atenção. Tipografia, logos PNG, layouts, fluxos, regras e integrações permanecem iguais.

## Aplicação
1. **Sistema visual global**
   - Substituir os tokens centrais pelos valores Grafite/Creme fornecidos e registrar os novos tokens rosa.
   - Manter intactas as cores semânticas da agenda, exceto os dois ajustes de contraste pedidos.
   - Atualizar superfícies, foco, carregamento, avisos, modais, sheets, 404 e autenticação para consumir apenas tokens.

2. **Uso controlado do rosa**
   - Aplicar rosa somente em rótulos de marca, aviso do próximo cliente, linha do agora, CortAI, contadores/novidades e barras de carregamento.
   - Manter botões, links, seleção e navegação ativa em azul; erros continuam destrutivos.

3. **Modo e identidades**
   - Tornar o modo escuro o padrão com a nova chave local `cortai-modo-v2`, mantendo Claro/Escuro/Sistema como escolhas.
   - Renomear “Moderno” para “Cortaí”, remover “Blue” e atualizar as amostras; Indigo, Copper e Clássico permanecem monocromáticos e acessíveis.
   - Atualizar cor do navegador e manifesto instalável.

4. **Cliente e página pública**
   - Fazer a personalização do cliente ignorar cores vazias/dourado legado e, quando houver cor própria, ajustar somente azul principal, acento e contraste do botão.
   - Adicionar os presets “Cortaí” e “Cortaí Creme” à página pública, sem alterar configurações já salvas.
   - Aplicar a mesma regra de personalização à loja pública e demais pontos equivalentes.

5. **Dados e registros**
   - Criar migração segura para normalizar identidade `blue`, restaurar o tenant `teste`, mudar `modo` auto para escuro quando a coluna existir e deixar `cor_primaria` sem padrão para novos cadastros.
   - Atualizar a regra de identidade no AGENTS.md e registrar “Nova identidade visual” nas novidades.

6. **Limpeza e validação**
   - Remover cores antigas e classes fixas de UI em todo o código, preservando presets públicos, WhatsApp e QR preto/branco.
   - Revisar gráficos para azul/rosa/estados.
   - Testar em 390px nos modos escuro e claro: landing, login, agenda, cliente público, página pública, admin, CortAI, cookies e avisos; conferir modo inicial, theme-color, contraste, ausência de verde-lima e compilação.
   - Inspecionar os PNGs existentes e informar se algum ainda contém verde-lima, sem gerar novas imagens.

## Limites
- Nenhuma mudança de layout, tipografia, logo, funcionalidade, regra de negócio, autenticação ou integração.
- Configurações já salvas da página pública permanecem inalteradas.
