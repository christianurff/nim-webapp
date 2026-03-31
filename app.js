// ==================== CONSTANTS ====================
const COLORS = {
    red:    { value: '#FF3B30', name: 'rot',    position: 1 },
    blue:   { value: '#007AFF', name: 'blau',   position: 2 },
    yellow: { value: '#FFCC00', name: 'gelb',   position: 3 },
    green:  { value: '#34C759', name: 'grün',   position: 4 },
    orange: { value: '#FF9500', name: 'orange', position: 5 },
    purple: { value: '#AF52DE', name: 'violett', position: 6 },
    none:   { value: '#8E8E93', name: '',       position: 0 }
};

const CIRCLES_LABELS = {
    1: '1 Plättchen',
    2: '1 oder 2 Plättchen',
    3: '1, 2 oder 3 Plättchen',
    4: '1, 2, 3 oder 4 Plättchen'
};

const THUMB_UP = '👍';
const THUMB_DOWN = '👎';

// ==================== STATE ====================
let state = {
    numberOfTiles: 10,
    numberOfMaximalCircles: 2,
    winMode: 'lastWins',
    leftPlayerColor: 'red',
    rightPlayerColor: 'blue',
    leftPlayerName: '',
    rightPlayerName: '',
    numberMode: 0, // 0=none, 1=every5th, 2=all
    archive: []
};

// ==================== PERSISTENCE ====================
function loadState() {
    const saved = localStorage.getItem('nimState');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            Object.assign(state, parsed);
        } catch (e) { /* ignore */ }
    }
}

function saveState() {
    localStorage.setItem('nimState', JSON.stringify(state));
}

function saveSettings() {
    saveState();
}

// ==================== NAVIGATION ====================
let currentScreen = 'screen-settings';

function navigateTo(targetId, direction) {
    const current = document.getElementById(currentScreen);
    const target = document.getElementById(targetId);

    if (direction === 'forward') {
        current.classList.remove('active');
        current.classList.add('slide-out-left');
        target.classList.add('slide-in-right');
    } else {
        current.classList.remove('active');
        current.classList.add('slide-out-right');
        target.classList.add('slide-in-left');
    }

    setTimeout(() => {
        current.classList.remove('slide-out-left', 'slide-out-right', 'active');
        target.classList.remove('slide-in-right', 'slide-in-left');
        target.classList.add('active');
        currentScreen = targetId;
    }, 300);
}

// ==================== DIALOG ====================
function showDialog(title, message, buttons) {
    const overlay = document.getElementById('dialog-overlay');
    document.getElementById('dialog-title').textContent = title;
    document.getElementById('dialog-message').textContent = message;
    const btnContainer = document.getElementById('dialog-buttons');
    btnContainer.innerHTML = '';
    buttons.forEach(btn => {
        const el = document.createElement('button');
        el.className = 'dialog-btn';
        if (btn.destructive) el.classList.add('destructive');
        if (btn.bold) el.classList.add('bold');
        if (btn.cancel) el.classList.add('cancel');
        el.textContent = btn.text;
        el.onclick = () => {
            overlay.classList.remove('visible');
            if (btn.action) btn.action();
        };
        btnContainer.appendChild(el);
    });
    overlay.classList.add('visible');
}

// ==================== TILE BAR RENDERING ====================
function createTileBar(container, numberOfTiles, options = {}) {
    const {
        tileSize = 0,
        showThumbOnLast = false,
        thumbMode = 'information', // information, game, result, archive, research
        winMode = 'lastWins',
        colors = null,       // array of color keys for each tile
        maxCircles = 0,      // show gray circles for first N tiles (preview)
        interactive = false,
        align = 'center',
        archiveMode = false,
    } = options;

    container.innerHTML = '';

    // Calculate tile size based on available width
    const containerWidth = container.clientWidth || container.parentElement?.clientWidth || 600;
    let calculatedSize = tileSize;
    if (!calculatedSize) {
        const numLargeGaps = Math.floor((numberOfTiles - 1) / 5);
        const numSmallGaps = (numberOfTiles - 1) - numLargeGaps;
        const totalGaps = numSmallGaps * 3 + numLargeGaps * 9;
        calculatedSize = Math.min(
            archiveMode ? 30 : 55,
            Math.floor((containerWidth - totalGaps - 16) / numberOfTiles)
        );
        calculatedSize = Math.max(archiveMode ? 18 : 28, calculatedSize);
    }

    // Labels row
    const labelsDiv = document.createElement('div');
    labelsDiv.className = 'tile-bar-labels';
    labelsDiv.style.justifyContent = align === 'center' ? 'center' : 'flex-start';

    // Tiles row
    const tilesDiv = document.createElement('div');
    tilesDiv.className = 'tile-bar';
    tilesDiv.style.justifyContent = align === 'center' ? 'center' : 'flex-start';

    const tiles = [];
    for (let i = 0; i < numberOfTiles; i++) {
        // Gap before tile (not before first)
        if (i > 0) {
            const gap = document.createElement('div');
            gap.className = (i % 5 === 0) ? 'tile-gap-large' : 'tile-gap-small';
            tilesDiv.appendChild(gap);

            const labelGap = document.createElement('div');
            labelGap.className = (i % 5 === 0) ? 'tile-gap-large' : 'tile-gap-small';
            labelsDiv.appendChild(labelGap);
        }

        // Label
        const label = document.createElement('div');
        label.className = 'tile-label';
        label.style.width = calculatedSize + 'px';
        label.style.fontSize = archiveMode ? '10px' : '14px';
        label.textContent = (i + 1).toString();
        updateLabelVisibility(label, i + 1);
        labelsDiv.appendChild(label);

        // Tile
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.style.width = calculatedSize + 'px';
        tile.style.height = calculatedSize + 'px';
        tile.dataset.index = i;
        tile.dataset.color = 'none';
        tile.dataset.editable = 'false';

        // Draw color circle if colors array provided
        if (colors && colors[i] && colors[i] !== 'none') {
            const circle = document.createElement('div');
            circle.className = 'circle';
            circle.style.backgroundColor = COLORS[colors[i]].value;
            tile.appendChild(circle);
            tile.dataset.color = colors[i];
        }

        // Draw gray circles for preview
        if (maxCircles > 0 && i < maxCircles && (!colors || !colors[i] || colors[i] === 'none')) {
            const circle = document.createElement('div');
            circle.className = 'circle';
            circle.style.backgroundColor = COLORS.none.value;
            tile.appendChild(circle);
        }

        // Thumb on specific tiles
        if (i + 1 >= 5) {
            const thumb = document.createElement('div');
            thumb.className = 'thumb';
            thumb.style.fontSize = Math.round(calculatedSize * 0.35) + 'px';
            const isLastTile = (i === numberOfTiles - 1);

            if (showThumbOnLast && isLastTile) {
                thumb.textContent = winMode === 'lastWins' ? THUMB_UP : THUMB_DOWN;
                if (thumbMode === 'game') {
                    thumb.style.opacity = '0.4';
                } else if (thumbMode === 'result' || thumbMode === 'archive') {
                    thumb.style.opacity = '1';
                } else if (thumbMode === 'information') {
                    thumb.style.opacity = '0.6';
                } else if (thumbMode === 'research') {
                    thumb.style.opacity = '0.5';
                }
            } else if (showThumbOnLast && !isLastTile) {
                thumb.textContent = winMode === 'lastWins' ? THUMB_UP : THUMB_DOWN;
                thumb.style.opacity = '0';
            }
            tile.appendChild(thumb);
        }

        tiles.push(tile);
        tilesDiv.appendChild(tile);
    }

    container.appendChild(labelsDiv);
    container.appendChild(tilesDiv);

    return tiles;
}

function updateLabelVisibility(label, index) {
    switch (state.numberMode) {
        case 0:
            label.style.opacity = '0';
            break;
        case 1:
            label.style.opacity = (index % 5 === 0) ? '1' : '0';
            break;
        case 2:
            label.style.opacity = '1';
            break;
    }
}

function updateAllLabels() {
    document.querySelectorAll('.tile-label').forEach(label => {
        const index = parseInt(label.textContent);
        if (!isNaN(index)) {
            updateLabelVisibility(label, index);
        }
    });
}

// ==================== NUMBER MODE ====================
function setupNumberMode(segmentId) {
    const control = document.getElementById(segmentId);
    control.querySelectorAll('.segment').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.value) === state.numberMode);
        btn.onclick = () => {
            state.numberMode = parseInt(btn.dataset.value);
            saveSettings();
            // Update all number mode controls
            document.querySelectorAll('.segment-control[id$="number-mode"]').forEach(ctrl => {
                ctrl.querySelectorAll('.segment').forEach(b => {
                    b.classList.toggle('active', parseInt(b.dataset.value) === state.numberMode);
                });
            });
            updateAllLabels();
        };
    });
}

// ==================== SETTINGS SCREEN ====================
function initSettings() {
    // Fields stepper
    setupStepper('fields-stepper', () => state.numberOfTiles, 5, 20,
        val => {
            state.numberOfTiles = val;
            saveSettings();
            updateSettingsPreview();
            updateSettingsLabels();
        }
    );

    // Circles stepper
    setupStepper('circles-stepper', () => state.numberOfMaximalCircles, 1, 4,
        val => {
            state.numberOfMaximalCircles = val;
            saveSettings();
            updateSettingsPreview();
            updateSettingsLabels();
        }
    );

    // Win mode segment
    const winSegment = document.getElementById('winmode-segment');
    winSegment.querySelectorAll('.segment').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === state.winMode);
        btn.onclick = () => {
            state.winMode = btn.dataset.value;
            winSegment.querySelectorAll('.segment').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            saveSettings();
            updateSettingsPreview();
            updateSettingsLabels();
        };
    });

    // Player names
    const leftNameInput = document.getElementById('left-player-name');
    const rightNameInput = document.getElementById('right-player-name');
    leftNameInput.value = state.leftPlayerName;
    rightNameInput.value = state.rightPlayerName;
    leftNameInput.oninput = () => { state.leftPlayerName = leftNameInput.value; saveSettings(); };
    rightNameInput.oninput = () => { state.rightPlayerName = rightNameInput.value; saveSettings(); };

    // Color circles
    updateColorCircles();
    document.getElementById('left-color-circle').onclick = () => openColorPicker('left');
    document.getElementById('right-color-circle').onclick = () => openColorPicker('right');

    // Number mode
    setupNumberMode('settings-number-mode');

    // Start button
    document.getElementById('btn-start-game').onclick = () => {
        navigateTo('screen-game', 'forward');
        // Init game after transition so tile bar has correct width
        setTimeout(() => initGame(), 50);
    };

    updateSettingsLabels();
    updateSettingsPreview();
}

function updateSettingsLabels() {
    document.getElementById('fields-label').textContent = `${state.numberOfTiles} Felder`;
    document.getElementById('circles-label').textContent = CIRCLES_LABELS[state.numberOfMaximalCircles];
    document.getElementById('winmode-label').textContent =
        state.winMode === 'lastWins' ? 'letztes Feld gewinnt' : 'letztes Feld verliert';
}

function updateSettingsPreview() {
    const container = document.getElementById('settings-preview-bar');
    // iOS app creates 20 tiles and hides ones beyond numberOfTiles
    // We replicate this by only showing the active number of tiles
    const tiles = createTileBar(container, state.numberOfTiles, {
        showThumbOnLast: true,
        thumbMode: 'information',
        winMode: state.winMode,
        maxCircles: state.numberOfMaximalCircles,
    });
}

function updateColorCircles() {
    document.getElementById('left-color-circle').style.backgroundColor = COLORS[state.leftPlayerColor].value;
    document.getElementById('right-color-circle').style.backgroundColor = COLORS[state.rightPlayerColor].value;
}

// ==================== COLOR PICKER ====================
let colorPickerTarget = null;

function openColorPicker(player) {
    colorPickerTarget = player;
    const overlay = document.getElementById('color-picker-overlay');
    const currentColor = player === 'left' ? state.leftPlayerColor : state.rightPlayerColor;

    overlay.querySelectorAll('.color-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.color === currentColor);
        opt.onclick = () => selectColor(opt.dataset.color);
    });

    overlay.classList.add('visible');
}

function selectColor(color) {
    const otherPlayer = colorPickerTarget === 'left' ? 'right' : 'left';
    const currentPlayerKey = colorPickerTarget === 'left' ? 'leftPlayerColor' : 'rightPlayerColor';
    const otherPlayerKey = colorPickerTarget === 'left' ? 'rightPlayerColor' : 'leftPlayerColor';

    const oldColor = state[currentPlayerKey];

    // If other player has this color, swap
    if (state[otherPlayerKey] === color) {
        state[otherPlayerKey] = oldColor;
    }

    state[currentPlayerKey] = color;
    saveSettings();
    updateColorCircles();

    document.getElementById('color-picker-overlay').classList.remove('visible');
    colorPickerTarget = null;
}

// Color picker overlay close on background click (initialized in DOMContentLoaded)

// ==================== STEPPER ====================
function setupStepper(stepperId, getVal, min, max, onChange) {
    const stepper = document.getElementById(stepperId);
    const minusBtn = stepper.querySelector('.stepper-minus');
    const plusBtn = stepper.querySelector('.stepper-plus');

    function update() {
        const val = getVal();
        minusBtn.disabled = val <= min;
        plusBtn.disabled = val >= max;
    }

    minusBtn.onclick = () => {
        const val = getVal();
        if (val > min) {
            onChange(val - 1);
            update();
        }
    };

    plusBtn.onclick = () => {
        const val = getVal();
        if (val < max) {
            onChange(val + 1);
            update();
        }
    };

    update();
    return { update };
}

// ==================== GAME SCREEN ====================
let gameState = {
    playMode: 'noPlaying', // noPlaying, leftPlaying, rightPlaying
    currentCircles: 0,
    tiles: [],
    tileColors: [],
    numberOfTiles: 0,
    numberOfMaximalCircles: 0,
    winMode: 'lastWins',
    firstPlayerName: 'Links',
    secondPlayerName: 'Rechts',
    firstColor: 'red',
    secondColor: 'blue',
    gameOver: false,
};

function initGame() {
    gameState.numberOfTiles = state.numberOfTiles;
    gameState.numberOfMaximalCircles = state.numberOfMaximalCircles;
    gameState.winMode = state.winMode;
    gameState.firstPlayerName = state.leftPlayerName || 'Links';
    gameState.secondPlayerName = state.rightPlayerName || 'Rechts';
    gameState.firstColor = state.leftPlayerColor;
    gameState.secondColor = state.rightPlayerColor;
    gameState.playMode = 'noPlaying';
    gameState.currentCircles = 0;
    gameState.gameOver = false;
    gameState.tileColors = new Array(gameState.numberOfTiles).fill('none');

    // Setup number mode
    setupNumberMode('game-number-mode');

    // Render tile bar
    const container = document.getElementById('game-tile-bar');
    gameState.tiles = createTileBar(container, gameState.numberOfTiles, {
        showThumbOnLast: true,
        thumbMode: 'game',
        winMode: gameState.winMode,
        interactive: true,
    });

    // Make tiles clickable
    gameState.tiles.forEach((tile, i) => {
        tile.onclick = () => handleTileClick(i);
    });

    // Mark first tile as editable
    if (gameState.tiles.length > 0) {
        gameState.tiles[0].dataset.editable = 'true';
    }

    // Setup player buttons
    const leftBtn = document.getElementById('left-player-btn');
    const rightBtn = document.getElementById('right-player-btn');

    leftBtn.style.backgroundColor = COLORS[gameState.firstColor].value;
    rightBtn.style.backgroundColor = COLORS[gameState.secondColor].value;

    // Text color for yellow
    leftBtn.style.color = (gameState.firstColor === 'yellow') ? 'rgba(0,0,0,0.6)' : 'white';
    rightBtn.style.color = (gameState.secondColor === 'yellow') ? 'rgba(0,0,0,0.6)' : 'white';

    leftBtn.textContent = gameState.firstPlayerName;
    rightBtn.textContent = gameState.secondPlayerName;
    leftBtn.disabled = false;
    rightBtn.disabled = false;
    leftBtn.classList.remove('faded');
    rightBtn.classList.remove('faded');

    leftBtn.onclick = () => handleLeftPlayerButton();
    rightBtn.onclick = () => handleRightPlayerButton();

    document.getElementById('task-label').textContent = 'Wer beginnt?';
    document.getElementById('btn-archive-game').style.display = 'none';

    // Back button
    document.getElementById('btn-back-settings').onclick = () => {
        navigateTo('screen-settings', 'back');
        // Refresh settings preview after navigating back
        setTimeout(() => updateSettingsPreview(), 350);
    };

    // Archive nav button
    document.getElementById('btn-goto-archive').onclick = () => {
        navigateTo('screen-archive', 'forward');
        // Init archive after transition starts so DOM is ready
        setTimeout(() => initArchive(), 350);
    };

    // New game button
    document.getElementById('btn-new-game').onclick = () => resetGame();

    // Archive game button
    document.getElementById('btn-archive-game').onclick = () => archiveCurrentGame();
}

function resetGame() {
    gameState.playMode = 'noPlaying';
    gameState.currentCircles = 0;
    gameState.gameOver = false;
    gameState.tileColors = new Array(gameState.numberOfTiles).fill('none');

    const container = document.getElementById('game-tile-bar');
    gameState.tiles = createTileBar(container, gameState.numberOfTiles, {
        showThumbOnLast: true,
        thumbMode: 'game',
        winMode: gameState.winMode,
        interactive: true,
    });

    gameState.tiles.forEach((tile, i) => {
        tile.onclick = () => handleTileClick(i);
    });

    if (gameState.tiles.length > 0) {
        gameState.tiles[0].dataset.editable = 'true';
    }

    const leftBtn = document.getElementById('left-player-btn');
    const rightBtn = document.getElementById('right-player-btn');
    leftBtn.textContent = gameState.firstPlayerName;
    rightBtn.textContent = gameState.secondPlayerName;
    leftBtn.disabled = false;
    rightBtn.disabled = false;
    leftBtn.classList.remove('faded');
    rightBtn.classList.remove('faded');

    document.getElementById('task-label').textContent = 'Wer beginnt?';
    document.getElementById('btn-archive-game').style.display = 'none';
}

function handleLeftPlayerButton() {
    if (gameState.gameOver) return;

    const leftBtn = document.getElementById('left-player-btn');
    const rightBtn = document.getElementById('right-player-btn');
    const taskLabel = document.getElementById('task-label');

    switch (gameState.playMode) {
        case 'noPlaying':
            gameState.currentCircles = 0;
            taskLabel.textContent = `${gameState.firstPlayerName} ist dran.\n\nLege höchstens ${gameState.numberOfMaximalCircles} Plättchen.`;
            rightBtn.textContent = '';
            leftBtn.textContent = 'fertig';
            rightBtn.disabled = true;
            rightBtn.classList.add('faded');
            gameState.playMode = 'leftPlaying';
            break;

        case 'leftPlaying':
            if (gameState.currentCircles === 0) {
                taskLabel.textContent = `${gameState.firstPlayerName} ist dran.\n\nDu musst mindestens ein Plättchen legen.`;
            } else {
                gameState.currentCircles = 0;
                leftBtn.textContent = '';
                rightBtn.textContent = 'fertig';
                taskLabel.textContent = `${gameState.secondPlayerName} ist dran.\n\nLege höchstens ${gameState.numberOfMaximalCircles} Plättchen.`;
                leftBtn.disabled = true;
                leftBtn.classList.add('faded');
                rightBtn.disabled = false;
                rightBtn.classList.remove('faded');
                gameState.playMode = 'rightPlaying';
            }
            break;
    }
}

function handleRightPlayerButton() {
    if (gameState.gameOver) return;

    const leftBtn = document.getElementById('left-player-btn');
    const rightBtn = document.getElementById('right-player-btn');
    const taskLabel = document.getElementById('task-label');

    switch (gameState.playMode) {
        case 'noPlaying':
            gameState.currentCircles = 0;
            taskLabel.textContent = `${gameState.secondPlayerName} ist dran.\n\nLege höchstens ${gameState.numberOfMaximalCircles} Plättchen.`;
            leftBtn.textContent = '';
            rightBtn.textContent = 'fertig';
            leftBtn.disabled = true;
            leftBtn.classList.add('faded');
            gameState.playMode = 'rightPlaying';
            break;

        case 'rightPlaying':
            if (gameState.currentCircles === 0) {
                taskLabel.textContent = `${gameState.secondPlayerName} ist dran.\n\nDu musst mindestens ein Plättchen legen.`;
            } else {
                gameState.currentCircles = 0;
                rightBtn.textContent = '';
                leftBtn.textContent = 'fertig';
                taskLabel.textContent = `${gameState.firstPlayerName} ist dran.\n\nLege höchstens ${gameState.numberOfMaximalCircles} Plättchen.`;
                rightBtn.disabled = true;
                rightBtn.classList.add('faded');
                leftBtn.disabled = false;
                leftBtn.classList.remove('faded');
                gameState.playMode = 'leftPlaying';
            }
            break;
    }
}

function handleTileClick(index) {
    if (gameState.gameOver) return;
    const tile = gameState.tiles[index];
    const taskLabel = document.getElementById('task-label');
    const currentPlayerName = gameState.playMode === 'leftPlaying' ? gameState.firstPlayerName : gameState.secondPlayerName;

    if (gameState.playMode === 'noPlaying') {
        taskLabel.textContent = 'Du musst erst auswählen, wer beginnt.';
        return;
    }

    if (gameState.tileColors[index] !== 'none') return;

    // Check order: must place left to right
    if (index > 0 && gameState.tileColors[index - 1] === 'none') {
        taskLabel.textContent = `${currentPlayerName} ist dran.\n\nDu musst die Plättchen der Reihenfolge nach von links nach rechts legen.`;
        return;
    }

    // Check max circles
    if (gameState.currentCircles >= gameState.numberOfMaximalCircles) {
        taskLabel.textContent = `${currentPlayerName} ist dran.\n\nDu darfst nicht mehr als ${gameState.numberOfMaximalCircles} Plättchen legen.`;
        return;
    }

    // Place circle
    const color = gameState.playMode === 'leftPlaying' ? gameState.firstColor : gameState.secondColor;
    gameState.tileColors[index] = color;
    gameState.currentCircles++;

    const circle = document.createElement('div');
    circle.className = 'circle just-placed';
    circle.style.backgroundColor = COLORS[color].value;
    tile.appendChild(circle);
    tile.dataset.color = color;
    tile.classList.add('tile-filled');

    // Make next tile editable
    if (index + 1 < gameState.numberOfTiles) {
        gameState.tiles[index + 1].dataset.editable = 'true';
    }

    // Update task label
    taskLabel.textContent = `${currentPlayerName} ist dran.\n\nLege höchstens ${gameState.numberOfMaximalCircles} Plättchen.`;

    // Check if game is over (last tile filled)
    if (index === gameState.numberOfTiles - 1) {
        endGame(color);
    }
}

function endGame(lastColor) {
    gameState.gameOver = true;
    const leftBtn = document.getElementById('left-player-btn');
    const rightBtn = document.getElementById('right-player-btn');
    const taskLabel = document.getElementById('task-label');

    leftBtn.disabled = true;
    leftBtn.classList.add('faded');
    leftBtn.textContent = '';
    rightBtn.disabled = true;
    rightBtn.classList.add('faded');
    rightBtn.textContent = '';

    let winner;
    if (lastColor === gameState.firstColor && gameState.winMode === 'lastWins') {
        winner = gameState.firstPlayerName;
    } else if (lastColor === gameState.secondColor && gameState.winMode === 'lastLoses') {
        winner = gameState.firstPlayerName;
    } else if (lastColor === gameState.secondColor && gameState.winMode === 'lastWins') {
        winner = gameState.secondPlayerName;
    } else if (lastColor === gameState.firstColor && gameState.winMode === 'lastLoses') {
        winner = gameState.secondPlayerName;
    }

    taskLabel.textContent = `${winner} hat gewonnen.`;

    // Show thumb on last tile
    const lastTile = gameState.tiles[gameState.numberOfTiles - 1];
    const thumb = lastTile.querySelector('.thumb');
    if (thumb) {
        thumb.style.opacity = '1';
    }

    document.getElementById('btn-archive-game').style.display = '';
}

function archiveCurrentGame() {
    let maxGameNumber = 0;
    state.archive.forEach(e => { maxGameNumber = Math.max(maxGameNumber, e.gameNumber); });

    const entry = {
        listOfColors: [...gameState.tileColors],
        winMode: gameState.winMode,
        numberOfMaximalCircles: gameState.numberOfMaximalCircles,
        leftPlayerColor: gameState.firstColor,
        rightPlayerColor: gameState.secondColor,
        leftPlayerName: state.leftPlayerName || '',
        rightPlayerName: state.rightPlayerName || '',
        gameNumber: maxGameNumber + 1
    };

    state.archive.push(entry);
    saveState();

    // Visual feedback - flash the archive button
    const archiveBtn = document.getElementById('btn-archive-game');
    archiveBtn.textContent = 'Archiviert!';
    archiveBtn.style.opacity = '0.6';
    setTimeout(() => {
        archiveBtn.style.display = 'none';
        archiveBtn.textContent = 'Spiel archivieren';
        archiveBtn.style.opacity = '1';
    }, 800);

    resetGame();
}

// ==================== ARCHIVE SCREEN ====================
function initArchive() {
    setupNumberMode('archive-number-mode');
    renderArchive();

    document.getElementById('btn-back-game').onclick = () => navigateTo('screen-game', 'back');

    // Delete all
    document.getElementById('btn-delete-all').onclick = () => {
        if (state.archive.length === 0) return;
        showDialog('Alle Spiele löschen?', 'Möchtest du wirklich alle Spiele löschen?', [
            { text: 'Abbrechen', cancel: true },
            { text: 'Löschen', destructive: true, action: () => {
                state.archive = [];
                saveState();
                renderArchive();
            }}
        ]);
    };

    // Export all
    document.getElementById('btn-export-all').onclick = () => exportArchive();

    // PDF export
    document.getElementById('btn-pdf-archive').onclick = () => exportPdf();

    // Import
    document.getElementById('btn-import-archive').onclick = () => {
        document.getElementById('import-file-input').click();
    };
    document.getElementById('import-file-input').onchange = (e) => {
        const file = e.target.files[0];
        if (file) importArchive(file);
        e.target.value = '';
    };

    // Sort
    document.getElementById('btn-sort-archive').onclick = () => {
        document.getElementById('sort-overlay').classList.add('visible');
    };

    document.querySelectorAll('.sort-option').forEach(btn => {
        btn.onclick = () => {
            document.getElementById('sort-overlay').classList.remove('visible');
            if (btn.dataset.sort) {
                sortArchive(btn.dataset.sort);
            }
        };
    });

    document.getElementById('sort-overlay').onclick = (e) => {
        if (e.target === e.currentTarget) {
            e.currentTarget.classList.remove('visible');
        }
    };
}

function renderArchive() {
    const scroll = document.getElementById('archive-scroll');
    const empty = document.getElementById('archive-empty');

    // Clear old cards (keep empty message)
    scroll.querySelectorAll('.archive-card').forEach(c => c.remove());

    if (state.archive.length === 0) {
        empty.style.display = '';
        return;
    }
    empty.style.display = 'none';

    state.archive.forEach((entry, idx) => {
        const card = document.createElement('div');
        card.className = 'archive-card';
        card.dataset.index = idx;
        card.draggable = true;

        // Drag-and-drop events
        card.addEventListener('dragstart', (e) => {
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', idx.toString());
        });
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            document.querySelectorAll('.archive-card.drag-over').forEach(c => c.classList.remove('drag-over'));
        });
        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            card.classList.add('drag-over');
        });
        card.addEventListener('dragleave', () => {
            card.classList.remove('drag-over');
        });
        card.addEventListener('drop', (e) => {
            e.preventDefault();
            card.classList.remove('drag-over');
            const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
            const toIdx = parseInt(card.dataset.index);
            if (fromIdx !== toIdx && !isNaN(fromIdx) && !isNaN(toIdx)) {
                const [moved] = state.archive.splice(fromIdx, 1);
                state.archive.splice(toIdx, 0, moved);
                saveState();
                renderArchive();
            }
        });

        const leftName = entry.leftPlayerName || 'Links';
        const rightName = entry.rightPlayerName || 'Rechts';

        // Header
        const header = document.createElement('div');
        header.className = 'archive-card-header';
        const numTiles = entry.listOfColors.length;
        const winModeText = entry.winMode === 'lastWins' ? 'letztes Feld gewinnt' : 'letztes Feld verliert';
        header.innerHTML = `<span class="game-number">Spiel ${entry.gameNumber}</span>
            <span class="drag-handle" title="Ziehen zum Neuordnen">&#x2630;</span>
            <span>${numTiles} Felder · ${CIRCLES_LABELS[entry.numberOfMaximalCircles]} · ${winModeText}</span>`;

        // Players
        const players = document.createElement('div');
        players.className = 'archive-card-players';
        players.innerHTML = `
            <span class="archive-player-dot" style="background:${COLORS[entry.leftPlayerColor].value}"></span>
            <span>${leftName}</span>
            <span style="color:var(--color-secondary)">vs.</span>
            <span class="archive-player-dot" style="background:${COLORS[entry.rightPlayerColor].value}"></span>
            <span>${rightName}</span>
        `;

        // Tile bar
        const tileBarWrap = document.createElement('div');
        tileBarWrap.className = 'archive-card-tilebar';
        const tileBarContainer = document.createElement('div');
        tileBarContainer.className = 'tile-bar-container';
        tileBarWrap.appendChild(tileBarContainer);

        // Render after DOM insertion so width is available
        requestAnimationFrame(() => {
            createTileBar(tileBarContainer, entry.listOfColors.length, {
                colors: entry.listOfColors,
                showThumbOnLast: true,
                thumbMode: 'archive',
                winMode: entry.winMode,
                archiveMode: true,
            });
        });

        // Actions
        const actions = document.createElement('div');
        actions.className = 'archive-card-actions';

        const researchBtn = document.createElement('button');
        researchBtn.className = 'archive-action-btn research';
        researchBtn.textContent = 'Spiel untersuchen';
        researchBtn.onclick = () => {
            navigateTo('screen-research', 'forward');
            setTimeout(() => initResearch(entry), 350);
        };

        const copyBtn = document.createElement('button');
        copyBtn.className = 'archive-action-btn export';
        copyBtn.textContent = 'Kopieren';
        copyBtn.onclick = () => {
            const json = JSON.stringify([entry], null, 2);
            navigator.clipboard.writeText(json).then(() => {
                copyBtn.textContent = 'Kopiert!';
                setTimeout(() => { copyBtn.textContent = 'Kopieren'; }, 1000);
            });
        };

        const exportBtn = document.createElement('button');
        exportBtn.className = 'archive-action-btn export';
        exportBtn.textContent = 'Exportieren';
        exportBtn.onclick = () => exportSingleGame(entry);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'archive-action-btn delete';
        deleteBtn.textContent = 'Löschen';
        deleteBtn.onclick = () => {
            showDialog('Spiel löschen?', `Möchtest du wirklich Spiel ${entry.gameNumber} löschen?`, [
                { text: 'Abbrechen', cancel: true },
                { text: 'Löschen', destructive: true, action: () => {
                    state.archive.splice(idx, 1);
                    saveState();
                    renderArchive();
                }}
            ]);
        };

        actions.appendChild(researchBtn);
        actions.appendChild(copyBtn);
        actions.appendChild(exportBtn);
        actions.appendChild(deleteBtn);

        card.appendChild(header);
        card.appendChild(players);
        card.appendChild(tileBarWrap);
        card.appendChild(actions);
        scroll.appendChild(card);
    });
}

function sortArchive(sortType) {
    switch (sortType) {
        case 'length-asc':
            state.archive.sort((a, b) => a.listOfColors.length - b.listOfColors.length);
            break;
        case 'length-desc':
            state.archive.sort((a, b) => b.listOfColors.length - a.listOfColors.length);
            break;
        case 'chrono-asc':
            state.archive.sort((a, b) => a.gameNumber - b.gameNumber);
            break;
        case 'chrono-desc':
            state.archive.sort((a, b) => b.gameNumber - a.gameNumber);
            break;
        case 'first-left':
            state.archive.sort((a, b) => {
                const aIsLeft = a.listOfColors[0] === a.leftPlayerColor;
                const bIsLeft = b.listOfColors[0] === b.leftPlayerColor;
                if (aIsLeft === bIsLeft) return 0;
                return aIsLeft ? -1 : 1;
            });
            break;
        case 'first-right':
            state.archive.sort((a, b) => {
                const aIsRight = a.listOfColors[0] === a.rightPlayerColor;
                const bIsRight = b.listOfColors[0] === b.rightPlayerColor;
                if (aIsRight === bIsRight) return 0;
                return aIsRight ? -1 : 1;
            });
            break;
    }
    saveState();
    renderArchive();
}

function exportArchive() {
    if (state.archive.length === 0) return;
    showDialog('Exportieren', 'Sollen die Spielernamen anonymisiert werden?', [
        { text: 'Abbrechen', cancel: true },
        { text: 'Mit Namen', action: () => downloadJson(state.archive, 'Nim-Archiv.nim', false) },
        { text: 'Anonymisiert', bold: true, action: () => downloadJson(state.archive, 'Nim-Archiv.nim', true) },
    ]);
}

function exportSingleGame(entry) {
    downloadJson([entry], `Nim-Spiel-${entry.gameNumber}.nim`, false);
}

function downloadJson(data, filename, anonymize) {
    let exportData = data;
    if (anonymize) {
        exportData = data.map(e => ({
            ...e,
            leftPlayerName: '',
            rightPlayerName: ''
        }));
    }
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function importArchive(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data)) throw new Error('Invalid format');

            // Validate entries
            for (const entry of data) {
                if (!entry.listOfColors || !entry.winMode || !entry.numberOfMaximalCircles) {
                    throw new Error('Invalid entry');
                }
                if (entry.numberOfMaximalCircles < 1 || entry.numberOfMaximalCircles > 4) {
                    throw new Error('Invalid circle count');
                }
            }

            if (state.archive.length === 0) {
                state.archive = data;
                saveState();
                renderArchive();
            } else {
                showDialog('Neues Archiv öffnen', 'Was möchtest du tun?', [
                    { text: 'Abbrechen', cancel: true },
                    { text: 'Altes Archiv überschreiben', action: () => {
                        state.archive = data;
                        saveState();
                        renderArchive();
                    }},
                    { text: 'Altes Archiv erweitern', action: () => {
                        state.archive = state.archive.concat(data);
                        saveState();
                        renderArchive();
                    }}
                ]);
            }
        } catch (err) {
            showDialog('Fehler', 'Die Datei kann nicht gelesen werden.', [
                { text: 'OK', bold: true }
            ]);
        }
    };
    reader.readAsText(file);
}

// ==================== PDF EXPORT ====================
function exportPdf() {
    if (state.archive.length === 0) return;

    const printArea = document.getElementById('print-area');
    const now = new Date();
    const dateStr = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

    let html = `<div class="print-header">
        <h1>Nim-Archiv</h1>
        <div class="print-date">${dateStr}, ${timeStr}</div>
    </div>`;

    state.archive.forEach((entry, idx) => {
        const leftName = entry.leftPlayerName || 'Links';
        const rightName = entry.rightPlayerName || 'Rechts';
        const numTiles = entry.listOfColors.length;

        let tilesHtml = '';
        for (let i = 0; i < numTiles; i++) {
            // Add gap before tile (not before first)
            if (i > 0) {
                tilesHtml += (i % 5 === 0)
                    ? '<span class="print-gap-large"></span>'
                    : '<span class="print-gap-small"></span>';
            }

            const color = entry.listOfColors[i];
            const isLast = (i === numTiles - 1);

            let inner = '';
            if (color && color !== 'none') {
                inner = `<span class="print-circle" style="background-color:${COLORS[color].value} !important;"></span>`;
            }
            if (isLast) {
                const thumb = entry.winMode === 'lastWins' ? '\u{1F44D}' : '\u{1F44E}';
                inner += `<span class="print-thumb">${thumb}</span>`;
            }
            tilesHtml += `<span class="print-tile">${inner}</span>`;
        }

        const winText = entry.winMode === 'lastWins' ? 'letztes Feld gewinnt' : 'letztes Feld verliert';

        html += `<div class="print-game">
            <span class="print-game-number">${idx + 1}</span>
            <span class="print-tiles">${tilesHtml}</span>
            <span class="print-players">
                <span class="print-player-dot" style="background-color:${COLORS[entry.leftPlayerColor].value} !important;"></span>${leftName}
                vs.
                <span class="print-player-dot" style="background-color:${COLORS[entry.rightPlayerColor].value} !important;"></span>${rightName}
                · ${numTiles} Felder · ${CIRCLES_LABELS[entry.numberOfMaximalCircles]} · ${winText}
            </span>
        </div>`;
    });

    printArea.innerHTML = html;
    window.print();
    // Clean up after printing
    setTimeout(() => { printArea.innerHTML = ''; }, 1000);
}

// ==================== INFO ====================
function initInfo() {
    document.getElementById('btn-info').onclick = () => {
        document.getElementById('info-overlay').classList.add('visible');
    };
    document.getElementById('btn-close-info').onclick = () => {
        document.getElementById('info-overlay').classList.remove('visible');
    };
    document.getElementById('info-overlay').onclick = (e) => {
        if (e.target === e.currentTarget) {
            e.currentTarget.classList.remove('visible');
        }
    };
}

// ==================== RESEARCH SCREEN ====================
let researchState = {
    entry: null,
    numberOfTiles: 10,
    numberOfMaximalCircles: 2,
    winMode: 'lastWins',
    playMode: 'noPlaying',
    currentCircles: 0,
    tiles: [],
    tileColors: [],
    firstPlayerName: 'Links',
    secondPlayerName: 'Rechts',
    firstColor: 'red',
    secondColor: 'blue',
    gameOver: false,
};

function initResearch(entry) {
    researchState.entry = entry;
    researchState.numberOfTiles = entry.listOfColors.length;
    researchState.numberOfMaximalCircles = entry.numberOfMaximalCircles;
    researchState.winMode = entry.winMode;
    researchState.firstPlayerName = entry.leftPlayerName || 'Links';
    researchState.secondPlayerName = entry.rightPlayerName || 'Rechts';
    researchState.firstColor = entry.leftPlayerColor;
    researchState.secondColor = entry.rightPlayerColor;

    // Number mode
    setupNumberMode('research-number-mode');

    // Reference labels
    const refLabels = document.getElementById('research-ref-labels');
    refLabels.textContent = `${entry.listOfColors.length} Felder · ${CIRCLES_LABELS[entry.numberOfMaximalCircles]} · ${entry.winMode === 'lastWins' ? 'letztes Feld gewinnt' : 'letztes Feld verliert'}`;

    // Reference tile bar
    const refBar = document.getElementById('research-reference-bar');
    requestAnimationFrame(() => {
        createTileBar(refBar, entry.listOfColors.length, {
            colors: entry.listOfColors,
            showThumbOnLast: true,
            thumbMode: 'result',
            winMode: entry.winMode,
        });
    });

    // Back button
    document.getElementById('btn-back-archive').onclick = () => {
        navigateTo('screen-archive', 'back');
        setTimeout(() => initArchive(), 350);
    };

    // Setup research steppers
    setupStepper('research-fields-stepper', () => researchState.numberOfTiles, 5, 20,
        val => {
            researchState.numberOfTiles = val;
            updateResearchLabels();
            resetResearchGame();
        }
    );

    setupStepper('research-circles-stepper', () => researchState.numberOfMaximalCircles, 1, 4,
        val => {
            researchState.numberOfMaximalCircles = val;
            updateResearchLabels();
            resetResearchGame();
        }
    );

    // Win mode
    const winSegment = document.getElementById('research-winmode-segment');
    winSegment.querySelectorAll('.segment').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === researchState.winMode);
        btn.onclick = () => {
            researchState.winMode = btn.dataset.value;
            winSegment.querySelectorAll('.segment').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateResearchLabels();
            resetResearchGame();
        };
    });

    // Player buttons
    const leftBtn = document.getElementById('research-left-btn');
    const rightBtn = document.getElementById('research-right-btn');
    leftBtn.style.backgroundColor = COLORS[researchState.firstColor].value;
    rightBtn.style.backgroundColor = COLORS[researchState.secondColor].value;
    leftBtn.style.color = (researchState.firstColor === 'yellow') ? 'rgba(0,0,0,0.6)' : 'white';
    rightBtn.style.color = (researchState.secondColor === 'yellow') ? 'rgba(0,0,0,0.6)' : 'white';

    leftBtn.onclick = () => handleResearchLeftButton();
    rightBtn.onclick = () => handleResearchRightButton();

    // New game
    document.getElementById('research-new-game').onclick = () => resetResearchGame();

    updateResearchLabels();
    resetResearchGame();
}

function updateResearchLabels() {
    document.getElementById('research-fields-label').textContent = `${researchState.numberOfTiles} Felder`;
    document.getElementById('research-circles-label').textContent = CIRCLES_LABELS[researchState.numberOfMaximalCircles];
    document.getElementById('research-winmode-label').textContent =
        researchState.winMode === 'lastWins' ? 'letztes Feld gewinnt' : 'letztes Feld verliert';
}

function resetResearchGame() {
    researchState.playMode = 'noPlaying';
    researchState.currentCircles = 0;
    researchState.gameOver = false;
    researchState.tileColors = new Array(researchState.numberOfTiles).fill('none');

    const container = document.getElementById('research-game-bar');
    researchState.tiles = createTileBar(container, researchState.numberOfTiles, {
        showThumbOnLast: true,
        thumbMode: 'game',
        winMode: researchState.winMode,
        interactive: true,
    });

    researchState.tiles.forEach((tile, i) => {
        tile.onclick = () => handleResearchTileClick(i);
    });

    if (researchState.tiles.length > 0) {
        researchState.tiles[0].dataset.editable = 'true';
    }

    const leftBtn = document.getElementById('research-left-btn');
    const rightBtn = document.getElementById('research-right-btn');
    leftBtn.textContent = researchState.firstPlayerName;
    rightBtn.textContent = researchState.secondPlayerName;
    leftBtn.disabled = false;
    rightBtn.disabled = false;
    leftBtn.classList.remove('faded');
    rightBtn.classList.remove('faded');

    document.getElementById('research-task-label').textContent = 'Wer beginnt?';
}

function handleResearchLeftButton() {
    if (researchState.gameOver) return;
    const leftBtn = document.getElementById('research-left-btn');
    const rightBtn = document.getElementById('research-right-btn');
    const taskLabel = document.getElementById('research-task-label');

    switch (researchState.playMode) {
        case 'noPlaying':
            researchState.currentCircles = 0;
            taskLabel.textContent = `${researchState.firstPlayerName} ist dran.\n\nLege höchstens ${researchState.numberOfMaximalCircles} Plättchen.`;
            rightBtn.textContent = '';
            leftBtn.textContent = 'fertig';
            rightBtn.disabled = true;
            rightBtn.classList.add('faded');
            researchState.playMode = 'leftPlaying';
            break;

        case 'leftPlaying':
            if (researchState.currentCircles === 0) {
                taskLabel.textContent = `${researchState.firstPlayerName} ist dran.\n\nDu musst mindestens ein Plättchen legen.`;
            } else {
                researchState.currentCircles = 0;
                leftBtn.textContent = '';
                rightBtn.textContent = 'fertig';
                taskLabel.textContent = `${researchState.secondPlayerName} ist dran.\n\nLege höchstens ${researchState.numberOfMaximalCircles} Plättchen.`;
                leftBtn.disabled = true;
                leftBtn.classList.add('faded');
                rightBtn.disabled = false;
                rightBtn.classList.remove('faded');
                researchState.playMode = 'rightPlaying';
            }
            break;
    }
}

function handleResearchRightButton() {
    if (researchState.gameOver) return;
    const leftBtn = document.getElementById('research-left-btn');
    const rightBtn = document.getElementById('research-right-btn');
    const taskLabel = document.getElementById('research-task-label');

    switch (researchState.playMode) {
        case 'noPlaying':
            researchState.currentCircles = 0;
            taskLabel.textContent = `${researchState.secondPlayerName} ist dran.\n\nLege höchstens ${researchState.numberOfMaximalCircles} Plättchen.`;
            leftBtn.textContent = '';
            rightBtn.textContent = 'fertig';
            leftBtn.disabled = true;
            leftBtn.classList.add('faded');
            researchState.playMode = 'rightPlaying';
            break;

        case 'rightPlaying':
            if (researchState.currentCircles === 0) {
                taskLabel.textContent = `${researchState.secondPlayerName} ist dran.\n\nDu musst mindestens ein Plättchen legen.`;
            } else {
                researchState.currentCircles = 0;
                rightBtn.textContent = '';
                leftBtn.textContent = 'fertig';
                taskLabel.textContent = `${researchState.firstPlayerName} ist dran.\n\nLege höchstens ${researchState.numberOfMaximalCircles} Plättchen.`;
                rightBtn.disabled = true;
                rightBtn.classList.add('faded');
                leftBtn.disabled = false;
                leftBtn.classList.remove('faded');
                researchState.playMode = 'leftPlaying';
            }
            break;
    }
}

function handleResearchTileClick(index) {
    if (researchState.gameOver) return;
    const tile = researchState.tiles[index];
    const taskLabel = document.getElementById('research-task-label');
    const currentPlayerName = researchState.playMode === 'leftPlaying' ? researchState.firstPlayerName : researchState.secondPlayerName;

    if (researchState.playMode === 'noPlaying') {
        taskLabel.textContent = 'Du musst erst auswählen, wer beginnt.';
        return;
    }

    if (researchState.tileColors[index] !== 'none') return;

    if (index > 0 && researchState.tileColors[index - 1] === 'none') {
        taskLabel.textContent = `${currentPlayerName} ist dran.\n\nDu musst die Plättchen der Reihenfolge nach von links nach rechts legen.`;
        return;
    }

    if (researchState.currentCircles >= researchState.numberOfMaximalCircles) {
        taskLabel.textContent = `${currentPlayerName} ist dran.\n\nDu darfst nicht mehr als ${researchState.numberOfMaximalCircles} Plättchen legen.`;
        return;
    }

    const color = researchState.playMode === 'leftPlaying' ? researchState.firstColor : researchState.secondColor;
    researchState.tileColors[index] = color;
    researchState.currentCircles++;

    const circle = document.createElement('div');
    circle.className = 'circle just-placed';
    circle.style.backgroundColor = COLORS[color].value;
    tile.appendChild(circle);
    tile.classList.add('tile-filled');

    if (index + 1 < researchState.numberOfTiles) {
        researchState.tiles[index + 1].dataset.editable = 'true';
    }

    taskLabel.textContent = `${currentPlayerName} ist dran.\n\nLege höchstens ${researchState.numberOfMaximalCircles} Plättchen.`;

    if (index === researchState.numberOfTiles - 1) {
        endResearchGame(color);
    }
}

function endResearchGame(lastColor) {
    researchState.gameOver = true;
    const leftBtn = document.getElementById('research-left-btn');
    const rightBtn = document.getElementById('research-right-btn');
    const taskLabel = document.getElementById('research-task-label');

    leftBtn.disabled = true;
    leftBtn.classList.add('faded');
    leftBtn.textContent = '';
    rightBtn.disabled = true;
    rightBtn.classList.add('faded');
    rightBtn.textContent = '';

    let winner;
    if (lastColor === researchState.firstColor && researchState.winMode === 'lastWins') {
        winner = researchState.firstPlayerName;
    } else if (lastColor === researchState.secondColor && researchState.winMode === 'lastLoses') {
        winner = researchState.firstPlayerName;
    } else if (lastColor === researchState.secondColor && researchState.winMode === 'lastWins') {
        winner = researchState.secondPlayerName;
    } else if (lastColor === researchState.firstColor && researchState.winMode === 'lastLoses') {
        winner = researchState.secondPlayerName;
    }

    taskLabel.textContent = `${winner} hat gewonnen.`;

    const lastTile = researchState.tiles[researchState.numberOfTiles - 1];
    const thumb = lastTile.querySelector('.thumb');
    if (thumb) {
        thumb.style.opacity = '1';
    }
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    loadState();

    // Color picker overlay close on background click
    document.getElementById('color-picker-overlay').onclick = (e) => {
        if (e.target === e.currentTarget) {
            e.currentTarget.classList.remove('visible');
        }
    };

    // Init info button
    initInfo();

    // Wait for layout to settle before rendering tile bars
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            initSettings();
        });
    });
});

// Handle window resize to re-render tile bars on current screen
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        switch (currentScreen) {
            case 'screen-settings':
                updateSettingsPreview();
                break;
            case 'screen-game':
                if (!gameState.gameOver && gameState.playMode === 'noPlaying') {
                    // Only re-render if game hasn't started
                    const container = document.getElementById('game-tile-bar');
                    gameState.tiles = createTileBar(container, gameState.numberOfTiles, {
                        showThumbOnLast: true, thumbMode: 'game', winMode: gameState.winMode,
                    });
                    gameState.tiles.forEach((tile, i) => { tile.onclick = () => handleTileClick(i); });
                    if (gameState.tiles.length > 0) gameState.tiles[0].dataset.editable = 'true';
                }
                break;
            case 'screen-archive':
                renderArchive();
                break;
        }
    }, 250);
});
