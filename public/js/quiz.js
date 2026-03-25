// public/js/quiz.js
'use strict';

(function () {
  const currentQEl  = document.getElementById('currentQ');
  const totalQEl    = document.getElementById('totalQ');
  const scoreEl     = document.getElementById('scoreCorrect');
  const progressBar = document.getElementById('progressBar');
  const qNum        = document.getElementById('questionNum');
  const qText       = document.getElementById('questionText');
  const optList     = document.getElementById('optionsList');
  const explanation = document.getElementById('explanation');
  const explTxt     = document.getElementById('explanationText');
  const nextWrapper = document.getElementById('nextBtnWrapper');
  const nextBtn     = document.getElementById('nextQuestionBtn');
  const qCard       = document.getElementById('questionCard');
  const finalDiv    = document.getElementById('finalScore');
  const finalPct    = document.getElementById('finalPct');
  const badgeTxt    = document.getElementById('scoreBadgeText');
  const finalCorr   = document.getElementById('finalCorrect');
  const finalTot    = document.getElementById('finalTotal');
  const retryBtn    = document.getElementById('retryBtn');
  const scoreBar    = document.getElementById('scoreBar');

  let cards=[], current=0, correct=0, answered=false;
  let chapterGroups=null;

  function escHtml(s){ const d=document.createElement('div'); d.appendChild(document.createTextNode(s)); return d.innerHTML; }

  function renderQuestion(idx) {
    const card = cards[idx]; if(!card) return;
    answered=false;
    explanation.classList.add('d-none');
    nextWrapper.classList.add('d-none');
    currentQEl.textContent = idx+1;
    qNum.textContent       = idx+1;
    qText.textContent      = card.question;
    progressBar.style.width = Math.round((idx/cards.length)*100)+'%';
    if (typeof Chapters !== 'undefined' && chapterGroups) {
      Chapters.updateActive(idx, chapterGroups);
    }
    optList.innerHTML = card.options.map(opt=>`
      <button class="bd-quiz-option" data-label="${opt.label}">
        <span class="bd-option-label">${escHtml(opt.label)}</span>
        <span>${escHtml(opt.text)}</span>
      </button>`).join('');
    optList.querySelectorAll('.bd-quiz-option').forEach(btn=>{
      btn.addEventListener('click', ()=>handleAnswer(btn.dataset.label, card));
    });
  }

  function handleAnswer(chosenLabel, card) {
    if(answered) return; answered=true;
    const opt = card.options.find(o=>o.label===chosenLabel);
    if(opt?.isCorrect) {
      correct++;
      // Mini confetti pop on correct answer
      if (typeof Confetti !== 'undefined') {
        const btn = optList.querySelector(`[data-label="${chosenLabel}"]`);
        const rect = btn?.getBoundingClientRect();
        if (rect) Confetti.miniPop(rect.left + rect.width/2, rect.top + rect.height/2);
      }
    }
    scoreEl.textContent = correct;

    optList.querySelectorAll('.bd-quiz-option').forEach(btn=>{
      btn.disabled=true;
      const l = btn.dataset.label;
      const o = card.options.find(x=>x.label===l);
      if(o?.isCorrect) {
        btn.classList.add('correct');
        btn.querySelector('.bd-option-label').innerHTML='<i class="bi bi-check-lg"></i>';
      } else if(l===chosenLabel && !opt?.isCorrect) {
        btn.classList.add('wrong');
        btn.querySelector('.bd-option-label').innerHTML='<i class="bi bi-x-lg"></i>';
      }
    });

    explTxt.textContent = card.explanation || '';
    explanation.classList.remove('d-none');
    nextWrapper.classList.remove('d-none');
    nextBtn.innerHTML = current===cards.length-1
      ? '<i class="bi bi-bar-chart-fill me-1"></i>See Results'
      : 'Next Question<i class="bi bi-chevron-right ms-1"></i>';
  }

  function showFinal() {
    qCard.classList.add('d-none');
    scoreBar?.classList.add('d-none');
    finalDiv.classList.remove('d-none');
    const pct = Math.round((correct/cards.length)*100);
    finalPct.textContent  = pct+'%';
    finalCorr.textContent = correct;
    finalTot.textContent  = cards.length;
    badgeTxt.textContent  = pct===100 ? '🏆 Perfect score! Incredible!' : pct>=85 ? '🎉 Excellent work!' : pct>=60 ? '👍 Good job!' : '📚 Keep studying!';
    progressBar.style.width = '100%';

    // Animate score bar
    const bar = document.getElementById('quizScoreBar');
    if (bar) {
      requestAnimationFrame(() => { bar.style.width = pct + '%'; });
      bar.style.background = pct === 100
        ? 'linear-gradient(90deg, #34d399, #059669)'
        : pct >= 80
        ? 'linear-gradient(90deg, #6c63ff, #38bdf8)'
        : pct >= 60
        ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
        : 'linear-gradient(90deg, #f87171, #ef4444)';
    }

    // Trophy emoji + pulse
    const trophy = document.getElementById('quizTrophy');
    if (trophy) {
      trophy.textContent = pct === 100 ? '🏆' : pct >= 80 ? '🌟' : pct >= 60 ? '✅' : '📚';
      if (pct === 100) setTimeout(() => trophy.classList.add('pulse'), 700);
    }

    // Confetti — level based on score
    if (typeof Confetti !== 'undefined') {
      setTimeout(() => {
        if (pct === 100)     Confetti.perfectScore();
        else if (pct >= 80)  Confetti.goodScore();
        else if (pct >= 60)  Confetti.deckComplete();
      }, 400);
    }
  }

  nextBtn.addEventListener('click', ()=>{
    if(current<cards.length-1){ current++; renderQuestion(current); }
    else showFinal();
  });

  retryBtn.addEventListener('click', ()=>{
    correct=0; current=0;
    scoreEl.textContent='0';
    finalDiv.classList.add('d-none');
    qCard.classList.remove('d-none');
    scoreBar?.classList.remove('d-none');
    init(cards);
  });

  function init(list, chapters) {
    cards=list; current=0; correct=0;
    totalQEl.textContent = cards.length;
    scoreEl.textContent  = 0;
    if (typeof Chapters !== 'undefined' && !chapterGroups) {
      chapterGroups = Chapters.inject(cards, 'quiz', chapters, (startIdx) => {
        current = startIdx;
        renderQuestion(current);
      });
    }
    renderQuestion(0);
  }

  const raw = localStorage.getItem('bd_session');
  if(!raw){ new bootstrap.Modal(document.getElementById('noSessionModal')).show(); return; }
  const session=JSON.parse(raw);

  if(session.cardType==='quiz' && session.cards?.length){
    init(session.cards, session.chapters||[]);
  } else if(session.sessionId?.startsWith('deck_')){
    const deckId = session.sessionId.replace('deck_', '');
    const loadM=new bootstrap.Modal(document.getElementById('loadingModal'));
    loadM.show();
    fetch(`/api/decks/${deckId}`, { headers: BrainDeckAuth.getHeaders(), credentials: 'include' })
      .then(res => res.json())
      .then(d => {
        loadM.hide();
        if(d.success && d.data.deck.cards?.length){
          const deck = d.data.deck;
          session.cards = deck.cards;
          session.chapters = [];
          session.cardType = 'quiz';
          session.cardCount = deck.cardCount;
          localStorage.setItem('bd_session', JSON.stringify(session));
          init(deck.cards, []);
        } else new bootstrap.Modal(document.getElementById('noSessionModal')).show();
      }).catch(() => { loadM.hide(); new bootstrap.Modal(document.getElementById('noSessionModal')).show(); });
  } else if(session.sessionId){
    const loadM=new bootstrap.Modal(document.getElementById('loadingModal'));
    loadM.show();
    BrainDeckAPI.getCardsForType(session.sessionId,'quiz')
      .then(res=>{
        loadM.hide();
        if(res.success && res.data.cards.length){ session.cards=res.data.cards; session.chapters=res.data.chapters||[]; session.cardType='quiz'; localStorage.setItem('bd_session',JSON.stringify(session)); init(res.data.cards, res.data.chapters||[]); }
        else new bootstrap.Modal(document.getElementById('noSessionModal')).show();
      }).catch(()=>{ loadM.hide(); new bootstrap.Modal(document.getElementById('noSessionModal')).show(); });
  } else { new bootstrap.Modal(document.getElementById('noSessionModal')).show(); }

})();
