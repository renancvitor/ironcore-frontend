<h1 align="center">
  IronCore Frontend
</h1>
<p align="center">
  <img src="https://img.shields.io/badge/Status-In%20Progress-yellow" width="150" height="30" />
</p>

<!-- Troque o texto e a cor do badge conforme o status do projeto:
     Status-Completed-brightgreen   → Projeto concluído
     Status-In%20Progress-yellow    → Projeto em andamento
     Status-Paused-orange           → Projeto pausado
     Status-Canceled-red            → Projeto cancelado
     Exemplo de uso:
     https://img.shields.io/badge/Status-Completed-brightgreen
-->

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
- [Escopo Inicial / MVP](#escopo-inicial--mvp)
- [Funcionalidades Planejadas](#funcionalidades-planejadas)
- [Testes Automatizados](#testes-automatizados)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Como Executar o Projeto](#como-executar-o-projeto)
- [Contribuições](#contribuicoes)
- [Contato](#contato)
- [Licença](#licenca)

---

<h2 id="visao-geral-do-projeto" align="center">Visão Geral do Projeto</h2>

<b>IronCore Frontend</b> é a interface web em desenvolvimento do ecossistema IronCore. Construído com <b>[Angular](https://angular.dev/)</b>, o projeto evoluirá como a camada de apresentação para os fluxos disponibilizados pelo [IronCore Backend](https://github.com/renancvitor/ironcore-backend).

A aplicação terá como objetivo oferecer uma experiência clara para acompanhar evolução física, consultar o catálogo de exercícios, organizar ciclos de treino e, em etapas futuras, registrar sessões executadas e interagir com recursos apoiados por IA.

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

O <b>IronCore Frontend</b> está em sua fundação técnica inicial. A aplicação foi criada com Angular e possui a configuração base necessária para evoluir; os fluxos de negócio e a integração com a API ainda não foram implementados.

### Já existe no projeto

- Aplicação Angular 21 configurada com TypeScript e SCSS.
- Configuração de rotas inicial.
- Configuração de build de produção e desenvolvimento.
- Estrutura de testes unitários baseada em Vitest.
- Configuração de formatação com Prettier.
- Documentos de contribuição, código de conduta, segurança e licença.

### Planejado para as próximas etapas

- Definição da arquitetura interna do frontend e dos módulos funcionais.
- Integração com os contratos reais do IronCore Backend.
- Autenticação e gerenciamento de sessão conforme o modelo de segurança da API.
- Telas para pessoa, métricas corporais, catálogo de exercícios e planejamento de treinos.
- Estados de carregamento, erro, vazio e sucesso para os fluxos da interface.
- Testes de componentes, serviços e fluxos relevantes.
- Documentação técnica complementar quando houver estrutura e decisões implementadas a registrar.

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

O frontend será integrado progressivamente ao [IronCore Backend](https://github.com/renancvitor/ironcore-backend), respeitando os contratos e o modelo de segurança já definidos pela API.

Essa integração seguirá os seguintes princípios:

- utilizar contratos reais da API, sem criar representações divergentes do domínio;
- manter validações de domínio, autenticação, autorização e ownership como responsabilidade do backend;
- antecipar validações conhecidas apenas para melhorar a experiência do usuário;
- tratar estados de carregamento e falhas de comunicação de forma compreensível;
- não expor detalhes técnicos desnecessários ao usuário;
- não armazenar credenciais, tokens ou dados sensíveis de forma insegura no navegador.

Os mecanismos concretos de comunicação HTTP, sessão, proteção de rotas e tratamento global de erros serão documentados quando forem implementados.

<p align="right"><a href="#sumario">⬆️ Voltar ao sumário</a></p>

---

<h2 id="escopo-inicial--mvp" align="center">Escopo Inicial / MVP</h2>

> Esta seção descreve o escopo planejado do frontend, não funcionalidades já implementadas.

O escopo inicial da interface acompanha a evolução incremental do IronCore e será priorizado conforme os contratos do backend estiverem estáveis.

### Núcleo do MVP

- Autenticação e acesso à área protegida conforme o baseline single-user da API.
- Consulta e atualização de dados da pessoa autenticada.
- Registro e consulta de métricas corporais.
- Consulta do catálogo de exercícios.
- Criação, consulta e organização de ciclos de treino.
- Feedbacks de carregamento, erro e sucesso nos fluxos principais.

### Evoluções planejadas após o MVP

- Registro e histórico de sessões de treino executadas.
- Visualizações de progresso físico e de treino.
- Recursos de planejamento de treino apoiados por IA, quando disponibilizados pelo backend.
- Evoluções de acessibilidade, responsividade e experiência de uso baseadas nos fluxos implementados.

<p align="right"><a href="#sumario">⬆️ Voltar ao sumário</a></p>

---

<h2 id="funcionalidades-planejadas" align="center">Funcionalidades Planejadas</h2>

As funcionalidades abaixo representam o escopo funcional planejado para a interface. A implementação será feita de forma incremental e não devem ser interpretadas como recursos já disponíveis.

### Acesso e sessão

- Login e logout conforme o contrato de autenticação do backend.
- Proteção de rotas que exijam usuário autenticado.
- Tratamento de sessão expirada e falhas de autenticação.
- Fluxos de troca de senha previstos pela API.

### Pessoa e evolução física

- Consulta e atualização dos dados da pessoa autenticada.
- Cadastro, edição, exclusão e consulta de métricas corporais.
- Consulta de histórico e progresso de métricas.

### Catálogo de exercícios

- Listagem paginada de exercícios.
- Filtros de busca e classificação disponibilizados pela API.
- Consulta do detalhe de cada exercício e de seus músculos-alvo.

### Planejamento de treinos

- Consulta de objetivos de treino.
- Criação e organização de ciclos de treino.
- Gerenciamento de dias e atividades planejadas.
- Consulta, edição, reordenação, filtros e exclusão conforme os contratos disponíveis.

### Execução e histórico

- Registro de sessões e atividades executadas, quando esse fluxo for disponibilizado pelo backend.
- Consulta de histórico e resumo de treinos realizados.

### Experiência de uso

- Interface responsiva para telas, formulários, listagens e ações principais.
- Navegação clara e feedback visual para ações concluídas, bloqueadas ou indisponíveis.
- Evolução contínua de acessibilidade nos elementos interativos.

<p align="right"><a href="#sumario">⬆️ Voltar ao sumário</a></p>

---

<h2 id="testes-automatizados" align="center">Testes Automatizados</h2>

O projeto possui a estrutura inicial de testes unitários configurada com Vitest. À medida que os fluxos forem implementados, os testes deverão proteger comportamentos relevantes de componentes, serviços e integração com os contratos HTTP.

Os testes futuros devem cobrir, quando aplicável:

- estados de carregamento, sucesso, vazio e erro;
- validações de interface;
- comportamento de componentes;
- comunicação de serviços com a API;
- navegação e proteção de rotas;
- regressões relacionadas a acessibilidade que possam ser verificadas de forma automatizada.

Para executar os testes locais:

```bash
npm test
```

Para validar o build de produção:

```bash
npm run build
```

<p align="right"><a href="#sumario">⬆️ Voltar ao sumário</a></p>

---

<h2 id="estrutura-do-projeto" align="center">Estrutura do Projeto</h2>

A estrutura atual é a base criada pelo Angular CLI. Módulos funcionais, serviços de integração, componentes reutilizáveis e camadas de infraestrutura serão introduzidos somente quando existirem responsabilidades concretas para organizá-los.

```plaintext
src/
 ├── app/
 │    ├── app.config.ts   # providers globais da aplicação
 │    ├── app.html        # template raiz
 │    ├── app.routes.ts   # configuração inicial de rotas
 │    ├── app.scss        # estilos do componente raiz
 │    ├── app.spec.ts     # teste inicial do componente raiz
 │    └── app.ts          # componente raiz
 ├── index.html           # página HTML principal
 ├── main.ts              # bootstrap da aplicação
 └── styles.scss          # estilos globais

public/                   # assets estáticos, quando necessários
README.md                 # documentação principal do repositório
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
npm install
```

4. Inicie a aplicação:

```bash
npm start
```

Após iniciar o servidor de desenvolvimento, acesse `http://localhost:4200/` no navegador.

Quando a integração for implementada, os fluxos que dependem da API exigirão que o backend correspondente esteja em execução e configurado conforme sua própria documentação.

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
