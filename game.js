/* =========================================
   CUBEX — Full Game Logic
   ========================================= */

// ---- Version (Android APK Update Check) ----
let APP_VERSION = "Test Modu"; // Dosyadan okuma (file://) başarısız olursa
let localFetchSuccess = false;

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

  // ── Thick bar ──
  { cells: [[0,0],[0,1],[1,0],[1,1],[2,0],[2,1],[3,0],[3,1]], name: '4x2' },
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
          weight += 15.0; // Tam eşleşmeye büyük bonus
        }
      } else if (cluster.length > shape.cells.length && cluster.length <= 9) {
        // Şekil bu boşluğa sığıyor mu? (Küçük boşluklar için basit ihtimal artışı)
        weight += 1.5;
      }
    }

    // 2. Big Shape Logic: Seviye arttıkça büyük parçalara bonus ver (eski mantık korunuyor)
    const minPreferredSize = Math.min(3 + Math.floor(level / 2), 7);
    if (shape.cells.length >= minPreferredSize) {
      const bigChanceBoost = Math.min(0.5 + level * 0.2, 3.0);
      weight += bigChanceBoost;
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
  if (score > bestScore) {
    bestScore = score;
    bestEl.textContent = bestScore;
    localStorage.setItem('cubex_best', bestScore);
    // Update menu score too
    const menuBestDisplay = document.getElementById('menuBestDisplay');
    if (menuBestDisplay) menuBestDisplay.textContent = bestScore;
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
  gameOverOverlay.classList.add('active');
  clearGameState(); // Oyun bitti, kaydı temizle
}

// ---- New Game ----
function newGame() {
  score = 0;
  level = 1;
  combo = 0;
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
function showConfirm(message, onYes, onNo) {
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

// ---- Update Logic ----
function checkForUpdate() {
  if (!navigator.onLine) return;
  const isAndroid = window.Capacitor && window.Capacitor.getPlatform() === 'android';
  
  // JSON tabanlı daha güvenli güncelleme sistemi
  fetch('https://raw.githubusercontent.com/xevrado/CubeX/main/update.json?t=' + Date.now())
    .then(res => {
      if (!res.ok) throw new Error("Ağ hatası");
      return res.json();
    })
    .then(data => {
      if (!data) return;

      // 1. Bakım Molası Kontrolü (Tüm Platformlar)
      if (data.maintenance === true) {
        let overlay = document.getElementById('maintenanceOverlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'maintenanceOverlay';
          overlay.className = 'overlay active';
          overlay.style.zIndex = '99999';
          overlay.style.flexDirection = 'column';
          overlay.style.justifyContent = 'center';
          overlay.style.alignItems = 'center';
          overlay.style.background = 'rgba(15, 23, 42, 0.98)';
          
          const icon = document.createElement('i');
          icon.className = 'fas fa-tools';
          icon.style.fontSize = '4rem';
          icon.style.color = '#eab308';
          icon.style.marginBottom = '20px';
          
          const title = document.createElement('h2');
          title.textContent = 'Bakım Molası';
          title.style.color = 'white';
          title.style.marginBottom = '15px';
          title.style.fontFamily = "'SF Pro Display', sans-serif";
          
          const msg = document.createElement('p');
          msg.id = 'maintenanceMsgText';
          msg.style.color = '#cbd5e1';
          msg.style.textAlign = 'center';
          msg.style.maxWidth = '80%';
          msg.style.lineHeight = '1.6';
          msg.style.fontFamily = "'Inter', sans-serif";
          
          const timeBadge = document.createElement('div');
          timeBadge.id = 'maintenanceTimeBadge';
          timeBadge.style.marginTop = '25px';
          timeBadge.style.padding = '10px 20px';
          timeBadge.style.background = 'rgba(234, 179, 8, 0.15)';
          timeBadge.style.border = '1px solid rgba(234, 179, 8, 0.3)';
          timeBadge.style.borderRadius = '12px';
          timeBadge.style.color = '#eab308';
          timeBadge.style.fontFamily = "'Inter', sans-serif";
          timeBadge.style.fontSize = '15px';
          timeBadge.style.fontWeight = '600';
          timeBadge.style.display = 'none';
          timeBadge.style.alignItems = 'center';
          timeBadge.style.gap = '10px';
          
          const clockIcon = document.createElement('i');
          clockIcon.className = 'far fa-clock';
          timeBadge.appendChild(clockIcon);
          
          const timeText = document.createElement('span');
          timeText.id = 'maintenanceTimeText';
          timeBadge.appendChild(timeText);
          
          overlay.appendChild(icon);
          overlay.appendChild(title);
          overlay.appendChild(msg);
          overlay.appendChild(timeBadge);
          
          document.body.appendChild(overlay);
        }
        
        // Mevcut overlay'i güncelle ve göster
        overlay.classList.add('active');
        
        const msgEl = document.getElementById('maintenanceMsgText');
        if (msgEl) {
          msgEl.textContent = data.maintenanceMessage || 'Sunucularımızda bakım çalışması yapılmaktadır. Lütfen daha sonra tekrar deneyiniz.';
        }
        
        const badgeEl = document.getElementById('maintenanceTimeBadge');
        const timeEl = document.getElementById('maintenanceTimeText');
        if (badgeEl && timeEl) {
          if (data.maintenanceEndTime) {
            badgeEl.style.display = 'flex';
            timeEl.textContent = data.maintenanceEndTime;
          } else {
            badgeEl.style.display = 'none';
          }
        }
        
        return; // Bakım varsa Android güncelleme uyarısını gösterme
      } else {
        const overlay = document.getElementById('maintenanceOverlay');
        if (overlay) {
          overlay.classList.remove('active');
          overlay.style.display = 'none';
        }
      }

      // 2. Android APK Güncelleme Kontrolü
      if (!isAndroid || typeof data.version !== 'string') return;
      
      // Sürüm numarası doğrulama (örn. 1.1.0 veya 1.1.1 formatında olmalı)
      const versionRegex = /^\d+\.\d+\.\d+$/;
      if (!versionRegex.test(data.version)) return;

      if (!localFetchSuccess || APP_VERSION === "Test Modu") return; // Güvenlik kilidi: Sürüm doğrulanamadıysa popup gösterme

      if (data.version !== APP_VERSION) {
        const updatePopup = document.getElementById('updatePopup');
        const doUpdateBtn = document.getElementById('doUpdateBtn');
        const closeUpdateBtn = document.getElementById('closeUpdateBtn');
        
        if (updatePopup && doUpdateBtn) {
          updatePopup.style.display = 'block';
          
          // onclick kullanarak listener birikimini önle
          doUpdateBtn.onclick = async () => {
            const apkUrl = data.downloadUrl || 'https://github.com/xevrado/CubeX/releases/download/latest/app-debug.apk';
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser) {
              await window.Capacitor.Plugins.Browser.open({ url: apkUrl });
            } else {
              window.location.href = apkUrl;
            }
          };

          // Kapatma butonu bağlantısı
          if (closeUpdateBtn) {
            closeUpdateBtn.onclick = () => {
              updatePopup.style.display = 'none';
            };
          }
        }
      }
    })
    .catch(err => {
      // JSON parse hatası veya ağ hatası durumunda sessizce geç
      console.warn("Update check safely ignored:", err.message);
    });
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

function initApp() {
  // Local versiyonu yükle ve ekrana yazdır (APK için gömülü, PWA için o anki aktif sürüm)
  fetch('update.json')
    .then(res => res.json())
    .then(data => {
      if (data && data.version) {
        APP_VERSION = data.version;
        localFetchSuccess = true;
      }
      renderVersionDisplay();
    })
    .catch(err => {
      renderVersionDisplay(); // Hata olsa bile varsayılanı yazdır
    });

  createParticles();
  
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const downloadBtn = document.getElementById('downloadBtn');
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

  // iOS'da İndir butonunu gizle (APK çalışmayacağı için)
  if (isIOS) {
    if (downloadBtn) downloadBtn.style.display = 'none';
  }

  // Güncelleme ve Bakım kontrolünü tüm platformlar için yap
  if (navigator.onLine) {
    const isAndroid = window.Capacitor && window.Capacitor.getPlatform() === 'android';
    if (isAndroid && downloadBtn) downloadBtn.style.display = 'none';
    setTimeout(checkForUpdate, 1000); 
  }

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
