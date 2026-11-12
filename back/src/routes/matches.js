// src/routes/matches.js
const express = require("express");
const matches = require("../repositorio/matches");
const assincrono = require("../assincrono");
const { autenticar, mesmoId } = require("../autenticacao");

const router = express.Router();

// GET /api/matches   (exige login; cada um só enxerga os seus próprios matches)
//   estudante logado -> matches dele      (?estudanteId=<o próprio id> é opcional)
//   empresa logada   -> matches das vagas dela  (?empresaId=<o próprio id> é opcional)
// Filtros extras: ?vagaId=1 e ?desde=2026-11-01T00:00:00.000Z (só matches criados a partir da data)
router.get("/", autenticar, assincrono(async (req, res) => {
  const { estudanteId, vagaId, empresaId, desde } = req.query;
  const ehEstudante = req.usuario.tipo === "estudante";

  // pedir os matches de outra pessoa é proibido
  if (ehEstudante && ((estudanteId !== undefined && !mesmoId(estudanteId, req.usuario.id)) || empresaId !== undefined)) {
    return res.status(403).json({ erro: "Você só pode ver os seus próprios matches." });
  }
  if (!ehEstudante && ((empresaId !== undefined && !mesmoId(empresaId, req.usuario.id)) || estudanteId !== undefined)) {
    return res.status(403).json({ erro: "Você só pode ver os matches das suas próprias vagas." });
  }

  let dataInicial;
  if (desde !== undefined) {
    dataInicial = new Date(desde);
    if (Number.isNaN(dataInicial.getTime())) {
      return res.status(400).json({ erro: "desde precisa ser uma data válida (ex.: 2026-11-01)." });
    }
  }

  // o filtro principal vem SEMPRE do token, nunca do que o cliente digitou
  res.json(await matches.listarDetalhado({
    estudanteId: ehEstudante ? req.usuario.id : undefined,
    empresaId: ehEstudante ? undefined : req.usuario.id,
    vagaId,
    desde: dataInicial,
  }));
}));

module.exports = router;
