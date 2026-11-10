// src/routes/mensagens.js
const express = require("express");
const mensagens = require("../repositorio/mensagens");
const matches = require("../repositorio/matches");
const assincrono = require("../assincrono");

const router = express.Router();

// GET /api/mensagens/:matchId - histórico de uma conversa
router.get("/:matchId", assincrono(async (req, res) => {
  const match = await matches.buscarPorId(req.params.matchId);
  if (!match) return res.status(404).json({ erro: "Match não encontrado." });

  res.json(await mensagens.listarPorMatch(req.params.matchId));
}));

// POST /api/mensagens
// body: { matchId, de: 'estudante' | 'empresa', texto }
router.post("/", assincrono(async (req, res) => {
  const { matchId, de, texto } = req.body;

  if (!matchId || !de || !texto || !texto.trim()) {
    return res.status(400).json({ erro: "Informe matchId, de ('estudante' ou 'empresa') e texto." });
  }
  const match = await matches.buscarPorId(matchId);
  if (!match) return res.status(404).json({ erro: "Match não encontrado." });

  res.status(201).json(await mensagens.criar(matchId, de, texto.trim()));
}));

module.exports = router;
