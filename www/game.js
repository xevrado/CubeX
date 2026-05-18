/* =========================================
   CUBEX — Full Game Logic
   ========================================= */

// ---- Version (Android APK Update Check) ----
let APP_VERSION = "1.4.5.0"; // Bu değer sync.js tarafından otomatik güncellenir
// ---- Constants ----
const BOARD_SIZE = 8;
const COLORS = 8; // color-0 … color-7

// ---- Piece Shapes (relative coords [row, col]) ----
const SHAPES = [
  // ── Singles / small ──
  { cells: [[0,0]], name: '1x1' },

  // ── Lines ──
  { cells: [[0,0],[0,1]], name: '1x2' },
  { cells: [[0,0],[1,0]], name: '2x1' },
  { cells: [[0,0],[0,1],[0,2]], name: '1x3' },
  { cells: [[0,0],[1,0],[2,0]], name: '3x1' },
  { cells: [[0,0],[0,1],[0,2],[0,3]], name: '1x4' },
  { cells: [[0,0],[1,0],[2,0],[3,0]], name: '4x1' },
  { cells: [[0,0],[0,1],[0,2],[0,3],[0,4]], name: '1x5' },
  { cells: [[0,0],[1,0],[2,0],[3,0],[4,0]], name: '5x1' },

  // ── Squares ──
  { cells: [[0,0],[0,1],[1,0],[1,1]], name: '2x2' },
  { cells: [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]], name: '3x3' },

  // ── Rectangles ──
  { cells: [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]], name: '2x3' },
  { cells: [[0,0],[0,1],[1,0],[1,1],[2,0],[2,1]], name: '3x2' },

  // ── L shapes ──
  { cells: [[0,0],[1,0],[1,1]], name: 'L1' },
  { cells: [[0,0],[0,1],[1,0]], name: 'L2' },
  { cells: [[0,0],[0,1],[1,1]], name: 'L3' },
  { cells: [[0,0],[1,0],[1,-1]], name: 'L4' },

  // ── Big L shapes ──
  { cells: [[0,0],[1,0],[2,0],[2,1],[2,2]], name: 'BigL1' },
  { cells: [[0,0],[0,1],[0,2],[1,0],[2,0]], name: 'BigL2' },
  { cells: [[0,0],[0,1],[0,2],[1,2],[2,2]], name: 'BigL3' },
  { cells: [[0,0],[1,0],[2,0],[2,-1],[2,-2]], name: 'BigL4' },

  // ── J shapes (mirror of L) ──
  { cells: [[0,0],[0,1],[1,0],[2,0]], name: 'J1' },
  { cells: [[0,0],[1,0],[1,1],[1,2]], name: 'J2' },
  { cells: [[0,0],[0,1],[0,2],[1,0]], name: 'J3' },
  { cells: [[0,0],[0,1],[0,2],[1,2]], name: 'J4' },

  // ── T shapes ──
  { cells: [[0,0],[0,1],[0,2],[1,1]], name: 'T1' },
  { cells: [[0,0],[1,0],[1,1],[2,0]], name: 'T2' },
  { cells: [[0,1],[1,0],[1,1],[1,2]], name: 'T3' },
  { cells: [[0,0],[1,0],[1,-1],[2,0]], name: 'T4' },

  // ── Z / S shapes ──
  { cells: [[0,0],[0,1],[1,1],[1,2]], name: 'Z1' },
  { cells: [[0,0],[1,0],[1,-1],[2,-1]], name: 'Z2' },
  { cells: [[0,0],[0,1],[1,-1],[1,0]], name: 'S1' },
  { cells: [[0,0],[1,0],[1,1],[2,1]], name: 'S2' },

  // ── Plus / Cross ──
  { cells: [[0,1],[1,0],[1,1],[1,2],[2,1]], name: 'Plus' },
  { cells: [[0,0],[1,0],[1,1]], name: 'SmallCross' },

  // ── Corner / Angle shapes ──
  { cells: [[0,0],[0,1],[1,0]], name: 'Corner1' },
  { cells: [[0,0],[0,1],[1,1]], name: 'Corner2' },
  { cells: [[0,0],[1,0],[1,1]], name: 'Corner3' },
  { cells: [[0,1],[1,0],[1,1]], name: 'Corner4' },

  // ── Diagonal pair ──
  { cells: [[0,0],[1,1]], name: 'Diag1' },
  { cells: [[0,1],[1,0]], name: 'Diag2' },

  // ── Small T variants ──
  { cells: [[0,0],[0,1],[0,2],[1,0]], name: 'SmallT1' },
  { cells: [[0,0],[0,1],[0,2],[1,2]], name: 'SmallT2' },
];

// ---- State ----
let board = [];          // 8x8, null or colorIndex
let score = 0;
let bestScore = 0;
let level = 1;
let combo = 0;
let currentPieces = [];  // [{shape, color, used}]
let soundOn = true;
let dragState = null;    // active drag info
let cellElements = [];   // cached DOM elements for the board
let highlightedCells = new Set(); // Sadece vurgulanan hücreleri tut (Performans)
let dragRafId = null;    // rAF id for drag optimization
let clearingInProgress = false; // Satır temizleme animasyonu sırasında yerleştirmeyi engelle
let gameActive = false;  // Aktif bir oyun var mı?
let hasSubmittedThisGame = false; // Bu oyunda skor veritabanına başarıyla yüklendi mi?

// ---- Audio (Web Audio API — tiny synth) ----
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// ---- Haptics (Capacitor) ----
const haptics = {
  impact: (style = 'MEDIUM') => {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
      window.Capacitor.Plugins.Haptics.impact({ style });
    }
  },
  notification: (type = 'SUCCESS') => {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
      window.Capacitor.Plugins.Haptics.notification({ type });
    }
  },
  vibrate: () => {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
      window.Capacitor.Plugins.Haptics.vibrate();
    }
  }
};

function playTone(freq, duration, type = 'sine', vol = 0.12) {
  if (!soundOn || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {}
}

function sfxPlace()   { playTone(520, 0.12, 'sine', 0.15); playTone(660, 0.1, 'sine', 0.10); }
function sfxClear()   { playTone(780, 0.15, 'triangle', 0.18); playTone(1040, 0.2, 'sine', 0.12); }
function sfxCombo()   { playTone(880, 0.1, 'sine', 0.2); setTimeout(() => playTone(1100, 0.15, 'sine', 0.18), 80); setTimeout(() => playTone(1320, 0.2, 'sine', 0.15), 160); }
function sfxGameOver(){ playTone(300, 0.3, 'sawtooth', 0.1); setTimeout(() => playTone(200, 0.4, 'sawtooth', 0.08), 200); }
function sfxClick()   { playTone(600, 0.06, 'sine', 0.08); }

// ---- DOM refs ----
const boardEl        = document.getElementById('gameBoard');
const scoreEl        = document.getElementById('scoreDisplay');
const bestEl         = document.getElementById('bestDisplay');
const levelEl        = document.getElementById('levelDisplay');
const comboCountEl   = document.getElementById('comboCount');
const comboDisplayEl = document.getElementById('comboDisplay');
const trayEl         = document.getElementById('pieceTray');
const clearFlashEl   = document.getElementById('clearFlash');
const scorePopupEl   = document.getElementById('scorePopup');
const gameOverOverlay= document.getElementById('gameOverOverlay');
const helpOverlay    = document.getElementById('helpOverlay');
const soundBtn       = document.getElementById('soundBtn');
const helpBtn        = document.getElementById('helpBtn');
const restartBtn     = document.getElementById('restartBtn');
const playAgainBtn   = document.getElementById('playAgainBtn');
const closeHelpBtn   = document.getElementById('closeHelpBtn');
const finalScoreEl   = document.getElementById('finalScore');
const finalBestEl    = document.getElementById('finalBest');
const finalLevelEl   = document.getElementById('finalLevel');

// ---- Initialize Particles ----
function createParticles() {
  const container = document.getElementById('bgParticles');
  const colors = ['#4f8ef7','#a855f7','#ec4899','#06b6d4','#22c55e','#eab308'];
  // Parçacık sayısını mobil için azalttık
  for (let i = 0; i < 8; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = 4 + Math.random() * 12;
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.left = Math.random() * 100 + '%';
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.animationDuration = (10 + Math.random() * 15) + 's';
    p.style.animationDelay = (Math.random() * 10) + 's';
    p.style.transform = 'translate3d(0,0,0)'; // GPU zorlama
    container.appendChild(p);
  }
}

// ---- Board Logic ----
function createBoard() {
  board = [];
  cellElements = [];
  boardEl.innerHTML = ''; // Tahtayı bir kere temizle
  for (let r = 0; r < BOARD_SIZE; r++) {
    board.push(new Array(BOARD_SIZE).fill(null));
    const rowElements = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      boardEl.appendChild(cell);
      rowElements.push(cell);
    }
    cellElements.push(rowElements);
  }
}

function renderBoard() {
  // DOM elementlerini yeniden oluşturmak yerine sadece class'larını güncelle (Performans Optimizasyonu)
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = cellElements[r][c];
      if (!cell) continue;
      
      let newClass = 'cell';
      if (board[r][c] !== null) {
        newClass += ' filled color-' + board[r][c];
      }
      
      // Gereksiz reflow'dan kaçınmak için sadece class değiştiyse güncelle
      if (cell.className !== newClass) {
        cell.className = newClass;
      }
    }
  }
}

function getCellEl(r, c) {
  if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
    return cellElements[r][c];
  }
  return null;
}

// ---- Piece Generation ----
function normalizeCells(cells) {
  const minR = Math.min(...cells.map(c => c[0]));
  const minC = Math.min(...cells.map(c => c[1]));
  return cells.map(([r, c]) => [r - minR, c - minC]);
}

function makePieceFromShape(shape) {
  const color = Math.floor(Math.random() * COLORS);
  const cells = normalizeCells(shape.cells);
  return { cells, color, used: false, name: shape.name };
}

function randomPiece() {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  return makePieceFromShape(shape);
}

// Tahtanın mevcut durumuna göre yerleştirilebilecek şekilleri filtrele
function getFittingShapes() {
  const fitting = [];
  for (const shape of SHAPES) {
    const cells = normalizeCells(shape.cells);
    // Bu şekil tahtaya herhangi bir yere sığabiliyor mu?
    let fits = false;
    for (let r = 0; r < BOARD_SIZE && !fits; r++) {
      for (let c = 0; c < BOARD_SIZE && !fits; c++) {
        if (canPlace(cells, r, c)) fits = true;
      }
    }
    if (fits) fitting.push(shape);
  }
  return fitting;
}

// Boş hücreleri gruplandır (Connected Components)
function findEmptyClusters() {
  const visited = Array.from({ length: BOARD_SIZE }, () => new Array(BOARD_SIZE).fill(false));
  const clusters = [];
  
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === null && !visited[r][c]) {
        const cluster = [];
        const queue = [[r, c]];
        visited[r][c] = true;
        
        while (queue.length > 0) {
          const [currR, currC] = queue.shift();
          cluster.push([currR, currC]);
          
          const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
          for (const [dr, dc] of dirs) {
            const nr = currR + dr;
            const nc = currC + dc;
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && 
                board[nr][nc] === null && !visited[nr][nc]) {
              visited[nr][nc] = true;
              queue.push([nr, nc]);
            }
          }
        }
        clusters.push(cluster);
      }
    }
  }
  return clusters;
}

function generatePieces() {
  const clusters = findEmptyClusters();
  const fittingShapes = getFittingShapes();
  
  // Eğer hiç sığan şekil yoksa, oyun zaten bitecek — küçük şekilleri dene
  if (fittingShapes.length === 0) {
    currentPieces = [randomPiece(), randomPiece(), randomPiece()];
    return;
  }

  // Her şekil için bir ağırlık hesapla
  const shapeWeights = SHAPES.map(shape => {
    // Sığmayan şekillere 0 ağırlık ver
    if (!fittingShapes.includes(shape)) return 0;

    let weight = 1.0;
    const normalizedShape = normalizeCells(shape.cells);
    const shapeKey = normalizedShape.map(c => c.join(',')).sort().join('|');

    // 1. Hole Match: Şekil bir boşluk kümesiyle tam eşleşiyor mu?
    for (const cluster of clusters) {
      if (cluster.length === shape.cells.length) {
        const normalizedCluster = normalizeCells(cluster);
        const clusterKey = normalizedCluster.map(c => c.join(',')).sort().join('|');
        if (shapeKey === clusterKey) {
          weight += 18.0; // %20 artırılmış tam eşleşme bonusu (15.0 -> 18.0)
        }
      } else if (cluster.length > shape.cells.length && cluster.length <= 9) {
        // Şekil bu boşluğa sığıyor mu? (Küçük boşluklar için %20 artırılmış ihtimal artışı: 1.5 -> 1.8)
        weight += 1.8;
      }
    }

    // 2. Big Shape Logic: Seviye arttıkça büyük parçalara bonus ver (eski mantık korunuyor)
    const minPreferredSize = Math.min(3 + Math.floor(level / 2), 7);
    if (shape.cells.length >= minPreferredSize) {
      const bigChanceBoost = Math.min(0.5 + level * 0.2, 3.0);
      weight += bigChanceBoost;
    }

    // 2x3, 3x2, 3x3 ve Plus bloklarının gelme olasılığını azalt (%80 azaltım)
    if (['2x3', '3x2', '3x3', 'Plus'].includes(shape.name)) {
      weight *= 0.2;
    }

    return weight;
  });

  const pickSmart = () => {
    const totalWeight = shapeWeights.reduce((a, b) => a + b, 0);
    if (totalWeight <= 0) return randomPiece();

    let rand = Math.random() * totalWeight;
    for (let i = 0; i < SHAPES.length; i++) {
      if (shapeWeights[i] > 0) {
        rand -= shapeWeights[i];
        if (rand <= 0) return makePieceFromShape(SHAPES[i]);
      }
    }
    return randomPiece();
  };

  currentPieces = [pickSmart(), pickSmart(), pickSmart()];
}

function renderTray() {
  for (let i = 0; i < 3; i++) {
    const slot = document.getElementById('slot' + i);
    slot.innerHTML = '';
    slot.classList.remove('used');
    slot.dataset.pieceIndex = i;

    // Clean up old listeners to prevent duplicates
    const newSlot = slot.cloneNode(false);
    slot.parentNode.replaceChild(newSlot, slot);
    newSlot.dataset.pieceIndex = i;

    const piece = currentPieces[i];
    if (!piece || piece.used) {
      newSlot.classList.add('used');
      continue;
    }

    const maxR = Math.max(...piece.cells.map(c => c[0])) + 1;
    const maxC = Math.max(...piece.cells.map(c => c[1])) + 1;

    const grid = document.createElement('div');
    grid.className = 'piece-preview';
    grid.style.gridTemplateColumns = `repeat(${maxC}, 18px)`;
    grid.style.gridTemplateRows = `repeat(${maxR}, 18px)`;

    // Create cells
    const set = new Set(piece.cells.map(c => c[0] + ',' + c[1]));
    for (let r = 0; r < maxR; r++) {
      for (let c = 0; c < maxC; c++) {
        const cell = document.createElement('div');
        if (set.has(r + ',' + c)) {
          cell.className = 'piece-cell color-' + piece.color;
        } else {
          cell.style.visibility = 'hidden';
        }
        grid.appendChild(cell);
      }
    }

    newSlot.appendChild(grid);

    // Touch / Mouse events on the WHOLE slot for easier pickup
    newSlot.addEventListener('touchstart', onDragStart, { passive: false });
    newSlot.addEventListener('mousedown', onDragStart);
  }
}

// ---- Placement Logic ----
function canPlace(cells, startR, startC) {
  for (const [dr, dc] of cells) {
    const r = startR + dr;
    const c = startC + dc;
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return false;
    if (board[r][c] !== null) return false;
  }
  return true;
}

function placePiece(piece, startR, startC) {
  for (const [dr, dc] of piece.cells) {
    board[startR + dr][startC + dc] = piece.color;
  }
}

function canPlaceAnywhere(piece) {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (canPlace(piece.cells, r, c)) return true;
    }
  }
  return false;
}

// ---- Clear Lines ----
function checkAndClear() {
  try {
    const rowsToClear = [];
    const colsToClear = [];

    // 1. Detection
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (board[r] && board[r].every(cell => cell !== null)) {
        rowsToClear.push(r);
      }
    }
    for (let c = 0; c < BOARD_SIZE; c++) {
      let isFull = true;
      for (let r = 0; r < BOARD_SIZE; r++) {
        if (!board[r] || board[r][c] === null) {
          isFull = false;
          break;
        }
      }
      if (isFull) colsToClear.push(c);
    }

    const linesCleared = rowsToClear.length + colsToClear.length;
    if (linesCleared === 0) {
      combo = 0;
      if (comboCountEl) comboCountEl.textContent = 'x1';
      if (comboDisplayEl) comboDisplayEl.textContent = '';
      return 0;
    }

    // 2. Identify and NULLIFY immediately
    const cellsToClear = [];
    const processed = new Array(BOARD_SIZE * BOARD_SIZE).fill(false);

    const addCell = (r, c) => {
      const idx = r * BOARD_SIZE + c;
      if (!processed[idx]) {
        cellsToClear.push({ r, c });
        processed[idx] = true;
        board[r][c] = null; // NULLIFY DATA NOW
      }
    };

    rowsToClear.forEach(r => {
      for (let c = 0; c < BOARD_SIZE; c++) addCell(r, c);
    });
    colsToClear.forEach(c => {
      for (let r = 0; r < BOARD_SIZE; r++) addCell(r, c);
    });

    // 3. Feedback (Non-blocking)
    combo++;
    try {
      haptics.impact(combo > 1 ? 'HEAVY' : 'MEDIUM');
      if (linesCleared >= 2) createConfetti();
    } catch (err) {}

    // 4. Visual Animation — Race condition koruması
    clearingInProgress = true;
    cellsToClear.forEach(({ r, c }) => {
      const el = getCellEl(r, c);
      if (el) {
        el.classList.add('explode');
        el.style.willChange = 'transform, opacity';
      }
    });

    if (clearFlashEl) {
      clearFlashEl.classList.remove('flash');
      void clearFlashEl.offsetWidth;
      clearFlashEl.classList.add('flash');
    }

    // 5. Final Sync
    setTimeout(() => {
      cellsToClear.forEach(({ r, c }) => {
        const el = getCellEl(r, c);
        if (el) {
          el.classList.remove('explode');
          el.style.willChange = 'auto';
        }
      });
      clearingInProgress = false;
      renderBoard();
    }, 350);

    // 6. Score
    let points = linesCleared * 10 * BOARD_SIZE;
    if (combo > 1) {
      points = Math.floor(points * (1 + combo * 0.5));
      sfxCombo();
      if (comboDisplayEl) comboDisplayEl.textContent = '🔥 COMBO x' + combo + '!';
    } else {
      sfxClear();
      if (comboDisplayEl) comboDisplayEl.textContent = '';
    }

    if (comboCountEl) comboCountEl.textContent = 'x' + Math.max(1, combo);
    addScore(points);
    showScorePopup(points);

    return linesCleared;
  } catch (globalErr) {
    console.error("Line clearing error:", globalErr);
    renderBoard(); // Fallback to safe state
    return 0;
  }
}

function addScore(pts) {
  score += pts;
  scoreEl.textContent = score;
  scoreEl.classList.remove('bump');
  void scoreEl.offsetWidth;
  scoreEl.classList.add('bump');
  setTimeout(() => scoreEl.classList.remove('bump'), 150);

  // Level — artan eşikler (her seviye daha uzun sürer)
  // Seviye 1: 0, Seviye 2: 500, Seviye 3: 1200, Seviye 4: 2100, Seviye 5: 3200...
  const getLevel = (s) => {
    let lvl = 1;
    let threshold = 500;
    let remaining = s;
    while (remaining >= threshold) {
      remaining -= threshold;
      lvl++;
      threshold = 500 + (lvl - 1) * 400; // Her seviye 400 puan daha fazla gerektirir
    }
    return lvl;
  };
  level = getLevel(score);
  levelEl.textContent = level;

  // Best
  if ((typeof cheatUsedInThisGame === 'undefined' || !cheatUsedInThisGame) && score > bestScore) {
    bestScore = score;
    bestEl.textContent = bestScore;
    localStorage.setItem('cubex_best', bestScore);
    // Update menu score too
    const menuBestDisplay = document.getElementById('menuBestDisplay');
    if (menuBestDisplay) menuBestDisplay.textContent = bestScore;
  }
  
  // Real-time progress bar'ı güncelle
  updateScoreProgress();

  // Real-time Supabase güncellemesi (eğer 1000 puan geçildiyse)
  if (score >= 1000) {
    const pName = localStorage.getItem('cubex_playerName');
    if (pName) {
      submitScore(pName, Math.max(score, bestScore), true); // Arka planda en iyi skoru doğrudan yükle (Hızlı, güvenli ve yarış durumsuz)
    } else {
      const nameOverlay = document.getElementById('nameOverlay');
      if (nameOverlay && !nameOverlay.classList.contains('active')) {
        nameOverlay.classList.add('active');
        const nameOverlaySub = document.querySelector('#nameOverlay .overlay-sub');
        if (nameOverlaySub) nameOverlaySub.textContent = `1000 Puan Barajını Geçtin! Liderlik tablosu için ismini gir.`;
      }
    }
  }
}

function showScorePopup(pts) {
  scorePopupEl.textContent = '+' + pts;
  scorePopupEl.style.color = combo > 1 ? '#eab308' : '#4f8ef7';
  scorePopupEl.style.left = '50%';
  scorePopupEl.style.top = '40%';
  scorePopupEl.className = 'score-popup show';
  setTimeout(() => { scorePopupEl.className = 'score-popup'; }, 1200);
}

// ---- Drag & Drop ----
let ghostEl = null;

function onDragStart(e) {
  // Prevent default early to avoid browser interference (scrolling, etc.)
  if (e.cancelable) e.preventDefault();

  if (dragState) return;
  
  if (e.type === 'touchstart' && e.touches.length > 1) {
    return;
  }

  const slot = e.currentTarget;
  const idx = parseInt(slot.dataset.pieceIndex);
  const piece = currentPieces[idx];
  if (!piece || piece.used) return;

  // Safety: Cleanup any stray ghosts from previous failed drags
  if (ghostEl) {
    ghostEl.remove();
    ghostEl = null;
  }

  initAudio();
  sfxClick();

  // Calculate current board cell size for perfect ghost matching
  const rect = boardEl.getBoundingClientRect();
  const padding = 6;
  const gap = 3;
  const cellSize = (rect.width - padding * 2 - gap * (BOARD_SIZE - 1)) / BOARD_SIZE;

  ghostEl = document.createElement('div');
  ghostEl.className = 'drag-ghost';
  const maxR = Math.max(...piece.cells.map(c => c[0])) + 1;
  const maxC = Math.max(...piece.cells.map(c => c[1])) + 1;
  
  // Use exact board cell size
  ghostEl.style.gridTemplateColumns = `repeat(${maxC}, ${cellSize}px)`;
  ghostEl.style.gridTemplateRows = `repeat(${maxR}, ${cellSize}px)`;
  ghostEl.style.gap = `${gap}px`;

  const set = new Set(piece.cells.map(c => c[0] + ',' + c[1]));
  for (let r = 0; r < maxR; r++) {
    for (let c = 0; c < maxC; c++) {
      const cell = document.createElement('div');
      if (set.has(r + ',' + c)) {
        cell.className = 'piece-cell color-' + piece.color;
        // Match the board cell look
        cell.style.width = cellSize + 'px';
        cell.style.height = cellSize + 'px';
        cell.style.userSelect = 'none';
        cell.style.webkitUserSelect = 'none';
        cell.style.pointerEvents = 'none';
      } else {
        cell.style.visibility = 'hidden';
      }
      ghostEl.appendChild(cell);
    }
  }
  ghostEl.style.userSelect = 'none';
  ghostEl.style.webkitUserSelect = 'none';
  ghostEl.style.touchAction = 'none';
  document.body.appendChild(ghostEl);

  // Position ghost
  const touch = e.touches ? e.touches[0] : e;
  moveGhost(touch.clientX, touch.clientY);

  dragState = { 
    pieceIndex: idx, 
    piece, 
    touchId: e.touches ? e.touches[0].identifier : null 
  };
  slot.classList.add('used');

  // Bind move & end
  if (e.touches) {
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('touchend', onDragEnd);
    document.addEventListener('touchcancel', onDragCancel);
    // Drag sırasında iOS scroll bounce'u engelle (dinamik — sadece drag aktifken)
    document.body.addEventListener('touchmove', preventScrollDuringDrag, { passive: false });
  } else {
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
  }
}

function moveGhost(x, y) {
  if (!ghostEl) return;
  const offsetY = 100;
  ghostEl.style.left = x + 'px';
  ghostEl.style.top = (y - offsetY) + 'px';
}

let lastDragTime = 0;
function onDragMove(e) {
  e.preventDefault();
  if (!dragState) return;
  
  const now = Date.now();
  if (now - lastDragTime < 16) return; // ~60fps ile sınırla (Throttling)
  lastDragTime = now;

  const touch = e.touches ? Array.from(e.touches).find(t => t.identifier === dragState.touchId) : e;
  if (!touch) return;

  moveGhost(touch.clientX, touch.clientY);
  
  // RequestAnimationFrame kullanarak render'ı senkronize et
  if (dragRafId) cancelAnimationFrame(dragRafId);
  dragRafId = requestAnimationFrame(() => {
    highlightBoard(touch.clientX, touch.clientY);
  });
}

function onDragEnd(e) {
  if (!dragState) return;
  const touch = e.changedTouches ? Array.from(e.changedTouches).find(t => t.identifier === dragState.touchId) : e;
  if (!touch) return;

  const target = getBoardPosition(touch.clientX, touch.clientY);
  
  clearHighlights();

  if (target && !clearingInProgress && canPlace(dragState.piece.cells, target.row, target.col)) {
    // Place piece (clearingInProgress kontrolü race condition'ı önler)
    placePiece(dragState.piece, target.row, target.col);
    currentPieces[dragState.pieceIndex].used = true;
    sfxPlace();
    haptics.impact('LIGHT');

    // Add small points for placing
    addScore(dragState.piece.cells.length);

    renderBoard();
    checkAndClear();

    // Check if all 3 used → new set
    if (currentPieces.every(p => p.used)) {
      setTimeout(() => {
        generatePieces();
        renderTray();
        saveGameState(); // Yeni parçalar oluşturulduktan sonra kaydet
      }, 300);
    } else {
      renderTray();
      saveGameState(); // Her parça yerleştirmede kaydet
    }

    // Check game over
    setTimeout(() => checkGameOver(), 600);

  } else {
    // Return piece
    currentPieces[dragState.pieceIndex].used = false;
    renderTray();
  }

  cleanupDrag();
}

function onDragCancel() {
  if (!dragState) return;
  currentPieces[dragState.pieceIndex].used = false;
  renderTray();
  clearHighlights();
  cleanupDrag();
}

function cleanupDrag() {
  if (ghostEl) {
    ghostEl.remove();
    ghostEl = null;
  }
  if (dragRafId) {
    cancelAnimationFrame(dragRafId);
    dragRafId = null;
  }
  dragState = null;
  document.removeEventListener('touchmove', onDragMove);
  document.removeEventListener('touchend', onDragEnd);
  document.removeEventListener('touchcancel', onDragCancel);
  document.body.removeEventListener('touchmove', preventScrollDuringDrag);
  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', onDragEnd);
}

function getBoardPosition(clientX, clientY) {
  if (!dragState) return null;
  
  const rect = boardEl.getBoundingClientRect();
  const padding = 6;
  const gap = 3;
  const cellSize = (rect.width - padding * 2 - gap * (BOARD_SIZE - 1)) / BOARD_SIZE;

  const offsetY = 100; 
  
  // The logic point is the CENTER of the piece
  const centerX = clientX;
  const centerY = clientY - offsetY;

  // Calculate the piece's dimensions to find the top-left cell's position
  const maxR = Math.max(...dragState.piece.cells.map(c => c[0])) + 1;
  const maxC = Math.max(...dragState.piece.cells.map(c => c[1])) + 1;
  const pieceW = maxC * cellSize + (maxC - 1) * gap;
  const pieceH = maxR * cellSize + (maxR - 1) * gap;

  // Top-left of the piece relative to the board
  const topLeftX = centerX - pieceW / 2 - rect.left - padding;
  const topLeftY = centerY - pieceH / 2 - rect.top - padding;

  // Find the closest grid row/col
  const col = Math.round(topLeftX / (cellSize + gap));
  const row = Math.round(topLeftY / (cellSize + gap));

  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null;
  return { row, col };
}

function highlightBoard(clientX, clientY) {
  clearHighlights();
  if (!dragState) return;

  const target = getBoardPosition(clientX, clientY);
  if (!target) return;

  const valid = canPlace(dragState.piece.cells, target.row, target.col);

  for (const [dr, dc] of dragState.piece.cells) {
    const r = target.row + dr;
    const c = target.col + dc;
    if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
      const el = getCellEl(r, c);
      if (el) {
        el.classList.add(valid ? 'highlight-valid' : 'highlight-invalid');
        highlightedCells.add(el);
      }
    }
  }

  // Geçerli yerleşimse, kırılacak satır/sütunları vurgula
  if (valid) {
    highlightLinesToClear(dragState.piece, target.row, target.col);
  }
}

// Parça yerleştirildiğinde kırılacak satır/sütunları tespit et ve vurgula
function highlightLinesToClear(piece, startR, startC) {
  // Tahtanın geçici kopyasını oluştur
  const tempBoard = board.map(row => [...row]);
  for (const [dr, dc] of piece.cells) {
    tempBoard[startR + dr][startC + dc] = piece.color;
  }

  // Kırılacak satırları bul
  for (let r = 0; r < BOARD_SIZE; r++) {
    if (tempBoard[r].every(c => c !== null)) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const el = getCellEl(r, c);
        if (el) {
          el.classList.add('almost-ready');
          highlightedCells.add(el);
        }
      }
    }
  }

  // Kırılacak sütunları bul
  for (let c = 0; c < BOARD_SIZE; c++) {
    let full = true;
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (tempBoard[r][c] === null) { full = false; break; }
    }
    if (full) {
      for (let r = 0; r < BOARD_SIZE; r++) {
        const el = getCellEl(r, c);
        if (el) {
          el.classList.add('almost-ready');
          highlightedCells.add(el);
        }
      }
    }
  }
}

function clearHighlights() {
  highlightedCells.forEach(el => {
    el.classList.remove('highlight-valid', 'highlight-invalid', 'almost-ready');
  });
  highlightedCells.clear();
}

// ---- Game Over ----
function checkGameOver() {
  const remaining = currentPieces.filter(p => !p.used);
  if (remaining.length === 0) return;

  const canAnyPlace = remaining.some(p => canPlaceAnywhere(p));
  if (!canAnyPlace) {
    gameOver();
  }
}

function gameOver() {
  sfxGameOver();
  finalScoreEl.textContent = score;
  finalBestEl.textContent = bestScore;
  finalLevelEl.textContent = level;
  
  const subEl = gameOverOverlay.querySelector('.overlay-sub');
  if (typeof cheatUsedInThisGame !== 'undefined' && cheatUsedInThisGame) {
    if (subEl) subEl.textContent = "Hile kullanıldı, puan kaydedilmedi";
    gameOverOverlay.classList.add('active');
    clearGameState(); // Oyun bitti, kaydı temizle
  } else {
    if (subEl) subEl.textContent = "Yerleştirecek yer kalmadı";
    clearGameState();
    
    gameOverOverlay.classList.add('active');
  }
}

// ---- New Game ----
function newGame() {
  if (typeof cheatUsedInThisGame !== 'undefined') cheatUsedInThisGame = false;
  if (typeof cheatMode !== 'undefined') cheatMode = false;
  const cheatIcon = document.getElementById('cheatActiveIcon');
  if (cheatIcon) cheatIcon.style.display = 'none';

  score = 0;
  level = 1;
  combo = 0;
  hasSubmittedThisGame = false; // Yeni oyunda sıfırla
  scoreEl.textContent = '0';
  levelEl.textContent = '1';
  comboCountEl.textContent = 'x1';
  comboDisplayEl.textContent = '';
  bestScore = parseInt(localStorage.getItem('cubex_best') || '0');
  bestEl.textContent = bestScore;
  gameOverOverlay.classList.remove('active');
  helpOverlay.classList.remove('active');
  createBoard();
  renderBoard();
  generatePieces();
  renderTray();
  gameActive = true;
  updateScoreProgress();

  saveGameState();
}

// ---- Save / Load Game State ----
function saveGameState() {
  try {
    const state = {
      board: board,
      score: score,
      level: level,
      combo: combo,
      currentPieces: currentPieces.map(p => ({
        cells: p.cells,
        color: p.color,
        used: p.used,
        name: p.name
      })),
      gameActive: gameActive
    };
    localStorage.setItem('cubex_gameState', JSON.stringify(state));
  } catch (e) {
    console.error('Game state save error:', e);
  }
}

function loadGameState() {
  try {
    const saved = localStorage.getItem('cubex_gameState');
    if (!saved) return false;
    
    const state = JSON.parse(saved);
    if (!state || !state.board || !state.currentPieces || !state.gameActive) return false;
    
    // Validate board
    if (state.board.length !== BOARD_SIZE) return false;
    
    board = state.board;
    score = state.score || 0;
    level = state.level || 1;
    combo = state.combo || 0;
    currentPieces = state.currentPieces || [];
    gameActive = true;
    hasSubmittedThisGame = score >= 1000; // Yüklenen skora göre ata
    
    // Update UI
    scoreEl.textContent = score;
    levelEl.textContent = level;
    comboCountEl.textContent = 'x' + Math.max(1, combo);
    comboDisplayEl.textContent = '';
    bestScore = parseInt(localStorage.getItem('cubex_best') || '0');
    bestEl.textContent = bestScore;
    
    createBoard();
    // Restore board data after createBoard (which resets the array)
    board = state.board;
    renderBoard();
    renderTray();
    updateScoreProgress();
    
    return true;
  } catch (e) {
    console.error('Game state load error:', e);
    return false;
  }
}

function clearGameState() {
  localStorage.removeItem('cubex_gameState');
  gameActive = false;
}

// ---- Button Events ----
soundBtn.addEventListener('click', () => {
  initAudio();
  soundOn = !soundOn;
  soundBtn.innerHTML = soundOn ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
  sfxClick();
});

helpBtn.addEventListener('click', () => {
  sfxClick();
  helpOverlay.classList.add('active');
});

closeHelpBtn.addEventListener('click', () => {
  sfxClick();
  helpOverlay.classList.remove('active');
});

restartBtn.addEventListener('click', () => {
  sfxClick();
  if (score > 10) {
    showConfirm('Oyunu yeniden başlatmak istiyor musun?', () => {
      newGame();
    });
  } else {
    newGame();
  }
});

const homeBtn = document.getElementById('homeBtn');
if (homeBtn) {
  homeBtn.addEventListener('click', () => {
    sfxClick();
    // Oyun durumunu kaydet (sıfırlanmasın)
    if (gameActive) {
      saveGameState();
    }
    updateMenuButtons(); // Menü butonlarını güncelle
    document.getElementById('mainMenuOverlay').classList.add('active');
  });
}

playAgainBtn.addEventListener('click', () => {
  sfxClick();
  newGame();
});

const backToMenuBtn = document.getElementById('backToMenuBtn');
if (backToMenuBtn) {
  backToMenuBtn.addEventListener('click', () => {
    sfxClick();
    clearGameState(); // Oyun bitti, kaydı temizle
    gameOverOverlay.classList.remove('active');
    updateMenuButtons();
    document.getElementById('mainMenuOverlay').classList.add('active');
  });
}

// iOS scroll bounce engelleyici — sadece drag sırasında aktif (performans optimizasyonu)
function preventScrollDuringDrag(e) {
  if (dragState) e.preventDefault();
}

// ---- Window resize ----
window.addEventListener('resize', () => {
  renderBoard();
});

// ---- Custom Confirm Dialog ----
function showConfirm(message, onYes, onNo, yesText = "Evet", noText = "Hayır") {
  const overlay = document.getElementById('confirmOverlay');
  const msgEl = document.getElementById('confirmMessage');
  const yesBtn = document.getElementById('confirmYes');
  const noBtn = document.getElementById('confirmNo');
  
  if (!overlay || !yesBtn || !noBtn) {
    // Fallback: direkt çalıştır
    if (onYes) onYes();
    return;
  }
  
  if (msgEl) msgEl.textContent = message;
  yesBtn.innerHTML = `<i class="fas fa-check"></i> ${yesText}`;
  noBtn.innerHTML = `<i class="fas fa-times"></i> ${noText}`;
  overlay.classList.add('active');
  
  // Eski listener'ları temizle
  yesBtn.onclick = () => {
    overlay.classList.remove('active');
    if (onYes) onYes();
  };
  noBtn.onclick = () => {
    overlay.classList.remove('active');
    if (onNo) onNo();
  };
}



// ---- Menu Button Helpers ----
function updateMenuButtons() {
  const startBtn = document.getElementById('startBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  
  if (gameActive) {
    // Aktif oyun var: her iki butonu da göster
    if (resumeBtn) resumeBtn.style.display = '';
    if (startBtn) startBtn.style.display = '';
  } else {
    // Aktif oyun yok: sadece "Yeni Oyun" göster
    if (resumeBtn) resumeBtn.style.display = 'none';
    if (startBtn) startBtn.style.display = '';
  }
  
  // Best score güncelle
  const menuBestDisplay = document.getElementById('menuBestDisplay');
  if (menuBestDisplay) menuBestDisplay.textContent = bestScore;
}

// ---- Init ----
function renderVersionDisplay() {
  let vEl = document.getElementById('versionDisplay');
  if (!vEl) {
    vEl = document.createElement('div');
    vEl.id = 'versionDisplay';
    vEl.style.position = 'fixed';
    vEl.style.bottom = '8px';
    vEl.style.right = '8px';
    vEl.style.color = 'rgba(255, 255, 255, 0.4)';
    vEl.style.fontSize = '12px';
    vEl.style.fontFamily = "'Inter', sans-serif";
    vEl.style.pointerEvents = 'none';
    vEl.style.zIndex = '99999';
    document.body.appendChild(vEl);
  }
  vEl.textContent = "v" + APP_VERSION;
}

async function checkMaintenance() {
  try {
    const res = await fetch(`update.json?t=${Date.now()}`); // Bypass SW cache using timestamp
    if (res.ok) {
      const data = await res.json();
      if (data && data.maintenance === true) {
        maintenanceActiveAtStart = true;
        const overlay = document.getElementById('maintenanceOverlay');
        const msgText = document.getElementById('maintenanceMessageText');
        const timeText = document.getElementById('maintenanceEndTimeText');
        
        if (msgText && data.maintenanceMessage) {
          msgText.textContent = data.maintenanceMessage;
        }
        if (timeText && data.maintenanceEndTime) {
          timeText.textContent = data.maintenanceEndTime;
        }
        if (overlay) {
          overlay.classList.add('active');
        }
        return true;
      }
    }
  } catch (err) {
    console.error("Bakım kontrolü hatası:", err);
  }
  return false;
}

async function initApp() {
  await checkMaintenance();
  renderVersionDisplay();

  createParticles();
  
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const mainMenuOverlay = document.getElementById('mainMenuOverlay');
  const startBtn = document.getElementById('startBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const menuBestDisplay = document.getElementById('menuBestDisplay');

  // Load best score for menu
  bestScore = parseInt(localStorage.getItem('cubex_best') || '0');
  if (menuBestDisplay) menuBestDisplay.textContent = bestScore;

  // Kaydedilmiş oyun var mı kontrol et
  const hasSavedGame = !!localStorage.getItem('cubex_gameState');
  if (hasSavedGame) {
    try {
      const saved = JSON.parse(localStorage.getItem('cubex_gameState'));
      if (saved && saved.gameActive) gameActive = true;
    } catch(e) {}
  }
  
  updateMenuButtons();

  // "Yeni Oyun" butonu — aktif oyun varsa onay sor
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      initAudio();
      sfxClick();
      if (gameActive) {
        showConfirm('Mevcut oyun silinecek. Yeni oyun başlatmak istiyor musun?', () => {
          mainMenuOverlay.classList.remove('active');
          newGame();
        });
      } else {
        mainMenuOverlay.classList.remove('active');
        newGame();
      }
    });
  }

  // "Devam Et" butonu — kaydedilmiş oyunu yükler
  if (resumeBtn) {
    resumeBtn.addEventListener('click', () => {
      initAudio();
      sfxClick();
      mainMenuOverlay.classList.remove('active');
      const loaded = loadGameState();
      if (!loaded) {
        // Kayıt bozuksa yeni oyun başlat
        newGame();
      }
    });
  }



  // Liderlik tablosu puan ilerlemesini ilk defa güncelle
  updateScoreProgress();

  // Oyuna girince isim kontrolü yap
  const localName = localStorage.getItem('cubex_playerName');
  const nameOverlay = document.getElementById('nameOverlay');
  if (!localName) {
    if (nameOverlay) nameOverlay.classList.add('active');
  } else {
    checkNameCensorship();
  }

  // Her 20 saniyede bir sansür/silinme durumunu arka planda kontrol et (Yarış durumlarını tamamen önler)
  setInterval(() => {
    if (gameActive && score >= 1000) {
      checkNameCensorship();
    }
  }, 20000);

  initIOSInstallPrompt();
}

function initIOSInstallPrompt() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
  const prompt = document.getElementById('iosInstallPrompt');
  const closeBtn = document.getElementById('closePrompt');

  if (!prompt || !closeBtn) return; // Null güvenlik kontrolü

  if (isIOS && !isStandalone) {
    // Show prompt after 3 seconds
    setTimeout(() => {
      prompt.classList.add('show');
    }, 3000);
  }

  closeBtn.addEventListener('click', () => {
    prompt.classList.remove('show');
    // Session bazlı gizle (sayfa yenilenene kadar)
    prompt.style.display = 'none';
  });
}

initApp();

// ---- Offline to Online Score Sync ----
function syncPendingScore() {
  if (!navigator.onLine) return;
  const best = parseInt(localStorage.getItem('cubex_best') || '0');
  const lastSub = parseInt(localStorage.getItem('cubex_lastSubmitted') || '0');
  const pName = localStorage.getItem('cubex_playerName');
  
  // Eğer oyuncunun bir ismi varsa ve son kaydedilen skordan daha yüksek bir yerel "best" skoru varsa yolla
  if (best > 0 && best > lastSub && pName) {
    console.log("Çevrimdışı yapılan rekor çevrimiçi olundu, eşitleniyor:", best);
    submitScore(pName, best);
  }
}

window.addEventListener('online', syncPendingScore);
// Uygulama açılışında da bir kez kontrol et
setTimeout(syncPendingScore, 2000);

// ---- Confetti Effect ----
function createConfetti() {
  const container = document.body;
  const colors = ['#4f8ef7', '#a855f7', '#ec4899', '#06b6d4', '#22c55e', '#eab308'];
  
  // Mobile optimization: fewer particles
  const isMobile = window.innerWidth < 600;
  const particleCount = isMobile ? 25 : 45;
  
  for (let i = 0; i < particleCount; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    
    const size = Math.random() * 7 + 3;
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    confetti.style.width = size + 'px';
    confetti.style.height = size + 'px';
    confetti.style.backgroundColor = color;
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.top = '-20px';
    confetti.style.borderRadius = i % 2 === 0 ? '50%' : '2px';
    confetti.style.position = 'fixed';
    confetti.style.zIndex = '2000';
    confetti.style.pointerEvents = 'none';
    confetti.style.willChange = 'transform, opacity';
    
    const duration = Math.random() * 1.5 + 1.2;
    const drift = (Math.random() - 0.5) * 150;
    
    if (confetti.animate) {
      confetti.animate([
        { transform: 'translate3d(0, 0, 0) rotate(0deg)', opacity: 1 },
        { transform: `translate3d(${drift}px, 100vh, 0) rotate(${Math.random() * 360}deg)`, opacity: 0 }
      ], {
        duration: duration * 1000,
        easing: 'ease-out',
        fill: 'forwards'
      });
    }
    
    container.appendChild(confetti);
    setTimeout(() => {
      if (confetti.parentNode) confetti.remove();
    }, duration * 1000 + 100);
  }
}

// ---- Leaderboard Logic ----
const showLeaderboardBtn = document.getElementById('showLeaderboardBtn');
const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
const leaderboardOverlay = document.getElementById('leaderboardOverlay');
const leaderboardList = document.getElementById('leaderboardList');

if (showLeaderboardBtn) {
  showLeaderboardBtn.addEventListener('click', () => {
    sfxClick();
    if (leaderboardOverlay) leaderboardOverlay.classList.add('active');
    loadLeaderboard();
  });
}

if (closeLeaderboardBtn) {
  closeLeaderboardBtn.addEventListener('click', () => {
    sfxClick();
    if (leaderboardOverlay) leaderboardOverlay.classList.remove('active');
  });
}

const SUPABASE_URL = "https://wrdlbqhlszqskhbignot.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyZGxicWhsc3pxc2toYmlnbm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMjkxMzEsImV4cCI6MjA5NDYwNTEzMX0.WcTwqQVH3hkHyIpNwwXxY9oKcdcF0eW6fcChvSAZKq4";

// ---- Name Overlay Logic ----
const saveNameBtn = document.getElementById('saveNameBtn');
const playerNameInput = document.getElementById('playerNameInput');
const nameOverlay = document.getElementById('nameOverlay');

if (saveNameBtn && playerNameInput) {
  saveNameBtn.addEventListener('click', () => {
    sfxClick();
    const pName = playerNameInput.value.trim().substring(0, 12);
    if (pName.length > 0) {
      if (/^Oyuncu\d+$/.test(pName)) {
        alert("Seçeceğiniz isim 'Oyuncu[Sayı]' formatında olamaz.");
        return;
      }
      
      showConfirm(
        "Lütfen kullanıcı adınızda argo, küfür, aşağılayıcı ve ahlaka uygun olmayan diğer sözcükleri kullanmayın. Aksi takdirde hesabınız yasaklanabilir.",
        () => {
          localStorage.setItem('cubex_playerName', pName);
          nameOverlay.classList.remove('active');
          
          // Real-time live submission (en iyi skoru gönder)
          const finalSub = Math.max(score, bestScore);
          if (finalSub >= 1000) {
            submitScore(pName, finalSub, true);
          }
          
          checkNameCensorship();
        },
        null,
        "Onayla",
        "İptal"
      );
    } else {
      alert("Lütfen geçerli bir isim girin.");
    }
  });
}

// Header Trophy / Leaderboard Button Logic
const headerLeaderboardBtn = document.getElementById('headerLeaderboardBtn');
if (headerLeaderboardBtn) {
  headerLeaderboardBtn.addEventListener('click', () => {
    sfxClick();
    if (gameActive) {
      saveGameState();
    }
    if (leaderboardOverlay) leaderboardOverlay.classList.add('active');
    loadLeaderboard();
  });
}

// ---- Censor Name & Progress Logic ----
const censorKeepBtn = document.getElementById('censorKeepBtn');
const censorSaveBtn = document.getElementById('censorSaveBtn');
const newPlayerNameInput = document.getElementById('newPlayerNameInput');

if (censorKeepBtn) {
  censorKeepBtn.addEventListener('click', () => {
    sfxClick();
    document.getElementById('censorRenameOverlay').classList.remove('active');
    clearCensorNoteRow(); // Sansür notu satırını temizle
  });
}

if (censorSaveBtn && newPlayerNameInput) {
  censorSaveBtn.addEventListener('click', () => {
    sfxClick();
    const oldName = document.getElementById('censoredOldName').textContent;
    const newName = newPlayerNameInput.value.trim().substring(0, 12);
    censorRenameScore(oldName, newName);
  });
}

function censorRenameScore(oldName, newName) {
  const censorSaveBtn = document.getElementById('censorSaveBtn');
  if (!newName) {
    alert("Lütfen geçerli bir yeni isim girin.");
    return Promise.resolve(false);
  }
  
  if (/^Oyuncu\d+$/.test(newName)) {
    alert("Seçeceğiniz yeni isim 'Oyuncu[Sayı]' formatında olamaz.");
    return Promise.resolve(false);
  }
  
  if (censorSaveBtn) censorSaveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Güncelleniyor...';
  
  return fetch(`${SUPABASE_URL}/rest/v1/scores?name=eq.${encodeURIComponent(oldName)}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: newName })
  })
  .then(res => {
    if (res.ok) {
      localStorage.setItem('cubex_playerName', newName);
      document.getElementById('censorRenameOverlay').classList.remove('active');
      alert(`İsminiz başarıyla "${newName}" olarak güncellendi!`);
      clearCensorNoteRow(); // Sansür notu satırını temizle
      loadLeaderboard();
      return true;
    } else {
      alert("İsim değiştirilemedi (Bu isim başkası tarafından kullanılıyor olabilir).");
      return false;
    }
  })
  .catch(err => {
    console.error(err);
    alert("Ağ hatası oluştu.");
    return false;
  })
  .then(success => {
    if (censorSaveBtn) censorSaveBtn.innerHTML = '<i class="fas fa-check"></i> Değiştir';
    return success;
  });
}

function checkAndShowCensorNote(censoredName) {
  return fetch(`${SUPABASE_URL}/rest/v1/scores?name=like.censored:${encodeURIComponent(censoredName)}:%25&select=name`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  })
  .then(censorNoteRes => {
    if (censorNoteRes.ok) {
      return censorNoteRes.json().then(data => {
        if (data && data.length > 0) {
          const fullCensoredName = data[0].name;
          const parts = fullCensoredName.split(':');
          const note = parts.slice(2).join(':') || "";
          
          const noteTextEl = document.getElementById('censorNoteText');
          if (noteTextEl && note) {
            noteTextEl.textContent = `Kurucu Notu: "${note}"`;
            noteTextEl.style.display = 'block';
            // Not satırının adını elemente geçici olarak kaydedelim ki daha sonra silebilelim
            noteTextEl.dataset.fullNoteName = fullCensoredName;
          }
        }
      });
    }
  })
  .catch(err => {
    console.error("Error fetching censor note:", err);
  });
}

function clearCensorNoteRow() {
  const noteTextEl = document.getElementById('censorNoteText');
  if (noteTextEl && noteTextEl.dataset.fullNoteName) {
    const fullNoteName = noteTextEl.dataset.fullNoteName;
    return fetch(`${SUPABASE_URL}/rest/v1/scores?name=eq.${encodeURIComponent(fullNoteName)}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    })
    .then(() => {
      noteTextEl.dataset.fullNoteName = '';
      noteTextEl.style.display = 'none';
      noteTextEl.textContent = '';
    })
    .catch(e => {
      console.error("Error deleting censor note row:", e);
    });
  }
  return Promise.resolve();
}

function checkNameCensorship() {
  const localName = localStorage.getItem('cubex_playerName');
  
  if (!localName) return;
  
  if (/^Oyuncu\d+$/.test(localName)) {
    checkAndShowCensorNote(localName).then(() => {
      showCensorPrompt(localName);
    });
    return;
  }
  
  fetch(`${SUPABASE_URL}/rest/v1/scores?name=like.banned:${encodeURIComponent(localName)}:%25&select=name`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  })
  .then(banRes => {
    if (banRes.ok) {
      return banRes.json().then(banData => {
        if (banData && banData.length > 0) {
          const banKey = banData[0].name;
          const parts = banKey.split(':');
          const expireVal = parts[2];
          
          let activeBan = false;
          let banMessage = "";
          
          if (expireVal === 'forever') {
            activeBan = true;
            banMessage = "Kullanıcı adınız kurucu tarafından kalıcı olarak engellenmiştir! Liderlik tablosuna skor gönderemezsiniz.";
          } else {
            const expireTime = parseInt(expireVal || '0');
            if (Date.now() < expireTime) {
              activeBan = true;
              const remainingDate = new Date(expireTime);
              banMessage = `Kullanıcı adınız kurucu tarafından engellenmiştir!\nEngelleme Bitiş Süresi: ${remainingDate.toLocaleString('tr-TR')}`;
            } else {
              // Ban süresi dolmuş, veritabanındaki ban satırını silelim
              fetch(`${SUPABASE_URL}/rest/v1/scores?name=eq.${encodeURIComponent(banKey)}`, {
                method: 'DELETE',
                headers: {
                  'apikey': SUPABASE_KEY,
                  'Authorization': `Bearer ${SUPABASE_KEY}`
                }
              }).catch(e => console.error(e));
            }
          }
          
          if (activeBan) {
            alert(banMessage);
            localStorage.removeItem('cubex_playerName');
            localStorage.removeItem('cubex_lastSubmitted');
            newGame();
            return false;
          }
        }
        return true;
      });
    }
    return true;
  })
  .then(shouldContinue => {
    if (!shouldContinue) return;
    
    // Kurucu tarafından silinme notu bırakılmış mı kontrol et (Oyun başında veya oyun içinde)
    return fetch(`${SUPABASE_URL}/rest/v1/scores?name=like.deleted:${encodeURIComponent(localName)}:%25&select=name`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    })
    .then(delNoteRes => {
      if (delNoteRes.ok) {
        return delNoteRes.json().then(delNoteData => {
          if (delNoteData && delNoteData.length > 0) {
            const fullDeletedName = delNoteData[0].name;
            const parts = fullDeletedName.split(':');
            const note = parts.slice(2).join(':') || "Silinme notu bırakılmamış.";
            
            alert(`Skorunuz kurucu tarafından silindi!\nNot: ${note}\n\nOyununuz sıfırlanıyor...`);
            
            // Silinme notu satırını veritabanından temizle
            fetch(`${SUPABASE_URL}/rest/v1/scores?name=eq.${encodeURIComponent(fullDeletedName)}`, {
              method: 'DELETE',
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
              }
            })
            .then(() => {
              // Yerel ismi ve skoru temizle, oyunu sıfırla
              localStorage.removeItem('cubex_playerName');
              localStorage.removeItem('cubex_lastSubmitted');
              newGame();
            })
            .catch(e => console.error(e));
            
            return false;
          }
          return true;
        });
      }
      return true;
    });
  })
  .then(shouldContinue => {
    if (!shouldContinue) return;
    
    // Oyun esnasında aktif skor gönderildikten sonra tablodan silinme kontrolü
    if (score >= 1000 && hasSubmittedThisGame) {
      return fetch(`${SUPABASE_URL}/rest/v1/scores?name=eq.${encodeURIComponent(localName)}&select=score`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      })
      .then(res => {
        if (res.ok) {
          return res.json().then(data => {
            if (data.length === 0) {
              // Kurucu ismini Oyuncu[Sayı] şeklinde mi değiştirdi?
              return fetch(`${SUPABASE_URL}/rest/v1/scores?score=eq.${score}&name=like.Oyuncu%25&select=name`, {
                headers: {
                  'apikey': SUPABASE_KEY,
                  'Authorization': `Bearer ${SUPABASE_KEY}`
                }
              })
              .then(censorRes => {
                if (censorRes.ok) {
                  return censorRes.json().then(censorData => {
                    if (censorData && censorData.length > 0) {
                      const newName = censorData[0].name;
                      localStorage.setItem('cubex_playerName', newName);
                      checkAndShowCensorNote(newName).then(() => {
                        showCensorPrompt(newName);
                      });
                      return false;
                    }
                    return true;
                  });
                }
                return true;
              })
              .then(censorContinue => {
                if (!censorContinue) return;
                // Silinme notu bulunamadıysa ama satır silindiyse varsayılan uyarıyı göster
                alert("Skorunuz kurucu tarafından silindi! Oyununuz sıfırlanıyor...");
                localStorage.removeItem('cubex_playerName');
                localStorage.removeItem('cubex_lastSubmitted');
                newGame();
              });
            }
          });
        }
      });
    }
  })
  .catch(err => {
    console.error("Censorship/Deletion check error:", err);
  });
}

function showCensorPrompt(censoredName) {
  const overlay = document.getElementById('censorRenameOverlay');
  const oldNameText = document.getElementById('censoredOldName');
  if (overlay && oldNameText) {
    oldNameText.textContent = censoredName;
    overlay.classList.add('active');
  }
}

function updateScoreProgress() {
  const progressContainer = document.getElementById('scoreProgressContainer');
  const progressLabel = document.getElementById('progressLabel');
  const progressValue = document.getElementById('progressValue');
  const progressBarFill = document.getElementById('progressBarFill');
  
  if (!progressContainer || !progressLabel || !progressValue || !progressBarFill) return;
  
  const currentScore = score;
  const currentBest = bestScore || 0;
  
  if (currentScore < 1000) {
    progressLabel.textContent = "Liderlik Tablosu Barajı";
    progressValue.textContent = `${currentScore} / 1000`;
    const pct = Math.min(100, (currentScore / 1000) * 100);
    progressBarFill.style.width = `${pct}%`;
  } else {
    let target = Math.max(currentBest, 1000);
    if (currentScore >= target) {
      target = Math.ceil((currentScore + 1) / 1000) * 1000;
      progressLabel.textContent = "Yeni Rekor Yolunda";
    } else {
      progressLabel.textContent = "Kişisel Rekor Hedefi";
    }
    
    progressValue.textContent = `${currentScore} / ${target}`;
    const pct = Math.min(100, (currentScore / target) * 100);
    progressBarFill.style.width = `${pct}%`;
  }
}

function updateStickySelfRankVisibility() {
  const container = document.getElementById('leaderboardList');
  const stickySelfRank = document.getElementById('stickySelfRank');
  if (!container || !stickySelfRank) return;
  
  if (!window.selfRank) {
    stickySelfRank.style.display = 'none';
    return;
  }
  
  const selfElement = document.getElementById('selfLeaderboardItem');
  if (selfElement) {
    const containerRect = container.getBoundingClientRect();
    const elemRect = selfElement.getBoundingClientRect();
    
    const isVisible = (elemRect.top >= containerRect.top) && (elemRect.bottom <= containerRect.bottom);
    if (isVisible) {
      stickySelfRank.style.display = 'none';
    } else {
      stickySelfRank.style.display = 'block';
    }
  } else {
    stickySelfRank.style.display = 'block';
  }
}

function submitScore(pName, finalScore, silent = false) {
  // Engelli (Ban) kontrolü - Çift Katman Güvenlik (Fail-Safe)
  return fetch(`${SUPABASE_URL}/rest/v1/scores?name=like.banned:${encodeURIComponent(pName)}:%25&select=name`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  })
  .then(banRes => {
    if (banRes.ok) {
      return banRes.json().then(banData => {
        if (banData && banData.length > 0) {
          const banKey = banData[0].name;
          const parts = banKey.split(':');
          const expireVal = parts[2];
          
          let activeBan = false;
          let banMessage = "";
          
          if (expireVal === 'forever') {
            activeBan = true;
            banMessage = "Liderlik tablosuna girişiniz kurucu tarafından kalıcı olarak engellenmiştir!";
          } else {
            const expireTime = parseInt(expireVal || '0');
            if (Date.now() < expireTime) {
              activeBan = true;
              const remainingDate = new Date(expireTime);
              banMessage = `Liderlik tablosuna girişiniz kurucu tarafından engellenmiştir!\nBan Bitiş Süresi: ${remainingDate.toLocaleString('tr-TR')}`;
            } else {
              // Ban süresi dolmuş, veritabanındaki ban satırını silelim
              fetch(`${SUPABASE_URL}/rest/v1/scores?name=eq.${encodeURIComponent(banKey)}`, {
                method: 'DELETE',
                headers: {
                  'apikey': SUPABASE_KEY,
                  'Authorization': `Bearer ${SUPABASE_KEY}`
                }
              }).catch(e => console.error(e));
            }
          }
          
          if (activeBan) {
            if (!silent) alert(banMessage);
            localStorage.removeItem('cubex_playerName');
            localStorage.removeItem('cubex_lastSubmitted');
            newGame();
            return false;
          }
        }
        return true;
      });
    }
    return true;
  })
  .then(shouldContinue => {
    if (!shouldContinue) return false;
    
    // Eğer yeni skor, veritabanındaki mevcut skorundan küçük veya eşitse, yüksek skoru ezip düşürmemek için yüklemeyi atla
    return fetch(`${SUPABASE_URL}/rest/v1/scores?name=eq.${encodeURIComponent(pName)}&select=score`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    })
    .then(currentRes => {
      if (currentRes.ok) {
        return currentRes.json().then(currentData => {
          if (currentData && currentData.length > 0) {
            const existingScore = currentData[0].score;
            if (finalScore <= existingScore) {
              console.log(`Yeni skor (${finalScore}) mevcut yüksek skordan (${existingScore}) küçük veya eşit olduğu için yükleme atlandı.`);
              hasSubmittedThisGame = true; // Zaten veritabanında daha iyi bir skoru var, işaretle
              return true;
            }
          }
          return performPost();
        });
      }
      return performPost();
    })
    .catch(e => {
      console.warn("Mevcut en yüksek skor denetlenirken geçici bir hata oluştu:", e);
      return performPost();
    });
  })
  .catch(e => {
    console.error("Skor yüklenemedi", e);
    if (!silent) alert("Bağlantı hatası: " + e.message);
    return false;
  });

  function performPost() {
    return fetch(`${SUPABASE_URL}/rest/v1/scores?on_conflict=name`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({ name: pName, score: finalScore })
    })
    .then(res => {
      if (res.ok) {
        localStorage.setItem('cubex_lastSubmitted', finalScore);
        console.log("Skor Supabase'e başarıyla kaydedildi.");
        hasSubmittedThisGame = true; // Yükleme başarılı, işaretle
        return true;
      } else {
        return res.text().then(errText => {
          console.error("Supabase Hatası:", errText);
          if (!silent) alert("Veritabanı Hatası: " + errText);
          return false;
        });
      }
    });
  }
}

function deleteActiveScore(pName) {
  if (!pName) return Promise.resolve();
  return fetch(`${SUPABASE_URL}/rest/v1/scores?name=eq.${encodeURIComponent(pName)}`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  })
  .then(res => {
    if (res.ok) {
      console.log(`"${pName}" adlı oyuncunun aktif skoru veritabanından silindi.`);
    }
  })
  .catch(e => {
    console.error("Skor silinirken hata oluştu:", e);
  });
}

function loadLeaderboard() {
  if (!leaderboardList) return;
  
  leaderboardList.innerHTML = '<div class="leaderboard-loading"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</div>';
  const stickySelfRank = document.getElementById('stickySelfRank');
  if (stickySelfRank) stickySelfRank.style.display = 'none';
  window.selfRank = null;
  
  fetch(`${SUPABASE_URL}/rest/v1/scores?score=gte.1000&select=name,score&order=score.desc&limit=25`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  })
  .then(res => {
    if (!res.ok) throw new Error("API Hatası");
    return res.json();
  })
  .then(data => {
    leaderboardList.innerHTML = '';
    
    if (data.length === 0) {
      leaderboardList.innerHTML = '<div class="leaderboard-loading">Henüz hiç skor yok! İlk sen ol!</div>';
      return;
    }
    
    const playerName = localStorage.getItem('cubex_playerName');
    
    data.forEach((itemData, index) => {
      const rank = index + 1;
      let rankClass = '';
      if (rank === 1) rankClass = 'top-1';
      else if (rank === 2) rankClass = 'top-2';
      else if (rank === 3) rankClass = 'top-3';
      
      const isSelf = itemData.name === playerName;
      if (isSelf) {
        rankClass += ' is-self';
      }
      
      const item = document.createElement('div');
      item.className = `lb-item ${rankClass}`;
      if (isSelf) {
        item.id = 'selfLeaderboardItem';
      }
      item.innerHTML = `
        <span class="lb-rank">${rank}</span>
        <span class="lb-name">${itemData.name}</span>
        <span class="lb-score">${itemData.score}</span>
      `;
      leaderboardList.appendChild(item);
    });

    // Kendi sıralamamızı veritabanından çekelim
    if (playerName) {
      fetch(`${SUPABASE_URL}/rest/v1/scores?name=eq.${encodeURIComponent(playerName)}&select=score`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      })
      .then(selfRes => {
        if (selfRes.ok) {
          return selfRes.json().then(selfData => {
            if (selfData && selfData.length > 0) {
              const selfScore = selfData[0].score;
              return fetch(`${SUPABASE_URL}/rest/v1/scores?score=gt.${selfScore}&select=count`, {
                headers: {
                  'apikey': SUPABASE_KEY,
                  'Authorization': `Bearer ${SUPABASE_KEY}`,
                  'Prefer': 'count=exact'
                }
              })
              .then(countRes => {
                let selfRank = 1;
                if (countRes.ok) {
                  const contentRange = countRes.headers.get('content-range');
                  if (contentRange) {
                    const countMatch = contentRange.match(/\/(\d+)/);
                    if (countMatch) {
                      selfRank = parseInt(countMatch[1]) + 1;
                    }
                  }
                }
                
                document.getElementById('selfRankNum').textContent = `#${selfRank}`;
                document.getElementById('selfRankNameText').textContent = playerName;
                document.getElementById('selfRankScoreText').textContent = `${selfScore} Puan`;
                window.selfRank = selfRank;
                
                // Scroll dinleyicisini ekle ve başlangıç durumunu ayarla
                leaderboardList.removeEventListener('scroll', updateStickySelfRankVisibility);
                leaderboardList.addEventListener('scroll', updateStickySelfRankVisibility);
                updateStickySelfRankVisibility();
              });
            }
          });
        }
      })
      .catch(selfErr => {
        console.error(selfErr);
      });
    } else {
      // Scroll dinleyicisini ekle ve başlangıç durumunu ayarla
      leaderboardList.removeEventListener('scroll', updateStickySelfRankVisibility);
      leaderboardList.addEventListener('scroll', updateStickySelfRankVisibility);
      updateStickySelfRankVisibility();
    }
  })
  .catch(e => {
    console.error(e);
    leaderboardList.innerHTML = '<div class="leaderboard-loading">Skorlar yüklenemedi. İnternetini kontrol et.</div>';
  });
}

// ---- Cheat Mode Logic ----
let cheatStage = 0;
let trCount = 0;
let blCount = 0;
let cheatTimer = null;
let cheatMode = false;
let cheatUsedInThisGame = false;
let maintenanceActiveAtStart = false;
let maintenanceBypassed = false;

function handleCheatTap(clientX, clientY) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  
  // Right Top Corner (80x80px)
  const isTopRight = clientX > w - 80 && clientY < 80;
  // Left Bottom Corner (80x80px)
  const isBottomLeft = clientX < 80 && clientY > h - 80;

  if (cheatStage === 0 && isTopRight) {
    trCount++;
    if (trCount === 7) {
      cheatStage = 1;
      cheatTimer = setTimeout(() => {
        cheatStage = 0;
        trCount = 0;
        blCount = 0;
      }, 7000);
    }
  } else if (cheatStage === 1 && isBottomLeft) {
    blCount++;
    if (blCount === 7) {
      clearTimeout(cheatTimer);
      cheatStage = 0;
      trCount = 0;
      blCount = 0;
      showCheatDialog();
    }
  }
}

document.addEventListener('touchstart', (e) => {
  if(e.touches.length > 0) {
    handleCheatTap(e.touches[0].clientX, e.touches[0].clientY);
  }
});
document.addEventListener('mousedown', (e) => {
  handleCheatTap(e.clientX, e.clientY);
});

function showCheatDialog() {
  const overlay = document.getElementById('cheatOverlay');
  if (overlay) overlay.classList.add('active');
}

const cheatSubmit = document.getElementById('cheatSubmit');
const cheatCancel = document.getElementById('cheatCancel');
const cheatInput = document.getElementById('cheatInput');

if (cheatSubmit && cheatCancel && cheatInput) {
  cheatCancel.addEventListener('click', () => {
    document.getElementById('cheatOverlay').classList.remove('active');
    cheatInput.value = '';
    sfxClick();
  });
  cheatSubmit.addEventListener('click', () => {
    sfxClick();
    const code = cheatInput.value.trim();
    if (code.toLowerCase() === 'hilex') {
      cheatMode = true;
      cheatUsedInThisGame = true;
      document.getElementById('cheatOverlay').classList.remove('active');
      cheatInput.value = '';
      
      const cheatIcon = document.getElementById('cheatActiveIcon');
      if (cheatIcon) cheatIcon.style.setProperty('display', 'flex', 'important');
      
      // Hile Aktif: Tahtaya tıklayınca blokları silme özelliği
      alert("Geliştirici Modu Aktif!\nArtık tahtadaki herhangi bir bloğa tıklayarak onu yok edebilirsin!");
      
    } else if (code === 'XeV!r@d0_') {
      if (maintenanceActiveAtStart && !maintenanceBypassed) {
        // İlk defa bakım varken yazıldıysa: Bakımı atlat/gizle
        maintenanceBypassed = true;
        document.getElementById('maintenanceOverlay').classList.remove('active');
        document.getElementById('cheatOverlay').classList.remove('active');
        cheatInput.value = '';
        alert("Bakım modu başarıyla atlatıldı! Kod tekrar yazılırsa kurucu paneli açılacaktır.");
      } else {
        // Bakım yoksa veya zaten atlatıldıysa: Doğrudan kurucu paneli aç
        document.getElementById('cheatOverlay').classList.remove('active');
        cheatInput.value = '';
        const adminOverlay = document.getElementById('adminOverlay');
        if (adminOverlay) adminOverlay.classList.add('active');
      }
    } else {
      alert("Hatalı kod.");
    }
  });
}

// ---- Admin Mode Logic ----
const adminCloseBtn = document.getElementById('adminCloseBtn');
const adminAddScoreBtn = document.getElementById('adminAddScoreBtn');
const adminDeleteScoreBtn = document.getElementById('adminDeleteScoreBtn');

if (adminCloseBtn) {
  adminCloseBtn.addEventListener('click', () => {
    sfxClick();
    document.getElementById('adminOverlay').classList.remove('active');
  });
}

if (adminAddScoreBtn) {
  adminAddScoreBtn.addEventListener('click', async () => {
    sfxClick();
    const nameInput = document.getElementById('adminScoreName').value.trim();
    const valInput = parseInt(document.getElementById('adminScoreValue').value);
    
    if (!nameInput || isNaN(valInput)) {
      alert("Lütfen geçerli bir isim ve puan girin.");
      return;
    }
    
    adminAddScoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yükleniyor...';
    const success = await submitScore(nameInput, valInput);
    adminAddScoreBtn.innerHTML = '<i class="fas fa-upload"></i> Skoru Yükle';
    if (success) {
      alert(`${nameInput} adlı oyuncuya ${valInput} puan eklendi/güncellendi.`);
    }
  });
}

if (adminDeleteScoreBtn) {
  adminDeleteScoreBtn.addEventListener('click', async () => {
    sfxClick();
    const nameInput = document.getElementById('adminDeleteName').value.trim();
    const noteInput = document.getElementById('adminDeleteNote').value.trim();
    
    if (!nameInput) {
      alert("Silinecek ismi yazmalısın.");
      return;
    }
    
    if (confirm(`"${nameInput}" isimli oyuncunun skorunu kalıcı olarak silmek istediğine emin misin?`)) {
      adminDeleteScoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Siliniyor...';
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/scores?name=eq.${encodeURIComponent(nameInput)}`, {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        });
        if (res.ok) {
          // Silme notunu veritabanına özel satır olarak ekle
          const finalNote = noteInput || "Skorunuz kurucu tarafından silindi.";
          const noteKey = `deleted:${nameInput}:${finalNote}`;
          
          await fetch(`${SUPABASE_URL}/rest/v1/scores?on_conflict=name`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({ name: noteKey, score: -999 })
          });
          
          alert(`Silme başarılı ve silinme notu kaydedildi.`);
          document.getElementById('adminDeleteName').value = '';
          document.getElementById('adminDeleteNote').value = '';
        } else {
          alert("Silinirken bir hata oluştu.");
        }
      } catch(e) {
        alert("Ağ hatası.");
      }
      adminDeleteScoreBtn.innerHTML = '<i class="fas fa-trash"></i> Skoru Veritabanından Sil';
    }
  });
}

const adminCensorBtn = document.getElementById('adminCensorBtn');
if (adminCensorBtn) {
  adminCensorBtn.addEventListener('click', async () => {
    sfxClick();
    const badName = document.getElementById('adminCensorName').value.trim();
    const noteInput = document.getElementById('adminCensorNote').value.trim();
    
    if (!badName) {
      alert("Sansürlenecek ismi girmelisiniz.");
      return;
    }
    
    adminCensorBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sansürleniyor...';
    try {
      // 1. Veritabanından tüm isimleri çekip boştaki ilk OyuncuX sayısını bulalım
      const listRes = await fetch(`${SUPABASE_URL}/rest/v1/scores?select=name`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      
      let x = 1;
      if (listRes.ok) {
        const listData = await listRes.json();
        const names = listData.map(d => d.name);
        const nums = [];
        names.forEach(n => {
          const m = n.match(/^Oyuncu(\d+)$/);
          if (m) nums.push(parseInt(m[1]));
        });
        while (nums.includes(x)) {
          x++;
        }
      }
      
      const newCensoredName = `Oyuncu${x}`;
      
      // 2. Veritabanındaki ismi güncelle (PATCH)
      const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/scores?name=eq.${encodeURIComponent(badName)}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newCensoredName })
      });
      
      if (updateRes.ok) {
        // Sansür notunu veritabanına özel satır olarak ekle
        const finalNote = noteInput || "Uygunsuz isim kullanımı.";
        const noteKey = `censored:${newCensoredName}:${finalNote}`;
        
        await fetch(`${SUPABASE_URL}/rest/v1/scores?on_conflict=name`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({ name: noteKey, score: -999 })
        });
        
        alert(`"${badName}" isimli oyuncunun adı başarıyla "${newCensoredName}" olarak sansürlendi ve notu kaydedildi.`);
        document.getElementById('adminCensorName').value = '';
        document.getElementById('adminCensorNote').value = '';
        loadLeaderboard(); // Liderlik tablosunu yenile
      } else {
        alert("İsim sansürlenirken veritabanı hatası oluştu (İsim bulunamamış olabilir).");
      }
    } catch (err) {
      console.error(err);
      alert("Ağ hatası oluştu.");
    } finally {
      adminCensorBtn.innerHTML = '<i class="fas fa-ban"></i> İsmi \'Oyuncu[X]\' Yap';
    }
  });
}

const adminBanBtn = document.getElementById('adminBanBtn');
if (adminBanBtn) {
  adminBanBtn.addEventListener('click', async () => {
    sfxClick();
    const banName = document.getElementById('adminBanName').value.trim();
    const duration = document.getElementById('adminBanDuration').value;
    
    if (!banName) {
      alert("Engellenecek oyuncu ismini girmelisiniz.");
      return;
    }
    
    let confirmMsg = `"${banName}" isimli oyuncuyu `;
    if (duration === 'forever') {
      confirmMsg += "kalıcı (süresiz) olarak";
    } else {
      confirmMsg += `${duration} gün boyunca`;
    }
    confirmMsg += " engellemek istediğinize emin misiniz?";
    
    if (confirm(confirmMsg)) {
      adminBanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Engelleniyor...';
      try {
        // 1. Önce veritabanındaki aktif skorunu sil
        await fetch(`${SUPABASE_URL}/rest/v1/scores?name=eq.${encodeURIComponent(banName)}`, {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        });
        
        // 2. Ban bitiş süresini hesapla
        let expireTime;
        if (duration === 'forever') {
          expireTime = 'forever';
        } else {
          const days = parseInt(duration);
          expireTime = Date.now() + days * 24 * 60 * 60 * 1000;
        }
        
        // 3. Ban kaydını özel satır olarak veritabanına ekle
        const banKey = `banned:${banName}:${expireTime}`;
        const banRes = await fetch(`${SUPABASE_URL}/rest/v1/scores?on_conflict=name`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({ name: banKey, score: -999 })
        });
        
        if (banRes.ok) {
          alert(`"${banName}" isimli oyuncu başarıyla engellendi (banlandı) ve skoru silindi.`);
          document.getElementById('adminBanName').value = '';
          loadLeaderboard(); // Liderlik tablosunu yenile
        } else {
          alert("Engelleme kaydedilirken veritabanı hatası oluştu.");
        }
      } catch (err) {
        console.error(err);
        alert("Ağ hatası oluştu.");
      } finally {
        adminBanBtn.innerHTML = '<i class="fas fa-gavel"></i> Oyuncuyu Engelle (Banla)';
      }
    }
  });
}

// Cheat Disable / Icon Logic
const cheatActiveIcon = document.getElementById('cheatActiveIcon');
const cheatInfoOverlay = document.getElementById('cheatInfoOverlay');
const cheatRestartBtn = document.getElementById('cheatRestartBtn');
const cheatInfoCloseBtn = document.getElementById('cheatInfoCloseBtn');

if (cheatActiveIcon) {
  cheatActiveIcon.addEventListener('click', () => {
    sfxClick();
    cheatMode = false;
    cheatActiveIcon.style.display = 'none';
    if (cheatInfoOverlay) cheatInfoOverlay.classList.add('active');
  });
}

if (cheatRestartBtn) {
  cheatRestartBtn.addEventListener('click', () => {
    sfxClick();
    if (cheatInfoOverlay) cheatInfoOverlay.classList.remove('active');
    newGame();
  });
}

if (cheatInfoCloseBtn) {
  cheatInfoCloseBtn.addEventListener('click', () => {
    sfxClick();
    if (cheatInfoOverlay) cheatInfoOverlay.classList.remove('active');
  });
}

// Tahtaya tıklayınca bloğu silme (Hile modu aktifse)
boardEl.addEventListener('mousedown', handleBoardClickForCheat);
boardEl.addEventListener('touchstart', (e) => {
  if (e.touches.length > 0) handleBoardClickForCheat(e.touches[0]);
}, {passive: false});

function handleBoardClickForCheat(e) {
  if (!cheatMode) return;
  const rect = boardEl.getBoundingClientRect();
  const padding = 6;
  const gap = 3;
  const cellSize = (rect.width - padding * 2 - gap * (BOARD_SIZE - 1)) / BOARD_SIZE;

  const clickX = e.clientX - rect.left - padding;
  const clickY = e.clientY - rect.top - padding;

  const col = Math.floor(clickX / (cellSize + gap));
  const row = Math.floor(clickY / (cellSize + gap));

  if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
    if (board[row][col] !== null) {
      board[row][col] = null; // Blok silindi
      sfxClear();
      addScore(500); // Hile ile silmeye puan
      createConfetti();
      renderBoard();
      saveGameState();
    }
  }
}

