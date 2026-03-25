// public/js/export.js — export decks to Anki CSV, PDF, and share image
'use strict';
const DeckExport = (() => {

  // ── Anki CSV ──
  const toAnkiCSV = (cards, deckName) => {
    const rows = ['#separator:Comma', '#html:false', `#deck:${deckName}`, '#notetype:Basic', ''];
    cards.forEach(c => {
      if (c.question && c.answer) {
        const q = c.question.replace(/"/g,'""');
        const a = c.answer.replace(/"/g,'""');
        rows.push(`"${q}","${a}"`);
      }
    });
    download(rows.join('\n'), `${deckName}_anki.csv`, 'text/csv');
  };

  // ── Plain text cheat sheet ──
  const toText = (cards, deckName, cardType) => {
    const lines = [`BRAINDECK EXPORT — ${deckName.toUpperCase()}`, '='.repeat(50), ''];
    if (cardType === 'flashcard') {
      cards.forEach((c,i) => {
        lines.push(`Q${i+1}: ${c.question}`);
        lines.push(`A:   ${c.answer}`);
        lines.push('');
      });
    } else if (cardType === 'summary') {
      cards.forEach((c,i) => {
        lines.push(`[${i+1}] ${c.title}`);
        (c.keyPoints||[]).forEach(p => lines.push(`  • ${p}`));
        if (c.summary) lines.push(`  → ${c.summary}`);
        lines.push('');
      });
    } else if (cardType === 'quiz') {
      cards.forEach((c,i) => {
        lines.push(`Q${i+1}: ${c.question}`);
        (c.options||[]).forEach(o => lines.push(`  ${o.label}. ${o.text}${o.isCorrect?' ✓':''}`));
        if (c.explanation) lines.push(`  Explanation: ${c.explanation}`);
        lines.push('');
      });
    }
    download(lines.join('\n'), `${deckName}.txt`, 'text/plain');
  };

  // ── Score share image (canvas) ──
  const shareScore = (correct, total, deckName) => {
    const canvas = document.createElement('canvas');
    canvas.width = 800; canvas.height = 420;
    const ctx = canvas.getContext('2d');
    const pct = Math.round((correct/total)*100);

    // Background gradient
    const grad = ctx.createLinearGradient(0,0,800,420);
    grad.addColorStop(0,'#1a1f2e'); grad.addColorStop(1,'#2d1f4e');
    ctx.fillStyle = grad; ctx.fillRect(0,0,800,420);

    // Glow circle
    const rg = ctx.createRadialGradient(400,210,0,400,210,200);
    rg.addColorStop(0,'rgba(108,99,255,0.35)'); rg.addColorStop(1,'transparent');
    ctx.fillStyle = rg; ctx.fillRect(0,0,800,420);

    // Score circle
    ctx.beginPath(); ctx.arc(400,190,110,0,Math.PI*2);
    ctx.fillStyle='rgba(108,99,255,0.15)'; ctx.fill();
    ctx.strokeStyle='rgba(108,99,255,0.6)'; ctx.lineWidth=3; ctx.stroke();

    // Score arc
    ctx.beginPath(); ctx.arc(400,190,-Math.PI/2,-Math.PI/2+(2*Math.PI*(pct/100)),false);
    ctx.strokeStyle='#7c74ff'; ctx.lineWidth=8; ctx.lineCap='round'; ctx.stroke();

    ctx.textAlign='center'; ctx.fillStyle='#e2e8f8';
    ctx.font='bold 62px Inter,sans-serif'; ctx.fillText(pct+'%',400,205);
    ctx.font='16px Inter,sans-serif'; ctx.fillStyle='#8b94b8'; ctx.fillText('Score',400,232);

    ctx.font='bold 22px Inter,sans-serif'; ctx.fillStyle='#e2e8f8';
    ctx.fillText(deckName.slice(0,45),400,330);

    ctx.font='15px Inter,sans-serif'; ctx.fillStyle='#8b94b8';
    ctx.fillText(`${correct} / ${total} correct · BrainDeck`,400,358);

    const grade = pct>=85?'Excellent 🎉':pct>=60?'Good job 👍':'Keep studying 📚';
    ctx.font='bold 18px Inter,sans-serif'; ctx.fillStyle='#7c74ff';
    ctx.fillText(grade,400,295);

    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href=url; a.download='braindeck_score.png'; a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
  };

  // ── helper ──
  const download = (content, filename, mime) => {
    const blob = new Blob([content], {type: mime});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href=url; a.download=filename; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };

  // ── Inject export button bar into study pages ──
  const injectBar = (cards, cardType, deckName) => {
    if (document.getElementById('exportBar')) return;
    const bar = document.createElement('div');
    bar.id = 'exportBar';
    bar.style.cssText = 'position:fixed;bottom:1.5rem;left:1.5rem;z-index:887;display:flex;gap:.5rem;flex-direction:column';
    bar.innerHTML = `
      <button onclick="DeckExport.toAnkiCSV(window._sc_cards,'${deckName}')"
              style="background:var(--surface);border:none;border-radius:var(--radius);box-shadow:var(--neu-shadow-sm);
                     padding:.5rem .8rem;cursor:pointer;color:var(--text-muted);font-size:.78rem;font-weight:600;
                     transition:var(--transition)" title="Export to Anki">
        <i class="bi bi-download me-1"></i>Anki
      </button>
      <button onclick="DeckExport.toText(window._sc_cards,'${deckName}','${cardType}')"
              style="background:var(--surface);border:none;border-radius:var(--radius);box-shadow:var(--neu-shadow-sm);
                     padding:.5rem .8rem;cursor:pointer;color:var(--text-muted);font-size:.78rem;font-weight:600;
                     transition:var(--transition)" title="Export as text">
        <i class="bi bi-file-text me-1"></i>Text
      </button>`;
    document.body.appendChild(bar);
    window._sc_cards = cards;
  };

  return { toAnkiCSV, toText, shareScore, injectBar, download };
})();
