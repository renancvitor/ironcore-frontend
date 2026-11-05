<!-- Registro histórico reconciliado na Issue #101. Fonte: https://github.com/renancvitor/ironcore-frontend/releases/tag/v1.0.1; publicação: 2026-10-22T13:49:47Z; prerelease: false. Conteúdo oficial preservado abaixo. -->

# v1.0.1 - Integração Segura e Deploy em Produção

## Resumo

`v1.0.1` consolida a preparação e implantação em produção do IronCore Frontend após a primeira versão estável `v1.0.0`.

Esta release mantém os fluxos funcionais entregues na primeira fase do produto e acrescenta a integração com a proteção CSRF do backend, a configuração definitiva da API de produção e a publicação da aplicação Angular no Cloudflare Pages.

O IronCore Frontend passa a estar disponível em `https://ironcore.dev.br`, integrado ao IronCore Backend em `https://api.ironcore.dev.br`.

A versão prioriza segurança, configuração de produção, integração e entrega contínua, sem introduzir novos módulos funcionais.

## Principais Mudanças

### Integração e Segurança

- Implementação de `CsrfService` para obtenção de tokens CSRF a partir da API.
- Adição de `csrfInterceptor` à infraestrutura HTTP compartilhada.
- Obtenção do token por `GET /api/auth/csrf` antes das operações de escrita.
- Inclusão do token no header informado pelo backend.
- Suporte à proteção CSRF nos fluxos de login, logout, primeiro acesso e operações autenticadas de escrita.
- Compartilhamento de requisições simultâneas de obtenção do token, evitando chamadas duplicadas durante a mesma obtenção.
- Preservação do envio de cookies com `withCredentials` para as requisições destinadas à API.
- Ajustes no interceptor de autenticação para identificação das chamadas à API e tratamento de respostas `401`.
- Ampliação dos testes automatizados da infraestrutura HTTP e de segurança.

### Configuração de Produção

- Configuração definitiva da URL da API no environment de produção.
- Integração com `https://api.ironcore.dev.br`.
- Preservação de `http://localhost:8080` para desenvolvimento local.
- Publicação da interface no domínio `https://ironcore.dev.br`.
- Integração com o backend por HTTPS.
- Compatibilidade com os cookies de autenticação `HttpOnly`, `Secure` e `SameSite=Lax` definidos pelo backend.

### Deploy e Publicação

- Implantação do frontend no Cloudflare Pages.
- Integração do projeto Cloudflare Pages ao repositório GitHub `renancvitor/ironcore-frontend`.
- Configuração da branch `main` como origem da publicação de produção.
- Build automatizado com Node.js 24 e `npm run build`.
- Publicação dos arquivos gerados em `dist/ironcore-frontend/browser`.
- Configuração do domínio próprio `ironcore.dev.br`.
- Publicação automática de novas versões a partir de commits na `main`.
- Disponibilização de Preview Deployments para branches e Pull Requests, conforme o fluxo do Cloudflare Pages.
- Manutenção do CI de build e testes no GitHub Actions.

### Documentação

- Criação de documentação técnica específica para deploy e produção.
- Atualização do README principal com o endereço público e a arquitetura de publicação.
- Atualização do índice central de documentação.
- Atualização da documentação arquitetural de environments, autenticação e interceptors HTTP.
- Registro da integração entre Cloudflare Pages, backend e GitHub Actions.

## Decisões Funcionais e Arquiteturais

- A arquitetura Angular standalone e o carregamento lazy das rotas foram preservados.
- Os módulos de autenticação, conta, Body Metrics, Exercise Catalog e Workout Planning permanecem funcionalmente equivalentes aos entregues na `v1.0.0`.
- O backend continua responsável pela autenticação, autorização, ownership e integridade dos dados.
- O frontend não armazena o JWT em `localStorage` ou `sessionStorage`.
- Os cookies de autenticação são gerenciados pelo navegador e emitidos pelo backend.
- O `authInterceptor` adiciona credenciais somente às chamadas da API.
- O `csrfInterceptor` atua nas operações de escrita direcionadas à API.
- Métodos `GET`, `HEAD` e `OPTIONS` não precisam obter token CSRF por meio do interceptor.
- A URL da API é definida pelo environment ativo, sem duplicação de configuração nas features.
- A publicação do frontend é responsabilidade da integração GitHub + Cloudflare Pages, sem necessidade de um arquivo `cd.yml`.
- O CI do GitHub Actions e o deploy do Cloudflare Pages permanecem independentes.

## Integração com o Backend

O frontend utiliza a API de produção:

`https://api.ironcore.dev.br`

O fluxo de autenticação permanece baseado no cookie `access_token`, agora integrado à proteção CSRF obrigatória do backend.

Para requisições de escrita:

1. O interceptor identifica uma chamada destinada à API.
2. O serviço obtém o token CSRF.
3. O header retornado pelo backend é incluído na requisição original.
4. A chamada é enviada com as credenciais necessárias.

A restauração da sessão continua utilizando `GET /api/users/me`.

Os contratos funcionais de Body Metrics, Exercise Catalog e Workout Planning permanecem os mesmos da primeira versão estável, sem replicação de regras de domínio no cliente.

## CI/CD e Publicação

### Integração Contínua

O GitHub Actions mantém o workflow `CI - Build & Test`, utilizando Node.js 24.

Etapas:

- Instalação de dependências com `npm ci`.
- Compilação com `npm run build`.
- Execução da suíte automatizada com `npm test`.

### Continuous Deployment

O Cloudflare Pages executa a publicação a partir do repositório GitHub.

O fluxo de produção é:

`Commit na main -> Build Cloudflare Pages -> Publicação em ironcore.dev.br`

A publicação do Pages não depende da conclusão do CI do GitHub Actions. Portanto, o processo de deploy e o processo de testes continuam sendo integrações distintas.

Branches e Pull Requests podem receber URLs temporárias de preview.

Esses ambientes de preview não possuem garantia de compatibilidade com a autenticação da API de produção, que utiliza CORS e cookies configurados para o domínio oficial.

## Testes e Validação

A nova integração possui cobertura automatizada para:

- Obtenção do token CSRF.
- Inclusão do header CSRF nas operações de escrita.
- Identificação das requisições destinadas à API.
- Preservação de `withCredentials`.
- Tratamento de autenticação e respostas `401`.
- Integração dos interceptors com a infraestrutura HTTP existente.

Os testes acumulados da `v1.0.0` permanecem cobrindo os módulos funcionais do produto.

Validação automatizada final:

- `npm ci`
- `npm run build`
- `npm test`
- **707 testes aprovados em 61 arquivos.**
- CI da `main` concluído com sucesso.

A implantação inicial no Cloudflare Pages foi validada, com publicação no domínio próprio e integração com a API.

Os testes automatizados de frontend utilizam respostas HTTP simuladas e não executam alterações reais no banco de produção.

## Limitações Conhecidas

- Os ambientes de preview podem não autenticar corretamente contra a API de produção por causa das restrições de cookies e CORS.
- O deploy do Cloudflare Pages não aguarda necessariamente a aprovação dos testes executados pelo GitHub Actions.
- A interface depende da disponibilidade da API e do PostgreSQL para executar seus fluxos autenticados.
- O frontend e o backend possuem publicações independentes; alterações de contrato devem considerar compatibilidade entre versões.
- Otimizações de latência e estratégias adicionais de cache permanecem como possíveis evoluções futuras.

## Não Incluído Nesta Release

Esta versão não adiciona:

- Novos fluxos de Workout Planning.
- Workout Session ou registro de sessões executadas.
- Histórico de treinos realizados.
- Métricas de aderência ou progresso real de execução.
- Seleção automática do treino do dia.
- Geração de treinos com IA/agent.
- Novas regras funcionais de Body Metrics ou Exercise Catalog.
- Modo de demonstração.
- Alterações estruturais na arquitetura de domínio do backend.

Essas funcionalidades permanecem fora do escopo desta atualização.

## Documentação

Documentação técnica atualizada:

- `README.md`
- `docs/README.md`
- `docs/deploy/README.md`
- `docs/architecture/README.md`

O histórico da `v1.0.0` e dos pre-releases anteriores foi preservado.

A `v1.0.1` marca a disponibilização da primeira versão estável do IronCore Frontend em produção, com domínio próprio, integração segura com o backend e publicação automatizada pelo Cloudflare Pages.

A primeira fase funcional continua concluída, enquanto o produto permanece preparado para evoluções futuras.

Registro reconciliado na Issue #101 a partir da [release oficial v1.0.1](https://github.com/renancvitor/ironcore-frontend/releases/tag/v1.0.1), publicada em 22/10/2026 como versão estável. O conteúdo oficial acima foi preservado; suas validações pertencem àquela publicação.

<p align="right"><a href="../README.md">Voltar para releases</a></p>
