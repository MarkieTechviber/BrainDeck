// public/js/chat.js — AI document chat panel
'use strict';
const DocChat = (() => {
  let open = false;
  let history = [];
  const MAX_HIST = 20;

  const getContext = () => {
    try {
      const s = JSON.parse(localStorage.getItem('bd_session') || '{}');
      return s.extractedText || s.cards?.map(c => c.question + ' ' + (c.answer||'')).join(' ') || '';
    } catch { return ''; }
  };

  const inject = () => {
    if (document.getElementById('docChatPanel')) return;

    // Toggle button
    const btn = document.createElement('button');
    btn.id = 'chatToggleBtn';
    btn.innerHTML = '<i class="bi bi-chat-dots-fill"></i>';
    btn.setAttribute('title','Ask about your document (AI Chat)');
    btn.style.cssText = `position:fixed;bottom:5.5rem;right:1.5rem;z-index:889;width:48px;height:48px;
      border-radius:50%;border:none;cursor:pointer;font-size:1.2rem;
      background:var(--grad-primary);color:#fff;
      box-shadow:4px 4px 12px rgba(108,99,255,0.45);transition:var(--transition)`;
    btn.onclick = toggle;
    document.body.appendChild(btn);

    // Panel
    const panel = document.createElement('div');
    panel.id = 'docChatPanel';
    panel.style.cssText = `position:fixed;bottom:7.5rem;right:1.5rem;z-index:888;width:340px;max-height:460px;
      display:none;flex-direction:column;
      background:var(--surface);border-radius:var(--radius-xl);
      box-shadow:var(--neu-hover);overflow:hidden`;
    panel.innerHTML = `
      <div style="padding:.9rem 1rem;background:var(--grad-primary);color:#fff;display:flex;align-items:center;justify-content:space-between">
        <span style="font-weight:700;font-size:.9rem"><i class="bi bi-chat-dots me-2"></i>Ask about your document</span>
        <button onclick="DocChat.toggle()" style="background:none;border:none;color:rgba(255,255,255,0.8);cursor:pointer;font-size:1rem">&times;</button>
      </div>
      <div id="chatMessages" style="flex:1;overflow-y:auto;padding:.75rem;display:flex;flex-direction:column;gap:.5rem;max-height:300px"></div>
      <div style="padding:.6rem;border-top:.5px solid rgba(108,99,255,0.1);display:flex;gap:.4rem">
        <input id="chatInput" type="text" placeholder="Ask anything about this doc…"
               style="flex:1;background:var(--bg);border:none;border-radius:var(--radius);
                      box-shadow:var(--neu-inset);padding:.5rem .75rem;font-size:.85rem;
                      color:var(--text);outline:none"
               onkeydown="if(event.key==='Enter')DocChat.send()">
        <button onclick="DocChat.send()"
                style="background:var(--grad-primary);color:#fff;border:none;border-radius:var(--radius);
                       padding:.5rem .8rem;cursor:pointer;font-size:.85rem;font-weight:600;
                       box-shadow:3px 3px 8px rgba(108,99,255,0.35)">
          <i class="bi bi-send-fill"></i>
        </button>
      </div>`;
    document.body.appendChild(panel);
  };

  const addMsg = (text, role) => {
    const box = document.getElementById('chatMessages');
    if (!box) return;
    const msg = document.createElement('div');
    const isUser = role === 'user';
    msg.style.cssText = `max-width:88%;padding:.5rem .75rem;border-radius:12px;font-size:.84rem;line-height:1.5;
      ${isUser ? 'align-self:flex-end;background:var(--primary);color:#fff;border-bottom-right-radius:4px'
               : 'align-self:flex-start;background:var(--bg);color:var(--text);border-bottom-left-radius:4px;box-shadow:var(--neu-shadow-sm)'}`;
    msg.textContent = text;
    box.appendChild(msg);
    box.scrollTop = box.scrollHeight;
  };

  const send = async () => {
    const input = document.getElementById('chatInput');
    if (!input) return;
    const q = input.value.trim();
    if (!q) return;
    input.value = '';
    addMsg(q, 'user');
    history.push({ role:'user', content: q });
    if (history.length > MAX_HIST) history = history.slice(-MAX_HIST);

    const thinking = document.createElement('div');
    thinking.id = 'chatThinking';
    thinking.style.cssText = 'align-self:flex-start;color:var(--text-muted);font-size:.82rem;padding:.4rem .75rem';
    thinking.textContent = '…';
    document.getElementById('chatMessages')?.appendChild(thinking);

    const context = getContext();
    const sysPrompt = context
      ? `You are a helpful study assistant. The user is studying a document. Here is an excerpt of the document content:\n\n${context.slice(0,3000)}\n\nAnswer questions about this content concisely and helpfully. If asked something not in the document, say so.`
      : 'You are a helpful study assistant. Answer questions to help the user study.';

    try {
      const aiState = await fetch('/api/ai-mode').then(r=>r.json()).catch(()=>({mode:'local'}));
      const payload = {
        mode: aiState.mode, provider: aiState.provider,
        systemPrompt: sysPrompt,
        messages: history.slice(-10),
      };
      const r = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      const d = await r.json();
      thinking.remove();
      const reply = d.reply || d.message || 'Sorry, I could not get a response.';
      addMsg(reply, 'assistant');
      history.push({ role:'assistant', content: reply });
    } catch {
      thinking.remove();
      addMsg('Could not reach the AI. Check your AI settings.', 'assistant');
    }
  };

  const toggle = () => {
    inject();
    open = !open;
    const panel = document.getElementById('docChatPanel');
    if (panel) panel.style.display = open ? 'flex' : 'none';
    if (open && !document.getElementById('chatMessages')?.children.length) {
      addMsg('Hi! Ask me anything about your document. 📚', 'assistant');
    }
  };

  return { inject, send, toggle };
})();

// Auto-inject on pages that have a session
if (localStorage.getItem('bd_session')) {
  document.addEventListener('DOMContentLoaded', () => DocChat.inject());
}
