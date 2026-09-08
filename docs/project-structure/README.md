# Estrutura do Projeto

Este documento descreve a organização principal do IronCore Frontend.

O projeto usa Angular standalone e mantém responsabilidades transversais e visuais separadas:

- `core`: autenticação, HTTP, interceptor e guard globais.
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
    └── v0.1.0
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
│   └── interceptors
├── layout
│   ├── app-shell
│   ├── header
│   └── sidebar
└── shared
    └── components
        ├── button
        ├── dialog
        ├── empty-state
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
│   └── interceptors
├── layout
│   ├── app-shell
│   ├── header
│   └── sidebar
└── shared/components
    ├── button
    ├── dialog
    ├── empty-state
    ├── input
    ├── loading
    └── toast
```

## Regra de Leitura

- `core` contém infraestrutura única e transversal, sem regras de uma tela ou domínio.
- `shared` contém componentes reutilizáveis e não depende de features.
- `layout` contém a estrutura visual comum e não deve abrigar regras de negócio.
- Não há diretório `features` nesta release. Ele será criado com a primeira responsabilidade funcional concreta.
- Rotas públicas, rotas protegidas e páginas funcionais ainda não existem; a rota atual apenas compõe o application shell.

<p align="right"><a href="../README.md">Voltar para a documentação técnica</a></p>
