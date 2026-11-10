// src/routes/mensagens.js
const express = require("express");
const mensagens = require("../repositorio/mensagens");
const matches = require("../repositorio/matches");
const assincrono = require("../assincrono");
const { LADOS } = require("../validacao");

const router = express.Router();

// GET /api/mensagens/:matchId - histórico de uma conversa
router.get("/:matchId", assincrono(async (req, res) => {
  const match = await matches.buscarPorId(req.params.matchId);
  if (!match) return res.status(404).json({ erro: "Match não encontrado." });

  res.json(await mensagens.listarPorMatch(req.params.matchId));
}));

// POST /api/mensagens
// body: { matchId, enviadoPor: 'estudante' | 'empresa', texto }
router.post("/", assincrono(async (req, res) => {
  const { matchId, enviadoPor, texto } = req.body;

  if (!matchId || !enviadoPor || typeof texto !== "string" || !texto.trim()) {
    return res.status(400).json({ erro: "Informe matchId, enviadoPor ('estudante' ou 'empresa') e texto." });
  }
  if (!LADOS.includes(enviadoPor)) {
    return res.status(400).json({ erro: "enviadoPor precisa ser 'estudante' ou 'empresa'." });
  }
  const match = await matches.buscarPorId(matchId);
  if (!match) return res.status(404).json({ erro: "Match não encontrado." });

  res.status(201).json(await mensagens.criar(matchId, enviadoPor, texto.trim()));
}));

module.exports = router;
