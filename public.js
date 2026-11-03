(() => {
  'use strict';
  history.scrollRestoration = 'manual';
  const SAVE_KEY = 'fighting-duel.public.game.v1';
  const $ = selector => document.querySelector(selector);
  const pages = [...document.querySelectorAll('[data-page]')];
  const help = $('#publicHelp');
  const cardDialog = $('#publicCardDetail');
  const restartDialog = $('#publicRestart');
  const toolbarHelp = $('.demo-toolbar [data-help-rule]');
  const sheet = $('#resultSheet');
  let currentRoute = '';
  let gamePromise = null;
  let gameReady = false;
  let gameState = null;
  let catalogPromise = null;
  let catalogCards = [];
  let catalogRelease = "";
  let resumeResult = false;
  let helpOpener = null;
  let previousPhase = '';
  let restartApproved = false;
  let restartOpener = null;
  const hand = $('#hand0');
  const handTabs = $('#handTabs');
  const mobileHand = matchMedia('(max-width: 700px), (max-width: 1000px) and (max-height: 500px) and (orientation: landscape)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let handIndex = 0;
  let handTurn = null;
  let handUid = null;
  let scrollTimer;
  let layoutFrame;
  let blockHandClickUntil = 0;
  let drag = null;
  let touch = null;
  const handCards = () => [...hand.children];
  function markHandPosition(index) {
    const cards = handCards();
    handIndex = Math.max(0, Math.min(index, cards.length - 1));
    handUid = gameState?.players[0].hand[handIndex]?.uid;
    [...handTabs.children].forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === handIndex));
      tab.tabIndex = i === handIndex ? 0 : -1;
    });
    cards.forEach((card, i) => {
      if (mobileHand.matches) {
        card.setAttribute('role', 'tabpanel');
        card.setAttribute('aria-labelledby', `hand-tab-${i}`);
        card.setAttribute('aria-hidden', String(i !== handIndex));
      } else {
        card.removeAttribute('role');
        card.removeAttribute('aria-labelledby');
        card.removeAttribute('aria-hidden');
      }
      card.querySelectorAll('button').forEach(button => { button.tabIndex = !mobileHand.matches || i === handIndex ? 0 : -1; });
    });
    $('#previousHandCard').disabled = handIndex === 0;
    $('#nextHandCard').disabled = handIndex >= cards.length - 1;
    $('#inspectCurrentCard').disabled = !cards.length;
    $('#rotateCurrentCard').disabled = !cards.length;
    $('#rotateCurrentCard').setAttribute('aria-pressed', cards[handIndex]?.querySelector('.rotate-card')?.getAttribute('aria-pressed') || 'false');
    $('#handPosition').innerHTML = `<span class="hand-dots" aria-hidden="true">${cards.map((_, i) => `<i${i === handIndex ? ' class="active"' : ''}></i>`).join('')}</span><span>${cards.length ? handIndex + 1 : 0} / ${cards.length}</span>`;
  }
  function handOffset(index) {
    const card = hand.children[index];
    return card ? card.offsetLeft - (hand.clientWidth - card.offsetWidth) / 2 : 0;
  }
  function goToHandCard(index, animate = true) {
    if (!mobileHand.matches || !hand.children.length) return;
    markHandPosition(index);
    hand.scrollTo({ left: handOffset(handIndex), behavior: animate && !reducedMotion.matches ? 'smooth' : 'instant' });
  }
  function fitHand() {
    cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(() => {
      if (currentRoute !== 'play' || !hand.clientWidth) return;
      const viewport = $('.hand-carousel');
      if (mobileHand.matches) {
        // Measure the available screen, not the carousel's current height: the carousel
        // should shrink with its card instead of spreading spare space above and below it.
        const screen = $('#playPage').getBoundingClientRect();
        const safeBottom = parseFloat(getComputedStyle($('#playPage')).paddingBottom) || 0;
        const availableHeight = screen.bottom - safeBottom - viewport.getBoundingClientRect().top - $('.hand-browser').offsetHeight - 16;
        // One whole card plus two half-card previews and the two 12px gaps.
        const compactLandscape = matchMedia('(max-width:1000px) and (max-height:500px) and (orientation:landscape)').matches;
        const cardToolsHeight = compactLandscape ? 12 : 58;
        const width = Math.max(compactLandscape ? 72 : 90, Math.min((viewport.clientWidth - 24) / 2, (availableHeight - cardToolsHeight) * 65 / 90, 330));
        hand.style.setProperty('--swipe-card-width', `${width}px`);
        hand.toggleAttribute('data-compact-card', width < 176);
        viewport.style.height = `${width * 90 / 65 + cardToolsHeight}px`;
        goToHandCard(handIndex, false);
      } else {
        viewport.style.removeProperty('height');
        hand.style.removeProperty('--swipe-card-width');
        hand.removeAttribute('data-compact-card');
        hand.scrollLeft = 0;
        markHandPosition(handIndex);
      }
    });
  }
  function renderHandBrowser(game) {
    const cards = game.players[0].hand;
    const sameCard = cards.findIndex(card => card.uid === handUid);
    handIndex = game.turn === handTurn && sameCard >= 0 ? sameCard : 0;
    handTurn = game.turn;
    handTabs.innerHTML = cards.map((card, index) => `<button type="button" role="tab" id="hand-tab-${index}" aria-controls="public-hand-card-${index}" aria-label="${index + 1}번 ${escapeHTML(card.name)}${card.moveMode ? ` / ${card.moveMode === 'guard' ? '가드' : card.moveMode === 'dash' ? '대시' : '백스텝'}` : ' / 기 모으기'}">${escapeHTML(card.name)}</button>`).join('');
    handCards().forEach((card, index) => {
      card.id = `public-hand-card-${index}`;
      const inspect = document.createElement('button');
      inspect.type = 'button';
      inspect.className = 'inspect-hand-card';
      inspect.setAttribute('aria-label', `${cards[index].name} 카드 확대`);
      inspect.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><path d="m3 3 6 6m12-6-6 6M3 21l6-6m12 6-6-6"/></svg>';
      inspect.addEventListener('click', () => {
        const image = card.querySelector('.printed-card');
        showCardDetail(cards[index], image, image.classList.contains('rotated'));
      });
      card.querySelector('.rotate-card').before(inspect);
    });
    markHandPosition(handIndex);
    fitHand();
  }
  handTabs.addEventListener('click', event => {
    const tab = event.target.closest('[role="tab"]');
    if (tab) goToHandCard([...handTabs.children].indexOf(tab));
  });
  handTabs.addEventListener('keydown', event => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? hand.children.length - 1 : handIndex + (event.key === 'ArrowRight' ? 1 : -1);
    goToHandCard(next);
    handTabs.children[handIndex]?.focus({ preventScroll: true });
  });
  $('#previousHandCard').addEventListener('click', () => goToHandCard(handIndex - 1));
  $('#nextHandCard').addEventListener('click', () => goToHandCard(handIndex + 1));
  $('#inspectCurrentCard').addEventListener('click', () => {
    const card = gameState?.players[0].hand[handIndex];
    const image = hand.children[handIndex]?.querySelector('.printed-card');
    if (card && image) showCardDetail(card, image, image.classList.contains('rotated'));
  });
  $('#rotateCurrentCard').addEventListener('click', event => {
    const rotate = hand.children[handIndex]?.querySelector('.rotate-card');
    rotate?.click();
    event.currentTarget.setAttribute('aria-pressed', rotate?.getAttribute('aria-pressed') || 'false');
  });
  hand.addEventListener('scroll', () => {
    if (!mobileHand.matches) return;
    blockHandClickUntil = performance.now() + 180;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const nearest = handCards().reduce((best, _, index) => Math.abs(hand.scrollLeft - handOffset(index)) < Math.abs(hand.scrollLeft - handOffset(best)) ? index : best, 0);
      markHandPosition(nearest);
    }, 100);
  }, { passive: true });
  // Native touch scrolling stays native. Track movement separately to reject swipe-generated taps.
  hand.addEventListener('touchstart', event => {
    const point = event.touches[0];
    touch = point ? { x: point.clientX, y: point.clientY, moved: false } : null;
  }, { passive: true });
  hand.addEventListener('touchmove', event => {
    const point = event.touches[0];
    if (touch && point && Math.hypot(point.clientX - touch.x, point.clientY - touch.y) > 10) touch.moved = true;
  }, { passive: true });
  const finishTouch = () => {
    if (touch?.moved) blockHandClickUntil = performance.now() + 350;
    touch = null;
  };
  hand.addEventListener('touchend', finishTouch, { passive: true });
  hand.addEventListener('touchcancel', finishTouch, { passive: true });
  hand.addEventListener('pointerdown', event => {
    if (!mobileHand.matches || event.pointerType !== 'mouse' || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: hand.scrollLeft, moved: false };
  });
  hand.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(event.clientY - drag.y)) {
      drag.moved = true;
      hand.setPointerCapture(event.pointerId);
      hand.classList.add('dragging');
    }
    if (drag.moved) { event.preventDefault(); hand.scrollLeft = drag.left - dx; }
  });
  const finishDrag = () => {
    if (drag?.moved) {
      blockHandClickUntil = performance.now() + 350;
      const direction = hand.scrollLeft - drag.left;
      if (hand.hasPointerCapture(drag.id)) hand.releasePointerCapture(drag.id);
      hand.classList.remove('dragging');
      goToHandCard(handIndex + (Math.abs(direction) > 35 ? Math.sign(direction) : 0));
    }
    drag = null;
  };
  hand.addEventListener('pointerup', finishDrag);
  hand.addEventListener('pointercancel', finishDrag);
  hand.addEventListener('click', event => {
    if (!mobileHand.matches) return;
    const card = event.target.closest('.hand-card');
    const index = handCards().indexOf(card);
    if (performance.now() < blockHandClickUntil || index !== handIndex) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (index >= 0 && performance.now() >= blockHandClickUntil) goToHandCard(index);
    }
  }, true);
  const handResizeObserver = new ResizeObserver(fitHand);
  for (const selector of ['.hand-carousel', '#playPage', '#playPage > .content-width', '.match-hud']) {
    handResizeObserver.observe($(selector));
  }
  mobileHand.addEventListener('change', fitHand);
  // Keep the source articles intact for the standalone printed rulebook.
  document.querySelectorAll('#ruleArticles > [data-rule]').forEach(article => {
    const details = document.createElement('details');
    details.className = 'rule-disclosure';
    const summary = document.createElement('summary');
    summary.appendChild(article.querySelector('h2'));
    article.querySelector(':scope > .overline')?.remove();
    const body = document.createElement('div');
    body.className = 'rule-body';
    body.append(...article.childNodes);
    details.append(summary, body);
    article.appendChild(details);
    if (article.dataset.rule === 'cards') {
      details.addEventListener('toggle', () => { if (details.open) ensureCatalog(); });
    }
  });
  const routeInfo = () => {
    const [requested, topic] = location.hash.slice(1).split('/');
    return { name: ['home', 'play', 'rules', 'download'].includes(requested) ? requested : 'home', topic: topic || '' };
  };
  function storageNotice() { $('#storageNotice').hidden = false; }
  function updateResume() {
    let turn = null;
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (saved?.state && !saved.state.winner) turn = saved.state.turn;
    } catch { /* The first-play action works without storage. */ }
    $('#startPlayingLabel').textContent = turn ? '이어서 체험하기' : '웹에서 체험하기';
    $('#experienceMeta').textContent = turn ? `${turn}턴 · 진행 중인 AI 대전` : 'AI와 바로 대전 · 회원가입 없이';
  }
  function syncResult() {
    const visible = currentRoute === 'play' && gameState?.phase === 'resolved' && !help.open;
    sheet.hidden = !visible;
    $('.app-shell').inert = visible;
  }
  globalThis.FIGHTING_DUEL_OPTIONS = {
    saveKey: SAVE_KEY,
    demo: true,
    managesResultFocus: true,
    onStorageError: storageNotice,
    onRender(game) {
      gameState = game;
      renderHandBrowser(game);
      syncResult();
      $('#newGameButton').disabled = false;
      $('#resultTitle').textContent = game.winner ? '대전 결과' : '턴 결과';
      if (game.phase === 'resolved' && previousPhase !== 'resolved' && currentRoute === 'play') {
        requestAnimationFrame(() => {
          $('#resultTitle').tabIndex = -1;
          $('#resultTitle').focus({ preventScroll: true });
          $('.result-body').scrollTop = 0;
        });
      }
      previousPhase = game.phase;
    },
  };
  function ensureGame() {
    if (gamePromise) return gamePromise;
    $('#gameLoading').hidden = false;
    $('#retryGame').hidden = true;
    gamePromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'app.js?v=public-3';
      script.onload = () => {
        if (!gameState) { reject(new Error('Game initialization failed')); return; }
        gameReady = true;
        $('#gameLoading').hidden = true;
        $('#gameView').hidden = false;
        syncResult();
        resolve();
      };
      script.onerror = () => { script.remove(); reject(new Error('Game script unavailable')); };
      document.body.appendChild(script);
    }).catch(error => {
      $('#gameLoading').textContent = '대전을 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.';
      $('#retryGame').hidden = false;
      gamePromise = null;
      throw error;
    });
    return gamePromise;
  }
  function ruleSearch() {
    const term = $('#ruleSearch').value.trim().toLocaleLowerCase();
    let count = 0;
    document.querySelectorAll('#ruleArticles > [data-rule]').forEach(article => {
      const details = article.querySelector('details');
      article.hidden = Boolean(term) && !article.textContent.toLocaleLowerCase().includes(term);
      if (term) {
        if (!('beforeSearchOpen' in details.dataset)) details.dataset.beforeSearchOpen = String(details.open);
        if (!article.hidden) details.open = true;
      } else if ('beforeSearchOpen' in details.dataset) {
        details.open = details.dataset.beforeSearchOpen === 'true';
        delete details.dataset.beforeSearchOpen;
      }
      if (!article.hidden) count += 1;
    });
    const status = $('#ruleSearchStatus');
    status.hidden = !term;
    status.textContent = count ? `관련 규칙 ${count}개를 찾았습니다.` : '해당하는 규칙이 없습니다. 다른 단어로 찾아보세요.';
  }
  function openRuleTopic(topic) {
    const article = [...document.querySelectorAll('#ruleArticles > [data-rule]')].find(item => item.dataset.rule === topic);
    if (!article) return;
    $('#ruleSearch').value = '';
    ruleSearch();
    article.querySelector('details').open = true;
    document.querySelectorAll('.rules-nav a').forEach(link => {
      if (link.hash === `#rules/${topic}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    article.scrollIntoView({ block: 'start' });
    article.tabIndex = -1;
    article.focus({ preventScroll: true });
  }
  async function showRoute() {
    const { name, topic } = routeInfo();
    const changed = name !== currentRoute;
    currentRoute = name;
    document.body.dataset.route = name;
    if (help.open) help.close();
    if (cardDialog.open) cardDialog.close();
    if (restartDialog.open) restartDialog.close();
    pages.forEach(page => { page.hidden = page.dataset.page !== name; });
    document.querySelectorAll('.site-nav [data-route]').forEach(link => {
      if (link.dataset.route === name) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    const names = { home: '레트로 대전 격투 카드게임', play: '웹 체험', rules: '규칙', download: '인쇄·다운로드' };
    document.title = `FIGHTING DUEL · ${names[name]}`;
    syncResult();
    if (changed) {
      window.scrollTo(0, 0);
      $('#pageContent').focus({ preventScroll: true });
    }
    if (name === 'home') updateResume();
    if (name === 'play') {
      try {
        await ensureGame();
        fitHand();
      } catch { /* The inline retry control remains available. */ }
    }
    document.body.dataset.route = name;
    if (name === 'rules') {
      if (topic) requestAnimationFrame(() => openRuleTopic(topic));
    }
    if (name === 'download' && topic === 'solo') {
      $('#download-solo').open = true;
      $('#download-solo').scrollIntoView({ block: 'start' });
    }
  }
  function renderHelp(topic) {
    const article = $(`#rule-${topic}`) || $('#rule-quick');
    const clone = article.cloneNode(true);
    const disclosure = clone.querySelector(':scope > details');
    if (disclosure) {
      const heading = disclosure.querySelector('summary h2');
      clone.replaceChildren(heading, ...disclosure.querySelector('.rule-body').childNodes);
    }
    clone.hidden = false;
    clone.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    clone.removeAttribute('id');
    clone.querySelector('.overline')?.remove();
    $('#publicHelpTitle').textContent = article.querySelector('h2').textContent;
    clone.querySelector('h2')?.remove();
    $('#publicHelpContent').replaceChildren(clone);
    $('#helpTopic').value = topic;
  }
  function showHelp(topic, opener) {
    renderHelp(topic);
    helpOpener = opener;
    resumeResult = !sheet.hidden;
    sheet.hidden = true;
    if (!help.open) help.showModal();
    $('#closePublicHelp').focus();
  }
  $('#helpTopic').addEventListener('change', event => renderHelp(event.target.value));
  help.addEventListener('close', () => {
    syncResult();
    const target = helpOpener;
    helpOpener = null;
    if (target?.isConnected && (resumeResult || currentRoute === 'play')) target.focus();
    resumeResult = false;
  });
  $('#closePublicHelp').addEventListener('click', () => help.close());
  help.addEventListener('click', event => { if (event.target === help && event.clientX < help.getBoundingClientRect().left) help.close(); });
  document.addEventListener('keydown', event => {
    // Native dialogs provide their own focus loop; keep legacy game handlers out.
    if (help.open || cardDialog.open || restartDialog.open) { event.stopImmediatePropagation(); return; }
    if (event.key === 'Tab' && !sheet.hidden) {
      const buttons = [...sheet.querySelectorAll('button, a, summary')].filter(node => !node.hidden && !node.disabled && node.getClientRects().length);
      if (!buttons.length) return;
      const index = buttons.indexOf(document.activeElement);
      const next = index < 0 ? 0 : (index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
      event.preventDefault();
      buttons[next].focus();
    }
  }, true);
  function preparePrint() {
    document.querySelectorAll('#ruleArticles details').forEach(node => { node.dataset.beforePrintOpen = String(node.open); node.open = true; });
  }
  function restorePrint() {
    document.querySelectorAll('#ruleArticles details[data-before-print-open]').forEach(node => { node.open = node.dataset.beforePrintOpen === 'true'; delete node.dataset.beforePrintOpen; });
  }
  window.addEventListener('beforeprint', preparePrint);
  window.addEventListener('afterprint', restorePrint);
  $('#ruleSearch').addEventListener('input', ruleSearch);
  $('#retryGame').addEventListener('click', () => { if (!gameReady) ensureGame().catch(() => {}); });
  toolbarHelp.addEventListener('click', () => showHelp('quick', toolbarHelp));
  $('#newGameButton').addEventListener('click', event => {
    // This listener is installed before the lazy-loaded engine's reset handler.
    if (restartApproved) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!gameReady) return;
    restartOpener = event.currentTarget;
    if (!restartDialog.open) restartDialog.showModal();
    $('#cancelPublicRestart').focus();
  });
  $('#cancelPublicRestart').addEventListener('click', () => restartDialog.close('cancel'));
  $('#confirmPublicRestart').addEventListener('click', () => {
    restartDialog.close('restart');
    restartApproved = true;
    try { $('#newGameButton').click(); }
    finally { restartApproved = false; }
  });
  restartDialog.addEventListener('close', () => {
    if (currentRoute === 'play') restartOpener?.focus({ preventScroll: true });
    restartOpener = null;
  });
  document.addEventListener('click', event => {
    const helpButton = event.target.closest('[data-help-rule]');
    if (helpButton && helpButton !== toolbarHelp) showHelp(helpButton.dataset.helpRule, helpButton);
  }, true);
  const helpButton = document.createElement('button');
  helpButton.type = 'button'; helpButton.className = 'button button-small'; helpButton.dataset.helpRule = 'distance'; helpButton.textContent = '규칙 확인';
  $('.turn-actions').prepend(helpButton);
  function escapeHTML(value) { return String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]); }
  function renderCatalog() {
    const term = $('#cardSearch').value.trim();
    const fighter = $('#catalogFighter').value;
    const filtered = catalogCards.filter(card => card.name.includes(term));
    $('#publicCatalog').innerHTML = filtered.flatMap(card => card.fronts.map(front => {
      const action = front.moveMode === 'guard' ? '가드' : front.moveMode === 'dash' ? '대시' : front.moveMode === 'backstep' ? '백스텝' : '기 모으기';
      return `<button type="button" class="catalog-card" data-card-id="${card.id}"><img src="assets/pnp/cards/final-sd/${fighter}/rendered/${front.frontId}.png?v=${encodeURIComponent(catalogRelease)}" alt="${escapeHTML(card.name)} / ${action} 카드 확대" loading="lazy" width="738" height="1020"><strong>${escapeHTML(card.name)}</strong><span>속도 ${card.speedLabel || card.speed} · 피해 ${card.damage || '—'}<br>아래쪽: ${action}</span></button>`;
    })).join('');
    $('#catalogEmpty').hidden = filtered.length > 0;
  }
  function ensureCatalog() {
    if (catalogPromise) return catalogPromise;
    catalogPromise = fetch('public-cards.json').then(response => {
      if (!response.ok) throw new Error('Cards unavailable'); return response.json();
    }).then(data => { catalogCards = data.cards; catalogRelease = data.release || ""; renderCatalog(); }).catch(() => {
      catalogPromise = null;
      $('#publicCatalog').innerHTML = '<p>카드를 불러오지 못했습니다. 규칙 화면을 다시 열거나 인쇄용 PDF를 확인해 주세요.</p>';
    });
    return catalogPromise;
  }
  $('#catalogFighter').addEventListener('change', renderCatalog);
  $('#cardSearch').addEventListener('input', renderCatalog);
  $('#publicCatalog').addEventListener('click', event => {
    const button = event.target.closest('[data-card-id]');
    if (!button) return;
    const card = catalogCards.find(item => item.id === button.dataset.cardId);
    const image = button.querySelector('img');
    showCardDetail(card, image);
  });
  function showCardDetail(card, image, rotated = false) {
    $('#publicCardTitle').textContent = card.name;
    $('#publicCardImage').src = image.src;
    $('#publicCardImage').alt = image.alt.replace(' 확대', '');
    $('#publicCardImage').classList.toggle('rotated', rotated);
    $('#rotatePublicCard').setAttribute('aria-pressed', String(rotated));
    $('#publicCardDescription').textContent = card.libraryEffect || card.effect;
    cardDialog.showModal();
    $('#closePublicCard').focus();
  }
  $('#closePublicCard').addEventListener('click', () => cardDialog.close());
  $('#rotatePublicCard').addEventListener('click', event => {
    const rotated = $('#publicCardImage').classList.toggle('rotated');
    event.target.setAttribute('aria-pressed', String(rotated));
  });
  fetch('public-downloads.json').then(response => { if (!response.ok) throw new Error(); return response.json(); }).then(data => {
    data.downloads.forEach(file => {
      const node = document.querySelector(`[data-file-meta="${file.id}"]`);
      if (!node) return;
      const size = file.bytes >= 1048576 ? `${(file.bytes / 1048576).toFixed(1)} MB` : `${Math.ceil(file.bytes / 1024)} KB`;
      node.textContent = [`PDF ${file.pages}쪽 · A4 양면 ${file.sheets}매`, size, file.updated].join(' · ');
    });
  }).catch(() => { /* Static file links and edition details remain usable. */ });
  window.addEventListener('hashchange', showRoute);
  updateResume();
  showRoute();
})();
