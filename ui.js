import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, BUILDINGS } from './constants.js';
import {
    pawns,
    selectedEntity,
    camera,
    canvas,
    resources,
    setSelectedEntity,
    currentTool,
    setCurrentTool,
    map,
    placeBuilding
} from './game.js';
import { Pawn, Building, Tile } from './entities.js';

export function updatePawnBar() {
    const container = document.getElementById('pawn-bar-container');
    if (!container) return;

    pawns.forEach(p => {
        let wrapper = document.getElementById(`pawn-wrapper-${p.id}`);

        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = `pawn-wrapper-${p.id}`;
            wrapper.className = 'pawn-card-wrapper';
            wrapper.onmousedown = (e) => { e.stopPropagation(); };
            wrapper.onclick = (e) => { e.stopPropagation(); selectPawn(p); };
            wrapper.ondblclick = (e) => { e.stopPropagation(); selectPawn(p); camera.zoom = 1.5; };

            wrapper.innerHTML = `
                <div class="pawn-card-inner" id="pawn-inner-${p.id}">
                    <div style="width:24px; height:24px; border-radius:50%; background-color:${p.color}; border:2px solid rgba(0,0,0,0.5);"></div>
                    <div class="text-[10px] font-bold mt-1 text-gray-200">${p.name}</div>
                    <div class="text-[9px] text-gray-400" id="pawn-status-${p.id}">Idle</div>
                    <div class="bars-container">
                        <div class="health-bar"><div class="health-fill" id="pawn-health-${p.id}"></div></div>
                        <div class="rest-bar"><div class="rest-fill" id="pawn-rest-${p.id}"></div></div>
                    </div>
                </div>
            `;
            container.appendChild(wrapper);
        }

        const inner = document.getElementById(`pawn-inner-${p.id}`);
        const statusDiv = document.getElementById(`pawn-status-${p.id}`);
        const healthFill = document.getElementById(`pawn-health-${p.id}`);
        const restFill = document.getElementById(`pawn-rest-${p.id}`);

        if (selectedEntity === p) inner.classList.add('selected');
        else inner.classList.remove('selected');

        let statusText = 'Idle';
        if (p.state === 'PASSED_OUT') statusText = 'KO!';
        else if (p.state === 'SLEEPING') statusText = 'Sleep';
        else if (p.job) {
            if (p.job.type.includes('HAUL')) statusText = 'Haul';
            else if (p.job.type === 'CONSTRUCT') statusText = 'Build';
            else if (['chop','mine'].includes(p.job.type)) statusText = 'Mine';
            else if (['EAT_ITEM','EAT_BUSH'].includes(p.job.type)) statusText = 'Eat';
        }
        statusDiv.innerText = statusText;

        healthFill.style.width = `${p.hunger}%`;
        healthFill.style.backgroundColor = p.hunger < 30 ? '#ef4444' : '#22c55e';

        restFill.style.width = `${p.rest}%`;
        // 疲劳时条变红提示
        restFill.style.backgroundColor = p.rest < 20 ? '#a855f7' : '#60a5fa';
    });
}

export function selectPawn(pawn) {
    setSelectedEntity(pawn);
    camera.x = (pawn.x * TILE_SIZE * camera.zoom) - canvas.width / 2;
    camera.y = (pawn.y * TILE_SIZE * camera.zoom) - canvas.height / 2;
    updatePawnBar();
    updateInfoPanel();
}

export function updateUI() {
    // 现在资源通过 dropItem 和 采集/消耗逻辑实时更新，无需扫描全图
    const foodEl = document.getElementById('res-food');
    const woodEl = document.getElementById('res-wood');
    const stoneEl = document.getElementById('res-stone');
    if (foodEl) foodEl.innerText = resources.food;
    if (woodEl) woodEl.innerText = resources.wood;
    if (stoneEl) stoneEl.innerText = resources.stone;
    updatePawnBar();
    if (selectedEntity) updateInfoPanel();
}

export function setTool(tool) {
    setCurrentTool(tool);
    document.querySelectorAll('.btn-action').forEach(b => b.classList.remove('btn-active'));
    const btn = document.getElementById(`btn-${tool}`);
    if (btn) btn.classList.add('btn-active');
    setSelectedEntity(null);
    const infoPanel = document.getElementById('info-panel');
    if (infoPanel) infoPanel.classList.add('hidden');
    updatePawnBar();
}

export function cancelJobTool() { setTool('cancel'); }

export function handleInteraction(x, y) {
    if (x < 0 || y < 0 || x >= MAP_WIDTH || y >= MAP_HEIGHT) return;
    const tile = map[x][y];

    if (currentTool === 'build_warehouse') { placeBuilding('warehouse', x, y); return; }
    if (currentTool === 'build_tent') { placeBuilding('tent', x, y); return; }

    if (currentTool === 'select') {
        const pawn = pawns.find(p => Math.round(p.x) === x && Math.round(p.y) === y);
        if (pawn) { selectPawn(pawn); return; }
        if (tile.buildingRef) {
            setSelectedEntity(tile.buildingRef);
            updatePawnBar();
            updateInfoPanel();
            return;
        }
        setSelectedEntity(tile);
        updatePawnBar(); updateInfoPanel();
    }
    else if (currentTool === 'chop') { if (tile.object === 'tree') tile.designation = 'chop'; }
    else if (currentTool === 'mine') { if (tile.object === 'rock') tile.designation = 'mine'; }
    else if (currentTool === 'harvest') { if (tile.object === 'berry') tile.designation = 'harvest'; }
    else if (currentTool === 'cancel') { tile.designation = null; }
}

export function updateInfoPanel() {
    const panel = document.getElementById('info-panel');
    const title = document.getElementById('info-title');
    const content = document.getElementById('info-content');

    if (!selectedEntity || !panel || !title || !content) {
        if (panel) panel.classList.add('hidden');
        return;
    }
    panel.classList.remove('hidden');

    if (selectedEntity instanceof Pawn) {
        title.innerText = `Colonist: ${selectedEntity.name}`;
        content.innerHTML = `
            <div>State: ${selectedEntity.state}</div>
            <div>Hunger: ${selectedEntity.hunger.toFixed(0)}/100</div>
            <div>Rest: ${selectedEntity.rest.toFixed(0)}/100</div>
            <div>Job: ${selectedEntity.job ? selectedEntity.job.type : 'None'}</div>
        `;
    } else if (selectedEntity instanceof Building) {
        const b = selectedEntity;
        title.innerText = b.isBlueprint ? `Blueprint: ${b.data.name}` : `Building: ${b.data.name}`;
        if (b.isBlueprint) {
            content.innerHTML = `
                <div class="text-blue-400">Under Construction</div>
                <div>Progress: ${b.progress}%</div>
                <div>Mat: ${b.delivered.wood||0}/${b.needed.wood||0} Wood</div>
            `;
        } else {
             content.innerHTML = `
                <div class="text-green-400">Operational</div>
                <div>Use for Sleeping</div>
            `;
        }
    } else if (selectedEntity instanceof Tile) {
        title.innerText = `Tile (${selectedEntity.x}, ${selectedEntity.y})`;
        let itemsHtml = selectedEntity.items.map(i => `${i.amount} ${i.type}`).join(', ');
        content.innerHTML = `
            <div>Type: ${selectedEntity.type}</div>
            <div>Items: ${itemsHtml || '-'}</div>
        `;
    }
}

// 挂载到 window 对象以供 HTML 访问
window.setTool = setTool;
window.cancelJobTool = cancelJobTool;
window.selectPawn = selectPawn;
