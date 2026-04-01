/**
 * AWQ BU Supervisor Widget — Standalone Embed
 * Drop-in zero-dependency widget for any static site.
 *
 * Usage:
 *   <script
 *     src="https://contato22.github.io/awq/supervisor-widget.js"
 *     data-bu="advisor"
 *     data-position="bottom-right"
 *   ></script>
 *
 * Optional data attributes:
 *   data-bu       : advisor | jacqes | caza | venture | awq  (default: advisor)
 *   data-key      : pre-configured Anthropic API key (optional, user can enter in widget)
 *   data-position : bottom-right | bottom-left               (default: bottom-right)
 */
(function () {
  "use strict";

  // ─── Config ────────────────────────────────────────────────────────────────
  var script = document.currentScript || (function () {
    var s = document.querySelectorAll("script");
    return s[s.length - 1];
  })();

  var BU = (script && script.getAttribute("data-bu")) || "advisor";
  var PRESET_KEY = (script && script.getAttribute("data-key")) || "";
  var POSITION = (script && script.getAttribute("data-position")) || "bottom-right";
  var LS_KEY = "awq_supervisor_key";
  var LS_BRIEFING_TS = "awq_supervisor_briefing_ts_" + BU;
  var BRIEFING_TTL = 60 * 60 * 1000; // 1 hour

  var BU_LABELS = {
    advisor: "Advisor BI",
    jacqes: "JACQES",
    caza: "Caza Vision",
    venture: "AWQ Venture",
    awq: "AWQ Group",
  };

  var BU_CONTEXTS = {
    advisor: "Você é supervisor do Advisor BI — foco em portfólio de investimentos, retorno, alocação de ativos e relatórios de performance.",
    jacqes: "CONTEXTO ATIVO: JACQES — SaaS, clientes, CS ops, revenue. KPIs: $4.82M (+14.6%), margem 67.4%, 3.847 clientes.",
    caza: "CONTEXTO ATIVO: Caza Vision — projetos imobiliários, pipeline, clientes. KPIs: R$908K/mês (+12.3%), 23 projetos ativos.",
    venture: "CONTEXTO ATIVO: AWQ Venture — fund structuring, LP pipeline, milestones. Prazo: Q2/26 primeiro fechamento.",
    awq: "CONTEXTO ATIVO: AWQ Group — visão consolidada de todas as BUs. Acompanhe JACQES, Caza Vision e AWQ Venture.",
  };

  var SYSTEM_PROMPT = [
    "Você é o Supervisor de BU da AWQ — IA autônoma embutida no dashboard de BI.",
    "Você é decisivo, orientado a ação e conciso.",
    "",
    "=== IDENTIDADE ===",
    "Você NÃO é apenas um chatbot. Você é supervisor ativo que:",
    "• Monitora KPIs, alertas e tendências em tempo real",
    "• Toma ação corretiva proativamente",
    "• Notifica o operador de problemas críticos SEM ser perguntado",
    "• Responde perguntas e executa tarefas sob demanda",
    "",
    "=== FORMATO DE BRIEFING ===",
    "Quando solicitado, liste 3–5 alertas neste formato exato:",
    "🔴 TÍTULO CURTO — descrição breve. Ação: o que fazer agora.",
    "🟡 TÍTULO CURTO — descrição breve. Ação: o que fazer agora.",
    "🟢 TÍTULO CURTO — descrição breve. Ação: o que fazer agora.",
    "",
    "🔴 = crítico (ação imediata), 🟡 = atenção (ação esta semana), 🟢 = info/oportunidade",
    "",
    "=== REGRAS ===",
    "• Respostas sob 200 palavras exceto quando detalhes forem pedidos explicitamente",
    "• Sempre confirme ações tomadas com precisão",
    "• Nunca diga 'não posso' para análises — sempre entregue insights acionáveis",
  ].join("\n");

  // ─── CSS ───────────────────────────────────────────────────────────────────
  var CSS = [
    "#awq-sw-btn{position:fixed;z-index:999999;width:52px;height:52px;border-radius:16px;",
    "background:linear-gradient(135deg,#d4a82a,#b8921e);border:none;cursor:pointer;",
    "box-shadow:0 4px 20px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;",
    "transition:transform .2s,box-shadow .2s;outline:none;}",
    "#awq-sw-btn:hover{transform:scale(1.07);box-shadow:0 6px 28px rgba(0,0,0,.6);}",
    "#awq-sw-badge{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;",
    "border-radius:9px;background:#ef4444;color:#fff;font-size:11px;font-weight:700;",
    "display:flex;align-items:center;justify-content:center;padding:0 4px;",
    "font-family:system-ui,sans-serif;border:2px solid #1a1a1a;display:none;}",
    "#awq-sw-panel{position:fixed;z-index:999998;width:340px;height:520px;",
    "background:#1a1a1a;border:1px solid #333;border-radius:16px;",
    "box-shadow:0 8px 40px rgba(0,0,0,.7);display:none;flex-direction:column;overflow:hidden;",
    "font-family:system-ui,-apple-system,sans-serif;}",
    "#awq-sw-panel.open{display:flex;}",
    "#awq-sw-head{display:flex;align-items:center;gap:10px;padding:12px 14px;",
    "border-bottom:1px solid #2a2a2a;background:#141414;flex-shrink:0;}",
    "#awq-sw-head-icon{width:28px;height:28px;border-radius:8px;",
    "background:linear-gradient(135deg,#d4a82a,#b8921e);display:flex;align-items:center;",
    "justify-content:center;font-size:14px;flex-shrink:0;}",
    "#awq-sw-head-info{flex:1;min-width:0;}",
    "#awq-sw-head-title{font-size:12px;font-weight:600;color:#e5e5e5;line-height:1;}",
    "#awq-sw-head-sub{font-size:10px;color:#888;margin-top:2px;}",
    "#awq-sw-head-close{background:none;border:none;cursor:pointer;color:#666;",
    "padding:4px;border-radius:6px;display:flex;align-items:center;justify-content:center;",
    "transition:color .15s;}#awq-sw-head-close:hover{color:#ccc;}",
    "#awq-sw-tabs{display:flex;border-bottom:1px solid #2a2a2a;flex-shrink:0;}",
    ".awq-sw-tab{flex:1;padding:8px 0;font-size:11px;font-weight:500;color:#666;",
    "background:none;border:none;cursor:pointer;border-bottom:2px solid transparent;",
    "transition:color .15s,border-color .15s;}",
    ".awq-sw-tab.active{color:#d4a82a;border-bottom-color:#d4a82a;}",
    ".awq-sw-tab:hover:not(.active){color:#999;}",
    "#awq-sw-body{flex:1;overflow:hidden;display:flex;flex-direction:column;min-height:0;}",
    ".awq-sw-pane{display:none;flex:1;flex-direction:column;overflow:hidden;}",
    ".awq-sw-pane.active{display:flex;}",
    "#awq-sw-alerts-list{flex:1;overflow-y:auto;padding:12px;",
    "display:flex;flex-direction:column;gap:8px;}",
    "#awq-sw-alerts-list::-webkit-scrollbar{width:4px;}",
    "#awq-sw-alerts-list::-webkit-scrollbar-track{background:transparent;}",
    "#awq-sw-alerts-list::-webkit-scrollbar-thumb{background:#333;border-radius:2px;}",
    ".awq-sw-alert-item{background:#1e1e1e;border:1px solid #2a2a2a;border-radius:10px;",
    "padding:10px 12px;font-size:11px;color:#ccc;line-height:1.5;white-space:pre-wrap;}",
    ".awq-sw-alert-refresh{margin:10px 12px;display:flex;justify-content:center;}",
    ".awq-sw-alert-refresh button{background:none;border:1px solid #333;color:#888;",
    "font-size:10px;padding:5px 12px;border-radius:6px;cursor:pointer;transition:border-color .15s,color .15s;}",
    ".awq-sw-alert-refresh button:hover{border-color:#d4a82a;color:#d4a82a;}",
    "#awq-sw-msgs{flex:1;overflow-y:auto;padding:10px 12px;",
    "display:flex;flex-direction:column;gap:8px;min-height:0;}",
    "#awq-sw-msgs::-webkit-scrollbar{width:4px;}",
    "#awq-sw-msgs::-webkit-scrollbar-track{background:transparent;}",
    "#awq-sw-msgs::-webkit-scrollbar-thumb{background:#333;border-radius:2px;}",
    ".awq-sw-msg{display:flex;gap:6px;max-width:90%;}",
    ".awq-sw-msg.user{align-self:flex-end;flex-direction:row-reverse;}",
    ".awq-sw-msg-bubble{border-radius:12px;padding:8px 10px;font-size:11px;",
    "line-height:1.5;white-space:pre-wrap;word-break:break-word;}",
    ".awq-sw-msg.user .awq-sw-msg-bubble{background:#d4a82a;color:#111;border-bottom-right-radius:4px;}",
    ".awq-sw-msg.bot .awq-sw-msg-bubble{background:#1e1e1e;border:1px solid #2a2a2a;",
    "color:#ccc;border-bottom-left-radius:4px;}",
    ".awq-sw-tool-strip{padding:4px 10px;background:#111;font-size:10px;color:#888;",
    "display:flex;align-items:center;gap:6px;}",
    ".awq-sw-tool-strip span{color:#d4a82a;}",
    "#awq-sw-input-area{border-top:1px solid #2a2a2a;padding:10px 12px;flex-shrink:0;}",
    "#awq-sw-input-row{display:flex;gap:8px;align-items:flex-end;",
    "background:#111;border:1px solid #333;border-radius:10px;padding:6px 8px;",
    "transition:border-color .15s;}",
    "#awq-sw-input-row:focus-within{border-color:#d4a82a;}",
    "#awq-sw-textarea{flex:1;background:none;border:none;color:#e5e5e5;font-size:11px;",
    "resize:none;outline:none;min-height:18px;max-height:80px;font-family:inherit;line-height:1.5;}",
    "#awq-sw-textarea::placeholder{color:#555;}",
    "#awq-sw-send{width:26px;height:26px;border-radius:7px;",
    "background:#d4a82a;border:none;cursor:pointer;display:flex;",
    "align-items:center;justify-content:center;transition:background .15s;flex-shrink:0;}",
    "#awq-sw-send:hover{background:#b8921e;}#awq-sw-send:disabled{opacity:.4;cursor:default;}",
    "#awq-sw-setup{display:flex;flex-direction:column;align-items:center;justify-content:center;",
    "flex:1;padding:24px;text-align:center;gap:14px;}",
    "#awq-sw-setup-icon{font-size:32px;}",
    "#awq-sw-setup h3{font-size:14px;font-weight:600;color:#e5e5e5;margin:0;}",
    "#awq-sw-setup p{font-size:11px;color:#888;margin:0;line-height:1.5;}",
    "#awq-sw-key-input{width:100%;padding:9px 12px;background:#111;border:1px solid #333;",
    "border-radius:10px;color:#e5e5e5;font-size:12px;outline:none;transition:border-color .15s;",
    "font-family:inherit;box-sizing:border-box;}",
    "#awq-sw-key-input:focus{border-color:#d4a82a;}",
    "#awq-sw-key-input::placeholder{color:#555;}",
    "#awq-sw-key-save{width:100%;padding:10px;background:#d4a82a;border:none;",
    "border-radius:10px;color:#111;font-size:12px;font-weight:600;cursor:pointer;",
    "transition:background .15s;}#awq-sw-key-save:hover{background:#b8921e;}",
    "#awq-sw-key-save:disabled{opacity:.4;cursor:default;}",
    "#awq-sw-err{font-size:10px;color:#f87171;text-align:center;margin-top:4px;}",
  ].join("");

  // ─── SVG icons ─────────────────────────────────────────────────────────────
  function iconSparkles() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M5 17l.75 2.25L8 20l-2.25.75L5 23l-.75-2.25L2 20l2.25-.75L5 17z"/><path d="M19 3l.5 1.5L21 5l-1.5.5L19 7l-.5-1.5L17 5l1.5-.5L19 3z"/></svg>';
  }
  function iconX() {
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  }
  function iconSend() {
    return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
  }
  function iconSpin() {
    return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="animation:awq-spin .8s linear infinite"><circle cx="12" cy="12" r="10" opacity=".25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>';
  }
  function iconKey() {
    return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3L22 7l-3-3"/></svg>';
  }

  // ─── State ─────────────────────────────────────────────────────────────────
  var apiKey = PRESET_KEY || localStorage.getItem(LS_KEY) || "";
  var panelOpen = false;
  var activeTab = "alerts"; // "alerts" | "chat"
  var chatMessages = []; // [{role, content}]
  var alertsLoaded = false;
  var alertCount = 0;
  var loading = false;

  // ─── Build DOM ─────────────────────────────────────────────────────────────
  function buildWidget() {
    // Style
    var style = document.createElement("style");
    style.textContent = CSS + "@keyframes awq-spin{to{transform:rotate(360deg)}}";
    document.head.appendChild(style);

    var side = POSITION === "bottom-left" ? "left:20px;" : "right:20px;";

    // Floating button
    var btn = document.createElement("button");
    btn.id = "awq-sw-btn";
    btn.style.cssText = side + "bottom:20px;";
    btn.innerHTML = iconSparkles() + '<span id="awq-sw-badge"></span>';
    btn.title = "AWQ Supervisor";
    btn.addEventListener("click", togglePanel);
    document.body.appendChild(btn);

    // Panel
    var panel = document.createElement("div");
    panel.id = "awq-sw-panel";
    panel.style.cssText = side + "bottom:82px;";
    panel.innerHTML = buildPanelHTML();
    document.body.appendChild(panel);

    // Wire events
    document.getElementById("awq-sw-head-close").addEventListener("click", closePanel);
    document.getElementById("awq-sw-tab-alerts").addEventListener("click", function () { switchTab("alerts"); });
    document.getElementById("awq-sw-tab-chat").addEventListener("click", function () { switchTab("chat"); });
    document.getElementById("awq-sw-send").addEventListener("click", sendChat);
    document.getElementById("awq-sw-textarea").addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); }
    });
    document.getElementById("awq-sw-textarea").addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = Math.min(this.scrollHeight, 80) + "px";
    });

    var setupBtn = document.getElementById("awq-sw-key-save");
    if (setupBtn) setupBtn.addEventListener("click", saveKey);
    var keyInput = document.getElementById("awq-sw-key-input");
    if (keyInput) keyInput.addEventListener("keydown", function (e) { if (e.key === "Enter") saveKey(); });
  }

  function buildPanelHTML() {
    var label = BU_LABELS[BU] || BU;
    return [
      '<div id="awq-sw-head">',
        '<div id="awq-sw-head-icon">⚡</div>',
        '<div id="awq-sw-head-info">',
          '<div id="awq-sw-head-title">AWQ Supervisor</div>',
          '<div id="awq-sw-head-sub">' + label + ' · ' + (apiKey ? "Ativo" : "Configurar") + '</div>',
        '</div>',
        '<button id="awq-sw-head-close">' + iconX() + '</button>',
      '</div>',
      '<div id="awq-sw-tabs">',
        '<button class="awq-sw-tab active" id="awq-sw-tab-alerts">🔔 Alertas</button>',
        '<button class="awq-sw-tab" id="awq-sw-tab-chat">💬 Chat</button>',
      '</div>',
      '<div id="awq-sw-body">',
        // Alerts pane
        '<div class="awq-sw-pane active" id="awq-sw-pane-alerts">',
          '<div id="awq-sw-alerts-list"></div>',
          '<div class="awq-sw-alert-refresh"><button id="awq-sw-refresh-btn">↻ Atualizar briefing</button></div>',
        '</div>',
        // Chat pane
        '<div class="awq-sw-pane" id="awq-sw-pane-chat">',
          apiKey ? chatPaneHTML() : setupHTML(),
        '</div>',
      '</div>',
    ].join("");
  }

  function chatPaneHTML() {
    return [
      '<div id="awq-sw-msgs"></div>',
      '<div id="awq-sw-input-area">',
        '<div id="awq-sw-input-row">',
          '<textarea id="awq-sw-textarea" rows="1" placeholder="Pergunte ao supervisor..."></textarea>',
          '<button id="awq-sw-send">' + iconSend() + '</button>',
        '</div>',
      '</div>',
    ].join("");
  }

  function setupHTML() {
    return [
      '<div id="awq-sw-setup">',
        '<div id="awq-sw-setup-icon">🔑</div>',
        '<h3>Configurar Supervisor</h3>',
        '<p>Insira sua chave da API Anthropic para ativar o supervisor.</p>',
        '<input id="awq-sw-key-input" type="password" placeholder="sk-ant-..." autocomplete="off"/>',
        '<button id="awq-sw-key-save">Salvar e ativar</button>',
        '<div id="awq-sw-err"></div>',
      '</div>',
    ].join("");
  }

  // ─── Panel control ─────────────────────────────────────────────────────────
  function togglePanel() {
    panelOpen ? closePanel() : openPanel();
  }

  function openPanel() {
    panelOpen = true;
    document.getElementById("awq-sw-panel").classList.add("open");
    if (!alertsLoaded && apiKey) runBriefing();
    wireRefreshBtn();
  }

  function closePanel() {
    panelOpen = false;
    document.getElementById("awq-sw-panel").classList.remove("open");
  }

  function wireRefreshBtn() {
    var btn = document.getElementById("awq-sw-refresh-btn");
    if (btn) btn.addEventListener("click", function () { runBriefing(true); });
  }

  function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll(".awq-sw-tab").forEach(function (el) { el.classList.remove("active"); });
    document.querySelectorAll(".awq-sw-pane").forEach(function (el) { el.classList.remove("active"); });
    document.getElementById("awq-sw-tab-" + tab).classList.add("active");
    document.getElementById("awq-sw-pane-" + tab).classList.add("active");
  }

  function setBadge(n) {
    alertCount = n;
    var badge = document.getElementById("awq-sw-badge");
    if (!badge) return;
    if (n > 0) { badge.style.display = "flex"; badge.textContent = n > 9 ? "9+" : n; }
    else { badge.style.display = "none"; }
  }

  // ─── API key setup ─────────────────────────────────────────────────────────
  function saveKey() {
    var input = document.getElementById("awq-sw-key-input");
    var key = input ? input.value.trim() : "";
    if (!key) return;
    if (!key.startsWith("sk-")) {
      var err = document.getElementById("awq-sw-err");
      if (err) err.textContent = "Chave inválida. Deve começar com sk-";
      return;
    }
    apiKey = key;
    localStorage.setItem(LS_KEY, key);

    // Re-render chat pane with full UI
    var chatPane = document.getElementById("awq-sw-pane-chat");
    if (chatPane) {
      chatPane.innerHTML = chatPaneHTML();
      document.getElementById("awq-sw-send").addEventListener("click", sendChat);
      document.getElementById("awq-sw-textarea").addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); }
      });
      document.getElementById("awq-sw-textarea").addEventListener("input", function () {
        this.style.height = "auto";
        this.style.height = Math.min(this.scrollHeight, 80) + "px";
      });
    }
    document.getElementById("awq-sw-head-sub").textContent = (BU_LABELS[BU] || BU) + " · Ativo";

    // Kick off briefing
    runBriefing();
  }

  // ─── Briefing (Alerts tab) ─────────────────────────────────────────────────
  function runBriefing(force) {
    if (!apiKey) return;
    var now = Date.now();
    var last = parseInt(localStorage.getItem(LS_BRIEFING_TS) || "0", 10);
    if (!force && alertsLoaded && (now - last) < BRIEFING_TTL) return;

    alertsLoaded = true;
    localStorage.setItem(LS_BRIEFING_TS, now);

    var list = document.getElementById("awq-sw-alerts-list");
    if (!list) return;
    list.innerHTML = '<div class="awq-sw-alert-item" style="color:#888">' + iconSpin() + ' Escaneando estado atual...</div>';

    var buNote = BU_CONTEXTS[BU] || ("Supervisor BU: " + BU);
    var sysPrompt = SYSTEM_PROMPT + "\n\n" + buNote;

    callAnthropic(
      sysPrompt,
      "Faça seu briefing de supervisão agora. Escanei o estado atual e liste os 3–5 alertas mais críticos no formato especificado.",
      [],
      function onToken(text, full) {
        if (!list) return;
        list.innerHTML = '<div class="awq-sw-alert-item">' + escHtml(full) + '</div>';
      },
      function onDone(full) {
        if (!list) return;
        list.innerHTML = '<div class="awq-sw-alert-item">' + escHtml(full) + '</div>';
        // Count critical (🔴) alerts for badge
        var reds = (full.match(/🔴/g) || []).length;
        var yellows = (full.match(/🟡/g) || []).length;
        setBadge(reds + yellows);
      },
      function onError(msg) {
        if (!list) return;
        list.innerHTML = '<div class="awq-sw-alert-item" style="color:#f87171">Erro: ' + escHtml(msg) + '</div>';
      }
    );
  }

  // ─── Chat ──────────────────────────────────────────────────────────────────
  function sendChat() {
    if (!apiKey || loading) return;
    var ta = document.getElementById("awq-sw-textarea");
    if (!ta) return;
    var text = ta.value.trim();
    if (!text) return;
    ta.value = "";
    ta.style.height = "auto";

    chatMessages.push({ role: "user", content: text });
    renderMessages();
    setLoading(true);

    var buNote = BU_CONTEXTS[BU] || ("Supervisor BU: " + BU);
    var sysPrompt = SYSTEM_PROMPT + "\n\n" + buNote;

    chatMessages.push({ role: "assistant", content: "" });
    renderMessages();

    callAnthropic(
      sysPrompt,
      null,
      chatMessages.slice(0, -1), // all except the empty placeholder
      function onToken(text, full) {
        chatMessages[chatMessages.length - 1].content = full;
        renderMessages();
      },
      function onDone(full) {
        chatMessages[chatMessages.length - 1].content = full;
        renderMessages();
        setLoading(false);
      },
      function onError(msg) {
        chatMessages.pop();
        chatMessages.push({ role: "assistant", content: "⚠️ Erro: " + msg });
        renderMessages();
        setLoading(false);
      }
    );
  }

  function setLoading(on) {
    loading = on;
    var btn = document.getElementById("awq-sw-send");
    if (btn) { btn.disabled = on; btn.innerHTML = on ? iconSpin() : iconSend(); }
    var ta = document.getElementById("awq-sw-textarea");
    if (ta) ta.disabled = on;
  }

  function renderMessages() {
    var msgs = document.getElementById("awq-sw-msgs");
    if (!msgs) return;
    msgs.innerHTML = chatMessages.map(function (m) {
      var cls = m.role === "user" ? "user" : "bot";
      var bubble = m.content
        ? escHtml(m.content)
        : '<span style="color:#555;display:flex;align-items:center;gap:4px">' + iconSpin() + ' Pensando...</span>';
      return '<div class="awq-sw-msg ' + cls + '"><div class="awq-sw-msg-bubble">' + bubble + '</div></div>';
    }).join("");
    msgs.scrollTop = msgs.scrollHeight;
  }

  // ─── Anthropic API call (streaming) ────────────────────────────────────────
  function callAnthropic(system, singleMsg, messages, onToken, onDone, onError) {
    var msgs = [];
    if (singleMsg) {
      msgs = [{ role: "user", content: singleMsg }];
    } else {
      msgs = messages;
    }

    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 1024,
        system: system,
        messages: msgs,
        stream: true,
      }),
    })
    .then(function (res) {
      if (!res.ok) {
        return res.json().then(function (d) {
          throw new Error(d.error && d.error.message ? d.error.message : "HTTP " + res.status);
        });
      }
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var full = "";
      var buf = "";

      function pump() {
        reader.read().then(function (result) {
          if (result.done) { onDone(full); return; }
          buf += decoder.decode(result.value, { stream: true });
          var lines = buf.split("\n");
          buf = lines.pop();
          lines.forEach(function (line) {
            if (!line.startsWith("data: ")) return;
            var d = line.slice(6).trim();
            if (d === "[DONE]") return;
            try {
              var ev = JSON.parse(d);
              if (ev.type === "content_block_delta" && ev.delta && ev.delta.text) {
                full += ev.delta.text;
                onToken(ev.delta.text, full);
              }
              if (ev.type === "error") {
                onError(ev.error ? ev.error.message : "Erro desconhecido");
              }
            } catch (e) { /* skip malformed line */ }
          });
          pump();
        }).catch(function (err) { onError(err.message || "Erro de leitura"); });
      }
      pump();
    })
    .catch(function (err) { onError(err.message || "Erro de rede"); });
  }

  // ─── Util ──────────────────────────────────────────────────────────────────
  function escHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/\n/g, "<br>");
  }

  // ─── Auto-briefing on load (throttled) ─────────────────────────────────────
  function maybeAutoBriefing() {
    if (!apiKey) return;
    var now = Date.now();
    var last = parseInt(localStorage.getItem(LS_BRIEFING_TS) || "0", 10);
    if ((now - last) < BRIEFING_TTL) return;
    // Pre-load briefing in background so alerts are ready when panel opens
    runBriefing();
  }

  // ─── Init ──────────────────────────────────────────────────────────────────
  function init() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", doInit);
    } else {
      doInit();
    }
  }

  function doInit() {
    buildWidget();
    wireRefreshBtn();
    // Restore panel state on load if desired
    setTimeout(maybeAutoBriefing, 1500);
  }

  init();
})();
