# Rentix - Frontend autenticado com JWT

## Onde colocar os arquivos

Copie os arquivos para dentro do projeto frontend:

```txt
rentix/
 ├── app/
 ├── components/
 ├── context/
 └── services/
```

## Variável de ambiente

Crie ou atualize o arquivo `.env.local` na raiz do frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Rodar frontend

```bash
npm run dev
```

## Fluxo

1. A tela de login chama `POST /autenticacao/login`.
2. O token JWT é salvo em `localStorage`.
3. O usuário é salvo em `localStorage`.
4. O usuário é redirecionado para `/dashboard`.
5. A página `/dashboard` usa `PrivateRoute`.
6. Se não houver token, volta para `/`.

## Atenção

Se você já tem uma tela `app/page.tsx` visualmente pronta, não substitua direto.
Use a lógica de `useAuth()` deste pacote dentro da sua tela atual para preservar o layout já aprovado.
