/* =========================================================================
   CONFIGURAÇÃO DA API
   ========================================================================= */
const API_BASE = "http://localhost:3000/api";

async function apiFetch(caminho, opcoes = {}) {
  const cabecalhos = { "Content-Type": "application/json" };
  // depois do login, todas as chamadas levam o token que identifica quem está logado
  if (sessao.token) cabecalhos.Authorization = `Bearer ${sessao.token}`;

  const resposta = await fetch(`${API_BASE}${caminho}`, { ...opcoes, headers: cabecalhos });
  const dados = await resposta.json().catch(() => ({}));

  // token vencido ou inválido (por exemplo, depois de reiniciar a API): volta para o login
  if (resposta.status === 401 && sessao.token) {
    sessao.tipo = null;
    sessao.usuario = null;
    sessao.token = null;
    irPara("tela-login");
  }
  if (!resposta.ok) throw new Error(dados.erro || "Erro ao falar com o servidor.");
  return dados;
}

function rotuloModalidade(m) { return { presencial: "Presencial", remoto: "Remoto", hibrido: "Híbrido" }[m] || m; }

/* =========================================================================
   CATÁLOGOS (cursos e tecnologias são listas fechadas vindas do banco)
   ========================================================================= */
const catalogos = { cursos: [], tecnologias: [] };

async function carregarCatalogos() {
  try {
    const [cursos, tecnologias] = await Promise.all([apiFetch("/cursos"), apiFetch("/tecnologias")]);
    catalogos.cursos = cursos.map((c) => c.nome);
    catalogos.tecnologias = tecnologias.map((t) => t.nome);
  } catch (erro) {
    mostrarToast("Não foi possível carregar cursos e tecnologias. O servidor está no ar?");
  }
  preencherFiltrosFixos();
}

// preenche um <select> com as opções; "placeholder" vira a primeira opção vazia
function preencherSelect(idSelect, opcoes, placeholder) {
  const select = document.getElementById(idSelect);
  const valorAtual = select.value;
  select.innerHTML =
    (placeholder !== undefined ? `<option value="">${escaparHtml(placeholder)}</option>` : "") +
    opcoes.map((o) => `<option value="${escaparHtml(o)}">${escaparHtml(o)}</option>`).join("");
  if (opcoes.includes(valorAtual)) select.value = valorAtual;
}

function preencherFiltrosFixos() {
  preencherSelect("cadEstCurso", catalogos.cursos, "Selecione seu curso");
  preencherSelect("perfilCurso", catalogos.cursos);
  preencherSelect("buscaTecnologia", catalogos.tecnologias, "Todas");
  renderizarChips("cadEstHabilidades", catalogos.tecnologias, []);
}

// "chips" = botões de múltipla escolha. Marcados ficam com a classe "ativo".
function renderizarChips(idContainer, opcoes, selecionadas) {
  const container = document.getElementById(idContainer);
  if (!opcoes.length) {
    container.innerHTML = `<span class="chips-vazio">Lista indisponível.</span>`;
    return;
  }
  const marcadas = selecionadas.map((s) => s.toLowerCase());
  container.innerHTML = opcoes.map((o) =>
    `<button type="button" class="chip ${marcadas.includes(o.toLowerCase()) ? "ativo" : ""}" data-valor="${escaparHtml(o)}">${escaparHtml(o)}</button>`
  ).join("");
  container.querySelectorAll(".chip").forEach((chip) => {
    chip.onclick = () => chip.classList.toggle("ativo");
  });
}

function lerChips(idContainer) {
  return [...document.querySelectorAll(`#${idContainer} .chip.ativo`)].map((c) => c.dataset.valor);
}

/* =========================================================================
   ESTADO GLOBAL
   ========================================================================= */
let papelSelecionadoNoLogin = "estudante";

const sessao = { tipo: null, usuario: null, token: null }; // preenchido depois do login

const estado = {
  vagasCache: [],
  indiceVagas: 0,
  vagasEmpresaCache: [],
  candidatosCache: [],
  indiceCandidatos: 0,
  vagaSelecionada: null,
  conversaAtual: null,
  origemUltimoChat: null,
  contextoUltimoMatch: null,
  feedDesatualizado: false,
};

/* =========================================================================
   NAVEGAÇÃO GERAL
   ========================================================================= */
function irPara(idTela) {
  document.querySelectorAll(".tela").forEach((t) => t.classList.remove("ativa"));
  document.getElementById(idTela).classList.add("ativa");
}

function mostrarToast(texto) {
  const toast = document.getElementById("toast");
  toast.textContent = texto;
  toast.classList.add("ativo");
  setTimeout(() => toast.classList.remove("ativo"), 2800);
}

/* =========================================================================
   LOGIN
   ========================================================================= */
document.getElementById("tipoEstudante").onclick = () => alternarTipoLogin("tipoEstudante");
document.getElementById("tipoEmpresa").onclick = () => alternarTipoLogin("tipoEmpresa");
function alternarTipoLogin(id) {
  papelSelecionadoNoLogin = id === "tipoEstudante" ? "estudante" : "empresa";
  document.getElementById("tipoEstudante").classList.toggle("selecionado", id === "tipoEstudante");
  document.getElementById("tipoEmpresa").classList.toggle("selecionado", id === "tipoEmpresa");
}

document.getElementById("formLogin").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email");
  const senha = document.getElementById("senha");
  const campoEmail = document.getElementById("campoEmail");
  const campoSenha = document.getElementById("campoSenha");

  const emailValido = /\S+@\S+\.\S+/.test(email.value);
  const senhaValida = senha.value.length >= 6;
  campoEmail.classList.toggle("invalido", !emailValido);
  campoSenha.classList.toggle("invalido", !senhaValida);
  if (!emailValido || !senhaValida) return;

  try {
    const resposta = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: email.value, senha: senha.value, tipo: papelSelecionadoNoLogin }),
    });
    await entrarNaApp(resposta.tipo, resposta.usuario, resposta.token);
  } catch (erro) {
    mostrarToast(erro.message);
  }
});

// Usado pelo login e também pelo cadastro (que já entra direto na conta criada)
async function entrarNaApp(tipo, usuario, token) {
  sessao.tipo = tipo;
  sessao.usuario = usuario;
  sessao.token = token;
  const inicial = usuario.nome.charAt(0).toUpperCase();

  if (tipo === "estudante") {
    document.getElementById("avatarEstudante").textContent = inicial;
    irPara("tela-estudante");
    await iniciarAreaEstudante();
  } else {
    document.getElementById("avatarEmpresa").textContent = inicial;
    irPara("tela-empresa");
    await iniciarAreaEmpresa();
  }
}

// sair apaga o token da memória: sem ele, a API recusa qualquer chamada
document.querySelectorAll("[data-sair]").forEach((b) => (b.onclick = () => {
  sessao.tipo = null;
  sessao.usuario = null;
  sessao.token = null;
  irPara("tela-login");
}));

/* =========================================================================
   CADASTRO (estudante e empresa)
   ========================================================================= */
document.getElementById("linkCadastro").onclick = (e) => {
  e.preventDefault();
  irPara("tela-cadastro");
  if (!catalogos.cursos.length) carregarCatalogos(); // tenta de novo se o servidor estava fora do ar
};
document.getElementById("linkVoltarLogin").onclick = (e) => {
  e.preventDefault();
  irPara("tela-login");
};

function alternarTipoCadastro(tipo) {
  document.getElementById("cadTipoEstudante").classList.toggle("selecionado", tipo === "estudante");
  document.getElementById("cadTipoEmpresa").classList.toggle("selecionado", tipo === "empresa");
  document.getElementById("formCadastroEstudante").style.display = tipo === "estudante" ? "block" : "none";
  document.getElementById("formCadastroEmpresa").style.display = tipo === "empresa" ? "block" : "none";
}
document.getElementById("cadTipoEstudante").onclick = () => alternarTipoCadastro("estudante");
document.getElementById("cadTipoEmpresa").onclick = () => alternarTipoCadastro("empresa");

document.getElementById("formCadastroEstudante").addEventListener("submit", async (e) => {
  e.preventDefault();
  const corpo = {
    nome: document.getElementById("cadEstNome").value,
    email: document.getElementById("cadEstEmail").value,
    senha: document.getElementById("cadEstSenha").value,
    curso: document.getElementById("cadEstCurso").value,
    cidade: document.getElementById("cadEstCidade").value,
    modalidade: document.getElementById("cadEstModalidade").value,
    disponibilidadeMeses: Number(document.getElementById("cadEstDisponibilidade").value),
    habilidades: lerChips("cadEstHabilidades"),
  };
  try {
    const novo = await apiFetch("/estudantes", { method: "POST", body: JSON.stringify(corpo) });
    mostrarToast("Conta criada! Bem-vindo(a), " + novo.nome.split(" ")[0] + ".");
    e.target.reset();
    renderizarChips("cadEstHabilidades", catalogos.tecnologias, []);
    const { token, ...perfil } = novo; // o cadastro já devolve o token: a pessoa entra direto
    await entrarNaApp("estudante", perfil, token);
  } catch (erro) {
    mostrarToast(erro.message);
  }
});

document.getElementById("formCadastroEmpresa").addEventListener("submit", async (e) => {
  e.preventDefault();
  const corpo = {
    nome: document.getElementById("cadEmpNome").value,
    email: document.getElementById("cadEmpEmail").value,
    senha: document.getElementById("cadEmpSenha").value,
    setor: document.getElementById("cadEmpSetor").value,
    cidade: document.getElementById("cadEmpCidade").value,
  };
  try {
    const nova = await apiFetch("/empresas", { method: "POST", body: JSON.stringify(corpo) });
    mostrarToast("Conta criada! Bem-vindo(a), " + nova.nome + ".");
    e.target.reset();
    const { token, ...perfil } = nova; // o cadastro já devolve o token: a pessoa entra direto
    await entrarNaApp("empresa", perfil, token);
  } catch (erro) {
    mostrarToast(erro.message);
  }
});

/* =========================================================================
   ABAS
   ========================================================================= */
document.querySelectorAll("[data-aba-estudante]").forEach((botao) => {
  botao.addEventListener("click", async () => {
    document.querySelectorAll("[data-aba-estudante]").forEach((b) => b.classList.remove("selecionada"));
    botao.classList.add("selecionada");
    const aba = botao.dataset.abaEstudante;
    document.getElementById("painelEstudanteSwipe").style.display = aba === "swipe" ? "block" : "none";
    document.getElementById("painelEstudanteBusca").style.display = aba === "busca" ? "block" : "none";
    document.getElementById("painelEstudanteMatches").style.display = aba === "matches" ? "block" : "none";
    document.getElementById("painelEstudantePerfil").style.display = aba === "perfil" ? "block" : "none";
    if (aba === "swipe" && estado.feedDesatualizado) {
      // o estudante curtiu vagas pela busca: o feed precisa esconder essas vagas
      estado.feedDesatualizado = false;
      estado.indiceVagas = 0;
      await carregarVagasEstudante();
      renderizarSwipeEstudante();
    }
    if (aba === "busca") await buscarVagas();
    if (aba === "matches") await renderizarMatchesEstudante();
    if (aba === "perfil") await preencherFormularioEstudante();
  });
});

document.querySelectorAll("[data-aba-empresa]").forEach((botao) => {
  botao.addEventListener("click", async () => {
    document.querySelectorAll("[data-aba-empresa]").forEach((b) => b.classList.remove("selecionada"));
    botao.classList.add("selecionada");
    const aba = botao.dataset.abaEmpresa;
    document.getElementById("painelEmpresaHome").style.display = aba === "home" ? "block" : "none";
    document.getElementById("painelEmpresaSwipe").style.display = "none";
    document.getElementById("painelEmpresaMatches").style.display = aba === "matches" ? "block" : "none";
    document.getElementById("painelEmpresaPerfil").style.display = aba === "perfil" ? "block" : "none";
    if (aba === "home") await renderizarHomeEmpresa();
    if (aba === "matches") await renderizarMatchesEmpresa();
    if (aba === "perfil") await preencherFormularioEmpresa();
  });
});

/* =========================================================================
   ÁREA ESTUDANTE
   ========================================================================= */
async function iniciarAreaEstudante() {
  estado.indiceVagas = 0;
  await carregarVagasEstudante();
  renderizarSwipeEstudante();
}

async function carregarVagasEstudante() {
  try {
    // feed=1: só vagas ativas que ainda não foram curtidas por este estudante
    estado.vagasCache = await apiFetch(`/vagas?estudanteId=${sessao.usuario.id}&feed=1`);
  } catch (erro) {
    mostrarToast(erro.message);
    estado.vagasCache = [];
  }
}

function renderizarSwipeEstudante() {
  const stage = document.getElementById("stageEstudante");
  const controles = document.getElementById("controlesEstudante");
  stage.innerHTML = "";

  if (estado.indiceVagas >= estado.vagasCache.length) {
    controles.style.display = "none";
    stage.innerHTML = `<div class="vazio"><h3>Sem mais vagas por agora</h3>
      <p>Volte mais tarde ou ajuste suas áreas de interesse.</p>
      <button id="reiniciarEstudante">Ver vagas novamente</button></div>`;
    document.getElementById("reiniciarEstudante").onclick = async () => {
      estado.indiceVagas = 0;
      controles.style.display = "flex";
      await carregarVagasEstudante();
      renderizarSwipeEstudante();
    };
    return;
  }
  controles.style.display = "flex";

  [1, 0].forEach((offset) => {
    const i = estado.indiceVagas + offset;
    if (i >= estado.vagasCache.length) return;
    const vaga = estado.vagasCache[i];
    const compat = vaga.compatibilidade || { final: 0, detalhamento: {}, tecnologiasEmComum: [] };
    const card = document.createElement("div");
    card.className = "card";
    card.style.setProperty("--score", compat.final);
    card.setAttribute("data-score", compat.final);
    card.style.zIndex = offset === 0 ? 2 : 1;
    card.style.transform = offset === 0 ? "translateY(0) scale(1)" : "translateY(10px) scale(.96)";
    card.style.opacity = offset === 0 ? "1" : ".7";
    card.innerHTML = `
      <div class="tag-secundaria">${escaparHtml(vaga.empresa)}</div>
      <h2>${escaparHtml(vaga.cargo)}</h2>
      <div class="local">${escaparHtml(vaga.cidade)} · ${rotuloModalidade(vaga.modalidade)}</div>
      <div class="badge-ok ${compat.detalhamento.curso === 100 ? "" : "fora"}">${compat.detalhamento.curso === 100 ? "✓ Aceita seu curso" : "Curso fora do perfil da vaga"}</div>
      <div class="detalhe-linha"><span>Faixa salarial</span><strong>${escaparHtml(vaga.faixaSalarial || "A combinar")}</strong></div>
      <div class="detalhe-linha"><span>Período mínimo</span><strong>${vaga.periodoMinimoMeses} meses</strong></div>
      <div class="tags">${vaga.tecnologias.map((t) => `<span class="tag ${compat.tecnologiasEmComum.includes(t) ? "match" : ""}">${escaparHtml(t)}</span>`).join("")}</div>
      <div class="barra-compat"><div class="label"><span>Compatibilidade</span><span>${compat.final}%</span></div>
        <div class="trilho"><div class="preenchido" style="width:${compat.final}%"></div></div></div>`;
    stage.appendChild(card);
  });

  ativarArraste(stage, decidirEstudante);
}

async function decidirEstudante(gostou) {
  const vaga = estado.vagasCache[estado.indiceVagas];
  animarSaidaCartaTopo(document.getElementById("stageEstudante"), gostou, async () => {
    estado.indiceVagas++;
    if (!gostou) { renderizarSwipeEstudante(); return; }

    try {
      const resposta = await apiFetch("/likes", {
        method: "POST",
        body: JSON.stringify({ origem: "estudante", estudanteId: sessao.usuario.id, vagaId: vaga.id }),
      });
      if (resposta.houveMatch) {
        mostrarMatch(
          `Você e a ${vaga.empresa} deram match! Que tal conversar sobre a vaga de ${vaga.cargo.replace("Estágio em ", "")}?`,
          { chave: resposta.match.id, nome: vaga.empresa, contexto: vaga.cargo, origem: "estudante" }
        );
      } else {
        renderizarSwipeEstudante();
      }
    } catch (erro) {
      mostrarToast(erro.message);
      renderizarSwipeEstudante();
    }
  });
}
document.getElementById("btnPassarEstudante").onclick = () => decidirEstudante(false);
document.getElementById("btnCurtirEstudante").onclick = () => decidirEstudante(true);

/* =========================================================================
   BUSCA DE VAGAS (estudante)
   ========================================================================= */
async function buscarVagas() {
  const filtros = new URLSearchParams({ estudanteId: sessao.usuario.id, ordenar: "compatibilidade", status: "Ativa" });
  const campos = {
    q: document.getElementById("buscaTexto").value.trim(),
    cidade: document.getElementById("buscaCidade").value.trim(),
    modalidade: document.getElementById("buscaModalidade").value,
    tecnologia: document.getElementById("buscaTecnologia").value,
  };
  Object.entries(campos).forEach(([chave, valor]) => { if (valor) filtros.set(chave, valor); });

  const lista = document.getElementById("listaBusca");
  let vagas = [];
  try {
    vagas = await apiFetch(`/vagas?${filtros.toString()}`);
  } catch (erro) {
    mostrarToast(erro.message);
  }

  document.getElementById("resumoBusca").textContent =
    vagas.length === 1 ? "1 vaga encontrada" : `${vagas.length} vagas encontradas`;

  if (!vagas.length) {
    lista.innerHTML = `<div class="estado-vazio-simples">Nenhuma vaga encontrada com esses filtros.</div>`;
    return;
  }

  lista.innerHTML = vagas.map((v) => {
    const compat = v.compatibilidade;
    return `
      <div class="vaga-item">
        <div class="info">
          <h4>${escaparHtml(v.cargo)}</h4>
          <div class="meta">${escaparHtml(v.empresa)} · ${escaparHtml(v.cidade || "Sem cidade")} · ${rotuloModalidade(v.modalidade)}
            · ${escaparHtml(v.faixaSalarial || "Salário a combinar")} · mín. ${v.periodoMinimoMeses} meses</div>
          <div class="tags">${v.tecnologias.map((t) => `<span class="tag ${compat.tecnologiasEmComum.includes(t) ? "match" : ""}">${escaparHtml(t)}</span>`).join("")}</div>
        </div>
        <div class="acao">
          <span class="pill-score">${compat.final}% compatível</span>
          ${v.curtida
            ? `<button class="botao-contorno botao-curtido" disabled>♥ Curtida</button>`
            : `<button class="botao-contorno" data-curtir-busca="${escaparHtml(v.id)}">♥ Curtir</button>`}
        </div>
      </div>`;
  }).join("");

  lista.querySelectorAll("[data-curtir-busca]").forEach((botao) => {
    botao.addEventListener("click", () => curtirPelaBusca(botao.dataset.curtirBusca, vagas));
  });
}

async function curtirPelaBusca(vagaId, vagas) {
  const vaga = vagas.find((v) => String(v.id) === String(vagaId));
  try {
    const resposta = await apiFetch("/likes", {
      method: "POST",
      body: JSON.stringify({ origem: "estudante", estudanteId: sessao.usuario.id, vagaId }),
    });
    estado.feedDesatualizado = true;
    await buscarVagas();
    if (resposta.houveMatch) {
      mostrarMatch(
        `Você e a ${vaga.empresa} deram match! Que tal conversar sobre a vaga de ${vaga.cargo.replace("Estágio em ", "")}?`,
        { chave: resposta.match.id, nome: vaga.empresa, contexto: vaga.cargo, origem: "estudante" }
      );
    } else {
      mostrarToast("Vaga curtida! Se a empresa curtir você de volta, dá match.");
    }
  } catch (erro) {
    mostrarToast(erro.message);
  }
}

document.getElementById("formBusca").addEventListener("submit", (e) => { e.preventDefault(); buscarVagas(); });
document.getElementById("limparBusca").onclick = () => {
  document.getElementById("formBusca").reset();
  buscarVagas();
};

async function renderizarMatchesEstudante() {
  const lista = document.getElementById("listaMatchesEstudante");
  let matches = [];
  try {
    matches = await apiFetch(`/matches?estudanteId=${sessao.usuario.id}`);
  } catch (erro) {
    mostrarToast(erro.message);
  }

  if (!matches.length) {
    lista.innerHTML = `<div class="estado-vazio-simples">Você ainda não deu nenhum match. Continue curtindo vagas na aba "Vagas".</div>`;
    return;
  }

  lista.innerHTML = matches.map((m) => `
    <div class="match-item" style="cursor:pointer;" data-match-id="${escaparHtml(m.id)}" data-nome="${escaparHtml(m.vaga.empresa)}" data-contexto="${escaparHtml(m.vaga.cargo)}">
      <div class="info"><h4>${escaparHtml(m.vaga.empresa)}</h4><div class="meta">${escaparHtml(m.vaga.cargo)}</div></div>
    </div>`).join("");

  lista.querySelectorAll("[data-match-id]").forEach((item) => {
    item.addEventListener("click", () => {
      abrirChat(item.dataset.matchId, item.dataset.nome, item.dataset.contexto, "estudante");
    });
  });
}

/* =========================================================================
   PERFIL DO ESTUDANTE
   ========================================================================= */
async function preencherFormularioEstudante() {
  let estudante;
  try {
    estudante = await apiFetch(`/estudantes/${sessao.usuario.id}`);
  } catch (erro) {
    mostrarToast(erro.message);
    return;
  }
  document.getElementById("perfilNome").value = estudante.nome;
  document.getElementById("perfilCurso").value = estudante.curso;
  document.getElementById("perfilConclusao").value = estudante.previsaoConclusao;
  renderizarChips("perfilHabilidades", catalogos.tecnologias, estudante.habilidades);
  document.getElementById("perfilInteresses").value = estudante.areasInteresse.join(", ");
  document.getElementById("perfilCidade").value = estudante.cidade;
  document.getElementById("perfilModalidade").value = estudante.modalidade;
  document.getElementById("perfilDisponibilidade").value = estudante.disponibilidadeMeses;
}

document.getElementById("formPerfilEstudante").addEventListener("submit", async (e) => {
  e.preventDefault();
  const corpo = {
    nome: document.getElementById("perfilNome").value,
    curso: document.getElementById("perfilCurso").value,
    previsaoConclusao: document.getElementById("perfilConclusao").value,
    habilidades: lerChips("perfilHabilidades"),
    areasInteresse: document.getElementById("perfilInteresses").value.split(",").map((s) => s.trim()).filter(Boolean),
    cidade: document.getElementById("perfilCidade").value,
    modalidade: document.getElementById("perfilModalidade").value,
    disponibilidadeMeses: Number(document.getElementById("perfilDisponibilidade").value) || undefined,
  };
  try {
    await apiFetch(`/estudantes/${sessao.usuario.id}`, { method: "PUT", body: JSON.stringify(corpo) });
    mostrarToast("Perfil atualizado.");
    estado.indiceVagas = 0;
    await carregarVagasEstudante(); // recalcula o feed com o novo perfil
  } catch (erro) {
    mostrarToast(erro.message);
  }
});

/* =========================================================================
   ÁREA EMPRESA — home
   ========================================================================= */
async function iniciarAreaEmpresa() {
  await renderizarHomeEmpresa();
}

async function renderizarHomeEmpresa() {
  const lista = document.getElementById("listaVagasEmpresa");
  try {
    estado.vagasEmpresaCache = await apiFetch(`/vagas?empresaId=${sessao.usuario.id}`);
  } catch (erro) {
    mostrarToast(erro.message);
    estado.vagasEmpresaCache = [];
  }

  const vagasAtivas = estado.vagasEmpresaCache.filter((v) => v.status === "Ativa");
  document.getElementById("statVagasAtivas").textContent = vagasAtivas.length;

  const linhasComCandidatos = await Promise.all(
    estado.vagasEmpresaCache.map(async (v) => {
      const ativa = v.status === "Ativa";
      let qtd = 0;
      if (ativa) {
        try {
          const candidatos = await apiFetch(`/vagas/${v.id}/candidatos?scoreMinimo=50&ocultarCurtidos=1`);
          qtd = candidatos.length;
        } catch (_) {}
      }
      return `
        <div class="vaga-item">
          <div class="info">
            <h4>${escaparHtml(v.cargo)} <span class="status-pill ${ativa ? "" : "encerrada"}">${escaparHtml(v.status)}</span></h4>
            <div class="meta">${rotuloModalidade(v.modalidade)} · ${escaparHtml(v.cidade || "Sem cidade")}</div>
          </div>
          <div class="acao">
            ${ativa ? `<div class="candidatos-badge"><strong>${qtd}</strong>compatíveis</div>
              <button class="botao-contorno" data-ver-candidatos="${escaparHtml(v.id)}">Ver candidatos</button>` : ""}
            <button class="botao-contorno" data-alterar-status="${escaparHtml(v.id)}" data-novo-status="${ativa ? "Encerrada" : "Ativa"}">${ativa ? "Encerrar" : "Reativar"}</button>
            <button class="botao-perigo" data-excluir-vaga="${escaparHtml(v.id)}">Excluir</button>
          </div>
        </div>`;
    })
  );
  lista.innerHTML = linhasComCandidatos.join("") ||
    `<div class="estado-vazio-simples">Você ainda não publicou nenhuma vaga.</div>`;

  lista.querySelectorAll("[data-alterar-status]").forEach((botao) => {
    botao.addEventListener("click", async () => {
      try {
        await apiFetch(`/vagas/${botao.dataset.alterarStatus}/status`, {
          method: "PUT",
          body: JSON.stringify({ empresaId: sessao.usuario.id, status: botao.dataset.novoStatus }),
        });
        mostrarToast(botao.dataset.novoStatus === "Ativa" ? "Vaga reativada." : "Vaga encerrada.");
        await renderizarHomeEmpresa();
      } catch (erro) {
        mostrarToast(erro.message);
      }
    });
  });

  lista.querySelectorAll("[data-excluir-vaga]").forEach((botao) => {
    botao.addEventListener("click", async () => {
      const vaga = estado.vagasEmpresaCache.find((v) => String(v.id) === botao.dataset.excluirVaga);
      const confirmado = confirm(`Excluir a vaga "${vaga.cargo}"? As curtidas, matches e mensagens dela também serão apagados.`);
      if (!confirmado) return;
      try {
        await apiFetch(`/vagas/${botao.dataset.excluirVaga}?empresaId=${encodeURIComponent(sessao.usuario.id)}`, { method: "DELETE" });
        mostrarToast("Vaga excluída.");
        await renderizarHomeEmpresa();
      } catch (erro) {
        mostrarToast(erro.message);
      }
    });
  });

  lista.querySelectorAll("[data-ver-candidatos]").forEach((botao) => {
    botao.addEventListener("click", async () => {
      // dataset sempre é string; o id da vaga pode ser número quando vier do banco
      estado.vagaSelecionada = estado.vagasEmpresaCache.find((v) => String(v.id) === botao.dataset.verCandidatos);
      estado.indiceCandidatos = 0;
      document.getElementById("painelEmpresaHome").style.display = "none";
      document.getElementById("painelEmpresaSwipe").style.display = "block";
      document.getElementById("tituloVagaSwipe").textContent = `Candidatos para: ${estado.vagaSelecionada.cargo}`;
      await carregarCandidatos();
      renderizarSwipeEmpresa();
    });
  });

  try {
    // "Matches este mês": só os criados a partir do dia 1 do mês atual (usa Match.criado_em)
    const hoje = new Date();
    const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
    const matches = await apiFetch(`/matches?empresaId=${sessao.usuario.id}&desde=${encodeURIComponent(inicioDoMes)}`);
    document.getElementById("statMatches").textContent = matches.length;
  } catch (_) {}

  const totalCompativeis = vagasAtivas.length
    ? (await Promise.all(vagasAtivas.map((v) => apiFetch(`/vagas/${v.id}/candidatos?scoreMinimo=70&ocultarCurtidos=1`).catch(() => []))))
        .reduce((soma, lista) => soma + lista.length, 0)
    : 0;
  document.getElementById("statCandidatosNovos").textContent = totalCompativeis;
}

document.getElementById("voltarParaHomeEmpresa").onclick = async () => {
  document.getElementById("painelEmpresaSwipe").style.display = "none";
  document.getElementById("painelEmpresaHome").style.display = "block";
  await renderizarHomeEmpresa();
};

/* =========================================================================
   ÁREA EMPRESA — swipe de candidatos
   ========================================================================= */
async function carregarCandidatos() {
  try {
    estado.candidatosCache = await apiFetch(`/vagas/${estado.vagaSelecionada.id}/candidatos?ocultarCurtidos=1`);
  } catch (erro) {
    mostrarToast(erro.message);
    estado.candidatosCache = [];
  }
}

function renderizarSwipeEmpresa() {
  const stage = document.getElementById("stageEmpresa");
  const controles = document.getElementById("controlesEmpresa");
  const vaga = estado.vagaSelecionada;
  stage.innerHTML = "";

  if (estado.indiceCandidatos >= estado.candidatosCache.length) {
    controles.style.display = "none";
    stage.innerHTML = `<div class="vazio"><h3>Sem mais candidatos por agora</h3>
      <p>Novos estudantes compatíveis aparecerão aqui conforme se cadastrarem.</p>
      <button id="reiniciarEmpresa">Ver candidatos novamente</button></div>`;
    document.getElementById("reiniciarEmpresa").onclick = async () => {
      estado.indiceCandidatos = 0;
      controles.style.display = "flex";
      await carregarCandidatos();
      renderizarSwipeEmpresa();
    };
    return;
  }
  controles.style.display = "flex";

  [1, 0].forEach((offset) => {
    const i = estado.indiceCandidatos + offset;
    if (i >= estado.candidatosCache.length) return;
    const cand = estado.candidatosCache[i];
    const compat = cand.compatibilidade;
    const card = document.createElement("div");
    card.className = "card";
    card.style.setProperty("--score", compat.final);
    card.setAttribute("data-score", compat.final);
    card.style.zIndex = offset === 0 ? 2 : 1;
    card.style.transform = offset === 0 ? "translateY(0) scale(1)" : "translateY(10px) scale(.96)";
    card.style.opacity = offset === 0 ? "1" : ".7";
    card.innerHTML = `
      <div class="tag-secundaria">${escaparHtml(cand.curso)}</div>
      <h2>${escaparHtml(cand.nome)}</h2>
      <div class="local">${escaparHtml(cand.cidade)} · ${rotuloModalidade(cand.modalidade)}</div>
      <div class="badge-ok ${compat.detalhamento.curso === 100 ? "" : "fora"}">${compat.detalhamento.curso === 100 ? "✓ Curso aceito pela vaga" : "Curso fora do perfil pedido"}</div>
      <div class="detalhe-linha"><span>Disponibilidade</span><strong>${cand.disponibilidadeMeses} meses</strong></div>
      <div class="detalhe-linha"><span>Período mínimo da vaga</span><strong>${vaga.periodoMinimoMeses} meses</strong></div>
      <div class="tags">${cand.habilidades.map((h) => `<span class="tag ${compat.tecnologiasEmComum.includes(h) ? "match" : ""}">${escaparHtml(h)}</span>`).join("")}</div>
      <div class="barra-compat"><div class="label"><span>Compatibilidade</span><span>${compat.final}%</span></div>
        <div class="trilho"><div class="preenchido" style="width:${compat.final}%"></div></div></div>`;
    stage.appendChild(card);
  });

  ativarArraste(stage, decidirEmpresa);
}

async function decidirEmpresa(gostou) {
  const cand = estado.candidatosCache[estado.indiceCandidatos];
  const vaga = estado.vagaSelecionada;
  animarSaidaCartaTopo(document.getElementById("stageEmpresa"), gostou, async () => {
    estado.indiceCandidatos++;
    if (!gostou) { renderizarSwipeEmpresa(); return; }

    try {
      const resposta = await apiFetch("/likes", {
        method: "POST",
        body: JSON.stringify({ origem: "empresa", empresaId: sessao.usuario.id, estudanteId: cand.id, vagaId: vaga.id }),
      });
      if (resposta.houveMatch) {
        mostrarMatch(
          `Você e ${cand.nome} deram match para a vaga de ${vaga.cargo.replace("Estágio em ", "")}.`,
          { chave: resposta.match.id, nome: cand.nome, contexto: vaga.cargo, origem: "empresa" }
        );
      } else {
        renderizarSwipeEmpresa();
      }
    } catch (erro) {
      mostrarToast(erro.message);
      renderizarSwipeEmpresa();
    }
  });
}
document.getElementById("btnPassarEmpresa").onclick = () => decidirEmpresa(false);
document.getElementById("btnCurtirEmpresa").onclick = () => decidirEmpresa(true);

async function renderizarMatchesEmpresa() {
  const lista = document.getElementById("listaMatchesEmpresa");
  let matches = [];
  try {
    matches = await apiFetch(`/matches?empresaId=${sessao.usuario.id}`);
  } catch (erro) {
    mostrarToast(erro.message);
  }

  if (!matches.length) {
    lista.innerHTML = `<div class="estado-vazio-simples">Nenhum match ainda. Veja os candidatos de uma vaga na tela inicial.</div>`;
    return;
  }

  lista.innerHTML = matches.map((m) => `
    <div class="match-item" style="cursor:pointer;" data-match-id="${escaparHtml(m.id)}" data-nome="${escaparHtml(m.estudante.nome)}" data-contexto="${escaparHtml(m.vaga.cargo)}">
      <div class="info"><h4>${escaparHtml(m.estudante.nome)}</h4><div class="meta">${escaparHtml(m.vaga.cargo)}</div></div>
    </div>`).join("");

  lista.querySelectorAll("[data-match-id]").forEach((item) => {
    item.addEventListener("click", () => {
      abrirChat(item.dataset.matchId, item.dataset.nome, item.dataset.contexto, "empresa");
    });
  });
}

/* =========================================================================
   PÁGINA DA EMPRESA (perfil)
   ========================================================================= */
async function preencherFormularioEmpresa() {
  let empresa;
  try {
    empresa = await apiFetch(`/empresas/${sessao.usuario.id}`);
  } catch (erro) {
    mostrarToast(erro.message);
    return;
  }
  document.getElementById("perfilEmpresaNome").value = empresa.nome;
  document.getElementById("perfilEmpresaSetor").value = empresa.setor;
  document.getElementById("perfilEmpresaCidade").value = empresa.cidade;
  document.getElementById("perfilEmpresaDescricao").value = empresa.descricao || "";
  document.getElementById("perfilEmpresaSite").value = empresa.site || "";
  atualizarPreviaEmpresa(empresa);
}

function atualizarPreviaEmpresa(empresa) {
  document.getElementById("previaAvatarEmpresa").textContent = empresa.nome.charAt(0).toUpperCase();
  document.getElementById("previaNomeEmpresa").textContent = empresa.nome;
  document.getElementById("previaSetorEmpresa").textContent = `${empresa.setor} · ${empresa.cidade}`;
}

document.getElementById("formPerfilEmpresa").addEventListener("submit", async (e) => {
  e.preventDefault();
  const corpo = {
    nome: document.getElementById("perfilEmpresaNome").value,
    setor: document.getElementById("perfilEmpresaSetor").value,
    cidade: document.getElementById("perfilEmpresaCidade").value,
    descricao: document.getElementById("perfilEmpresaDescricao").value,
    site: document.getElementById("perfilEmpresaSite").value,
  };
  try {
    const empresaAtualizada = await apiFetch(`/empresas/${sessao.usuario.id}`, { method: "PUT", body: JSON.stringify(corpo) });
    sessao.usuario = empresaAtualizada;
    atualizarPreviaEmpresa(empresaAtualizada);
    document.querySelector("#tela-empresa .topbar .avatar-pequeno").textContent = empresaAtualizada.nome.charAt(0).toUpperCase();
    mostrarToast("Página da empresa atualizada.");
  } catch (erro) {
    mostrarToast(erro.message);
  }
});

/* =========================================================================
   NOVA VAGA
   ========================================================================= */
const overlayModal = document.getElementById("overlayModal");
document.getElementById("botaoNovaVaga").onclick = () => {
  // chips sempre começam desmarcados a cada nova vaga
  renderizarChips("novaVagaCursos", catalogos.cursos, []);
  renderizarChips("novaVagaTecnologias", catalogos.tecnologias, []);
  overlayModal.classList.add("ativo");
};
document.getElementById("botaoCancelarVaga").onclick = () => overlayModal.classList.remove("ativo");

document.getElementById("formVaga").addEventListener("submit", async (e) => {
  e.preventDefault();
  const cursosEscolhidos = lerChips("novaVagaCursos");
  if (!cursosEscolhidos.length) {
    mostrarToast("Escolha pelo menos um curso aceito.");
    return;
  }
  const corpo = {
    empresaId: sessao.usuario.id,
    cargo: document.getElementById("novaVagaCargo").value,
    cursoDesejado: cursosEscolhidos,
    modalidade: document.getElementById("novaVagaModalidade").value,
    cidade: document.getElementById("novaVagaCidade").value,
    faixaSalarial: document.getElementById("novaVagaFaixaSalarial").value,
    periodoMinimoMeses: document.getElementById("novaVagaPeriodoMinimo").value,
    tecnologias: lerChips("novaVagaTecnologias"),
  };
  try {
    await apiFetch("/vagas", { method: "POST", body: JSON.stringify(corpo) });
    overlayModal.classList.remove("ativo");
    e.target.reset();
    mostrarToast("Vaga publicada com sucesso.");
    await renderizarHomeEmpresa();
  } catch (erro) {
    mostrarToast(erro.message);
  }
});

/* =========================================================================
   MATCH OVERLAY (compartilhado)
   ========================================================================= */
function mostrarMatch(texto, contexto) {
  document.getElementById("matchTexto").textContent = texto;
  estado.contextoUltimoMatch = contexto;
  document.getElementById("overlayMatch").classList.add("ativo");
}
document.getElementById("fecharMatch").onclick = () => {
  document.getElementById("overlayMatch").classList.remove("ativo");
  if (sessao.tipo === "estudante") renderizarSwipeEstudante();
  else renderizarSwipeEmpresa();
};
document.getElementById("abrirChatMatch").onclick = () => {
  document.getElementById("overlayMatch").classList.remove("ativo");
  const c = estado.contextoUltimoMatch;
  abrirChat(c.chave, c.nome, c.contexto, c.origem);
};

/* =========================================================================
   CHAT
   ========================================================================= */
async function abrirChat(matchId, nome, contexto, origem) {
  estado.conversaAtual = matchId;
  estado.origemUltimoChat = origem;
  document.getElementById("chatNome").textContent = nome;
  document.getElementById("chatContexto").textContent = contexto;
  document.getElementById("chatAvatar").textContent = nome.charAt(0).toUpperCase();
  await renderizarChat();
  irPara("tela-chat");
}

async function renderizarChat() {
  const corpo = document.getElementById("chatCorpo");
  let mensagens = [];
  try {
    mensagens = await apiFetch(`/mensagens/${estado.conversaAtual}`);
  } catch (erro) {
    mostrarToast(erro.message);
  }

  if (!mensagens.length) {
    corpo.innerHTML = `<div class="estado-vazio-simples">Vocês deram match! Mande a primeira mensagem.</div>`;
    return;
  }

  corpo.innerHTML = mensagens.map((m) => {
    const doLadoDeQuemEstaVendo = m.enviadoPor === sessao.tipo ? "eu" : "outro";
    return `<div class="bolha ${doLadoDeQuemEstaVendo}">${escaparHtml(m.texto)}<span class="hora">${formatarHora(m.criadoEm)}</span></div>`;
  }).join("");
  corpo.scrollTop = corpo.scrollHeight;
}

function formatarHora(isoString) {
  const data = new Date(isoString);
  return data.getHours().toString().padStart(2, "0") + ":" + data.getMinutes().toString().padStart(2, "0");
}

function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

async function enviarMensagem() {
  const input = document.getElementById("chatInput");
  const texto = input.value.trim();
  if (!texto) return;
  input.value = "";
  try {
    await apiFetch("/mensagens", {
      method: "POST",
      body: JSON.stringify({ matchId: estado.conversaAtual, enviadoPor: sessao.tipo, texto }),
    });
    await renderizarChat();
  } catch (erro) {
    mostrarToast(erro.message);
  }
}
document.getElementById("chatEnviar").onclick = enviarMensagem;
document.getElementById("chatInput").addEventListener("keydown", (e) => { if (e.key === "Enter") enviarMensagem(); });

document.getElementById("voltarDoChat").onclick = async () => {
  if (estado.origemUltimoChat === "empresa") {
    irPara("tela-empresa");
    document.querySelector('[data-aba-empresa="matches"]').click();
  } else {
    irPara("tela-estudante");
    document.querySelector('[data-aba-estudante="matches"]').click();
  }
};

/* =========================================================================
   ANIMAÇÃO DE SWIPE (arraste com mouse/dedo, compartilhada)
   ========================================================================= */
function animarSaidaCartaTopo(stage, gostou, aoTerminar) {
  const cartaTopo = [...stage.querySelectorAll(".card")].find((c) => c.style.zIndex === "2");
  if (cartaTopo) {
    cartaTopo.style.transform = gostou ? "translate(140%, -10%) rotate(18deg)" : "translate(-140%, -10%) rotate(-18deg)";
    cartaTopo.style.opacity = "0";
  }
  setTimeout(aoTerminar, 260);
}

function ativarArraste(stage, aoDecidir) {
  let inicioX = null;
  stage.onpointerdown = (e) => {
    const carta = [...stage.querySelectorAll(".card")].find((c) => c.style.zIndex === "2");
    if (!carta || !stage.contains(e.target)) return;
    inicioX = e.clientX;
    carta.setPointerCapture(e.pointerId);
  };
  stage.onpointermove = (e) => {
    if (inicioX === null) return;
    const carta = [...stage.querySelectorAll(".card")].find((c) => c.style.zIndex === "2");
    if (!carta) return;
    const delta = e.clientX - inicioX;
    carta.style.transform = `translateX(${delta}px) rotate(${delta / 20}deg)`;
  };
  stage.onpointerup = (e) => {
    if (inicioX === null) return;
    const delta = e.clientX - inicioX;
    inicioX = null;
    if (Math.abs(delta) > 90) aoDecidir(delta > 0);
    else {
      const carta = [...stage.querySelectorAll(".card")].find((c) => c.style.zIndex === "2");
      if (carta) carta.style.transform = "translateX(0) rotate(0)";
    }
  };
}

/* =========================================================================
   INICIALIZAÇÃO
   ========================================================================= */
carregarCatalogos();
