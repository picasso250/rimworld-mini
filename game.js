import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, COLORS, PAWN_NAMES, BUILDINGS } from './constants.js';
import { Tile, Building, Pawn } from './entities.js';
import { updatePawnBar, updateUI, setTool, handleInteraction, updateInfoPanel } from './ui.js';

// --- 全局状态 ---
export let resources = {
    food: 0,
    wood: 0,
    stone: 0
};

export let camera = { x: 0, y: 0, zoom: 1 };
export let isDragging = false;
export let lastMouse = { x: 0, y: 0 };
export let currentTool = 'select';
export let hoveredTile = { x: -1, y: -1 };
export let selectedEntity = null;
export let gameTime = 0;

export let map = [];
export let pawns = [];
export let buildings = [];
export let particles = [];

export const canvas = document.getElementById('gameCanvas');
export const ctx = canvas.getContext('2d', { alpha: false });

// 状态修改器，用于在模块间同步状态
export function setSelectedEntity(val) { selectedEntity = val; }
export function setCurrentTool(val) { currentTool = val; }

// --- 初始化与全局函数 ---

export function init() {
    resize();
    generateMap();
    const cx = Math.floor(MAP_WIDTH/2);
    const cy = Math.floor(MAP_HEIGHT/2);

    // 初始资源放在地上
    dropItem(cx, cy, 'food', 20);
    dropItem(cx, cy + 1, 'wood', 50);

    spawnPawns(3, cx, cy);
    updatePawnBar();
    camera.x = (cx * TILE_SIZE) - canvas.width / 2;
    camera.y = (cy * TILE_SIZE) - canvas.height / 2;
    setTool('select');
    requestAnimationFrame(loop);
}

export function generateMap() {
    for (let x = 0; x < MAP_WIDTH; x++) {
        map[x] = [];
        for (let y = 0; y < MAP_HEIGHT; y++) {
            const t = new Tile(x, y, 'grass');
            if (Math.abs(x - MAP_WIDTH/2) > 4 || Math.abs(y - MAP_HEIGHT/2) > 4) {
                const rand = Math.random();
                if (rand < 0.15) t.object = 'tree';
                else if (rand < 0.18) { t.object = 'rock'; t.walkable = false; }
                else if (rand < 0.20) t.object = 'berry';
            }
            map[x][y] = t;
        }
    }
}

export function spawnPawns(count, cx, cy) {
    for (let i = 0; i < count; i++) {
        let x, y;
        do {
            x = cx + Math.floor(Math.random() * 6 - 3);
            y = cy + Math.floor(Math.random() * 6 - 3);
        } while (!map[x][y].walkable || map[x][y].object || map[x][y].buildingRef);
        pawns.push(new Pawn(x, y, PAWN_NAMES[i], i));
    }
}

export function placeBuilding(type, x, y, force=false) {
    const bDef = BUILDINGS[type];
    if (!bDef) return false;
    for(let i=0; i<bDef.w; i++) {
        for(let j=0; j<bDef.h; j++) {
            if (x+i >= MAP_WIDTH || y+j >= MAP_HEIGHT) return false;
            const t = map[x+i][y+j];
            if (!t.walkable || t.object || t.buildingRef) return false;
        }
    }
    const b = new Building(type, x, y, !force);
    buildings.push(b);
    for(let i=0; i<bDef.w; i++) {
        for(let j=0; j<bDef.h; j++) {
            map[x+i][y+j].buildingRef = b;
            map[x+i][y+j].walkable = false;
        }
    }
    updateUI();
    return true;
}

export function dropItem(x, y, type, amount) {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;
    const tile = map[x][y];
    const existing = tile.items.find(i => i.type === type);
    if (existing) existing.amount += amount;
    else tile.items.push({ type, amount });

    // 增加全局资源计数
    if (resources[type] !== undefined) resources[type] += amount;
}

// --- 渲染 ---

export function loop() {
    gameTime++;
    update();
    draw();
    if (gameTime % 10 === 0) updateUI();
    requestAnimationFrame(loop);
}

export function update() {
    pawns.forEach(p => p.update());
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life--;
        p.offset += 0.02;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

export function draw() {
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const zoom = camera.zoom;
    const startX = Math.floor(camera.x / (TILE_SIZE * zoom));
    const startY = Math.floor(camera.y / (TILE_SIZE * zoom));
    const endX = startX + Math.ceil(canvas.width / (TILE_SIZE * zoom)) + 1;
    const endY = startY + Math.ceil(canvas.height / (TILE_SIZE * zoom)) + 1;

    for (let x = Math.max(0, startX); x < Math.min(MAP_WIDTH, endX); x++) {
        for (let y = Math.max(0, startY); y < Math.min(MAP_HEIGHT, endY); y++) {
            const t = map[x][y];
            const screenX = (x * TILE_SIZE * zoom) - camera.x;
            const screenY = (y * TILE_SIZE * zoom) - camera.y;
            const size = TILE_SIZE * zoom;

            ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.GRASS : COLORS.GRASS_DARK;
            ctx.fillRect(screenX, screenY, size, size);

            if (t.items.length > 0) {
                t.items.forEach((item, idx) => {
                    let char = item.type === 'wood' ? '🪵' : (item.type === 'stone' ? '🪨' : '🍖');
                    ctx.font = `${size * 0.5}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.fillText(char, screenX + size/2 + (idx*3), screenY + size/2 + (idx*3));
                    ctx.fillStyle = 'white';
                    ctx.font = `${size * 0.25}px Arial`;
                    ctx.fillText(item.amount, screenX + size/2 + 10, screenY + size/2 + 10);
                });
            }

            if (t.object) {
                ctx.font = `${size * 0.8}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                let char = t.object === 'tree' ? '🌲' : (t.object === 'rock' ? '🪨' : '🍓');
                ctx.fillText(char, screenX + size/2, screenY + size/2);
            }

            if (t.designation) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fillRect(screenX, screenY, size, size);
                let icon = t.designation === 'chop' ? '🪓' : (t.designation === 'mine' ? '⛏️' : '🍓');
                ctx.fillStyle = 'white';
                ctx.font = `${size * 0.4}px Arial`;
                ctx.fillText(icon, screenX + size/2, screenY + size/2);
            }
        }
    }

    buildings.forEach(b => {
        const screenX = (b.x * TILE_SIZE * zoom) - camera.x;
        const screenY = (b.y * TILE_SIZE * zoom) - camera.y;
        const width = b.data.w * TILE_SIZE * zoom;
        const height = b.data.h * TILE_SIZE * zoom;

        if (b.isBlueprint) {
            ctx.fillStyle = COLORS.BLUEPRINT;
            ctx.fillRect(screenX + 2, screenY + 2, width - 4, height - 4);
            ctx.strokeStyle = COLORS.BLUEPRINT_BORDER;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(screenX + 2, screenY + 2, width - 4, height - 4);
            ctx.setLineDash([]);

            ctx.fillStyle = '#333';
            ctx.fillRect(screenX + 5, screenY + height - 15, width - 10, 5);
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(screenX + 5, screenY + height - 15, (width - 10) * (b.progress/100), 5);

            ctx.fillStyle = 'white';
            ctx.font = `${10 * zoom}px Arial`;
            ctx.textAlign = 'center';
            let statusText = `${b.delivered.wood||0}/${b.needed.wood||0}`;
            ctx.fillText(statusText, screenX + width/2, screenY + height/2);

        } else {
            ctx.fillStyle = b.data.color;
            ctx.fillRect(screenX + 5, screenY + 5, width - 10, height - 10);
            ctx.lineWidth = 4 * zoom;
            ctx.strokeStyle = '#333';
            ctx.strokeRect(screenX + 5, screenY + 5, width - 10, height - 10);

            ctx.font = `${width * 0.5}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'white';
            ctx.fillText(b.data.symbol, screenX + width/2, screenY + height/2);

            if (selectedEntity === b) {
                ctx.strokeStyle = '#facc15';
                ctx.lineWidth = 3;
                ctx.strokeRect(screenX, screenY, width, height);
            }
        }
    });

    if (hoveredTile.x >= 0 && (currentTool === 'build_warehouse' || currentTool === 'build_tent')) {
        const bType = currentTool.replace('build_', '');
        const bDef = BUILDINGS[bType];
        if (bDef) {
            const screenX = (hoveredTile.x * TILE_SIZE * zoom) - camera.x;
            const screenY = (hoveredTile.y * TILE_SIZE * zoom) - camera.y;
            const w = bDef.w * TILE_SIZE * zoom;
            const h = bDef.h * TILE_SIZE * zoom;
            let canBuild = true;
            if (hoveredTile.x + bDef.w > MAP_WIDTH || hoveredTile.y + bDef.h > MAP_HEIGHT) canBuild = false;
            else {
                for(let i=0; i<bDef.w; i++) {
                    for(let j=0; j<bDef.h; j++) {
                        const t = map[hoveredTile.x+i][hoveredTile.y+j];
                        if (!t.walkable || t.object || t.buildingRef) canBuild = false;
                    }
                }
            }
            ctx.fillStyle = canBuild ? COLORS.BUILDING_PREVIEW_OK : COLORS.BUILDING_PREVIEW_BAD;
            ctx.fillRect(screenX, screenY, w, h);
        }
    }

    pawns.forEach(p => {
        const screenX = (p.x * TILE_SIZE * zoom) - camera.x;
        const screenY = (p.y * TILE_SIZE * zoom) - camera.y;
        const size = TILE_SIZE * zoom;

        // 如果在睡觉，不画人，或者画个半透明的
        if (p.state === 'SLEEPING') {
            // 简单不画，或者只画名字
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = `bold ${size * 0.3}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText("Zzz", screenX + size/2, screenY);
        } else {
            // 正常绘制
            ctx.fillStyle = p.color;
            ctx.beginPath();

            if (p.state === 'PASSED_OUT') {
                // 倒下：画个横着的椭圆
                 ctx.ellipse(screenX + size/2, screenY + size/2 + size*0.2, size * 0.4, size * 0.2, 0, 0, Math.PI * 2);
            } else {
                 ctx.arc(screenX + size/2, screenY + size/2, size * 0.4, 0, Math.PI * 2);
            }

            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#222';
            ctx.stroke();

            ctx.fillStyle = 'white';
            ctx.font = `bold ${size * 0.3}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(p.name, screenX + size/2, screenY - size * 0.2);

            if (p.carrying) {
                let char = p.carrying.type === 'wood' ? '🪵' : '📦';
                ctx.font = `${size * 0.4}px Arial`;
                ctx.fillText(char, screenX + size, screenY + size);
            }

            if (p.state === 'PASSED_OUT') {
                ctx.fillStyle = '#ef4444';
                ctx.font = `bold ${size * 0.3}px Arial`;
                ctx.fillText("KO", screenX + size/2, screenY);
            }
        }

        if (selectedEntity === p) {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(screenX + size/2, screenY + size/2, size * 0.6, 0, Math.PI * 2);
            ctx.stroke();
        }
    });

    if (selectedEntity instanceof Tile) {
        const screenX = (selectedEntity.x * TILE_SIZE * zoom) - camera.x;
        const screenY = (selectedEntity.y * TILE_SIZE * zoom) - camera.y;
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.strokeRect(screenX, screenY, TILE_SIZE*zoom, TILE_SIZE*zoom);
    }

    particles.forEach(p => {
        const screenX = (p.x * TILE_SIZE * zoom) - camera.x;
        const screenY = ((p.y - p.offset) * TILE_SIZE * zoom) - camera.y;
        ctx.fillStyle = p.color;
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 2;
        ctx.font = `bold ${14 * zoom}px Arial`;
        ctx.fillText(p.text, screenX + TILE_SIZE/2, screenY);
        ctx.shadowBlur = 0;
    });
}

// --- 事件监听 ---

export function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }

canvas.addEventListener('mousedown', (e) => {
    if (e.target !== canvas) return;
    if (e.button === 0) {
        isDragging = true;
        lastMouse = { x: e.clientX, y: e.clientY };
        const rect = canvas.getBoundingClientRect();
        const worldX = (e.clientX - rect.left + camera.x) / camera.zoom;
        const worldY = (e.clientY - rect.top + camera.y) / camera.zoom;
        const tileX = Math.floor(worldX / TILE_SIZE);
        const tileY = Math.floor(worldY / TILE_SIZE);
        handleInteraction(tileX, tileY);
    }
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldX = (mouseX + camera.x) / camera.zoom;
    const worldY = (mouseY + camera.y) / camera.zoom;
    hoveredTile = { x: Math.floor(worldX / TILE_SIZE), y: Math.floor(worldY / TILE_SIZE) };
    if (e.altKey && isDragging) {
        camera.x -= (e.clientX - lastMouse.x);
        camera.y -= (e.clientY - lastMouse.y);
        lastMouse = { x: e.clientX, y: e.clientY };
    } else if (isDragging && currentTool !== 'select' && !currentTool.startsWith('build_')) {
        handleInteraction(hoveredTile.x, hoveredTile.y);
    }
});

window.addEventListener('mouseup', () => { isDragging = false; });
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomSpeed = 0.1;
    if (e.deltaY < 0) camera.zoom = Math.min(camera.zoom + zoomSpeed, 3);
    else camera.zoom = Math.max(camera.zoom - zoomSpeed, 0.5);
});

window.addEventListener('resize', resize);
window.addEventListener('keydown', (e) => { if (e.key === 'Alt') document.body.style.cursor = 'move'; });
window.addEventListener('keyup', (e) => { if (e.key === 'Alt') document.body.style.cursor = 'default'; });

// 启动游戏
init();
