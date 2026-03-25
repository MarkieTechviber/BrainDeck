// public/js/aimode.js — Multi-provider AI Settings Panel
'use strict';

(function () {
  // Support both logged-in and guest navbar placeholders
  const placeholder = document.getElementById('aiModeSwitcher') || document.getElementById('aiModeSwitcherGuest');
  if (!placeholder) return;

  // Also populate the other placeholder if it exists on the same page
  const allPlaceholders = [
    document.getElementById('aiModeSwitcher'),
    document.getElementById('aiModeSwitcherGuest'),
  ].filter(Boolean);

  const badgeHTML = `
    <span class="bd-ai-badge" id="aiModeBadge"
          data-bs-toggle="modal" data-bs-target="#aiModeModal"
          title="AI Settings" style="cursor:pointer;user-select:none">
      <i class="bi bi-cpu-fill me-1"></i><span id="aiModeLabel">AI</span>
    </span>`;

  // ── 1. Badge in navbar placeholder(s) ──
  allPlaceholders.forEach((el, i) => {
    if (i === 0) {
      el.innerHTML = badgeHTML;
    } else {
      // Clone badge for second placeholder but without id conflicts
      el.innerHTML = badgeHTML.replace('id="aiModeBadge"', '').replace('id="aiModeLabel"', 'class="aiModeLabel"');
    }
  });

  // ── 2. Modal appended directly to <body> so it escapes all stacking contexts ──
  const _tmpDiv = document.createElement('div');
  _tmpDiv.innerHTML = `
    <div class="modal fade" id="aiModeModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-0 rounded-4"
             style="background:var(--modal-bg);border:1px solid var(--modal-border)!important;box-shadow:var(--modal-shadow)">

          <div class="modal-header border-0 px-4 pt-4 pb-0">
            <div>
              <h5 class="modal-title fw-800 mb-0" style="color:var(--text)">
                <i class="bi bi-cpu me-2" style="color:var(--primary)"></i>AI Engine Settings
              </h5>
              <p class="bd-text-muted bd-font-sm mb-0 mt-1">Choose your AI engine and configure API access.</p>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>

          <div class="modal-body px-4 py-3">

            <!-- Mode tabs -->
            <div class="d-flex gap-2 mb-4">
              <button class="btn bd-mode-tab flex-fill py-2 rounded-3 fw-600" id="tabLocal" type="button">
                <i class="bi bi-pc-display me-2"></i>Local AI
              </button>
              <button class="btn bd-mode-tab flex-fill py-2 rounded-3 fw-600" id="tabCloud" type="button">
                <i class="bi bi-cloud-fill me-2"></i>Cloud API
              </button>
            </div>

            <!-- LOCAL panel -->
            <div id="localPanel">
              <div class="neu-card p-3">
                <div class="d-flex align-items-center gap-2 mb-2">
                  <i class="bi bi-pc-display fs-5" style="color:var(--success)"></i>
                  <span class="fw-700" style="color:var(--text)">Ollama</span>
                  <span class="px-2 py-1 rounded-pill bd-font-xs fw-600"
                        style="background:rgba(52,211,153,0.12);color:var(--success);border:1px solid rgba(52,211,153,0.25)">
                    Free · Private
                  </span>
                </div>
                <p class="bd-text-muted bd-font-sm mb-3">
                  Runs on your machine. Requires <a href="https://ollama.ai" target="_blank" style="color:var(--primary)">Ollama</a> running locally.
                </p>
                <label class="bd-font-xs fw-700 mb-1 d-block"
                       style="color:var(--text-muted);letter-spacing:.05em;text-transform:uppercase">
                  Installed Models
                </label>
                <select class="neu-input mb-2" id="ollamaModelSelect" style="padding:.6rem 1rem"></select>
                <div class="bd-font-xs" id="ollamaStatusMsg"></div>
                <div class="mt-3 bd-font-sm bd-text-muted">
                  <i class="bi bi-terminal me-1"></i>Pull a model:
                  <code style="background:var(--bg);padding:2px 8px;border-radius:6px">ollama pull llama3</code>
                </div>
              </div>
            </div>

            <!-- CLOUD panel -->
            <div id="cloudPanel" class="d-none">
              <p class="bd-font-xs fw-700 mb-2"
                 style="color:var(--text-muted);letter-spacing:.05em;text-transform:uppercase">
                Select Provider
              </p>
              <div class="row g-2 mb-3" id="providerGrid"></div>

              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label class="bd-font-xs fw-700 mb-1 d-block"
                         style="color:var(--text-muted);letter-spacing:.05em;text-transform:uppercase">Model</label>
                  <select class="neu-input" id="cloudModelSelect" style="padding:.6rem 1rem"></select>
                </div>
                <div class="col-md-6 d-none" id="customUrlCol">
                  <label class="bd-font-xs fw-700 mb-1 d-block"
                         style="color:var(--text-muted);letter-spacing:.05em;text-transform:uppercase">Endpoint URL</label>
                  <input type="url" class="neu-input" id="customUrlInput"
                         placeholder="https://your-api.../v1/chat/completions">
                </div>
              </div>

              <div class="mb-2">
                <label class="bd-font-xs fw-700 mb-1 d-block"
                       style="color:var(--text-muted);letter-spacing:.05em;text-transform:uppercase">API Key</label>
                <div style="position:relative">
                  <input type="password" class="neu-input" id="apiKeyInput"
                         placeholder="Paste your API key here…"
                         autocomplete="off" style="padding-right:3rem">
                  <button id="toggleKeyBtn" type="button"
                          style="position:absolute;right:.75rem;top:50%;transform:translateY(-50%);
                                 background:none;border:none;color:var(--text-light);cursor:pointer;padding:0">
                    <i class="bi bi-eye" id="toggleKeyIcon"></i>
                  </button>
                </div>
                <div class="mt-1 bd-font-xs" id="apiKeyStatus"></div>
              </div>

              <!-- Test Connection -->
              <div class="mt-3 d-flex align-items-center gap-2 flex-wrap">
                <button type="button" class="btn rounded-3 fw-600 bd-font-sm px-3 py-2" id="testConnectionBtn"
                        style="background:rgba(108,99,255,0.1);border:1px solid rgba(108,99,255,0.3);color:var(--primary);transition:all .2s">
                  <i class="bi bi-wifi me-1"></i>Test Connection
                </button>
                <div id="testConnectionResult" class="bd-font-xs"></div>
              </div>

              <div class="bd-font-xs mt-2" id="providerLinks"></div>
            </div>

            <div class="rounded-3 p-2 px-3 d-none mt-3 bd-font-sm" id="aiModeError"
                 style="background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);color:#c0392b">
            </div>
          </div>

          <div class="modal-footer border-0 px-4 pb-4 pt-0">
            <button type="button" class="btn-neu px-4 py-2 rounded-3 fw-600"
                    data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn-primary-neu px-5 py-2 rounded-3 fw-600" id="applyAiMode">
              <i class="bi bi-check-lg me-1"></i>Apply
            </button>
          </div>

        </div>
      </div>
    </div>`;

  // Append ONLY the modal element itself — no wrapper div blocking the page
  while (_tmpDiv.firstElementChild) {
    document.body.appendChild(_tmpDiv.firstElementChild);
  }

  // ── Providers ──
  const PROVIDERS = {
    claude:     { name:'Claude',     icon:'bi-stars',                 colorVar:'--warning',   badge:'Anthropic',    link:'https://console.anthropic.com/keys',        linkLabel:'Get Claude key',     models:['claude-opus-4-5','claude-sonnet-4-20250514','claude-haiku-4-5-20251001','claude-3-5-sonnet-20241022'] },
    openai:     { name:'OpenAI',     icon:'bi-circle-fill',           colorVar:'--text',      badge:'GPT',          link:'https://platform.openai.com/api-keys',       linkLabel:'Get OpenAI key',     models:['gpt-4o','gpt-4o-mini','gpt-4-turbo','gpt-3.5-turbo'] },
    groq:       { name:'Groq',       icon:'bi-lightning-charge-fill', colorVar:'--danger',    badge:'Fast · Free',  link:'https://console.groq.com/keys',              linkLabel:'Get Groq key',       models:['llama-3.3-70b-versatile','llama-3.1-70b-versatile','llama-3.1-8b-instant','llama3-8b-8192','gemma2-9b-it','mixtral-8x7b-32768'] },
    mistral:    { name:'Mistral',    icon:'bi-wind',                  colorVar:'--primary',   badge:'EU · Open',    link:'https://console.mistral.ai/api-keys',        linkLabel:'Get Mistral key',    models:['mistral-large-latest','mistral-small-latest','open-mixtral-8x7b'] },
    gemini:     { name:'Gemini',     icon:'bi-google',                colorVar:'--success',   badge:'Google',       link:'https://aistudio.google.com/app/apikey',     linkLabel:'Get Gemini key',     models:['gemini-1.5-pro','gemini-1.5-flash','gemini-2.0-flash-exp'] },
    together:   { name:'Together',   icon:'bi-people-fill',           colorVar:'--secondary', badge:'Open Models',  link:'https://api.together.ai/settings/api-keys',  linkLabel:'Get Together key',   models:['meta-llama/Llama-3-70b-chat-hf','meta-llama/Llama-3-8b-chat-hf','mistralai/Mixtral-8x7B-Instruct-v0.1'] },
    openrouter: { name:'OpenRouter', icon:'bi-diagram-3-fill',        colorVar:'--secondary', badge:'Multi-model',  link:'https://openrouter.ai/keys',                 linkLabel:'Get OpenRouter key', models:['openai/gpt-4o','openai/gpt-4o-mini','anthropic/claude-3.5-sonnet','google/gemini-flash-1.5','meta-llama/llama-3.1-70b-instruct'] },
    custom:     { name:'Custom',     icon:'bi-gear-fill',             colorVar:'--text-muted',badge:'OpenAI-compat',link:null, models:[] },
  };

  let activeMode     = 'local';
  let activeProvider = 'claude';
  let ollamaModel    = 'llama3';
  let savedKeys      = JSON.parse(localStorage.getItem('bd_api_keys') || '{}');

  // DOM refs — resolved after appendChild
  const get = id => document.getElementById(id);

  // ── Badge update ──
  function updateBadge() {
    const badge     = get('aiModeBadge');
    const modeLabel = get('aiModeLabel');
    if (!badge || !modeLabel) return;

    let badgeStyle, labelText;
    if (activeMode === 'local') {
      badgeStyle = 'background:rgba(52,211,153,0.12);border:1px solid rgba(52,211,153,0.3);color:var(--success);cursor:pointer;user-select:none;display:inline-flex;align-items:center;border-radius:50px;padding:.35rem .9rem;font-size:.78rem;font-weight:600';
      labelText = 'Ollama';
    } else {
      const p = PROVIDERS[activeProvider] || PROVIDERS.claude;
      badgeStyle = 'background:rgba(108,99,255,0.12);border:1px solid rgba(108,99,255,0.25);color:var(--primary);cursor:pointer;user-select:none;display:inline-flex;align-items:center;border-radius:50px;padding:.35rem .9rem;font-size:.78rem;font-weight:600';
      labelText = p.name;
    }
    badge.style.cssText = badgeStyle;
    modeLabel.textContent = labelText;
    // Sync any secondary badge labels (e.g. guest navbar)
    document.querySelectorAll('.aiModeLabel').forEach(el => el.textContent = labelText);
  }

  // ── Tabs ──
  function showTab(mode) {
    activeMode = mode;
    const tabLocal  = get('tabLocal');
    const tabCloud  = get('tabCloud');
    const localPanel= get('localPanel');
    const cloudPanel= get('cloudPanel');
    tabLocal?.classList.toggle('active-tab', mode === 'local');
    tabCloud?.classList.toggle('active-tab', mode === 'cloud');
    localPanel?.classList.toggle('d-none', mode !== 'local');
    cloudPanel?.classList.toggle('d-none', mode !== 'cloud');
  }

  get('tabLocal')?.addEventListener('click', () => { showTab('local'); fetchOllamaModels(); });
  get('tabCloud')?.addEventListener('click', () => showTab('cloud'));

  // ── Provider grid ──
  function buildGrid() {
    const provGrid = get('providerGrid');
    if (!provGrid) return;
    provGrid.innerHTML = Object.entries(PROVIDERS).map(([id, p]) => `
      <div class="col-6 col-md-3">
        <button class="btn bd-provider-btn w-100 rounded-3 p-2 text-center bd-font-sm fw-600 ${id === activeProvider ? 'active' : ''}"
                data-provider="${id}" type="button">
          <i class="bi ${p.icon} d-block fs-5 mb-1" style="color:var(${p.colorVar})"></i>
          ${p.name}<br>
          <span class="bd-font-xs fw-400" style="color:var(--text-muted)">${p.badge}</span>
        </button>
      </div>`).join('');
    provGrid.querySelectorAll('[data-provider]').forEach(b =>
      b.addEventListener('click', () => { selectProvider(b.dataset.provider); resetTestResult(); })
    );
  }

  function selectProvider(id) {
    activeProvider = id;
    buildGrid();
    const p         = PROVIDERS[id];
    const modelSel  = get('cloudModelSelect');
    const custUrlCol= get('customUrlCol');
    const apiKeyEl  = get('apiKeyInput');
    const toggleIco = get('toggleKeyIcon');
    const provLinks = get('providerLinks');

    if (modelSel) modelSel.innerHTML = p.models.length
      ? p.models.map(m => `<option value="${m}">${m}</option>`).join('')
      : '<option value="">Enter model manually</option>';

    custUrlCol?.classList.toggle('d-none', id !== 'custom');
    const k = savedKeys[id] || '';
    if (apiKeyEl) { apiKeyEl.value = k; apiKeyEl.type = 'password'; }
    if (toggleIco) toggleIco.className = 'bi bi-eye';
    updateKeyStatus(k);
    if (provLinks) provLinks.innerHTML = p.link
      ? `<a href="${p.link}" target="_blank" style="color:var(--primary);text-decoration:none">
           <i class="bi bi-box-arrow-up-right me-1"></i>${p.linkLabel}
         </a>` : '';
  }

  function updateKeyStatus(k) {
    const keyStatus = get('apiKeyStatus');
    if (!keyStatus) return;
    if (!k) {
      keyStatus.innerHTML = '<span style="color:var(--text-muted)"><i class="bi bi-info-circle me-1"></i>No key entered</span>';
    } else {
      const masked = k.slice(0,6) + '••••••••' + k.slice(-4);
      keyStatus.innerHTML = `<span style="color:var(--success)"><i class="bi bi-check-circle-fill me-1"></i>Key saved: ${masked}</span>`;
    }
  }

  get('apiKeyInput')?.addEventListener('input', () => updateKeyStatus(get('apiKeyInput').value.trim()));
  get('toggleKeyBtn')?.addEventListener('click', () => {
    const inp = get('apiKeyInput');
    const ico = get('toggleKeyIcon');
    if (!inp || !ico) return;
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    ico.className = show ? 'bi bi-eye-slash' : 'bi bi-eye';
  });

  // ── Ollama models ──
  async function fetchOllamaModels() {
    const sel = get('ollamaModelSelect');
    const st  = get('ollamaStatusMsg');
    if (!sel) return;
    sel.innerHTML = '<option>Loading...</option>';
    if (st) st.innerHTML = '';
    try {
      const d = await fetch('/api/ollama/models').then(r => r.json());
      if (d.success && d.models.length) {
        sel.innerHTML = d.models.map(m =>
          `<option value="${m.name}" ${m.name === ollamaModel ? 'selected' : ''}>${m.name}</option>`
        ).join('');
        if (st) st.innerHTML = `<span style="color:var(--success)"><i class="bi bi-check-circle-fill me-1"></i>Ollama connected — ${d.models.length} model(s)</span>`;
      } else {
        sel.innerHTML = `<option value="${ollamaModel}">${ollamaModel} (default)</option>`;
        if (st) st.innerHTML = `<span style="color:var(--warning)"><i class="bi bi-exclamation-triangle-fill me-1"></i>${d.error || 'Ollama not reachable'}</span>`;
      }
    } catch {
      sel.innerHTML = `<option value="${ollamaModel}">${ollamaModel}</option>`;
      if (st) st.innerHTML = `<span style="color:var(--danger)"><i class="bi bi-x-circle-fill me-1"></i>Cannot reach Ollama</span>`;
    }
  }

  // ── Fetch current state ──
  async function fetchState() {
    try {
      const d = await fetch('/api/ai-mode').then(r => r.json());
      activeMode     = d.mode;
      activeProvider = d.provider || 'claude';
      ollamaModel    = d.ollamaModel || 'llama3';
      updateBadge();
    } catch { updateBadge(); }
  }

  // ── Modal open ──
  get('aiModeModal')?.addEventListener('show.bs.modal', async () => {
    get('aiModeError')?.classList.add('d-none');
    await fetchState();
    showTab(activeMode);
    buildGrid();
    selectProvider(activeProvider);
    if (activeMode === 'local') await fetchOllamaModels();
  });

  // ── Apply ──
  get('applyAiMode')?.addEventListener('click', async () => {
    const errBox   = get('aiModeError');
    const applyBtn = get('applyAiMode');
    const apiKeyEl = get('apiKeyInput');
    const modelSel = get('cloudModelSelect');
    const custUrl  = get('customUrlInput');
    const ollamaSel= get('ollamaModelSelect');

    errBox?.classList.add('d-none');
    if (applyBtn) { applyBtn.disabled = true; applyBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Applying...'; }

    try {
      const mode = activeMode;
      const key  = apiKeyEl?.value.trim() || '';
      const oMod = ollamaSel?.value || ollamaModel;

      if (mode === 'cloud' && key) {
        savedKeys[activeProvider] = key;
        localStorage.setItem('bd_api_keys', JSON.stringify(savedKeys));
      }

      const r = await fetch('/api/ai-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode, provider: activeProvider,
          apiKey: key,
          model: modelSel?.value || '',
          customUrl: custUrl?.value.trim() || '',
          ollamaModel: oMod,
        }),
      });
      const d = await r.json();

      if (d.success) {
        activeMode     = d.mode;
        activeProvider = d.provider || activeProvider;
        ollamaModel    = d.ollamaModel || oMod;
        updateBadge();
        bootstrap.Modal.getInstance(get('aiModeModal'))?.hide();
      } else {
        if (errBox) { errBox.textContent = d.message || 'Failed.'; errBox.classList.remove('d-none'); }
      }
    } catch {
      if (errBox) { errBox.textContent = 'Network error.'; errBox.classList.remove('d-none'); }
    } finally {
      if (applyBtn) { applyBtn.disabled = false; applyBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Apply'; }
    }
  });

  // ── Test Connection ──
  get('testConnectionBtn')?.addEventListener('click', async () => {
    const btn        = get('testConnectionBtn');
    const resultEl   = get('testConnectionResult');
    const apiKeyEl   = get('apiKeyInput');
    const modelSel   = get('cloudModelSelect');
    const custUrl    = get('customUrlInput');

    const key   = apiKeyEl?.value.trim() || '';
    const model = modelSel?.value || '';
    const url   = custUrl?.value.trim() || '';

    if (!key) {
      resultEl.innerHTML = '<span style="color:var(--warning)"><i class="bi bi-exclamation-triangle-fill me-1"></i>Please enter an API key first.</span>';
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Testing…';
    resultEl.innerHTML = '';

    try {
      const r = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: activeProvider, apiKey: key, model, customUrl: url }),
      });
      const d = await r.json();
      if (d.success) {
        resultEl.innerHTML = `<span style="color:var(--success)"><i class="bi bi-check-circle-fill me-1"></i>Connected! ${d.message || ''}</span>`;
      } else {
        resultEl.innerHTML = `<span style="color:var(--danger)"><i class="bi bi-x-circle-fill me-1"></i>${d.message || 'Connection failed.'}</span>`;
      }
    } catch {
      resultEl.innerHTML = '<span style="color:var(--danger)"><i class="bi bi-x-circle-fill me-1"></i>Network error — server unreachable.</span>';
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-wifi me-1"></i>Test Connection';
    }
  });

  // Reset test result when switching provider or typing new key
  function resetTestResult() {
    const el = get('testConnectionResult');
    if (el) el.innerHTML = '';
  }
  get('apiKeyInput')?.addEventListener('input', resetTestResult);

  // ── Init ──
  fetchState();

})();
