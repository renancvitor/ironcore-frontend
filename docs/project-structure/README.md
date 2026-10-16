# Estrutura do Projeto

Este documento descreve a organização principal do IronCore Frontend.

O projeto usa Angular standalone e mantém responsabilidades transversais e visuais separadas:

- `core`: autenticação, tema, HTTP, interceptor e guard globais.
- `features`: páginas e fluxos funcionais de autenticação, avaliação corporal, exercícios, início e perfil.
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
│   ├── README.md
│   └── mobile-actions.md
├── body-metrics
│   └── README.md
├── card-resume
│   └── README.md
├── exercises
│   └── README.md
├── project-structure
│   └── README.md
└── releases
    ├── README.md
    ├── v0.1.0
    │    └── README.md
    ├── v0.2.0
    │    └── README.md
    ├── v0.3.0
    │    └── README.md
    └── v0.4.0
        └── README.md
```

## Código Principal

```plaintext
src/app
├── app.config.ts
├── app.component.html
├── app.component.scss
├── app.component.spec.ts
├── app.component.ts
├── app.routes.ts
├── app.routes.spec.ts
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
│   ├── body-metrics
│   │   ├── body-metrics.models.ts
│   │   ├── body-metrics.service.ts
│   │   ├── body-metrics.form.ts
│   │   ├── body-metrics.validators.ts
│   │   ├── create
│   │   ├── details
│   │   ├── form-fields
│   │   ├── history
│   │   ├── latest
│   │   └── progress
│   │       ├── body-metrics-progress-chart.utils.ts
│   │       ├── chart
│   │       └── changes
│   ├── exercise
│   │   ├── exercise.models.ts
│   │   ├── exercise.service.ts
│   │   └── catalog
│   │       ├── exercise-catalog.component.ts
│   │       ├── exercise-catalog.component.html
│   │       ├── exercise-catalog.component.scss
│   │       ├── exercise-catalog-state.service.ts
│   │       └── detail
│   ├── home
│   │   └── components
│   │       ├── body-metrics-latest-card
│   │       ├── body-metrics-progress-card
│   │       ├── in-progress-workouts-card
│   │       └── summary-card
│   └── profile
│       └── change-password
├── layout
│   ├── app-shell
│   ├── header
│   └── sidebar
└── shared
    ├── config
    │   └── paginator-intl-pt-br.ts
    ├── models
    │   └── page-result.model.ts
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
│   ├── _actions.scss
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
├── app.component.spec.ts
├── app.routes.spec.ts
├── core
│   ├── auth
│   ├── guards
│   ├── http
│   ├── interceptors
│   └── theme
├── features
│   ├── auth
│   ├── body-metrics
│   │   ├── body-metrics.service.spec.ts
│   │   ├── body-metrics-edit.integration.spec.ts
│   │   ├── create
│   │   ├── details
│   │   ├── form-fields
│   │   ├── history
│   │   ├── latest
│   │   └── progress
│   │       ├── body-metrics-progress-navigation.integration.spec.ts
│   │       ├── chart
│   │       └── changes
│   ├── exercise
│   │   ├── exercise.service.spec.ts
│   │   └── catalog
│   │       ├── exercise-catalog.component.spec.ts
│   │       ├── exercise-catalog.integration.spec.ts
│   │       └── detail
│   │           └── exercise-detail.component.spec.ts
│   ├── home
│   └── profile
├── layout
│   ├── app-shell
│   ├── header
│   └── sidebar
└── shared
    ├── config
    └── components
        ├── button
        ├── dialog
        ├── empty-state
        ├── energy-background
        ├── input
        ├── loading
        └── toast
```

`app.routes.spec.ts` inclui integração de cadastro e exclusão com o Router e consultas HTTP simuladas. A integração de edição fica na feature; `progress/body-metrics-progress-navigation.integration.spec.ts` verifica o retorno contextual da evolução. Componentes de gráficos, comparativo, campos e cards possuem testes próximos às suas implementações, incluindo o resumo real de evolução na Home. Os testes do frontend não operam uma API real.

Na feature de exercícios, os testes verificam contratos HTTP, formulário, filtros aplicados, paginação, restauração do contexto, dependência entre grupo e subgrupo, estados e detalhe com músculos-alvo. `exercise-catalog.integration.spec.ts` integra componente, formulário, paginator e serviço com respostas HTTP simuladas. Rotas, header e sidebar também verificam o acesso ao catálogo.

## Regra de Leitura

- `core` contém infraestrutura única e transversal, sem regras de uma tela ou domínio.
- `shared` contém componentes reutilizáveis e não depende de features.
- `layout` contém a estrutura visual comum e não deve abrigar regras de negócio.
- `features` contém fluxos funcionais e pode usar APIs públicas de `core` e componentes de `shared`, sem acessar detalhes internos de outra feature.
- A Home compõe a API pública de apresentação de `BodyMetricsLatestComponent` por `contentTemplate`; consulta e estados permanecem na feature de avaliação corporal.
- `BodyMetricsProgressCardComponent` usa o serviço e o período padrão de avaliação corporal para consultar `/progress/changes`. O card mantém estado local e abre a mesma página de evolução com `from=home`; o histórico usa `from=history`. A página completa concentra o retorno contextual e o fallback para histórico.
- Serviço, modelos, formulário, campos e transformações corporais permanecem em `features/body-metrics`. Responsabilidades e contratos estão em [Avaliação corporal](../body-metrics/README.md).
- Serviço, modelos, estado da busca e telas do catálogo permanecem em `features/exercise`. `ExerciseCatalogStateService` guarda filtros aplicados e paginação em memória; as respostas HTTP pertencem às telas. Responsabilidades e contratos estão em [Catálogo de Exercícios](../exercises/README.md).
- O AppShell fornece a configuração compartilhada do paginator em português. `_actions.scss` concentra a disposição mobile de ações, conforme [Disposição de ações no mobile](../architecture/mobile-actions.md).
- As rotas públicas são `/login` e `/first-access`. A área protegida monta o application shell e contém início, perfil, alteração de senha, avaliação corporal e as rotas `/exercises` e `/exercises/:id`, com componentes carregados sob demanda.
- [Home e Cards-Resumo](../card-resume/README.md) reúne o comportamento entregue e identifica separadamente as diretrizes de produto para integrações futuras. Releases preservam registros históricos próprios.

<p align="right"><a href="../README.md">Voltar para a documentação técnica</a></p>
