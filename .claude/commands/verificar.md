---
description: Roda typecheck, testes, lint e build e mostra só o que é novo em relação ao estado conhecido
argument-hint: "[arquivos opcionais para o lint, ex.: src/lib/x.ts]"
---

Verifique o estado do código do Cortaí e relate **apenas o que é novo** em relação à base conhecida abaixo. Não altere nenhum arquivo.

## Passos

1. Se `node_modules` não existir, instale com `npm install --no-package-lock --no-audit --no-fund`. O `bun.lock` aponta para um cache privado do Lovable e dá erro 403 fora dele; nunca use `bun install` aqui.
2. Rode, nesta ordem, guardando a saída em arquivos no diretório temporário da sessão:
   - `npx tsc --noEmit -p .`
   - `npx vitest run`
   - `npx eslint .` (se `$ARGUMENTS` trouxer arquivos, rode o lint só neles; se a pasta tiver commits novos, rode também nos arquivos de `git diff --name-only origin/main...HEAD`)
   - `npx vite build`
3. Compare com a base conhecida (09/10/2026, commit `7ed1c6a`):
   - **tsc:** 0 erros.
   - **vitest:** só os 8 testes de `src/lib/whatsapp/lembretes-numeros.test.ts` falham. Eles usam datas fixas que venceram, e o código está certo. Qualquer outra falha é nova.
   - **eslint:** 5.042 problemas, sendo 4.825 de Prettier e 184 de `no-explicit-any`. Para arquivos que você mudou, a meta é zero problemas **novos**; compare com o mesmo arquivo em `origin/main`.
   - **build:** passa.
4. Se algum número da base mudou para melhor, diga, e sugira atualizar a seção "Estado da verificação" de `docs/mapa-do-codigo.md`.

## Resposta

Uma tabela curta (verificação, resultado, novo ou conhecido) e, se houver algo novo, a lista dos arquivos e das linhas. Diga com todas as letras o que passou e o que falhou.

## Nunca

- Rodar `prettier --write .` ou `eslint --fix .` no repositório inteiro: mexeria em quase todos os arquivos e geraria um commit enorme que sincroniza com o Lovable.
- Apagar ou pular teste para ficar verde.
- Enviar nada para a `main`.
