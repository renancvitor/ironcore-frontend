# Contribuindo com o IronCore Frontend

Obrigado pelo interesse em contribuir com o IronCore Frontend.

Este documento apresenta as regras gerais para propor alterações, implementar funcionalidades, corrigir problemas e atualizar a documentação do projeto.

O IronCore está em desenvolvimento ativo e evolui de forma incremental por meio de Issues, milestones, branches e Pull Requests.

## Antes de contribuir

Antes de iniciar uma alteração:

1. Consulte as Issues existentes para verificar se o trabalho já está planejado ou em andamento.
2. Leia o [README principal](README.md) para conhecer o escopo e o estado atual do projeto.
3. Confirme que a alteração pertence ao escopo atual do frontend.
4. Para mudanças relevantes, crie ou associe uma Issue antes de abrir o Pull Request.

Mudanças amplas de arquitetura, segurança, autenticação, contratos da API ou experiência de interface devem ser discutidas antes da implementação.

## Tecnologias e requisitos

O ambiente de desenvolvimento utiliza principalmente:

- Angular 21;
- TypeScript;
- RxJS;
- SCSS;
- Vitest;
- npm.

Recomenda-se utilizar Node.js 24 LTS e a versão declarada no `package.json` como referência para as ferramentas do projeto.

## Executando o projeto

Instale as dependências:

```bash
npm install
```

Execute a aplicação localmente:

```bash
npm start
```

## Executando os testes

Para executar a suíte de testes:

```bash
npm test
```

Para validar o build de produção:

```bash
npm run build
```

Antes de abrir um Pull Request, o build deve passar localmente e os testes necessários devem ser executados.

## Organização do frontend

O frontend é responsável principalmente por:

- apresentação;
- interação com o usuário;
- navegação;
- estado de interface;
- validações de experiência do usuário;
- consumo da API;
- tratamento adequado dos estados de carregamento e erro.

Regras de negócio pertencentes ao domínio não devem ser duplicadas no frontend para substituir validações existentes no backend.

A interface pode antecipar regras conhecidas para melhorar a experiência do usuário, mas o backend continua sendo a fonte de verdade para validações de domínio, autenticação, autorização e integridade dos dados.

## Componentes e reutilização

Antes de criar um componente novo:

- verifique se existe solução reutilizável;
- evite componentes excessivamente grandes;
- mantenha responsabilidades claras;
- não introduza abstrações sem necessidade concreta;
- preserve consistência visual entre telas relacionadas.

Componentes devem concentrar apresentação e interação. A comunicação HTTP, a composição de fluxos assíncronos e o estado compartilhado devem seguir os padrões já estabelecidos no projeto à medida que forem introduzidos.

## Integração com a API

Ao consumir endpoints:

- utilize os contratos reais do backend;
- trate estados de carregamento;
- trate respostas de erro;
- não exponha detalhes técnicos desnecessários ao usuário;
- não armazene credenciais ou dados sensíveis de forma insegura;
- respeite o modelo de autenticação definido pelo backend.

Mudanças nos contratos da API devem ser coordenadas com o `ironcore-backend`.

## Estilos e acessibilidade

O projeto utiliza SCSS.

Os estilos devem:

- preservar consistência visual;
- evitar duplicação desnecessária;
- considerar responsividade quando houver impacto de layout;
- considerar acessibilidade nos elementos interativos.

## Testes

Os testes devem ser proporcionais ao risco e ao tipo da alteração.

Use testes para proteger, quando aplicável:

- comportamento de componentes;
- serviços e integração com contratos HTTP;
- estados de carregamento, sucesso e erro;
- validações de interface;
- fluxos de navegação e autorização;
- regressões relacionadas a acessibilidade ou responsividade que possam ser verificadas de forma automatizada.

Uma funcionalidade não deve ser considerada concluída apenas porque compila.

## Documentação

A documentação faz parte da entrega.

Atualize o conteúdo relevante quando a alteração afetar:

- arquitetura do frontend;
- estrutura do projeto;
- integração com a API;
- autenticação;
- segurança;
- testes;
- acessibilidade;
- responsividade;
- estado atual do projeto.

## Issues

Os títulos das Issues seguem, em geral, o padrão:

```text
[escopo] descrição objetiva
```

Exemplos:

```text
[frontend] implementar tela de login
[ui] estruturar navegação principal
[docs] atualizar documentação de desenvolvimento
```

A Issue deve conter:

- contexto;
- objetivo;
- critérios de aceite;
- observações, quando necessárias.

## Branches

Utilize nomes objetivos e relacionados à alteração.

Padrão recomendado:

```text
tipo/descricao-curta
```

Exemplos:

```text
feat/login-page
fix/body-metrics-form
docs/community-standards
refactor/navigation-state
chore/development-tooling
```

Evite nomes genéricos, como:

```text
update
changes
new-feature
test
```

## Commits

Utilize mensagens objetivas e em inglês, seguindo o padrão já adotado no projeto.

Exemplos:

```text
feat(auth): add login form
fix(metrics): handle empty progress data
docs: add community documentation
test(auth): cover invalid credentials
refactor(workout): extract activity form
chore(github): add community standards
```

Cada commit deve representar uma unidade coerente de alteração.

Evite misturar, no mesmo commit:

- refatorações não relacionadas;
- formatação ampla;
- alterações funcionais;
- atualização de dependências;
- documentação de outro módulo.

## Pull Requests

O Pull Request deve:

- possuir título objetivo;
- estar relacionado a uma Issue quando aplicável;
- limitar-se ao escopo proposto;
- passar pelo build;
- incluir ou atualizar os testes necessários;
- informar impacto visual quando existir;
- considerar responsividade e acessibilidade quando aplicável;
- atualizar a documentação afetada;
- evitar alterações paralelas não relacionadas.

O título deve seguir o padrão de commits do projeto.

Pull Requests grandes devem explicar claramente suas decisões, limitações e impactos.

## Critérios gerais de conclusão

Antes de considerar uma contribuição concluída, valide:

- [ ] O objetivo da Issue foi atendido.
- [ ] O escopo foi respeitado.
- [ ] A estrutura do frontend foi preservada.
- [ ] A integração com a API permanece compatível.
- [ ] Estados de carregamento e erro foram avaliados, quando aplicáveis.
- [ ] Responsividade e acessibilidade foram consideradas, quando houver impacto visual.
- [ ] Os testes necessários foram adicionados ou atualizados.
- [ ] `npm run build` foi executado com sucesso.
- [ ] A documentação relacionada foi atualizada.
- [ ] Não há código comentado, temporário ou desnecessário.
- [ ] Não foram introduzidos dados sensíveis, tokens ou credenciais no repositório.
- [ ] Não foram introduzidos breaking changes não intencionais.

## Segurança

Não abra uma Issue pública contendo detalhes de vulnerabilidades exploráveis, credenciais, tokens, segredos ou dados pessoais.

Consulte a [Política de Segurança](SECURITY.md) para reportar vulnerabilidades.

## Código de Conduta

Ao participar do projeto, siga o [Código de Conduta](CODE_OF_CONDUCT.md).

## Licença

Ao contribuir, você concorda que sua contribuição será disponibilizada sob a mesma licença aplicada ao repositório.
