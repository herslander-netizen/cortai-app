# Atualização visual completa do Cortaí

## Objetivo
Aplicar a identidade streetwear + barbearia + tecnologia em todo o produto, preservando layouts, navegação, hierarquia, URLs, regras, dados e integrações existentes.

## Direção visual
- Base em preto `#0E0E0E`, off-white `#F5F4F0` e carvão, com verde-limão `#C8F43C` usado apenas em ações e destaques.
- Títulos e marca com tipografia condensada; textos funcionais permanecem em sans-serif limpa.
- Textura urbana discreta apenas em áreas de marca e comunicação, nunca sobre conteúdo operacional.
- Cards, botões e campos mantêm tamanhos e estrutura atuais, recebendo acabamento mais técnico, sóbrio e consistente.

## Implementação
1. **Sistema visual central**
   - Atualizar tokens globais de cor, tipografia, borda, sombra, foco, estados e superfícies.
   - Preservar cores semânticas próprias dos estados da agenda.
   - Consolidar estados hover, active, focus e disabled nos componentes compartilhados.

2. **Marca e PWA**
   - Criar logo Cortaí com símbolo C angulado e coroa, em versões para fundo claro e escuro.
   - Atualizar todos os pontos que já usam a marca, além de ícones do aplicativo, favicon e apresentação de instalação.
   - Manter dimensões e pontos de uso atuais para evitar alterações de layout.

3. **Telas públicas e acesso**
   - Aplicar a identidade em início, login, recuperação de acesso, perfil público, agendamento, loja e compartilhamento.
   - Preservar fotos reais existentes; aplicar enquadramento, contraste e tratamento editorial por CSS.

4. **Cliente e operação**
   - Atualizar visual da área do cliente, agenda, painel administrativo, fidelidade, CortAI, suporte e produtos.
   - Usar os componentes compartilhados existentes, sem criar fluxos ou estruturas paralelas.

5. **Revisão**
   - Validar as telas principais em 390px e 1280px, nos modos claro e escuro.
   - Conferir logo, contraste, legibilidade, espaçamento, estados dos controles e ausência de sobreposição.
   - Validar a compilação sem alterar banco, autenticação ou integrações.

## Limites
- Nenhuma mudança em regras de negócio, dados, permissões, banco, WhatsApp, pagamentos ou rotas.
- Nenhuma remoção de funcionalidade.
- Nenhuma substituição de fotos cadastradas por imagens genéricas.
