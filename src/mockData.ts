import { Subject, Lesson, Question } from './types';

export const MOCK_SUBJECTS: Subject[] = [
  // Fundamental
  { id: "f_pt", name: "Português", icon: "BookText", color: "bg-blue-500", totalLessons: 5, completedLessons: 0, level: 'fundamental' },
  { id: "f_mat", name: "Matemática", icon: "Calculator", color: "bg-emerald-500", totalLessons: 4, completedLessons: 0, level: 'fundamental' },
  { id: "f_cien", name: "Ciências Naturais", icon: "FlaskConical", color: "bg-cyan-500", totalLessons: 3, completedLessons: 0, level: 'fundamental' },
  { id: "f_geo", name: "Geografia", icon: "Globe", color: "bg-orange-400", totalLessons: 4, completedLessons: 0, level: 'fundamental' },
  { id: "f_hist", name: "História do Brasil", icon: "Landmark", color: "bg-amber-600", totalLessons: 4, completedLessons: 0, level: 'fundamental' },
  
  // Médio
  { id: "m_pt", name: "Língua Portuguesa", icon: "BookText", color: "bg-indigo-500", totalLessons: 4, completedLessons: 0, level: 'medio' },
  { id: "m_adm", name: "Dir. Administrativo", icon: "Gavel", color: "bg-amber-500", totalLessons: 2, completedLessons: 0, level: 'medio' },
  { id: "m_const", name: "Dir. Constitucional", icon: "Scale", color: "bg-purple-500", totalLessons: 2, completedLessons: 0, level: 'medio' },
  { id: "m_rlo", name: "Rac. Lógico", icon: "BrainCircuit", color: "bg-orange-500", totalLessons: 4, completedLessons: 0, level: 'medio' },
  { id: "m_info", name: "Informática", icon: "Monitor", color: "bg-slate-500", totalLessons: 2, completedLessons: 0, level: 'medio' },
  
  // Superior
  { id: "s_pt", name: "Língua Portuguesa", icon: "BookText", color: "bg-rose-500", totalLessons: 3, completedLessons: 0, level: 'superior' },
  { id: "s_adm_pub", name: "Adm. Pública", icon: "UserCircle", color: "bg-slate-700", totalLessons: 2, completedLessons: 0, level: 'superior' },
  { id: "s_afo", name: "AFO (Orçamento)", icon: "Coins", color: "bg-emerald-700", totalLessons: 1, completedLessons: 0, level: 'superior' },
  { id: "s_const", name: "Dir. Constitucional", icon: "Scale", color: "bg-indigo-700", totalLessons: 2, completedLessons: 0, level: 'superior' },
  { id: "s_info", name: "Tecnologia da Info.", icon: "Monitor", color: "bg-cyan-600", totalLessons: 1, completedLessons: 0, level: 'superior' },
  { id: "s_etic", name: "Ética no Serviço Pub.", icon: "ShieldCheck", color: "bg-rose-600", totalLessons: 0, completedLessons: 0, level: 'superior' },
  { id: "s_trib", name: "Dir. Tributário", icon: "Percent", color: "bg-blue-700", totalLessons: 0, completedLessons: 0, level: 'superior' },
  { id: "s_penal", name: "Dir. Penal", icon: "Lock", color: "bg-red-800", totalLessons: 0, completedLessons: 0, level: 'superior' },
];

export const MOCK_LESSONS: Lesson[] = [
  // --- FUNDAMENTAL ---
  // Língua Portuguesa
  { id: "f_pt_1", subjectId: "f_pt", title: "Leitura e Interpretação", content: "# Leitura e Interpretação\nAprender a ler textos simples e identificar a ideia principal.\n\n- Identificação de personagens.\n- Local e tempo da narrativa.\n- Compreensão de comandos e instruções." },
  { id: "f_pt_2", subjectId: "f_pt", title: "Ortografia e Acentuação", content: "# Regras Básicas\nEscrita correta das palavras e uso de acentos.\n\n- Uso de J/G, S/Z, X/CH.\n- Acentuação de palavras simples (oxítonas e paroxítonas)." },
  { id: "f_pt_3", subjectId: "f_pt", title: "Sinônimos e Antônimos", content: "# Significado das Palavras\n\n- **Sinônimos**: Palavras com sentidos aproximados (Casa/Lar).\n- **Antônimos**: Palavras com sentidos opostos (Alto/Baixo)." },
  { id: "f_pt_4", subjectId: "f_pt", title: "Pontuação Básica", content: "# Ponto e Vírgula\n\n- **Ponto final**: Indica o fim de uma frase.\n- **Vírgula**: Indica uma pequena pausa ou separação de itens em uma lista." },
  { id: "f_pt_5", subjectId: "f_pt", title: "Concordância Simples", content: "# Concordância Verbal e Nominal\n\n- **Nominal**: O artigo e o adjetivo devem concordar com o substantivo (A menina bonita).\n- **Verbal**: O verbo deve concordar com o sujeito (Nós fomos)." },

  // Matemática/RLO
  { id: "f_mat_1", subjectId: "f_mat", title: "As 4 Operações", content: "# Operações Fundamentais\nSoma, Subtração, Multiplicação e Divisão." },
  { id: "f_mat_2", subjectId: "f_mat", title: "Sistemas de Medidas", content: "# Peso, Medida e Tempo\n\n- Comprimento (m, cm).\n- Massa (kg, g).\n- Tempo (h, min, s)." },
  { id: "f_mat_3", subjectId: "f_mat", title: "Porcentagem e Regra de Três", content: "# Regra de Três Simples\nCálculo de valores proporcionais e porcentagens básicas." },
  { id: "f_mat_4", subjectId: "f_mat", title: "Geometria Básica", content: "# Perímetro e Área\nCálculos para quadrados e retângulos." },

  // História e Geografia
  { id: "f_hist_1", subjectId: "f_hist", title: "História Local", content: "# Fatos Históricos\nEstudo dos fatos políticos, econômicos e sociais do Brasil." },
  { id: "f_geo_1", subjectId: "f_geo", title: "Geografia Brasileira", content: "# Aspectos Sociais\nPrincipais características geográficas e sociais recentes." },

  // --- MÉDIO ---
  // Língua Portuguesa
  { id: "m_pt_1", subjectId: "m_pt", title: "Classes de Palavras", content: "# Morfologia\nSubstantivo, adjetivo, pronome, verbo, preposição, etc." },
  { id: "m_pt_2", subjectId: "m_pt", title: "Sintaxe da Oração", content: "# Análise Sintática\nSujeito, predicado, complementos verbais e nominais." },
  { id: "m_pt_3", subjectId: "m_pt", title: "Regência e Crase", content: "# Crase\nUso obrigatório, proibido e facultativo do sinal indicativo de crase." },
  { id: "m_pt_4", subjectId: "m_pt", title: "Figuras de Linguagem", content: "# Estilística\nMetáfora, antítese, hipérbole, eufemismo, etc." },

  // Raciocínio Lógico-Matemático
  { id: "m_rlo_1", subjectId: "m_rlo", title: "Tabelas-Verdade", content: "# Lógica de Proposições\nTabelas-verdade, conectivos (e, ou, se...então) e negações." },
  { id: "m_rlo_2", subjectId: "m_rlo", title: "Conjuntos Numéricos", content: "# Números Reais\nPropriedades dos conjuntos naturais, inteiros, racionais e reais." },
  { id: "m_rlo_3", subjectId: "m_rlo", title: "Juros e Proporção", content: "# Matemática Financeira\nRazão e proporção, juros simples e juros compostos." },
  { id: "m_rlo_4", subjectId: "m_rlo", title: "Análise Combinatória", content: "# Probabilidade\nArranjos, permutações e combinações básicas." },

  // Direito Base
  { id: "m_const_1", subjectId: "m_const", title: "Art. 5º ao 17 da CF", content: "# Direitos Fundamentais\nDireitos e deveres individuais, coletivos e sociais na Constituição." },
  { id: "m_adm_1", subjectId: "m_adm", title: "Princípios do LIMPE", content: "# Adm. Pública\nLegalidade, Impessoalidade, Moralidade, Publicidade e Eficiência." },
  { id: "m_adm_2", subjectId: "m_adm", title: "Poderes e Atos", content: "# Atos Administrativos\nRequisitos, atributos e classificação dos atos administrativos." },

  // Informática
  { id: "m_info_1", subjectId: "m_info", title: "Windows e Office", content: "# Uso Profissional\nWindows, Word, Excel e navegadores de internet." },
  { id: "m_info_2", subjectId: "m_info", title: "Segurança Digital", content: "# Riscos e Proteção\nVírus, backup e noções de segurança da informação." },

  // --- SUPERIOR ---
  // Língua Portuguesa
  { id: "s_pt_1", subjectId: "s_pt", title: "Morfossintaxe", content: "# Domínio Avançado\nEstrutura morfossintática do período e concordância complexa." },
  { id: "s_pt_2", subjectId: "s_pt", title: "Coesão e Coerência", content: "# Texto Avançado\nUso de conectivos, retomadas e manutenção do sentido textual." },
  { id: "s_pt_3", subjectId: "s_pt", title: "Redação Oficial", content: "# Manual da Presidência\nPadrões de ofício, memorando e comunicações oficiais." },

  // Direito Constitucional
  { id: "s_const_1", subjectId: "s_const", title: "Organização do Estado", content: "# Poderes\nOrganização dos Poderes Executivo, Legislativo e Judiciário." },
  { id: "s_const_2", subjectId: "s_const", title: "Controle de Constitucionalidade", content: "# Jurisprudência\nMecanismos de controle difuso e concentrado." },

  // Direito Administrativo
  { id: "s_adm_1", subjectId: "m_adm", title: "Lei de Licitações 14.133", content: "# Licitações e Contratos\nRegras de contratação pública sob a nova lei 14.133/21." },
  { id: "s_adm_2", subjectId: "m_adm", title: "Regime dos Servidores", content: "# Regime Jurídico\nDireitos, deveres e processo administrativo disciplinar." },

  // Gestão e Orçamento
  { id: "s_afo_1", subjectId: "s_afo", title: "PPA, LDO e LOA", content: "# Orçamento Público\nPlano Plurianual, Lei de Diretrizes Orçamentárias e Lei Orçamentária Anual." },
  { id: "s_adm_pub_1", subjectId: "s_adm_pub", title: "Gestão de Pessoas", content: "# Administração Pública\nModelos de gestão, processos e ética no serviço público." },

  // Raciocínio e Estatística
  { id: "s_info_1", subjectId: "s_info", title: "Estatística e Cálculo", content: "# Inferência\nVariância, desvio padrão e lógica de argumentação complexa." }
];

export const MOCK_QUESTIONS: Question[] = [
  { id: "q_fpt_1", subjectId: "f_pt", lessonId: "f_pt_1", level: 'fundamental', text: "Qual a ideia principal de estudar 'Antônimos'?", options: ["Palavras iguais", "Palavras opostas", "Palavras parecidas", "Nomes próprios"], correctIndex: 1, explanation: "Antônimos são palavras com sentidos opostos." },
  { id: "q_madm_1", subjectId: "m_adm", lessonId: "m_adm_1", level: 'medio', text: "O 'P' no mnemônico LIMPE refere-se a:", options: ["Produtividade", "Privacidade", "Publicidade", "Probidade"], correctIndex: 2, explanation: "P de Publicidade conforme art. 37 da CF." },
  { id: "q_sadm_1", subjectId: "s_adm_pub", lessonId: "s_adm_pub_1", level: 'superior', text: "A nova lei de licitações é a:", options: ["8.666/93", "10.520/02", "14.133/21", "12.527/11"], correctIndex: 2, explanation: "A lei 14.133/21 é a nova Lei de Licitações e Contratos." }
];
