/* =========================================
   CUBEX — Full Game Logic
   ========================================= */

// ---- Version (Android APK Update Check) ----
let APP_VERSION = "1.5.2.4"; // Bu değer sync.js tarafından otomatik güncellenir
// ---- Constants ----
const BOARD_SIZE = 8;
const COLORS = 8; // color-0 … color-7

// ---- Piece Shapes (relative coords [row, col]) ----
const SHAPES = [
  // ── Singles / small ──
  { cells: [[0, 0]], name: '1x1' },

  // ── Lines ──
  { cells: [[0, 0], [0, 1]], name: '1x2' },
  { cells: [[0, 0], [1, 0]], name: '2x1' },
  { cells: [[0, 0], [0, 1], [0, 2]], name: '1x3' },
  { cells: [[0, 0], [1, 0], [2, 0]], name: '3x1' },
  { cells: [[0, 0], [0, 1], [0, 2], [0, 3]], name: '1x4' },
  { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], name: '4x1' },
  { cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], name: '1x5' },
  { cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], name: '5x1' },

  // ── Squares ──
  { cells: [[0, 0], [0, 1], [1, 0], [1, 1]], name: '2x2' },
  { cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]], name: '3x3' },

  // ── Rectangles ──
  { cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]], name: '2x3' },
  { cells: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]], name: '3x2' },

  // ── L shapes ──
  { cells: [[0, 0], [1, 0], [1, 1]], name: 'L1' },
  { cells: [[0, 0], [0, 1], [1, 0]], name: 'L2' },
  { cells: [[0, 0], [0, 1], [1, 1]], name: 'L3' },
  { cells: [[0, 0], [1, 0], [1, -1]], name: 'L4' },

  // ── Big L shapes ──
  { cells: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], name: 'BigL1' },
  { cells: [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]], name: 'BigL2' },
  { cells: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]], name: 'BigL3' },
  { cells: [[0, 0], [1, 0], [2, 0], [2, -1], [2, -2]], name: 'BigL4' },

  // ── J shapes (mirror of L) ──
  { cells: [[0, 0], [0, 1], [1, 0], [2, 0]], name: 'J1' },
  { cells: [[0, 0], [1, 0], [1, 1], [1, 2]], name: 'J2' },
  { cells: [[0, 0], [0, 1], [0, 2], [1, 0]], name: 'J3' },
  { cells: [[0, 0], [0, 1], [0, 2], [1, 2]], name: 'J4' },

  // ── T shapes ──
  { cells: [[0, 0], [0, 1], [0, 2], [1, 1]], name: 'T1' },
  { cells: [[0, 0], [1, 0], [1, 1], [2, 0]], name: 'T2' },
  { cells: [[0, 1], [1, 0], [1, 1], [1, 2]], name: 'T3' },
  { cells: [[0, 0], [1, 0], [1, -1], [2, 0]], name: 'T4' },

  // ── Z / S shapes ──
  { cells: [[0, 0], [0, 1], [1, 1], [1, 2]], name: 'Z1' },
  { cells: [[0, 0], [1, 0], [1, -1], [2, -1]], name: 'Z2' },
  { cells: [[0, 0], [0, 1], [1, -1], [1, 0]], name: 'S1' },
  { cells: [[0, 0], [1, 0], [1, 1], [2, 1]], name: 'S2' },

  // ── Plus / Cross ──
  { cells: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]], name: 'Plus' },
  { cells: [[0, 0], [1, 0], [1, 1]], name: 'SmallCross' },

  // ── Corner / Angle shapes ──
  { cells: [[0, 0], [0, 1], [1, 0]], name: 'Corner1' },
  { cells: [[0, 0], [0, 1], [1, 1]], name: 'Corner2' },
  { cells: [[0, 0], [1, 0], [1, 1]], name: 'Corner3' },
  { cells: [[0, 1], [1, 0], [1, 1]], name: 'Corner4' },

  // ── Diagonal pair ──
  { cells: [[0, 0], [1, 1]], name: 'Diag1' },
  { cells: [[0, 1], [1, 0]], name: 'Diag2' },

  // ── Small T variants ──
  { cells: [[0, 0], [0, 1], [0, 2], [1, 0]], name: 'SmallT1' },
  { cells: [[0, 0], [0, 1], [0, 2], [1, 2]], name: 'SmallT2' },
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
let lastSubmitTime = 0;
let lastSubmittedScoreVal = 0;

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
  } catch (e) { }
}

function sfxPlace() { playTone(520, 0.12, 'sine', 0.15); playTone(660, 0.1, 'sine', 0.10); }
function sfxClear() { playTone(780, 0.15, 'triangle', 0.18); playTone(1040, 0.2, 'sine', 0.12); }
function sfxCombo() { playTone(880, 0.1, 'sine', 0.2); setTimeout(() => playTone(1100, 0.15, 'sine', 0.18), 80); setTimeout(() => playTone(1320, 0.2, 'sine', 0.15), 160); }
function sfxGameOver() { playTone(300, 0.3, 'sawtooth', 0.1); setTimeout(() => playTone(200, 0.4, 'sawtooth', 0.08), 200); }
function sfxClick() { playTone(600, 0.06, 'sine', 0.08); }

// ---- DOM refs ----
const boardEl = document.getElementById('gameBoard');
const scoreEl = document.getElementById('scoreDisplay');
const bestEl = document.getElementById('bestDisplay');
const levelEl = document.getElementById('levelDisplay');
const comboCountEl = document.getElementById('comboCount');
const comboDisplayEl = document.getElementById('comboDisplay');
const trayEl = document.getElementById('pieceTray');
const clearFlashEl = document.getElementById('clearFlash');
const scorePopupEl = document.getElementById('scorePopup');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const helpOverlay = document.getElementById('helpOverlay');
const soundBtn = document.getElementById('soundBtn');
const helpBtn = document.getElementById('helpBtn');
const restartBtn = document.getElementById('restartBtn');
const playAgainBtn = document.getElementById('playAgainBtn');
const closeHelpBtn = document.getElementById('closeHelpBtn');
const finalScoreEl = document.getElementById('finalScore');
const finalBestEl = document.getElementById('finalBest');
const finalLevelEl = document.getElementById('finalLevel');

// ---- Initialize Particles ----
function createParticles() {
  const container = document.getElementById('bgParticles');
  const colors = ['#4f8ef7', '#a855f7', '#ec4899', '#06b6d4', '#22c55e', '#eab308'];
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

// ---- Piece Combination Simulation (Antigravity Solver) ----
function canPlaceSimultaneouslyWithClearing(pieces, currentBoard) {
  // We try all 6 possible orders of placing the 3 pieces
  const permutations = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0]
  ];

  for (const perm of permutations) {
    const p0 = pieces[perm[0]];
    const p1 = pieces[perm[1]];
    const p2 = pieces[perm[2]];

    if (simulatePlacement([p0, p1, p2], currentBoard)) {
      return true;
    }
  }
  return false;
}

function simulatePlacement(orderedPieces, currentBoard) {
  const tempBoard = currentBoard.map(row => [...row]);

  function step(index) {
    if (index === orderedPieces.length) return true;
    const piece = orderedPieces[index];

    // Try placing this piece at all possible positions
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (canPlaceOnTemp(piece.cells, r, c, tempBoard)) {
          // Save state
          const savedBoard = tempBoard.map(row => [...row]);

          // Place
          placeOnTemp(piece.cells, r, c, tempBoard, piece.color);

          // Apply temp clear
          applyTempClearing(tempBoard);

          if (step(index + 1)) return true;

          // Restore
          for (let tr = 0; tr < BOARD_SIZE; tr++) {
            for (let tc = 0; tc < BOARD_SIZE; tc++) {
              tempBoard[tr][tc] = savedBoard[tr][tc];
            }
          }
        }
      }
    }
    return false;
  }

  return step(0);
}

function canPlaceOnTemp(cells, startR, startC, tBoard) {
  for (const [dr, dc] of cells) {
    const r = startR + dr;
    const c = startC + dc;
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return false;
    if (tBoard[r][c] !== null) return false;
  }
  return true;
}

function placeOnTemp(cells, startR, startC, tBoard, val) {
  for (const [dr, dc] of cells) {
    tBoard[startR + dr][startC + dc] = val;
  }
}

function applyTempClearing(tBoard) {
  const rowsToClear = [];
  const colsToClear = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    if (tBoard[r].every(cell => cell !== null)) {
      rowsToClear.push(r);
    }
  }
  for (let c = 0; c < BOARD_SIZE; c++) {
    let full = true;
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (tBoard[r][c] === null) {
        full = false;
        break;
      }
    }
    if (full) colsToClear.push(c);
  }

  rowsToClear.forEach(r => {
    for (let c = 0; c < BOARD_SIZE; c++) tBoard[r][c] = null;
  });
  colsToClear.forEach(c => {
    for (let r = 0; r < BOARD_SIZE; r++) tBoard[r][c] = null;
  });
}

function generatePieces() {
  const clusters = findEmptyClusters();
  const fittingShapes = getFittingShapes();

  // Eğer hiç sığan şekil yoksa, oyun zaten bitecek — küçük şekilleri dene
  if (fittingShapes.length === 0) {
    currentPieces = [randomPiece(), randomPiece(), randomPiece()];
    return;
  }

  const emptyCellsCount = board.flat().filter(cell => cell === null).length;
  const filledCellsCount = BOARD_SIZE * BOARD_SIZE - emptyCellsCount;

  // Tahtadaki blokları tamamen temizleme (Perfect Clear) şansını arttırmak için yeni eşikler belirledik
  const isLowFullness = (filledCellsCount > 0 && filledCellsCount <= 22);
  const isUltraLowFullness = (filledCellsCount > 0 && filledCellsCount <= 10);

  // Her şekil için bir ağırlık hesapla
  const shapeWeights = SHAPES.map(shape => {
    // Sığmayan şekillere 0 ağırlık ver
    if (!fittingShapes.includes(shape)) return 0;

    let weight = 1.0;
    const normalizedShape = normalizeCells(shape.cells);
    const shapeKey = normalizedShape.map(c => c.join(',')).sort().join('|');

    let exactMatchFound = false;
    for (const cluster of clusters) {
      if (cluster.length === shape.cells.length) {
        const normalizedCluster = normalizeCells(cluster);
        const clusterKey = normalizedCluster.map(c => c.join(',')).sort().join('|');
        if (shapeKey === clusterKey) {
          exactMatchFound = true;
          break;
        }
      }
    }

    // GICIK PARÇALAR: 1x5, 5x1 ve Artı (Plus) parçaları SADECE tam oturdukları yer varsa gelebilir.
    if (['1x5', '5x1', 'Plus'].includes(shape.name) && !exactMatchFound) {
      return 0; // Başka türlü asla gelmesin
    }

    if (isUltraLowFullness) {
      // ÇOK DÜŞÜK DOLULUK MODU: Oyuncunun Perfect Clear yapmasını kolaylaştırmak için sadece en küçük parçaları ver
      if (['1x1', '1x2', '2x1'].includes(shape.name)) {
        weight *= 8.0;
      } else {
        return 0; // 3'lük ve üzeri parçaları tamamen engelle
      }
    } else if (isLowFullness) {
      // DÜŞÜK DOLULUK MODU: Oyuncuya Perfect Clear yapması için SADECE küçük/yardımcı parçalar ver!
      if (['1x1', '1x2', '2x1', '1x3', '3x1', 'Corner1', 'Corner2', 'Corner3', 'Corner4'].includes(shape.name)) {
        weight *= 5.0; // Şanslarını çok arttır
      } else {
        return 0; // Diğer hantal parçaları TAMAMEN engelle ki tahtayı temizleyebilsin!
      }
    } else {
      // NORMAL VEYA SIKIŞIK MOD: Zorluk dengesini koru, oyuncuyu boğma
      if (emptyCellsCount < 12) {
        if (shape.cells.length >= 5) return 0;
        if (shape.cells.length === 4) weight *= 0.05; // 4'lükleri aşırı nadir yap
        if (shape.cells.length <= 2) weight *= 1.5;   // Küçükleri destekle
      } else if (emptyCellsCount < 20) {
        if (shape.cells.length >= 5) return 0;
        if (shape.cells.length === 4) weight *= 0.2;
      } else if (emptyCellsCount < 28) {
        if (shape.cells.length >= 5) weight *= 0.2;
        if (shape.cells.length === 4) weight *= 0.5;
      }
    }

    // Hole match bonuslarını ekle
    if (exactMatchFound) {
      weight += 18.0;
    } else {
      for (const cluster of clusters) {
        if (cluster.length > shape.cells.length && cluster.length <= 9) {
          weight += 1.8;
        }
      }
    }

    // 2. Big Shape Logic: Seviye arttıkça büyük parçalara bonus ver (eski mantık korunuyor)
    const minPreferredSize = Math.min(3 + Math.floor(level / 2), 7);
    if (shape.cells.length >= minPreferredSize) {
      const bigChanceBoost = Math.min(0.5 + level * 0.2, 3.0);
      weight += bigChanceBoost;
    }

    // 2x3, 3x2, 3x3 bloklarının gelme olasılığını azalt (%80 azaltım)
    if (['2x3', '3x2', '3x3'].includes(shape.name)) {
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

  // Akıllı kombinasyon seçici: 3 parçanın da aynı anda veya sırayla yerleştirilebilir olduğunu doğrula
  let candidatePieces = [];
  let foundValid = false;
  let attempts = 0;
  const maxAttempts = 45; // 45 deneme yap (zorluk dengesi)

  while (attempts < maxAttempts) {
    candidatePieces = [pickSmart(), pickSmart(), pickSmart()];
    if (canPlaceSimultaneouslyWithClearing(candidatePieces, board)) {
      foundValid = true;
      break;
    }
    attempts++;
  }

  // Eğer tamamen yerleşebilir kombinasyon bulamadıysak (örn. tahta çok doludur),
  // oyuncunun hemen kilitlenmemesi için en az 1 tanesi kesin yerleşsin
  // ve diğer iki parça da aşırı büyük/hantal olmasın (en fazla 1 adet boyutu >= 4 olan parça bulunabilsin)
  if (!foundValid) {
    attempts = 0;
    while (attempts < 30) {
      candidatePieces = [pickSmart(), pickSmart(), pickSmart()];
      if (candidatePieces.some(p => canPlaceAnywhere(p))) {
        const largeCount = candidatePieces.filter(p => p.cells.length >= 4).length;
        if (largeCount <= 1) {
          break;
        }
      }
      attempts++;
    }
  }

  currentPieces = candidatePieces;
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
    } catch (err) { }

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
    let points = linesCleared * 80;
    if (linesCleared > 1) {
      points += linesCleared * 20;
    }
    if (combo > 1) {
      points = points * combo;
      sfxCombo();
      if (comboDisplayEl) comboDisplayEl.textContent = '🔥 COMBO x' + combo + '!';
    } else {
      sfxClear();
      if (comboDisplayEl) comboDisplayEl.textContent = '';
    }

    // PERFECT CLEAR BONUS (Tüm bloklar temizlenirse 1000 puan ekstra kazanılır)
    const isBoardEmpty = board.every(row => row.every(cell => cell === null));
    if (isBoardEmpty) {
      points += 1000;
      setTimeout(() => {
        // Melodili geri bildirim tonu (C5 -> E5 -> G5 -> C6)
        playTone(523.25, 0.12, 'triangle', 0.25);
        setTimeout(() => playTone(659.25, 0.12, 'triangle', 0.25), 100);
        setTimeout(() => playTone(783.99, 0.12, 'triangle', 0.25), 200);
        setTimeout(() => {
          playTone(1046.50, 0.3, 'sine', 0.3);
          createConfetti();
        }, 300);
      }, 350);

      if (comboDisplayEl) {
        comboDisplayEl.textContent = '✨ PERFECT CLEAR! +1000 🔥';
      }
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

  // Real-time Supabase güncellemesi (Ağ trafiğini azaltmak ve yarış durumlarını tamamen önlemek için optimize edildi)
  if (score >= 1000 && (typeof cheatUsedInThisGame === 'undefined' || !cheatUsedInThisGame)) {
    const pName = localStorage.getItem('cubex_playerName');
    if (pName) {
      const now = Date.now();
      const scoreDiff = score - lastSubmittedScoreVal;

      if (scoreDiff >= 250 || (now - lastSubmitTime > 15000 && scoreDiff > 0)) {
        lastSubmitTime = now;
        lastSubmittedScoreVal = score;
        submitScore(pName, score, true);
      }
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

    // Oyun bittiğinde aktif skoru liderlik tablosundan sıfırla.
    // Liderlikte sadece "o anki aktif oyun puanı" gösterilir; yenilince kayıt silinir.
    const pName = localStorage.getItem('cubex_playerName');
    if (pName) {
      deleteActiveScore(pName);
    }
    lastSubmittedScoreVal = 0;
    lastSubmitTime = 0;
    hasSubmittedThisGame = false;
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
  lastSubmittedScoreVal = 0;
  lastSubmitTime = 0;

  // Yeni oyun başladığında eski aktif skoru liderlik tablosundan sil
  const pNameForReset = localStorage.getItem('cubex_playerName');
  if (pNameForReset) {
    deleteActiveScore(pNameForReset);
  }

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

if (soundBtn) {
  soundBtn.addEventListener('click', () => {
    initAudio();
    soundOn = !soundOn;
    soundBtn.innerHTML = soundOn ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
    sfxClick();
  });
}

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

function checkMaintenance() {
  return fetch(`update.json?t=${Date.now()}`) // Bypass SW cache using timestamp
    .then(res => {
      if (res.ok) {
        return res.json().then(data => {
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
          return false;
        });
      }
      return false;
    })
    .catch(err => {
      console.error("Bakım kontrolü hatası:", err);
      return false;
    });
}

function initApp() {
  checkMaintenance().then((isMaintenance) => {
    renderVersionDisplay();

    if (isMaintenance) {
      return;
    }

    bootstrapApp();
  });
}

function bootstrapApp() {
    if (appBootstrapped) return;
    appBootstrapped = true;

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
      } catch (e) { }
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

    // Oyuna girince akıllı cihaz/IP tabanlı hesap kontrolü yap
    checkDeviceAndIpRegistration();

    // Tek seferlik migrasyon: Eski sürümde liderlik tablosunda takılı kalmış
    // "en yüksek skor" kayıtlarını temizle. Her cihaz bunu sadece bir kez yapar.
    // Eğer cihazda 1000+ puanlı kaydedilmiş aktif bir oyun varsa, silmek yerine
    // o aktif skoru DB'ye tekrar yazarak senkronize ederiz (veri kaybı olmasın).
    try {
      if (!localStorage.getItem('cubex_oldScoreCleaned_v1')) {
        const pNameForCleanup = localStorage.getItem('cubex_playerName');
        if (pNameForCleanup) {
          let savedActiveScore = 0;
          try {
            const savedRaw = localStorage.getItem('cubex_gameState');
            if (savedRaw) {
              const savedObj = JSON.parse(savedRaw);
              if (savedObj && typeof savedObj.score === 'number') {
                savedActiveScore = savedObj.score;
              }
            }
          } catch (_) { /* bozuk kayıt: yok say */ }

          const cleanupPromise = (savedActiveScore >= 1000)
            ? submitScore(pNameForCleanup, savedActiveScore, true)
            : deleteActiveScore(pNameForCleanup);

          cleanupPromise
            .then(() => {
              localStorage.setItem('cubex_oldScoreCleaned_v1', '1');
            })
            .catch(() => { /* sessizce yok say */ });
        } else {
          localStorage.setItem('cubex_oldScoreCleaned_v1', '1');
        }
      }
    } catch (e) { /* localStorage erişilemezse sessizce yok say */ }

    // Her 20 saniyede bir sansür/silinme durumunu arka planda kontrol et (Yarış durumlarını tamamen önler)
    setInterval(() => {
      if (gameActive && score >= 1000) {
        checkNameCensorship();
      }
    }, 20000);

    // iOS'da İndir butonunu gizle (APK çalışmayacağı için)
    if (isIOS) {
      if (downloadBtn) downloadBtn.style.display = 'none';
    }

    // Güncelleme ve Bakım kontrolünü tüm platformlar için yap (Android APK içindeyken butonu gizle)
    if (navigator.onLine) {
      const isAndroid = window.Capacitor && window.Capacitor.getPlatform() === 'android';
      if (isAndroid && downloadBtn) downloadBtn.style.display = 'none';
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

// ---- Offline to Online Score Sync ----
function syncPendingScore() {
  // Disabled: Skorlar liderlik tablosu güvenirliği için SADECE aktif oyun oturumu esnasında alınır ve güncellenir.
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
    // Her açılışta varsayılan olarak "Anlık Skor" sekmesini göster
    activeLbTab = 'live';
    const tabsEl = document.getElementById('lbTabs');
    const trackEl = document.getElementById('lbTrack');
    if (tabsEl) tabsEl.dataset.active = 'live';
    if (trackEl) trackEl.classList.remove('show-alltime');
    document.querySelectorAll('.lb-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === 'live');
    });
    loadLeaderboard();
  });
}

if (closeLeaderboardBtn) {
  closeLeaderboardBtn.addEventListener('click', () => {
    sfxClick();
    if (leaderboardOverlay) leaderboardOverlay.classList.remove('active');
  });
}

const CUBEX_CONFIG = window.CUBEX_CONFIG || {};
function resolveSupabaseUrl(rawUrl, anonKey) {
  if (rawUrl && /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(rawUrl)) {
    return rawUrl;
  }

  try {
    const payload = JSON.parse(atob(String(anonKey || '').split('.')[1] || ''));
    if (payload && /^[a-z0-9-]+$/i.test(payload.ref)) {
      return `https://${payload.ref}.supabase.co`;
    }
  } catch (_) { }

  return '';
}

const SUPABASE_KEY = CUBEX_CONFIG.SUPABASE_ANON_KEY || '';
const SUPABASE_URL = resolveSupabaseUrl(CUBEX_CONFIG.SUPABASE_URL || '', SUPABASE_KEY);
const LEADERBOARD_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_KEY);

const LEADERBOARD_READ_ONLY_MODE = true;

function isSupabaseScoreWrite(input, init = {}) {
  const rawUrl = typeof input === 'string' ? input : (input && input.url);
  if (!rawUrl || !rawUrl.startsWith(`${SUPABASE_URL}/rest/v1/scores`)) return false;
  const method = (init.method || (input && input.method) || 'GET').toUpperCase();
  return !['GET', 'HEAD', 'OPTIONS'].includes(method);
}

if (LEADERBOARD_READ_ONLY_MODE) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = function guardedFetch(input, init = {}) {
    if (isSupabaseScoreWrite(input, init)) {
      console.warn('Leaderboard write blocked in read-only security mode.');
      return Promise.resolve(new Response(
        JSON.stringify({ error: 'leaderboard_read_only' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }
    return originalFetch(input, init);
  };
}

// ---- Device, IP-based Account Sync & Anti-Duplicate Name Logic ----
let leaderboardObserver = null;

function setupLeaderboardObserver() {
  // Aktif sekmenin listesine bak
  const containerId = (typeof activeLbTab !== 'undefined' && activeLbTab === 'alltime')
    ? 'leaderboardListAllTime'
    : 'leaderboardList';
  const container = document.getElementById(containerId);
  const stickySelfRank = document.getElementById('stickySelfRank');
  const selfElement = container ? container.querySelector('[data-self-item="1"]') : null;

  if (!container || !stickySelfRank) return;

  if (leaderboardObserver) {
    leaderboardObserver.disconnect();
    leaderboardObserver = null;
  }

  if (!window.selfRank) {
    stickySelfRank.style.display = 'none';
    return;
  }

  if (selfElement) {
    const options = {
      root: container,
      threshold: 0.99
    };

    leaderboardObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          stickySelfRank.style.display = 'none';
        } else {
          stickySelfRank.style.display = 'block';
        }
      });
    }, options);

    leaderboardObserver.observe(selfElement);
  } else {
    stickySelfRank.style.display = 'block';
  }
}

function checkDeviceAndIpRegistration() {
  const localName = localStorage.getItem('cubex_playerName');
  const nameOverlay = document.getElementById('nameOverlay');

  let deviceId = localStorage.getItem('cubex_deviceId');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2) + '_' + Date.now();
    localStorage.setItem('cubex_deviceId', deviceId);
  }

  return fetch('https://api.ipify.org?format=json')
    .then(res => res.json())
    .then(ipData => ipData.ip)
    .catch(() => 'no_ip')
    .then(ip => {
      const headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      };

      if (localName) {
        // Migration: ensure device/IP is silently registered to the local account if not already done
        return fetch(`${SUPABASE_URL}/rest/v1/scores?name=like.device_ip:${encodeURIComponent(localName)}:%`, { headers })
          .then(res => {
            if (res.ok) {
              return res.json().then(mappings => {
                const hasCurrentMapping = mappings.some(m => m.name.split(':')[2] === deviceId);
                if (!hasCurrentMapping) {
                  const mappingKey = `device_ip:${localName}:${deviceId}:${ip}`;
                  fetch(`${SUPABASE_URL}/rest/v1/scores?on_conflict=name`, {
                    method: 'POST',
                    headers: {
                      ...headers,
                      'Content-Type': 'application/json',
                      'Prefer': 'resolution=merge-duplicates'
                    },
                    body: JSON.stringify({ name: mappingKey, score: -999 })
                  }).catch(e => console.error("Silent sync error:", e));
                }
              });
            }
          })
          .then(() => {
            checkNameCensorship();
          });
      } else {
        // Query for any existing registration by deviceId
        return fetch(`${SUPABASE_URL}/rest/v1/scores?name=like.device_ip:%:${deviceId}:%&score=eq.-999`, { headers })
          .then(res => {
            if (res.ok) return res.json();
            return [];
          })
          .then(deviceMappings => {
            if (deviceMappings.length > 0) return deviceMappings;

            if (ip !== 'no_ip') {
              return fetch(`${SUPABASE_URL}/rest/v1/scores?name=like.device_ip:%:%:${ip}&score=eq.-999`, { headers })
                .then(res => {
                  if (res.ok) return res.json();
                  return [];
                });
            }
            return [];
          })
          .then(matchedMappings => {
            if (matchedMappings.length > 0) {
              const match = matchedMappings[0].name.split(':');
              const existingName = match[1];

              showConfirm(
                `Daha önce aynı IP veya cihaz üzerinden '${existingName}' kullanıcı adıyla oynadınız. Verileriniz eşitlensin mi?`,
                () => {
                  localStorage.setItem('cubex_playerName', existingName);

                  // Fetch the high score
                  fetch(`${SUPABASE_URL}/rest/v1/scores?name=eq.${encodeURIComponent(existingName)}&select=score`, { headers })
                    .then(scoreRes => {
                      if (scoreRes.ok) {
                        return scoreRes.json().then(scoreData => {
                          if (scoreData && scoreData.length > 0) {
                            const dbBest = scoreData[0].score;
                            const localBest = parseInt(localStorage.getItem('cubex_best') || '0');
                            const finalBest = Math.max(dbBest, localBest);
                            localStorage.setItem('cubex_best', finalBest);
                            bestScore = finalBest;
                            const menuBestDisplay = document.getElementById('menuBestDisplay');
                            if (menuBestDisplay) menuBestDisplay.textContent = bestScore;
                          }
                        });
                      }
                    })
                    .catch(e => console.error(e))
                    .then(() => {
                      const mappingKey = `device_ip:${existingName}:${deviceId}:${ip}`;
                      return fetch(`${SUPABASE_URL}/rest/v1/scores?on_conflict=name`, {
                        method: 'POST',
                        headers: {
                          ...headers,
                          'Content-Type': 'application/json',
                          'Prefer': 'resolution=merge-duplicates'
                        },
                        body: JSON.stringify({ name: mappingKey, score: -999 })
                      });
                    })
                    .catch(e => console.error(e))
                    .then(() => {
                      alert(`Hesabınız başarıyla eşitlendi! Tekrar hoş geldin, ${existingName}!`);
                      checkNameCensorship();
                    });
                },
                () => {
                  generateAndRegisterAutoName(deviceId, ip);
                },
                "Evet, Eşitle",
                "Hayır, Yeni Hesap Aç"
              );
            } else {
              if (nameOverlay) nameOverlay.classList.add('active');
            }
          });
      }
    });
}

function generateAndRegisterAutoName(deviceId, ip) {
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
  };

  return fetch(`${SUPABASE_URL}/rest/v1/scores?select=name`, { headers })
    .then(res => {
      if (res.ok) return res.json();
      return [];
    })
    .then(listData => {
      let x = 1;
      const names = listData.map(d => d.name);
      const nums = [];
      names.forEach(n => {
        const m = n.match(/^Oyuncu(\d+)$/);
        if (m) nums.push(parseInt(m[1]));
      });
      while (nums.includes(x)) {
        x++;
      }
      return `Oyuncu${x}`;
    })
    .catch(() => {
      return `Oyuncu${Math.floor(1000 + Math.random() * 9000)}`;
    })
    .then(autoName => {
      localStorage.setItem('cubex_playerName', autoName);

      const mappingKey = `device_ip:${autoName}:${deviceId}:${ip}`;
      return fetch(`${SUPABASE_URL}/rest/v1/scores?on_conflict=name`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({ name: mappingKey, score: -999 })
      })
        .then(() => {
          alert(`Yeni hesabınız başarıyla oluşturuldu!\nKullanıcı Adınız: ${autoName}`);
          checkNameCensorship();
        });
    });
}

// ---- Name Overlay Logic ----
const saveNameBtn = document.getElementById('saveNameBtn');
const playerNameInput = document.getElementById('playerNameInput');
const playerBestScoreInput = document.getElementById('playerBestScoreInput');
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

      saveNameBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kontrol Ediliyor...';
      const headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      };

      fetch(`${SUPABASE_URL}/rest/v1/scores?name=eq.${encodeURIComponent(pName)}`, { headers })
        .then(res => {
          if (res.ok) return res.json();
          return [];
        })
        .then(existingScores => {
          if (existingScores.length > 0) {
            alert("Bu kullanıcı adı başkası tarafından kullanılıyor. Lütfen başka bir isim seçin.");
            saveNameBtn.innerHTML = '<i class="fas fa-check"></i> Kaydet';
            return;
          }

          showConfirm(
            "Lütfen kullanıcı adınızda argo, küfür, aşağılayıcı ve ahlaka uygun olmayan diğer sözcükleri kullanmayın. Aksi takdirde hesabınız yasaklanabilir.",
            () => {
              localStorage.setItem('cubex_playerName', pName);
              nameOverlay.classList.remove('active');

              let deviceId = localStorage.getItem('cubex_deviceId');
              if (!deviceId) {
                deviceId = 'dev_' + Math.random().toString(36).substring(2) + '_' + Date.now();
                localStorage.setItem('cubex_deviceId', deviceId);
              }

              fetch('https://api.ipify.org?format=json')
                .then(r => r.json())
                .then(data => data.ip)
                .catch(() => 'no_ip')
                .then(ip => {
                  let initialScore = -999;
                  if (playerBestScoreInput && playerBestScoreInput.value) {
                    const parsed = parseInt(playerBestScoreInput.value, 10);
                    if (!isNaN(parsed) && parsed >= 0) {
                      initialScore = parsed;
                      bestScore = parsed;
                      localStorage.setItem('cubex_best', bestScore);
                      if (typeof bestEl !== 'undefined' && bestEl) bestEl.textContent = bestScore;
                      const menuBestDisplay = document.getElementById('menuBestDisplay');
                      if (menuBestDisplay) menuBestDisplay.textContent = bestScore;
                    }
                  }

                  const mappingKey = `device_ip:${pName}:${deviceId}:${ip}`;
                  return fetch(`${SUPABASE_URL}/rest/v1/scores?on_conflict=name`, {
                    method: 'POST',
                    headers: {
                      ...headers,
                      'Content-Type': 'application/json',
                      'Prefer': 'resolution=merge-duplicates'
                    },
                    body: JSON.stringify({ name: mappingKey, score: initialScore })
                  });
                })
                .catch(e => console.error(e))
                .then(() => {
                  checkNameCensorship();
                });
            },
            () => {
              saveNameBtn.innerHTML = '<i class="fas fa-check"></i> Kaydet';
            },
            "Onayla",
            "İptal"
          );
        })
        .catch(err => {
          console.error(err);
          alert("Ağ bağlantısı denetlenirken hata oluştu.");
          saveNameBtn.innerHTML = '<i class="fas fa-check"></i> Kaydet';
        });
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
                if (data.length === 0 || data[0].score === 0) {
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
  // Optimized: Moved to IntersectionObserver in setupLeaderboardObserver() to completely prevent layout thrashing and lag.
}

function submitScore(pName, finalScore, silent = false) {
  if (!LEADERBOARD_CONFIGURED) return Promise.resolve(false);
  if (LEADERBOARD_READ_ONLY_MODE) {
    console.warn('Score submission skipped: leaderboard is in read-only security mode.');
    return Promise.resolve(false);
  }

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
    .then(allowed => {
      if (!allowed) return false;

      // Önce kullanıcının mevcut DB satırını çekelim ki best_score'u doğru hesaplayalım.
      // best_score = max(mevcut_best_score, finalScore). Ayrıca lokal cubex_best ile de karşılaştırılır.
      return fetch(`${SUPABASE_URL}/rest/v1/scores?name=eq.${encodeURIComponent(pName)}&select=score,best_score`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      })
        .then(r => r.ok ? r.json() : [])
        .catch(() => [])
        .then(rows => {
          let dbBest = 0;
          if (rows && rows.length > 0) {
            dbBest = parseInt(rows[0].best_score || 0) || 0;
          }
          const localBest = parseInt(localStorage.getItem('cubex_best') || '0') || 0;
          // Hile kullanılan oyunda best_score'u yükseltmiyoruz
          const cheatActive = (typeof cheatUsedInThisGame !== 'undefined' && cheatUsedInThisGame);
          const candidateBest = cheatActive ? dbBest : Math.max(dbBest, localBest, finalScore);

          // Kullanıcının her zaman "o anki (aktif) oyun puanı" veri tabanına işlenecek.
          // best_score ise tüm zamanların en yükseği olarak büyük değere kilitlenir.
          return fetch(`${SUPABASE_URL}/rest/v1/scores?on_conflict=name`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({ name: pName, score: finalScore, best_score: candidateBest })
          })
            .then(res => {
              if (res.ok) {
                localStorage.setItem('cubex_lastSubmitted', finalScore);
                console.log(`Skor Supabase'e güncellendi (UPSERT): score=${finalScore}, best=${candidateBest}`);
                hasSubmittedThisGame = true;
                return true;
              } else {
                return res.text().then(errText => {
                  console.error("Supabase UPSERT Hatası:", errText);
                  if (!silent) alert("Veritabanı Hatası: " + errText);
                  return false;
                });
              }
            })
            .catch(e => {
              console.error("Skor yüklenemedi", e);
              if (!silent) alert("Bağlantı hatası: " + e.message);
              return false;
            });
        });
    });
}

function deleteActiveScore(pName) {
  if (!pName) return Promise.resolve();
  if (LEADERBOARD_READ_ONLY_MODE) {
    console.warn('Active score reset skipped: leaderboard is in read-only security mode.');
    return Promise.resolve();
  }
  // Aktif (anlık) skoru sıfırla; best_score (tüm zamanlar) korunsun.
  return fetch(`${SUPABASE_URL}/rest/v1/scores?name=eq.${encodeURIComponent(pName)}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ score: 0 })
  })
    .then(res => {
      if (res.ok) {
        console.log(`"${pName}" adlı oyuncunun anlık skoru sıfırlandı (best_score korundu).`);
      }
    })
    .catch(e => {
      console.error("Skor sıfırlanırken hata oluştu:", e);
    });
}

// ---- Leaderboard tab state ----
let activeLbTab = 'live'; // 'live' | 'alltime'

function renderLeaderboardList(listEl, data, playerName, scoreField) {
  listEl.innerHTML = '';
  if (!data || data.length === 0) {
    listEl.innerHTML = '<div class="leaderboard-loading">Henüz hiç skor yok! İlk sen ol!</div>';
    return;
  }
  data.forEach((itemData, index) => {
    const rank = index + 1;
    let rankClass = '';
    if (rank === 1) rankClass = 'top-1';
    else if (rank === 2) rankClass = 'top-2';
    else if (rank === 3) rankClass = 'top-3';

    const isSelf = itemData.name === playerName;
    if (isSelf) rankClass += ' is-self';

    const item = document.createElement('div');
    item.className = `lb-item ${rankClass}`;
    if (isSelf) {
      // self item id sekmeye özgü olur ki observer doğru elemana baksın
      item.dataset.selfItem = '1';
    }
    const scoreVal = itemData[scoreField] != null ? itemData[scoreField] : 0;
    item.innerHTML = `
      <span class="lb-rank">${rank}</span>
      <span class="lb-name">${itemData.name}</span>
      <span class="lb-score">${scoreVal}</span>
    `;
    listEl.appendChild(item);
  });
}

function updateSelfRankSticky(playerName, scoreField, listEl) {
  const stickySelfRank = document.getElementById('stickySelfRank');
  window.selfRank = null;
  if (!playerName || !stickySelfRank) {
    if (stickySelfRank) stickySelfRank.style.display = 'none';
    return Promise.resolve();
  }

  return fetch(`${SUPABASE_URL}/rest/v1/scores?name=eq.${encodeURIComponent(playerName)}&select=${scoreField}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  })
    .then(r => r.ok ? r.json() : [])
    .then(rows => {
      if (!rows || rows.length === 0) {
        stickySelfRank.style.display = 'none';
        return;
      }
      const selfScore = rows[0][scoreField] != null ? rows[0][scoreField] : 0;
      if (!selfScore || selfScore < 1000) {
        stickySelfRank.style.display = 'none';
        return;
      }
      return fetch(`${SUPABASE_URL}/rest/v1/scores?${scoreField}=gt.${selfScore}&select=count`, {
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
              const m = contentRange.match(/\/(\d+)/);
              if (m) selfRank = parseInt(m[1]) + 1;
            }
          }
          document.getElementById('selfRankNum').textContent = `#${selfRank}`;
          document.getElementById('selfRankNameText').textContent = playerName;
          document.getElementById('selfRankScoreText').textContent = `${selfScore} Puan`;
          window.selfRank = selfRank;

          // listEl içinde kullanıcı kendi satırı varsa observer kursun
          if (listEl) {
            const selfRow = listEl.querySelector('[data-self-item="1"]');
            if (selfRow) selfRow.id = 'selfLeaderboardItem';
          }
          setupLeaderboardObserver();
        });
    })
    .catch(e => console.error(e));
}

function loadLeaderboard() {
  const liveListEl = document.getElementById('leaderboardList');
  const allTimeListEl = document.getElementById('leaderboardListAllTime');
  if (!liveListEl || !allTimeListEl) return;

  if (!LEADERBOARD_CONFIGURED) {
    const message = '<div class="leaderboard-loading">Liderlik tablosu su anda yapilandirilmadi.</div>';
    liveListEl.innerHTML = message;
    allTimeListEl.innerHTML = message;
    return;
  }

  liveListEl.innerHTML = '<div class="leaderboard-loading"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</div>';
  allTimeListEl.innerHTML = '<div class="leaderboard-loading"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</div>';
  const stickySelfRank = document.getElementById('stickySelfRank');
  if (stickySelfRank) stickySelfRank.style.display = 'none';
  window.selfRank = null;

  const playerName = localStorage.getItem('cubex_playerName');
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
  };

  // Anlık skor sekmesi (mevcut oyun puanı; >= 1000)
  const liveP = fetch(`${SUPABASE_URL}/rest/v1/scores?score=gte.1000&select=name,score&order=score.desc&limit=25`, { headers })
    .then(res => res.ok ? res.json() : Promise.reject(new Error("API Hatası")))
    .then(data => renderLeaderboardList(liveListEl, data, playerName, 'score'))
    .catch(e => {
      console.error(e);
      liveListEl.innerHTML = '<div class="leaderboard-loading">Skorlar yüklenemedi. İnternetini kontrol et.</div>';
    });

  // Tüm zamanlar sekmesi (best_score; >= 1000)
  const allTimeP = fetch(`${SUPABASE_URL}/rest/v1/scores?best_score=gte.1000&select=name,best_score&order=best_score.desc&limit=25`, { headers })
    .then(res => res.ok ? res.json() : Promise.reject(new Error("API Hatası")))
    .then(data => renderLeaderboardList(allTimeListEl, data, playerName, 'best_score'))
    .catch(e => {
      console.error(e);
      allTimeListEl.innerHTML = '<div class="leaderboard-loading">Skorlar yüklenemedi. İnternetini kontrol et.</div>';
    });

  // Liste yüklendikten sonra aktif sekmeye göre sticky self-rank güncelle
  Promise.all([liveP, allTimeP]).then(() => {
    refreshSelfRankForActiveTab();
  });
}

function refreshSelfRankForActiveTab() {
  const playerName = localStorage.getItem('cubex_playerName');
  if (activeLbTab === 'alltime') {
    updateSelfRankSticky(playerName, 'best_score', document.getElementById('leaderboardListAllTime'));
  } else {
    updateSelfRankSticky(playerName, 'score', document.getElementById('leaderboardList'));
  }
}

function switchLbTab(target) {
  if (target !== 'live' && target !== 'alltime') return;
  if (activeLbTab === target) return;
  activeLbTab = target;

  const tabsEl = document.getElementById('lbTabs');
  const trackEl = document.getElementById('lbTrack');
  if (tabsEl) tabsEl.dataset.active = target;
  if (trackEl) trackEl.classList.toggle('show-alltime', target === 'alltime');

  document.querySelectorAll('.lb-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === target);
  });

  refreshSelfRankForActiveTab();
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.lb-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      sfxClick();
      switchLbTab(btn.dataset.tab);
    });
  });
});

// ---- Developer Mode Logic ----
let cheatStage = 0;
let trCount = 0;
let blCount = 0;
let brCount = 0;
let brTimer = null;
let cheatTimer = null;
let stealthCheatActive = localStorage.getItem('cubex_stealthCheat') === 'true';
let cheatMode = localStorage.getItem('cubex_stealthCheat') === 'true';
let cheatUsedInThisGame = false;
let maintenanceBypassed = false;
let appBootstrapped = false;

function handleCheatTap(clientX, clientY) {
  const w = window.innerWidth;
  const h = window.innerHeight;

  const isBottomRight = clientX > w - 80 && clientY > h - 80;
  if (stealthCheatActive && isBottomRight) {
    brCount++;
    if (brTimer) clearTimeout(brTimer);
    brTimer = setTimeout(() => {
      brCount = 0;
    }, 3000);

    if (brCount === 7) {
      clearTimeout(brTimer);
      brCount = 0;
      stealthCheatActive = false;
      cheatMode = false;
      localStorage.removeItem('cubex_stealthCheat');
      alert("Gizli geliştirici modu kapatıldı.");
      if (typeof newGame === 'function') newGame();
    }
    return;
  }

  const isTopRight = clientX > w - 80 && clientY < 80;
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
  if (e.touches.length > 0) {
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

function _secHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
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
    const hashed = _secHash(code);

    if (hashed === '6kf0nm') {
      if (stealthCheatActive) {
        stealthCheatActive = false;
        cheatMode = false;
        localStorage.removeItem('cubex_stealthCheat');
        alert("Gizli geliştirici modu kapatıldı.");
      } else {
        stealthCheatActive = true;
        cheatMode = true;
        localStorage.setItem('cubex_stealthCheat', 'true');
        alert("Gizli geliştirici modu aktif hale getirildi.");
      }
      cheatUsedInThisGame = false;
      document.getElementById('cheatOverlay').classList.remove('active');
      cheatInput.value = '';
    } else if (hashed === '4bmbzz' || code.toLowerCase() === 'hilex') {
      cheatMode = true;
      cheatUsedInThisGame = true;
      document.getElementById('cheatOverlay').classList.remove('active');
      cheatInput.value = '';

      const cheatIcon = document.getElementById('cheatActiveIcon');
      if (cheatIcon) cheatIcon.style.setProperty('display', 'flex', 'important');

      alert("Geliştirici Modu Aktif!\nArtık tahtadaki herhangi bir bloğa tıklayarak onu yok edebilirsin!");
    } else if (hashed === 'rrwx6m') {
      const maintenanceOverlay = document.getElementById('maintenanceOverlay');
      if (maintenanceOverlay && maintenanceOverlay.classList.contains('active') && !maintenanceBypassed) {
        maintenanceBypassed = true;
        maintenanceOverlay.classList.remove('active');
        document.getElementById('cheatOverlay').classList.remove('active');
        cheatInput.value = '';
        bootstrapApp();
        alert("Bakım modu başarıyla atlatıldı.");
      } else {
        document.getElementById('cheatOverlay').classList.remove('active');
        cheatInput.value = '';
        alert("Kurucu veritabanı paneli güvenlik nedeniyle kapalı. Yönetim işlemlerini Supabase panelinden yapın.");
      }
    } else {
      alert("Hatalı kod.");
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
}, { passive: false });

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
      if (true) {
        addScore(500); // Sadece normal hilede puan ekle
        createConfetti();
      }
      renderBoard();
      saveGameState();
    }
  }
}

