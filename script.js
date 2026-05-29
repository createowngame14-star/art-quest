// ==========================================
// НАСТРОЙКИ И СОСТОЯНИЕ ИГРЫ
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    let animationId;
    let gameActive = false;
    let gameSpeed = 1;

    let gold = 250;
    let lives = 20;
    let currentWave = 1;
    
    let enemies = [];
    let towers = [];
    let projectiles = [];
    let decorations = []; 
    let particles = [];
    let floatingTexts = [];
    let leaves = []; 
    let birds = [];
    let cloudOffset = 0;

    let isWaveActive = false;
    let enemiesToSpawn = 0;
    let spawnTimer = 0;
    let waveConfig = []; 

    let buildMode = null;
    let selectedTower = null;
    const pathWidth = 40; 
    let mouseX = 0, mouseY = 0;

    const goldDisplay = document.getElementById('gold-display');
    const livesDisplay = document.getElementById('lives-display');
    const waveDisplay = document.getElementById('wave-display');
    const btnStartWave = document.getElementById('btn-start-wave');
    const btnSpeed = document.getElementById('btn-speed');
    const btnSell = document.getElementById('btn-sell');
    const btnUpgrade = document.getElementById('btn-upgrade');
    const overlay = document.getElementById('game-overlay');
    const overlayTitle = document.getElementById('overlay-title');
    const startScreen = document.getElementById('start-screen');
    const loadingFill = document.getElementById('loading-fill');
    const btnPlay = document.getElementById('btn-play');
    const btnRestart = document.getElementById('btn-restart');

    const path = [
        { x: -20, y: 100 }, { x: 600, y: 100 }, { x: 600, y: 300 },
        { x: 200, y: 300 }, { x: 200, y: 500 }, { x: 820, y: 500 }
    ];

    const towerTypes = {
        normal: { cost: 100, damage: 40, range: 150, cooldown: 50, color: '#00ffcc', name: 'Пушка' },
        fast: { cost: 150, damage: 15, range: 120, cooldown: 15, color: '#ff00cc', name: 'Пулемет' }
    };

    const enemyTypes = {
        normal: { type: 'normal', hp: 100, speed: 1.5, reward: 10, radius: 12 },
        scout: { type: 'scout', hp: 50, speed: 2.5, reward: 15, radius: 9 },
        tank: { type: 'tank', hp: 400, speed: 0.8, reward: 30, radius: 18 },
        boss: { type: 'boss', hp: 3000, speed: 0.5, reward: 200, radius: 35, isBoss: true }
    };

    class Bird {
        constructor() { this.reset(); this.x = Math.random() * 800; }
        reset() { this.x = -50; this.y = Math.random() * 200; this.speed = 2 + Math.random() * 2; this.wingSpeed = 0.1 + Math.random() * 0.1; this.wingStage = 0; }
        update() { this.x += this.speed * gameSpeed; this.wingStage += this.wingSpeed * gameSpeed; if (this.x > 850) this.reset(); }
        draw() {
            ctx.save(); ctx.translate(this.x, this.y); const wingY = Math.sin(this.wingStage) * 5;
            ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(0, -wingY); ctx.lineTo(5, 0);
            ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
        }
    }

    class Leaf {
        constructor() { this.reset(); }
        reset() { this.x = Math.random() * 800; this.y = -20; this.vx = (Math.random() - 0.5) * 2 + 1; this.vy = Math.random() * 1 + 1; this.size = Math.random() * 5 + 3; this.angle = Math.random() * Math.PI * 2; }
        update() { this.x += this.vx * gameSpeed; this.y += this.vy * gameSpeed; this.angle += 0.05 * gameSpeed; if (this.y > 600 || this.x > 800) this.reset(); }
        draw() { ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle); ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size); ctx.restore(); }
    }

    class Particle {
        constructor(x, y, color, speed = 6) { this.x = x; this.y = y; this.vx = (Math.random() - 0.5) * speed; this.vy = (Math.random() - 0.5) * speed - 1; this.life = 1.0; this.decay = Math.random() * 0.04 + 0.02; this.color = color; this.size = Math.random() * 4 + 2; }
        update() { this.x += this.vx * gameSpeed; this.y += this.vy * gameSpeed; this.life -= this.decay * gameSpeed; return this.life > 0; }
        draw() { ctx.save(); ctx.globalAlpha = Math.max(0, this.life); ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    }

    class FloatingText {
        constructor(x, y, text, color) { this.x = x; this.y = y - 30; this.text = text; this.color = color; this.life = 1.0; this.decay = 0.02; this.vy = -1.5; }
        update() { this.y += this.vy * gameSpeed; this.life -= this.decay * gameSpeed; return this.life > 0; }
        draw() { ctx.save(); ctx.globalAlpha = Math.max(0, this.life); ctx.fillStyle = this.color; ctx.font = '10px "Press Start 2P"'; ctx.textAlign = 'center'; ctx.fillText(this.text, this.x, this.y); ctx.restore(); }
    }

    class Decoration {
        constructor(x, y, type) { this.x = x; this.y = y; this.type = type; this.size = 12 + Math.random() * 15; }
        draw() {
            ctx.save(); ctx.translate(this.x, this.y);
            if (this.type === 'tree') {
                ctx.beginPath(); ctx.ellipse(5, 5, this.size, this.size*0.5, 0, 0, Math.PI*2); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fill();
                ctx.fillStyle = '#3e2723'; ctx.fillRect(-2, -15, 4, 15);
                for (let i = 0; i < 3; i++) {
                    const h = -12 - (i * 8), w = this.size * (1 - i*0.2);
                    const grad = ctx.createRadialGradient(0, h-w*0.3, w*0.2, 0, h, w);
                    grad.addColorStop(0, '#4caf50'); grad.addColorStop(1, '#1b5e20');
                    ctx.beginPath(); ctx.arc(0, h, w, 0, Math.PI*2); ctx.fillStyle = grad; ctx.fill();
                }
            } else if (this.type === 'rock') {
                ctx.beginPath(); ctx.ellipse(4, 4, this.size*0.8, this.size*0.4, 0, 0, Math.PI*2); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
                const h = 8; for (let i = 0; i < h; i++) {
                    ctx.beginPath(); ctx.ellipse(0, -i, this.size*(1-i/h*0.2), this.size*0.7*(1-i/h*0.2), 0,0,Math.PI*2);
                    ctx.fillStyle = i === h-1 ? '#9e9e9e' : '#616161'; ctx.fill();
                }
            } else {
                ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(2,2,this.size, this.size*0.5,0,0,Math.PI*2); ctx.fill();
                ctx.fillStyle = '#2e7d32'; ctx.beginPath(); ctx.arc(0, -2, this.size*0.7, 0, Math.PI*2); ctx.fill();
            }
            ctx.restore();
        }
    }

    class Enemy {
        constructor(type, wave) {
            const stats = enemyTypes[type]; this.type = type; this.x = path[0].x; this.y = path[0].y; this.waypointIndex = 1;
            this.maxHp = stats.hp * Math.pow(1.18, wave - 1); this.hp = this.maxHp;
            this.speed = stats.speed; this.reward = stats.reward; this.radius = stats.radius;
            this.isBoss = stats.isBoss || false; this.hitTimer = 0;
        }
        update() {
            if (this.hitTimer > 0) this.hitTimer -= gameSpeed;
            const target = path[this.waypointIndex]; const dx = target.x - this.x, dy = target.y - this.y; const dist = Math.hypot(dx, dy);
            if (dist < this.speed * gameSpeed) {
                this.x = target.x; this.y = target.y; this.waypointIndex++;
                if (this.waypointIndex >= path.length) { lives -= this.isBoss ? 10 : 1; updateUI(); if (lives <= 0) gameOver(); return false; }
            } else { this.x += (dx/dist)*this.speed*gameSpeed; this.y += (dy/dist)*this.speed*gameSpeed; }
            return true;
        }
        draw() {
            ctx.beginPath(); ctx.ellipse(this.x, this.y + 5, this.radius * 0.9, this.radius * 0.4, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; ctx.fill();
            const wAnim = Math.sin(Date.now() / 200 + this.waypointIndex); const z = this.isBoss ? 5 : 15 + wAnim * 5;
            ctx.save(); ctx.translate(this.x, this.y - z);
            if (this.type === 'normal') {
                const wobble = 1 + wAnim * 0.1; ctx.scale(1 / wobble, wobble);
                const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, this.radius);
                grad.addColorStop(0, this.hitTimer > 0 ? '#fff' : '#81c784'); grad.addColorStop(1, '#2e7d32');
                ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-4, -4, 3, 0, Math.PI*2); ctx.arc(4, -4, 3, 0, Math.PI*2); ctx.fill();
            } else if (this.type === 'scout') {
                ctx.fillStyle = this.hitTimer > 0 ? '#fff' : '#5d4037'; ctx.beginPath(); ctx.ellipse(0, 0, this.radius, this.radius * 0.7, 0, 0, Math.PI * 2); ctx.fill();
                const wSp = Math.sin(Date.now() / 50) * 15; ctx.beginPath(); ctx.moveTo(-this.radius, 0); ctx.lineTo(-this.radius - 10, -wSp); ctx.lineTo(-this.radius - 5, 5); ctx.fill();
                ctx.beginPath(); ctx.moveTo(this.radius, 0); ctx.lineTo(this.radius + 10, -wSp); ctx.lineTo(this.radius + 5, 5); ctx.fill();
            } else if (this.type === 'tank') {
                ctx.fillStyle = this.hitTimer > 0 ? '#fff' : '#455a64'; ctx.beginPath(); ctx.rect(-this.radius, -this.radius, this.radius*2, this.radius*2); ctx.fill();
                ctx.fillStyle = '#ff5252'; ctx.fillRect(-8, -8, 4, 4); ctx.fillRect(4, -8, 4, 4);
            } else if (this.type === 'boss') {
                const grad = ctx.createRadialGradient(0, 0, 5, 0, 0, this.radius); grad.addColorStop(0, '#fff'); grad.addColorStop(0.3, '#ff5252'); grad.addColorStop(1, '#b71c1c');
                ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, 10 + wAnim * 2, 0, Math.PI * 2); ctx.fill();
            }
            const barW = this.radius * 2.5; ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-barW/2, -this.radius-20, barW, 6);
            ctx.fillStyle = this.hp/this.maxHp > 0.5 ? '#00ffcc' : '#ff5252'; ctx.fillRect(-barW/2, -this.radius-20, barW*(this.hp/this.maxHp), 6);
            ctx.restore();
        }
    }

    class Tower {
        constructor(x, y, type) {
            this.x = x; this.y = y; this.type = type; this.level = 1;
            this.stats = {...towerTypes[type]}; this.cooldownTimer = 0; this.radius = 16; this.angle = 0;
            this.recoil = 0; this.flashTimer = 0; this.totalInvested = this.stats.cost;
        }
        upgrade() {
            if (this.level >= 3) return; const cost = Math.floor(this.stats.cost * 1.5 * this.level);
            if (gold >= cost) {
                gold -= cost; this.totalInvested += cost; this.level++; this.stats.damage *= 1.8; this.stats.range *= 1.2; this.stats.cooldown *= 0.8;
                updateUI(); floatingTexts.push(new FloatingText(this.x, this.y, 'LVL UP!', '#ffeb3b'));
                for(let i=0; i<15; i++) particles.push(new Particle(this.x, this.y - 20, '#ffeb3b', 4));
            }
        }
        sell() {
            const refund = Math.floor(this.totalInvested * 0.7); gold += refund; updateUI();
            floatingTexts.push(new FloatingText(this.x, this.y, `+${refund}💰`, '#ffd700'));
            for(let i=0; i<15; i++) particles.push(new Particle(this.x, this.y, '#ffd700', 4));
            towers = towers.filter(t => t !== this); selectedTower = null; updateUI();
        }
        update() {
            if (this.cooldownTimer > 0) this.cooldownTimer -= gameSpeed; if (this.recoil > 0) this.recoil -= 0.5 * gameSpeed; if (this.flashTimer > 0) this.flashTimer -= gameSpeed;
            let target = null; for (let enemy of enemies) { if (Math.hypot(enemy.x-this.x, enemy.y-this.y) <= this.stats.range) { target = enemy; break; } }
            if (target) {
                this.angle = Math.atan2(target.y-this.y, target.x-this.x);
                if (this.cooldownTimer <= 0) { projectiles.push(new Projectile(this.x, this.y, target, this.stats.damage, this.type)); this.cooldownTimer = this.stats.cooldown; this.recoil = 6; this.flashTimer = 4; }
            }
        }
        draw() {
            const isHovered = Math.hypot(this.x - mouseX, this.y - mouseY) < 25; const isSelected = selectedTower === this;
            ctx.save(); ctx.beginPath(); ctx.ellipse(this.x + 8, this.y + 8, this.radius, this.radius * 0.6, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
            if ((isHovered || isSelected) && !buildMode) {
                ctx.beginPath(); ctx.arc(this.x, this.y, this.stats.range, 0, Math.PI * 2);
                ctx.fillStyle = isSelected ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'; ctx.fill();
                ctx.strokeStyle = isSelected ? '#fff' : 'rgba(255,255,255,0.2)'; ctx.stroke();
            }
            ctx.translate(this.x, this.y); const h = 25 + this.level * 6;
            if (this.type === 'normal') {
                for (let i = 0; i < h; i++) { const r = this.radius * (1 - (i/h)*0.2); ctx.beginPath(); if (i === h - 1) { ctx.arc(0, -i, r + 2, 0, Math.PI * 2); ctx.fillStyle = '#78909c'; ctx.fill(); } else { ctx.arc(0, -i, r, 0, Math.PI * 2); ctx.fillStyle = i % 5 === 0 ? '#455a64' : '#546e7a'; ctx.fill(); } }
                ctx.translate(0, -h); ctx.rotate(this.angle); ctx.fillStyle = '#37474f'; ctx.fillRect(-this.recoil, -7, this.radius+10+this.level*4, 10);
            } else {
                for (let i = 0; i < h; i++) { const r = i < h * 0.3 ? this.radius : this.radius * 0.6; ctx.beginPath(); ctx.arc(0, -i, r, 0, Math.PI * 2); ctx.fillStyle = i === h - 1 ? '#263238' : (i < h * 0.3 ? '#37474f' : '#455a64'); ctx.fill(); }
                ctx.translate(0, -h); ctx.rotate(this.angle); for (let j = 0; j < 3; j++) { ctx.fillStyle = '#fff'; ctx.fillRect(-this.recoil, (j-1)*4-2, this.radius+8+this.level*5, 4); }
            }
            if (this.flashTimer > 0) { ctx.beginPath(); ctx.arc(this.radius+15+this.level*4-this.recoil, 0, 10, 0, Math.PI*2); ctx.fillStyle = '#ffffc8'; ctx.fill(); }
            ctx.restore();
            if (isSelected && !buildMode) {
                const infoY = this.y - h - 60; ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(this.x - 60, infoY, 120, 55); ctx.fillStyle = '#fff'; ctx.font = '8px "Press Start 2P"'; ctx.textAlign = 'center';
                ctx.fillText(`ATK: ${Math.floor(this.stats.damage)}`, this.x, infoY + 15); ctx.fillText(`UP: ${Math.floor(this.stats.cost*1.5*this.level)}💰`, this.x, infoY + 30);
                ctx.fillStyle = '#ff5252'; ctx.fillText(`SELL: ${Math.floor(this.totalInvested*0.7)}💰`, this.x, infoY + 45);
            }
            ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.fillText('LVL ' + this.level, this.x, this.y + 18);
        }
    }

    class Projectile {
        constructor(x, y, target, damage, type) { this.x = x; this.y = y; this.target = target; this.damage = damage; this.type = type; this.speed = type === 'fast' ? 12 : 8; this.radius = type === 'fast' ? 3 : 6; this.z = 25; }
        update() {
            if (!enemies.includes(this.target)) return false; const dx = this.target.x-this.x, dy = this.target.y-this.y, dist = Math.hypot(dx, dy);
            if (dist < this.speed*gameSpeed + this.target.radius) {
                this.target.hp -= this.damage; this.target.hitTimer = 6; const pColor = this.type === 'fast' ? '#ff00cc' : '#455a64'; for(let i=0; i<5; i++) particles.push(new Particle(this.target.x, this.target.y, pColor, 3));
                if (this.target.hp <= 0) { const idx = enemies.indexOf(this.target); if (idx > -1) { enemies.splice(idx, 1); gold += this.target.reward; updateUI(); floatingTexts.push(new FloatingText(this.target.x, this.target.y, '+'+this.target.reward, 'gold')); for(let i=0; i<(this.target.isBoss ? 40 : 12); i++) particles.push(new Particle(this.target.x, this.target.y, pColor, 5)); } }
                return false;
            }
            this.x += (dx/dist)*this.speed*gameSpeed; this.y += (dy/dist)*this.speed*gameSpeed; return true;
        }
        draw() { ctx.beginPath(); ctx.ellipse(this.x, this.y+this.z, this.radius, this.radius*0.5, 0,0,Math.PI*2); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fill(); ctx.beginPath(); ctx.arc(this.x, this.y-this.z, this.radius, 0, Math.PI * 2); ctx.fillStyle = this.type==='fast'?'#fff':'#455a64'; ctx.fill(); }
    }

    function updateUI() {
        goldDisplay.innerText = gold; livesDisplay.innerText = lives; waveDisplay.innerText = currentWave;
        if (btnSell) btnSell.classList.toggle('hidden', !selectedTower || !!buildMode);
        if (btnUpgrade) {
            btnUpgrade.classList.toggle('hidden', !selectedTower || !!buildMode);
            if (selectedTower) {
                const upCost = Math.floor(selectedTower.stats.cost * 1.5 * selectedTower.level);
                btnUpgrade.disabled = selectedTower.level >= 3 || gold < upCost;
                btnUpgrade.innerHTML = selectedTower.level >= 3 ? '<span class="btn-text">МАКС УР.</span>' : `<span class="btn-text">УЛУЧШИТЬ (${upCost}💰)</span>`;
            }
        }
    }
    function gameOver() { gameActive = false; overlayTitle.innerText = "ФИНАЛ: " + currentWave + " ВОЛН"; overlay.classList.remove('hidden'); }
    function winGame() { gameActive = false; overlayTitle.innerText = "ПОБЕДА!"; overlayTitle.style.color = "#ffc107"; overlay.classList.remove('hidden'); }

    function isPointNearPath(x, y) {
        const p = {x, y}; for (let i = 0; i < path.length - 1; i++) { const v = path[i], w = path[i+1], l2 = Math.pow(v.x-w.x, 2) + Math.pow(v.y-w.y, 2); let t = Math.max(0, Math.min(1, ((p.x-v.x)*(w.x-v.x) + (p.y-v.y)*(w.y-v.y)) / l2)); if (Math.hypot(p.x-(v.x+t*(w.x-v.x)), p.y-(v.y+t*(w.y-v.y))) < pathWidth/2 + 20) return true; }
        return false;
    }

    function drawGrass() {
        ctx.fillStyle = '#2e7d32'; ctx.fillRect(0, 0, 800, 600);
        ctx.fillStyle = '#388e3c';
        for (let i = 0; i < 800; i += 100) {
            for (let j = 0; j < 600; j += 100) {
                if ((i + j) % 3 === 0) { ctx.beginPath(); ctx.arc(i + (j % 50), j + (i % 40), 60, 0, Math.PI * 2); ctx.fill(); }
            }
        }
        const colors = ['#fff', '#ffeb3b', '#f48fb1'];
        for (let i = 0; i < 50; i++) {
            const x = (i * 137) % 800; const y = (i * 251) % 600;
            if (!isPointNearPath(x, y)) { ctx.fillStyle = colors[i % 3]; ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill(); }
        }
        cloudOffset += 0.2 * gameSpeed;
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        for (let i = 0; i < 3; i++) {
            const cx = ((cloudOffset + i * 400) % 1200) - 200; const cy = (i * 200) + 50;
            ctx.beginPath(); ctx.ellipse(cx, cy, 150, 80, 0, 0, Math.PI * 2); ctx.fill();
        }
    }

    function generateWave() {
        waveConfig = []; let count = 5 + currentWave * 4; if (currentWave % 5 === 0) { waveConfig.push('boss'); count = Math.floor(count/2); }
        for (let i = 0; i < count; i++) { const r = Math.random(); if (r < 0.6) waveConfig.push('normal'); else if (r < 0.85) waveConfig.push('scout'); else waveConfig.push('tank'); }
        waveConfig.sort(() => Math.random() - 0.5); enemiesToSpawn = waveConfig.length; floatingTexts.push(new FloatingText(400, 300, 'ВОЛНА ' + currentWave, '#ffeb3b'));
    }

    function initGame() {
        gold = 250; lives = 20; currentWave = 1; gameSpeed = 1; btnSpeed.innerText = 'x1'; btnSpeed.classList.remove('active');
        enemies = []; towers = []; projectiles = []; particles = []; floatingTexts = []; selectedTower = null;
        leaves = Array.from({length: 20}, () => new Leaf()); birds = Array.from({length: 3}, () => new Bird());
        decorations = []; for(let i=0; i<40; i++) { let x = Math.random()*800, y = Math.random()*600; if(!isPointNearPath(x,y)) decorations.push(new Decoration(x, y, ['tree','rock','bush'][Math.floor(Math.random()*3)])); }
        updateUI(); btnStartWave.disabled = false; overlay.classList.add('hidden'); gameActive = true; requestAnimationFrame(gameLoop);
    }

    function gameLoop() {
        if (!gameActive) return; drawGrass();
        leaves.forEach(l => { l.update(); l.draw(); }); birds.forEach(b => { b.update(); b.draw(); });
        ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y); for(let i=1; i<path.length; i++) ctx.lineTo(path[i].x, path[i].y);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = pathWidth+10; ctx.stroke();
        ctx.strokeStyle = '#5d4037'; ctx.lineWidth = pathWidth; ctx.stroke();
        if (isWaveActive && waveConfig.length > 0) { spawnTimer += gameSpeed; if (spawnTimer >= (waveConfig[0] === 'boss' ? 120 : 40)) { enemies.push(new Enemy(waveConfig.shift(), currentWave)); spawnTimer = 0; } }
        towers.forEach(t => t.update()); enemies = enemies.filter(e => e.update()); projectiles = projectiles.filter(p => p.update()); particles = particles.filter(p => p.update()); floatingTexts = floatingTexts.filter(t => t.update());
        [...decorations, ...towers, ...enemies].sort((a,b) => a.y-b.y).forEach(o => o.draw()); projectiles.forEach(p => p.draw()); particles.forEach(p => p.draw()); floatingTexts.forEach(t => t.draw());
        if (buildMode) { const s = towerTypes[buildMode]; ctx.save(); ctx.globalAlpha = 0.4; ctx.beginPath(); ctx.arc(mouseX, mouseY, s.range, 0, Math.PI*2); ctx.fillStyle = isPointNearPath(mouseX, mouseY) || gold < s.cost ? 'rgba(255,0,0,0.2)' : 'rgba(0,255,0,0.2)'; ctx.fill(); ctx.restore(); }
        if (isWaveActive && enemies.length === 0 && waveConfig.length === 0) { isWaveActive = false; if (currentWave >= 5) winGame(); else { currentWave++; btnStartWave.disabled = false; updateUI(); floatingTexts.push(new FloatingText(400, 200, "ВОЛНА ЗАЧИЩЕНА!", "white")); } }
        animationId = requestAnimationFrame(gameLoop);
    }

    const handleInput = (clientX, clientY) => {
        const rect = canvas.getBoundingClientRect(); const x = (clientX - rect.left) * (800 / rect.width); const y = (clientY - rect.top) * (600 / rect.height);
        if (buildMode) {
            const s = towerTypes[buildMode]; if (gold >= s.cost && !isPointNearPath(x, y) && !towers.some(t => Math.hypot(t.x-x, t.y-y) < 32)) { gold -= s.cost; towers.push(new Tower(x, y, buildMode)); for(let i=0; i<15; i++) particles.push(new Particle(x, y, '#8d6e63')); updateUI(); buildMode = null; document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('active')); }
        } else {
            let hit = false; for (let t of towers) { if (Math.hypot(t.x - x, t.y - y) < 25) { selectedTower = t; hit = true; break; } }
            if (!hit) { selectedTower = null; } updateUI();
        }
    };

    canvas.addEventListener('mousedown', (e) => handleInput(e.clientX, e.clientY));
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleInput(e.touches[0].clientX, e.touches[0].clientY); });
    canvas.addEventListener('mousemove', (e) => { const rect = canvas.getBoundingClientRect(); mouseX = (e.clientX - rect.left) * (800 / rect.width); mouseY = (e.clientY - rect.top) * (600 / rect.height); });
    btnSpeed.addEventListener('click', () => { gameSpeed = gameSpeed === 1 ? 2 : 1; btnSpeed.innerText = 'x' + gameSpeed; btnSpeed.classList.toggle('active', gameSpeed === 2); });
    if (btnSell) btnSell.addEventListener('click', () => { if (selectedTower) selectedTower.sell(); });
    if (btnUpgrade) btnUpgrade.addEventListener('click', () => { if (selectedTower) { selectedTower.upgrade(); updateUI(); } });
    window.addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 's' && selectedTower) selectedTower.sell(); });
    document.querySelectorAll('.tower-btn').forEach(btn => { btn.addEventListener('click', (e) => { const type = e.target.closest('.tower-btn').dataset.type; buildMode = buildMode === type ? null : type; selectedTower = null; document.querySelectorAll('.tower-btn').forEach(b => b.classList.toggle('active', b.dataset.type === buildMode)); updateUI(); }); });
    btnStartWave.addEventListener('click', () => { if(!isWaveActive) { isWaveActive = true; generateWave(); btnStartWave.disabled = true; }});
    btnRestart.addEventListener('click', initGame);
    btnPlay.addEventListener('click', () => { startScreen.classList.add('hidden'); initGame(); });
    let p = 0; const int = setInterval(() => { p += 5; loadingFill.style.width = p + '%'; if(p >= 100) { clearInterval(int); btnPlay.style.display = 'block'; } }, 30);
});