const DEMO_MODE = globalThis.FIGHTING_DUEL_OPTIONS?.demo === true;
const MAX_HP = 20;
const HAND_SIZE = 4;
let handSize = HAND_SIZE;
let nextHandSize = HAND_SIZE;
const GAME_SAVE_KEY = globalThis.FIGHTING_DUEL_OPTIONS?.saveKey || "fighting-duel.game.v3";
const AI_PLAYER_INDEX = 1;
const CARD_FRONT_DIRECTORY = "assets/pnp/cards/final-sd/";
const CARD_FRONT_VERSION = "final-sd-20261031-r12";
const FIGHTER_IDS = ["challenger", "spring"];
let fighterSelections = ["challenger", "spring"];
const DISTANCES = ["근거리", "중거리", "원거리"];

const TYPE_LABELS = {
  attack: "공격",
  defense: "방어",
  move: "이동",
  throw: "잡기",
  setup: "준비",
  super: "초필살기",
};

const CARDS = [
  {
    id: "weak-punch",
    name: "약펀치",
    type: "attack",
    range: [0],
    speed: 5,
    damage: 2,
    copies: 2,
    effect: "빠른 근거리 견제",
  },
  {
    id: "strong-punch",
    name: "강펀치",
    type: "attack",
    range: [0],
    speed: 3,
    damage: 4,
    copies: 2,
    effect: "근거리 강타",
  },
  {
    id: "weak-kick",
    name: "약킥",
    type: "attack",
    range: [0, 1],
    speed: 4,
    damage: 2,
    copies: 2,
    effect: "근거리와 중거리 견제",
  },
  {
    id: "strong-kick",
    name: "강킥",
    type: "attack",
    range: [0, 1],
    speed: 2,
    damage: 5,
    copies: 2,
    effect: "느린 근·중거리 강타",
  },
  {
    id: "launcher",
    name: "띄우기 공격",
    type: "attack",
    special: true,
    launch: true,
    range: [0],
    speed: 3,
    damage: 2,
    copies: 2,
    effect: "단독 적중 2턴 · 동시 적중 1턴 경직",
    libraryEffect: "띄우기만 적중하면 상대 2턴, 양쪽 공격이 모두 적중하면 상대 1턴 경직.",
  },
  {
    id: "projectile",
    name: "장풍기",
    type: "attack",
    special: true,
    range: [0, 1, 2],
    speed: 3,
    damage: 3,
    copies: 2,
    effect: "모든 거리 공격, 점프에 회피됨, 장풍기끼리 상쇄",
  },
  {
    id: "jump-attack",
    name: "점프 공격",
    type: "attack",
    jump: true,
    range: [1],
    speed: 3,
    damage: 3,
    copies: 2,
    effect: "중거리에서만 적중, 대공기 외 공격 회피, 판정 후 1단계 접근",
  },
  {
    id: "guard",
    name: "가드",
    type: "defense",
    range: [0, 1, 2],
    speed: 3,
    copies: 0, // 하단 가드와 솔로 판정용 정의. 독립 카드는 만들지 않는다.
    effect: "타격·초필살기 완전 방어",
  },
  {
    id: "throw",
    name: "잡기",
    type: "throw",
    range: [0],
    speed: 3,
    damage: 3,
    copies: 2,
    effect: "가드 무시, 적중 시 원거리, 잡기끼리 상쇄",
  },
  {
    id: "anti-air",
    name: "대공기",
    type: "attack",
    special: true,
    antiAir: true,
    range: [0],
    speed: 4,
    damage: 3,
    copies: 2,
    effect: "근거리 공격, 점프 상대 전 거리 적중·1턴 경직",
  },
  {
    id: "super",
    name: "초필살기 / 기 모으기",
    type: "super",
    combined: true,
    range: [0, 1],
    speed: 2, // Internal ordering value; public speed uses the special-resolution label.
    speedLabel: "특수",
    damage: 9,
    copies: 2,
    effect: "기 모으기: 성공 시 충전 / 초필살기: 충전 중 사용",
    libraryEffect: "기 모으기: 성공 시 카드를 앞면으로 자기 앞에 두고 충전. 초필살기: 충전 중 사용. 이동 후 일반 공격·잡기·기 모으기보다 우선 판정하며, 가드에 막히고 점프에 회피됨. 적중 시 상대 행동 중단·원거리 변경. 사용 후 두 카드 버림.",
  },
];

const elements = {
  appShell: document.querySelector(".app-shell"),
  turnLabel: document.querySelector("#turnLabel"),
  distanceText: document.querySelector("#distanceText"),
  distanceTrack: document.querySelector("#distanceTrack"),
  revealZone: document.querySelector("#revealZone"),
  phaseText: document.querySelector("#phaseText"),
  combatLog: document.querySelector("#combatLog"),
  newGameButton: document.querySelector("#newGameButton"),
  handSizeSelect: document.querySelector("#handSizeSelect"),
  opponentModeSelect: document.querySelector("#opponentModeSelect"),
  aiMatchButton: document.querySelector("#aiMatchButton"),
  soloMatchButton: document.querySelector("#soloMatchButton"),
  matchModeStatus: document.querySelector("#matchModeStatus"),
  cardLibraryButton: document.querySelector("#cardLibraryButton"),
  closeLibraryButton: document.querySelector("#closeLibraryButton"),
  cardLibrary: document.querySelector("#cardLibrary"),
  libraryGrid: document.querySelector("#libraryGrid"),
  libraryCount: document.querySelector("#libraryCount"),
  rivalHandToggle: document.querySelector("#rivalHandToggle"),
  rivalHandCount: document.querySelector("#rivalHandCount"),
  nextTurnButton: document.querySelector("#nextTurnButton"),
  rematchButton: document.querySelector("#rematchButton"),
  resultSheet: document.querySelector("#resultSheet"),
  resultDistance: document.querySelector("#resultDistance"),
  resultSummary: document.querySelector("#resultSummary"),
  turnExplanation: document.querySelector("#turnExplanation"),
  menuButton: document.querySelector("#menuButton"),
  utilityDrawer: document.querySelector("#utilityDrawer"),
  closeDrawerButton: document.querySelector("#closeDrawerButton"),
};

let uid = 0;
let state = null;
let soloDeckData = null;
let nextOpponentMode = "ai";
let matchLoading = false;
const isSoloMatch = () => state?.opponentMode === "solo";
let dialogOpener = null;
let activeDiscardIndex = null;
const rotatedCards = new Set();
const incomingCards = new Set();

function saveGame() {
  if (!state) return;
  try {
    localStorage.setItem(GAME_SAVE_KEY, JSON.stringify({
      version: 1, state, uid, handSize, nextHandSize, soloDeckData, nextOpponentMode, fighterSelections,
      rotatedCards: [...rotatedCards], rivalHandVisible: Boolean(elements.rivalHandToggle?.checked),
    }));
  } catch {
    // Storage may be unavailable; the current game remains playable.
    globalThis.FIGHTING_DUEL_OPTIONS?.onStorageError?.();
  }
}

function restoreGame() {
  try {
    const saved = JSON.parse(localStorage.getItem(GAME_SAVE_KEY));
    const game = saved?.state;
    const solo = game?.opponentMode === "solo";
    if (DEMO_MODE && (solo || saved?.handSize !== HAND_SIZE)) return false;
    const validDirective = card => solo && card?.soloDirective === true
      && typeof card.uid === "string" && saved.soloDeckData?.cards?.some(definition =>
        definition.number === card.number && definition.name === card.name
        && JSON.stringify(definition.high) === JSON.stringify(card.high)
        && JSON.stringify(definition.low) === JSON.stringify(card.low));
    const validCard = (card) => card && CARDS.some(item => item.id === card.id)
      && typeof card.uid === "string" && typeof card.name === "string"
      && typeof card.type === "string" && Number.isFinite(card.speed)
      && Array.isArray(card.range) && card.range.every(distance => [0, 1, 2].includes(distance));
    if (saved?.version !== 1 || ![3, 4, 5].includes(saved.handSize)
      || ![3, 4, 5].includes(saved.nextHandSize) || !Number.isSafeInteger(saved.uid) || saved.uid < 0
      || !Array.isArray(saved.rotatedCards) || !saved.rotatedCards.every(id => typeof id === "string")
      || !game || !Number.isSafeInteger(game.turn) || game.turn < 1
      || !["select", "resolved"].includes(game.phase) || ![0, 1, 2].includes(game.distance)
      || !Array.isArray(game.log) || !game.log.every(line => typeof line === "string")
      || !Number.isSafeInteger(game.logStart) || game.logStart < 1
      || !(game.winner === null || ["P1 승리", "P2 승리", "무승부"].includes(game.winner))
      || !(game.reveal === null && game.phase === "select"
        || Array.isArray(game.reveal) && game.reveal.length === 2 && game.reveal.every(card => card === null || validCard(card)))
      || !Array.isArray(game.players) || game.players.length !== 2
      || !game.players.every(player => player && typeof player.name === "string"
        && Number.isFinite(player.hp) && player.hp >= 0 && player.hp <= MAX_HP
        && ["deck", "hand", "discard"].every(pile => Array.isArray(player[pile]) && player[pile].every(card => validCard(card) || player === game.players[1] && validDirective(card)))
        && (player.chargedCard === null || validCard(player.chargedCard) || solo && player === game.players[1] && player.chargedCard.id === "solo-charge-marker")
        && ["action", "move", "focus"].includes(player.selectedMode)
        && (player.selectedUid === null || typeof player.selectedUid === "string")
        && ["locked", "stunned", "chargeSucceeded"].every(key => typeof player[key] === "boolean")
        && Number.isSafeInteger(player.extraStunTurns) && player.extraStunTurns >= 0)) return false;
    if (solo && (!validSoloDeckData(saved.soloDeckData) || game.players[1].hand.length
      || game.players[1].deck.length + game.players[1].discard.length !== 12
      || new Set([...game.players[1].deck, ...game.players[1].discard].map(card => card.number)).size !== 12)) return false;
    fighterSelections = DEMO_MODE ? [...FIGHTER_IDS] : [0, 1].map(index => FIGHTER_IDS.includes(saved.fighterSelections?.[index]) ? saved.fighterSelections[index] : FIGHTER_IDS[index]);
    state = game;
    if (DEMO_MODE) state.players.forEach((player, index) => { player.name = index === 0 ? "나" : "상대 · AI"; });
    soloDeckData = saved.soloDeckData || null;
    nextOpponentMode = solo ? "solo" : "ai";
    uid = saved.uid;
    handSize = saved.handSize;
    nextHandSize = DEMO_MODE ? HAND_SIZE : saved.nextHandSize;
    rotatedCards.clear();
    saved.rotatedCards.forEach(id => rotatedCards.add(id));
    if (elements.rivalHandToggle) elements.rivalHandToggle.checked = !DEMO_MODE && saved.rivalHandVisible === true;
    return true;
  } catch {
    return false;
  }
}

function initializeGame() {
  if (restoreGame()) render();
  else newGame();
  if (!DEMO_MODE && typeof location !== "undefined" && new URLSearchParams(location.search).get("opponent") === "solo") {
    startMatch("solo");
    const url = new URL(location.href);
    url.searchParams.delete("opponent");
    history.replaceState(null, "", url);
  }
}

function validSoloDeckData(data) {
  const actions = [...CARDS.map(card => card.id), "dash", "backstep", "charge-cycle"];
  return data?.cards?.length === 12 && new Set(data.cards.map(card => card.number)).size === 12
    && data.cards.every(card => /^\d{2}$/.test(card.number) && typeof card.name === "string"
      && [card.high, card.low].every(row => Array.isArray(row) && row.length === 3 && row.every(id => actions.includes(id))));
}

async function startMatch(mode) {
  if (matchLoading || !["ai", "solo"].includes(mode)) return;
  matchLoading = true;
  elements.matchModeStatus.textContent = "대전을 준비하는 중입니다.";
  render();
  try {
    if (mode === "solo" && !soloDeckData) {
      const response = await fetch("docs/pnp-solo-deck-v0.2.json?v=2");
      if (!response.ok) throw new Error("Solo deck unavailable");
      const data = await response.json();
      if (!validSoloDeckData(data)) throw new Error("Invalid solo deck");
      soloDeckData = data;
    }
    nextOpponentMode = mode;
    newGame();
    elements.matchModeStatus.textContent = "";
    closeUtilityDrawer();
  } catch {
    elements.matchModeStatus.textContent = "솔로 덱을 불러오지 못했습니다. 다시 선택해 주세요.";
    openUtilityDrawer();
  } finally {
    matchLoading = false;
    render();
  }
}

function physicalCardLayout(card, copy) {
  const repeated = ["weak-punch", "weak-kick", "throw"].includes(card.id);
  const moveMode = card.type === "super" ? null : card.id === "throw" ? "guard"
    : ["weak-punch", "weak-kick"].includes(card.id) || copy === 0 ? "dash" : "backstep";
  const frontId = card.type === "super" ? `super-${copy + 1}` : `${card.id}-${moveMode}${repeated && copy > 0 ? "-2" : ""}`;
  return { moveMode, frontId };
}

function createDeck() {
  const deck = [];
  CARDS.forEach((card) => {
    for (let i = 0; i < card.copies; i += 1) {
      deck.push({ ...card, ...physicalCardLayout(card, i), uid: `${card.id}-${uid}` });
      uid += 1;
    }
  });
  return shuffle(deck);
}

function shuffle(cards) {
  const copy = [...cards];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createPlayer(name) {
  return {
    name,
    hp: MAX_HP,
    chargedCard: null,
    chargeSucceeded: false,
    deck: createDeck(),
    hand: [],
    discard: [],
    selectedUid: null,
    selectedMode: "action",
    locked: false,
    stunned: false,
    extraStunTurns: 0,
  };
}

function newGame() {
  handSize = nextHandSize;
  rotatedCards.clear();
  incomingCards.clear();
  state = {
    turn: 1,
    phase: "select",
    opponentMode: nextOpponentMode,
    distance: 1,
    throwLanded: false,
    superLanded: false,
    reveal: null,
    aiHistory: [[], []],
    winner: null,
    players: [createPlayer(DEMO_MODE ? "나" : "도전자"), createPlayer(DEMO_MODE ? "상대 · AI" : "라이벌")],
    log: ["새 대전이 시작됐다."],
    logStart: 1,
  };

  if (isSoloMatch()) {
    const bot = state.players[1];
    bot.name = "솔로 봇";
    bot.deck = shuffle(soloDeckData.cards.map(card => ({ ...card, uid: `solo-${card.number}-${uid++}`, soloDirective: true })));
    addLog("솔로 전용 덱 12장 · 충전 상태 미충전으로 시작한다.");
  }

  state.players.forEach((_, index) => drawToHand(index));
  render();
}

function drawToHand(playerIndex) {
  if (isSoloMatch() && playerIndex === AI_PLAYER_INDEX) return;
  const player = state.players[playerIndex];
  while (player.hand.length < handSize) {
    if (player.deck.length === 0) {
      player.deck = shuffle(player.discard);
      player.discard = [];
    }

    const card = player.deck.pop();
    if (!card) return;
    player.hand.push(card);
    incomingCards.add(card.uid);
  }
}

function addLog(message) {
  if (state.turnReport && !state.turnReport.after && state.phase === "select" && !message.startsWith("--")) {
    state.turnReport.steps.push(message);
  }
  state.log.push(message);
  if (state.log.length > 30) {
    state.log.shift();
    state.logStart = (state.logStart || 1) + 1;
  }
}

function turnSnapshot() {
  return { distance: state.distance, players: state.players.map(player => ({
    hp: player.hp, stun: player.stunned ? 1 + (player.extraStunTurns || 0) : 0, charged: Boolean(player.chargedCard),
  })) };
}

function explainTurn(message) {
  if (state.turnReport && !state.turnReport.after) state.turnReport.steps.push(message);
}

function selectCard(playerIndex, cardUid, mode, cardElement = null) {
  const player = state.players[playerIndex];
  if (matchLoading || playerIndex === AI_PLAYER_INDEX || state.phase !== "select" || player.locked || state.winner) return;

  const card = player.hand.find((item) => item.uid === cardUid);
  if (!card || !["action", "move", "focus"].includes(mode)) return;
  if (player.stunned && mode !== "action") return;
  if (mode === "move" && !canUseMove(card)) return;
  if (mode === "focus" && (!card.combined || player.chargedCard)) return;
  if (mode === "action" && !canSelectCard(card, playerIndex)) return;

  animatePlayedCard(cardElement, card, mode);
  player.selectedUid = cardUid;
  player.selectedMode = mode;
  player.locked = true;
  runAiTurn();
  resolveTurn();
  if (state.phase === "resolved") (state.winner ? elements.rematchButton : elements.nextTurnButton).focus?.({ preventScroll: true });
}

function animatePlayedCard(cardElement, card, mode) {
  if (DEMO_MODE) return;
  const source = cardElement?.querySelector?.(".printed-wrap");
  if (!source?.getBoundingClientRect || !document.body?.appendChild) return;
  const bounds = source.getBoundingClientRect();
  const ghost = source.cloneNode(true);
  ghost.className = "played-card-ghost";
  ghost.style.left = `${bounds.left}px`;
  ghost.style.top = `${bounds.top}px`;
  ghost.style.width = `${bounds.width}px`;
  ghost.style.height = `${bounds.height}px`;
  ghost.querySelector(".rotate-card")?.remove();
  ghost.querySelector(".card-choices")?.remove();
  ghost.querySelector(".printed-card")?.classList.toggle("rotated", mode === "move" || card.id === "super" && mode === "focus");
  document.body.appendChild(ghost);
  ghost.addEventListener("animationend", () => ghost.remove(), { once: true });
  setTimeout(() => ghost.remove(), 500);
}

function runAiTurn() {
  const player = state.players[AI_PLAYER_INDEX];
  const opponent = state.players[0];
  if (state.phase !== "select" || state.winner || !opponent.locked || player.locked) return;
  if (isSoloMatch()) {
    if (!player.deck.length) {
      player.deck = shuffle(player.discard.map(card => ({ ...card, discardHidden: false })));
      player.discard = [];
      addLog("솔로 봇: 버림 더미를 섞어 새 행동 덱을 만들었다. 충전은 유지한다.");
    }
    const card = player.deck.pop();
    const snapshot = { hp: player.hp, distance: state.distance, charged: Boolean(player.chargedCard) };
    card.soloSnapshot = snapshot;
    const instruction = card[snapshot.hp >= 11 ? "high" : "low"][snapshot.distance];
    card.soloActionId = player.stunned ? "guard" : instruction !== "charge-cycle" ? instruction
      : !snapshot.charged ? "focus" : snapshot.distance === 2 ? "projectile" : "super";
    player.hand.push(card);
    player.selectedUid = card.uid;
    player.selectedMode = "action";
    player.locked = true;
    return;
  }

  const choice = chooseAiCard(AI_PLAYER_INDEX);
  if (!choice) return;

  player.selectedUid = choice.card.uid;
  player.selectedMode = choice.mode;
  player.locked = true;
  addLog("P2 AI가 카드를 선택했다.");
}

function chooseAiCard(playerIndex) {
  const player = state.players[playerIndex];
  if (player.stunned) {
    const card = [...player.hand].sort((a, b) => Number(isCardInRange(a)) - Number(isCardInRange(b)) || (a.damage || 0) - (b.damage || 0))[0];
    return card ? { card, mode: "action" } : null;
  }
  const model = aiOpponentModel(playerIndex);
  return player.hand.flatMap((card) => {
    const choices = canUseMove(card) ? [{ card, mode: "move", score: scoreAiCard(getPlayedCard(card, "move"), playerIndex, model) }] : [];
    if (card.combined && !player.chargedCard) choices.push({ card, mode: "focus", score: scoreAiCard(getPlayedCard(card, "focus"), playerIndex, model) });
    if (canSelectCard(card, playerIndex)) choices.push({ card, mode: "action", score: scoreAiCard(getPlayedCard(card, "action"), playerIndex, model) });
    return choices;
  }).sort((a, b) => b.score - a.score)[0];
}

function aiActionId(card) {
  return card.type === "move" ? card.move < 0 ? "dash" : "backstep"
    : card.type === "setup" ? "focus" : card.type === "defense" ? "guard" : card.id;
}

function aiActionCard(id) {
  const base = CARDS.find(card => card.id === (id === "focus" ? "super" : ["dash", "backstep"].includes(id) ? "weak-punch" : id));
  return getPlayedCard({ ...base, moveMode: id }, id === "focus" ? "focus" : ["dash", "backstep"].includes(id) ? "move" : "action");
}

function recordAiPublicActions() {
  if (!Array.isArray(state.aiHistory)) state.aiHistory = [[], []];
  state.reveal.forEach((card, index) => {
    const previous = Array.isArray(state.aiHistory[index]) ? state.aiHistory[index] : [];
    state.aiHistory[index] = card ? [...previous, aiActionId(card)].slice(-12) : previous.slice(-12);
  });
}

function aiActionLikelihood(card, opponent, own) {
  const inRange = card.range.includes(state.distance);
  if (card.type === "defense") return own.chargedCard ? 2 : opponent.hp <= 8 ? 1.2 : 0.8;
  if (card.type === "setup") return state.distance === 2 ? 1.2 : 0.6;
  if (card.type === "move") return inRange ? card.move < 0 ? 0.85 : 0.55 : 0.03;
  if (card.jump) return state.distance === 1 ? 1.5 : state.distance === 2 ? 0.9 : 0.45;
  if (!inRange) return 0.04;
  return (card.type === "super" ? 2.2 : 0.6 + card.damage * 0.12 + card.speed * 0.1)
    * (own.hp <= card.damage ? 1.8 : 1);
}

function aiOpponentModel(playerIndex) {
  const own = state.players[playerIndex], opponentIndex = 1 - playerIndex, opponent = state.players[opponentIndex];
  if (opponent.stunned) return [{ card: aiActionCard("guard"), probability: 1 }];
  const publicDiscard = opponent.discard || [];
  const counts = new Map();
  const push = (card, front) => {
    const id = aiActionId(card);
    if (!counts.has(id)) counts.set(id, { card, fronts: new Set() });
    counts.get(id).fronts.add(front);
  };
  if (isSoloMatch() && opponentIndex === 1 && soloDeckData) {
    const seen = new Set(publicDiscard.length < 12 ? publicDiscard.filter(card => !card.discardHidden).map(card => card.number) : []);
    for (const definition of soloDeckData.cards) {
      if (seen.has(definition.number)) continue;
      let id = definition[opponent.hp >= 11 ? "high" : "low"][state.distance];
      if (id === "charge-cycle") id = !opponent.chargedCard ? "focus" : state.distance === 2 ? "projectile" : "super";
      push(aiActionCard(id), definition.number);
    }
    const total = [...counts.values()].reduce((n, row) => n + row.fronts.size, 0);
    return [...counts.values()].map(row => ({ card: row.card, probability: row.fronts.size / total }));
  }
  // Only public discards, charge and completed reveals inform the model; no hidden hand or deck reads.
  const excluded = new Set(publicDiscard.filter(card => !card.discardHidden).map(cardFrontId));
  if (opponent.chargedCard) excluded.add(cardFrontId(opponent.chargedCard));
  let unknown = 0;
  for (const definition of CARDS) for (let copy = 0; copy < definition.copies; copy += 1) {
    const card = { ...definition, ...physicalCardLayout(definition, copy) };
    if (excluded.has(card.frontId)) continue;
    unknown += 1;
    push(getPlayedCard(card, card.combined && !opponent.chargedCard ? "focus" : "action"), card.frontId);
    if (canUseMove(card)) push(getPlayedCard(card, "move"), card.frontId);
  }
  const rows = [...counts.entries()].map(([id, row]) => {
    let absent = 1;
    for (let k = 0; k < Math.min(handSize, unknown); k += 1) absent *= Math.max(0, unknown - row.fronts.size - k) / (unknown - k);
    return { id, card: row.card, weight: row.fronts.size * aiActionLikelihood(row.card, opponent, own), cap: 1 - absent };
  });
  if (!rows.length) return [{ card: aiActionCard("guard"), probability: 1 }];
  const total = rows.reduce((n, row) => n + row.weight, 0);
  const history = (Array.isArray(state.aiHistory?.[opponentIndex]) ? state.aiHistory[opponentIndex] : []).slice(-12);
  const observed = history.filter(id => counts.has(id));
  for (const row of rows) {
    row.prior = row.weight / total;
    row.probability = (4 * row.prior + observed.filter(id => id === row.id).length) / (4 + observed.length);
  }
  // Repeated actions cannot be more likely than their estimated availability in a hidden hand.
  for (let step = 0; step < rows.length; step += 1) {
    let excess = 0;
    for (const row of rows) if (row.probability > row.cap) { excess += row.probability - row.cap; row.probability = row.cap; }
    if (excess < 1e-9) break;
    const free = rows.filter(row => row.probability < row.cap - 1e-9), mass = free.reduce((n, row) => n + row.prior, 0);
    if (!mass) break;
    for (const row of free) row.probability += excess * row.prior / mass;
  }
  const mass = rows.reduce((n, row) => n + row.probability, 0);
  return rows.map(row => ({ card: row.card, probability: row.probability / mass }));
}

function aiExchange(ownCard, otherCard, distance, otherStunned) {
  const key = [aiActionId(ownCard), aiActionId(otherCard), distance, Number(otherStunned)].join("/");
  if (aiExchange.cache.has(key)) return aiExchange.cache.get(key);
  const real = state;
  const player = () => ({ hp: MAX_HP, stunned: false, extraStunTurns: 0, chargeSucceeded: false });
  state = { distance, players: [player(), player()], log: [], logStart: 1, throwLanded: false, superLanded: false };
  try {
    const a = { playerIndex: 0, opponentIndex: 1, card: ownCard, valid: true, canceled: false };
    if (otherStunned) resolveUtilityOrSolo(a);
    else resolvePair(a, { playerIndex: 1, opponentIndex: 0, card: otherCard, valid: true, canceled: false });
    if (state.throwLanded || state.superLanded) state.distance = 2;
    const result = { dealt: MAX_HP - state.players[1].hp, taken: MAX_HP - state.players[0].hp, distance: state.distance,
      stun: state.players.map(p => p.stunned ? 1 + p.extraStunTurns : 0), focus: state.players.map(p => Number(p.chargeSucceeded)) };
    aiExchange.cache.set(key, result);
    return result;
  } finally { state = real; }
}
aiExchange.cache = new Map();

function aiPositionValue(hand, distance, charged) {
  let best = 0;
  for (const card of hand) {
    if ((!card.combined || charged) && card.range.includes(distance)) best = Math.max(best, (card.damage || 0) * 0.25 + card.speed * 0.05);
    if (distance > 0 && card.jump) best = Math.max(best, 0.5);
  }
  return best;
}

function scoreAiCard(card, playerIndex, model = aiOpponentModel(playerIndex)) {
  const player = state.players[playerIndex], opponent = state.players[1 - playerIndex];
  const remaining = player.hand.filter(item => item.uid !== card.uid);
  const chargedAfter = card.type === "setup" || card.type !== "super" && Boolean(player.chargedCard);
  const positions = [0, 1, 2].map(distance => aiPositionValue(remaining, distance, chargedAfter));
  const originalPosition = aiPositionValue(remaining, state.distance, Boolean(player.chargedCard));
  let score = 0;
  for (const alternative of model) {
    const r = aiExchange(card, alternative.card, state.distance, opponent.stunned);
    const dealt = Math.min(opponent.hp, r.dealt), taken = Math.min(player.hp, r.taken);
    const focusValue = remaining.some(item => item.combined) ? 2.6 : 1.8;
    score += alternative.probability * (dealt - 1.15 * taken + 1.6 * r.stun[1] - 1.7 * r.stun[0]
      + focusValue * r.focus[0] - 1.8 * r.focus[1]
      + 22 * Number(dealt >= opponent.hp) - 26 * Number(taken >= player.hp)
      + 0.45 * (positions[r.distance] - originalPosition));
  }
  return score - (card.type === "super" ? 0.35 : 0) + Math.random() * 0.12;
}

function canSelectCard(card, playerIndex) {
  const player = state.players[playerIndex];
  return player.stunned || card.type !== "super" || Boolean(player.chargedCard);
}

function canUseMove(card) {
  return card.id !== "super";
}

function getPlayedCard(card, mode) {
  if (card.soloDirective) {
    const id = card.soloActionId;
    const base = { ...CARDS.find(item => item.id === (id === "focus" ? "super" : id === "dash" || id === "backstep" ? "weak-punch" : id)), uid: card.uid };
    if (id === "dash" || id === "backstep") base.moveMode = id;
    const played = getPlayedCard(base, id === "focus" ? "focus" : id === "dash" || id === "backstep" ? "move" : "action");
    if (id === "dash" || id === "backstep") played.name = id === "dash" ? "대시" : "백스텝";
    return { ...played, soloNumber: card.number, soloName: card.name, soloSnapshot: card.soloSnapshot };
  }
  if (mode === "focus") {
    if (!card.combined) return null;
    return { ...card, name: "기 모으기", type: "setup", combined: false, playMode: "focus",
      range: [0, 1, 2], speed: 1, damage: 0,
      effect: "성공 시 앞면으로 충전" };
  }
  if (mode !== "move") return card.combined
    ? { ...card, name: "초필살기", combined: false, playMode: "action", effect: "충전 필요 · 가드에 막힘 · 점프에 회피됨 · 적중 시 행동 중단·원거리" }
    : { ...card, playMode: "action" };
  if (!canUseMove(card)) return null;
  if (card.moveMode === "guard") return { ...CARDS.find(item => item.id === "guard"), uid: card.uid, frontId: cardFrontId(card), moveMode: "guard", playMode: "move", damage: 0 };
  const dash = card.moveMode === "dash";
  return {
    ...card,
    playMode: "move",
    name: `${card.name} · ${dash ? "대시" : "백스텝"}`,
    type: "move",
    range: dash ? [1, 2] : [0, 1],
    speed: 5,
    move: dash ? -1 : 1,
    damage: 0,
    jump: false,
    antiAir: false,
    effect: dash ? "거리 1단계 감소" : "거리 1단계 증가",
  };
}

function getPlayableReason(card, playerIndex) {
  const player = state.players[playerIndex];
  if (card.type === "super" && !player.chargedCard) return "충전 카드 없음";
  return "";
}

function isCardInRange(card) {
  return card.range.includes(state.distance);
}

function ensureInRange(context) {
  if (isCardInRange(context.card)) return true;
  addLog(`${playerLabel(context.playerIndex)}의 ${context.card.name}: ${DISTANCES[state.distance]}에서는 헛쳤다.`);
  return false;
}

function resolveTurn() {
  if (state.phase !== "select" || !bothPlayersLocked() || state.winner) return;

  state.turnReport = { turn: state.turn, before: turnSnapshot(), steps: [], after: null };

  const stunnedThisTurn = state.players.map((player) => player.stunned);
  const contexts = state.players.map((player, index) => {
    const selectedCard = player.hand.find((item) => item.uid === player.selectedUid);
    const card = selectedCard && getPlayedCard(selectedCard, player.selectedMode);
    return {
      playerIndex: index,
      opponentIndex: index === 0 ? 1 : 0,
      card,
      valid: card ? (player.selectedMode === "focus" ? !player.chargedCard : canSelectCard(card, index)) : false,
      canceled: false,
    };
  });

  state.reveal = contexts.map((context, index) => stunnedThisTurn[index] ? null : context.card);
  addLog(`-- ${state.turn}턴 공개 --`);
  if (isSoloMatch() && !stunnedThisTurn[1]) {
    const card = state.reveal[1], snapshot = card.soloSnapshot;
    addLog(`솔로 ${card.soloNumber} ${card.soloName}: 턴 시작 체력 ${snapshot.hp} · ${DISTANCES[snapshot.distance]} · ${snapshot.charged ? "충전 완료" : "미충전"} → ${card.name}.`);
  }

  contexts.forEach((context) => {
    if (stunnedThisTurn[context.playerIndex]) addLog(`${playerLabel(context.playerIndex)} 경직: 카드 1장을 공개하지 않고 버렸다.`);
  });

  state.throwLanded = false;
  state.superLanded = false;
  state.players.forEach((player, index) => {
    if (stunnedThisTurn[index]) {
      player.stunned = (player.extraStunTurns || 0) > 0;
      player.extraStunTurns = Math.max(0, (player.extraStunTurns || 0) - 1);
    } else {
      player.stunned = false;
    }
  });
  if (stunnedThisTurn[0] && !stunnedThisTurn[1]) resolveUtilityOrSolo(contexts[1]);
  else if (stunnedThisTurn[1] && !stunnedThisTurn[0]) resolveUtilityOrSolo(contexts[0]);
  else if (!stunnedThisTurn[0] && !stunnedThisTurn[1]) resolvePair(contexts[0], contexts[1]);
  if (state.throwLanded) {
    state.distance = 2;
    addLog("잡기 적중: 거리가 원거리로 변경됐다.");
  }
  if (state.superLanded) {
    state.distance = 2;
    addLog("초필살기 적중: 거리가 원거리로 변경됐다.");
  }
  recordAiPublicActions();
  discardSelectedCards();
  checkWinner();
  state.turnReport.after = turnSnapshot();
  state.phase = "resolved";
  render();
}

function resolvePair(a, b) {
  if (!a.card || !b.card) return;

  if (!a.valid) addLog(`${playerLabel(a.playerIndex)}의 ${a.card.name}: ${getPlayableReason(a.card, a.playerIndex)}.`);
  if (!b.valid) addLog(`${playerLabel(b.playerIndex)}의 ${b.card.name}: ${getPlayableReason(b.card, b.playerIndex)}.`);

  if (!a.valid && !b.valid) return;
  if (a.valid && !b.valid) {
    resolveUtilityOrSolo(a);
    return;
  }
  if (!a.valid && b.valid) {
    resolveUtilityOrSolo(b);
    return;
  }

  if (a.card.type === "super" || b.card.type === "super") {
    const superAction = a.card.type === "super" ? a : b;
    const other = superAction === a ? b : a;
    if (!["defense", "super", "move"].includes(other.card.type) && !other.card.jump) explainTurn("초필살기는 일반 공격·잡기·기 모으기보다 우선 판정한다.");
    if (other.card.jump) resolveJumpPair(superAction, other);
    else if (other.card.type === "defense") resolveDefensePair(superAction, other);
    else if (other.card.type === "super") resolveOffensePair(superAction, other);
    else if (other.card.type === "move") resolveOffenseVsMove(superAction, other);
    else if (tryDealDamage(superAction, other, `${superAction.card.name} 적중.`)) applyStun(superAction, other);
    else if (resolveUtilityOrSolo(other) && isOffense(other.card)) applyStun(other, superAction);
    return;
  }

  if ((a.card.antiAir && b.card.jump) || (b.card.antiAir && a.card.jump)) {
    explainTurn("대공기는 거리·속도와 관계없이 점프 공격을 잡고 착지 접근을 막는다.");
    const antiAir = a.card.antiAir ? a : b;
    const jump = antiAir === a ? b : a;
    dealDamage(antiAir, jump, antiAir.card.damage, `${antiAir.card.name} 대공 성공.`);
    applyStun(antiAir, jump);
    return;
  }

  if (a.card.type === "defense" || b.card.type === "defense") {
    resolveDefensePair(a, b);
    return;
  }

  if (a.card.jump || b.card.jump) {
    resolveJumpPair(a, b);
    return;
  }

  if (isOffense(a.card) && isOffense(b.card)) {
    resolveOffensePair(a, b);
    return;
  }

  if (isOffense(a.card) || isOffense(b.card)) {
    const offense = isOffense(a.card) ? a : b;
    const other = offense === a ? b : a;
    resolveOffenseVsOther(offense, other);
    return;
  }

  resolveNonOffensePair(a, b);
}

function resolveDefensePair(a, b) {
  const defense = a.card.type === "defense" ? a : b;
  const other = defense === a ? b : a;

  if (!ensureInRange(defense)) {
    resolveUtilityOrSolo(other);
    return;
  }

  if (isStrike(other.card)) {
    if (!ensureInRange(other)) {
      if (other.card.jump) landJump(other);
      return;
    }

    explainTurn("가드는 속도와 관계없이 타격·초필살기 피해를 완전히 막는다.");
    addLog(`${playerLabel(defense.playerIndex)}: ${defense.card.name} 완전 방어.`);
    if (other.card.jump) landJump(other);
    return;
  }

  if (other.card.type === "throw") {
    if (ensureInRange(other)) {
      explainTurn("잡기는 속도와 관계없이 가드를 무시한다.");
      dealDamage(other, defense, other.card.damage, `${other.card.name}가 가드를 깼다.`);
    }
    return;
  }

  resolveUtilityOrSolo(other);
  addLog(`${playerLabel(defense.playerIndex)}: ${defense.card.name} 유지.`);
}

function resolveJumpPair(a, b) {
  const jump = a.card.jump ? a : b;
  const other = jump === a ? b : a;

  if (other.card.type === "move") resolveUtilityOrSolo(other);

  if (other.card.jump) {
    explainTurn("점프 공격끼리는 속도 비교 없이 서로 회피하며, 착지 접근은 공용 거리에 한 번만 적용한다.");
    addLog("양쪽 점프 공격이 서로를 피했다.");
    landJump(jump);
    return;
  }

  if (other.card.id === "projectile" && other.card.type === "attack") {
    explainTurn("점프 공격은 장풍기를 회피한다. 점프 공격의 피해는 현재 거리에서 따로 판정한다.");
    addLog(`${playerLabel(jump.playerIndex)}: 점프 공격으로 장풍기를 피했다.`);
    if (ensureInRange(jump)) {
      dealDamage(jump, other, jump.card.damage, `${jump.card.name} 적중.`);
      applyStun(jump, other);
    }
    landJump(jump);
    return;
  }

  if (isOffense(other.card)) addLog(`${playerLabel(jump.playerIndex)}: 점프 공격으로 ${other.card.name}를 피했다.`);

  if (!ensureInRange(jump)) {
    if (other.card.type !== "move" && !isOffense(other.card)) resolveUtilityOrSolo(other);
    landJump(jump);
    return;
  }

  dealDamage(jump, other, jump.card.damage, `${jump.card.name} 적중.`);
  applyStun(jump, other);
  landJump(jump);
}

function landJump(context) {
  if (state.distance === 0) return;
  const before = state.distance;
  state.distance -= 1;
  addLog(`${playerLabel(context.playerIndex)}: ${context.card.name} 착지로 1단계 접근, ${DISTANCES[before]} -> ${DISTANCES[state.distance]}.`);
}

function resolveOffensePair(a, b) {
  if (a.card.id === "projectile" && b.card.id === "projectile" && isCardInRange(a.card) && isCardInRange(b.card)) {
    addLog("양쪽 장풍기가 충돌해 상쇄됐다. 피해 없음.");
    return;
  }
  if (a.card.id === "throw" && b.card.id === "throw" && isCardInRange(a.card) && isCardInRange(b.card)) {
    addLog("양쪽 잡기가 맞부딪혀 상쇄됐다. 피해 없음.");
    return;
  }

  explainTurn(a.card.type === "super" && b.card.type === "super"
    ? "초필살기끼리는 속도를 비교하지 않고 양쪽 사거리를 확인해 동시에 판정한다."
    : a.card.speed === b.card.speed
    ? `${playerLabel(a.playerIndex)} ${a.card.name} · ${playerLabel(b.playerIndex)} ${b.card.name}: 속도 ${a.card.speed}로 같아 양쪽 사거리를 각각 판정한다.`
    : `${playerLabel(a.playerIndex)} ${a.card.name} 속도 ${a.card.speed} ${a.card.speed > b.card.speed ? ">" : "<"} ${playerLabel(b.playerIndex)} ${b.card.name} 속도 ${b.card.speed}. 빠른 공격부터 사거리를 확인하고, 적중하면 느린 공격을 끊는다.`);

  if (a.card.speed > b.card.speed) {
    if (tryDealDamage(a, b, `${a.card.name}가 먼저 적중.`)) {
      addLog(`${playerLabel(b.playerIndex)}의 ${b.card.name}는 끊겼다.`);
      applyStun(a, b);
    } else {
      if (tryDealDamage(b, a, `${b.card.name}가 빈틈을 찔렀다.`)) applyStun(b, a);
    }
    return;
  }

  if (b.card.speed > a.card.speed) {
    if (tryDealDamage(b, a, `${b.card.name}가 먼저 적중.`)) {
      addLog(`${playerLabel(a.playerIndex)}의 ${a.card.name}는 끊겼다.`);
      applyStun(b, a);
    } else {
      if (tryDealDamage(a, b, `${a.card.name}가 빈틈을 찔렀다.`)) applyStun(a, b);
    }
    return;
  }

  const aHit = tryDealDamage(a, b, `${a.card.name} 동속도 판정.`, true);
  const bHit = tryDealDamage(b, a, `${b.card.name} 동속도 판정.`, true);
  if (aHit && a.card.launch) applyLaunchStun(b, bHit ? 1 : 2);
  if (bHit && b.card.launch) applyLaunchStun(a, aHit ? 1 : 2);
  if (aHit && !bHit) applyStun(a, b);
  if (bHit && !aHit) applyStun(b, a);
}

function applyStun(source, target) {
  if (source.card.launch || ["throw", "super"].includes(source.card.type) || !isAttackAction(source.card) || !isAttackAction(target.card) || state.players[target.playerIndex].hp <= 0) return;
  state.players[target.playerIndex].stunned = true;
  addLog(`${playerLabel(target.playerIndex)} 경직: 다음 턴 카드 1장을 버린다.`);
}

function resolveOffenseVsOther(offense, other) {
  if (other.card.type === "move") {
    resolveOffenseVsMove(offense, other);
    return;
  }

  if (other.card.type === "setup") {
    if (offense.card.speed > other.card.speed) {
      if (tryDealDamage(offense, other, `${offense.card.name}가 준비 동작을 끊었다.`)) return;
      resolveUtilityOrSolo(other);
      return;
    }

    resolveUtilityOrSolo(other);
    tryDealDamage(offense, other, `${offense.card.name} 적중.`);
    return;
  }

  tryDealDamage(offense, other, `${offense.card.name} 적중.`);
}

function resolveOffenseVsMove(offense, move) {
  explainTurn(offense.card.type === "super"
    ? "초필살기는 특수 판정으로 이동을 먼저 적용한 뒤 공격 사거리를 확인한다."
    : offense.card.speed > move.card.speed
    ? `${playerLabel(offense.playerIndex)} 공격 속도 ${offense.card.speed} > ${playerLabel(move.playerIndex)} 이동 속도 ${move.card.speed}. 공격부터 판정한다.`
    : `${playerLabel(move.playerIndex)} 이동 속도 ${move.card.speed} ${move.card.speed === offense.card.speed ? "=" : ">"} ${playerLabel(offense.playerIndex)} 공격 속도 ${offense.card.speed}. 이동을 먼저 적용한 거리에서 공격 사거리를 확인한다.`);
  if (offense.card.speed > move.card.speed) {
    if (tryDealDamage(offense, move, `${offense.card.name}가 이동 전에 적중.`)) {
      addLog(`${playerLabel(move.playerIndex)}의 ${move.card.name}는 끊겼다.`);
    } else {
      resolveUtilityOrSolo(move);
    }
    return;
  }

  if (move.card.speed > offense.card.speed) {
    const moved = resolveUtilityOrSolo(move);
    if (!tryDealDamage(offense, move, `${offense.card.name}가 이동 후 적중.`) && moved) {
      addLog(`${playerLabel(move.playerIndex)}: ${move.card.name}로 ${offense.card.name} 회피.`);
    }
    return;
  }

  const moved = resolveUtilityOrSolo(move);
  if (!tryDealDamage(offense, move, `${offense.card.name} 동시 판정.`) && moved) {
    addLog(`${playerLabel(move.playerIndex)}: ${move.card.name}로 ${offense.card.name} 회피.`);
  }
}

function resolveNonOffensePair(a, b) {
  if (a.card.type === "move" && b.card.type === "move") {
    resolveMovePair(a, b);
    return;
  }
  const ordered = [a, b].sort((left, right) => right.card.speed - left.card.speed);
  ordered.forEach((context) => resolveUtilityOrSolo(context));
}

function resolveMovePair(a, b) {
  const before = state.distance;
  const moves = [a, b].filter((context) => context.valid && ensureInRange(context));
  if (moves.length === 1) {
    applyMove(moves[0]);
  } else if (moves.length === 2) {
    state.distance = clamp(before + a.card.move + b.card.move, 0, 2);
    addLog(`양쪽 이동: ${DISTANCES[before]} -> ${DISTANCES[state.distance]}.`);
  }
}

function resolveUtilityOrSolo(context) {
  if (!context.valid || context.canceled) return false;
  if (!ensureInRange(context)) {
    if (context.card.jump) landJump(context);
    return false;
  }

  if (isOffense(context.card)) {
    dealDamage(context, { playerIndex: context.opponentIndex }, context.card.damage, `${context.card.name} 적중.`);
    if (context.card.jump) landJump(context);
    return true;
  }

  if (context.card.type === "move") {
    applyMove(context);
    return true;
  }

  if (context.card.type === "setup") {
    state.players[context.playerIndex].chargeSucceeded = true;
    addLog(isSoloMatch() && context.playerIndex === 1 ? "솔로 봇: 기 모으기 성공, 상태 카드를 충전 완료로 돌린다." : `${playerLabel(context.playerIndex)}: 기 모으기 성공, 카드를 앞면으로 자기 앞에 두고 충전한다.`);
    return true;
  }

  if (context.card.type === "defense") {
    addLog(`${playerLabel(context.playerIndex)}: ${context.card.name} 유지.`);
    return true;
  }

  return false;
}

function applyMove(context) {
  const before = state.distance;
  state.distance = clamp(state.distance + context.card.move, 0, 2);
  if (before === state.distance) {
    addLog(`${playerLabel(context.playerIndex)}: ${context.card.name}, 거리는 그대로.`);
    return;
  }
  addLog(`${playerLabel(context.playerIndex)}: ${context.card.name}, ${DISTANCES[before]} -> ${DISTANCES[state.distance]}.`);
}

function tryDealDamage(source, target, message, deferLaunch = false) {
  if (!source.valid || !ensureInRange(source)) return false;
  dealDamage(source, target, source.card.damage, message, deferLaunch);
  return true;
}

function applyLaunchStun(target, turns) {
  const targetPlayer = state.players[target.playerIndex];
  if (targetPlayer.hp <= 0) return;
  targetPlayer.stunned = true;
  targetPlayer.extraStunTurns = turns - 1;
  addLog(`${playerLabel(target.playerIndex)} 띄워짐: 다음 ${turns}턴 카드를 버린다.`);
}

function dealDamage(source, target, amount, message, deferLaunch = false) {
  const targetPlayer = state.players[target.playerIndex];
  const damage = Math.max(0, amount || 0);
  targetPlayer.hp = clamp(targetPlayer.hp - damage, 0, MAX_HP);

  if (damage > 0) {
    if (source.card.type === "throw") state.throwLanded = true;
    if (source.card.type === "super") state.superLanded = true;
    addLog(`${message} ${playerLabel(target.playerIndex)} 피해 ${damage}.`);
    if (source.card.launch && !deferLaunch) applyLaunchStun(target, 2);
  } else {
    addLog(`${message} 피해 없음.`);
  }
}

function discardSelectedCards() {
  state.players.forEach((player, index) => {
    const selectedIndex = player.hand.findIndex((card) => card.uid === player.selectedUid);
    if (selectedIndex >= 0) {
      const [card] = player.hand.splice(selectedIndex, 1);
      if (isSoloMatch() && index === 1) {
        card.discardHidden = state.reveal[index] === null;
        player.discard.push(card);
        if (state.reveal[index]?.type === "setup" && player.chargeSucceeded) player.chargedCard = { id: "solo-charge-marker" };
        if (state.reveal[index]?.type === "super") {
          player.chargedCard = null;
          addLog("솔로 봇: 초필살기 사용, 상태 카드를 미충전으로 돌린다.");
        }
      } else if (player.selectedMode === "focus" && player.chargeSucceeded) {
        player.chargedCard = card;
      } else if (player.selectedMode === "action" && state.reveal[index]?.type === "super" && player.chargedCard) {
        player.chargedCard.discardHidden = false;
        card.discardHidden = false;
        player.discard.push(player.chargedCard, card);
        player.chargedCard = null;
        addLog(`${playerLabel(index)}: 충전 카드와 초필살기 카드를 버림 더미에 넣었다.`);
      } else {
        card.discardHidden = state.reveal[index] === null;
        player.discard.push(card);
      }
    }
    player.chargeSucceeded = false;
  });
}

function nextTurn() {
  if (state.phase !== "resolved" || state.winner) return;

  state.players.forEach((player, index) => {
    player.selectedUid = null;
    player.selectedMode = "action";
    player.locked = false;
    drawToHand(index);
  });
  state.phase = "select";
  state.turn += 1;
  addLog(`-- ${state.turn}턴 선택 --`);
  render();
  document.querySelector("#hand0 .card-choice:not(:disabled)")?.focus?.();
}

function checkWinner() {
  const [p1, p2] = state.players;
  if (p1.hp <= 0 && p2.hp <= 0) {
    state.winner = "무승부";
  } else if (p1.hp <= 0) {
    state.winner = "P2 승리";
  } else if (p2.hp <= 0) {
    state.winner = "P1 승리";
  }

  if (state.winner) addLog(`결과: ${state.winner}.`);
}

function bothPlayersLocked() {
  return state.players.every((player) => player.locked);
}

function isOffense(card) {
  return ["attack", "throw", "super"].includes(card.type);
}

function isAttackAction(card) {
  return isOffense(card);
}

function isStrike(card) {
  return ["attack", "super"].includes(card.type);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function playerLabel(index) {
  return index === 0 ? "P1" : "P2";
}

function turnResultIcon(kind) {
  const paths = {
    health: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    distance: '<path d="m7 5-5 7 5 7M17 5l5 7-5 7M3 12h18"/>',
    stun: '<path d="m12 2 2.8 5.6 6.2.9-4.5 4.4 1.1 6.2L12 16.2l-5.6 2.9 1.1-6.2L3 8.5l6.2-.9L12 2Z"/><path d="m3 20 2 2m14-2 2 2"/>',
    charge: '<path d="m13 2-9 12h7l-1 8 10-13h-7l0-7Z"/>',
    process: '<path d="M9 6h12M9 12h12M9 18h12M3 5h1v2H3zM3 11h1v2H3zM3 17h1v2H3z"/>',
  };
  return `<svg class="turn-icon turn-icon-${kind}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[kind]}</svg>`;
}

function renderTurnExplanation() {
  const escapeText = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const report = state.turnReport;
  const validSnapshot = snapshot => snapshot && [0, 1, 2].includes(snapshot.distance)
    && Array.isArray(snapshot.players) && snapshot.players.length === 2
    && snapshot.players.every(player => player && Number.isFinite(player.hp) && Number.isInteger(player.stun) && typeof player.charged === "boolean");
  const hasReport = report?.turn === state.turn && validSnapshot(report.before) && validSnapshot(report.after)
    && Array.isArray(report.steps) && report.steps.every(step => typeof step === "string");
  const roundStart = state.log.lastIndexOf(`-- ${state.turn}턴 공개 --`);
  const steps = hasReport ? report.steps : roundStart >= 0 ? state.log.slice(roundStart + 1) : [];
  elements.resultSummary.textContent = hasReport
    ? report.after.players.map((player, index) => `${playerLabel(index)} 피해 ${report.before.players[index].hp - player.hp}`).join(" · ")
    : "이전 저장 대전 · 남아 있는 판정 로그를 표시합니다.";
  const distanceChange = hasReport ? report.after.distance - report.before.distance : 0;
  const distance = hasReport ? `<section class="turn-distance" aria-label="거리 ${DISTANCES[report.before.distance]} → ${DISTANCES[report.after.distance]}">
    <div class="turn-metric-title">${turnResultIcon("distance")}<strong>거리</strong><span class="turn-change-label">${distanceChange < 0 ? "접근" : distanceChange > 0 ? "후퇴" : "유지"}</span></div>
    <div class="turn-distance-body"><div class="turn-value-change"><span class="turn-value-before">${DISTANCES[report.before.distance]}</span><span class="turn-value-arrow" aria-hidden="true">→</span><strong>${DISTANCES[report.after.distance]}</strong></div><div class="turn-distance-track" aria-hidden="true">${["근", "중", "원"].map((name, index) => `<span class="${index === report.after.distance ? "is-current" : ""}">${name}</span>`).join("")}</div></div>
  </section>` : "";
  const players = hasReport ? `<h3 class="turn-section-title">${state.winner ? "종료 상태" : "다음 턴 상태"}</h3><div class="turn-player-grid">${report.after.players.map((player, index) => {
    const before = report.before.players[index], damage = before.hp - player.hp;
    const stunChanged = before.stun !== player.stun, chargeChanged = before.charged !== player.charged;
    const label = isSoloMatch() && index === 1 ? "솔로 봇" : state.players[index].name || playerLabel(index);
    return `<section class="turn-player-state player-${index}" aria-label="${playerLabel(index)} 상태 변화">
      <header class="turn-player-heading"><span class="turn-player-badge">${playerLabel(index)}</span><strong>${escapeText(label)}</strong></header>
      <div class="turn-health${damage > 0 ? " is-damaged" : ""}" aria-label="${playerLabel(index)} 체력 ${before.hp} → ${player.hp}, 피해 ${damage}">
        <div class="turn-metric-title">${turnResultIcon("health")}<strong>체력</strong><span class="turn-damage-badge${damage > 0 ? " has-damage" : ""}">${damage > 0 ? `피해 −${damage}` : "피해 없음"}</span></div>
        <div class="turn-value-change turn-hp-values"><span class="turn-value-before">${before.hp}</span><span class="turn-value-arrow" aria-hidden="true">→</span><strong>${player.hp}<small> / ${MAX_HP}</small></strong></div>
        <div class="turn-health-bar" aria-hidden="true"><span class="turn-health-lost" style="width:${clamp(before.hp / MAX_HP * 100, 0, 100)}%"></span><span class="turn-health-left" style="width:${clamp(player.hp / MAX_HP * 100, 0, 100)}%"></span></div>
      </div>
      <div class="turn-status-metrics">
        <div class="turn-status-metric status-stun${player.stun > 0 ? " is-active" : before.stun > 0 ? " is-cleared" : ""}${stunChanged ? " is-changed" : ""}" aria-label="${playerLabel(index)} 경직 ${before.stun} → ${player.stun}턴">
          <div class="turn-metric-title">${turnResultIcon("stun")}<strong>경직</strong><span class="turn-status-change">${stunChanged ? player.stun === 0 ? "회복" : player.stun > before.stun ? "발생" : "감소" : "유지"}</span></div>
          <div class="turn-value-change"><span class="turn-value-before">${before.stun}</span><span class="turn-value-arrow" aria-hidden="true">→</span><strong>${player.stun}<small>턴</small></strong></div>
          <p class="turn-status-note">${state.winner ? "대전 종료" : player.stun > 0 ? `${player.stun}턴 행동 불가` : "행동 가능"}</p>
        </div>
        <div class="turn-status-metric status-charge${player.charged ? " is-active" : before.charged ? " is-spent" : ""}${chargeChanged ? " is-changed" : ""}" aria-label="${playerLabel(index)} 충전 ${before.charged ? "완료" : "없음"} → ${player.charged ? "완료" : "없음"}">
          <div class="turn-metric-title">${turnResultIcon("charge")}<strong>충전</strong><span class="turn-status-change">${chargeChanged ? player.charged ? "완료" : "해제" : "유지"}</span></div>
          <div class="turn-value-change"><span class="turn-value-before">${before.charged ? "완료" : "없음"}</span><span class="turn-value-arrow" aria-hidden="true">→</span><strong>${player.charged ? "완료" : "없음"}</strong></div>
          <p class="turn-status-note">${state.winner ? player.charged ? "충전 남음" : "충전 없음" : player.charged ? "초필살기 준비 완료" : "기 모으기로 충전"}</p>
        </div>
      </div>
    </section>`;
  }).join("")}</div>${state.winner ? `<p class="turn-winner">${escapeText(state.winner)} · 대전 종료</p>` : ""}` : "";
  const stepTone = step => /경직|띄워짐/.test(step) ? "stun" : /충전|기 모으기/.test(step) ? "charge" : /피해|적중/.test(step) ? "hit" : /방어|가드/.test(step) ? "guard" : /거리|이동|접근/.test(step) ? "distance" : "neutral";
  const process = `<details class="turn-process"${hasReport ? "" : " open"}><summary>${turnResultIcon("process")}<strong>판정 과정</strong><span>${steps.length ? `${steps.length}단계` : "기록 없음"}</span></summary>${steps.length ? `<ol class="turn-steps">${steps.map(step => `<li class="turn-step-${stepTone(step)}">${escapeText(step)}</li>`).join("")}</ol>` : '<p class="turn-report-unavailable">이 턴의 상세 기록이 없습니다. 다음 턴부터 판정 과정을 기록합니다.</p>'}</details>`;
  elements.turnExplanation.innerHTML = `${distance}${players}${process}`;
}

function render() {
  if (!DEMO_MODE) {
    elements.opponentModeSelect.value = nextOpponentMode;
    elements.opponentModeSelect.disabled = matchLoading;
    elements.aiMatchButton.setAttribute("aria-pressed", String(!isSoloMatch()));
    elements.soloMatchButton.setAttribute("aria-pressed", String(isSoloMatch()));
    elements.aiMatchButton.disabled = matchLoading;
    elements.soloMatchButton.disabled = matchLoading;
    document.querySelector("#matchModeDescription").textContent = matchLoading ? "대전을 준비하는 중입니다." : isSoloMatch()
      ? "솔로 봇 · 전용 행동 카드 12장, 손패 없이 한 장씩 공개합니다."
      : "AI · 전투 카드 20장과 손패를 사용합니다.";
    document.querySelector("#rivalTitle").textContent = isSoloMatch() ? "솔로 봇 · 12장 덱" : "라이벌";
    document.querySelector("#rivalTag").textContent = isSoloMatch() ? "P2 · SOLO" : "P2 · AI";
    for (const index of [0, 1]) {
      const select = document.querySelector(`#fighterSelect${index}`);
      select.value = fighterSelections[index];
      select.disabled = matchLoading || index === 1 && isSoloMatch();
    }
    document.querySelector("#soloFighterNote").hidden = !isSoloMatch();
    elements.handSizeSelect.value = String(nextHandSize);
  } else {
    document.querySelector("#rivalTitle").textContent = "상대 · AI";
  }
  document.querySelector("#handTitle small").textContent = `${handSize}장`;
  for (const index of [0, 1]) {
    const grid = document.querySelector(`#hand${index}`);
    if (!grid) continue;
    grid.classList.toggle("hand-size-3", handSize === 3);
    grid.classList.toggle("hand-size-5", handSize === 5);
  }
  elements.turnLabel.textContent = state.winner ? state.winner : `${state.turn}턴`;
  elements.distanceText.textContent = DISTANCES[state.distance];
  elements.phaseText.textContent = state.winner ? "대전 종료" : state.phase === "select" ? "선택 단계" : "공개 중";
  elements.nextTurnButton.hidden = state.phase !== "resolved" || Boolean(state.winner);
  elements.rematchButton.hidden = !state.winner;
  elements.resultSheet.hidden = state.phase !== "resolved";
  elements.resultDistance.textContent = DISTANCES[state.distance];
  if (state.phase === "resolved") {
    renderTurnExplanation();
    document.querySelector(".result-panel").scrollTop = 0;
  }

  renderDistance();
  renderReveal();
  renderLog();
  state.players.forEach((_, index) => renderPlayer(index));
  incomingCards.clear();
  if (elements.cardLibrary && !elements.cardLibrary.hidden && activeDiscardIndex !== null) renderDiscard(activeDiscardIndex);
  saveGame();
  globalThis.FIGHTING_DUEL_OPTIONS?.onRender?.(state);
}

function renderDistance() {
  elements.distanceTrack.innerHTML = DISTANCES.map((label, index) => {
    const activeClass = index === state.distance ? " active" : "";
    return `<div class="distance-node${activeClass}">${label}</div>`;
  }).join("");
}

function renderPlayer(index) {
  const player = state.players[index];
  const isAi = index === AI_PLAYER_INDEX;
  const hpPercent = (player.hp / MAX_HP) * 100;
  document.querySelector(`#hpText${index}`).textContent = `${player.hp} / ${MAX_HP}`;
  document.querySelector(`#hpFill${index}`).style.width = `${hpPercent}%`;
  document.querySelector(`#chargeText${index}`).textContent = player.chargedCard ? "준비 완료" : "대기";
  const chargeSlot = document.querySelector(`#chargeSlot${index}`);
  chargeSlot.classList.toggle("ready", Boolean(player.chargedCard));
  chargeSlot.innerHTML = isSoloMatch() && isAi ? "" : player.chargedCard
    ? `<img class="charge-card-front" src="${cardFrontDirectory(index)}${cardFrontId(player.chargedCard)}.png?v=${CARD_FRONT_VERSION}" alt="" /><span>앞면 충전 카드 1장</span>`
    : "충전 카드 없음";
  chargeSlot.setAttribute("aria-label", player.chargedCard ? "앞면 충전 카드 1장" : "충전 카드 없음");
  if (isSoloMatch() && isAi) {
    const charged = Boolean(player.chargedCard);
    document.querySelector("#chargeText1").textContent = charged ? "충전 완료" : "미충전";
    chargeSlot.innerHTML = `<img class="solo-charge-thumb${charged ? " rotated" : ""}" src="assets/pnp/solo/rendered/solo-charge-status.png?v=1" alt="봇 충전 상태 카드" /><span>${charged ? "충전 완료" : "미충전"}</span>`;
    chargeSlot.setAttribute("aria-label", `봇 충전 상태 ${charged ? "충전 완료" : "미충전"}`);
  }
  renderPiles(index);

  const choiceState = document.querySelector(`#choiceState${index}`);
  const discardedFromStun = state.phase === "resolved" && state.reveal?.[index] === null;
  choiceState.classList.toggle("locked", player.locked && state.phase === "select");
  choiceState.classList.toggle("done", state.phase === "resolved");
  choiceState.classList.toggle("stunned", player.stunned);
  choiceState.textContent = discardedFromStun ? player.stunned ? "경직 · 1회 남음" : "경직 · 버림" : getChoiceText(player);

  if (DEMO_MODE && isAi) return;
  const selectedCard = player.hand.find((card) => card.uid === player.selectedUid);
  const selectedStrip = document.querySelector(`#selectedStrip${index}`);
  selectedStrip.classList.toggle("ready", Boolean(selectedCard));
  if (discardedFromStun) {
    selectedStrip.textContent = player.stunned ? "카드 1장 버림 · 다음 턴도 경직" : "카드 1장 버림";
  } else if (state.phase === "resolved") {
    selectedStrip.textContent = `${state.reveal[index].name} 공개`;
  } else if (isAi && state.phase === "select") {
    selectedStrip.textContent = player.stunned ? (selectedCard ? "AI 경직 · 버릴 카드 선택됨" : "AI 경직 · 버릴 카드 선택 대기") : selectedCard ? "AI 카드 선택됨" : "AI 선택 대기";
  } else if (player.stunned && state.phase === "select") {
    selectedStrip.textContent = selectedCard ? `${selectedCard.name} 버림 예정` : "버릴 카드를 선택하세요";
  } else {
    selectedStrip.textContent = selectedCard ? `${getPlayedCard(selectedCard, player.selectedMode).name} 선택됨` : "카드를 선택하세요";
  }

  const hand = document.querySelector(`#hand${index}`);
  hand.innerHTML = "";
  if (isAi) {
    if (isSoloMatch()) {
      elements.rivalHandCount.textContent = "손패 없음 · 전용 행동 덱 12장";
      if (state.phase === "select") selectedStrip.textContent = player.stunned ? "경직 · 덱 맨 위 1장 비공개 버림 예정" : "내 선택 후 봇 카드 공개";
      elements.rivalHandToggle.disabled = true;
      hand.classList.remove("concealed");
      hand.innerHTML = '<p class="solo-bot-note">내 선택을 확정하면 봇 덱에서 한 장을 공개합니다. 턴 시작 체력·거리·충전으로 행동을 정합니다.</p>';
      return;
    }
    elements.rivalHandToggle.disabled = false;
    elements.rivalHandCount.textContent = `손패 ${player.hand.length}장`;
    const concealed = !elements.rivalHandToggle.checked;
    hand.classList.toggle("concealed", concealed);
    if (concealed) {
      hand.innerHTML = player.hand.map((_, cardIndex) => `
        <article class="hand-card card-back" aria-label="라이벌 비공개 카드 ${cardIndex + 1}"></article>
      `).join("");
      return;
    }
  }
  player.hand.forEach((card) => {
    const cardElement = document.createElement("article");
    const selected = player.selectedUid === card.uid;
    const controlsDisabled = matchLoading || isAi || state.phase !== "select" || player.locked || Boolean(state.winner);
    const rotateButton = !isAi ? `<button class="rotate-card" type="button" aria-label="${card.name} 카드 180도 돌려 보기" aria-pressed="${rotatedCards.has(card.uid)}" title="카드 돌려 보기">↻</button>` : "";
    cardElement.className = `hand-card ${cardVisualClass(card)}${selected ? " selected" : ""}${player.stunned ? " stunned" : ""}${!isAi && incomingCards.has(card.uid) ? " entering" : ""}`;
    cardElement.innerHTML = `
      <div class="printed-wrap">
        ${printedCardMarkup(card, null, rotatedCards.has(card.uid), index)}
        <div class="card-choices${rotatedCards.has(card.uid) ? " rotated" : ""}${player.stunned ? " discard-choice" : ""}"></div>
        ${DEMO_MODE ? "" : rotateButton}
      </div>
      <div class="hand-card-info"><strong>${card.name}</strong><span>${player.stunned ? "카드 클릭 · 버리기" : "기술 영역 클릭 · 사용"}</span>${DEMO_MODE ? rotateButton : ""}</div>`;

    if (!isAi) cardElement.querySelector(".rotate-card").addEventListener("click", () => {
      if (rotatedCards.has(card.uid)) rotatedCards.delete(card.uid);
      else rotatedCards.add(card.uid);
      const rotated = rotatedCards.has(card.uid);
      cardElement.querySelector(".printed-card").classList.toggle("rotated", rotated);
      cardElement.querySelector(".card-choices").classList.toggle("rotated", rotated);
      cardElement.querySelector(".rotate-card").setAttribute("aria-pressed", String(rotated));
      saveGame();
    });

    const choices = cardElement.querySelector(".card-choices");
    (player.stunned ? ["action"] : card.combined ? ["action", "focus"] : ["action", "move"]).forEach((mode) => {
      const playedCard = getPlayedCard(card, mode);
      const button = document.createElement("button");
      const label = player.stunned ? "이 카드 버리기" : mode === "focus" ? "기 모으기" : mode === "action" ? card.combined ? "초필살기" : card.name : card.moveMode === "guard" ? "가드" : card.moveMode === "dash" ? "대시" : "백스텝";
      button.type = "button";
      button.setAttribute("data-mode", mode);
      button.className = `card-choice${!player.stunned && !isCardInRange(playedCard) ? " range-risk" : ""}`;
      button.textContent = label;
      button.disabled = controlsDisabled || (mode === "action" && !canSelectCard(card, index)) || (mode === "focus" && Boolean(player.chargedCard));
      button.setAttribute("aria-pressed", String(selected && player.selectedMode === mode));
      button.setAttribute("aria-label", player.stunned ? `${card.name} 버리기` : `${label}, 가능 거리 ${cardRangeText(playedCard)}`);
      button.title = player.stunned ? "경직: 이 카드를 버림" : mode === "focus" ? player.chargedCard ? "이미 충전됨" : "전 거리, 속도 1, 성공 시 이 카드를 앞면으로 자기 앞에 두고 충전" : mode === "action" && !canSelectCard(card, index)
        ? "충전 카드 필요"
        : mode === "action" && card.antiAir && state.distance !== 0
          ? "점프 공격이면 전 거리 적중"
        : isCardInRange(playedCard) ? label : "현재 거리에서는 헛칠 수 있음";
      button.addEventListener("click", () => selectCard(index, card.uid, mode, cardElement));
      choices.appendChild(button);
    });
    hand.appendChild(cardElement);
  });
}

function cardFrontId(card) {
  return card.frontId || (card.id === "super" ? "super-1" : `${card.id}-${card.moveMode || "dash"}`);
}

function cardFrontDirectory(playerIndex = 0) {
  return `${CARD_FRONT_DIRECTORY}${fighterSelections[playerIndex] || FIGHTER_IDS[playerIndex] || FIGHTER_IDS[0]}/rendered/`;
}

function printedCardMarkup(card, mode = null, rotated = false, playerIndex = 0) {
  if (card.soloDirective || card.soloNumber) {
    const number = card.soloNumber || card.number;
    return `<img class="printed-card" src="assets/pnp/solo/rendered/solo-${number}.png?v=1" alt="솔로 ${number} ${card.soloName || card.name} 행동 카드" draggable="false" />`;
  }
  const faceUp = rotated || mode === "move" || card.id === "super" && mode === "focus";
  const move = card.moveMode ? ` · ${card.moveMode === "guard" ? "가드" : card.moveMode === "dash" ? "대시" : "백스텝"}` : "";
  return `<img class="printed-card${faceUp ? " rotated" : ""}" src="${cardFrontDirectory(playerIndex)}${cardFrontId(card)}.png?v=${CARD_FRONT_VERSION}" alt="${card.name}${move} 카드 앞면" draggable="false" />`;
}

function renderPiles(index) {
  const player = state.players[index];
  if (!document.querySelector(`#deckCount${index}`)) return;
  document.querySelector(`#deckCount${index}`).textContent = `${player.deck.length}장`;
  const button = document.querySelector(`#discardButton${index}`);
  button.textContent = `버림 ${player.discard.length}장 · 보기`;
  button.setAttribute("aria-label", `${playerLabel(index)} 버림 더미 ${player.discard.length}장 보기`);
}

function getChoiceText(player) {
  if (player.stunned) return player.locked && state.phase === "select" ? "경직 · 고정됨" : `경직 · ${(player.extraStunTurns || 0) + 1}회 남음`;
  if (state.phase === "resolved") return "공개 완료";
  if (player.locked) return "고정됨";
  if (player.selectedUid) return "선택됨";
  return "선택 대기";
}

function cardSpeedText(card) {
  return card.type === "super" ? "특수" : String(card.speed);
}

function cardTypeLabel(card) {
  return card.type === "attack" && card.special ? "필살기" : TYPE_LABELS[card.type];
}

function cardVisualClass(card) {
  return card.type === "attack" && card.special ? "type-special" : `type-${card.type}`;
}

function cardTemplate(card, showCurrent = true) {
  const cost = card.type === "super" ? '<span class="card-cost">충전 필요</span>' : "<span></span>";
  const damage = card.damage ? `피해 ${card.damage}` : card.type === "defense" ? "완전 방어" : card.type === "setup" ? "카드 충전" : card.move ? `거리 ${card.move > 0 ? "+1" : "-1"}` : "효과";
  return `
    <span class="card-top">
      <span class="type-chip">${cardTypeLabel(card)}</span>
      ${cost}
    </span>
    <span class="card-name">${card.name}</span>
    <span class="card-meta">속도 ${cardSpeedText(card)} · ${damage}</span>
    ${cardRangeTemplate(card, showCurrent)}
    <span class="card-effect">${card.effect}</span>
  `;
}

function cardRangeTemplate(card, showCurrent = true) {
  const current = showCurrent ? `, 현재 거리 ${DISTANCES[state.distance]}` : "";
  const cells = DISTANCES.map((distance, index) => {
    const conditional = card.antiAir && index > 0 || card.combined && index === 2;
    const reachable = card.range.includes(index);
    const currentClass = showCurrent && index === state.distance ? " current" : "";
    const statusClass = reachable ? " reachable" : conditional ? " conditional" : "";
    const title = card.combined && index === 2 ? "기 모으기만" : conditional ? "점프 공격 상대만" : reachable ? "사용 가능" : "사거리 밖";
    return `<span class="range-cell${statusClass}${currentClass}" title="${distance}: ${title}" aria-hidden="true">${distance[0]}</span>`;
  }).join("");
  return `<span class="card-range" role="img" aria-label="가능 거리 ${cardRangeText(card)}${current}"><span class="range-caption" aria-hidden="true">사거리</span>${cells}</span>`;
}

function rangeText(range) {
  return range.map((index) => DISTANCES[index]).join(" / ");
}

function cardRangeText(card) {
  const range = rangeText(card.range);
  if (card.combined) return `초필살기 ${range} / 기 모으기 모든 거리`;
  return card.antiAir ? `${range} / 점프 상대 전 거리` : range;
}

function renderReveal() {
  if (!state.reveal) {
    elements.revealZone.innerHTML = `
      <article class="reveal-card empty"><span>P1 · 도전자</span><strong>카드 선택 대기</strong></article>
      <article class="reveal-card empty"><span>P2 · 라이벌</span><strong>비공개 선택</strong></article>
    `;
    return;
  }

  const previousTurn = state.phase === "select";
  elements.revealZone.innerHTML = state.reveal.map((card, index) => card ? `
    <article class="reveal-card player-${index} ${cardVisualClass(card)}" aria-label="${playerLabel(index)} ${previousTurn ? "이전 턴" : "공개"} 카드: ${card.name}">
      <div class="reveal-player"><span>${playerLabel(index)}${previousTurn ? " · 이전 턴" : ""}</span><strong>${card.name}</strong></div>
      ${printedCardMarkup(card, card.playMode, false, index)}
      <span class="reveal-mode">${card.playMode === "move" ? card.moveMode === "guard" ? "가드" : card.moveMode === "dash" ? "대시" : "백스텝" : card.name}</span>
      ${card.soloNumber ? `<small class="solo-decision">${card.soloNumber} ${card.soloName} · 턴 시작 체력 ${card.soloSnapshot.hp}<br>${DISTANCES[card.soloSnapshot.distance]} · ${card.soloSnapshot.charged ? "충전 완료" : "미충전"}</small>` : ""}
    </article>
  ` : `
    <article class="reveal-card stunned" aria-label="${playerLabel(index)} 경직, 카드 버림">
      <span class="reveal-player">${playerLabel(index)}${previousTurn ? " · 이전 턴" : ""}</span>
      <strong>경직</strong>
      <span>카드 버림</span>
    </article>
  `).join("");

  if (state.winner) {
    elements.revealZone.insertAdjacentHTML("beforeend", `<div class="winner-banner">${state.winner}</div>`);
  }
}

function renderLog() {
  if (!elements.combatLog) return;
  elements.combatLog.start = state.logStart || 1;
  elements.combatLog.innerHTML = state.log.map((item) => `<li>${item}</li>`).join("");
  elements.combatLog.scrollTop = elements.combatLog.scrollHeight;
}

function renderCardLibrary() {
  elements.libraryCount.textContent = `${CARDS.filter(card => card.copies > 0).length}종 · 실제 카드 20장`;
  elements.libraryGrid.innerHTML = CARDS.flatMap((card) => Array.from({ length: card.copies }, (_, copy) => {
    const { moveMode, frontId } = physicalCardLayout(card, copy);
    const printed = { ...card, moveMode, frontId };
    return `<article class="library-card" aria-label="${card.name} ${moveMode || `사본 ${copy + 1}`}">
      ${printedCardMarkup(printed)}
      <div class="library-card-caption"><strong>${card.name}</strong><span>${moveMode ? `기술 / ${moveMode === "guard" ? "가드" : moveMode === "dash" ? "대시" : "백스텝"}` : `초필살기 / 기 모으기 · ${copy + 1}`}</span></div>
    </article>`;
  })).join("");
}

function renderDiscard(index) {
  const cards = [...state.players[index].discard].reverse();
  document.querySelector("#libraryTitle").textContent = `${playerLabel(index)} 버림 더미`;
  elements.libraryCount.textContent = `${cards.length}장 · 최근 버린 카드부터 표시`;
  elements.libraryGrid.innerHTML = cards.length ? cards.map((card) => {
    if (index === AI_PLAYER_INDEX && card.discardHidden) {
      return '<article class="discard-card-back" aria-label="경직으로 비공개 버린 카드">경직으로 비공개 버린 카드</article>';
    }
    return `<article class="library-card" aria-label="${card.name} 버린 카드">
      ${printedCardMarkup(card, null, false, index)}
      <div class="library-card-caption"><strong>${card.name}</strong><span>${card.soloDirective ? `솔로 행동 카드 ${card.number}` : card.moveMode === "guard" ? "기술 / 가드" : card.moveMode === "dash" ? "기술 / 대시" : card.moveMode === "backstep" ? "기술 / 백스텝" : "초필살기 / 기 모으기"}</span></div>
    </article>`;
  }).join("") : '<p class="discard-empty">버린 카드가 없습니다.</p>';
}

function cardStatItems(card) {
  const stats = [`속도 ${cardSpeedText(card)}`];
  if (card.combined) stats.push("기 모으기 속도 1 · 전 거리 · 카드 충전");
  if (card.damage) stats.push(`피해 ${card.damage}`);
  if (card.type === "defense") stats.push("완전 방어");
  if (card.move) stats.push(card.move > 0 ? "거리 +1" : "거리 -1");
  if (card.type === "super") stats.push("충전 카드 필요");
  stats.push(`덱 ${card.copies}장`);
  return stats;
}

function openCardLibrary() {
  dialogOpener = elements.utilityDrawer.hidden ? elements.cardLibraryButton : elements.menuButton;
  closeUtilityDrawer(false);
  activeDiscardIndex = null;
  document.querySelector("#libraryTitle").textContent = "전체 카드";
  renderCardLibrary();
  elements.cardLibrary.hidden = false;
  elements.appShell.inert = true;
  elements.closeLibraryButton.focus();
}

function openDiscard(index) {
  dialogOpener = elements.utilityDrawer.hidden ? document.querySelector(`#discardButton${index}`) : elements.menuButton;
  closeUtilityDrawer(false);
  activeDiscardIndex = index;
  renderDiscard(index);
  elements.cardLibrary.hidden = false;
  elements.appShell.inert = true;
  elements.closeLibraryButton.focus();
}

function closeCardLibrary() {
  elements.cardLibrary.hidden = true;
  elements.appShell.inert = false;
  activeDiscardIndex = null;
  dialogOpener?.focus();
}

function openUtilityDrawer() {
  elements.utilityDrawer.hidden = false;
  elements.menuButton.setAttribute("aria-expanded", "true");
  elements.appShell.inert = true;
  elements.closeDrawerButton.focus?.();
}

function closeUtilityDrawer(restoreFocus = true) {
  if (!elements.utilityDrawer || elements.utilityDrawer.hidden) return;
  elements.utilityDrawer.hidden = true;
  elements.menuButton.setAttribute("aria-expanded", "false");
  elements.appShell.inert = false;
  if (restoreFocus) elements.menuButton.focus?.();
}

function chooseFighter(playerIndex, fighter) {
  if (![0, 1].includes(playerIndex) || !FIGHTER_IDS.includes(fighter) || matchLoading || playerIndex === 1 && isSoloMatch()) return;
  fighterSelections[playerIndex] = fighter;
  render();
  if (elements.cardLibrary && !elements.cardLibrary.hidden && activeDiscardIndex === null) renderCardLibrary();
}

// UI bindings
elements.menuButton?.addEventListener("click", openUtilityDrawer);
for (const index of [0, 1]) {
  document.querySelector(`#fighterSelect${index}`)?.addEventListener("change", event => chooseFighter(index, event.target.value));
}
elements.aiMatchButton?.addEventListener("click", () => { if (isSoloMatch()) startMatch("ai"); });
elements.soloMatchButton?.addEventListener("click", () => { if (!isSoloMatch()) startMatch("solo"); });
elements.opponentModeSelect?.addEventListener("change", () => startMatch(elements.opponentModeSelect.value));
elements.handSizeSelect?.addEventListener("change", () => {
  const chosen = Number(elements.handSizeSelect.value);
  if (![3, 4, 5].includes(chosen)) return;
  nextHandSize = chosen;
  saveGame();
});
elements.closeDrawerButton?.addEventListener("click", () => closeUtilityDrawer());
elements.utilityDrawer?.addEventListener("click", (event) => {
  if (event.target.matches("[data-close-drawer]")) closeUtilityDrawer();
});
elements.newGameButton?.addEventListener("click", () => { newGame(); closeUtilityDrawer(); });
elements.rematchButton?.addEventListener("click", newGame);
elements.nextTurnButton?.addEventListener("click", nextTurn);
elements.rivalHandToggle?.addEventListener("change", () => { renderPlayer(AI_PLAYER_INDEX); saveGame(); });
elements.cardLibraryButton?.addEventListener("click", openCardLibrary);
document.querySelector("#discardButton0")?.addEventListener("click", () => openDiscard(0));
document.querySelector("#discardButton1")?.addEventListener("click", () => openDiscard(1));
elements.closeLibraryButton?.addEventListener("click", closeCardLibrary);
elements.cardLibrary?.addEventListener("click", (event) => {
  if (event.target.matches("[data-close-library]")) closeCardLibrary();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Tab" && elements.cardLibrary && !elements.cardLibrary.hidden) {
    event.preventDefault();
    elements.closeLibraryButton.focus();
  } else if (event.key === "Tab" && elements.utilityDrawer && !elements.utilityDrawer.hidden) {
    const focusable = [...elements.utilityDrawer.querySelectorAll("a, button, input, select")].filter((item) => !item.disabled);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  } else if (event.key === "Tab" && !elements.resultSheet.hidden && !globalThis.FIGHTING_DUEL_OPTIONS?.managesResultFocus) {
    event.preventDefault();
    (state.winner ? elements.rematchButton : elements.nextTurnButton).focus?.();
  }
  if (event.key === "Escape" && elements.cardLibrary && !elements.cardLibrary.hidden) closeCardLibrary();
  else if (event.key === "Escape" && elements.utilityDrawer && !elements.utilityDrawer.hidden) closeUtilityDrawer();
});
initializeGame();
