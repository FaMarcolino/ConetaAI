// server.js
// Ponto de entrada da API do ConetaAI.
// Rodar com: npm install && npm start
const express = require("express");
const cors = require("cors");

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

// captura erros inesperados
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erro: "Erro interno no servidor." });
});

app.listen(PORTA, () => {
  console.log(`ConetaAI API rodando em http://localhost:${PORTA}/api`);
});
