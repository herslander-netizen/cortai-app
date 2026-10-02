# Redesenho do Modo Foco

## Objetivo
Transformar o Modo Foco em uma tela silenciosa de atendimento: mostrar somente emergências operacionais, exibir a ficha privada do cliente em etiquetas úteis e nunca revelar valores financeiros.

## Implementação
1. **Emergências do atendimento**
   - Criar uma função pura que compara a agenda atual com a anterior e produz apenas: sem internet, mudança do cliente atual/próximo e atraso do próximo.
   - Priorizar e limitar a dois alertas, com identificadores estáveis, dispensa por “Entendi” e uma única vibração somente para mudança relevante.
   - Remover sino, “Ao vivo”, fila, sugestão de vaga e qualquer valor do Modo Foco.

2. **Silêncio enquanto o Foco estiver ativo**
   - Marcar o estado do Foco globalmente enquanto a tela estiver montada.
   - Ocultar banners, guia, assistente e avisos de instalação/notificações; impedir som e vibração espontâneos.
   - Preservar apenas mensagens curtas resultantes de ações diretas do profissional.
   - Contabilizar avisos guardados e, ao sair, mostrar uma única linha que abre o sino.

3. **Preferências privadas do cliente**
   - Estender a tabela existente de clientes com um objeto estruturado e validação no banco, mantendo a política de acesso já isolada por negócio.
   - Validar novamente no servidor enums, limites e ausência de HTML.
   - Reaproveitar a ficha existente na agenda e na folha do cliente; não criar ficha paralela.

4. **Ficha no Modo Foco**
   - Mostrar “Atenção” quando existir e etiquetas compactas apenas dos campos preenchidos.
   - Respeitar o modo discreto e manter a observação livre em até duas linhas, abrindo a ficha completa ao toque.
   - Após finalizar, oferecer somente preferências ainda vazias, salvando a cada toque com desfazer, sem interferir na cobrança.

5. **Qualidade**
   - Cobrir alertas, prioridade, limite, dispensa, privacidade, renderização seletiva e validação.
   - Atualizar as regras permanentes da Agenda.
   - Rodar tipos, lint, testes e build. Não publicar.

## Detalhes técnicos
- A comparação da agenda anterior ficará isolada do componente visual.
- A preferência será um campo `jsonb` em `clientes`, protegido pela RLS existente e por validação no banco e no servidor.
- O estado global do Foco será um pequeno store com `useSyncExternalStore`, evitando acoplamento entre avisos globais e a Agenda.
