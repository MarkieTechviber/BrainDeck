// public/js/summary.js
'use strict';

(function () {
  const cardTitle  = document.getElementById('cardTitle');
  const keyList    = document.getElementById('keyPointsList');
  const cardSummary= document.getElementById('cardSummary');
  const progressBar= document.getElementById('progressBar');
  const currentNum = document.getElementById('currentCardNum');
  const totalEl    = document.getElementById('totalCards');
  const prevBtn    = document.getElementById('prevBtn');
  const nextBtn    = document.getElementById('nextBtn');
  const complete   = document.getElementById('sessionComplete');
  const restartBtn = document.getElementById('restartBtn');
  const compTotal  = document.getElementById('completeTotal');

  let cards=[], current=0, chapterGroups=null;

  function escHtml(s){ const d=document.createElement('div'); d.appendChild(document.createTextNode(s)); return d.innerHTML; }

  function renderCard(idx) {
    const card = cards[idx]; if(!card) return;
    cardTitle.textContent   = card.title;
    cardSummary.textContent = card.summary;
    keyList.innerHTML = (card.keyPoints||[]).map(p=>
      `<li><i class="bi bi-check-circle-fill bd-check-icon"></i><span>${escHtml(p)}</span></li>`
    ).join('');
    currentNum.textContent = idx+1;
    progressBar.style.width = Math.round(((idx+1)/cards.length)*100)+'%';
    prevBtn.disabled = idx===0;
    if (typeof Chapters !== 'undefined' && chapterGroups) {
      Chapters.updateActive(idx, chapterGroups);
    }
    nextBtn.innerHTML = idx===cards.length-1
      ? '<i class="bi bi-flag-fill me-1"></i>Finish'
      : 'Next<i class="bi bi-chevron-right ms-1"></i>';
  }

  function showComplete() {
    document.querySelector('main').classList.add('d-none');
    complete.classList.remove('d-none');
    compTotal.textContent = cards.length;
  }

  function init(list, chapters) {
    cards=list; current=0; totalEl.textContent=cards.length;
    document.querySelector('main').classList.remove('d-none');
    complete.classList.add('d-none');
    if (typeof Chapters !== 'undefined' && !chapterGroups) {
      chapterGroups = Chapters.inject(cards, 'summary', chapters, (startIdx) => {
        current = startIdx; renderCard(current);
      });
    }
    renderCard(0);
  }

  prevBtn.addEventListener('click', ()=>{ if(current>0){current--;renderCard(current);} });
  nextBtn.addEventListener('click', ()=>{ if(current<cards.length-1){current++;renderCard(current);}else showComplete(); });
  restartBtn.addEventListener('click', ()=>init(cards));

  document.addEventListener('keydown', e=>{
    if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;
    if(e.key==='ArrowRight') nextBtn.click();
    if(e.key==='ArrowLeft')  prevBtn.click();
  });

  const raw = localStorage.getItem('bd_session');
  if (!raw) { new bootstrap.Modal(document.getElementById('noSessionModal')).show(); return; }
  const session = JSON.parse(raw);

  if (session.cardType==='summary' && session.cards?.length) {
    init(session.cards, session.chapters||[]);
  } else if (session.sessionId?.startsWith('deck_')) {
    const deckId = session.sessionId.replace('deck_', '');
    const loadM = new bootstrap.Modal(document.getElementById('loadingModal'));
    loadM.show();
    fetch(`/api/decks/${deckId}`, { headers: BrainDeckAuth.getHeaders(), credentials: 'include' })
      .then(res => res.json())
      .then(d => {
        loadM.hide();
        if(d.success && d.data.deck.cards?.length){
          const deck = d.data.deck;
          session.cards = deck.cards;
          session.chapters = [];
          session.cardType = 'summary';
          session.cardCount = deck.cardCount;
          localStorage.setItem('bd_session', JSON.stringify(session));
          init(deck.cards, []);
        } else new bootstrap.Modal(document.getElementById('noSessionModal')).show();
      }).catch(() => { loadM.hide(); new bootstrap.Modal(document.getElementById('noSessionModal')).show(); });
  } else if (session.sessionId) {
    const loadM = new bootstrap.Modal(document.getElementById('loadingModal'));
    loadM.show();
    BrainDeckAPI.getCardsForType(session.sessionId,'summary')
      .then(res=>{
        loadM.hide();
        if(res.success && res.data.cards.length){ session.cards=res.data.cards; session.chapters=res.data.chapters||[]; session.cardType='summary'; localStorage.setItem('bd_session',JSON.stringify(session)); init(res.data.cards, res.data.chapters||[]); }
        else new bootstrap.Modal(document.getElementById('noSessionModal')).show();
      }).catch(()=>{ loadM.hide(); new bootstrap.Modal(document.getElementById('noSessionModal')).show(); });
  } else { new bootstrap.Modal(document.getElementById('noSessionModal')).show(); }
})();
