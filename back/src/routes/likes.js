// src/routes/likes.js
const express = require("express");
const likes = require("../repositorio/likes");
const matches = require("../repositorio/matches");
const vagas = require("../repositorio/vagas");
const estudantes = require("../repositorio/estudantes");
const assincrono = require("../assincrono");

const router = express.Router();

// POST /api/likes
// body: { tipo: 'estudante_para_vaga' | 'empresa_para_estudante', estudanteId, vagaId }
// Registra a curtida e, se o outro lado já tinha curtido antes, cria o match na hora.
router.post("/", assincrono(async (req, res) => {
  const { tipo, estudanteId, vagaId } = req.body;

  if (!tipo || !estudanteId || !vagaId) {
    return res.status(400).json({ erro: "Informe tipo, estudanteId e vagaId." });
  }
  if (!["estudante_para_vaga", "empresa_para_estudante"].includes(tipo)) {
    return res.status(400).json({ erro: "tipo precisa ser 'estudante_para_vaga' ou 'empresa_para_estudante'." });
  }

  const vaga = await vagas.buscarPorId(vagaId);
  const estudante = await estudantes.buscarPorId(estudanteId);
  if (!vaga || !estudante) return res.status(404).json({ erro: "Vaga ou estudante não encontrado." });
  if (vaga.status !== "Ativa") return res.status(400).json({ erro: "Essa vaga está encerrada." });

  await likes.criar(tipo, estudanteId, vagaId); // não duplica se já existir

  const likeDoEstudante = await likes.existe("estudante_para_vaga", estudanteId, vagaId);
  const likeDaEmpresa = await likes.existe("empresa_para_estudante", estudanteId, vagaId);

  if (likeDoEstudante && likeDaEmpresa) {
    const match = await matches.criar(estudanteId, vagaId);
    return res.json({ houveMatch: true, match });
  }

  res.json({ houveMatch: false });
}));

module.exports = router;
