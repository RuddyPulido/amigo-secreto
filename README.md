# Amigo Secreto

App web mobile-first para organizar o amigo secreto de um grupo de amigos. Funciona 100% no
navegador, sem backend, e é publicado como site estático no GitHub Pages.

## Funcionalidades

- Aba **Sorteio** com um combo das pessoas que ainda não sortearam e o botão de sorteio.
- Aba **Configurações** com cadastro de famílias (nome), cadastro de pessoas (nome + família) e a
  regra global **Permitir sorteio entre familiares**.
- Sorteio sempre concluível: cada pessoa sorteia exatamente uma vez, todos são sorteados
  exatamente uma vez, ninguém tira a si mesmo e, com a regra desligada, ninguém tira alguém
  da própria família.
- Revelação privada: o resultado só aparece após um toque, pode ser ocultado e a lista
  "Quem já sorteou" permite reexibir com confirmação.
- Persistência no `localStorage` e botão para reiniciar o sorteio mantendo os cadastros.
- Layout mobile-first em pt-BR, com foco em acessibilidade e safe areas do iOS.

## Como o sorteio funciona

O sorteio é tratado como um emparelhamento perfeito entre quem ainda vai sortear e quem ainda
pode ser sorteado. A cada clique, o app só oferece alvos que preservam a possibilidade de
concluir todos os sorteios restantes. Assim, independentemente da ordem em que as pessoas
sorteiam, o sorteio nunca trava no meio e termina válido.

- O auto-sorteio é sempre proibido.
- Com a regra entre familiares **desligada**, pares da mesma família não são permitidos. Nesse
  caso, a maior família não pode ter mais da metade dos participantes; se tiver, o app explica o
  problema e como resolver.
- Com a regra **ligada**, pessoas da mesma família podem se sortear, mas ninguém sorteia a si
  mesmo(a).
- A visibilidade da regra vale para todo o grupo e alterá-la durante um sorteio reinicia o
  sorteio, mediante confirmação.

## Stack

- React 19 + TypeScript (strict)
- Vite 8
- Tailwind CSS 4
- Vitest (testes do algoritmo, persistência e reducer)
- lucide-react (ícones)
- GitHub Actions + GitHub Pages

## Rodando localmente

Requisito: Node 22 (o projeto tem `.nvmrc`).

```bash
# nesta máquina o Node está no nvm e pode não estar no PATH:
export PATH="$HOME/.nvm/versions/node/v22.18.0/bin:$PATH"
# ou: source ~/.nvm/nvm.sh && nvm use

npm install
npm run dev
```

Abra `http://localhost:5173`. Para testar no celular na mesma rede:

```bash
npm run dev -- --host
```

### Testes e build

```bash
npm test        # Vitest
npm run lint    # ESLint
npm run build   # typecheck + bundle em dist/
npm run preview # serve o build localmente
```

## Dados e privacidade

Os cadastros e os sorteios ficam no `localStorage` **deste navegador/aparelho**, na chave
`amigo-secreto:state:v1`. Não há login, sincronização entre celulares nem backup.

- Limpar os dados do site apaga famílias, pessoas e resultados.
- Use uma aba por vez; abrir duas abas pode sobrescrever o estado.
- O resultado é protegido contra olhares casuais (diálogo, ocultação e confirmação para reexibir),
  não contra alguém que inspecione o `localStorage` pelas ferramentas do navegador.
- O app é estático e público no GitHub Pages; os dados não são enviados para lugar nenhum.

## Publicação no GitHub Pages

O deploy é feito pelo workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) a
cada push na branch `main`. O workflow roda testes, faz o build e publica `dist/` via GitHub
Actions.

Configuração inicial (uma vez):

```bash
brew install gh
gh auth login --hostname github.com --git-protocol ssh --web

OWNER=$(gh api user --jq .login)
git init -b main
git add -A
git commit -m "feat: app amigo secreto"
gh repo create amigo-secreto --public --source=. --remote=origin
gh api -X POST "repos/$OWNER/amigo-secreto/pages" -f build_type=workflow
git push -u origin main
```

Se o POST de Pages falhar porque o repositório ainda está vazio, faça o push primeiro, habilite
Pages e rode o workflow com `gh workflow run deploy.yml`. Também é possível habilitar em
**Settings → Pages → Source: GitHub Actions**.

URL esperada: `https://<login>.github.io/amigo-secreto/`.

No celular, use o menu do navegador e escolha **Adicionar à tela de início** para abrir como um
atalho de tela cheia.

## Estrutura

```
src/
  lib/        algoritmo de sorteio, matching, persistência, validação, RNG
  store/      reducer e hook de estado persistido
  components/ nav, diálogo, switch, progresso
  features/   telas de Sorteio e Configurações
```
