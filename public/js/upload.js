// public/js/upload.js
'use strict';

(function () {
  const dropZone        = document.getElementById('dropZone');
  const fileInput       = document.getElementById('fileInput');
  const generateBtn     = document.getElementById('generateBtn');
  const errorAlert      = document.getElementById('errorAlert');
  const errorMessage    = document.getElementById('errorMessage');
  const dropZoneDefault = document.getElementById('dropZoneDefault');
  const dropZoneSelected= document.getElementById('dropZoneSelected');
  const selectedFileName= document.getElementById('selectedFileName');
  const selectedFileSize= document.getElementById('selectedFileSize');
  const clearFileBtn    = document.getElementById('clearFileBtn');
  const loadingModal    = new bootstrap.Modal(document.getElementById('loadingModal'));
  const loadingTitle    = document.getElementById('loadingTitle');
  const loadingSubtitle = document.getElementById('loadingSubtitle');

  let selectedFile = null;
  const ACCEPTED = ['pdf','docx','pptx','txt','md'];
  const MAX_MB   = 20;
  const MAX_B    = MAX_MB * 1024 * 1024;

  const ext  = f => f.name.split('.').pop().toLowerCase();
  const size = b => b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

  const showErr = msg => {
    errorMessage.textContent = msg;
    errorAlert.classList.remove('d-none');
    setTimeout(() => errorAlert.classList.add('d-none'), 7000);
  };

  const setFile = file => {
    if (!ACCEPTED.includes(ext(file))) return showErr(`File type .${ext(file)} not supported. Use: ${ACCEPTED.join(', ')}`);
    if (file.size > MAX_B) return showErr(`File too large (${size(file.size)}). Max ${MAX_MB}MB.`);
    selectedFile = file;
    selectedFileName.textContent = file.name;
    selectedFileSize.textContent = size(file.size);
    dropZoneDefault.classList.add('d-none');
    dropZoneSelected.classList.remove('d-none');
    generateBtn.removeAttribute('disabled');
    errorAlert.classList.add('d-none');
  };

  const clearFile = () => {
    selectedFile = null; fileInput.value = '';
    dropZoneDefault.classList.remove('d-none');
    dropZoneSelected.classList.add('d-none');
    generateBtn.setAttribute('disabled','true');
  };

  dropZone.addEventListener('click',   e => { if(e.target===clearFileBtn||clearFileBtn.contains(e.target)) return; fileInput.click(); });
  dropZone.addEventListener('keydown', e => { if(e.key==='Enter'||e.key===' '){ e.preventDefault(); fileInput.click(); }});
  dropZone.addEventListener('dragover',e => { e.preventDefault(); dropZone.classList.add('bd-dropzone--active'); });
  dropZone.addEventListener('dragleave',()=> dropZone.classList.remove('bd-dropzone--active'));
  dropZone.addEventListener('drop',    e => { e.preventDefault(); dropZone.classList.remove('bd-dropzone--active'); if(e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); });
  fileInput.addEventListener('change', e => { if(e.target.files[0]) setFile(e.target.files[0]); });
  clearFileBtn.addEventListener('click', e => { e.stopPropagation(); clearFile(); });

  generateBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    const cardType = document.querySelector('input[name="cardType"]:checked')?.value || 'flashcard';

    loadingTitle.textContent    = 'Uploading your document...';
    loadingSubtitle.textContent = 'Please wait while we process your file.';
    loadingModal.show();

    try {
      const uploadResult = await BrainDeckAPI.uploadFile(selectedFile);
      if (!uploadResult.success) throw new Error(uploadResult.message || 'Upload failed.');

      const difficulty = typeof DifficultyTuner !== 'undefined' ? DifficultyTuner.getValue() : 'medium';
      const diffLabel = typeof DifficultyTuner !== 'undefined' ? DifficultyTuner.LEVELS.find(l=>l.value===difficulty)?.label || 'Medium' : 'Medium';
      loadingTitle.textContent    = `AI is generating ${diffLabel} ${cardType} cards...`;
      loadingSubtitle.textContent = 'This may take 10–30 seconds depending on size.';

      const sessionId = `session_${Date.now()}`;
      const genResult = await BrainDeckAPI.generateCards(uploadResult.data.filePath, cardType, sessionId, difficulty);
      if (!genResult.success) throw new Error(genResult.message || 'Generation failed.');

      // Save to localStorage
      const session = {
        sessionId:  genResult.data.sessionId,
        cardType,
        difficulty: genResult.data.difficulty || difficulty,
        cardCount:  genResult.data.cardCount,
        cards:      genResult.data.cards,
        chapters:   genResult.data.chapters || [],
        timestamp:  Date.now(),
        fileName:   selectedFile.name,
      };
      localStorage.setItem('bd_session', JSON.stringify(session));

      // Auto-save deck if logged in
      const aiState = await fetch('/api/ai-mode').then(r=>r.json()).catch(()=>({}));
      await BrainDeckAPI.saveDeck({
        title:            selectedFile.name.replace(/\.[^.]+$/,''),
        originalFileName: selectedFile.name,
        fileType:         ext(selectedFile),
        cardType,
        cards:            genResult.data.cards,
        aiProvider:       aiState.provider || 'local',
        aiModel:          aiState.model    || '',
      });

      loadingModal.hide();
      const pages = { flashcard:'flashcard.html', summary:'summary.html', quiz:'quiz.html' };
      window.location.href = pages[cardType] || 'flashcard.html';

    } catch (err) {
      loadingModal.hide();
      showErr(err.message || 'Something went wrong. Please try again.');
    }
  });

})();
