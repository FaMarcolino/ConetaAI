// src/routes/mensagens.js
const express = require("express");
const mensagens = require("../repositorio/mensagens");
const matches = require("../repositorio/matches");
const vagas = require("../repositorio/vagas");
const assincrono = require("../assincrono");
const { LADOS } = require("../validacao");
const { autenticar, mesmoId } = require("../autenticacao");

const router = express.Router();

router.use(autenticar);

// Só participa da conversa quem faz parte do match: o estudante do match ou a empresa dona da vaga.
async function ehParticipante(usuario, match) {
  if (usuario.tipo === "estudante") return mesmoId(match.estudanteId, usuario.id);
  const vaga = await vagas.buscarPorId(match.vagaId);
  return Boolean(vaga) && mesmoId(vaga.empresaId, usuario.id);
}

// GET /api/mensagens/:matchId - histórico de uma conversa (só os participantes)
router.get("/:matchId", assincrono(async (req, res) => {
  const match = await matches.buscarPorId(req.params.matchId);
  if (!match) return res.status(404).json({ erro: "Match não encontrado." });
  if (!(await ehParticipante(req.usuario, match))) {
    return res.status(403).json({ erro: "Você não participa dessa conversa." });
  }

  res.json(await mensagens.listarPorMatch(req.params.matchId));
}));

// POST /api/mensagens
// body: { matchId, enviadoPor: 'estudante' | 'empresa', texto }
// enviadoPor precisa ser o tipo de quem está logado: ninguém fala em nome do outro lado.
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
  if (!(await ehParticipante(req.usuario, match))) {
    return res.status(403).json({ erro: "Você não participa dessa conversa." });
  }
  if (enviadoPor !== req.usuario.tipo) {
    return res.status(403).json({ erro: "Você não pode enviar mensagens em nome do outro lado." });
  }

  res.status(201).json(await mensagens.criar(matchId, enviadoPor, texto.trim()));
}));

module.exports = router;
