// src/routes/vagas.js
// Todas as rotas exigem login. Quem está chamando vem do TOKEN (req.usuario), nunca de um
// id digitado no corpo ou na URL.
const express = require("express");
const vagas = require("../repositorio/vagas");
const estudantes = require("../repositorio/estudantes");
const empresas = require("../repositorio/empresas");
const cursos = require("../repositorio/cursos");
const tecnologias = require("../repositorio/tecnologias");
const likes = require("../repositorio/likes");
const assincrono = require("../assincrono");
const { calcularCompatibilidade } = require("../matchLogic");
const { MODALIDADES, STATUS_VAGA, textoPreenchido, paraLista, semSenha } = require("../validacao");
const { autenticar, exigirTipo, mesmoId } = require("../autenticacao");

const router = express.Router();

router.use(autenticar);

// GET /api/vagas
// Filtros opcionais: empresaId, status, cidade, modalidade, tecnologia, q (cargo/empresa)
// estudanteId  -> cada vaga vem com o score de compatibilidade e a flag "curtida"
//                 (só o próprio estudante pode pedir o score dele)
// empresaId    -> só as vagas da empresa (só a própria empresa)
// feed=1       -> modo "swipe": só vagas Ativas que o estudante ainda não curtiu
// ordenar=compatibilidade -> do maior para o menor score (precisa de estudanteId)
router.get("/", assincrono(async (req, res) => {
  const { estudanteId, empresaId, status, cidade, modalidade, tecnologia, q, feed, ordenar } = req.query;

  if (estudanteId !== undefined && !(req.usuario.tipo === "estudante" && mesmoId(req.usuario.id, estudanteId))) {
    return res.status(403).json({ erro: "Você só pode consultar a compatibilidade do seu próprio perfil." });
  }
  if (empresaId !== undefined && !(req.usuario.tipo === "empresa" && mesmoId(req.usuario.id, empresaId))) {
    return res.status(403).json({ erro: "Você só pode listar as vagas da sua própria empresa." });
  }

  const estudante = estudanteId ? await estudantes.buscarPorId(estudanteId) : null;

  let lista = await vagas.listar({
    empresaId,
    status: feed === "1" ? "Ativa" : status,
    cidade,
    modalidade,
    tecnologia,
    q,
  });

  let idsCurtidos = new Set();
  if (estudante) {
    const curtidas = await likes.listar({ origem: "estudante", estudanteId: estudante.id });
    idsCurtidos = new Set(curtidas.map((l) => l.vagaId));
  }
  if (feed === "1") lista = lista.filter((v) => !idsCurtidos.has(v.id));

  if (!estudante) return res.json(lista);

  lista = lista.map((vaga) => ({
    ...vaga,
    compatibilidade: calcularCompatibilidade(estudante, vaga),
    curtida: idsCurtidos.has(vaga.id),
  }));
  if (ordenar === "compatibilidade") lista.sort((a, b) => b.compatibilidade.final - a.compatibilidade.final);

  res.json(lista);
}));

// GET /api/vagas/:id
router.get("/:id", assincrono(async (req, res) => {
  const vaga = await vagas.buscarPorId(req.params.id);
  if (!vaga) return res.status(404).json({ erro: "Vaga não encontrada." });
  res.json(vaga);
}));

// POST /api/vagas - a empresa logada publica uma nova vaga (a dona é sempre quem está logado)
router.post("/", exigirTipo("empresa"), assincrono(async (req, res) => {
  const { cargo, cursoDesejado, tecnologias: tecnologiasRecebidas, cidade, modalidade, faixaSalarial, periodoMinimoMeses } = req.body;

  if (req.body.empresaId !== undefined && !mesmoId(req.body.empresaId, req.usuario.id)) {
    return res.status(403).json({ erro: "Você só pode publicar vagas em nome da sua própria empresa." });
  }
  if (!textoPreenchido(cargo) || !modalidade) {
    return res.status(400).json({ erro: "Campos obrigatórios: cargo, cursoDesejado, modalidade." });
  }
  if (!(await empresas.buscarPorId(req.usuario.id))) return res.status(404).json({ erro: "Empresa não encontrada." });
  if (!MODALIDADES.includes(modalidade)) return res.status(400).json({ erro: "Modalidade inválida." });

  const cursosPedidos = paraLista(cursoDesejado);
  if (!cursosPedidos.length) return res.status(400).json({ erro: "Escolha pelo menos um curso aceito." });
  const resolvidosCursos = await cursos.resolverNomes(cursosPedidos);
  if (resolvidosCursos.invalidos.length) {
    return res.status(400).json({ erro: `Curso inválido: ${resolvidosCursos.invalidos.join(", ")}.` });
  }
  const resolvidasTecnologias = await tecnologias.resolverNomes(paraLista(tecnologiasRecebidas));
  if (resolvidasTecnologias.invalidos.length) {
    return res.status(400).json({ erro: `Tecnologia inválida: ${resolvidasTecnologias.invalidos.join(", ")}.` });
  }

  const nova = await vagas.criar({
    empresaId: req.usuario.id,
    cargo: cargo.trim(),
    cursoDesejado: resolvidosCursos.nomes,
    tecnologias: resolvidasTecnologias.nomes,
    cidade: (cidade || "").trim(),
    modalidade,
    faixaSalarial: faixaSalarial || "",
    periodoMinimoMeses: Number(periodoMinimoMeses) || 6,
  });
  res.status(201).json(nova);
}));

// Confere se a vaga existe e é da empresa logada. Devolve a vaga, ou já responde com o
// erro (404 ou 403) e devolve null.
async function exigirVagaDaEmpresa(req, res, mensagem403) {
  const vaga = await vagas.buscarPorId(req.params.id);
  if (!vaga) {
    res.status(404).json({ erro: "Vaga não encontrada." });
    return null;
  }
  if (req.usuario.tipo !== "empresa" || !mesmoId(vaga.empresaId, req.usuario.id)) {
    res.status(403).json({ erro: mensagem403 || "Só a empresa dona da vaga pode fazer isso." });
    return null;
  }
  return vaga;
}

// PUT /api/vagas/:id/status  { status: 'Ativa' | 'Encerrada' }  (só a empresa dona)
router.put("/:id/status", assincrono(async (req, res) => {
  const vaga = await exigirVagaDaEmpresa(req, res, "Só a empresa dona da vaga pode alterá-la.");
  if (!vaga) return;
  if (!STATUS_VAGA.includes(req.body.status)) {
    return res.status(400).json({ erro: `status precisa ser um destes: ${STATUS_VAGA.join(", ")}.` });
  }
  res.json(await vagas.atualizarStatus(vaga.id, req.body.status));
}));

// DELETE /api/vagas/:id - exclui a vaga e suas curtidas, matches e mensagens (só a empresa dona)
router.delete("/:id", assincrono(async (req, res) => {
  const vaga = await exigirVagaDaEmpresa(req, res, "Só a empresa dona da vaga pode excluí-la.");
  if (!vaga) return;
  await vagas.excluir(vaga.id);
  res.status(204).end();
}));

// GET /api/vagas/:id/candidatos - estudantes compatíveis com a vaga, do maior pro menor score
// (só a empresa dona da vaga vê os candidatos dela)
// ?scoreMinimo=50 filtra por score; ?ocultarCurtidos=1 esconde quem a empresa já curtiu nessa vaga
router.get("/:id/candidatos", assincrono(async (req, res) => {
  const vaga = await exigirVagaDaEmpresa(req, res, "Só a empresa dona da vaga vê os candidatos dela.");
  if (!vaga) return;

  const scoreMinimo = Number(req.query.scoreMinimo) || 0;

  let idsCurtidos = new Set();
  if (req.query.ocultarCurtidos === "1") {
    const curtidas = await likes.listar({ origem: "empresa", vagaId: vaga.id });
    idsCurtidos = new Set(curtidas.map((l) => l.estudanteId));
  }

  const todos = await estudantes.listar();
  const candidatos = todos
    .filter((estudante) => !idsCurtidos.has(estudante.id))
    .map((estudante) => ({ ...semSenha(estudante), compatibilidade: calcularCompatibilidade(estudante, vaga) }))
    .filter((c) => c.compatibilidade.final >= scoreMinimo)
    .sort((a, b) => b.compatibilidade.final - a.compatibilidade.final);

  res.json(candidatos);
}));

module.exports = router;
