// src/routes/matches.js
const express = require("express");
const matches = require("../repositorio/matches");
const assincrono = require("../assincrono");

const router = express.Router();

// GET /api/matches?estudanteId=est_1   -> matches de um estudante (aba "Matches" dele)
// GET /api/matches?vagaId=v1           -> matches de uma vaga específica
// GET /api/matches?empresaId=emp_1     -> matches de TODAS as vagas da empresa (aba "Matches" dela)
router.get("/", assincrono(async (req, res) => {
  const { estudanteId, vagaId, empresaId } = req.query;
  res.json(await matches.listarDetalhado({ estudanteId, vagaId, empresaId }));
}));

module.exports = router;
