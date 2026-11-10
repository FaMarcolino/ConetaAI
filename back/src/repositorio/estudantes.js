// src/repositorio/estudantes.js
const { estudantes, gerarId } = require("../data");

async function listar() {
  return estudantes;
}

async function buscarPorId(id) {
  return estudantes.find((e) => e.id === id) || null;
}

async function buscarPorEmail(email) {
  return estudantes.find((e) => e.email.toLowerCase() === String(email).trim().toLowerCase()) || null;
}

async function criar(dados) {
  const novo = {
    id: gerarId("est"),
    nome: dados.nome,
    email: String(dados.email).trim().toLowerCase(),
    senha: dados.senha,
    curso: dados.curso,
    habilidades: dados.habilidades || [],
    areasInteresse: dados.areasInteresse || [],
    cidade: dados.cidade,
    modalidade: dados.modalidade,
    disponibilidadeMeses: dados.disponibilidadeMeses,
    previsaoConclusao: dados.previsaoConclusao || "",
  };
  estudantes.push(novo);
  return novo;
}

async function atualizar(id, campos) {
  const estudante = await buscarPorId(id);
  if (!estudante) return null;
  Object.assign(estudante, campos);
  return estudante;
}

module.exports = { listar, buscarPorId, buscarPorEmail, criar, atualizar };
