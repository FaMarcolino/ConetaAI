// src/routes/estudantes.js
const express = require("express");
const estudantes = require("../repositorio/estudantes");
const cursos = require("../repositorio/cursos");
const tecnologias = require("../repositorio/tecnologias");
const assincrono = require("../assincrono");
const { MODALIDADES, textoPreenchido, emailValido, paraLista, semSenha } = require("../validacao");

const router = express.Router();

// Confere curso e habilidades contra os catálogos e devolve os nomes oficiais.
// Retorna { erro } se algo não existir.
async function resolverCursoEHabilidades(curso, habilidades) {
  const resultado = {};
  if (curso !== undefined) {
    const { nomes, invalidos } = await cursos.resolverNomes([curso]);
    if (invalidos.length) return { erro: `Curso inválido: ${invalidos.join(", ")}. Escolha um curso da lista.` };
    resultado.curso = nomes[0];
  }
  if (habilidades !== undefined) {
    const { nomes, invalidos } = await tecnologias.resolverNomes(paraLista(habilidades));
    if (invalidos.length) return { erro: `Tecnologia inválida: ${invalidos.join(", ")}. Escolha da lista.` };
    resultado.habilidades = nomes;
  }
  return resultado;
}

// POST /api/estudantes - cadastro de um novo estudante
router.post("/", assincrono(async (req, res) => {
  const { nome, email, senha, curso, cidade, modalidade, disponibilidadeMeses, habilidades } = req.body;

  if (![nome, email, senha, curso, cidade, modalidade].every(textoPreenchido)) {
    return res.status(400).json({ erro: "Preencha nome, e-mail, senha, curso, cidade e modalidade." });
  }
  if (!emailValido(email)) return res.status(400).json({ erro: "Digite um e-mail válido." });
  if (senha.length < 6) return res.status(400).json({ erro: "A senha precisa de pelo menos 6 caracteres." });
  if (!MODALIDADES.includes(modalidade)) return res.status(400).json({ erro: "Modalidade inválida." });
  const meses = Number(disponibilidadeMeses);
  if (!Number.isInteger(meses) || meses < 1) {
    return res.status(400).json({ erro: "Informe a disponibilidade em meses (número inteiro, mínimo 1)." });
  }
  if (await estudantes.buscarPorEmail(email)) {
    return res.status(409).json({ erro: "Já existe um estudante cadastrado com esse e-mail." });
  }

  const catalogo = await resolverCursoEHabilidades(curso, habilidades || []);
  if (catalogo.erro) return res.status(400).json({ erro: catalogo.erro });

  const novo = await estudantes.criar({
    nome: nome.trim(),
    email,
    senha,
    curso: catalogo.curso,
    habilidades: catalogo.habilidades,
    cidade: cidade.trim(),
    modalidade,
    disponibilidadeMeses: meses,
  });
  res.status(201).json(semSenha(novo));
}));

// GET /api/estudantes/:id
router.get("/:id", assincrono(async (req, res) => {
  const estudante = await estudantes.buscarPorId(req.params.id);
  if (!estudante) return res.status(404).json({ erro: "Estudante não encontrado." });
  res.json(semSenha(estudante));
}));

// PUT /api/estudantes/:id  - atualiza os campos do perfil (currículo, habilidades, etc.)
router.put("/:id", assincrono(async (req, res) => {
  const estudante = await estudantes.buscarPorId(req.params.id);
  if (!estudante) return res.status(404).json({ erro: "Estudante não encontrado." });

  const camposPermitidos = [
    "nome", "areasInteresse", "cidade", "modalidade", "disponibilidadeMeses", "previsaoConclusao",
  ];
  const alteracoes = {};
  camposPermitidos.forEach((campo) => {
    if (req.body[campo] !== undefined) alteracoes[campo] = req.body[campo];
  });

  if (alteracoes.modalidade !== undefined && !MODALIDADES.includes(alteracoes.modalidade)) {
    return res.status(400).json({ erro: "Modalidade inválida." });
  }

  const catalogo = await resolverCursoEHabilidades(req.body.curso, req.body.habilidades);
  if (catalogo.erro) return res.status(400).json({ erro: catalogo.erro });
  Object.assign(alteracoes, catalogo);

  const atualizado = await estudantes.atualizar(req.params.id, alteracoes);
  res.json(semSenha(atualizado));
}));

module.exports = router;
