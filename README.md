<h1 align="center">
  IronCore Frontend
</h1>
<p align="center">
  <img src="https://img.shields.io/badge/Status-In%20Progress-yellow" width="150" height="30" />
</p>

---

<h2 align="center">🔗 Backend</h2>

O backend deste sistema está em um repositório separado:

- 🌐 [IronCore Backend](https://github.com/renancvitor/ironcore-backend)

Consulte-o para compreender as regras de domínio, os contratos REST implementados, o modelo de autenticação e o estado atual da API.

---

### 📊 Progresso do Projeto

Planejamento, tarefas e histórico de evolução disponíveis no GitHub Projects:

- 🗺️ [IronCore — Roadmap](https://github.com/users/renancvitor/projects/3)

---

<h2 id="sumario" align="center">Sumário</h2>

- [Visão Geral do Projeto](#visao-geral-do-projeto)
- [Status Atual do Projeto](#status-atual-do-projeto)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Ferramentas Utilizadas](#ferramentas-utilizadas)
- [Princípios de Integração com o Backend](#principios-de-integracao-com-o-backend)
- [Documentação Técnica](#documentacao-tecnica)
- [Escopo da Primeira Versão](#escopo-da-primeira-versao)
- [Funcionalidades Disponíveis](#funcionalidades-disponiveis)
- [Testes Automatizados](#testes-automatizados)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Como Executar o Projeto](#como-executar-o-projeto)
- [Deploy](#deploy)
- [Contribuições](#contribuicoes)
- [Contato](#contato)
- [Licença](#licenca)

---

<h2 id="visao-geral-do-projeto" align="center">Visão Geral do Projeto</h2>

<b>IronCore Frontend</b> é a interface web do ecossistema IronCore. Construído com <b>[Angular](https://angular.dev/)</b>, oferece a camada de apresentação para os fluxos disponibilizados pelo [IronCore Backend](https://github.com/renancvitor/ironcore-backend).

A aplicação permite acompanhar evolução física, consultar o catálogo de exercícios e organizar ciclos de treino. Registro de sessões executadas e recursos apoiados por IA permanecem como evoluções futuras, fora da v1.0.0.

O frontend não replica regras de domínio. Sua responsabilidade é apresentar informações, orientar a interação, consumir os contratos reais da API e tratar adequadamente os estados de carregamento, sucesso e erro. As validações de domínio, autenticação, autorização e integridade dos dados permanecem sob responsabilidade do backend.

O desenvolvimento do projeto busca consolidar habilidades como:

- 🅰️ Arquitetura de interface com Angular e TypeScript;
- 🎨 Componentização, estilos com SCSS e experiência responsiva;
- 🌐 Consumo consistente de API REST;
- 🧪 Testes automatizados com Vitest;
- ♿ Acessibilidade em elementos e fluxos interativos;
- 🔒 Tratamento responsável de autenticação e dados sensíveis no navegador.

<p align="right"><a href="#sumario">⬆️ Voltar ao sumário</a></p>

---

<h2 id="status-atual-do-projeto" align="center">Status Atual do Projeto</h2>

O <b>IronCore Frontend v1.0.0</b> é a primeira versão funcional e estável da interface e encerra a primeira fase do produto no frontend. Consolida autenticação, conta, avaliação e evolução corporal, catálogo de exercícios e Workout Planning completo, integrados à Home e à navegação global. O registro da release está em [v1.0.0](docs/releases/v1.0.0/README.md); sua preparação documental não implica publicação no GitHub.

### Já existe no projeto

A implantação inicial em produção foi concluída e validada em outubro de 2026. A interface está disponível em [ironcore.dev.br](https://ironcore.dev.br), integrada à API em `https://api.ironcore.dev.br`, com publicação automática pelo Cloudflare Pages. Consulte [Deploy e Produção](docs/deploy/README.md).

- Aplicação Angular 21 configurada com TypeScript e SCSS.
- Rotas públicas para login e primeiro acesso, e rotas protegidas carregadas sob demanda para início, perfil, alteração de senha, avaliação corporal, exercícios e planejamento de treinos.
- Provider HTTP com URL base configurável por environment.
- Fluxos de login, primeiro acesso, logout e restauração de sessão pelo contrato real da API.
- Estado do usuário autenticado em memória, interceptor com `withCredentials` para a API e `authGuard` aplicado às rotas protegidas.
- Perfil com dados separados de `User` e `Person`, edição de nickname e dados pessoais, e alteração de senha.
- Avaliação corporal com cadastro, histórico paginado, detalhe, última avaliação, edição, exclusão, evolução e comparativo integrados ao backend.
- Catálogo de exercícios com classificações auxiliares, busca por nome, filtros combinados, paginação, detalhe e apresentação de músculos-alvo e seus papéis.
- Workout Planning com objetivos ativos da API, catálogo filtrado e paginado, criação/edição de ciclos, composição de dias e atividades, seleção de exercícios, prescrição híbrida, reorder, exclusão e lifecycle conforme status.
- Home com resumos independentes de última avaliação, evolução corporal e planejamento de treinos; o resumo de planejamento prioriza ciclos em andamento, com fallback para não iniciados, até três itens, links individuais e acesso ao catálogo completo.
- Angular Material, design tokens, preferência persistente de tema claro, escuro ou do sistema e breakpoints responsivos centralizados.
- Componentes compartilhados de botão, input, loading, empty state, diálogo de confirmação e toast.
- Application shell com header, sidebar, acesso ao perfil, avaliação corporal, exercícios e planejamento de treinos, logout, preferência de tema, container de conteúdo e `router-outlet` interno.
- Actions mobile compartilhadas, ícones com labels acessíveis e tooltips, além de gráficos e tabelas com rolagem horizontal quando necessária.
- Configuração de build de produção e desenvolvimento.
- Estrutura de testes unitários baseada em Vitest.
- CI no GitHub Actions para build e testes em `main`.
- Deploy automático da `main` pela integração Cloudflare Pages + GitHub, independente do workflow de CI.
- Configuração de formatação com Prettier.
- Documentos de contribuição, código de conduta, segurança e licença.

### Planejado para as próximas etapas

- Registro e histórico de sessões executadas e visualizações de progresso de treino.
- Geração de treino com IA/agent, conforme futuros contratos do backend.
- Métricas de aderência e progresso percentual de ciclos apoiadas em dados reais de execução.
- Evolução dos testes para os novos fluxos de domínio e de interface.
- Documentação técnica complementar conforme novas estruturas e decisões forem implementadas.

O estado acima descreve exclusivamente o que está presente neste repositório. Funcionalidades disponíveis no backend não devem ser interpretadas como funcionalidades já entregues na interface.

<p align="right"><a href="#sumario">⬆️ Voltar ao sumário</a></p>

---

<h2 id="tecnologias-utilizadas" align="center">Tecnologias Utilizadas</h2>

- 🅰️ [Angular 21](https://angular.dev/): framework da aplicação web.
- 🟦 [TypeScript](https://www.typescriptlang.org/): linguagem principal da interface.
- 🔄 [RxJS](https://rxjs.dev/): programação reativa e composição de fluxos assíncronos.
- 🎨 [SCSS](https://sass-lang.com/): estilos da aplicação.
- 🧪 [Vitest](https://vitest.dev/): execução dos testes unitários.
- 📦 [npm](https://www.npmjs.com/): gerenciamento de dependências e scripts do projeto.

<p align="right"><a href="#sumario">⬆️ Voltar ao sumário</a></p>

---

<h2 id="ferramentas-utilizadas" align="center">Ferramentas Utilizadas</h2>

- 💻 [Visual Studio Code](https://code.visualstudio.com/): ambiente de desenvolvimento integrado leve e extensível.
- 🅰️ [Angular CLI](https://angular.dev/tools/cli): geração, execução, build e testes da aplicação.
- 📦 [npm](https://www.npmjs.com/): instalação de dependências e execução dos scripts locais.
- 🧹 [Prettier](https://prettier.io/): formatação consistente do código e dos documentos suportados.

<p align="right"><a href="#sumario">⬆️ Voltar ao sumário</a></p>

---

<h2 id="principios-de-integracao-com-o-backend" align="center">Princípios de Integração com o Backend</h2>

O frontend está integrado ao [IronCore Backend](https://github.com/renancvitor/ironcore-backend), respeitando os contratos e o modelo de segurança definidos pela API.

Essa integração segue os seguintes princípios:

- utilizar contratos reais da API, sem criar representações divergentes do domínio;
- manter validações de domínio, autenticação, autorização e ownership como responsabilidade do backend;
- antecipar validações conhecidas apenas para melhorar a experiência do usuário;
- tratar estados de carregamento e falhas de comunicação de forma compreensível;
- não expor detalhes técnicos desnecessários ao usuário;
- não armazenar credenciais, tokens ou dados sensíveis de forma insegura no navegador.

Os mecanismos implementados de comunicação HTTP, sessão e proteção de rotas estão documentados em [Arquitetura](docs/architecture/README.md). O interceptor trata globalmente respostas `401`; os demais erros dos fluxos são apresentados pelas telas. Os contratos utilizados estão em [Avaliação corporal](docs/body-metrics/README.md), [Catálogo de Exercícios](docs/exercises/README.md) e [Workout Planning](docs/workout-planning/README.md).

<p align="right"><a href="#sumario">⬆️ Voltar ao sumário</a></p>

---

<h2 id="documentacao-tecnica" align="center">Documentação Técnica</h2>

A documentação técnica detalhada do projeto está disponível no índice central da pasta [docs](docs/README.md).

Esse índice central reúne os principais documentos sobre arquitetura, estrutura do projeto, módulos funcionais, Home e cards-resumo, padrões responsivos e notas de release. Para o fluxo de ciclos, consulte [Workout Planning](docs/workout-planning/README.md). A primeira fase do frontend está consolidada na [release v1.0.0](docs/releases/v1.0.0/README.md).

<p align="right"><a href="#sumario">⬆️ Voltar ao sumário</a></p>

---

<h2 id="escopo-da-primeira-versao" align="center">Escopo da Primeira Versão</h2>

O escopo funcional da primeira fase está entregue na v1.0.0, incluindo os fluxos abaixo e sua integração à Home.

### Núcleo entregue

- Autenticação e acesso à área protegida conforme o baseline single-user da API.
- Consulta e atualização de dados da pessoa autenticada.
- Registro e consulta de métricas corporais.
- Consulta do catálogo de exercícios.
- Criação, consulta e organização de ciclos de treino.
- Feedbacks de carregamento, erro e sucesso nos fluxos principais.

### Evoluções futuras, fora da v1.0.0

- Registro e histórico de sessões de treino executadas.
- Visualizações de treino.
- Recursos de planejamento de treino apoiados por IA, quando disponibilizados pelo backend.
- Evoluções de acessibilidade, responsividade e experiência de uso baseadas nos fluxos implementados.

<p align="right"><a href="#sumario">⬆️ Voltar ao sumário</a></p>

---

<h2 id="funcionalidades-disponiveis" align="center">Funcionalidades Disponíveis</h2>

As funcionalidades abaixo compõem a [v1.0.0](docs/releases/v1.0.0/README.md). As versões incrementais identificam a origem das entregas e preservam seu próprio registro histórico. Execução e histórico de sessões permanecem explicitamente futuros.

### Acesso e sessão

- Login, logout, proteção de rotas, restauração de sessão e fluxos de troca de senha foram entregues na [v0.2.0](docs/releases/v0.2.0/README.md).
- Evoluções adicionais de tratamento de sessão e autenticação serão realizadas conforme novos contratos forem disponibilizados.

### Pessoa e evolução física

- Consulta e atualização dos dados da pessoa autenticada foram entregues na [v0.2.0](docs/releases/v0.2.0/README.md).
- Cadastro, edição, exclusão, histórico paginado, detalhe e resumo da última avaliação corporal foram entregues na [v0.3.0](docs/releases/v0.3.0/README.md).
- Evolução das medidas, comparativo por período e resumo de evolução na Home foram entregues na [v0.3.0](docs/releases/v0.3.0/README.md), reutilizando a página completa com retorno conforme a origem de acesso.

### Catálogo de exercícios

- Listagem paginada, busca por nome e filtros combinados foram implementados na [v0.4.0](docs/releases/v0.4.0/README.md).
- Classificações auxiliares e dependência entre grupo e subgrupo muscular foram integradas na [v0.4.0](docs/releases/v0.4.0/README.md).
- Detalhe com classificações, músculos-alvo e seus papéis foi implementado na [v0.4.0](docs/releases/v0.4.0/README.md).

### Planejamento de treinos

- Consulta de objetivos ativos da API e catálogo de ciclos com filtros e paginação.
- Criação/edição de ciclos e composição de dias e atividades com exercícios do catálogo existente.
- Seleção contextual múltipla, prevenção de duplicidade por dia e prescrição híbrida combinável.
- Reorder de dias/atividades, exclusão conforme status e lifecycle de início, conclusão e cancelamento.
- Integração à Home e navegação global, com retorno contextual do detalhe; entrega consolidada na [v1.0.0](docs/releases/v1.0.0/README.md).

### Execução e histórico — futuros

- Registro de sessões e atividades executadas, quando esse fluxo for disponibilizado pelo backend.
- Consulta de histórico e resumo de treinos realizados.

### Experiência de uso

- Interface responsiva para telas, formulários, listagens e ações principais.
- Navegação clara e feedback visual para ações concluídas, bloqueadas ou indisponíveis.
- Evolução contínua de acessibilidade nos elementos interativos.

<p align="right"><a href="#sumario">⬆️ Voltar ao sumário</a></p>

---

<h2 id="testes-automatizados" align="center">Testes Automatizados</h2>

O projeto possui testes com Vitest para a foundation e os fluxos de autenticação, conta, avaliação corporal, catálogo de exercícios e Workout Planning: infraestrutura HTTP, rotas, layout, tema, perfil, componentes compartilhados, formulários, gráficos/comparativo, filtros, paginação, músculos-alvo, composição, seleção, prescrição, reorder, lifecycle e resumos da Home. Testes de integração verificam consultas após mutações e navegação contextual. Os testes HTTP usam respostas simuladas e não alteram dados de uma API real. A [validação final da v1.0.0](docs/releases/v1.0.0/README.md#validação-local) registra 699 testes aprovados em 59 arquivos e build de produção sem avisos.

Os testes protegem, quando aplicável:

- estados de carregamento, sucesso, vazio e erro;
- validações de interface;
- comportamento de componentes;
- comunicação de serviços com a API;
- navegação e proteção de rotas;
- regressões relacionadas a acessibilidade que possam ser verificadas de forma automatizada.

Para executar os testes locais:

```bash
npm test -- --watch=false
```

Para validar o build de produção:

```bash
npm run build
```

<p align="right"><a href="#sumario">⬆️ Voltar ao sumário</a></p>

---

<h2 id="estrutura-do-projeto" align="center">Estrutura do Projeto</h2>

A estrutura atual é a base criada pelo Angular CLI, estendida com infraestrutura global, componentes reutilizáveis, layout e features para as responsabilidades funcionais já existentes.

```plaintext
src/
 ├── app/
 │    ├── core/           # autenticação, tema, HTTP, interceptor e guard globais
 │    ├── features/       # autenticação, avaliação corporal, exercícios, treinos, início e perfil
 │    ├── layout/         # application shell, header e sidebar
 │    ├── shared/         # componentes reutilizáveis de interação e feedback
 │    ├── app.config.ts   # providers globais da aplicação
 │    ├── app.component.html # template raiz
 │    ├── app.routes.ts   # rotas públicas e área protegida do shell
 │    ├── app.routes.spec.ts # testes de rotas e integração entre telas
 │    ├── app.component.scss # estilos do componente raiz
 │    ├── app.component.spec.ts # testes do componente raiz
 │    └── app.component.ts # componente raiz
 ├── environments/        # URL base não sensível por ambiente
 ├── index.html           # página HTML principal
 ├── main.ts              # bootstrap da aplicação
 ├── styles/              # palette, tokens, tema Material, responsividade e actions
 └── styles.scss          # estilos globais

public/                   # assets estáticos, quando necessários
README.md                 # documentação principal do repositório
docs/                     # documentação técnica e histórico de releases
```

<p align="right"><a href="#sumario">⬆️ Voltar ao sumário</a></p>

---

<h2 id="como-executar-o-projeto" align="center">Como Executar o Projeto</h2>

### Pré-requisitos

- 🟩 [Node.js 24 LTS](https://nodejs.org/).
- 📦 npm.
- 💻 IDE de sua preferência, como [Visual Studio Code](https://code.visualstudio.com/).

### Passos

1. Clone o repositório:

```bash
git clone git@github.com:renancvitor/ironcore-frontend.git
```

2. Acesse a pasta do projeto:

```bash
cd ironcore-frontend
```

3. Instale as dependências:

```bash
npm ci
```

4. Inicie a aplicação:

```bash
npm start
```

Após iniciar o servidor de desenvolvimento, acesse `http://localhost:4200/` no navegador.

Os fluxos de integração disponíveis exigem que o backend correspondente esteja em execução e configurado conforme sua própria documentação. Em desenvolvimento, a URL base da API é `http://localhost:8080`.

<p align="right"><a href="#sumario">⬆️ Voltar ao sumário</a></p>

---

<h2 id="deploy" align="center">Deploy</h2>

O frontend está publicado em [ironcore.dev.br](https://ironcore.dev.br), no plano gratuito do Cloudflare Pages, com Node.js 24. A integração com GitHub publica a branch `main` usando `npm run build` e o diretório `dist/ironcore-frontend/browser`.

O GitHub Actions executa build e testes; a publicação é realizada pela integração própria do Pages, sem `cd.yml` no frontend. A interface consome `https://api.ironcore.dev.br` por HTTPS, com autenticação por cookie e proteção CSRF.

Consulte [Deploy e Produção](docs/deploy/README.md) para environments, fluxo de publicação, integração e limitações operacionais.

<p align="right"><a href="#sumario">⬆️ Voltar ao sumário</a></p>

---

<h2 id="contribuicoes" align="center">Contribuições</h2>

As contribuições devem seguir as orientações de [CONTRIBUTING.md](CONTRIBUTING.md), incluindo o escopo da alteração, a convenção de branches e commits, as validações locais e a atualização da documentação afetada.

Ao participar do projeto, siga também o [Código de Conduta](CODE_OF_CONDUCT.md) e a [Política de Segurança](SECURITY.md).

<p align="right"><a href="#sumario">⬆️ Voltar ao sumário</a></p>

---

<h2 id="contato" align="center">Contato</h2>

Se tiver dúvidas ou sugestões, entre em contato:

- 📧 **E-mail**: [renan.vitor.cm@gmail.com](mailto:renan.vitor.cm@gmail.com)
- 🟦 **LinkedIn**: [Renan Vitor](https://www.linkedin.com/in/renan-vitor-developer/)

<p align="right"><a href="#sumario">⬆️ Voltar ao sumário</a></p>

---

<h2 id="licenca" align="center">Licença</h2>

Este projeto está licenciado sob a [Licença MIT](LICENSE). Você pode utilizá-lo, modificar, compartilhar e distribuir o conteúdo conforme os termos dessa licença, preservando os devidos créditos e uma cópia do texto original.

<p align="right"><a href="#sumario">⬆️ Voltar ao sumário</a></p>

---
