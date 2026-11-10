# ConetaAI - Backend

API em Node.js + Express que dá suporte ao app ConetaAI (cadastro, login, perfis, vagas, busca, curtidas/matches e chat).

## Como os dados são guardados

Por enquanto os dados ficam **em memória** (`src/data.js`) e reiniciam toda vez que o servidor reinicia.

A estrutura já está preparada para o banco de dados:

```
rotas (src/routes)  →  repositório (src/repositorio)  →  armazenamento (src/data.js)
```

- As rotas **nunca** acessam `data.js`; só chamam funções `async` do repositório.
- Para ligar o SGBD, reescreva apenas os arquivos de `src/repositorio/` com consultas SQL (mantendo os mesmos nomes de função e o mesmo formato de retorno). As rotas não mudam.
- Comentários nos repositórios indicam onde o SQL fará o trabalho (JOIN, `ON DELETE CASCADE`).

## Como rodar

```bash
cd back
npm install
npm start
```

O servidor sobe em `http://localhost:3000/api`. Depois de qualquer alteração no código, reinicie o servidor (ou use `npm run dev`, que reinicia sozinho).

## Usuários de teste

| Tipo      | E-mail                        | Senha  |
|-----------|-------------------------------|--------|
| Estudante | luan@email.com                | 123456 |
| Estudante | marina@email.com              | 123456 |
| Empresa   | contato@nortelsistemas.com.br | 123456 |
| Empresa   | contato@vettadata.com         | 123456 |

Também é possível criar contas novas pela tela de cadastro.

## Endpoints

### Autenticação
- `POST /api/auth/login` — `{ email, senha, tipo: "estudante" | "empresa" }`

### Listas fechadas
- `GET /api/cursos` — cursos disponíveis (`[{ id, nome }]`)
- `GET /api/tecnologias` — tecnologias disponíveis (`[{ id, nome }]`)

Cursos e tecnologias **não são texto livre**: o backend recusa nomes fora dessas listas (ignorando maiúsculas e acentos) e guarda sempre o nome oficial.

### Estudante
- `POST /api/estudantes` — cadastro: `{ nome, email, senha, curso, cidade, modalidade, disponibilidadeMeses, habilidades?, areasInteresse?, previsaoConclusao? }` (e-mail único, senha com 6+ caracteres)
- `GET /api/estudantes/:id`
- `PUT /api/estudantes/:id` — atualiza o perfil

Validações do perfil:
- `areasInteresse` (atributo multivalorado do ER): lista de textos não vazios, com até 60 caracteres. Repetições são removidas (ignorando maiúsculas e acentos).
- `previsaoConclusao`: texto vazio ou ano-mês no formato `AAAA-MM` (ex.: `2027-12`).

### Empresa
- `POST /api/empresas` — cadastro: `{ nome, email, senha, setor, cidade }` (e-mail único)
- `GET /api/empresas/:id`
- `PUT /api/empresas/:id` — atualiza a página da empresa

### Vagas
- `GET /api/vagas` — lista vagas. Filtros opcionais (combináveis):
  - `empresaId`, `status` (`Ativa` ou `Encerrada`), `cidade` (contém), `modalidade`, `tecnologia`, `q` (cargo ou empresa)
  - `estudanteId=est_1` — cada vaga vem com o score de compatibilidade e a flag `curtida`
  - `feed=1` — modo swipe: só vagas ativas que o estudante ainda não curtiu
  - `ordenar=compatibilidade` — do maior para o menor score
- `GET /api/vagas/:id` — detalhe de uma vaga
- `POST /api/vagas` — empresa publica uma vaga: `{ empresaId, cargo, cursoDesejado[], tecnologias[], modalidade, cidade, faixaSalarial, periodoMinimoMeses }`
- `PUT /api/vagas/:id/status` — `{ empresaId, status: "Ativa" | "Encerrada" }`
- `DELETE /api/vagas/:id?empresaId=emp_1` — exclui a vaga e suas curtidas, matches e mensagens
- `GET /api/vagas/:id/candidatos` — estudantes compatíveis, do maior para o menor score. Opções: `?scoreMinimo=50`, `?ocultarCurtidos=1`

Alterar status ou excluir só é permitido para a empresa dona da vaga (`403` caso contrário).

### Curtidas e matches
- `POST /api/likes` — `{ origem: "estudante" | "empresa", estudanteId, vagaId, empresaId }`
  - `origem: "estudante"`: o estudante curtiu a vaga.
  - `origem: "empresa"`: a empresa curtiu o estudante **para aquela vaga**. Aqui o `empresaId` é obrigatório e precisa ser o da empresa dona da vaga (`403` caso contrário).
  - Se os dois lados já curtiram, o match é criado na hora (`houveMatch: true`). Vagas encerradas não aceitam curtidas. Curtir duas vezes não duplica.
- `GET /api/matches?estudanteId=est_1` — matches de um estudante
- `GET /api/matches?vagaId=v1` — matches de uma vaga
- `GET /api/matches?empresaId=emp_1` — matches de todas as vagas da empresa
- `GET /api/matches?...&desde=2026-11-01T00:00:00.000Z` — só os matches criados a partir da data (é o que o painel da empresa usa para "Matches este mês")

### Chat
- `GET /api/mensagens/:matchId` — histórico de mensagens de um match
- `POST /api/mensagens` — `{ matchId, enviadoPor: "estudante" | "empresa", texto }` (`enviadoPor` fora desses dois valores retorna `400`)

## Exemplo de fluxo completo (curl)

```bash
# 1. estudante curte a vaga
curl -X POST http://localhost:3000/api/likes \
  -H "Content-Type: application/json" \
  -d '{"origem":"estudante","estudanteId":"est_1","vagaId":"v1"}'

# 2. a empresa dona da vaga (emp_1) curte o mesmo estudante para a mesma vaga -> dá match
curl -X POST http://localhost:3000/api/likes \
  -H "Content-Type: application/json" \
  -d '{"origem":"empresa","empresaId":"emp_1","estudanteId":"est_1","vagaId":"v1"}'

# 3. enviar mensagem no match criado (troque MATCH_ID pelo id retornado acima)
curl -X POST http://localhost:3000/api/mensagens \
  -H "Content-Type: application/json" \
  -d '{"matchId":"MATCH_ID","enviadoPor":"estudante","texto":"Olá! Vamos conversar sobre a vaga?"}'
```

## Próximos passos

- Ligar o SGBD relacional reescrevendo `src/repositorio/` (veja a seção "Como os dados são guardados").
- Guardar senhas com hash em vez de texto puro.
- Autenticação com token (hoje as rotas confiam nos ids enviados pelo front).
