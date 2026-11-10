// src/repositorio/catalogo.js
// Fábrica de repositório para listas fechadas (cursos e tecnologias).
const { normalizar } = require("../validacao");

function criarRepositorioCatalogo(lista) {
  async function listar() {
    return lista.map((item) => ({ ...item }));
  }

  // Converte os nomes recebidos para o nome oficial do catálogo.
  // Devolve { nomes: [...oficiais, sem repetição], invalidos: [...não encontrados] }.
  async function resolverNomes(nomesRecebidos) {
    const nomes = [];
    const invalidos = [];
    nomesRecebidos.forEach((recebido) => {
      const achado = lista.find((item) => normalizar(item.nome) === normalizar(recebido));
      if (!achado) invalidos.push(recebido);
      else if (!nomes.includes(achado.nome)) nomes.push(achado.nome);
    });
    return { nomes, invalidos };
  }

  return { listar, resolverNomes };
}

module.exports = { criarRepositorioCatalogo };
