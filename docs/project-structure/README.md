# Estrutura do Projeto

Este documento descreve a organização efetivamente presente no IronCore Frontend e as convenções que orientam seu crescimento.

## Estrutura atual

```plaintext
src/
├── app/
│   ├── core/
│   │   ├── auth/
│   │   ├── guards/
│   │   ├── http/
│   │   └── interceptors/
│   ├── app.config.ts
│   ├── app.html
│   ├── app.routes.ts
│   ├── app.scss
│   ├── app.spec.ts
│   └── app.ts
├── environments/
│   ├── environment.development.ts
│   └── environment.ts
├── index.html
├── main.ts
└── styles.scss

docs/
├── architecture/
│   └── README.md
├── project-structure/
│   └── README.md
└── README.md

public/                   # assets estáticos
```

## Responsabilidades atuais

### Raiz de `app`

- `app.ts`, `app.html` e `app.scss` compõem o componente raiz standalone.
- `app.config.ts` centraliza providers globais e a restauração de sessão na inicialização.
- `app.routes.ts` é o ponto único de declaração de rotas; a lista está vazia enquanto não há páginas implementadas.

### `core`

`core` reúne recursos únicos e transversais à aplicação:

- `auth`: contratos, serviço de autenticação e estado reativo da sessão;
- `http`: configuração do `HttpClient` e token da URL base da API;
- `interceptors`: comportamento HTTP aplicado transversalmente;
- `guards`: proteção reutilizável de rotas autenticadas.

Uma feature não deve ser adicionada a `core` apenas por usar HTTP ou exigir autenticação. O critério é ser infraestrutura global, e não ser uma necessidade de negócio.

### `environments`

Contém somente configuração não sensível por ambiente. A URL base da API é fornecida ao restante da aplicação pelo token `API_BASE_URL`; consumidores não devem importar o arquivo de environment diretamente.

## Convenções de crescimento

Os diretórios abaixo ainda não existem. Eles devem ser criados apenas junto da primeira responsabilidade concreta.

### `features`

Organizará funcionalidades por contexto, mantendo próximos os componentes, serviços e modelos específicos do fluxo. Exemplos futuros possíveis são `auth`, `person`, `body-metrics`, `exercise-catalog` e `workout-planning`.

Uma feature pode utilizar APIs públicas de `core` e estruturas de `shared`, mas não deve importar detalhes internos de outra feature.

### `shared`

Concentrará componentes, diretivas, pipes, validators e modelos que sejam comprovadamente genéricos e reutilizados por mais de um contexto. Modelos de negócio não pertencem a `shared` apenas por serem usados em mais de uma tela.

### `layout`

Receberá a estrutura visual persistente quando ela for implementada, como shell, cabeçalho, barra lateral e navegação. Não deve conter regras de negócio de features.

## Regras de dependência

- `features` podem consumir `core` e `shared` por suas APIs públicas.
- `layout` pode consumir `core` e `shared`.
- `shared` não deve depender de `features`.
- `core` não deve depender de `features` nem de `layout`.
- Uma feature não deve acessar detalhes internos de outra feature.
- Código deve permanecer próximo da responsabilidade que o utiliza até existir uma necessidade real de reutilização.

<p align="right"><a href="../README.md">Voltar para o índice de documentação</a></p>
