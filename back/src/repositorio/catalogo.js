// src/repositorio/catalogo.js
// Fábrica de repositório para listas fechadas (cursos e tecnologias).
const { consulta } = require("../db");
const { normalizar } = require("../validacao");

// "tabela" vem sempre do código (cursos.js / tecnologias.js), nunca do usuário.
function criarRepositorioCatalogo(tabela) {
  async function listar() {
    const resposta = await consulta(`SELECT id, nome FROM ${tabela} ORDER BY id`);
    return resposta.rows;
  }

  // Converte os nomes recebidos para o nome oficial do catálogo (ignorando maiúsculas e acentos).
  // Devolve { nomes: [...oficiais, sem repetição], invalidos: [...não encontrados] }.
  async function resolverNomes(nomesRecebidos) {
    const catalogo = await listar();
    const nomes = [];
    const invalidos = [];
    nomesRecebidos.forEach((recebido) => {
      const achado = catalogo.find((item) => normalizar(item.nome) === normalizar(recebido));
      if (!achado) invalidos.push(recebido);
      else if (!nomes.includes(achado.nome)) nomes.push(achado.nome);
    });
    return { nomes, invalidos };
  }

  return { listar, resolverNomes };
}

module.exports = { criarRepositorioCatalogo };
