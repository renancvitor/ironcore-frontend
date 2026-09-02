# Estrutura do Projeto

Este documento descreve a organização inicial do IronCore Frontend.

A aplicação adota uma arquitetura modular orientada a features, com separação clara entre funcionalidades de negócio, infraestrutura global, estruturas reutilizáveis e composição visual.

A estrutura deve permanecer simples no estágio atual do projeto e evoluir conforme necessidades reais surgirem. Pastas e subdivisões não devem ser criadas apenas para antecipar uma possível necessidade futura.

## Estrutura principal

```plaintext
src/app/
├── core/
├── features/
├── layout/
├── shared/
├── app.config.ts
├── app.routes.ts
├── app.ts
├── app.html
└── app.scss
```

As responsabilidades principais são:

- `core`: infraestrutura e comportamentos globais da aplicação.
- `features`: funcionalidades organizadas por contexto funcional.
- `layout`: estrutura visual permanente e navegação principal.
- `shared`: componentes e recursos reutilizáveis por diferentes partes da aplicação.

---

## Features

A pasta `features` é o eixo principal de organização funcional do frontend.

Cada feature deve concentrar o código relacionado à sua própria funcionalidade, evitando espalhar serviços, modelos e componentes de negócio em diretórios globais.

Estrutura inicial planejada:

```plaintext
features/
├── auth/
├── body-metrics/
├── exercise-catalog/
│   ├── activity-types/
│   ├── equipment-types/
│   ├── exercises/
│   ├── muscle-groups/
│   ├── muscle-subgroups/
│   └── muscle-targets/
├── person/
├── workout-planning/
│   ├── training-goals/
│   ├── workout-cycles/
│   ├── workout-days/
│   └── workout-activities/
└── user/
```

### Regras de organização

- A estrutura do frontend deve refletir fluxos e contextos funcionais, e não copiar diretamente a estrutura interna do backend.
- Conceitos importantes do domínio devem manter fronteiras próprias mesmo quando agrupados dentro de uma feature maior.
- Uma feature não deve depender diretamente da implementação interna de outra feature.
- Código específico de uma feature deve permanecer dentro dela.
- Subpastas devem ser criadas conforme a necessidade real de organização.

Exemplo:

```plaintext
exercise-catalog/
├── exercises/
├── muscle-groups/
├── muscle-subgroups/
└── ...
```

Embora todos façam parte do catálogo de exercícios, cada conceito permanece separado para reduzir acoplamento e facilitar manutenção.

### Organização interna de uma subfeature

Não é necessário criar, por padrão, pastas genéricas como `models`, `services` e `components`.

Quando a quantidade de arquivos for pequena, eles podem permanecer diretamente na raiz da subfeature:

```plaintext
muscle-groups/
├── muscle-group.model.ts
├── muscle-group.service.ts
└── ...
```

Subpastas devem surgir quando houver um agrupamento funcional real, por exemplo:

```plaintext
muscle-groups/
├── muscle-group.model.ts
├── muscle-group.service.ts
├── grid/
├── form/
└── dialog/
```

Componentes Angular com template e estilos próprios podem naturalmente utilizar uma pasta dedicada.

---

## Shared

A pasta `shared` contém estruturas reutilizáveis por diferentes partes da aplicação e que não possuem vínculo forte com uma feature específica.

Estrutura planejada:

```plaintext
shared/
├── components/
│   ├── button/
│   ├── field/
│   ├── loading/
│   ├── empty-state/
│   └── confirmation-dialog/
├── directives/
├── pipes/
├── validators/
└── models/
```

Exemplos apropriados para `shared`:

- botões padronizados do IronCore;
- campos reutilizáveis;
- loading;
- empty state;
- dialogs genéricos de confirmação;
- directives reutilizáveis;
- pipes;
- validators;
- modelos realmente genéricos.

Exemplos de modelos que podem pertencer a `shared`:

```plaintext
page-result.ts
select-option.ts
```

Modelos de negócio não devem ser colocados em `shared`.

Exemplos que devem permanecer nas respectivas features:

```plaintext
muscle-group.model.ts
body-metrics.model.ts
workout-cycle.model.ts
```

`shared` não deve se tornar um diretório genérico para código sem localização definida.

---

## Core

A pasta `core` contém responsabilidades globais e estruturais da aplicação.

São recursos que normalmente existem uma única vez e sustentam o funcionamento geral do frontend.

Estrutura planejada:

```plaintext
core/
├── auth/
├── http/
├── guards/
├── interceptors/
├── config/
└── services/
```

Responsabilidades possíveis:

- infraestrutura global de autenticação;
- estado da sessão;
- integração técnica com autenticação do backend;
- configuração HTTP;
- interceptors;
- guards de rota;
- configuração da API;
- base URL;
- tratamento global de erros;
- serviços realmente globais da aplicação.

Serviços de negócio não pertencem ao `core`.

Exemplos que devem permanecer dentro das features:

```plaintext
body-metrics.service.ts
exercise.service.ts
workout-cycle.service.ts
```

### Core auth x Feature auth

A existência de `auth` em `core` e `features` representa responsabilidades diferentes.

```plaintext
core/auth/
```

Responsável pela infraestrutura global de autenticação, como:

- sessão;
- estado do usuário autenticado;
- integração técnica com autenticação;
- suporte a guards e interceptors.

```plaintext
features/auth/
```

Responsável pelos fluxos e interfaces de autenticação, como:

- login;
- troca inicial de senha;
- páginas e componentes relacionados ao acesso.

---

## Layout

A pasta `layout` contém a estrutura visual permanente da aplicação.

Ela representa a "casca" do sistema, responsável por organizar a navegação e a área onde as features são exibidas.

Estrutura planejada:

```plaintext
layout/
├── shell/
├── header/
├── sidebar/
└── navigation/
```

Exemplo conceitual:

```plaintext
┌─────────────────────────────────────────┐
│ Header                                  │
├────────────┬────────────────────────────┤
│ Sidebar    │ Conteúdo da rota atual     │
│            │                            │
│            │ <router-outlet>            │
└────────────┴────────────────────────────┘
```

O `layout` deve concentrar elementos estruturais da interface, sem absorver regras de negócio das features.

---

## Regras de dependência

A organização deve respeitar as seguintes regras:

- `features` podem utilizar estruturas de `shared`.
- `features` podem utilizar infraestrutura pública disponibilizada por `core`.
- `layout` pode utilizar estruturas de `shared` e recursos globais de `core`.
- `shared` não deve depender de features.
- `core` não deve depender de features.
- uma feature não deve importar diretamente detalhes internos de outra feature.
- código específico de domínio ou de fluxo funcional deve permanecer dentro da feature correspondente.

Quando duas features precisarem de uma estrutura comum, essa estrutura só deve ser movida para `shared` se for realmente genérica e reutilizável.

---

## Princípios de evolução

A estrutura documentada representa a direção arquitetural do frontend, não uma obrigação de criar todos os diretórios imediatamente.

Regras de evolução:

- não criar pastas vazias apenas para representar a arquitetura planejada;
- não antecipar componentes, serviços ou modelos ainda inexistentes;
- criar novas subdivisões somente quando houver necessidade real;
- manter a estrutura simples enquanto o projeto for pequeno;
- preservar fronteiras funcionais conforme o projeto crescer;
- preferir coesão dentro das features em vez de diretórios técnicos globais;
- revisar esta documentação quando a arquitetura evoluir de forma relevante.

A estrutura deve servir como guia para novas implementações, mantendo o frontend previsível, navegável e sustentável.
