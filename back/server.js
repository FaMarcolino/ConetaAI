// server.js
// Ponto de entrada da API do ConetaAI.
// Rodar com: npm install && npm start
// Antes de subir, o PostgreSQL precisa estar rodando e a senha definida em PGPASSWORD
// (veja o README).
const express = require("express");
const cors = require("cors");

const db = require("./src/db");
const { SEGREDO_DEFINIDO } = require("./src/autenticacao");
const authRoutes = require("./src/routes/auth");
const estudantesRoutes = require("./src/routes/estudantes");
const empresasRoutes = require("./src/routes/empresas");
const vagasRoutes = require("./src/routes/vagas");
const likesRoutes = require("./src/routes/likes");
const matchesRoutes = require("./src/routes/matches");
const mensagensRoutes = require("./src/routes/mensagens");
const { cursosRouter, tecnologiasRouter } = require("./src/routes/catalogos");

const app = express();
const PORTA = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// log simples de cada requisição, útil durante o desenvolvimento
app.use((req, res, next) => {
  console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.originalUrl}`);
  next();
});

app.get("/api", (req, res) => {
  res.json({ nome: "ConetaAI API", status: "no ar" });
});

app.use("/api/auth", authRoutes);
app.use("/api/estudantes", estudantesRoutes);
app.use("/api/empresas", empresasRoutes);
app.use("/api/vagas", vagasRoutes);
app.use("/api/likes", likesRoutes);
app.use("/api/matches", matchesRoutes);
app.use("/api/mensagens", mensagensRoutes);
app.use("/api/cursos", cursosRouter);
app.use("/api/tecnologias", tecnologiasRouter);

// captura rotas não encontradas
app.use((req, res) => {
  res.status(404).json({ erro: "Rota não encontrada." });
});

// Erros do PostgreSQL que podem chegar até aqui quando algo escapa da validação das rotas.
// O banco é a última barreira: mesmo assim a resposta é uma mensagem clara, não um erro 500.
const ERROS_DO_BANCO = {
  "23505": [409, "Já existe um registro com esses dados."],
  "23514": [400, "Algum valor informado não é permitido."],
  "23502": [400, "Falta preencher um campo obrigatório."],
  "23503": [400, "O registro relacionado não existe."],
  "23001": [409, "Não é possível excluir: o registro está em uso."],
  "22001": [400, "Um dos textos informados é longo demais."],
  "22P02": [400, "Um dos valores informados está em formato inválido."],
};

// captura erros inesperados
app.use((err, req, res, next) => {
  console.error(err);

  if (err.code && ERROS_DO_BANCO[err.code]) {
    const [status, mensagem] = ERROS_DO_BANCO[err.code];
    // os triggers do banco escrevem a própria mensagem (ex.: "Um match exige uma curtida de cada origem...")
    const usarMensagemDoBanco = err.code === "23514" && /^(Um match|A curtida)/.test(err.message);
    return res.status(status).json({ erro: usarMensagemDoBanco ? err.message : mensagem });
  }
  if (err.code === "ECONNREFUSED" || err.code === "ECONNRESET" || err.code === "57P01") {
    return res.status(503).json({ erro: "Banco de dados indisponível no momento." });
  }
  res.status(500).json({ erro: "Erro interno no servidor." });
});

// Só começa a atender depois de confirmar que o banco responde.
async function iniciar() {
  try {
    const info = await db.testarConexao();
    console.log(`Conectado ao PostgreSQL: banco "${info.banco}" como "${info.usuario}" (${info.tabelas} tabelas).`);
    if (info.tabelas < 12) {
      console.warn("Atenção: o banco tem menos de 12 tabelas. Rode back/sql/01_schema.sql e 02_seed.sql (veja o README).");
    }
  } catch (erro) {
    console.error("\n" + db.explicarErroDeConexao(erro) + "\n");
    process.exit(1);
  }

  if (!SEGREDO_DEFINIDO) {
    console.log("Segurança: SEGREDO_TOKEN não definido, usando um segredo temporário. " +
                "Os logins valem só até reiniciar a API (depois é preciso entrar de novo).");
  }

  app.listen(PORTA, () => {
    console.log(`ConetaAI API rodando em http://localhost:${PORTA}/api`);
  });
}

iniciar();
