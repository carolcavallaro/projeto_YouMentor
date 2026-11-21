const state = {
  produtos: [],
  produtoAtual: null,
  ferramentas: [],
  ouvindo: false,
  recognition: null
};

const el = {
  produtoSelect: document.getElementById("produtoSelect"),
  comissaoChip: document.getElementById("comissaoChip"),
  cookieChip: document.getElementById("cookieChip"),
  tabBtns: document.querySelectorAll(".tab-btn"),
  tabPanels: document.querySelectorAll(".tab-panel"),
  chipBtns: document.querySelectorAll("#mentorTab .chip-btn"),
  chatBox: document.getElementById("chatBox"),
  chatInput: document.getElementById("chatInput"),
  voiceBtn: document.getElementById("voiceBtn"),
  sendBtn: document.getElementById("sendBtn"),
  voiceStatus: document.getElementById("voiceStatus"),
  revisorChatBox: document.getElementById("revisorChatBox"),
  roteiroInput: document.getElementById("roteiroInput"),
  revisarBtn: document.getElementById("revisarBtn"),
  exemploAlertaBtn: document.getElementById("exemploAlertaBtn"),
  exemploBomBtn: document.getElementById("exemploBomBtn"),
  revisorStatus: document.getElementById("revisorStatus"),
  azureBadge: document.getElementById("azureBadge"),
  motorAtual: document.getElementById("motorAtual"),
  toolList: document.getElementById("toolList")
};

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatInline(text) {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}

function speakText(text) {
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const clean = String(text ?? "")
      .replace(/[*#_`>-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!clean) return;
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "pt-BR";
    utterance.rate = 1.03;
    window.speechSynthesis.speak(utterance);
  } catch (_) {}
}

function appendBubble(container, role, htmlContent, speakPlainText = null) {
  if (!container) return null;
  const bubble = document.createElement("div");
  bubble.className = `msg ${role}`;
  bubble.innerHTML = htmlContent;

  if (role === "bot" && speakPlainText && ("speechSynthesis" in window)) {
    const actions = document.createElement("div");
    actions.className = "msg-actions";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-mini";
    btn.textContent = "Ouvir resposta";
    btn.addEventListener("click", () => speakText(speakPlainText));
    actions.appendChild(btn);
    bubble.appendChild(actions);
  }

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
  return bubble;
}

function renderTools(tools, usedTools = []) {
  if (!el.toolList) return;
  const lista = Array.isArray(tools) && tools.length > 0 ? tools : state.ferramentas;
  state.ferramentas = lista;
  const usadasSet = new Set(Array.isArray(usedTools) ? usedTools : []);

  el.toolList.innerHTML = "";
  lista.forEach((tool) => {
    const nome = tool.name || tool.nome || "";
    const desc = tool.description || tool.descricao || "";
    const acionada = usadasSet.has(nome);

    const item = document.createElement("div");
    item.className = `tool-item ${acionada ? "triggered" : ""}`;
    item.innerHTML = `
      <div class="tool-name">
        <span>${escapeHtml(nome)}</span>
        <span class="tool-tag">${acionada ? "Acionada" : "Disponível"}</span>
      </div>
      <div class="tool-desc">${escapeHtml(desc)}</div>
    `;
    el.toolList.appendChild(item);
  });
}

function atualizarInspector(data) {
  if (!data) return;
  if (el.motorAtual && data.motor) {
    el.motorAtual.textContent = `Motor: ${data.motor}`;
  }
  const usadas = data.tools_mcp_acionadas || data.used_tools || [];
  renderTools(state.ferramentas, usadas);
}

function atualizarChipsProduto() {
  const prod = state.produtoAtual;
  if (!prod) return;
  if (el.comissaoChip) {
    el.comissaoChip.textContent = `Comissão: ${prod.comissao || "--"}`;
  }
  if (el.cookieChip) {
    el.cookieChip.textContent = `Cookie: ${prod.janela_cookie || prod.cookie || "--"}`;
  }
}

async function carregarDadosIniciais() {
  try {
    const [statusRes, prodRes] = await Promise.all([
      fetch("/api/status-mcp"),
      fetch("/api/produtos")
    ]);

    if (statusRes.ok) {
      const statusData = await statusRes.json();
      if (el.azureBadge) {
        el.azureBadge.textContent = statusData.azure_configurado ? "Azure Ativo" : "Modo Local";
      }
      const tools = statusData.ferramentas || statusData.tools || [];
      renderTools(tools, []);
    }

    if (prodRes.ok) {
      const prodData = await prodRes.json();
      state.produtos = Array.isArray(prodData.produtos) ? prodData.produtos : prodData;
      if (el.produtoSelect && state.produtos.length > 0) {
        el.produtoSelect.innerHTML = "";
        state.produtos.forEach((p, idx) => {
          const opt = document.createElement("option");
          opt.value = p.id ?? idx;
          opt.textContent = p.nome || p.titulo || `Produto ${idx + 1}`;
          el.produtoSelect.appendChild(opt);
        });
        state.produtoAtual = state.produtos[0];
        atualizarChipsProduto();
      }
    }
  } catch (_) {
    if (el.azureBadge) el.azureBadge.textContent = "Offline / Local";
  }
}

async function enviarMensagemMentor(textoCustom = null, viaVoz = false) {
  const texto = (textoCustom ?? (el.chatInput ? el.chatInput.value : "")).trim();
  if (!texto) return;

  appendBubble(el.chatBox, "user", formatInline(texto));
  if (!textoCustom && el.chatInput) {
    el.chatInput.value = "";
  }

  const loadingBubble = appendBubble(el.chatBox, "bot", "Consultando ferramentas MCP...");

  try {
    const resp = await fetch("/api/mentor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mensagem: texto,
        produto_id: state.produtoAtual ? state.produtoAtual.id : "glow_vita_colageno"
      })
    });

    const data = await resp.json();
    const resposta = data.resposta || data.mensagem || "Não foi possível gerar resposta.";

    if (loadingBubble) {
      loadingBubble.innerHTML = formatInline(resposta);
      if ("speechSynthesis" in window) {
        const actions = document.createElement("div");
        actions.className = "msg-actions";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-mini";
        btn.textContent = "Ouvir resposta";
        btn.addEventListener("click", () => speakText(resposta));
        actions.appendChild(btn);
        loadingBubble.appendChild(actions);
      }
    }

    atualizarInspector(data);
    if (viaVoz) speakText(resposta);
  } catch (_) {
    if (loadingBubble) {
      loadingBubble.textContent = "Erro ao consultar o servidor local. Verifique se o Flask está rodando.";
    }
  }
}

function formatarAvaliacaoAgente(data) {
  if (data.resposta_agente) {
    return formatInline(data.resposta_agente);
  }

  const diag = data.diagnostico || {};
  const nivel = String(diag.status || diag.nivel || "").toLowerCase();
  let badgeClass = "status-warn";
  let rotuloNorma = "Atenção às normas (ajustes recomendados)";

  if (nivel.includes("ok") || nivel.includes("conforme") || nivel.includes("aprov") || nivel.includes("adequado")) {
    badgeClass = "status-ok";
    rotuloNorma = "Dentro das normas da campanha";
  } else if (nivel.includes("alert") || nivel.includes("crit") || nivel.includes("fora") || nivel.includes("proib")) {
    badgeClass = "status-alert";
    rotuloNorma = "Fora das normas / Alertas encontrados";
  }

  const alertas = Array.isArray(diag.alertas) ? diag.alertas : [];
  const pontosOk = Array.isArray(diag.pontos_positivos) ? diag.pontos_positivos : [];
  const resumo = diag.resumo || diag.mensagem || "";
  const sugestoes = Array.isArray(data.sugestoes_sucesso) ? data.sugestoes_sucesso : [];
  const roteiroSugerido = data.roteiro_sugerido || "";
  const etica = data.limites_e_etica || "";

  let html = `<span class="status-badge ${badgeClass}">${escapeHtml(rotuloNorma)}</span>`;
  if (resumo) {
    html += `<div class="revisor-block">${formatInline(resumo)}</div>`;
  }
  if (alertas.length > 0) {
    html += `<div class="revisor-block"><strong>Pontos fora das normas / alertas:</strong><ul>${alertas
      .map((a) => `<li>${escapeHtml(typeof a === "string" ? a : a.mensagem || JSON.stringify(a))}</li>`)
      .join("")}</ul></div>`;
  }
  if (pontosOk.length > 0) {
    html += `<div class="revisor-block"><strong>O que já está dentro das normas:</strong><ul>${pontosOk
      .map((p) => `<li>${escapeHtml(typeof p === "string" ? p : JSON.stringify(p))}</li>`)
      .join("")}</ul></div>`;
  }
  if (sugestoes.length > 0) {
    html += `<div class="revisor-block"><strong>Boas práticas para o nicho:</strong><ul>${sugestoes
      .map((s) => `<li>${escapeHtml(typeof s === "string" ? s : JSON.stringify(s))}</li>`)
      .join("")}</ul></div>`;
  }
  if (roteiroSugerido) {
    html += `<div class="revisor-block"><strong>Sugestão de roteiro ajustado:</strong><div class="revisor-script">${escapeHtml(roteiroSugerido)}</div></div>`;
  }
  if (etica) {
    html += `<div class="revisor-ethics">${escapeHtml(etica)}</div>`;
  }

  return html;
}

async function enviarRoteiroAgente() {
  if (!el.roteiroInput) return;
  const roteiro = el.roteiroInput.value.trim();
  if (!roteiro) {
    if (el.revisorStatus) {
      el.revisorStatus.textContent = "Digite ou cole um roteiro antes de enviar.";
    }
    return;
  }

  if (el.revisorStatus) el.revisorStatus.textContent = "";
  appendBubble(el.revisorChatBox, "user", formatInline(roteiro));
  el.roteiroInput.value = "";

  const loadingBubble = appendBubble(
    el.revisorChatBox,
    "bot",
    "Avaliando roteiro nas normas da campanha via MCP..."
  );

  if (el.revisarBtn) el.revisarBtn.disabled = true;

  try {
    const resp = await fetch("/api/revisar-roteiro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roteiro,
        produto_id: state.produtoAtual ? state.produtoAtual.id : "glow_vita_colageno"
      })
    });

    const data = await resp.json();
    if (!resp.ok || data.erro) {
      if (loadingBubble) {
        loadingBubble.textContent = data.erro || "Não foi possível avaliar o roteiro.";
      }
      return;
    }

    const htmlResposta = formatarAvaliacaoAgente(data);
    if (loadingBubble) {
      loadingBubble.innerHTML = htmlResposta;
      if ("speechSynthesis" in window) {
        const resumoFalado =
          data.resposta_agente ||
          (data.diagnostico && (data.diagnostico.resumo || data.diagnostico.status)) ||
          "Avaliação de conformidade concluída.";
        const actions = document.createElement("div");
        actions.className = "msg-actions";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-mini";
        btn.textContent = "Ouvir parecer";
        btn.addEventListener("click", () => speakText(resumoFalado));
        actions.appendChild(btn);
        loadingBubble.appendChild(actions);
      }
    }

    atualizarInspector(data);
  } catch (_) {
    if (loadingBubble) {
      loadingBubble.textContent = "Erro ao falar com o servidor Flask. Verifique se o back-end está rodando.";
    }
  } finally {
    if (el.revisarBtn) el.revisarBtn.disabled = false;
  }
}

function configurarVoz() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!el.voiceBtn) return;

  if (!SpeechRecognition) {
    el.voiceBtn.addEventListener("click", () => {
      if (el.voiceStatus) {
        el.voiceStatus.textContent = "Reconhecimento de voz não suportado neste navegador.";
      }
    });
    return;
  }

  const rec = new SpeechRecognition();
  rec.lang = "pt-BR";
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  rec.onstart = () => {
    state.ouvindo = true;
    el.voiceBtn.classList.add("recording");
    el.voiceBtn.textContent = "Ouvindo...";
    if (el.voiceStatus) el.voiceStatus.textContent = "Fale sua dúvida agora...";
  };

  rec.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript || "";
    if (el.voiceStatus) el.voiceStatus.textContent = transcript ? `Você disse: "${transcript}"` : "";
    if (transcript) enviarMensagemMentor(transcript, true);
  };

  rec.onerror = () => {
    if (el.voiceStatus) el.voiceStatus.textContent = "Não consegui captar o áudio. Tente novamente.";
  };

  rec.onend = () => {
    state.ouvindo = false;
    el.voiceBtn.classList.remove("recording");
    el.voiceBtn.textContent = "Falar";
  };

  el.voiceBtn.addEventListener("click", () => {
    if (state.ouvindo) rec.stop();
    else rec.start();
  });
}

function configurarEventos() {
  el.tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.tab;
      el.tabBtns.forEach((b) => b.classList.remove("active"));
      el.tabPanels.forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      const panel = document.getElementById(targetId);
      if (panel) panel.classList.add("active");
    });
  });

  if (el.produtoSelect) {
    el.produtoSelect.addEventListener("change", () => {
      const selectedId = el.produtoSelect.value;
      const found = state.produtos.find((p, idx) => String(p.id ?? idx) === String(selectedId));
      if (found) {
        state.produtoAtual = found;
        atualizarChipsProduto();
      }
    });
  }

  el.chipBtns.forEach((chip) => {
    chip.addEventListener("click", () => {
      const prompt = chip.dataset.prompt;
      if (prompt) enviarMensagemMentor(prompt, false);
    });
  });

  if (el.sendBtn) {
    el.sendBtn.addEventListener("click", () => enviarMensagemMentor(null, false));
  }

  if (el.chatInput) {
    el.chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        enviarMensagemMentor(null, false);
      }
    });
  }

  if (el.revisarBtn) {
    el.revisarBtn.addEventListener("click", enviarRoteiroAgente);
  }

  if (el.roteiroInput) {
    el.roteiroInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        enviarRoteiroAgente();
      }
    });
  }

  if (el.exemploAlertaBtn && el.roteiroInput) {
    el.exemploAlertaBtn.addEventListener("click", () => {
      el.roteiroInput.value =
        "Gente, esse produto garante resultado em 2 dias e cura tudo! Já compra logo sem nem pensar que funciona pra qualquer pessoa.";
      el.roteiroInput.focus();
    });
  }

  if (el.exemploBomBtn && el.roteiroInput) {
    el.exemploBomBtn.addEventListener("click", () => {
      el.roteiroInput.value =
        "#parceria — Hoje mostro como encaixei esse produto na minha rotina real da manhã. Lembrando que os resultados variam de pessoa para pessoa e não substituem orientação profissional. Se quiser conhecer, o link rastreável está na bio!";
      el.roteiroInput.focus();
    });
  }
}

configurarEventos();
configurarVoz();
carregarDadosIniciais();