// src/routes/empresas.js
const express = require("express");
const empresas = require("../repositorio/empresas");
const assincrono = require("../assincrono");
const { textoPreenchido, emailValido, semSenha } = require("../validacao");
const { gerarHash, criarToken, autenticar, exigirProprioPerfil } = require("../autenticacao");

const router = express.Router();

// POST /api/empresas - cadastro de uma nova empresa
router.post("/", assincrono(async (req, res) => {
  const { nome, email, senha, setor, cidade, descricao, site } = req.body;

  if (![nome, email, senha, setor, cidade].every(textoPreenchido)) {
    return res.status(400).json({ erro: "Preencha nome, e-mail, senha, setor e cidade." });
  }
  if (!emailValido(email)) return res.status(400).json({ erro: "Digite um e-mail válido." });
  if (senha.length < 6) return res.status(400).json({ erro: "A senha precisa de pelo menos 6 caracteres." });
  if (senha.length > 100) return res.status(400).json({ erro: "A senha pode ter no máximo 100 caracteres." });
  if (await empresas.buscarPorEmail(email)) {
    return res.status(409).json({ erro: "Já existe uma empresa cadastrada com esse e-mail." });
  }

  const nova = await empresas.criar({
    nome: nome.trim(),
    email,
    senha: await gerarHash(senha), // só o hash vai para o banco, nunca a senha
    setor: setor.trim(),
    cidade: cidade.trim(),
    descricao,
    site,
  });
  // quem acabou de se cadastrar já entra: recebe o token junto com o perfil
  res.status(201).json({ ...semSenha(nova), token: criarToken({ id: nova.id, tipo: "empresa" }) });
}));

// GET /api/empresas/:id - só a própria empresa vê a sua página
router.get("/:id", autenticar, exigirProprioPerfil("empresa"), assincrono(async (req, res) => {
  const empresa = await empresas.buscarPorId(req.params.id);
  if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada." });
  res.json(semSenha(empresa));
}));

// PUT /api/empresas/:id - atualiza a "página da empresa" (só a própria empresa)
router.put("/:id", autenticar, exigirProprioPerfil("empresa"), assincrono(async (req, res) => {
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
