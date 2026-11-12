// src/routes/auth.js
const express = require("express");
const estudantes = require("../repositorio/estudantes");
const empresas = require("../repositorio/empresas");
const assincrono = require("../assincrono");
const { semSenha } = require("../validacao");
const { verificarSenha, obterHashFalso, criarToken } = require("../autenticacao");

const router = express.Router();

// POST /api/auth/login  { email, senha, tipo: 'estudante' | 'empresa' }
// Resposta: { tipo, usuario, token }. O token é enviado nas chamadas seguintes,
// no cabeçalho "Authorization: Bearer <token>".
router.post("/login", assincrono(async (req, res) => {
  const { email, senha, tipo } = req.body;

  if (typeof email !== "string" || typeof senha !== "string" || !["estudante", "empresa"].includes(tipo)) {
    return res.status(400).json({ erro: "Informe email, senha e tipo (estudante ou empresa)." });
  }

  const repositorio = tipo === "empresa" ? empresas : estudantes;
  const usuario = await repositorio.buscarPorEmail(email);

  // Se o e-mail não existe, ainda confere uma senha falsa: o tempo de resposta fica o mesmo
  // e ninguém descobre quais e-mails estão cadastrados.
  const senhaCorreta = await verificarSenha(senha, usuario ? usuario.senha : await obterHashFalso());

  if (!usuario || !senhaCorreta) {
    return res.status(401).json({ erro: "E-mail ou senha inválidos." });
  }

  // nunca devolver a senha (nem o hash) na resposta
  res.json({ tipo, usuario: semSenha(usuario), token: criarToken({ id: usuario.id, tipo }) });
}));

module.exports = router;
