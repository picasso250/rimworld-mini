import { GameMap, TILE_SIZE, TILE_TYPES } from './map.js';
import { Pawn } from './pawn.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const gameMap = new GameMap(30, 20);
const pawns = [
    new Pawn('Pawn 1', 5, 5),
    new Pawn('Pawn 2', 10, 5)
];

let selectedPawn = null;
let interactionMode = 'MOVE'; // 'MOVE' or 'BUILD'

function init() {
    // Basic event listeners
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    // Start game loop
    requestAnimationFrame(gameLoop);
}

function handleMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const gridX = Math.floor(mouseX / TILE_SIZE);
    const gridY = Math.floor(mouseY / TILE_SIZE);

    if (interactionMode === 'MOVE') {
        // Try to select a pawn first
        const clickedPawn = pawns.find(p => p.x === gridX && p.y === gridY);

        if (clickedPawn) {
            if (selectedPawn) selectedPawn.isSelected = false;
            selectedPawn = clickedPawn;
            selectedPawn.isSelected = true;
        } else if (selectedPawn) {
            // Give move order
            selectedPawn.setTarget(gridX, gridY, gameMap);
        }
    } else if (interactionMode === 'BUILD') {
        gameMap.setTile(gridX, gridY, TILE_TYPES.WALL);
    }
}

function update() {
    pawns.forEach(pawn => pawn.update(gameMap));
    updateUI();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    gameMap.draw(ctx);
    pawns.forEach(pawn => pawn.draw(ctx));
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function updateUI() {
    const statsDiv = document.getElementById('pawn-stats');
    if (selectedPawn) {
        statsDiv.innerHTML = `
            <strong>Name:</strong> ${selectedPawn.name}<br>
            <strong>Health:</strong> ${Math.floor(selectedPawn.health)}%<br>
            <strong>Hunger:</strong> ${Math.floor(selectedPawn.hunger)}%<br>
            <strong>Position:</strong> (${selectedPawn.x}, ${selectedPawn.y})
        `;
    } else {
        statsDiv.innerHTML = 'Select a pawn to see stats.';
    }
}

// Global exposure for UI buttons (since we use modules)
window.setInteractionMode = (mode) => {
    interactionMode = mode;
    document.querySelectorAll('#controls button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(mode.toLowerCase() + '-mode').classList.add('active');
};

init();
