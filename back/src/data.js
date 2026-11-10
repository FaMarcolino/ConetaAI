// src/data.js
// Armazenamento em memória (reinicia toda vez que o servidor reinicia).
// IMPORTANTE: só os arquivos de src/repositorio/ devem importar este módulo.
// As rotas falam apenas com o repositório; quando o SGBD for ligado, basta
// reescrever os arquivos de src/repositorio/ com consultas SQL.

let proximoId = 100;
function gerarId(prefixo) {
  proximoId += 1;
  return `${prefixo}_${proximoId}`;
}

// Catálogos (listas fechadas). Cursos e tecnologias nunca são texto livre:
// o usuário escolhe de uma lista, então "Sistemas de Informação" é sempre o mesmo curso.
const cursos = [
  "Administração",
  "Análise e Desenvolvimento de Sistemas",
  "Ciência da Computação",
  "Ciência de Dados",
  "Design Gráfico",
  "Engenharia de Computação",
  "Engenharia de Software",
  "Engenharia Elétrica",
  "Estatística",
  "Marketing",
  "Publicidade e Propaganda",
  "Redes de Computadores",
  "Sistemas de Informação",
].map((nome, i) => ({ id: i + 1, nome }));

const tecnologias = [
  "aws", "c#", "canva", "css", "docker", "excel", "figma", "git", "html", "java",
  "javascript", "linux", "node.js", "php", "power bi", "python", "react", "sql", "typescript",
].map((nome, i) => ({ id: i + 1, nome }));

const estudantes = [
  {
    id: "est_1",
    nome: "Luan",
    email: "luan@email.com",
    senha: "123456", // texto puro só para o protótipo - nunca fazer isso em produção
    curso: "Sistemas de Informação",
    habilidades: ["javascript", "sql", "git", "react"],
    areasInteresse: ["Desenvolvimento web", "Dados"],
    cidade: "Belo Horizonte",
    modalidade: "hibrido",
    disponibilidadeMeses: 12,
    previsaoConclusao: "2027-12",
  },
  {
    id: "est_2",
    nome: "Marina Alves",
    email: "marina@email.com",
    senha: "123456",
    curso: "Sistemas de Informação",
    habilidades: ["javascript", "sql", "react", "css"],
    areasInteresse: ["Desenvolvimento web"],
    cidade: "Belo Horizonte",
    modalidade: "hibrido",
    disponibilidadeMeses: 8,
    previsaoConclusao: "2027-06",
  },
  {
    id: "est_3",
    nome: "Pedro Souza",
    email: "pedro@email.com",
    senha: "123456",
    curso: "Ciência da Computação",
    habilidades: ["python", "sql"],
    areasInteresse: ["Dados"],
    cidade: "Belo Horizonte",
    modalidade: "presencial",
    disponibilidadeMeses: 6,
    previsaoConclusao: "2026-12",
  },
  {
    id: "est_4",
    nome: "Bianca Ferreira",
    email: "bianca@email.com",
    senha: "123456",
    curso: "Engenharia de Software",
    habilidades: ["javascript", "react", "typescript"],
    areasInteresse: ["Desenvolvimento web"],
    cidade: "Contagem",
    modalidade: "remoto",
    disponibilidadeMeses: 12,
    previsaoConclusao: "2027-12",
  },
];

const empresas = [
  {
    id: "emp_1",
    nome: "Nortel Sistemas",
    email: "contato@nortelsistemas.com.br",
    senha: "123456",
    setor: "Tecnologia da Informação",
    cidade: "Belo Horizonte",
    descricao: "Empresa de desenvolvimento de software com foco em soluções web para o setor educacional.",
    site: "https://nortelsistemas.com.br",
  },
  {
    id: "emp_2",
    nome: "Vetta Data",
    email: "contato@vettadata.com",
    senha: "123456",
    setor: "Dados e Analytics",
    cidade: "São Paulo",
    descricao: "Consultoria de análise de dados para o varejo.",
    site: "https://vettadata.com",
  },
];

const vagas = [
  {
    id: "v1",
    empresaId: "emp_1",
    cargo: "Estágio em Engenharia de Software",
    cursoDesejado: ["Sistemas de Informação", "Engenharia de Software", "Ciência da Computação"],
    tecnologias: ["javascript", "sql", "react"],
    cidade: "Belo Horizonte",
    modalidade: "hibrido",
    faixaSalarial: "R$ 1.800 – R$ 2.200",
    periodoMinimoMeses: 6,
    status: "Ativa",
  },
  {
    id: "v2",
    empresaId: "emp_2",
    cargo: "Estágio em Análise de Dados",
    cursoDesejado: ["Ciência de Dados", "Estatística", "Engenharia de Computação"],
    tecnologias: ["python", "sql", "power bi"],
    cidade: "São Paulo",
    modalidade: "remoto",
    faixaSalarial: "R$ 1.600 – R$ 2.000",
    periodoMinimoMeses: 12,
    status: "Ativa",
  },
  {
    id: "v3",
    empresaId: "emp_1",
    cargo: "Estágio em Infraestrutura",
    cursoDesejado: ["Sistemas de Informação", "Redes de Computadores"],
    tecnologias: ["linux", "docker", "aws"],
    cidade: "Belo Horizonte",
    modalidade: "presencial",
    faixaSalarial: "R$ 1.700 – R$ 2.100",
    periodoMinimoMeses: 6,
    status: "Ativa",
  },
];

// likes (entidade Curtida do ER): registra cada curtida individual, de um lado só
const likes = []; // { id, origem: 'estudante' | 'empresa', estudanteId, vagaId, criadoEm }

// matches: só existe quando os DOIS lados curtiram
const matches = []; // { id, estudanteId, vagaId, criadoEm }

// mensagens: histórico de chat de cada match
const mensagens = []; // { id, matchId, enviadoPor: 'estudante' | 'empresa', texto, criadoEm }

module.exports = {
  cursos,
  tecnologias,
  estudantes,
  empresas,
  vagas,
  likes,
  matches,
  mensagens,
  gerarId,
};
