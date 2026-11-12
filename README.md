# Amigo Secreto

App web mobile-first para o amigo secreto de um grupo de amigos. Cada pessoa entra no **próprio
celular** com nome e senha, sorteia o próprio amigo secreto e só vê o próprio resultado.

> Esta é a versão **multiusuário** (branch `feature/multiusuario-whatsapp`). A versão de um
> celular único, publicada em https://ruddypulido.github.io/amigo-secreto/, continua na `main`.

## Como funciona

- **Organizador (master)** — usuário fixo `admin`. Não participa do sorteio, só administra:
  cadastra famílias e pessoas (com o telefone do WhatsApp), define as regras, **libera** o
  sorteio e pode **reiniciá-lo**. Vê quem já sorteou, **nunca** quem tirou quem.
- **Convite por WhatsApp** — ao cadastrar uma pessoa, o organizador toca em **Enviar convite**:
  abre o WhatsApp com a mensagem e o link prontos (`wa.me`). Ao abrir o link, a pessoa cria uma
  senha e já entra.
- **Pessoas** — veem uma única tela: aguardando o organizador liberar, o botão **Sortear** quando
  liberado e, depois, **Ver quem eu tirei** (escondido por padrão).
- **Esqueci a senha** — a pessoa informa o nome; o pedido aparece no painel do organizador,
  que reenvia o convite. A nova senha **não altera o resultado do sorteio**.
- **Regras** (globais): *Permitir sorteio entre familiares* e *Criança apenas sorteia criança*.
  O sorteio sempre fecha: cada pessoa sorteia uma vez, ninguém tira a si mesmo, e as regras são
  respeitadas em qualquer ordem. Duas pessoas sorteando ao mesmo tempo não colidem (transação).

## Stack

React 19 + TypeScript (strict) · Vite 8 · Tailwind 4 · Vitest · **Firebase Realtime Database**
(sem servidor próprio; o site continua estático no GitHub Pages).

## Rodando localmente (sem conta no Firebase)

Requisitos: Node 22 e Java 21+ (o emulador do Firebase usa Java).

```bash
export PATH="$HOME/.nvm/versions/node/v22.18.0/bin:$PATH"   # se o Node não estiver no PATH
npm install

npm run emulator     # terminal 1: Realtime Database local (127.0.0.1:9000)
npm run dev:local    # terminal 2: app em http://127.0.0.1:5173
```

Login do organizador: usuário `admin` (a senha é a combinada com o dono do projeto).

Para simular várias pessoas, use janelas anônimas/perfis diferentes do navegador: cada uma tem o
próprio login. Os dados do emulador ficam só na memória (somem ao parar o emulador). O emulador
só é acessível neste computador — para testar em celulares reais é preciso um projeto Firebase
de verdade (abaixo).

### Testes

```bash
npm test         # Vitest (lógica do sorteio, convites, senhas, administração, concorrência)
npm run lint
npm run build
```

## Usando um projeto Firebase real (para publicar)

1. Crie um projeto no Firebase e um **Realtime Database**.
2. Em *Regras*, use as de `database.rules.json` (acesso aberto — o app é para amigos, sem
   segurança forte).
3. Copie `.env.example` para `.env.production` e preencha `VITE_FIREBASE_*` e `VITE_PUBLIC_URL`
   (a URL pública usada nos convites).
4. `npm run build` e publique `dist/` (o workflow do GitHub Actions faz isso a cada push na `main`;
   as variáveis `VITE_*` precisam estar disponíveis no build).

## Limites conhecidos (de propósito, dado o uso entre amigos)

- Não há segurança forte: o banco tem regras abertas e a senha do organizador é conferida no
  navegador, então alguém curioso com conhecimento técnico poderia ler os dados. A interface
  esconde os resultados de quem não deve vê-los.
- O envio do WhatsApp é **manual** (o organizador toca em enviar). Envio automático exigiria a API
  oficial do WhatsApp, com conta empresarial e custo.
- O login é pelo **nome** cadastrado (sem diferenciar acentos e maiúsculas; nomes são únicos e "admin" é reservado). O telefone serve só para enviar o convite e pode ser repetido entre pessoas (ex.: crianças). Telefones devem ser cadastrados com DDD (o código do país 55 é adicionado automaticamente;
  use `+` para números de outros países).
