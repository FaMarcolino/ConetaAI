// src/routes/matches.js
const express = require("express");
const matches = require("../repositorio/matches");
const assincrono = require("../assincrono");

const router = express.Router();

// GET /api/matches?estudanteId=est_1   -> matches de um estudante (aba "Matches" dele)
// GET /api/matches?vagaId=v1           -> matches de uma vaga específica
// GET /api/matches?empresaId=emp_1     -> matches de TODAS as vagas da empresa (aba "Matches" dela)
// ?desde=2026-11-01T00:00:00.000Z      -> só matches criados a partir dessa data (ex.: "este mês")
router.get("/", assincrono(async (req, res) => {
  const { estudanteId, vagaId, empresaId, desde } = req.query;

  let dataInicial;
  if (desde !== undefined) {
    dataInicial = new Date(desde);
    if (Number.isNaN(dataInicial.getTime())) {
      return res.status(400).json({ erro: "desde precisa ser uma data válida (ex.: 2026-11-01)." });
    }
  }

  res.json(await matches.listarDetalhado({ estudanteId, vagaId, empresaId, desde: dataInicial }));
}));

module.exports = router;
