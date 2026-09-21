# Estrutura do Projeto

Este documento descreve a organização principal do IronCore Frontend.

O projeto usa Angular standalone e mantém responsabilidades transversais e visuais separadas:

- `core`: autenticação, tema, HTTP, interceptor e guard globais.
- `features`: páginas e fluxos funcionais de autenticação, início e perfil.
- `shared`: componentes reutilizáveis de interação e feedback.
- `layout`: application shell e estrutura visual persistente.

## Estrutura Geral

```plaintext
.
├── README.md
├── LICENSE
├── package.json
├── package-lock.json
├── angular.json
├── public
├── docs
└── src
```

## Documentação

```plaintext
docs
├── README.md
├── architecture
│   └── README.md
├── project-structure
│   └── README.md
└── releases
    ├── README.md
    ├── v0.1.0
    │    └── README.md
    └── v0.2.0
        └── README.md
```

## Código Principal

```plaintext
src/app
├── app.config.ts
├── app.html
├── app.routes.ts
├── app.scss
├── app.spec.ts
├── app.ts
├── core
│   ├── auth
│   ├── guards
│   ├── http
│   ├── interceptors
│   └── theme
├── features
│   ├── auth
│   │   ├── first-access
│   │   └── login
│   ├── home
│   └── profile
│       └── change-password
├── layout
│   ├── app-shell
│   ├── header
│   └── sidebar
└── shared
    └── components
        ├── button
        ├── dialog
        ├── empty-state
        ├── energy-background
        ├── input
        ├── loading
        └── toast
```

## Estilos e Environments

```plaintext
src
├── environments
│   ├── environment.development.ts
│   └── environment.ts
├── styles
│   ├── _material-theme.scss
│   ├── _palette.scss
│   ├── _responsive.scss
│   ├── _themes.scss
│   └── _tokens.scss
├── index.html
├── main.ts
└── styles.scss
```

## Testes

```plaintext
src/app
├── app.spec.ts
├── core
│   ├── auth
│   ├── guards
│   ├── http
│   ├── interceptors
│   └── theme
├── features
│   ├── auth
│   ├── home
│   └── profile
├── layout
│   ├── app-shell
│   ├── header
│   └── sidebar
└── shared/components
    ├── button
    ├── dialog
    ├── empty-state
    ├── energy-background
    ├── input
    ├── loading
    └── toast
```

## Regra de Leitura

- `core` contém infraestrutura única e transversal, sem regras de uma tela ou domínio.
- `shared` contém componentes reutilizáveis e não depende de features.
- `layout` contém a estrutura visual comum e não deve abrigar regras de negócio.
- `features` contém fluxos funcionais e pode usar APIs públicas de `core` e componentes de `shared`, sem acessar detalhes internos de outra feature.
- As rotas públicas são `/login` e `/first-access`. A área protegida monta o application shell e contém as páginas de início, perfil e alteração de senha.

<p align="right"><a href="../README.md">Voltar para a documentação técnica</a></p>
