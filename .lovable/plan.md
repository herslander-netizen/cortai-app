# Conheça o Cortaí conversando com o Cortaí

## Implementação
- Substituir integralmente `/apresentacao` por uma experiência pública guiada em oito momentos: entrada, segmento, Agenda, Modo Foco, Clientes, Secretária, Caixa e convite final.
- Usar uma única narrativa interativa, com escolha temporária de segmento apenas na sessão e demonstrações visuais derivadas dos componentes e estados reais do produto, sem gravar dados nem executar ações operacionais.
- Manter cabeçalho discreto, progresso, Voltar, Sair e avanço por URL para que o botão do navegador funcione naturalmente; preservar rolagem e gestos no celular.
- Reutilizar a identidade, os controles, a assinatura e o padrão visual da Secretária Cortaí. A mini conversa será demonstrativa e usará os mesmos componentes visuais do chat, sem duplicar o motor de agendamento.
- Conectar os três convites finais aos fluxos comerciais já existentes; se não houver destino adequado, reutilizar a captura pública de interesse existente, sem inventar contato.
- Manter a página acessível em Admin > Marketing com Abrir, Copiar link, QR Code e compartilhar, aproveitando estruturas já existentes.

## Limites
- Nenhuma mudança em autenticação, isolamento por negócio, banco, disponibilidade, agendamento ou demais regras operacionais.
- Nenhum dado fictício persistente, depoimento, métrica ou promessa inventada.
- A apresentação interna protegida em `/admin/apresentacao` permanece separada.
- Não publicar nesta etapa; a implementação ficará pronta para compartilhamento após publicação autorizada.

## Validação
- Conferir entrada, avanço, retorno, saída e botão do navegador em aproximadamente 390 px e 1280 px.
- Conferir contraste e legibilidade de todos os textos sobre fundo claro.
- Rodar TypeScript, testes disponíveis, lint dos arquivos alterados e build.
