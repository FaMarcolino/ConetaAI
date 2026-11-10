// src/routes/empresas.js
const express = require("express");
const empresas = require("../repositorio/empresas");
const assincrono = require("../assincrono");
const { textoPreenchido, emailValido, semSenha } = require("../validacao");

const router = express.Router();

// POST /api/empresas - cadastro de uma nova empresa
router.post("/", assincrono(async (req, res) => {
  const { nome, email, senha, setor, cidade, descricao, site } = req.body;

  if (![nome, email, senha, setor, cidade].every(textoPreenchido)) {
    return res.status(400).json({ erro: "Preencha nome, e-mail, senha, setor e cidade." });
  }
  if (!emailValido(email)) return res.status(400).json({ erro: "Digite um e-mail válido." });
  if (senha.length < 6) return res.status(400).json({ erro: "A senha precisa de pelo menos 6 caracteres." });
  if (await empresas.buscarPorEmail(email)) {
    return res.status(409).json({ erro: "Já existe uma empresa cadastrada com esse e-mail." });
  }

  const nova = await empresas.criar({
    nome: nome.trim(), email, senha, setor: setor.trim(), cidade: cidade.trim(), descricao, site,
  });
  res.status(201).json(semSenha(nova));
}));

// GET /api/empresas/:id
router.get("/:id", assincrono(async (req, res) => {
  const empresa = await empresas.buscarPorId(req.params.id);
  if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada." });
  res.json(semSenha(empresa));
}));

// PUT /api/empresas/:id - atualiza a "página da empresa"
router.put("/:id", assincrono(async (req, res) => {
  const empresa = await empresas.buscarPorId(req.params.id);
  if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada." });

  const camposPermitidos = ["nome", "setor", "cidade", "descricao", "site"];
  const alteracoes = {};
  camposPermitidos.forEach((campo) => {
    if (req.body[campo] !== undefined) alteracoes[campo] = req.body[campo];
  });

  const atualizada = await empresas.atualizar(req.params.id, alteracoes);
  res.json(semSenha(atualizada));
}));

module.exports = router;
