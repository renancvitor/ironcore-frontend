# v0.2.0 - Autenticação, sessão e conta

## Resumo

`v0.2.0` registra a primeira entrega funcional do IronCore Frontend. Ela consolida os fluxos de autenticação e conta implementados sobre a foundation da `v0.1.0`: rotas públicas e protegidas, sessão por cookie, login, primeiro acesso, perfil, edição de dados pessoais, alteração de nickname e senha, logout e alternância de tema.

Esta não é uma release de MVP completo de evolução física ou planejamento de treinos.

## Principais Mudanças

- Rotas públicas para `/login` e `/first-access` e área autenticada no `AppShell`, protegida por `authGuard`.
- Login por `POST /api/auth/login`, com validação, loading, feedback de erro e atualização do estado de sessão em memória.
- Primeiro acesso para troca obrigatória da senha inicial por `POST /api/users/change-initial-password`.
- Restauração da sessão no bootstrap por `GET /api/users/me`, inclusive para entrada direta em rota protegida com sessão válida.
- Página de perfil com dados separados de `User` e `Person`, carregados por `GET /api/users/me/person`.
- Alteração de nickname por `PUT /api/users/me/change-nickname`, refletida imediatamente no estado de sessão.
- Edição de nome, sexo e data de nascimento por `PATCH /api/users/me/person`.
- Alteração normal de senha por `POST /api/users/me/change-password`.
- Logout no header por `POST /api/auth/logout`, limpeza do estado local após sucesso e retorno para `/login`.
- Alternância entre temas claro e escuro no header, com persistência local da preferência.
- Testes unitários para rotas, sessão, tema, serviços e componentes dos fluxos entregues.

## Notas Técnicas

- `AuthStateService` mantém `AuthenticatedUser` em um `signal` apenas em memória. O token eventualmente retornado pelo login não é persistido nem usado como credencial pelo frontend.
- O interceptor usa `withCredentials` somente para chamadas identificadas como da API. A sessão depende do cookie gerenciado pelo backend; o frontend não manipula cookies `HttpOnly`.
- `provideAppInitializer` chama `GET /api/users/me` antes da inicialização. Um `401` nessa restauração representa ausência de sessão e não impede o bootstrap.
- `authGuard` está aplicado à área autenticada e redireciona para `/login` quando não há usuário no estado local.
- A obrigatoriedade de troca da senha inicial é identificada pela resposta do login. O guard não faz uma verificação adicional de `mustChangePassword`.
- A rota de primeiro acesso é pública e, após sucesso, retorna para `/login`; ela não estabelece uma sessão autenticada no frontend.
- `User` concentra e-mail e nickname; `Person` concentra nome, sexo e data de nascimento. Os modelos e endpoints de atualização permanecem separados.
- O tema escuro é o padrão. `ThemeService` aplica o tema em `data-theme` e persiste a preferência em `localStorage` com a chave `Ironcore-theme`.

## Limitações Conhecidas

- Se logout falhar com erro diferente de `401`, o estado local é preservado e a tela apresenta feedback de erro.
- A autenticação depende da disponibilidade e da configuração de cookies/CORS do backend.

## Não Incluído Nesta Release

- Métricas corporais, catálogo de exercícios, ciclos, sessões ou histórico de treino.
- Recuperação de senha, autorização por roles ou permissões e gestão avançada de conta.
- Deploy, publicação de artefatos, criação de tag ou publicação de GitHub Release.

## Validação Local

Para executar os testes locais:

```bash
npm test -- --watch=false
```

Para validar o build de produção:

```bash
npm run build
```

<p align="right"><a href="../README.md">Voltar para releases</a></p>
