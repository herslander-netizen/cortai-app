# Interface Cortaí V3.0

## Resultado
Unificar a interface em um sistema visual mobile-first, mantendo funcionalidades, dados, permissões e fluxos atuais. Identidade e modo passam a ser escolhas independentes.

## Implementação
1. **Tokens e temas**
   - Definir tokens semânticos para Moderno, Blue, Indigo, Copper e Clássico.
   - Fazer Moderno ser o padrão, com a paleta verde fornecida e sem dourado.
   - Separar identidade de Claro, Escuro e Sistema, com persistência local e resposta automática ao sistema.
   - Manter `--gold` apenas como alias de compatibilidade para o destaque da identidade ativa, sem ouro no Moderno.

2. **Controles de aparência**
   - Substituir o interruptor atual por seletores de Identidade e Modo nas telas de conta existentes.
   - Aplicar a escolha no documento inteiro, sem chamadas ao backend nem alterações de permissão.
   - Atualizar a cor do navegador conforme o modo ativo.

3. **Base visual e acessibilidade**
   - Padronizar Manrope, contraste AA, foco, divisores, superfícies, botões e campos.
   - Garantir alvos principais de 48 px e ações principais de 56 px quando fixadas no rodapé.
   - Padronizar ícones Lucide com traço 1.75 e preservar estados com ícone, texto e cor.
   - Remover gradientes e efeitos de desfoque da interface operacional.

4. **Marca oficial e áreas compartilhadas**
   - Fazer logos oficiais escolherem automaticamente a versão clara ou escura conforme o fundo.
   - Preservar o símbolo oficial no ícone do aplicativo, favicon e PWA.
   - Aplicar o mesmo sistema às áreas de gestão e administração sem mudar a identidade própria das páginas públicas de cada barbearia.

5. **Validação**
   - Conferir modo Claro, Escuro e Sistema no celular e no desktop.
   - Conferir Moderno e Clássico, ações principais, contraste, logos e ausência de gradientes.
   - Validar build automático e fluxos principais sem alterar regras de negócio.

## Decisões visuais
- Moderno usa exatamente: verde `#19C37D`, verde profundo `#102A22`, grafite `#1E2221`, cinza `#59615E`, off-white `#F4F5F2`, branco `#FFFFFF` e borda `#E5E7E6`.
- Clássico preserva `#111110` e `#C9A96A`.
- Blue, Indigo e Copper usarão o mesmo sistema semântico e contraste do Moderno, variando somente a família de destaque.
- Nenhuma migração ou mudança funcional será feita.
