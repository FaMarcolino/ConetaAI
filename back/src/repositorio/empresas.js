// src/repositorio/empresas.js
const { empresas, gerarId } = require("../data");

async function buscarPorId(id) {
  return empresas.find((e) => e.id === id) || null;
}

async function buscarPorEmail(email) {
  return empresas.find((e) => e.email.toLowerCase() === String(email).trim().toLowerCase()) || null;
}

async function criar(dados) {
  const nova = {
    id: gerarId("emp"),
    nome: dados.nome,
    email: String(dados.email).trim().toLowerCase(),
    senha: dados.senha,
    setor: dados.setor,
    cidade: dados.cidade,
    descricao: dados.descricao || "",
    site: dados.site || "",
  };
  empresas.push(nova);
  return nova;
}

async function atualizar(id, campos) {
  const empresa = await buscarPorId(id);
  if (!empresa) return null;
  Object.assign(empresa, campos);
  return empresa;
}

module.exports = { buscarPorId, buscarPorEmail, criar, atualizar };
