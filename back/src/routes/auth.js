// src/routes/auth.js
const express = require("express");
const estudantes = require("../repositorio/estudantes");
const empresas = require("../repositorio/empresas");
const assincrono = require("../assincrono");
const { semSenha } = require("../validacao");

const router = express.Router();

// POST /api/auth/login  { email, senha, tipo: 'estudante' | 'empresa' }
router.post("/login", assincrono(async (req, res) => {
  const { email, senha, tipo } = req.body;

  if (!email || !senha || !tipo) {
    return res.status(400).json({ erro: "Informe email, senha e tipo (estudante ou empresa)." });
  }

  const repositorio = tipo === "empresa" ? empresas : estudantes;
  const usuario = await repositorio.buscarPorEmail(email);

  if (!usuario || usuario.senha !== senha) {
    return res.status(401).json({ erro: "E-mail ou senha inválidos." });
  }

  // nunca devolver a senha na resposta
  res.json({ tipo, usuario: semSenha(usuario) });
}));

module.exports = router;
