// src/routes/likes.js
const express = require("express");
const likes = require("../repositorio/likes");
const matches = require("../repositorio/matches");
const vagas = require("../repositorio/vagas");
const estudantes = require("../repositorio/estudantes");
const assincrono = require("../assincrono");
const { LADOS } = require("../validacao");

const router = express.Router();

// POST /api/likes
// body: { origem: 'estudante' | 'empresa', estudanteId, vagaId, empresaId (obrigatório quando origem = 'empresa') }
// origem 'estudante' -> o estudante curtiu a vaga
// origem 'empresa'   -> a empresa dona da vaga curtiu o estudante, para aquela vaga
// Registra a curtida e, se o outro lado já tinha curtido antes, cria o match na hora.
router.post("/", assincrono(async (req, res) => {
  const { origem, estudanteId, vagaId, empresaId } = req.body;

  if (!origem || !estudanteId || !vagaId) {
    return res.status(400).json({ erro: "Informe origem, estudanteId e vagaId." });
  }
  if (!LADOS.includes(origem)) {
    return res.status(400).json({ erro: "origem precisa ser 'estudante' ou 'empresa'." });
  }

  const vaga = await vagas.buscarPorId(vagaId);
  const estudante = await estudantes.buscarPorId(estudanteId);
  if (!vaga || !estudante) return res.status(404).json({ erro: "Vaga ou estudante não encontrado." });

  // só a empresa dona da vaga pode curtir candidatos dela
  if (origem === "empresa" && (!empresaId || vaga.empresaId !== empresaId)) {
    return res.status(403).json({ erro: "Só a empresa dona da vaga pode curtir candidatos dela." });
  }
  if (vaga.status !== "Ativa") return res.status(400).json({ erro: "Essa vaga está encerrada." });

  await likes.criar(origem, estudanteId, vagaId); // não duplica se já existir

  const likeDoEstudante = await likes.existe("estudante", estudanteId, vagaId);
  const likeDaEmpresa = await likes.existe("empresa", estudanteId, vagaId);

  if (likeDoEstudante && likeDaEmpresa) {
    const match = await matches.criar(estudanteId, vagaId);
    return res.json({ houveMatch: true, match });
  }

  res.json({ houveMatch: false });
}));

module.exports = router;
