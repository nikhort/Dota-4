// game.js — полностью исправленная версия (часть 1)

// --- СИСТЕМА СИНТЕЗА АУДИО (БЕЗ ФАЙЛОВ) ---
class AudioManager {
    constructor() { this.ctx = null; } 
    init() { if (!this.ctx) { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } }
    play(type) {
        this.init();
        if (!this.ctx || this.ctx.state === 'suspended') return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain); gain.connect(this.ctx.destination);
        const now = this.ctx.currentTime;

        if (type === 'attack') {
            osc.type = 'triangle'; osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);
            gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        } else if (type === 'buy') {
            osc.type = 'sine'; osc.frequency.setValueAtTime(520, now);
            osc.frequency.setValueAtTime(780, now + 0.08);
            gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now); osc.stop(now + 0.2);
        } else if (type === 'creep_death') {
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(120, now);
            osc.frequency.linearRampToValueAtTime(30, now + 0.1);
            gain.gain.setValueAtTime(0.08, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        } else if (type === 'tower_break') {
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(80, now);
            osc.frequency.linearRampToValueAtTime(20, now + 0.5);
            gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now); osc.stop(now + 0.5);
        } else if (type === 'ability') {
            osc.type = 'sine'; osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);
            gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            osc.start(now); osc.stop(now + 0.25);
        } else if (type === 'victory') {
            osc.type = 'sine'; osc.frequency.setValueAtTime(523, now);
            osc.frequency.setValueAtTime(659, now + 0.15); osc.frequency.setValueAtTime(783, now + 0.3);
            gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
            osc.start(now); osc.stop(now + 0.6);
        } else if (type === 'defeat') {
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(180, now);
            osc.frequency.setValueAtTime(130, now + 0.2);
            gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
            osc.start(now); osc.stop(now + 0.6);
        }
    }
}

// --- НАСТРОЙКА КАНВАСА И ОКРУЖЕНИЯ ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const audio = new AudioManager();
let audioUnlocked = false;

function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    audio.init();
    if (audio.ctx && audio.ctx.state === 'suspended') {
        audio.ctx.resume().catch(() => {});
    }
}

window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });
window.addEventListener('touchstart', unlockAudio, { once: true });
canvas.addEventListener('pointerdown', unlockAudio, { once: true });
canvas.addEventListener('touchstart', unlockAudio, { once: true });

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

window.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ----------------------------------------------
// КАРТА (уменьшена на 25%: 6000x4500)
// ----------------------------------------------
class GameMap {
    constructor() {
        this.width = 6000;
        this.height = 4500;
        this.radiantBase = { x: 375, y: 4125 };
        this.direBase = { x: 5625, y: 750 };
        this.waypoints = {
            top: [
                { x: this.radiantBase.x, y: this.radiantBase.y },
                { x: this.radiantBase.x, y: 750 },
                { x: this.direBase.x, y: 750 }
            ],
            mid: [
                { x: this.radiantBase.x, y: this.radiantBase.y },
                { x: this.direBase.x, y: this.direBase.y }
            ],
            bottom: [
                { x: this.radiantBase.x, y: this.radiantBase.y },
                { x: 5625, y: this.radiantBase.y },
                { x: this.direBase.x, y: this.direBase.y }
            ]
        };
        this.waypointsReverse = {
            top: [
                { x: this.direBase.x, y: 750 },
                { x: this.radiantBase.x, y: 750 },
                { x: this.radiantBase.x, y: this.radiantBase.y }
            ],
            mid: [
                { x: this.direBase.x, y: this.direBase.y },
                { x: this.radiantBase.x, y: this.radiantBase.y }
            ],
            bottom: [
                { x: this.direBase.x, y: this.direBase.y },
                { x: 5625, y: this.radiantBase.y },
                { x: this.radiantBase.x, y: this.radiantBase.y }
            ]
        };

        this.treeImg = new Image();
        this.treeImg.src = 'images/tree.png';
        this.decorations = [];
        this.generateDecorations();
    }

    generateDecorations() {
        const lanes = ['top', 'mid', 'bottom'];
        for (let lane of lanes) {
            const wps = this.waypoints[lane];
            for (let i = 0; i < wps.length - 1; i++) {
                const from = wps[i];
                const to = wps[i+1];
                const steps = 20;
                for (let j = 0; j < steps; j++) {
                    const t = j / steps;
                    const x = from.x + (to.x - from.x) * t;
                    const y = from.y + (to.y - from.y) * t;
                    if (Math.random() < 0.15) {
                        const offsetX = (Math.random() - 0.5) * 90;
                        const offsetY = (Math.random() - 0.5) * 90;
                        this.decorations.push({
                            x: x + offsetX,
                            y: y + offsetY,
                            type: 'tree',
                            size: 60 + Math.random() * 60
                        });
                    }
                }
            }
        }
        for (let i = 0; i < 30; i++) {
            this.decorations.push({
                x: 150 + Math.random() * 300,
                y: 3975 + Math.random() * 300,
                type: 'tree',
                size: 80 + Math.random() * 80
            });
            this.decorations.push({
                x: 5550 + Math.random() * 300,
                y: 600 + Math.random() * 300,
                type: 'tree',
                size: 80 + Math.random() * 80
            });
        }
    }

    drawDecoration(ctx, deco, camera) {
        const img = this.treeImg;
        const size = deco.size || 160;
        const sx = deco.x - camera.x - size/2;
        const sy = deco.y - camera.y - size;

        if (img && img.complete && img.naturalWidth) {
            ctx.drawImage(img, sx, sy, size, size);
        } else {
            ctx.save();
            ctx.fillStyle = '#2b6b2f';
            ctx.beginPath();
            ctx.ellipse(deco.x - camera.x, deco.y - camera.y - size*0.2, size*0.5, size*0.75, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#6d3f1e';
            ctx.fillRect(deco.x - camera.x - size*0.05, deco.y - camera.y - size*0.16, size*0.1, size*0.25);
            ctx.restore();
        }
    }

    draw(ctx, camera) {
        ctx.fillStyle = '#1e2d1a';
        ctx.fillRect(-camera.x, -camera.y, this.width, this.height);

        const laneColors = ['#3a5a3a', '#4a6a4a', '#3a5a3a'];
        const lanes = ['top', 'mid', 'bottom'];
        for (let idx = 0; idx < lanes.length; idx++) {
            const wps = this.waypoints[lanes[idx]];
            ctx.strokeStyle = laneColors[idx];
            ctx.lineWidth = 30;
            ctx.beginPath();
            ctx.moveTo(wps[0].x - camera.x, wps[0].y - camera.y);
            for (let i = 1; i < wps.length; i++) {
                ctx.lineTo(wps[i].x - camera.x, wps[i].y - camera.y);
            }
            ctx.stroke();
            ctx.strokeStyle = '#6a8a6a';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(wps[0].x - camera.x, wps[0].y - camera.y);
            for (let i = 1; i < wps.length; i++) {
                ctx.lineTo(wps[i].x - camera.x, wps[i].y - camera.y);
            }
            ctx.stroke();
        }

        ctx.fillStyle = '#2a4a2a';
        ctx.fillRect(150 - camera.x, 3975 - camera.y, 450, 300);
        ctx.fillStyle = '#4a2a2a';
        ctx.fillRect(5400 - camera.x, 600 - camera.y, 450, 300);

        for (let deco of this.decorations) {
            this.drawDecoration(ctx, deco, camera);
        }

        ctx.strokeStyle = '#2d4a2d';
        ctx.lineWidth = 4;
        ctx.strokeRect(-camera.x, -camera.y, this.width, this.height);
    }
}

// ----------------------------------------------
// КАМЕРА
// ----------------------------------------------
class Camera {
    constructor(map) { this.x = 0; this.y = 0; this.map = map; }
    update(tx, ty) {
        this.x = tx - canvas.width / 2;
        this.y = ty - canvas.height / 2;
        if (this.x < 0) this.x = 0;
        if (this.y < 0) this.y = 0;
        if (this.x > this.map.width - canvas.width) this.x = this.map.width - canvas.width;
        if (this.y > this.map.height - canvas.height) this.y = this.map.height - canvas.height;
    }
}

// ----------------------------------------------
// СПОСОБНОСТИ И ИНВЕНТАРЬ
// ----------------------------------------------
class Ability {
    constructor(name, type, cooldown, cost, desc = "") {
        this.name = name; this.type = type; this.maxCooldown = cooldown;
        this.currentCooldown = 0; this.manaCost = cost; this.description = desc;
    }
    update(dt) {
        if (this.currentCooldown > 0) {
            this.currentCooldown -= dt;
            if (this.currentCooldown < 0) this.currentCooldown = 0;
        }
    }
    trigger(caster) {
        if (this.type === 'passive' || this.currentCooldown > 0 || caster.mp < this.manaCost) return false;
        caster.mp -= this.manaCost;
        this.currentCooldown = this.maxCooldown;
        audio.play('ability'); 
        return true;
    }
}

class Item {
    constructor(id, name, cost, stats) { this.id = id; this.name = name; this.cost = cost; this.stats = stats; }
}

class Inventory {
    constructor(owner) { this.owner = owner; this.slots = new Array(6).fill(null); }
    get items() { return this.slots.filter(Boolean); }
    addItem(item) {
        for (let i = 0; i < 6; i++) {
            if (this.slots[i] === null) {
                this.slots[i] = item;
                this.applyItemStats(item, 1);
                this.combineVanguardPairs();
                this.combineHeart();
                return true;
            }
        } 
        return false; 
    }
    combineVanguardPairs() {
        let ringSlot = this.slots.findIndex(i => i && i.id === 'ringhealth');
        let vitalitySlot = this.slots.findIndex(i => i && i.id === 'vitality');

        if (ringSlot !== -1 && vitalitySlot !== -1) {
            const combineSlot = Math.min(ringSlot, vitalitySlot);
            const removeSlot = Math.max(ringSlot, vitalitySlot);

            this.removeItemAt(removeSlot);
            this.removeItemAt(combineSlot);

            const vanguard = new Item('vanguard', 'Vanguard', 0, {
                hp: 250,
                hpRegen: 4.5,
                damageBlock: true
            });
            this.slots[combineSlot] = vanguard;
            this.applyItemStats(vanguard, 1);
            if (game && game.uiManager) {
                game.uiManager.addFloatingText(this.owner.x, this.owner.y - 30, 'VANGUARD!', '#ffd700');
            }
        }
    }
    combineHeart() {
        let ringIndex = this.slots.findIndex(i => i && i.id === 'ringtarrasque');
        let reaverIndex = this.slots.findIndex(i => i && i.id === 'reaver');
        if (ringIndex !== -1 && reaverIndex !== -1) {
            const combineSlot = Math.min(ringIndex, reaverIndex);
            const removeSlot = Math.max(ringIndex, reaverIndex);
            this.removeItemAt(removeSlot);
            this.removeItemAt(combineSlot);
            const heart = new Item('heart', 'Heart of Tarrasque', 0, {
                hp: 25,
                hpRegen: 12
            });
            this.slots[combineSlot] = heart;
            this.applyItemStats(heart, 1);
            if (game && game.uiManager) {
                game.uiManager.addFloatingText(this.owner.x, this.owner.y - 30, 'HEART OF TARRASQUE!', '#00ff00');
            }
        }
    }
    applyItemStats(item, factor = 1) {
        if (item.stats.speedBonus) this.owner.speed *= factor === 1 ? (1 + item.stats.speedBonus) : 1 / (1 + item.stats.speedBonus);
        if (item.stats.damageBonus) this.owner.damage += item.stats.damageBonus * factor;
        if (item.stats.damage) this.owner.damage += item.stats.damage * factor;
        if (item.stats.hpBonus) { this.owner.maxHp += item.stats.hpBonus * factor; this.owner.hp += item.stats.hpBonus * factor; }
        if (item.stats.hp) { this.owner.maxHp += item.stats.hp * factor; this.owner.hp += item.stats.hp * factor; }
        if (item.stats.mana) { this.owner.maxMp += item.stats.mana * factor; this.owner.mp += item.stats.mana * factor; }
        if (item.stats.manaRegen) this.owner.inventoryManaRegen = (this.owner.inventoryManaRegen || 0) + item.stats.manaRegen * factor;
        if (item.stats.manaRegenBonus) this.owner.inventoryManaRegen = (this.owner.inventoryManaRegen || 0) + item.stats.manaRegenBonus * factor;
        if (item.stats.hpRegen) this.owner.inventoryHpRegen = (this.owner.inventoryHpRegen || 0) + item.stats.hpRegen * factor;
        if (item.stats.armorBonus) this.owner.armor = (this.owner.armor || 0) + item.stats.armorBonus * factor;
        if (item.stats.evasion) {
            if (!this.owner.evasion) this.owner.evasion = 0;
            this.owner.evasion += item.stats.evasion * factor;
            if (this.owner.evasion > 0.9) this.owner.evasion = 0.9;
        }
        if (item.stats.agility) {
            if (!this.owner.agility) this.owner.agility = 0;
            this.owner.agility += item.stats.agility * factor;
        }
    }
    removeItemAt(index) {
        const item = this.slots[index];
        if (!item) return;
        this.applyItemStats(item, -1);
        this.slots[index] = null;
    }
}

// ----------------------------------------------
// БАЗОВЫЙ КЛАСС СУЩНОСТИ
// ----------------------------------------------
class Entity {
    constructor(x, y, team, radius, hp, damage, speed) {
        this.x = x; this.y = y; this.team = team; this.radius = radius;
        this.maxHp = hp; this.hp = hp; this.damage = damage; this.speed = speed;
        this.targetX = x; this.targetY = y; this.baseSpeed = speed;
        this.attackTarget = null; this.attackCooldown = 0; this.attackSpeed = 1.2;
        this.attackRange = 100; this.isDead = false; this.facing = 1; this.slowTimer = 0;
        this.headshotSlowTimer = 0;
        this.hitEffectTimer = 0;
        this.silenceTimer = 0;
        this.lifeBreakSlowTimer = 0;
        this.magicResistance = 0;
        this.burningSpears = [];
        this.nasalGooEffects = [];
        this.quillStacks = [];
        this.waypoints = null;
        this.currentWaypointIndex = 0;
        this.isMovingToWaypoint = false;
        this._stuckCheckTimer = 0;
        this._lastPos = { x: this.x, y: this.y };
        this._stuckTime = 0;
        this.counterspellActive = false;
        this.counterspellTimer = 0;
        this.evasion = 0;
        this.missChance = 0;
        this.missChanceTimer = 0;
        this.hasAegis = false;
    }

    isAttackable() {
        return !this.isDead;
    }

    takeDamage(amount, attacker, isFb = false, damageType = 'physical') {
        if (this.isDead) return;
        if (attacker && attacker.team === this.team) return;

        if (attacker instanceof Hero && this instanceof Hero && attacker.team !== this.team) {
            const towers = game.towers.filter(t => t.team === this.team && !t.isDead);
            for (let t of towers) {
                const dist = Math.hypot(t.x - attacker.x, t.y - attacker.y);
                if (dist <= t.attackRange) {
                    t.addAggro(attacker);
                }
            }
        }

        if (damageType !== 'magic' && this.inventory) {
            let vanguard = this.inventory.items.find(i => i.id === 'vanguard');
            if (vanguard) {
                let blockChance = 0.6;
                if (Math.random() < blockChance) {
                    let blockAmount = this instanceof Bristleback ? 50 : 25;
                    amount = Math.max(0, amount - blockAmount);
                    game.uiManager.addFloatingText(this.x, this.y - 25, 'BLOCK', '#bbbbbb');
                }
            }
        }

        if (damageType === 'magic') {
            amount *= Math.max(0, 1 - (this.magicResistance || 0));
        } else {
            let armorDebuff = 0;
            if (this.nasalGooEffects && this.nasalGooEffects.length > 0) {
                armorDebuff = this.nasalGooEffects.reduce((sum, effect) => sum + effect.armor, 0);
            }
            let armorValue = (this.armor || 0) + (this.armorBonusAura || 0) - armorDebuff;
            armorValue = Math.max(armorValue, -50);
            let reduction = armorValue >= 0 ? armorValue / (armorValue + 100) : armorValue * 0.01;
            amount = Math.max(1, amount * (1 - reduction));
        }

        this.hp -= amount;
        game.uiManager.addFloatingText(this.x, this.y - 20, Math.floor(amount), damageType === 'magic' ? '#cc00ff' : '#ff4400');
        if (this.hp <= 0) { this.hp = 0; this.isDead = true; this.onDeath(attacker); }
    }

    updateBuffs(dt) {
        if (this.silenceTimer > 0) this.silenceTimer -= dt;
        if (this.lifeBreakSlowTimer > 0) this.lifeBreakSlowTimer -= dt;
        if (this.counterspellTimer > 0) {
            this.counterspellTimer -= dt;
            if (this.counterspellTimer <= 0) {
                this.counterspellActive = false;
                this.counterspellTimer = 0;
            }
        }
        if (this.missChanceTimer > 0) {
            this.missChanceTimer -= dt;
            if (this.missChanceTimer <= 0) {
                this.missChance = 0;
                this.missChanceTimer = 0;
            }
        }

        if (this.burningSpears && this.burningSpears.length > 0) {
            for (let i = this.burningSpears.length - 1; i >= 0; i--) {
                let stack = this.burningSpears[i];
                stack.duration -= dt;
                stack.tickTimer += dt;
                if (stack.tickTimer >= 1.0) {
                    stack.tickTimer -= 1.0;
                    this.takeDamage(12, stack.attacker, false, 'magic');
                }
                if (stack.duration <= 0) this.burningSpears.splice(i, 1);
            }
        }
    }

    onDeath(attacker) {}
    moveTo(x, y) { this.targetX = x; this.targetY = y; this.isMovingToWaypoint = false; }
    setMoveTarget(x, y) { this.moveTo(x, y); }

    setWaypoints(waypoints) {
        this.waypoints = waypoints;
        this.currentWaypointIndex = 0;
        this.isMovingToWaypoint = true;
        if (waypoints && waypoints.length > 0) {
            this.targetX = waypoints[0].x;
            this.targetY = waypoints[0].y;
        }
    }

    updateMovement(dt) {
        if (this.headshotSlowTimer > 0) this.headshotSlowTimer -= dt;
        if (this.hitEffectTimer > 0) this.hitEffectTimer -= dt;

        if (this.nasalGooEffects && this.nasalGooEffects.length > 0) {
            let totalSlow = 0;
            this.nasalGooEffects = this.nasalGooEffects.filter(effect => {
                effect.remaining -= dt;
                if (effect.remaining > 0) {
                    totalSlow += effect.slow;
                    return true;
                }
                return false;
            });
            this.slowTimer = this.slowTimer;
            this._nasalGooSlow = Math.min(0.65, totalSlow);
        } else {
            this._nasalGooSlow = 0;
        }

        if (this.quillStacks && this.quillStacks.length > 0) {
            this.quillStacks = this.quillStacks.filter(stack => {
                stack.remaining -= dt;
                return stack.remaining > 0;
            });
        }

        let currentSlow = 1.0;
        if (this.slowTimer > 0) { this.slowTimer -= dt; currentSlow *= 0.5; }
        if (this.headshotSlowTimer > 0) currentSlow *= 0.6;
        if (this.lifeBreakSlowTimer > 0) currentSlow *= 0.4;
        if (this._nasalGooSlow) currentSlow *= Math.max(0.1, 1 - this._nasalGooSlow);

        if (window.game && game.shrapnelZones) {
            for (let zone of game.shrapnelZones) {
                if (zone.team !== this.team && Math.hypot(this.x - zone.x, this.y - zone.y) <= zone.radius) {
                    if (!(this instanceof Tower) && !(this instanceof Ancient)) {
                        currentSlow *= 0.75;
                    }
                }
            }
        }

        if (this instanceof Sniper && this.aimTimer > 0) {
            currentSlow *= 0.35; 
        }

        let globalSpeed = window.game ? game.globalSpeedMultiplier : 0.8;
        this.speed = this.baseSpeed * currentSlow * globalSpeed;

        if (this.attackTarget && !this.attackTarget.isDead && this.attackTarget.isAttackable()) {
            this.targetX = this.attackTarget.x;
            this.targetY = this.attackTarget.y;
        } else if (this.isMovingToWaypoint && this.waypoints && this.waypoints.length > 0) {
            const wp = this.waypoints[this.currentWaypointIndex];
            if (Math.hypot(this.x - wp.x, this.y - wp.y) < 20) {
                this.currentWaypointIndex++;
                if (this.currentWaypointIndex >= this.waypoints.length) {
                    this.isMovingToWaypoint = false;
                } else {
                    this.targetX = this.waypoints[this.currentWaypointIndex].x;
                    this.targetY = this.waypoints[this.currentWaypointIndex].y;
                }
            }
        }

        let dx = this.targetX - this.x;
        let dy = this.targetY - this.y;
        let dist = Math.hypot(dx, dy);

        let stopRange = this.attackTarget ? this.attackRange * 0.85 : 2;

        if (dist > stopRange) {
            this.facing = dx >= 0 ? 1 : -1;
            let step = this.speed * dt;

            if (step >= (dist - stopRange)) {
                if (!this.attackTarget) {
                    this.x = this.targetX;
                    this.y = this.targetY;
                } else {
                    this.x += (dx / dist) * (dist - stopRange);
                    this.y += (dy / dist) * (dist - stopRange);
                }
            } else {
                this.x += (dx / dist) * step;
                this.y += (dy / dist) * step;
            }
        } else if (!this.attackTarget) {
            // остановились
        }

        this._stuckCheckTimer += dt;
        if (this._stuckCheckTimer > 2.0) {
            this._stuckCheckTimer = 0;
            const dx2 = this.x - this._lastPos.x;
            const dy2 = this.y - this._lastPos.y;
            const dist2 = Math.hypot(dx2, dy2);
            if (dist2 < 5 && !this.isDead && !this.attackTarget && this.speed > 0.1) {
                this._stuckTime += 2.0;
                if (this._stuckTime > 5.0) {
                    if (this.waypoints && this.waypoints.length > 0) {
                        this.currentWaypointIndex = Math.min(this.currentWaypointIndex + 1, this.waypoints.length - 1);
                        this.targetX = this.waypoints[this.currentWaypointIndex].x;
                        this.targetY = this.waypoints[this.currentWaypointIndex].y;
                    }
                    this._stuckTime = 0;
                }
            } else {
                this._stuckTime = 0;
            }
            this._lastPos.x = this.x;
            this._lastPos.y = this.y;
        }

        this.x = Math.max(0, Math.min(game.map.width, this.x));
        this.y = Math.max(0, Math.min(game.map.height, this.y));
    }

    drawHealthBar(ctx, camera) {
        let sx = this.x - camera.x; let sy = this.y - camera.y - this.radius - 10;
        let w = this.radius * 2.4; let h = 5;
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(sx - w/2, sy, w, h);
        ctx.fillStyle = this.team === 'radiant' ? '#33ff33' : '#ff3333';
        ctx.fillRect(sx - w/2, sy, (this.hp / this.maxHp) * w, h);
    }

    drawShadow(ctx, camera) {
        let sx = this.x - camera.x; let sy = this.y - camera.y + this.radius - 2;
        ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath();
        ctx.ellipse(sx, sy, this.radius * 1.1, this.radius * 0.35, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.restore();
    }
}

// =========================================================================
//  БАЗОВЫЙ КЛАСС ГЕРОЯ (Hero) — ДОБАВЛЕН
// =========================================================================

class Hero extends Entity {
    constructor(x, y, team, name) {
        super(x, y, team, 18, 600, 50, 280);
        this.name = name;
        this.level = 1;
        this.xp = 0;
        this.maxXp = 100;
        this.gold = 200;
        this.inventory = new Inventory(this);
        this.abilities = [];

        this.hpRegenBase = 2.0;
        this.mpRegenBase = 1.2;
        this.inventoryHpRegen = 0;
        this.inventoryManaRegen = 0;

        this.maxMp = 0;
        this.mp = 0;

        // ========== ТЕЛЕПОРТ ==========
        this.teleportCharges = 1;
        this.teleportCooldown = 0;
        this.teleportMaxCooldown = 60; // 60 секунд на восстановление заряда
        this.isChannelingTeleport = false;
        this.teleportTimer = 0;
        this.teleportTarget = null;
        this.teleportStartX = 0;
        this.teleportStartY = 0;

        this.stunned = false;
        this.stunTimer = 0;
        this.invulnerable = false;
        this.passiveGoldTimer = 0;

        this.attackRange = 100;
        this.attackSpeed = 1.2;

        // Респавн
        this.respawnTimer = 0;
        this.respawnCooldown = 10;
    }

    // ---------- XP и уровень ----------
    addXp(amount) {
        this.xp += amount;
        while (this.xp >= this.maxXp) {
            this.xp -= this.maxXp;
            this.level++;
            this.maxXp = Math.floor(this.maxXp * 1.5);
        }
    }

    gainGold(amount) {
        this.gold += amount;
    }

    getHpRegen() {
        let base = this.hpRegenBase + (this.inventoryHpRegen || 0);
        // Heart of Tarrasque: 1.5% от недостающего здоровья
        if (this.inventory && this.inventory.items) {
            const heart = this.inventory.items.find(item => item.id === 'heart');
            if (heart) {
                const missing = this.maxHp - this.hp;
                base += missing * 0.015;
            }
        }
        return base;
    }

    getMpRegen() {
        return this.mpRegenBase + (this.inventoryManaRegen || 0);
    }

    // ---------- ТЕЛЕПОРТ ----------
    startTeleport(target) {
        if (this.isDead || this.isChannelingTeleport) return false;
        if (this.teleportCharges <= 0) {
            if (game && game.uiManager) {
                game.uiManager.addFloatingText(this.x, this.y - 30, '❌ No TP charges', '#ff6666');
            }
            return false;
        }
        if (!target || target.isDead || target.team !== this.team) return false;

        this.isChannelingTeleport = true;
        this.teleportTimer = 3.0;
        this.teleportTarget = target;
        this.teleportStartX = this.x;
        this.teleportStartY = this.y;
        this.attackTarget = null;
        this.targetX = this.x;
        this.targetY = this.y;
        this.isMovingToWaypoint = false;
        return true;
    }

    cancelTeleport(reason = '') {
        if (!this.isChannelingTeleport) return;
        this.isChannelingTeleport = false;
        this.teleportTimer = 0;
        this.teleportTarget = null;
        if (game && game.uiManager && reason) {
            game.uiManager.addFloatingText(this.x, this.y - 30, '❌ Teleport cancelled', '#ff6666');
        }
    }

    updateTeleport(dt) {
        if (!this.isChannelingTeleport) return;
        if (this.isDead) { this.cancelTeleport('death'); return; }
        const distMoved = Math.hypot(this.x - this.teleportStartX, this.y - this.teleportStartY);
        if (distMoved > 5) {
            this.cancelTeleport('move');
            return;
        }
        if (!this.teleportTarget || this.teleportTarget.isDead || this.teleportTarget.team !== this.team) {
            this.cancelTeleport('target lost');
            return;
        }
        this.teleportTimer -= dt;
        if (this.teleportTimer <= 0) {
            const target = this.teleportTarget;
            const angle = Math.random() * Math.PI * 2;
            const distance = 50 + this.radius + (target.radius || 30);
            let tx = target.x + Math.cos(angle) * distance;
            let ty = target.y + Math.sin(angle) * distance;
            tx = Math.max(0, Math.min(game.map.width, tx));
            ty = Math.max(0, Math.min(game.map.height, ty));
            this.x = tx;
            this.y = ty;
            this.targetX = this.x;
            this.targetY = this.y;
            this.isChannelingTeleport = false;
            this.teleportTarget = null;
            this.teleportCharges--;
            game.effects.push({ type: 'teleport_arrive', x: this.x, y: this.y, life: 0.5, radius: 40, team: this.team });
            if (game.uiManager) game.uiManager.addFloatingText(this.x, this.y - 30, '✅ Teleported!', '#7dd3fc');
        }
    }

    // ---------- АТАКА ----------
    performAttack() {
        if (!this.attackTarget || this.attackTarget.isDead) return;
        if (this.attackCooldown > 0) return;
        this.attackCooldown = this.attackSpeed;

        if (this.attackTarget.evasion > 0 && Math.random() < this.attackTarget.evasion) {
            game.uiManager.addFloatingText(this.attackTarget.x, this.attackTarget.y - 30, 'MISS', '#ff6666');
            return;
        }
        if (this.missChance > 0 && Math.random() < this.missChance) {
            game.uiManager.addFloatingText(this.x, this.y - 30, 'MISS (Blind)', '#ff6666');
            return;
        }

        let damage = this.damage;
        let critItem = this.inventory.items.find(i => i.stats.critChance);
        if (critItem && Math.random() < critItem.stats.critChance) {
            damage *= critItem.stats.critMultiplier || 1.6;
            game.uiManager.addFloatingText(this.attackTarget.x, this.attackTarget.y - 45, 'CRIT!', '#ff0000');
        }

        const proj = new Projectile(this.x, this.y, this.attackTarget, damage, this.team, this);
        game.projectiles.push(proj);
    }

    useAbility(idx) {
        // переопределяется в наследниках
    }

    // ---------- СМЕРТЬ И РЕСПАВН ----------
    // ---------- СМЕРТЬ И РЕСПАВН ----------
    onDeath(attacker) {
        // Аегис спасает от смерти мгновенно и на месте — без золота атакующему
        if (this.hasAegis) {
            this.hasAegis = false;
            this.isDead = false;
            this.hp = this.maxHp;
            this.mp = this.maxMp;
            this.respawnTimer = 0;
            if (game && game.uiManager) {
                game.uiManager.addFloatingText(this.x, this.y - 40, '🛡️ Aegis revived!', '#ffd700');
            }
            return;
        }

        this.respawnTimer = this.respawnCooldown;
        if (game && game.uiManager) {
            game.uiManager.addFloatingText(this.x, this.y - 30, '💀 Respawn in ' + Math.ceil(this.respawnTimer) + 's', '#ff4444');
        }

        // ★★★ ЗОЛОТО ЗА УБИЙСТВО ★★★
        if (attacker instanceof Hero) {
            attacker.gold += 200;
            if (attacker === game.playerHero) {
                game.uiManager.addFloatingText(this.x, this.y - 15, '+200 🪙', '#ffd700');
            }
        }
    }

    // ---------- ОСНОВНОЙ update (с восстановлением зарядов ТП) ----------
    update(dt) {
        // Восстановление заряда телепорта
        if (this.teleportCooldown > 0) {
            this.teleportCooldown -= dt;
            if (this.teleportCooldown <= 0) {
                this.teleportCooldown = 0;
                if (this.teleportCharges < 3) {
                    this.teleportCharges++;
                    this.teleportCooldown = this.teleportMaxCooldown;
                }
            }
        } else if (this.teleportCharges < 3) {
            // Если зарядов меньше 3, запускаем кулдаун
            this.teleportCooldown = this.teleportMaxCooldown;
        }

        // ---- Если герой мёртв - обновляем таймер и выходим ----
        if (this.isDead) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) {
                this.isDead = false;
                this.hp = this.maxHp;
                this.mp = this.maxMp;
                this.teleportCharges = Math.min(3, this.teleportCharges + 1);
                const fountain = game.fountains.find(f => f.team === this.team);
                if (fountain) {
                    this.x = fountain.x;
                    this.y = fountain.y;
                    this.targetX = fountain.x;
                    this.targetY = fountain.y;
                }
                this.respawnTimer = 0;
                if (game && game.uiManager) {
                    game.uiManager.addFloatingText(this.x, this.y - 40, '🔄 Respawned!', '#00ff00');
                }
            }
            // Всё равно обновляем кулдауны способностей
            for (let ab of this.abilities) ab.update(dt);
            return;
        }

        // ---- Живой - обычная логика ----
        this.updateTeleport(dt);
        for (let ab of this.abilities) ab.update(dt);

        if (this.stunned) {
            this.stunTimer -= dt;
            if (this.stunTimer <= 0) {
                this.stunned = false;
                this.stunTimer = 0;
            }
            return;
        }

        if (this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + this.getHpRegen() * dt);
        }
        if (this.maxMp > 0 && this.mp < this.maxMp) {
            this.mp = Math.min(this.maxMp, this.mp + this.getMpRegen() * dt);
        }

        this.updateBuffs(dt);

        if (this.attackCooldown > 0) this.attackCooldown -= dt;
        if (this.attackTarget && this.attackTarget.isAttackable() && !this.attackTarget.isDead) {
            const d = Math.hypot(this.attackTarget.x - this.x, this.attackTarget.y - this.y);
            if (d <= this.attackRange && this.attackCooldown <= 0) {
                this.performAttack();
            }
        }

        this.updateMovement(dt);
    }

    // ---------- ОТРИСОВКА ----------
    draw(ctx, camera) {
        if (this.isDead) {
            const sx = this.x - camera.x;
            const sy = this.y - camera.y;
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(sx - 30, sy - 30, 60, 30);
            ctx.fillStyle = '#ff4444';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const timer = Math.ceil(this.respawnTimer);
            ctx.fillText(timer > 0 ? timer + 's' : '💀', sx, sy - 5);
            ctx.restore();
            return;
        }

        this.drawShadow(ctx, camera);
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;

        // Круг героя
        ctx.save();
        ctx.fillStyle = this.team === 'radiant' ? '#4a9eff' : '#ff4a4a';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Сокращённое имя
        const shortNames = {
            'Morphling': 'MORPH',
            'Warlock': 'WAR',
            'Sniper': 'SNIP',
            'Bristleback': 'BRIST',
            'Huskar': 'HUSK',
            'Anti-Mage': 'ANTI',
            'Broodmother': 'BROOD',
            'Io': 'IO',
            'Tinker': 'TINK'
        };
        let displayName = shortNames[this.name] || this.name.substring(0, 4).toUpperCase();

        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayName, sx, sy);
        ctx.restore();

        this.drawHealthBar(ctx, camera);

        if (this.stunned) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(sx, sy, this.radius + 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    isAttackable() {
        return !this.isDead && !this.invulnerable;
    }
}
// =========================================================================
//  ГЕРОИ (наследники) – полные определения
// =========================================================================

// ----- Morphling -----
class Morphling extends Hero {
    constructor(x, y, team) {
        super(x, y, team, 'Morphling');
        this.attackRange = 270; 
        this.baseStrength = 28;
        this.baseAgility = 28;
        this.minStatLimit = 6; 
        this.morphBaseHp = this.maxHp;
        this.morphBaseDamage = this.damage;
        this.maxMp = 300;
        this.mp = 300;

        this.abilities.push(new Ability('Waveform', 'active', 10, 90, 'Dash forward, dealing 150 damage to all enemies in the path.'));
        this.waveformTimer = 0; this.wdx = 0; this.wdy = 0; this.wHits = [];
        this.abilities.push(new Ability('Adaptive Strike', 'active', 12, 100, 'Launches a watery projectile that deals magic damage, stuns, and knocks back the enemy.'));
        this.abilities.push(new Ability('Shift (Agility)', 'active', 0, 0, 'Gradually moves Strength into Agility, increasing attack damage and speed while reducing health.'));
        this.isShiftingAgility = false;
        this.abilities.push(new Ability('Shift (Strength)', 'active', 0, 0, 'Gradually moves Agility into Strength, increasing health while reducing attack damage.'));
        this.isShiftingStrength = false;
        this.shiftTimer = 0;
    }

    useAbility(idx) {
        if (this.isDead || this.silenceTimer > 0) return;
        if (this.isChannelingTeleport) { this.cancelTeleport('ability'); }

        if (idx === 0) {
            if (this.abilities[0].trigger(this)) {
                this.invulnerable = true; this.waveformTimer = 0.25; this.wHits = [];
                let ang = Math.atan2(this.targetY - this.y, this.targetX - this.x);
                if (this.attackTarget) ang = Math.atan2(this.attackTarget.y - this.y, this.attackTarget.x - this.x);
                this.wdx = Math.cos(ang) * 1200; this.wdy = Math.sin(ang) * 1200;
            }
        } else if (idx === 1) {
            let castRange = this.attackRange + 150; 
            let enemies = this.team === 'radiant' ? game.direEntities() : game.direEntities();
            let target = this.attackTarget || enemies.find(e => Math.hypot(e.x - this.x, e.y - this.y) <= castRange && !e.isDead);

            if (target && Math.hypot(target.x - this.x, target.y - this.y) <= castRange) {
                if (target && target.blockSpell && target.blockSpell(this)) return;
                if (this.abilities[1].trigger(this)) {
                    game.projectiles.push(new AdaptiveStrikeProjectile(this.x, this.y, target, this.team, this));
                }
            }
        } else if (idx === 2) {
            this.isShiftingAgility = !this.isShiftingAgility;
            if (this.isShiftingAgility) {
                this.isShiftingStrength = false;
                if (typeof audio !== 'undefined') audio.play('ability');
            }
        } else if (idx === 3) {
            this.isShiftingStrength = !this.isShiftingStrength;
            if (this.isShiftingStrength) {
                this.isShiftingAgility = false;
                if (typeof audio !== 'undefined') audio.play('ability');
            }
        }
    }

    update(dt) {
        if (this.waveformTimer > 0) {
            this.waveformTimer -= dt; this.x += this.wdx * dt; this.y += this.wdy * dt;
            this.x = Math.max(0, Math.min(game.map.width, this.x));
            this.y = Math.max(0, Math.min(game.map.height, this.y));
            let enemies = this.team === 'radiant' ? game.direEntities() : game.direEntities();
            for (let e of enemies) {
                if (!this.wHits.includes(e) && Math.hypot(e.x - this.x, e.y - this.y) < 65) {
                    e.takeDamage(150, this); this.wHits.push(e);
                }
            }
            if (this.waveformTimer <= 0) { this.invulnerable = false; this.targetX = this.x; this.targetY = this.y; }
        } else {
            super.update(dt);

            if (!this.isDead && (this.isShiftingAgility || this.isShiftingStrength)) {
                this.shiftTimer += dt;
                if (this.shiftTimer >= 0.1) {
                    this.shiftTimer -= 0.1;
                    this.processAttributeShift();
                }
            }
        }
    }

    processAttributeShift() {
        if (this.isShiftingAgility && this.baseStrength > this.minStatLimit) {
            this.baseStrength--;
            this.baseAgility++;
            this.recalculateStats();
        } else if (this.isShiftingStrength && this.baseAgility > this.minStatLimit) {
            this.baseAgility--;
            this.baseStrength++;
            this.recalculateStats();
        }
    }

    recalculateStats() {
        let hpPercent = this.hp / this.maxHp;
        let oldMaxHp = this.maxHp;
        this.maxHp = this.morphBaseHp + (this.baseStrength - 22) * 20;
        this.hp = Math.max(1, this.maxHp * hpPercent);
        this.damage = this.morphBaseDamage + (this.baseAgility - 24);
        this.attackRange = 230 + (this.baseAgility - 24) * 5;

        let agilityBonus = (this.baseAgility - 24) * 0.01;
        this.attackSpeed = Math.max(
            0.3,
            1.2 / (1 + agilityBonus)
        );

        if (game.playerHero === this) {
            if (this.isShiftingAgility) {
                game.uiManager.addFloatingText(this.x, this.y - 30, "+AGI", "#00ffcc");
            } else if (this.isShiftingStrength) {
                game.uiManager.addFloatingText(this.x, this.y - 30, "+STR", "#ff3333");
            }
        }
    }

    draw(ctx, camera) {
        if (this.isDead) return;
        super.draw(ctx, camera);
        let sx = this.x - camera.x; let sy = this.y - camera.y;
        if (this.isShiftingAgility) {
            ctx.save();
            ctx.strokeStyle = '#00ffcc';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy, this.radius + 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        } else if (this.isShiftingStrength) {
            ctx.save();
            ctx.strokeStyle = '#ff3333';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy, this.radius + 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }
}

class AdaptiveStrikeProjectile {
    constructor(x, y, target, team, caster) {
        this.x = x; this.y = y; this.target = target; this.team = team; this.caster = caster;
        this.speed = 650; this.radius = 8; this.isDead = false;
    }
    update(dt) {
        if (this.isDead || this.target.isDead) { this.isDead = true; return; }

        let dx = this.target.x - this.x;
        let dy = this.target.y - this.y;
        let dist = Math.hypot(dx, dy);

        if (dist <= 15) {
            this.isDead = true;
            let dmg = 80 + (this.caster.baseAgility * 1.5);
            let stunDuration = 0.5 + (this.caster.baseStrength * 0.03);
            this.target.takeDamage(dmg, this.caster);
            this.target.stunned = true;
            this.target.stunTimer = Math.min(3.0, stunDuration);
            let pushAng = Math.atan2(dy, dx);
            let pushDist = 80;
            this.target.x += Math.cos(pushAng) * pushDist;
            this.target.y += Math.sin(pushAng) * pushDist;
            this.target.x = Math.max(0, Math.min(game.map.width, this.target.x));
            this.target.y = Math.max(0, Math.min(game.map.height, this.target.y));
            this.target.targetX = this.target.x; this.target.targetY = this.target.y;
        } else {
            this.x += (dx / dist) * this.speed * dt;
            this.y += (dy / dist) * this.speed * dt;
        }
    }
    draw(ctx, camera) {
        if (this.isDead) return;
        let sx = this.x - camera.x; let sy = this.y - camera.y;
        ctx.save();
        ctx.fillStyle = '#00bfff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ----- Warlock -----
class Warlock extends Hero {
    constructor(x, y, team) {
        super(x, y, team, 'Warlock'); this.attackRange = 370;
        this.maxMp = 450;
        this.mp = 450;
        this.abilities.push(new Ability('Fatal Bonds', 'active', 20, 120, 'Links visible enemies for 18 seconds. 15% of damage taken is shared between linked targets.'));
        this.abilities.push(new Ability('Shadow Word', 'active', 15, 100, 'Heals allies or damages enemies in an area around the target every second.'));
        this.abilities.push(new Ability('Upheaval', 'active', 30, 100, 'Toggled ability. Slows enemies in a 575 radius and deals 10 damage per second for up to 10 seconds.'));
        this.abilities.push(new Ability('Chaotic Offering', 'active', 55, 200, 'Ultimate. Summons a golem (1500 HP, 20 sec) and stuns enemies in a 600 radius for 0.8 sec.'));
        
        this.fbLinks = [];
        this.activeShadowWords = [];
        this.isChannelingUpheaval = false;
        this.upheavalTimer = 0;
        this.upheavalX = 0;
        this.upheavalY = 0;
        this.upheavalAffected = [];
        this.ultCooldown = 0;
    }
    
    useAbility(idx) {
        if (this.isDead || this.silenceTimer > 0) return;
        if (this.isChannelingTeleport) { this.cancelTeleport('ability'); }
        
        if (this.isChannelingUpheaval && idx === 2) {
            this.isChannelingUpheaval = false;
            this.resetUpheavalSlows();
            return;
        }
        if (this._stunTime && this._stunTime > 0) return;

        let enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
        
        if (idx === 0) {
            if (this.abilities[0].trigger(this)) {
                let targets = enemies.filter(e => Math.hypot(e.x - this.x, e.y - this.y) <= 700).slice(0, 5);
                if (targets.length > 0) {
                    targets.forEach(t => {
                        if (!t._fbPatched) {
                            let origDamage = t.takeDamage;
                            t.takeDamage = function(amount, attacker, isFb = false, damageType = 'physical') {
                                origDamage.call(this, amount, attacker, isFb, damageType);
                                if (!isFb && !this.isDead && this._fbTimer > 0 && this._fbGroup) {
                                    let share = amount * 0.15;
                                    this._fbGroup.forEach(other => {
                                        if (other !== this && !other.isDead && other._fbTimer > 0) {
                                            other.takeDamage(share, attacker, true, damageType);
                                        }
                                    });
                                }
                            };
                            t._fbPatched = true;
                        }
                        t._fbTimer = 18.0;
                        t._fbGroup = targets;
                    });
                    this.fbLinks.push({ group: targets, timer: 18.0 });
                }
            }
        }
        else if (idx === 1) {
            let swTarget = this.attackTarget || this;
            if (swTarget && swTarget.blockSpell && swTarget.blockSpell(this)) return;
            if (this.abilities[1].trigger(this)) {
                this.activeShadowWords.push({ target: swTarget, timer: 10.0, tickTimer: 0 });
            }
        }
        else if (idx === 2) {
            if (this.abilities[2].trigger(this)) {
                this.isChannelingUpheaval = true;
                this.upheavalTimer = 10.0;
                this.upheavalX = this.attackTarget ? this.attackTarget.x : this.targetX;
                this.upheavalY = this.attackTarget ? this.attackTarget.y : this.targetY;
                this.targetX = this.x; 
                this.targetY = this.y;
                this.attackTarget = null;
            }
        }
        else if (idx === 3) {
            if (!this.abilities[3].trigger(this)) return;
            const cooldownDuration = 20;

            if (!this.ultCooldown || this.ultCooldown <= 0) {
                this.ultCooldown = cooldownDuration;

                if (typeof audioManager !== 'undefined') audioManager.play('buy');

                let potentialTargets = [];
                if (game.creeps) potentialTargets = potentialTargets.concat(game.creeps);
                if (game.towers) potentialTargets = potentialTargets.concat(game.towers);
                if (game.ancients) potentialTargets = potentialTargets.concat(game.ancients);
                if (game.playerHero) potentialTargets.push(game.playerHero);
                if (game.enemyHero) potentialTargets.push(game.enemyHero);

                let tx = this.attackTarget ? this.attackTarget.x : this.targetX;
                let ty = this.attackTarget ? this.attackTarget.y : this.targetY;

                potentialTargets.forEach(entity => {
                    if (entity && entity.hp > 0 && entity.team !== this.team) {
                        let dist = Math.hypot(entity.x - tx, entity.y - ty);
                        if (dist <= 600) {
                            entity.stunned = true;
                            entity.stunTimer = 0.8;
                        }
                    }
                });

                let golem = new WarlockGolem(tx, ty, this.team);
                game.creeps.push(golem);
            }
        }
    }

    update(dt) {
        if (this.isChannelingUpheaval) {
            this.targetX = this.x; 
            this.targetY = this.y;
            this.attackTarget = null;
        }

        if (this.ultCooldown > 0) {
            this.ultCooldown -= dt;
            if (this.ultCooldown < 0) this.ultCooldown = 0;
        }

        super.update(dt);
        
        if (this.isDead) {
            if (this.isChannelingUpheaval) {
                this.isChannelingUpheaval = false;
                this.resetUpheavalSlows();
            }
            return;
        }

        if (this.isChannelingUpheaval) {
            if (this._stunTime && this._stunTime > 0) {
                this.isChannelingUpheaval = false;
                this.resetUpheavalSlows();
            } else {
                this.upheavalTimer -= dt;
                if (this.upheavalTimer <= 0) {
                    this.isChannelingUpheaval = false;
                    this.resetUpheavalSlows();
                } else {
                    let enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
                    let currentSlowMult = Math.max(0.1, 1.0 - (10.0 - this.upheavalTimer) * 0.1);
                    
                    for (let i = this.upheavalAffected.length - 1; i >= 0; i--) {
                        let e = this.upheavalAffected[i];
                        if (Math.hypot(e.x - this.upheavalX, e.y - this.upheavalY) > 300 || e.isDead || !this.isChannelingUpheaval) {
                            if (e._origBaseSpeed !== undefined) {
                                e.baseSpeed = e._origBaseSpeed;
                                delete e._origBaseSpeed;
                            }
                            this.upheavalAffected.splice(i, 1);
                        }
                    }

                    enemies.forEach(e => {
                        if (Math.hypot(e.x - this.upheavalX, e.y - this.upheavalY) <= 300) {
                            if (e._origBaseSpeed === undefined) {
                                e._origBaseSpeed = e.baseSpeed;
                                this.upheavalAffected.push(e);
                            }
                            e.baseSpeed = e._origBaseSpeed * currentSlowMult;
                            
                            if (!e._upheavalTickTimer) e._upheavalTickTimer = 0;
                            e._upheavalTickTimer += dt;
                            if (e._upheavalTickTimer >= 1.0) {
                                e._upheavalTickTimer -= 1.0;
                                e.takeDamage(10, this);
                            }
                        }
                    });
                }
            }
        }

        for (let i = this.fbLinks.length - 1; i >= 0; i--) {
            this.fbLinks[i].timer -= dt;
            if (this.fbLinks[i].timer <= 0) {
                this.fbLinks[i].group.forEach(t => t._fbTimer = 0);
                this.fbLinks.splice(i, 1);
            }
        }

        for (let i = this.activeShadowWords.length - 1; i >= 0; i--) {
            let sw = this.activeShadowWords[i];
            sw.timer -= dt;
            sw.tickTimer += dt;
            if (sw.target.isDead) {
                this.activeShadowWords.splice(i, 1);
                continue;
            }
            if (sw.tickTimer >= 1.0) {
                sw.tickTimer -= 1.0;
                let isAllyTarget = (sw.target.team === this.team);
                let entities = isAllyTarget ? (this.team === 'radiant' ? game.radiantEntities() : game.direEntities()) 
                                            : (this.team === 'radiant' ? game.direEntities() : game.radiantEntities());
                
                entities.forEach(e => {
                    if (Math.hypot(e.x - sw.target.x, e.y - sw.target.y) <= 300) {
                        if (isAllyTarget) {
                            e.hp = Math.min(e.maxHp, e.hp + 45);
                            if (e === game.playerHero) game.uiManager.addFloatingText(e.x, e.y - 25, "+45", '#00ff66');
                        } else {
                            e.takeDamage(45, this);
                        }
                    }
                });
            }
            if (sw.timer <= 0) {
                this.activeShadowWords.splice(i, 1);
            }
        }
    }

    resetUpheavalSlows() {
        this.upheavalAffected.forEach(e => {
            if (e._origBaseSpeed !== undefined) {
                e.baseSpeed = e._origBaseSpeed;
                delete e._origBaseSpeed;
            }
        });
        this.upheavalAffected = [];
    }

    draw(ctx, camera) {
        if (this.isDead) return;

        if (this.isChannelingUpheaval) {
            let sx = this.upheavalX - camera.x; let sy = this.upheavalY - camera.y;
            ctx.save();
            ctx.fillStyle = 'rgba(75, 0, 130, 0.3)';
            ctx.strokeStyle = '#4b0082';
            ctx.beginPath(); ctx.arc(sx, sy, 250, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.restore();
        }

        ctx.save();
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        this.fbLinks.forEach(link => {
            let group = link.group.filter(t => !t.isDead);
            for (let i = 0; i < group.length; i++) {
                for (let j = i + 1; j < group.length; j++) {
                    ctx.beginPath();
                    ctx.moveTo(group[i].x - camera.x, group[i].y - camera.y);
                    ctx.lineTo(group[j].x - camera.x, group[j].y - camera.y);
                    ctx.stroke();
                }
            }
        });
        ctx.restore();

        this.activeShadowWords.forEach(sw => {
            let sx = sw.target.x - camera.x; let sy = sw.target.y - camera.y;
            ctx.save();
            ctx.strokeStyle = (sw.target.team === this.team) ? '#00ff66' : '#8a2be2';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 15]);
            ctx.beginPath(); ctx.arc(sx, sy, 300, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        });

        super.draw(ctx, camera);
    }
}

// ----- Sniper -----
class Sniper extends Hero {
    constructor(x, y, team) {
        super(x, y, team, 'Sniper'); 
        this.baseRange = 340; 
        this.attackRange = this.baseRange + 140;
        this.maxMp = 400;
        this.mp = 400;
        
        this.abilities.push(new Ability('Shrapnel', 'active', 0, 50, 'Creates an area of explosive shrapnel. Deals 35 damage per second and slows enemies by 25%. Up to 2 charges.'));
        this.abilities.push(new Ability('Headshot', 'passive', 0, 0, 'Passive. 30% chance to deal +20 damage, knock back the enemy, and slow their movement and attack for 1.5 sec.'));
        this.abilities.push(new Ability('Take Aim', 'active', 15, 60, 'Passive: +140 attack range. Active: +150 range and 60% Headshot chance, but slows movement by 65% for 6 sec.'));
        this.abilities.push(new Ability('Assassinate', 'active', 18, 150, 'Ultimate. Channels for 1.5 sec and deals massive long-range damage.'));
        
        this.aimTimer = 0; 
        this.assTarget = null; 
        this.assChannel = 0;
        
        this.shrapnelCharges = 2;
        this.maxShrapnelCharges = 2;
        this.shrapnelChargeRegenTimer = 0;
        this.shrapnelChargeCooldown = 15;
    }

    useAbility(idx) {
        if (this.isDead || this.silenceTimer > 0) return;
        if (this.isChannelingTeleport) { this.cancelTeleport('ability'); }
        if (idx === 0) { 
            let ab = this.abilities[0];
            if (this.shrapnelCharges > 0 && this.mp >= ab.manaCost) {
                this.mp -= ab.manaCost;
                this.shrapnelCharges--;
                audio.play('ability');
                let tx = this.targetX;
                let ty = this.targetY;
                if (this.attackTarget) { tx = this.attackTarget.x; ty = this.attackTarget.y; }
                game.shrapnelZones.push(new ShrapnelZone(tx, ty, this.team, this));
            }
        }
        if (idx === 2) { 
            if (this.abilities[2].trigger(this)) {
                this.aimTimer = 6.0;
            }
        }
        if (idx === 3) { 
            let enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
            let t = this.attackTarget || enemies.find(e => Math.hypot(e.x - this.x, e.y - this.y) < 950);
            if (t && t.blockSpell && t.blockSpell(this)) return;
            if (t && this.abilities[3].trigger(this)) { this.assTarget = t; this.assChannel = 1.5; }
        }
    }

    update(dt) {
        if (this.shrapnelCharges < this.maxShrapnelCharges) {
            this.shrapnelChargeRegenTimer += dt;
            if (this.shrapnelChargeRegenTimer >= this.shrapnelChargeCooldown) {
                this.shrapnelCharges++;
                this.shrapnelChargeRegenTimer = 0;
            }
        }

        if (this.aimTimer > 0) { 
            this.aimTimer -= dt; 
            this.attackRange = this.baseRange + 140 + 150; 
        } else { 
            this.attackRange = this.baseRange + 140; 
        }

        super.update(dt);
        if (this.isDead) return;

        if (this.assChannel > 0) {
            this.targetX = this.x; this.targetY = this.y;
            if (!this.assTarget || this.assTarget.isDead) { this.assChannel = 0; this.assTarget = null; return; }
            this.assChannel -= dt;
            if (this.assChannel <= 0) {
                audio.play('ability');
                let proj = new Projectile(this.x, this.y, this.assTarget, 380, this.team, this);
                proj.speed = 1000; proj.isAss = true; game.projectiles.push(proj);
                this.assTarget = null;
            }
        }
    }

    performAttack() {
        if (this.assChannel > 0) return;
        if (this.isChannelingTeleport) { this.cancelTeleport('ability'); return; }
        super.performAttack();
    }

    draw(ctx, camera) {
        super.draw(ctx, camera);
        if (this.isDead) return;
        let sx = this.x - camera.x; let sy = this.y - camera.y;
        if (this.aimTimer > 0) {
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)'; ctx.lineWidth = 3;
            ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.arc(sx, sy, this.radius + 12, 0, Math.PI*2); ctx.stroke();
            ctx.restore();
        }
        if (this.assChannel > 0 && this.assTarget) {
            ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 1.5; ctx.beginPath();
            ctx.moveTo(sx, sy); ctx.lineTo(this.assTarget.x - camera.x, this.assTarget.y - camera.y); ctx.stroke();
        }
    }
}

// ----- Bristleback -----
class Bristleback extends Hero {
    constructor(x, y, team) {
        super(x, y, team, 'Bristleback');
        this.maxHp = 800; this.hp = 900;
        this.damage = 64;
        this.baseSpeed = 260; this.speed = 260;
        this.attackRange = 120;
        this.maxMp = 300;
        this.mp = 300;

        this.abilities.push(new Ability('Viscous Nasal Goo', 'active', 2, 20, 'Fires goo at a target, slowing movement and reducing armor for 5 sec. Effects stack and refresh on each cast.'));
        this.abilities.push(new Ability('Quill Spray', 'active', 3, 25, 'Fires quills in a radius, damaging enemies. Additional damage scales with recent Quill hits.'));
        this.abilities.push(new Ability('Bristleback', 'passive', 0, 0, 'Reduces damage from attacks to the back and sides. Enough back damage triggers a Quill Spray.'));
        this.abilities.push(new Ability('Warpath', 'passive', 0, 0, 'Gains stacks when casting abilities, increasing damage and movement speed for a limited time.'));

        this.nasalGooEffects = [];
        this.backDamageAccumulator = 0;
        this.warpathStacks = [];
        this.warpathMaxStacks = 8;
        this.warpathDuration = 16.0;
        this.quillStackDuration = 5.0;
        this.quillRadius = 500;
        this.quillTriggerThreshold = 275;
        this.bristlebackDamageReduction = 0.24;
        this.quillSprayTimer = 0;
        this.quillSprayDuration = 0.25;
    }

    getAbilityRank() {
        return Math.min(3, Math.floor((this.level - 1) / 2));
    }

    getNasalGooValues() {
        const slowValues = [0.03, 0.06, 0.09, 0.12];
        const armorValues = [3, 6, 9, 12];
        const rank = this.getAbilityRank();
        return { slow: slowValues[rank], armor: armorValues[rank] };
    }

    getQuillDamageBonusPerStack() {
        return 8;
    }

    getWarpathDamageBonus() {
        return 12 * this.warpathStacks.length;
    }

    getWarpathSpeedMultiplier() {
        return 1 + 0.02 * this.warpathStacks.length;
    }

    addWarpathStack() {
        if (this.warpathStacks.length >= this.warpathMaxStacks) {
            this.warpathStacks.shift();
        }
        this.warpathStacks.push({ remaining: this.warpathDuration });
    }

    applyNasalGoo(target) {
        if (!target || target.isDead) return;
        const values = this.getNasalGooValues();
        if (!target.nasalGooEffects) target.nasalGooEffects = [];
        target.nasalGooEffects.forEach(effect => { effect.remaining = 5.0; });
        target.nasalGooEffects.push({ remaining: 5.0, slow: values.slow, armor: values.armor });
        game.uiManager.addFloatingText(target.x, target.y - 30, 'GOO', '#00ffff');
    }

    castQuillSpray(triggered = false) {
        const enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
        const baseDamage = 25;
        let hitAny = false;
        this.quillSprayTimer = this.quillSprayDuration;

        for (let e of enemies) {
            if (e.isDead) continue;
            if (Math.hypot(e.x - this.x, e.y - this.y) <= this.quillRadius) {
                const stackCount = (e.quillStacks || []).length;
                const damage = baseDamage + stackCount * this.getQuillDamageBonusPerStack();
                e.takeDamage(damage, this);
                if (!e.quillStacks) e.quillStacks = [];
                e.quillStacks = e.quillStacks.filter(stack => stack.remaining > 0);
                e.quillStacks.push({ remaining: this.quillStackDuration });
                if (!triggered) game.uiManager.addFloatingText(e.x, e.y - 25, `-${Math.floor(damage)}`, '#ffd700');
                hitAny = true;
            }
        }

        if (hitAny) audio.play('ability');
    }

    isAttackFromBackOrSide(attacker) {
        if (!attacker) return false;
        const dx = attacker.x - this.x;
        const dy = attacker.y - this.y;
        const angle = Math.atan2(dy, dx);
        const forwardAngle = this.facing === 1 ? 0 : Math.PI;
        let diff = Math.abs(((angle - forwardAngle + Math.PI) % (2 * Math.PI)) - Math.PI);
        return diff > Math.PI / 4;
    }

    useAbility(idx) {
        if (this.isDead || this.silenceTimer > 0) return;
        if (this.isChannelingTeleport) { this.cancelTeleport('ability'); }

        if (idx === 0) {
            const ab = this.abilities[0];
            let target = this.attackTarget;
            if (!target || target.team === this.team || target.isDead) {
                const enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
                target = enemies.find(e => Math.hypot(e.x - this.x, e.y - this.y) <= 500);
            }
            if (!target || target.isDead) return;
            if (ab.trigger(this)) {
                this.applyNasalGoo(target);
                this.addWarpathStack();
            }
        } else if (idx === 1) {
            const ab = this.abilities[1];
            if (ab.trigger(this)) {
                this.castQuillSpray();
                this.addWarpathStack();
            }
        }
    }

    update(dt) {
        if (this.warpathStacks.length > 0) {
            this.warpathStacks = this.warpathStacks.filter(stack => {
                stack.remaining -= dt;
                return stack.remaining > 0;
            });
        }
        if (this.quillSprayTimer > 0) {
            this.quillSprayTimer -= dt;
            if (this.quillSprayTimer < 0) this.quillSprayTimer = 0;
        }
        super.update(dt);
    }

    updateMovement(dt) {
        super.updateMovement(dt);
        this.speed *= this.getWarpathSpeedMultiplier();
    }

    performAttack() {
        if (this.isChannelingTeleport) { this.cancelTeleport('ability'); return; }
        super.performAttack();
    }

    takeDamage(amount, attacker, isFb = false, damageType = 'physical') {
        if (this.isDead) return;
        let actualAmount = amount;

        if (attacker && attacker.team !== this.team && this.isAttackFromBackOrSide(attacker)) {
            actualAmount = actualAmount * (1 - this.bristlebackDamageReduction);
            this.backDamageAccumulator += actualAmount;
            if (this.backDamageAccumulator >= this.quillTriggerThreshold) {
                this.backDamageAccumulator -= this.quillTriggerThreshold;
                this.castQuillSpray(true);
            }
        }

        super.takeDamage(actualAmount, attacker, isFb, damageType);
    }

    draw(ctx, camera) {
        super.draw(ctx, camera);
        if (this.quillSprayTimer > 0 && !this.isDead) {
            let sx = this.x - camera.x; let sy = this.y - camera.y;
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(sx, sy, this.quillRadius / 8, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }
    }
}

// ----- Huskar -----
class Huskar extends Hero {
    constructor(x, y, team) {
        super(x, y, team, 'Huskar');
        this.maxHp = 700; this.hp = 700;
        this.maxMp = 0; this.mp = 0; this.mpRegenBase = 0;
        this.baseStrength = 38;
        this.attackRange = 300;
        this.burningSpearActive = false;
        this.lifeBreakTarget = null;

        this.abilities.push(new Ability('Inner Fire', 'active', 12, 0, 'Deals 100 magic damage, knocks back enemies and silences them for 3s. Costs 75 HP.'));
        this.abilities.push(new Ability('Burning Spear', 'active', 0, 0, 'Toggle. Attacks cost 2% max HP and deal 12 magic dmg/sec for 9s.'));
        this.abilities.push(new Ability("Berserker's Blood", 'passive', 0, 0, 'More Attack Speed, Magic Resist, and Regen based on missing HP.'));
        this.abilities.push(new Ability('Life Break', 'active', 14, 0, 'Leaps to target. Costs 35% current HP. Deals 32% target current HP as magic damage and slows 60% for 3s.'));
    }

    useAbility(idx) {
        if (this.isDead || this.silenceTimer > 0) return;
        if (this.isChannelingTeleport) { this.cancelTeleport('ability'); }

        if (idx === 0 && this.abilities[0].currentCooldown <= 0 && this.hp > 75) {
            this.hp -= 75;
            this.abilities[0].currentCooldown = this.abilities[0].maxCooldown;
            audio.play('ability');
            let enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
            for (let e of enemies) {
                let dx = e.x - this.x; let dy = e.y - this.y;
                let dist = Math.hypot(dx, dy);
                if (dist <= 250) {
                    e.takeDamage(100, this, false, 'magic');
                    e.silenceTimer = 3.0;
                    if (!(e instanceof Tower) && !(e instanceof Ancient)) {
                        let pushAngle = Math.atan2(dy, dx);
                        e.x += Math.cos(pushAngle) * 150;
                        e.y += Math.sin(pushAngle) * 150;
                    }
                }
            }
        }
        else if (idx === 1) {
            this.burningSpearActive = !this.burningSpearActive;
            let slot = document.getElementById('ability-1');
            if (this.burningSpearActive && slot) slot.classList.add('autocast-active');
            else if (slot) slot.classList.remove('autocast-active');
        }
        else if (idx === 3 && this.abilities[3].currentCooldown <= 0) {
            let enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
            let target = this.attackTarget || enemies.find(e => Math.hypot(e.x - this.x, e.y - this.y) <= 300);
            if (target && target.blockSpell && target.blockSpell(this)) return;
            if (target && Math.hypot(target.x - this.x, target.y - this.y) <= 300) {
                this.hp -= this.hp * 0.35;
                this.abilities[3].currentCooldown = this.abilities[3].maxCooldown;
                this.lifeBreakTarget = target;
                audio.play('ability');
            }
        }
    }

    update(dt) {
        if (this.isDead) return;

        let hpPct = this.hp / this.maxHp;
        let ratio = Math.max(0, Math.min(1, (1.0 - hpPct) / 0.9));
        this.magicResistance = 0.25 * ratio;
        let bonusAS = 170 * ratio;
        this.attackSpeed = 1.2 / (1 + (bonusAS / 100));
        this.hpRegenBase = 2.0 + (this.baseStrength * 0.55 * ratio);

        if (this.lifeBreakTarget) {
            if (this.lifeBreakTarget.isDead) {
                this.lifeBreakTarget = null;
            } else {
                let dx = this.lifeBreakTarget.x - this.x;
                let dy = this.lifeBreakTarget.y - this.y;
                let dist = Math.hypot(dx, dy);
                if (dist < 30) {
                    let dmg = this.lifeBreakTarget.hp * 0.32;
                    this.lifeBreakTarget.takeDamage(dmg, this, false, 'magic');
                    this.lifeBreakTarget.lifeBreakSlowTimer = 3.0;
                    this.lifeBreakTarget.hitEffectTimer = 0.2;
                    this.lifeBreakTarget = null;
                    this.targetX = this.x; this.targetY = this.y;
                } else {
                    this.x += (dx / dist) * 1200 * dt;
                    this.y += (dy / dist) * 1200 * dt;
                    this.targetX = this.x; this.targetY = this.y;
                }
            }
            for (let ab of this.abilities) ab.update(dt);
            return; 
        }

        super.update(dt);
        this.mp = 0; 
    }

    performAttack() {
        if (this.isChannelingTeleport) { this.cancelTeleport('ability'); return; }
        super.performAttack();
    }
}

// ----- Anti-Mage -----
class AntiMage extends Hero {
    constructor(x, y, team) {
        super(x, y, team, 'Anti-Mage');
        this.maxHp = 600;
        this.hp = 600;
        this.damage = 56;
        this.baseSpeed = 260;
        this.speed = 260;
        this.attackRange = 100;
        this.attackSpeed = 1.2;
        this.maxMp = 300;
        this.mp = 300;
        this.magicResistance = 0.15;

        this.abilities = [
            new Ability('Mana Break', 'passive', 0, 0, 'Burns 25 mana per attack, dealing bonus physical damage equal to mana burned.'),
            new Ability('Blink', 'active', 7, 50, 'Teleports a short distance instantly.'),
            new Ability('Counterspell', 'active', 15, 50, 'Passive: +14% magic resistance. Active: creates a shield for 1.3s that reflects single-target spells.'),
            new Ability('Mana Void', 'active', 70, 150, 'Deals damage to target and nearby enemies based on missing mana. Stuns for 0.3s.')
        ];
    }

    performAttack() {
    if (this.isChannelingTeleport) { this.cancelTeleport('ability'); return; }
    if (!this.attackTarget || this.attackTarget.isDead) return;
    if (this.attackCooldown > 0) return;
    this.attackCooldown = this.attackSpeed;

    // Проверка на уклонение
    if (this.attackTarget.evasion > 0 && Math.random() < this.attackTarget.evasion) {
        game.uiManager.addFloatingText(this.attackTarget.x, this.attackTarget.y - 30, 'MISS', '#ff6666');
        return;
    }
    if (this.missChance > 0 && Math.random() < this.missChance) {
        game.uiManager.addFloatingText(this.x, this.y - 30, 'MISS (Blind)', '#ff6666');
        return;
    }

    let damage = this.damage;
    // Проверка крита (если есть предмет)
    let critItem = this.inventory.items.find(i => i.stats.critChance);
    if (critItem && Math.random() < critItem.stats.critChance) {
        damage *= critItem.stats.critMultiplier || 1.6;
        game.uiManager.addFloatingText(this.attackTarget.x, this.attackTarget.y - 45, 'CRIT!', '#ff0000');
    }

    const proj = new Projectile(this.x, this.y, this.attackTarget, damage, this.team, this);
    proj.isManaBreak = true; // ★★★ ВАЖНО: устанавливаем флаг для сжигания маны ★★★
    game.projectiles.push(proj);
}

    useAbility(idx) {
        if (this.isDead || this.silenceTimer > 0) return;
        if (this.isChannelingTeleport) { this.cancelTeleport('ability'); }

        if (idx === 1) {
            const ab = this.abilities[1];
            if (!ab.trigger(this)) return;
            let targetX = this.targetX;
            let targetY = this.targetY;
            if (this.attackTarget) {
                targetX = this.attackTarget.x;
                targetY = this.attackTarget.y;
            }
            let dx = targetX - this.x;
            let dy = targetY - this.y;
            let dist = Math.hypot(dx, dy);
            if (dist > 1) {
                let step = 600 / dist;
                let newX = this.x + dx * step;
                let newY = this.y + dy * step;
                newX = Math.max(0, Math.min(game.map.width, newX));
                newY = Math.max(0, Math.min(game.map.height, newY));
                this.x = newX;
                this.y = newY;
                this.targetX = newX;
                this.targetY = newY;
                if (game) {
                    game.effects.push({
                        type: 'blink',
                        x: this.x,
                        y: this.y,
                        life: 0.3,
                        radius: 40,
                        team: this.team
                    });
                }
            }
        } else if (idx === 2) {
            const ab = this.abilities[2];
            if (!ab.trigger(this)) return;
            this.counterspellActive = true;
            this.counterspellTimer = 1.3;
            if (game) {
                game.effects.push({
                    type: 'counterspell_shield',
                    x: this.x,
                    y: this.y,
                    life: 1.3,
                    radius: this.radius * 1.5,
                    team: this.team
                });
            }
        } else if (idx === 3) {
            const ab = this.abilities[3];
            if (!ab.trigger(this)) return;
            let target = this.attackTarget;
            if (!target || target.isDead || target.team === this.team) {
                const enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
                target = enemies.find(e => Math.hypot(e.x - this.x, e.y - this.y) < 600);
            }
            if (!target || target.isDead) return;
            let missingMana = Math.max(0, (target.maxMp || 0) - (target.mp || 0));
            let damage = missingMana * 1;
            const radius = 350;
            const enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
            for (let e of enemies) {
                if (e.isDead) continue;
                if (e === target || Math.hypot(e.x - target.x, e.y - target.y) <= radius) {
                    if (e === target) {
                        e.stunned = true;
                        e.stunTimer = Math.max(e.stunTimer || 0, 0.3);
                    }
                    e.takeDamage(damage, this, false, 'magic');
                }
            }
            if (game) {
                game.effects.push({
                    type: 'mana_void',
                    x: target.x,
                    y: target.y,
                    life: 0.6,
                    radius: radius,
                    team: this.team
                });
            }
        }
    }

    draw(ctx, camera) {
        super.draw(ctx, camera);
        if (this.isDead) return;
        if (this.counterspellActive) {
            let sx = this.x - camera.x;
            let sy = this.y - camera.y;
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 200, 255, 0.6)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(sx, sy, this.radius * 1.6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }
}

// =========================================================================
//  BROODMOTHER
// =========================================================================

class Broodmother extends Hero {
    constructor(x, y, team) {
        super(x, y, team, 'Broodmother');
        this.maxHp = 700;
        this.hp = 700;
        this.damage = 58;
        this.baseSpeed = 295;
        this.speed = 305;
        this.attackRange = 140;
        this.attackSpeed = 1.1;
        this.maxMp = 300;
        this.mp = 300;
        this.hpRegenBase = 2.0;
        this.mpRegenBase = 1.2;

        this.abilities.push(new Ability('Insatiable Hunger', 'active', 30, 30, 'Gain +40% damage and 40% lifesteal for 8 seconds. Also affects spiderlings.'));
        this.abilities.push(new Ability('Spin Web', 'active', 10, 35, 'Create a web at target location. Grants +30% speed while inside. Max 3 webs.'));
        this.abilities.push(new Ability('Incapacitating Bite', 'passive', 0, 0, 'Attacks slow enemy by 15%, give 30% miss chance, and +3 damage taken for 2 seconds.'));
        this.abilities.push(new Ability('Spawn Spiderlings', 'active', 9, 60, 'Deals 220 magic damage to target, slows 25% for 4 sec. If target dies while debuffed, spawn 4 spiderlings.'));

        this.hungerActive = false;
        this.hungerTimer = 0;
        this.hungerDamageMult = 1.4;
        this.hungerLifesteal = 0.4;
        this.hungerDuration = 8;

        this.webs = [];
        this.maxWebs = 3;
        this.webRadius = 150;
        this.webSpeedBonus = 0.30;

        this.spiderlings = [];
        this.spiderDebuffs = [];

        this._aiWebTimer = 0;
        this._aiHungerTimer = 0;
        this._aiSpiderTimer = 0;
    }

    useInsatiableHunger() {
        if (this.isDead || this.silenceTimer > 0) return false;
        if (this.abilities[0].currentCooldown > 0 || this.mp < this.abilities[0].manaCost) return false;
        this.mp -= this.abilities[0].manaCost;
        this.abilities[0].currentCooldown = this.abilities[0].maxCooldown;
        audio.play('ability');

        this.hungerActive = true;
        this.hungerTimer = this.hungerDuration;
        this.damage = Math.floor(this.damage * this.hungerDamageMult);
        this.updateSpiderlingsHunger();
        game.uiManager.addFloatingText(this.x, this.y - 30, 'INSATIABLE HUNGER!', '#ff6666');
        return true;
    }

    updateHunger(dt) {
        if (this.hungerActive) {
            this.hungerTimer -= dt;
            if (this.hungerTimer <= 0) {
                this.hungerActive = false;
                this.damage = Math.floor(this.damage / this.hungerDamageMult);
                this.updateSpiderlingsHunger();
                game.uiManager.addFloatingText(this.x, this.y - 30, 'Hunger fades', '#aaaaaa');
            }
        }
    }

    updateSpiderlingsHunger() {
        for (let s of this.spiderlings) {
            if (s.isDead) continue;
            if (this.hungerActive) {
                s.damage = Math.floor(s.baseDamage * this.hungerDamageMult);
                s.hungerLifesteal = this.hungerLifesteal;
            } else {
                s.damage = s.baseDamage;
                s.hungerLifesteal = 0;
            }
        }
    }

    useSpinWeb(targetX, targetY) {
        if (this.isDead || this.silenceTimer > 0) return false;
        if (this.abilities[1].currentCooldown > 0 || this.mp < this.abilities[1].manaCost) return false;

        const radius = this.webRadius;
        let touchesExisting = false;
        for (let w of this.webs) {
            const dist = Math.hypot(w.x - targetX, w.y - targetY);
            if (dist <= radius + w.radius) {
                touchesExisting = true;
                break;
            }
        }
        if (!touchesExisting) {
            const distToHero = Math.hypot(this.x - targetX, this.y - targetY);
            if (distToHero > 200) {
                game.uiManager.addFloatingText(this.x, this.y - 30, 'Web must touch existing web or be near hero', '#ff8888');
                return false;
            }
        }

        this.mp -= this.abilities[1].manaCost;
        this.abilities[1].currentCooldown = this.abilities[1].maxCooldown;
        audio.play('ability');

        this.webs.push({ x: targetX, y: targetY, radius: radius });
        if (this.webs.length > this.maxWebs) {
            this.webs.shift();
        }
        game.uiManager.addFloatingText(targetX, targetY - 20, '🕸️ Web', '#aaaaaa');
        return true;
    }

    getWebSpeedBonus() {
        for (let w of this.webs) {
            const dist = Math.hypot(this.x - w.x, this.y - w.y);
            if (dist <= w.radius) {
                return this.webSpeedBonus;
            }
        }
        return 0;
    }

    applyIncapacitatingBite(target) {
        if (!target || target.isDead) return;
        let existing = target._incapacitatingBite;
        if (existing) {
            existing.timer = 2.0;
        } else {
            target._incapacitatingBite = {
                slow: 0.15,
                missChance: 0.30,
                bonusDamageTaken: 3,
                timer: 2.0
            };
        }
    }

    updateIncapacitatingBite(dt) {
        const enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
        for (let e of enemies) {
            if (e._incapacitatingBite) {
                e._incapacitatingBite.timer -= dt;
                if (e._incapacitatingBite.timer <= 0) {
                    delete e._incapacitatingBite;
                }
            }
        }
    }

    performAttack() {
        if (this.isChannelingTeleport) { this.cancelTeleport('ability'); return; }
        super.performAttack();
    }

    useSpawnSpiderlings(target) {
        if (this.isDead || this.silenceTimer > 0) return false;
        if (this.abilities[3].currentCooldown > 0 || this.mp < this.abilities[3].manaCost) return false;
        if (!target || target.isDead || target.team === this.team) return false;
        const dist = Math.hypot(target.x - this.x, target.y - this.y);
        if (dist > 500) return false;

        this.mp -= this.abilities[3].manaCost;
        this.abilities[3].currentCooldown = this.abilities[3].maxCooldown;
        audio.play('ability');

        target.takeDamage(220, this, false, 'magic');
        target.slowTimer = Math.max(target.slowTimer || 0, 4.0);
        this.spiderDebuffs.push({ target: target, timer: 4.0 });

        game.uiManager.addFloatingText(target.x, target.y - 30, '🕷️ Eggs!', '#ff66ff');
        return true;
    }

    updateSpiderDebuffs(dt) {
        for (let i = this.spiderDebuffs.length - 1; i >= 0; i--) {
            let debuff = this.spiderDebuffs[i];
            debuff.timer -= dt;
            if (debuff.timer <= 0) {
                if (debuff.target && debuff.target.isDead) {
                    this.spawnSpiderlings(debuff.target.x, debuff.target.y);
                }
                this.spiderDebuffs.splice(i, 1);
            } else {
                if (debuff.target && debuff.target.isDead) {
                    this.spawnSpiderlings(debuff.target.x, debuff.target.y);
                    this.spiderDebuffs.splice(i, 1);
                }
            }
        }
    }

    spawnSpiderlings(x, y) {
        const count = 4;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
            const dist = 30 + Math.random() * 40;
            const sx = x + Math.cos(angle) * dist;
            const sy = y + Math.sin(angle) * dist;
            const spider = new Spiderling(sx, sy, this.team, this);
            if (this.hungerActive) {
                spider.damage = Math.floor(spider.baseDamage * this.hungerDamageMult);
                spider.hungerLifesteal = this.hungerLifesteal;
            }
            this.spiderlings.push(spider);
            game.creeps.push(spider);
        }
        game.uiManager.addFloatingText(x, y - 20, '🕷️ Spiderlings!', '#ff66ff');
    }

    update(dt) {
        if (this.isDead) return;
        this.updateTeleport(dt);
        this.updateBuffs(dt);
        if (this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + this.getHpRegen() * dt);
        if (this.maxMp > 0 && this.mp < this.maxMp) this.mp = Math.min(this.maxMp, this.mp + this.getMpRegen() * dt);

        this.updateHunger(dt);
        this.updateIncapacitatingBite(dt);
        this.updateSpiderDebuffs(dt);

        let webBonus = this.getWebSpeedBonus();
        if (webBonus > 0) {
            this.speed = this.baseSpeed * (1 + webBonus);
        } else {
            this.speed = this.baseSpeed;
        }

        this.updateMovement(dt);
        let rate = 1.0;
        if (this.headshotSlowTimer > 0) rate *= 0.5;
        if (this.lifeBreakSlowTimer > 0) rate *= 0.4;
        if (this.attackCooldown > 0) this.attackCooldown -= dt * rate;

        if (this.attackTarget && this.attackTarget.isAttackable()) {
            if (this.attackTarget.isDead) { this.attackTarget = null; return; }
            let d = Math.hypot(this.attackTarget.x - this.x, this.attackTarget.y - this.y);
            if (d <= this.attackRange && this.attackCooldown <= 0) { this.performAttack(); }
        } else {
            this.attackTarget = null;
        }

        for (let ab of this.abilities) ab.update(dt);

        for (let i = this.spiderlings.length - 1; i >= 0; i--) {
            const s = this.spiderlings[i];
            if (s.isDead || s.lifeTime <= 0) {
                this.spiderlings.splice(i, 1);
            }
        }
    }

    useAbility(idx) {
        if (this.isDead || this.silenceTimer > 0) return;
        if (this.isChannelingTeleport) { this.cancelTeleport('ability'); }

        if (idx === 0) {
            this.useInsatiableHunger();
        } else if (idx === 1) {
            let tx = this.targetX;
            let ty = this.targetY;
            if (this.attackTarget) {
                tx = this.attackTarget.x;
                ty = this.attackTarget.y;
            }
            this.useSpinWeb(tx, ty);
        } else if (idx === 2) {
            // пассив
        } else if (idx === 3) {
            let target = this.attackTarget;
            if (!target || target.isDead || target.team === this.team) {
                const enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
                target = enemies.find(e => Math.hypot(e.x - this.x, e.y - this.y) < 500);
            }
            if (target) {
                this.useSpawnSpiderlings(target);
            } else {
                game.uiManager.addFloatingText(this.x, this.y - 30, 'No target', '#ff8888');
            }
        }
    }

    drawWebs(ctx, camera) {
        for (let w of this.webs) {
            const sx = w.x - camera.x;
            const sy = w.y - camera.y;
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#aaaaaa';
            ctx.strokeStyle = '#888888';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(sx, sy, w.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.globalAlpha = 0.2;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 0.5;
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx + Math.cos(angle) * w.radius, sy + Math.sin(angle) * w.radius);
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    draw(ctx, camera) {
        if (this.isDead) return;
        this.drawWebs(ctx, camera);
        super.draw(ctx, camera);
        if (this.hungerActive) {
            let sx = this.x - camera.x;
            let sy = this.y - camera.y;
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(sx, sy, this.radius + 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }
}

// =========================================================================
//  ПРИЗЫВАЕМЫЕ ПАУЧКИ (Spiderling)
// =========================================================================

class Spiderling extends Entity {
    constructor(x, y, team, owner) {
        super(x, y, team, 10, 325, 12, 320);
        this.owner = owner;
        this.baseDamage = 12;
        this.damage = 12;
        this.attackRange = 80;
        this.attackSpeed = 0.9;
        this.lifeTime = 30.0;
        this.hungerLifesteal = 0;
        this.attackCooldown = 0;
        this._targetCheckTimer = 0;
        this.waypoints = null;
        this.isMovingToWaypoint = false;
    }

    findTarget() {
        const enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
        let best = null;
        let bestScore = -Infinity;
        const attackRange = this.attackRange * 1.5;
        for (let e of enemies) {
            if (e.isDead || !e.isAttackable()) continue;
            const dist = Math.hypot(e.x - this.x, e.y - this.y);
            if (dist > attackRange) continue;
            let score = 0;
            if (e instanceof Hero) score = 100;
            else if (e instanceof Creep) score = 50;
            else if (e instanceof Tower) score = 30;
            else if (e instanceof Ancient) score = 20;
            else score = 10;
            score -= dist * 0.1;
            if (score > bestScore) {
                bestScore = score;
                best = e;
            }
        }
        return best;
    }

    update(dt) {
        if (this.isDead) return;
        this.lifeTime -= dt;
        if (this.lifeTime <= 0) {
            this.hp = 0;
            this.isDead = true;
            return;
        }
        this.updateBuffs(dt);
        if (this.attackCooldown > 0) this.attackCooldown -= dt;

        this._targetCheckTimer += dt;
        if (this._targetCheckTimer > 0.5 || !this.attackTarget || !this.attackTarget.isAttackable() || this.attackTarget.team === this.team) {
            this._targetCheckTimer = 0;
            const newTarget = this.findTarget();
            if (newTarget) {
                this.attackTarget = newTarget;
            } else {
                this.attackTarget = null;
            }
        }

        if (this.attackTarget && this.attackTarget.isAttackable() && !this.attackTarget.isDead) {
            let d = Math.hypot(this.attackTarget.x - this.x, this.attackTarget.y - this.y);
            if (d <= this.attackRange && this.attackCooldown <= 0) {
                this.performAttack();
            } else {
                this.targetX = this.attackTarget.x;
                this.targetY = this.attackTarget.y;
            }
        } else {
            if (this.owner && !this.owner.isDead) {
                this.targetX = this.owner.x;
                this.targetY = this.owner.y;
            }
        }
        this.updateMovement(dt);
    }

    performAttack() {
        if (!this.attackTarget || this.attackTarget.isDead) return;
        if (this.attackTarget.evasion > 0 && Math.random() < this.attackTarget.evasion) {
            game.uiManager.addFloatingText(this.attackTarget.x, this.attackTarget.y - 30, 'MISS', '#ff6666');
            this.attackCooldown = this.attackSpeed;
            return;
        }
        if (this.missChance > 0 && Math.random() < this.missChance) {
            game.uiManager.addFloatingText(this.x, this.y - 30, 'MISS (Blind)', '#ff6666');
            this.attackCooldown = this.attackSpeed;
            return;
        }
        this.attackCooldown = this.attackSpeed;
        let damage = this.damage;
        if (this.hungerLifesteal > 0) {
            const target = this.attackTarget;
            target.takeDamage(damage, this);
            if (this.owner && !this.owner.isDead) {
                const heal = damage * this.hungerLifesteal;
                this.owner.hp = Math.min(this.owner.maxHp, this.owner.hp + heal);
                if (game.uiManager) game.uiManager.addFloatingText(this.owner.x, this.owner.y - 20, '+' + Math.floor(heal) + ' HP', '#66ff66');
            }
        } else {
            this.attackTarget.takeDamage(damage, this);
        }
    }

    draw(ctx, camera) {
        if (this.isDead) return;
        this.drawShadow(ctx, camera);
        let sx = this.x - camera.x;
        let sy = this.y - camera.y;
        ctx.save();
        ctx.fillStyle = '#4a2a2a';
        ctx.beginPath();
        ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2a1a1a';
        ctx.beginPath();
        ctx.arc(sx - 2, sy - 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx + 2, sy - 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        this.drawHealthBar(ctx, camera);
    }
}
// =========================================================================
//  ROSHAN И AEGIS (вспомогательные классы)
// =========================================================================

class RoshanLair {
    constructor(x, y, name) {
        this.x = x;
        this.y = y;
        this.name = name;
        this.radius = 120;
    }

    draw(ctx, camera) {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#3d2b1f';
        ctx.strokeStyle = '#8b6b4f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(sx, sy, this.radius, this.radius * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx - 30, sy + 10);
        ctx.lineTo(sx, sy + 40);
        ctx.lineTo(sx + 30, sy + 10);
        ctx.closePath();
        ctx.fillStyle = '#1f140e';
        ctx.fill();
        ctx.strokeStyle = '#8b6b4f';
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name === 'top' ? '▲ Roshan' : '▼ Roshan', sx, sy - this.radius - 10);
        ctx.restore();
    }
}

class Aegis {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.isPickedUp = false;
    }
    draw(ctx, camera) {
        if (this.isPickedUp) return;
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;
        ctx.save();
        const pulse = 1 + 0.1 * Math.sin(Date.now() * 0.004);
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ffd700';
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(sx, sy, this.radius * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🛡️', sx, sy + 1);
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#ffd700';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Aegis', sx, sy + this.radius * 1.8);
        ctx.restore();
    }
    pickUp(hero) {
        if (this.isPickedUp) return false;
        if (Math.hypot(hero.x - this.x, hero.y - this.y) > 80) return false;
        if (hero.hasAegis) return false;
        hero.hasAegis = true;
        this.isPickedUp = true;
        if (window.game && window.game.uiManager) {
            window.game.uiManager.addFloatingText(hero.x, hero.y - 40, '🛡️ Aegis acquired!', '#ffd700');
        }
        if (typeof audio !== 'undefined') audio.play('buy');
        return true;
    }
}
// =========================================================================
//  IO (WISP) — ИСПРАВЛЕННЫЙ (Tether только Io→союзник)
// =========================================================================

class Io extends Hero {
    constructor(x, y, team) {
        super(x, y, team, 'Io');
        this.maxHp = 550;
        this.hp = 550;
        this.damage = 40;
        this.baseSpeed = 300;
        this.speed = 310;
        this.attackRange = 370;
        this.attackSpeed = 1.3;
        this.maxMp = 300;
        this.mp = 300;
        this.hpRegenBase = 2.0;
        this.mpRegenBase = 1.5;

        this.abilities.push(new Ability('Tether', 'active', 12, 40, 'Tether to an ally. Share 75% of healing/mana. Both gain +6% speed.'));
        this.abilities.push(new Ability('Spirits', 'active', 15, 60, 'Summon 5 spirits that orbit around Io. Explode on enemy heroes for 70 damage.'));
        this.abilities.push(new Ability('Overcharge', 'active', 15, 50, 'Gain +35 attack speed, +8% spell damage, 0.8% HP regen/sec for 8 sec. Also affects tethered ally.'));
        this.abilities.push(new Ability('Relocate', 'active', 50, 100, 'Channel for 3.5 sec then teleport to target location. Returns after 12 sec. Double-tap R to go to fountain.'));

        this.tetherTarget = null;
        this.tetherDistance = 1000;
        this.tetherSpeedBonus = 0.06;
        this.tetherSharePercent = 0.75;
        this.tetherTransferDelay = 1.0;
        this.tetherHealTimer = 0;
        this.tetherManaTimer = 0;
        this.tetherHealTransferInterval = 1.4;
        this.tetherManaTransferInterval = 1.4;
        this._tetherHealBuffer = 0;
        this._tetherManaBuffer = 0;
        this._tetherLastHp = 0;
        this._tetherLastMp = 0;
        this._tetherActive = false;

        this.spirits = [];
        this.spiritsDuration = 15;
        this.spiritsTimer = 0;
        this.spiritsOrbitRadius = 200;
        this.spiritsCount = 5;
        this.spiritsHeroDamage = 70;
        this.spiritsCreepDamage = 10;
        this.spiritsActive = false;

        this.overchargeActive = false;
        this.overchargeTimer = 0;
        this.overchargeDuration = 8;
        this.overchargeAttackSpeedBonus = 35;
        this.overchargeSpellDamageBonus = 0.08;
        this.overchargeHpRegenPercent = 0.008;

        this.isRelocateSelectMode = false;
        this.isRelocateChanneling = false;
        this.isRelocateActive = false;
        this.relocateChannelTimer = 0;
        this.relocateChannelDuration = 3.5;
        this.relocateReturnDelay = 12;
        this.relocateReturnTimer = 0;
        this.relocateTargetX = 0;
        this.relocateTargetY = 0;
        this.relocateOldX = 0;
        this.relocateOldY = 0;
        this.relocateOldTargetX = 0;
        this.relocateOldTargetY = 0;

        this._aiTetherTarget = null;
        this._aiTetherTimer = 0;
        this._aiSpiritTimer = 0;
        this._aiOverchargeTimer = 0;
        this._aiRelocateTimer = 0;
        this._aiLane = null;
    }

    useTether(target) {
        if (this.isDead || this.silenceTimer > 0) return false;
        if (this.abilities[0].currentCooldown > 0 || this.mp < this.abilities[0].manaCost) return false;
        if (!target || target.isDead || target.team !== this.team) return false;
        if (target === this) return false;
        if (this.tetherTarget === target) {
            this.breakTether();
            return true;
        }
        const dist = Math.hypot(target.x - this.x, target.y - this.y);
        if (dist > this.tetherDistance) {
            game.uiManager.addFloatingText(this.x, this.y - 30, 'Target too far', '#ff8888');
            return false;
        }
        this.mp -= this.abilities[0].manaCost;
        this.abilities[0].currentCooldown = this.abilities[0].maxCooldown;
        audio.play('ability');

        this.tetherTarget = target;
        this.tetherTarget.speed *= (1 + this.tetherSpeedBonus);
        this.speed *= (1 + this.tetherSpeedBonus);
        if (!this.tetherTarget._origSpeed) {
            this.tetherTarget._origSpeed = this.tetherTarget.baseSpeed;
        }
        if (!this._origSpeed) {
            this._origSpeed = this.baseSpeed;
        }

        this.tetherHealTimer = this.tetherTransferDelay;
        this.tetherManaTimer = this.tetherTransferDelay;
        this._tetherHealBuffer = 0;
        this._tetherManaBuffer = 0;
        this._tetherLastHp = this.hp;
        this._tetherLastMp = this.mp;
        this._tetherActive = true;

        game.uiManager.addFloatingText(this.x, this.y - 30, '⚡ Tether', '#00ffff');
        return true;
    }

    breakTether() {
        if (!this.tetherTarget) return;
        if (this.tetherTarget._origSpeed) {
            this.tetherTarget.baseSpeed = this.tetherTarget._origSpeed;
            this.tetherTarget.speed = this.tetherTarget.baseSpeed;
            delete this.tetherTarget._origSpeed;
        }
        if (this._origSpeed) {
            this.baseSpeed = this._origSpeed;
            this.speed = this.baseSpeed;
            delete this._origSpeed;
        }
        this.tetherTarget = null;
        this._tetherActive = false;
        this._tetherHealBuffer = 0;
        this._tetherManaBuffer = 0;
        game.uiManager.addFloatingText(this.x, this.y - 30, 'Tether broken', '#ff6666');
    }

    updateTether(dt) {
        if (!this.tetherTarget || !this._tetherActive) {
            if (this.tetherTarget && !this._tetherActive) {
                this._tetherActive = true;
                this.tetherHealTimer = this.tetherTransferDelay;
                this.tetherManaTimer = this.tetherTransferDelay;
                this._tetherLastHp = this.hp;
                this._tetherLastMp = this.mp;
            }
            return;
        }

        const dist = Math.hypot(this.tetherTarget.x - this.x, this.tetherTarget.y - this.y);
        if (dist > this.tetherDistance) {
            this.breakTether();
            return;
        }
        if (this.tetherTarget.isDead) {
            this.breakTether();
            return;
        }

        if (this.tetherTarget.speed !== this.tetherTarget.baseSpeed * (1 + this.tetherSpeedBonus)) {
            if (this.tetherTarget._origSpeed) {
                this.tetherTarget.baseSpeed = this.tetherTarget._origSpeed;
                this.tetherTarget.speed = this.tetherTarget.baseSpeed * (1 + this.tetherSpeedBonus);
            }
        }
        if (this.speed !== this.baseSpeed * (1 + this.tetherSpeedBonus)) {
            if (this._origSpeed) {
                this.baseSpeed = this._origSpeed;
                this.speed = this.baseSpeed * (1 + this.tetherSpeedBonus);
            }
        }

        const enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
        for (let e of enemies) {
            if (e.isDead) continue;
            const d = this.distanceToSegment(this.x, this.y, this.tetherTarget.x, this.tetherTarget.y, e.x, e.y);
            if (d < 40) {
                e.slowTimer = Math.max(e.slowTimer || 0, 1.0);
                if (game) game.effects.push({ type: 'tether_slow', x: e.x, y: e.y, life: 0.2 });
            }
        }

        // Только Io → союзник
        const hpDelta = this.hp - this._tetherLastHp;
        const mpDelta = this.mp - this._tetherLastMp;

        if (hpDelta > 0) {
            this._tetherHealBuffer += hpDelta * this.tetherSharePercent;
        }
        if (mpDelta > 0) {
            this._tetherManaBuffer += mpDelta * this.tetherSharePercent;
        }

        this.tetherHealTimer -= dt;
        this.tetherManaTimer -= dt;

        if (this.tetherHealTimer <= 0 && this._tetherHealBuffer > 0) {
            const healAmount = Math.floor(this._tetherHealBuffer);
            if (healAmount > 0) {
                this.tetherTarget.hp = Math.min(this.tetherTarget.maxHp, this.tetherTarget.hp + healAmount);
                game.uiManager.addFloatingText(this.tetherTarget.x, this.tetherTarget.y - 25, '+' + healAmount + ' HP (Tether)', '#66ff66');
            }
            this._tetherHealBuffer = 0;
            this.tetherHealTimer = this.tetherHealTransferInterval;
        }

        if (this.tetherManaTimer <= 0 && this._tetherManaBuffer > 0) {
            const manaAmount = Math.floor(this._tetherManaBuffer);
            if (manaAmount > 0) {
                this.tetherTarget.mp = Math.min(this.tetherTarget.maxMp, this.tetherTarget.mp + manaAmount);
                game.uiManager.addFloatingText(this.tetherTarget.x, this.tetherTarget.y - 25, '+' + manaAmount + ' MP (Tether)', '#66ccff');
            }
            this._tetherManaBuffer = 0;
            this.tetherManaTimer = this.tetherManaTransferInterval;
        }

        this._tetherLastHp = this.hp;
        this._tetherLastMp = this.mp;
    }

    distanceToSegment(x1, y1, x2, y2, px, py) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lenSq = dx*dx + dy*dy;
        if (lenSq === 0) return Math.hypot(px - x1, py - y1);
        let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const nearX = x1 + t * dx;
        const nearY = y1 + t * dy;
        return Math.hypot(px - nearX, py - nearY);
    }

    useSpirits() {
        if (this.isDead || this.silenceTimer > 0) return false;
        if (this.abilities[1].currentCooldown > 0 || this.mp < this.abilities[1].manaCost) return false;
        if (this.spiritsActive) return false;

        this.mp -= this.abilities[1].manaCost;
        this.abilities[1].currentCooldown = this.abilities[1].maxCooldown;
        audio.play('ability');

        this.spiritsActive = true;
        this.spiritsTimer = this.spiritsDuration;
        this.spirits = [];
        for (let i = 0; i < this.spiritsCount; i++) {
            const angle = (i / this.spiritsCount) * Math.PI * 2;
            this.spirits.push({
                angle: angle,
                speed: 0.8,
                x: this.x + Math.cos(angle) * this.spiritsOrbitRadius,
                y: this.y + Math.sin(angle) * this.spiritsOrbitRadius,
                alive: true
            });
        }
        game.uiManager.addFloatingText(this.x, this.y - 30, '🌀 Spirits', '#00ffff');
        return true;
    }

    updateSpirits(dt) {
        if (!this.spiritsActive) return;
        this.spiritsTimer -= dt;
        if (this.spiritsTimer <= 0) {
            for (let s of this.spirits) {
                if (s.alive) {
                    this.explodeSpirit(s.x, s.y);
                }
            }
            this.spiritsActive = false;
            this.spirits = [];
            return;
        }
        for (let s of this.spirits) {
            if (!s.alive) continue;
            s.angle += s.speed * dt;
            s.x = this.x + Math.cos(s.angle) * this.spiritsOrbitRadius;
            s.y = this.y + Math.sin(s.angle) * this.spiritsOrbitRadius;
            const enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
            for (let e of enemies) {
                if (e.isDead) continue;
                const dist = Math.hypot(e.x - s.x, e.y - s.y);
                if (dist < 40) {
                    const isHero = e instanceof Hero;
                    const dmg = isHero ? this.spiritsHeroDamage : this.spiritsCreepDamage;
                    if (isHero) {
                        e.takeDamage(dmg, this, false, 'magic');
                        this.explodeSpirit(s.x, s.y);
                        s.alive = false;
                        if (game) game.effects.push({ type: 'spirit_explode', x: s.x, y: s.y, life: 0.3, radius: 60 });
                    } else {
                        e.takeDamage(dmg, this, false, 'magic');
                    }
                }
            }
        }
        this.spirits = this.spirits.filter(s => s.alive);
        if (this.spirits.length === 0) {
            this.spiritsActive = false;
            this.spiritsTimer = 0;
        }
    }

    explodeSpirit(x, y) {
        const enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
        for (let e of enemies) {
            if (e.isDead) continue;
            const dist = Math.hypot(e.x - x, e.y - y);
            if (dist < 80) {
                e.takeDamage(this.spiritsHeroDamage, this, false, 'magic');
            }
        }
        if (game) game.effects.push({ type: 'spirit_explode', x: x, y: y, life: 0.3, radius: 80 });
    }

    useOvercharge() {
        if (this.isDead || this.silenceTimer > 0) return false;
        if (this.abilities[2].currentCooldown > 0 || this.mp < this.abilities[2].manaCost) return false;
        if (this.overchargeActive) return false;

        this.mp -= this.abilities[2].manaCost;
        this.abilities[2].currentCooldown = this.abilities[2].maxCooldown;
        audio.play('ability');

        this.overchargeActive = true;
        this.overchargeTimer = this.overchargeDuration;
        this.attackSpeed += this.overchargeAttackSpeedBonus / 100;
        this._spellDamageMultiplier = (this._spellDamageMultiplier || 1) + this.overchargeSpellDamageBonus;
        if (this.tetherTarget && !this.tetherTarget.isDead) {
            this.tetherTarget.attackSpeed += this.overchargeAttackSpeedBonus / 100;
            this.tetherTarget._spellDamageMultiplier = (this.tetherTarget._spellDamageMultiplier || 1) + this.overchargeSpellDamageBonus;
        }
        game.uiManager.addFloatingText(this.x, this.y - 30, '⚡ Overcharge', '#ffaa00');
        return true;
    }

    updateOvercharge(dt) {
        if (!this.overchargeActive) return;
        this.overchargeTimer -= dt;
        if (this.overchargeTimer <= 0) {
            this.overchargeActive = false;
            this.attackSpeed -= this.overchargeAttackSpeedBonus / 100;
            if (this._spellDamageMultiplier) {
                this._spellDamageMultiplier -= this.overchargeSpellDamageBonus;
                if (this._spellDamageMultiplier < 1) this._spellDamageMultiplier = 1;
            }
            if (this.tetherTarget && !this.tetherTarget.isDead) {
                this.tetherTarget.attackSpeed -= this.overchargeAttackSpeedBonus / 100;
                if (this.tetherTarget._spellDamageMultiplier) {
                    this.tetherTarget._spellDamageMultiplier -= this.overchargeSpellDamageBonus;
                    if (this.tetherTarget._spellDamageMultiplier < 1) this.tetherTarget._spellDamageMultiplier = 1;
                }
            }
            game.uiManager.addFloatingText(this.x, this.y - 30, 'Overcharge fades', '#aaaaaa');
            return;
        }
        const heal = this.maxHp * this.overchargeHpRegenPercent * dt;
        this.hp = Math.min(this.maxHp, this.hp + heal);
        if (this.tetherTarget && !this.tetherTarget.isDead) {
            this.tetherTarget.hp = Math.min(this.tetherTarget.maxHp, this.tetherTarget.hp + heal);
        }
    }

    startRelocate(x, y) {
        if (this.isDead || this.silenceTimer > 0) return false;
        if (this.abilities[3].currentCooldown > 0 || this.mp < this.abilities[3].manaCost) return false;
        if (this.isRelocateChanneling || this.isRelocateActive) return false;
        if (this.isChannelingTeleport) return false;

        this.mp -= this.abilities[3].manaCost;
        this.abilities[3].currentCooldown = this.abilities[3].maxCooldown;
        audio.play('ability');

        this.isRelocateChanneling = true;
        this.relocateChannelTimer = this.relocateChannelDuration;
        this.relocateTargetX = x;
        this.relocateTargetY = y;
        this.relocateOldX = this.x;
        this.relocateOldY = this.y;
        this.relocateOldTargetX = this.tetherTarget ? this.tetherTarget.x : this.x;
        this.relocateOldTargetY = this.tetherTarget ? this.tetherTarget.y : this.y;
        this.attackTarget = null;
        this.targetX = this.x;
        this.targetY = this.y;
        this.isMovingToWaypoint = false;
        if (game) game.effects.push({ type: 'relocate_channel', x: this.x, y: this.y, life: this.relocateChannelDuration });
        return true;
    }

    updateRelocate(dt) {
        if (this.isRelocateChanneling) {
            this.relocateChannelTimer -= dt;
            if (this.relocateChannelTimer <= 0) {
                this.finishRelocate();
            }
            if (this.isDead) {
                this.cancelRelocate();
            }
        }
        if (this.isRelocateActive) {
            this.relocateReturnTimer -= dt;
            if (this.relocateReturnTimer <= 0) {
                this.returnRelocate();
            }
        }
    }

    finishRelocate() {
        if (!this.isRelocateChanneling) return;
        this.isRelocateChanneling = false;
        this.x = this.relocateTargetX;
        this.y = this.relocateTargetY;
        this.targetX = this.x;
        this.targetY = this.y;
        if (this.tetherTarget && !this.tetherTarget.isDead) {
            this.tetherTarget.x = this.relocateTargetX + (Math.random() - 0.5) * 80;
            this.tetherTarget.y = this.relocateTargetY + (Math.random() - 0.5) * 80;
            this.tetherTarget.targetX = this.tetherTarget.x;
            this.tetherTarget.targetY = this.tetherTarget.y;
        }
        this.isRelocateActive = true;
        this.relocateReturnTimer = this.relocateReturnDelay;
        game.uiManager.addFloatingText(this.x, this.y - 30, '🚀 Relocated!', '#00ff00');
        if (game) game.effects.push({ type: 'relocate_arrive', x: this.x, y: this.y, life: 0.5, radius: 80 });
    }

    cancelRelocate() {
        if (!this.isRelocateChanneling) return;
        this.isRelocateChanneling = false;
        this.relocateChannelTimer = 0;
        game.uiManager.addFloatingText(this.x, this.y - 30, 'Relocate cancelled', '#ff6666');
    }

    returnRelocate() {
        if (!this.isRelocateActive) return;
        this.isRelocateActive = false;
        this.x = this.relocateOldX;
        this.y = this.relocateOldY;
        this.targetX = this.x;
        this.targetY = this.y;
        if (this.tetherTarget && !this.tetherTarget.isDead) {
            this.tetherTarget.x = this.relocateOldTargetX;
            this.tetherTarget.y = this.relocateOldTargetY;
            this.tetherTarget.targetX = this.tetherTarget.x;
            this.tetherTarget.targetY = this.tetherTarget.y;
        }
        game.uiManager.addFloatingText(this.x, this.y - 30, '🔙 Returned!', '#ffff00');
        if (game) game.effects.push({ type: 'relocate_return', x: this.x, y: this.y, life: 0.5, radius: 80 });
    }

    useAbility(idx) {
        if (this.isDead || this.silenceTimer > 0) return;
        if (this.isChannelingTeleport) { this.cancelTeleport('ability'); }

        if (idx === 0) {
            let target = this.attackTarget;
            if (!target || target.team !== this.team || target.isDead) {
                const allies = this.team === 'radiant' ? game.radiantEntities() : game.direEntities();
                let closest = null;
                let minDist = Infinity;
                for (let a of allies) {
                    if (a === this || a.isDead) continue;
                    const d = Math.hypot(a.x - this.x, a.y - this.y);
                    if (d < minDist) {
                        minDist = d;
                        closest = a;
                    }
                }
                target = closest;
            }
            if (target) {
                this.useTether(target);
            } else {
                game.uiManager.addFloatingText(this.x, this.y - 30, 'No ally nearby', '#ff8888');
            }
        } else if (idx === 1) {
            this.useSpirits();
        } else if (idx === 2) {
            this.useOvercharge();
        } else if (idx === 3) {
            if (this.isRelocateActive) {
                this.returnRelocate();
                return;
            }
            if (this.isRelocateChanneling) {
                this.cancelRelocate();
                return;
            }
            this.isRelocateSelectMode = true;
            game._relocateSelectionMode = true;
            game.uiManager.addFloatingText(this.x, this.y - 50, '📍 Select relocate point on minimap', '#00ffff');
        }
    }

    update(dt) {
        if (this.isDead) return;
        this.updateTeleport(dt);
        this.updateBuffs(dt);
        if (this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + this.getHpRegen() * dt);
        if (this.maxMp > 0 && this.mp < this.maxMp) this.mp = Math.min(this.maxMp, this.mp + this.getMpRegen() * dt);

        this.updateTether(dt);
        this.updateSpirits(dt);
        this.updateOvercharge(dt);
        this.updateRelocate(dt);

        this.updateMovement(dt);
        let rate = 1.0;
        if (this.headshotSlowTimer > 0) rate *= 0.5;
        if (this.lifeBreakSlowTimer > 0) rate *= 0.4;
        if (this.attackCooldown > 0) this.attackCooldown -= dt * rate;

        if (this.attackTarget && this.attackTarget.isAttackable()) {
            if (this.attackTarget.isDead) { this.attackTarget = null; return; }
            let d = Math.hypot(this.attackTarget.x - this.x, this.attackTarget.y - this.y);
            if (d <= this.attackRange && this.attackCooldown <= 0) { this.performAttack(); }
        } else {
            this.attackTarget = null;
        }

        for (let ab of this.abilities) ab.update(dt);
    }

    performAttack() {
        if (this.isChannelingTeleport) {
            this.cancelTeleport('ability');
            return;
        }
        super.performAttack();
    }

    drawTether(ctx, camera) {
        if (!this.tetherTarget) return;
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;
        const ex = this.tetherTarget.x - camera.x;
        const ey = this.tetherTarget.y - camera.y;
        ctx.save();
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.restore();
    }

    drawSpirits(ctx, camera) {
        if (!this.spiritsActive) return;
        for (let s of this.spirits) {
            if (!s.alive) continue;
            const sx = s.x - camera.x;
            const sy = s.y - camera.y;
            ctx.save();
            ctx.fillStyle = '#00ffff';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00ffff';
            ctx.beginPath();
            ctx.arc(sx, sy, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    draw(ctx, camera) {
        if (this.isDead) return;
        this.drawTether(ctx, camera);
        this.drawSpirits(ctx, camera);
        if (this.isRelocateChanneling) {
            const sx = this.x - camera.x;
            const sy = this.y - camera.y;
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(sx, sy, 50 + (1 - this.relocateChannelTimer / this.relocateChannelDuration) * 30, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(255, 255, 0, 0.1)';
            ctx.fill();
            ctx.restore();
        }
        if (this.overchargeActive) {
            const sx = this.x - camera.x;
            const sy = this.y - camera.y;
            ctx.save();
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy, this.radius + 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
        super.draw(ctx, camera);
    }
}

// =========================================================================
//  НОВЫЙ ГЕРОЙ: TINKER (исправленный)
// =========================================================================

class Tinker extends Hero {
    constructor(x, y, team) {
        super(x, y, team, 'Tinker');
        this.maxHp = 560;
        this.hp = 560;
        this.damage = 52;
        this.baseSpeed = 305;
        this.speed = 305;
        this.attackRange = 600;
        this.attackSpeed = 1.2;
        this.maxMp = 435;
        this.mp = 435;

        this.hpRegenBase = 2.0;
        this.mpRegenBase = 1.8;

        this.abilities = [
            new Ability('Laser', 'active', 19, 40, 'Deals 150 pure damage and blinds the target for 3s (100% miss chance).'),
            new Ability('March of the Machines', 'active', 32, 80, 'Summons machines that march in a straight line, damaging enemies on contact.'),
            new Ability('Deploy Turrets', 'active', 24, 70, 'Deploys 3 turrets that fire rockets. Lasts 4.5s.'),
            new Ability('Keen Conveyance', 'active', 80, 75, 'Teleports to an allied tower or fountain after 3s channel. Independent from regular teleport.'),
            new Ability('Rearm', 'active', 5, 100, 'Channel for 2s to reset cooldowns of Q, W, E, D. Does not reset Rearm itself.')
        ];

        this.isKeenChanneling = false;
        this.keenTarget = null;
        this.keenChannelTimer = 0;
        this.keenStartX = 0;
        this.keenStartY = 0;
        this.selectKeenTarget = false;

        this.isRearming = false;
        this.rearmTimer = 0;
        this.rearmDuration = 2.0;
        this._rearmStartX = 0;
        this._rearmStartY = 0;

        this._laserBeamLife = 0;
        this._laserBeamTarget = null;
        this.marchMachines = [];
        this.turrets = [];
        this._marchDirection = 1;
        this._marchStartX = 0;
        this._marchStartY = 0;
        this._marchEndX = 0;
        this._marchEndY = 0;
        this._marchDistance = 0;
        this._marchTraveled = 0;
        this._marchTotalDistance = 0;
        this._marchActive = false;
        this._marchTimer = 0;
        this._marchDuration = 6.0;
        this._marchEnemyTeam = team === 'radiant' ? 'dire' : 'radiant';
    }

    useAbility(idx) {
        if (this.isDead || this.silenceTimer > 0) return;
        if (this.isChannelingTeleport) { this.cancelTeleport('ability'); }
        if (this.isKeenChanneling) {
            this.cancelKeen('ability');
            return;
        }
        if (this.isRearming) {
            this.cancelRearm('ability');
            return;
        }

        if (idx === 0) this.castLaser();
        else if (idx === 1) this.castMarch();
        else if (idx === 2) this.castTurrets();
        else if (idx === 3) this.castKeenConveyance();
        else if (idx === 4) this.castRearm();
    }

    castLaser() {
        const ab = this.abilities[0];
        if (ab.currentCooldown > 0 || this.mp < ab.manaCost) return;
        let target = this.attackTarget;
        if (!target || target.isDead || target.team === this.team) {
            const enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
            target = enemies.find(e => Math.hypot(e.x - this.x, e.y - this.y) <= 700);
        }
        if (!target || target.isDead) return;
        if (target.blockSpell && target.blockSpell(this)) return;
        this.mp -= ab.manaCost;
        ab.currentCooldown = ab.maxCooldown;
        audio.play('ability');

        target.takeDamage(150, this, false, 'pure');
        target.missChance = 1.0;
        target.missChanceTimer = 3.0;
        this._laserBeamLife = 0.2;
        this._laserBeamTarget = target;
        game.uiManager.addFloatingText(target.x, target.y - 30, 'BLIND!', '#ffff00');
    }

    castMarch() {
        const ab = this.abilities[1];
        if (ab.currentCooldown > 0 || this.mp < ab.manaCost) return;
        if (this._marchActive) return;
        this.mp -= ab.manaCost;
        ab.currentCooldown = ab.maxCooldown;
        audio.play('ability');

        const hasValidTarget = this.attackTarget && !this.attackTarget.isDead && this.attackTarget.team !== this.team;
        const targetX = hasValidTarget ? this.attackTarget.x : this.targetX;
        const targetY = hasValidTarget ? this.attackTarget.y : this.targetY;
        let dx = targetX - this.x;
        let dy = targetY - this.y;
        let dist = Math.hypot(dx, dy);

        if (dist < 1) {
            dx = this.facing * 600;
            dy = 0;
            dist = 600;
        }

        const dirX = dx / dist;
        const dirY = dy / dist;

        this._marchStartX = this.x;
        this._marchStartY = this.y;
        const marchLength = Math.max(800, Math.min(1500, dist + 500));
        this._marchEndX = this.x + dirX * marchLength;
        this._marchEndY = this.y + dirY * marchLength;
        this._marchTotalDistance = Math.hypot(this._marchEndX - this._marchStartX, this._marchEndY - this._marchStartY);
        this._marchTraveled = 0;
        this._marchDirection = 1;
        this._marchActive = true;
        this._marchTimer = 0;
        this._marchDuration = 6.0;

        const count = 10;
        this.marchMachines = [];
        for (let i = 0; i < count; i++) {
            const t = i / count;
            const x = this._marchStartX + (this._marchEndX - this._marchStartX) * t;
            const y = this._marchStartY + (this._marchEndY - this._marchStartY) * t;
            this.marchMachines.push({
                x: x,
                y: y,
                radius: 10,
                damage: 22,
                hitCooldown: {},
                team: this.team,
                owner: this,
                speedOffset: 0.8 + Math.random() * 0.4
            });
        }
        game.uiManager.addFloatingText(this.x, this.y - 30, 'March!', '#ffaa00');
    }

    updateMarch(dt) {
        if (!this._marchActive) return;
        this._marchTimer += dt;
        if (this._marchTimer >= this._marchDuration) {
            this._marchActive = false;
            this.marchMachines = [];
            return;
        }

        const speed = 250;
        const travelDelta = speed * dt * this._marchDirection;
        this._marchTraveled += travelDelta;

        if (this._marchTraveled >= this._marchTotalDistance) {
            this._marchTraveled = this._marchTotalDistance;
            this._marchDirection = -1;
        } else if (this._marchTraveled <= 0) {
            this._marchTraveled = 0;
            this._marchDirection = 1;
        }

        const count = this.marchMachines.length;
        for (let i = 0; i < count; i++) {
            const t = (i / count) * this._marchTotalDistance;
            let pos = (this._marchTraveled + t) % (this._marchTotalDistance * 2);
            if (pos > this._marchTotalDistance) pos = this._marchTotalDistance * 2 - pos;
            const frac = pos / this._marchTotalDistance;
            const x = this._marchStartX + (this._marchEndX - this._marchStartX) * frac;
            const y = this._marchStartY + (this._marchEndY - this._marchStartY) * frac;
            this.marchMachines[i].x = x;
            this.marchMachines[i].y = y;
        }

        const enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
        for (let m of this.marchMachines) {
            for (let e of enemies) {
                if (e.isDead) continue;
                const dist = Math.hypot(e.x - m.x, e.y - m.y);
                if (dist < m.radius + e.radius) {
                    const id = e.id || e._uid || (e.x + '' + e.y);
                    if (!m.hitCooldown) m.hitCooldown = {};
                    if (!m.hitCooldown[id] || m.hitCooldown[id] <= 0) {
                        e.takeDamage(m.damage, m.owner);
                        m.hitCooldown[id] = 0.5;
                        game.uiManager.addFloatingText(e.x, e.y - 20, '-22', '#ff8800');
                    }
                }
            }
            for (let key in m.hitCooldown) {
                m.hitCooldown[key] -= dt;
                if (m.hitCooldown[key] < 0) m.hitCooldown[key] = 0;
            }
        }
    }

    castTurrets() {
        const ab = this.abilities[2];
        if (ab.currentCooldown > 0 || this.mp < ab.manaCost) return;
        this.mp -= ab.manaCost;
        ab.currentCooldown = ab.maxCooldown;
        audio.play('ability');

        let targetX = this.targetX;
        let targetY = this.targetY;
        if (this.attackTarget) {
            targetX = this.attackTarget.x;
            targetY = this.attackTarget.y;
        }
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2 + Math.random() * 0.5;
            const dist = 60 + Math.random() * 40;
            const x = targetX + Math.cos(angle) * dist;
            const y = targetY + Math.sin(angle) * dist;
            const turret = {
                x: x,
                y: y,
                life: 4.5,
                fallTimer: 0.5,
                deployed: false,
                hp: 80,
                maxHp: 80,
                attackRange: 200,
                attackCooldown: 0,
                attackSpeed: 1.5,
                damage: 20 + (this.level - 1) * 20,
                team: this.team,
                owner: this,
                target: null,
                rocketCooldown: 0,
            };
            this.turrets.push(turret);
        }
    }

    updateTurrets(dt) {
        for (let i = this.turrets.length - 1; i >= 0; i--) {
            const t = this.turrets[i];
            t.life -= dt;
            if (t.life <= 0) {
                this.turrets.splice(i, 1);
                continue;
            }
            if (!t.deployed) {
                t.fallTimer -= dt;
                if (t.fallTimer <= 0) {
                    t.deployed = true;
                    const enemies = t.team === 'radiant' ? game.direEntities() : game.radiantEntities();
                    for (let e of enemies) {
                        if (e.isDead) continue;
                        const dist = Math.hypot(e.x - t.x, e.y - t.y);
                        if (dist < 200) {
                            e.takeDamage(40, t.owner);
                            const angle = Math.atan2(e.y - t.y, e.x - t.x);
                            const push = 25;
                            e.x += Math.cos(angle) * push;
                            e.y += Math.sin(angle) * push;
                        }
                    }
                    const angleToTinker = Math.atan2(this.y - t.y, this.x - t.x);
                    this.x += Math.cos(angleToTinker) * 50;
                    this.y += Math.sin(angleToTinker) * 50;
                    this.targetX = this.x;
                    this.targetY = this.y;
                }
                continue;
            }
            t.attackCooldown -= dt;
            if (t.attackCooldown <= 0) {
                const enemies = t.team === 'radiant' ? game.direEntities() : game.radiantEntities();
                let target = null;
                let minDist = Infinity;
                for (let e of enemies) {
                    if (e.isDead) continue;
                    const dist = Math.hypot(e.x - t.x, e.y - t.y);
                    if (dist <= t.attackRange && dist < minDist) {
                        minDist = dist;
                        target = e;
                    }
                }
                if (target) {
                    const damage = 20 + (this.level - 1) * 20;
                    game.projectiles.push(new TurretRocket(t.x, t.y, target, damage, t.team, t.owner));
                    t.attackCooldown = t.attackSpeed;
                } else {
                    t.attackCooldown = 0.1;
                }
            }
        }
    }

    castKeenConveyance() {
        const ab = this.abilities[3];
        if (ab.currentCooldown > 0 || this.mp < ab.manaCost) return;
        if (this.isKeenChanneling) return;
        if (this.isChannelingTeleport) { this.cancelTeleport('ability'); }

        this.selectKeenTarget = true;
        game._keenSelectionMode = true;
        game.uiManager.addFloatingText(this.x, this.y - 50, '📡 Select tower or fountain on minimap', '#7dd3fc');
    }

    selectKeenTargetOnMinimap(mx, my) {
        if (!this.selectKeenTarget) return false;
        const map = game.map;
        const gx = (mx / 200) * map.width;
        const gy = (my / 200) * map.height;
        const clickRadiusPx = 15;
        let target = null;
        let minDist = Infinity;
        for (let t of game.towers) {
            if (t.team === this.team && !t.isDead) {
                const tx = (t.x / map.width) * 200;
                const ty = (t.y / map.height) * 200;
                const d = Math.hypot(mx - tx, my - ty);
                if (d < minDist && d <= clickRadiusPx) {
                    minDist = d;
                    target = t;
                }
            }
        }
        for (let f of game.fountains) {
            if (f.team === this.team) {
                const tx = (f.x / map.width) * 200;
                const ty = (f.y / map.height) * 200;
                const d = Math.hypot(mx - tx, my - ty);
                if (d < minDist && d <= clickRadiusPx) {
                    minDist = d;
                    target = f;
                }
            }
        }
        if (target) {
            this.startKeenTeleport(target);
            this.selectKeenTarget = false;
            game._keenSelectionMode = false;
            return true;
        }
        return false;
    }

    startKeenTeleport(target) {
        if (this.isDead) return false;
        if (this.isKeenChanneling) return false;
        if (this.isChannelingTeleport) this.cancelTeleport('ability');
        const ab = this.abilities[3];
        if (ab.currentCooldown > 0 || this.mp < ab.manaCost) return false;
        if (!target || target.isDead || (target.team !== this.team)) return false;

        this.mp -= ab.manaCost;
        ab.currentCooldown = ab.maxCooldown;
        audio.play('ability');

        this.isKeenChanneling = true;
        this.keenTarget = target;
        this.keenChannelTimer = 3.0;
        this.keenStartX = this.x;
        this.keenStartY = this.y;
        this.attackTarget = null;
        this.targetX = this.x;
        this.targetY = this.y;
        this.isMovingToWaypoint = false;
        game.uiManager.addFloatingText(this.x, this.y - 40, '📡 Keen Teleporting...', '#7dd3fc');
        return true;
    }

    cancelKeen(reason = '') {
        if (!this.isKeenChanneling) return;
        this.isKeenChanneling = false;
        this.keenTarget = null;
        this.keenChannelTimer = 0;
        if (game && game.uiManager) {
            if (reason === 'move') {
                game.uiManager.addFloatingText(this.x, this.y - 40, '❌ Keen cancelled (moved)', '#ff6666');
            } else if (reason === 'ability') {
                game.uiManager.addFloatingText(this.x, this.y - 40, '❌ Keen cancelled (ability)', '#ff6666');
            } else if (reason === 'death') {
                // не показываем
            } else {
                game.uiManager.addFloatingText(this.x, this.y - 40, '❌ Keen cancelled', '#ff6666');
            }
        }
    }

    updateKeen(dt) {
        if (!this.isKeenChanneling) return;
        if (this.isDead) {
            this.cancelKeen('death');
            return;
        }
        const distMoved = Math.hypot(this.x - this.keenStartX, this.y - this.keenStartY);
        if (distMoved > 5) {
            this.cancelKeen('move');
            return;
        }
        if (!this.keenTarget || this.keenTarget.isDead || this.keenTarget.team !== this.team) {
            this.cancelKeen('target lost');
            return;
        }
        this.keenChannelTimer -= dt;
        if (this.keenChannelTimer <= 0) {
            this.finishKeen();
        }
    }

    finishKeen() {
        if (!this.isKeenChanneling) return;
        const target = this.keenTarget;
        if (!target || target.isDead) {
            this.cancelKeen('target lost');
            return;
        }
        const angle = Math.random() * Math.PI * 2;
        const distance = 50 + this.radius + (target.radius || 30);
        let tx = target.x + Math.cos(angle) * distance;
        let ty = target.y + Math.sin(angle) * distance;
        tx = Math.max(0, Math.min(game.map.width, tx));
        ty = Math.max(0, Math.min(game.map.height, ty));
        this.x = tx;
        this.y = ty;
        this.targetX = this.x;
        this.targetY = this.y;
        this.isKeenChanneling = false;
        this.keenTarget = null;
        this.keenChannelTimer = 0;
        game.uiManager.addFloatingText(this.x, this.y - 30, '✅ Keen Teleported!', '#7dd3fc');
        game.effects.push({ type: 'teleport_arrive', x: this.x, y: this.y, life: 0.5, radius: 40, team: this.team });
    }

    castRearm() {
        const ab = this.abilities[4];
        if (ab.currentCooldown > 0 || this.mp < ab.manaCost) return;
        if (this.isRearming) return;
        if (this.isChannelingTeleport) { this.cancelTeleport('ability'); }
        if (this.isKeenChanneling) { this.cancelKeen('ability'); }

        this.mp -= ab.manaCost;
        ab.currentCooldown = ab.maxCooldown;
        audio.play('ability');

        this.isRearming = true;
        this.rearmTimer = this.rearmDuration;
        this._rearmStartX = this.x;
        this._rearmStartY = this.y;
        this.attackTarget = null;
        this.targetX = this.x;
        this.targetY = this.y;
        this.isMovingToWaypoint = false;
        game.uiManager.addFloatingText(this.x, this.y - 40, 'Rearming...', '#00ccff');
    }

    cancelRearm(reason = '') {
        if (!this.isRearming) return;
        this.isRearming = false;
        this.rearmTimer = 0;
        if (reason === 'move') {
            game.uiManager.addFloatingText(this.x, this.y - 40, 'Rearm cancelled (moved)', '#ff6666');
        } else if (reason === 'ability') {
            game.uiManager.addFloatingText(this.x, this.y - 40, 'Rearm cancelled (ability)', '#ff6666');
        } else if (reason === 'death') {
            // не показываем
        } else {
            game.uiManager.addFloatingText(this.x, this.y - 40, 'Rearm cancelled', '#ff6666');
        }
    }

    finishRearm() {
        if (!this.isRearming) return;
        this.isRearming = false;
        for (let i = 0; i < 4; i++) {
            if (this.abilities[i]) {
                this.abilities[i].currentCooldown = 0;
            }
        }
        game.uiManager.addFloatingText(this.x, this.y - 30, 'Rearm complete!', '#00ff00');
    }

    update(dt) {
        if (this.isDead) return;
        this.updateTeleport(dt);
        this.updateKeen(dt);

        if (this.missChanceTimer > 0) {
            this.missChanceTimer -= dt;
            if (this.missChanceTimer <= 0) {
                this.missChance = 0;
                this.missChanceTimer = 0;
            }
        }

        if (this._laserBeamLife > 0) {
            this._laserBeamLife -= dt;
            if (this._laserBeamLife <= 0) this._laserBeamTarget = null;
        }

        this.updateMarch(dt);
        this.updateTurrets(dt);

        if (this.isRearming) {
            const distMoved = Math.hypot(this.x - this._rearmStartX, this.y - this._rearmStartY);
            if (distMoved > 5) {
                this.cancelRearm('move');
            } else if (this.isDead) {
                this.cancelRearm('death');
            } else {
                this.rearmTimer -= dt;
                if (this.rearmTimer <= 0) {
                    this.finishRearm();
                }
            }
        }

        super.update(dt);
    }

    performAttack() {
        if (this.isChannelingTeleport) {
            this.cancelTeleport('ability');
            return;
        }
        if (this.isKeenChanneling) {
            this.cancelKeen('ability');
            return;
        }
        if (this.missChance > 0) {
            if (Math.random() < this.missChance) {
                game.uiManager.addFloatingText(this.x, this.y - 30, 'MISS (Blind)', '#ff6666');
                this.attackCooldown = this.attackSpeed;
                return;
            }
        }
        super.performAttack();
    }

    draw(ctx, camera) {
        super.draw(ctx, camera);
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;

        if (this._laserBeamLife > 0 && this._laserBeamTarget && !this._laserBeamTarget.isDead) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 50, 50, 0.8)';
            ctx.lineWidth = 6;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff0000';
            ctx.beginPath();
            ctx.moveTo(sx, sy - 10);
            ctx.lineTo(this._laserBeamTarget.x - camera.x, this._laserBeamTarget.y - camera.y - 10);
            ctx.stroke();
            ctx.restore();
        }

        for (let m of this.marchMachines) {
            const msx = m.x - camera.x;
            const msy = m.y - camera.y;
            ctx.save();
            ctx.fillStyle = '#ffaa00';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ffaa00';
            ctx.beginPath();
            ctx.arc(msx, msy, m.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.font = '8px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('M', msx, msy + 3);
            ctx.restore();
        }

        for (let t of this.turrets) {
            const tsx = t.x - camera.x;
            const tsy = t.y - camera.y;
            ctx.save();
            if (!t.deployed) {
                ctx.globalAlpha = 0.5 + 0.5 * (1 - t.fallTimer / 0.5);
            }
            ctx.fillStyle = '#2c3e50';
            ctx.strokeStyle = '#7f8c8d';
            ctx.lineWidth = 2;
            ctx.fillRect(tsx - 12, tsy - 12, 24, 24);
            ctx.strokeRect(tsx - 12, tsy - 12, 24, 24);
            const hpW = 20;
            ctx.fillStyle = '#000';
            ctx.fillRect(tsx - hpW/2, tsy - 18, hpW, 3);
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(tsx - hpW/2, tsy - 18, hpW * (t.hp/t.maxHp), 3);
            ctx.restore();
        }

        if (this.isKeenChanneling) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(sx, sy, this.radius + 16, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        if (this.isRearming) {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 200, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(sx, sy, 30 + (1 - this.rearmTimer / this.rearmDuration) * 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#00ccff';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.restore();
        }
    }
}
// =========================================================================
//  ROSHAN (исправленный, с передачей ссылки на игру)
// =========================================================================

class Roshan extends Entity {
    constructor(x, y, lair, game) {
        super(x, y, 'neutral', 30, 3000, 120, 300);
        this.game = game; // сохраняем ссылку на игру

        this.attackRange = 100;
        this.attackSpeed = 2;
        this.baseSpeed = 100;
        this.speed = 100;
        this.currentLair = lair;
        this.state = 'idle';
        this.target = null;
        this.aggroRange = 100;
        this.leashRange = 500;
        this.homeX = x;
        this.homeY = y;
        this.moveTarget = null;
        this.isMovingBetweenLairs = false;
        this.destinationLair = null;
        this.lairChangeTimer = 0;
        this.lairChangeInterval = 300;
        this.slamCooldown = 0;
        this.slamCooldownMax = 12;
        this.slamRadius = 100;
        this.slamDamage = 70;
        this.slamSlowDuration = 4;
        this.slamSlowAmount = 0.5;
        this.bashChance = 0.15;
        this.bashBonusDamage = 50;
        this.bashStunDuration = 1.5;
        this.spellBlockCooldown = 0;
        this.spellBlockCooldownMax = 20;
        this.respawnTimer = 10;
        this.hpRegen = 20; // пассивный хилл, HP в секунду
    }

    blockSpell(caster) {
        if (this.isDead) return false;
        if (this.spellBlockCooldown > 0) return false;
        this.spellBlockCooldown = this.spellBlockCooldownMax;
        if (this.game && this.game.uiManager) {
            this.game.uiManager.addFloatingText(this.x, this.y - 30, 'SPELL BLOCKED', '#66ccff');
        }
        audio.play('ability');
        if (this.game && this.game.effects) {
            this.game.effects.push({ type: 'linkens', x: this.x, y: this.y, life: 0.6 });
        }
        return true;
    }

    takeDamage(amount, attacker, isFb = false, damageType = 'physical') {
        if (this.isDead) return;
        if (this.state === 'idle' || this.state === 'returning') {
            this.state = 'chasing';
            this.target = attacker;
            if (!(attacker instanceof Hero)) {
                const enemies = this.findNearbyEnemies(600);
                const heroes = enemies.filter(e => e instanceof Hero);
                if (heroes.length > 0) {
                    this.target = heroes[0];
                } else {
                    this.target = null;
                }
            }
            if (!this.target) {
                this.state = 'idle';
                return;
            }
            if (this.isMovingBetweenLairs) {
                this.isMovingBetweenLairs = false;
                this.moveTarget = null;
            }
        }
        super.takeDamage(amount, attacker, isFb, damageType);
        if (this.isDead) {
            this.onDeath(attacker);
        }
    }

    findNearbyEnemies(radius) {
        if (!this.game) return [];
        const allEntities = [];
        if (this.game.playerHero) allEntities.push(this.game.playerHero);
        if (this.game.enemyHero) allEntities.push(this.game.enemyHero);
        for (let b of this.game.alliedBots || []) allEntities.push(b);
        for (let b of this.game.enemyBots || []) allEntities.push(b);
        for (let c of this.game.creeps || []) allEntities.push(c);
        return allEntities.filter(e => e && !e.isDead && e.team !== 'neutral' && e !== this);
    }

    update(dt) {
        if (this.isDead) {
            this.updateDead(dt);
            return;
        }

        // Пассивная регенерация — 20 HP/сек, без мгновенных скачков
        if (this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + this.hpRegen * dt);
        }

        this.lairChangeTimer += dt;
        if (this.lairChangeTimer >= this.lairChangeInterval && this.state === 'idle') {
            this.lairChangeTimer = 0;
            this.startMovingToOtherLair();
        }

        if (this.slamCooldown > 0) this.slamCooldown -= dt;
        if (this.spellBlockCooldown > 0) this.spellBlockCooldown -= dt;

        if (this.state === 'returning') {
            const dx = this.homeX - this.x;
            const dy = this.homeY - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 20) {
                this.x = this.homeX;
                this.y = this.homeY;
                this.state = 'idle';
                this.target = null;
            } else {
                const step = this.speed * dt;
                this.x += (dx / dist) * step;
                this.y += (dy / dist) * step;
            }
            return;
        }

        if (this.isMovingBetweenLairs) {
            if (!this.moveTarget) {
                this.isMovingBetweenLairs = false;
                this.state = 'idle';
                return;
            }
            const dx = this.moveTarget.x - this.x;
            const dy = this.moveTarget.y - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 20) {
                this.x = this.moveTarget.x;
                this.y = this.moveTarget.y;
                this.homeX = this.moveTarget.x;
                this.homeY = this.moveTarget.y;
                this.isMovingBetweenLairs = false;
                this.moveTarget = null;
                this.state = 'idle';
                this.target = null;
                if (this.game && this.game.roshanLairs) {
                    const current = this.game.roshanLairs.find(l => Math.hypot(l.x - this.x, l.y - this.y) < 50);
                    if (current) this.currentLair = current;
                }
                return;
            } else {
                const step = this.speed * dt;
                this.x += (dx / dist) * step;
                this.y += (dy / dist) * step;
            }
            return;
        }

        if (this.state === 'chasing') {
            if (!this.target || this.target.isDead || this.target.team === 'neutral') {
                this.state = 'returning';
                return;
            }
            const distToTarget = Math.hypot(this.target.x - this.x, this.target.y - this.y);
            if (distToTarget > this.leashRange) {
                this.state = 'returning';
                this.target = null;
                return;
            }

            if (distToTarget > this.attackRange) {
                const dx = this.target.x - this.x;
                const dy = this.target.y - this.y;
                const step = this.speed * dt;
                this.x += (dx / distToTarget) * step;
                this.y += (dy / distToTarget) * step;
            } else {
                if (this.attackCooldown <= 0) {
                    this.performAttack();
                }
                this.useAbilities();
            }
            if (this.attackCooldown > 0) this.attackCooldown -= dt;
        }
    }

    performAttack() {
        if (!this.target || this.target.isDead) return;
        if (this.attackCooldown > 0) return;
        this.attackCooldown = this.attackSpeed;

        let damage = this.damage;
        let stun = false;
        if (Math.random() < this.bashChance) {
            damage += this.bashBonusDamage;
            stun = true;
            if (this.game && this.game.uiManager) {
                this.game.uiManager.addFloatingText(this.target.x, this.target.y - 30, 'BASH!', '#ff8800');
            }
        }

        this.target.takeDamage(damage, this);

        if (stun && this.target instanceof Hero) {
            this.target.stunned = true;
            this.target.stunTimer = Math.max(this.target.stunTimer || 0, this.bashStunDuration);
        }
    }

    useAbilities() {
        const enemies = this.findNearbyEnemies(this.slamRadius);
        let shouldSlam = false;
        if (enemies.length >= 2) shouldSlam = true;
        if (this.target && Math.hypot(this.target.x - this.x, this.target.y - this.y) < 150) shouldSlam = true;

        if (shouldSlam && this.slamCooldown <= 0) {
            this.slamCooldown = this.slamCooldownMax;
            for (let e of enemies) {
                if (e.isDead) continue;
                const dist = Math.hypot(e.x - this.x, e.y - this.y);
                if (dist <= this.slamRadius) {
                    e.takeDamage(this.slamDamage, this, false, 'magic');
                    e.slowTimer = Math.max(e.slowTimer || 0, this.slamSlowDuration);
                    e.headshotSlowTimer = Math.max(e.headshotSlowTimer || 0, this.slamSlowDuration);
                }
            }
            if (this.game && this.game.uiManager) {
                this.game.uiManager.addFloatingText(this.x, this.y - 40, 'SLAM!', '#ff4444');
            }
            audio.play('ability');
            if (this.game && this.game.effects) {
                this.game.effects.push({
                    type: 'slam',
                    x: this.x,
                    y: this.y,
                    life: 0.3,
                    radius: this.slamRadius
                });
            }
        }
    }

    startMovingToOtherLair() {
        if (this.isMovingBetweenLairs) return;
        if (this.state !== 'idle') return;
        if (!this.game || !this.game.roshanLairs || this.game.roshanLairs.length < 2) return;
        const current = this.game.roshanLairs.find(l => Math.hypot(l.x - this.x, l.y - this.y) < 50);
        if (!current) return;
        const other = this.game.roshanLairs.find(l => l !== current);
        if (!other) return;
        this.isMovingBetweenLairs = true;
        this.moveTarget = { x: other.x, y: other.y };
        this.state = 'moving';
        if (this.game && this.game.uiManager) {
            this.game.uiManager.addFloatingText(this.x, this.y - 40, 'Roshan moving', '#ffaa00');
        }
    }

    onDeath(attacker) {
        const aegis = new Aegis(this.x, this.y);
        if (this.game) {
            this.game.aegisItems.push(aegis);
            if (this.game.uiManager) {
                this.game.uiManager.addFloatingText(this.x, this.y - 50, '🛡️ Aegis dropped!', '#ffd700');
            }
        }
        this.respawnTimer = 600;
        this.isDead = true;
    }

    updateDead(dt) {
        if (!this.isDead) return;
        if (this.respawnTimer > 0) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) {
                this.isDead = false;
                this.hp = this.maxHp;
                this.respawnTimer = 0;
                this.state = 'idle';
                this.target = null;
                if (this.game && this.game.roshanLairs && this.currentLair) {
                    this.x = this.currentLair.x;
                    this.y = this.currentLair.y;
                    this.homeX = this.currentLair.x;
                    this.homeY = this.currentLair.y;
                } else {
                    this.x = 1200;
                    this.y = 450;
                    this.homeX = this.x;
                    this.homeY = this.y;
                }
                if (this.game && this.game.uiManager) {
                    this.game.uiManager.addFloatingText(this.x, this.y - 30, 'Roshan respawned!', '#ff4444');
                }
            }
        }
    }

    draw(ctx, camera) {
        if (this.isDead) {
            if (this.respawnTimer > 0) {
                const sx = this.x - camera.x;
                const sy = this.y - camera.y;
                ctx.save();
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(sx - 30, sy - 30, 60, 40);
                ctx.fillStyle = '#ff4444';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(Math.ceil(this.respawnTimer) + 's', sx, sy - 5);
                ctx.fillStyle = '#fff';
                ctx.font = '10px Arial';
                ctx.fillText('RESPAWN', sx, sy + 18);
                ctx.restore();
            }
            return;
        }
        this.drawShadow(ctx, camera);
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;
        ctx.save();
        ctx.fillStyle = '#4a2f1a';
        ctx.strokeStyle = '#7a5a3a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(sx - 8, sy - 5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx + 8, sy - 5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#7a5a3a';
        ctx.beginPath();
        ctx.moveTo(sx - 12, sy - 18);
        ctx.lineTo(sx - 5, sy - 30);
        ctx.lineTo(sx + 2, sy - 18);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(sx + 12, sy - 18);
        ctx.lineTo(sx + 5, sy - 30);
        ctx.lineTo(sx - 2, sy - 18);
        ctx.fill();
        ctx.restore();
        this.drawHealthBar(ctx, camera);
        if (this.state === 'chasing' && this.target && !this.target.isDead) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255,0,0,0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(this.target.x - camera.x, this.target.y - camera.y);
            ctx.stroke();
            ctx.restore();
        }
    }
}

// =========================================================================
//  ВСПОМОГАТЕЛЬНЫЕ КЛАССЫ (ShrapnelZone, Creep, WarlockGolem, Catapult, Tower, Ancient, Fountain, Projectile, TurretRocket, BountyRune, Barracks, NeutralCreep, NeutralCamp)
// =========================================================================

class ShrapnelZone {
    constructor(x, y, team, caster) {
        this.x = x; this.y = y; this.team = team; this.caster = caster;
        this.radius = 160; this.duration = 6.0; this.damagePerSecond = 35;
        this.slowAmount = 0.25; this.tickTimer = 0;
    }
    update(dt) {
        this.duration -= dt; this.tickTimer += dt;
        if (this.tickTimer >= 1.0) {
            this.tickTimer -= 1.0;
            let enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
            for (let e of enemies) {
                if (!(e instanceof Tower) && !(e instanceof Ancient)) {
                    if (Math.hypot(e.x - this.x, e.y - this.y) <= this.radius) {
                        e.takeDamage(this.damagePerSecond, this.caster);
                    }
                }
            }
        }
        return this.duration <= 0;
    }
    draw(ctx, camera) {
        let sx = this.x - camera.x; let sy = this.y - camera.y;
        ctx.save();
        ctx.strokeStyle = 'rgba(218, 165, 32, 0.4)'; ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(218, 165, 32, 0.08)';
        ctx.beginPath(); ctx.arc(sx, sy, this.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255, 215, 0, 0.25)';
        for (let i = 0; i < 4; i++) {
            let px = sx + (Math.random() - 0.5) * this.radius * 1.4;
            let py = sy + (Math.random() - 0.5) * this.radius * 1.4;
            if (Math.hypot(px - sx, py - sy) <= this.radius) {
                ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
            }
        }
        ctx.fillStyle = '#ffd700'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
        ctx.fillText(this.duration.toFixed(1) + 's', sx, sy - 4);
        ctx.restore();
    }
}

class Creep extends Entity {
    constructor(x, y, team, type, lane) {
        let hp = type === 'melee' ? 320 : 230;
        let dmg = type === 'melee' ? 19 : 22;
        let rng = type === 'melee' ? 45 : 280;
        super(x, y, team, 11, hp, dmg, 195);
        this.type = type;
        this.attackRange = rng;
        this.attackSpeed = 1.1;
        this.lane = lane;
        const map = game.map;
        const waypoints = (this.team === 'radiant') ? map.waypoints[lane] : map.waypointsReverse[lane];
        this.setWaypoints(waypoints);
        this._targetCheckTimer = 0;
    }

    takeDamage(amount, attacker, isFb = false, damageType = 'physical') {
        if (this.isDead) return;
        const actualAttacker = attacker && !(attacker instanceof Entity) && attacker.attacker instanceof Entity
            ? attacker.attacker
            : attacker;

        super.takeDamage(amount, attacker, isFb, damageType);
        if (this.isDead) return;

        if (actualAttacker instanceof Entity && actualAttacker !== this && actualAttacker.team !== this.team && !actualAttacker.isDead) {
            this.attackTarget = actualAttacker;
        }
    }

    isClicked(mouseX, mouseY) {
        const clickHitboxRadius = this.radius + 15;
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        return Math.hypot(dx, dy) <= clickHitboxRadius;
    }

    findTarget() {
        const enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
        const neutrals = game.creeps.filter(c => c.team === 'neutral' && !c.isDead && c.isAttackable());
        enemies.push(...neutrals);
        
        const searchRadius = this.attackRange * 1.5;
        let best = null;
        let bestDist = Infinity;
        for (let e of enemies) {
            if (e.isDead) continue;
            if (!e.isAttackable()) continue;
            const d = Math.hypot(e.x - this.x, e.y - this.y);
            if (d <= searchRadius && d < bestDist) {
                best = e;
                bestDist = d;
            }
        }
        return best;
    }

    update(dt) {
        if (this.isDead) return;
        this.updateBuffs(dt);
        
        let rate = 1.0;
        if (this.headshotSlowTimer > 0) rate *= 0.5;
        if (this.lifeBreakSlowTimer > 0) rate *= 0.4;
        if (this.attackCooldown > 0) this.attackCooldown -= dt * rate;

        this._targetCheckTimer += dt;
        if (this._targetCheckTimer > 0.5 || !this.attackTarget || !this.attackTarget.isAttackable() || this.attackTarget.team === this.team) {
            this._targetCheckTimer = 0;
            const newTarget = this.findTarget();
            if (newTarget) {
                this.attackTarget = newTarget;
            } else {
                this.attackTarget = null;
                if (this.waypoints && this.waypoints.length > 0) {
                    this.isMovingToWaypoint = true;
                    if (this.currentWaypointIndex >= this.waypoints.length) {
                        this.currentWaypointIndex = this.waypoints.length - 1;
                    }
                    this.targetX = this.waypoints[this.currentWaypointIndex].x;
                    this.targetY = this.waypoints[this.currentWaypointIndex].y;
                }
            }
        }

        if (this.attackTarget && this.attackTarget.isAttackable() && !this.attackTarget.isDead) {
            let d = Math.hypot(this.attackTarget.x - this.x, this.attackTarget.y - this.y);
            if (d <= this.attackRange && this.attackCooldown <= 0) {
                this.attackCooldown = this.attackSpeed;
                let finalDamage = this.damage;
                if (this.vladmirAura) finalDamage *= 1.18;
                if (this.type === 'melee') {
                    if (this.attackTarget.evasion > 0 && Math.random() < this.attackTarget.evasion) {
                        game.uiManager.addFloatingText(this.attackTarget.x, this.attackTarget.y - 30, 'MISS', '#ff6666');
                        return;
                    }
                    if (this.missChance > 0 && Math.random() < this.missChance) {
                        game.uiManager.addFloatingText(this.x, this.y - 30, 'MISS (Blind)', '#ff6666');
                        return;
                    }
                    this.attackTarget.takeDamage(finalDamage, this);
                    if (this.vladmirAura) {
                        let lifesteal = finalDamage * 0.20;
                        if (this.attackTarget instanceof Creep) lifesteal *= 0.6;
                        this.hp = Math.min(this.maxHp, this.hp + lifesteal);
                    }
                } else {
                    game.projectiles.push(new Projectile(this.x, this.y, this.attackTarget, finalDamage, this.team, this));
                }
            }
        }

        this.updateMovement(dt);
    }

    onDeath(attacker) {
        audio.play('creep_death');
        if (!attacker) return;
        if (attacker instanceof Hero) {
            let b = this.type === 'melee' ? 42 : 58; attacker.gold += b;
            if (attacker === game.playerHero) {
                game.uiManager.addFloatingText(this.x, this.y - 15, `+${b} 🪙`, '#ffd700');
            }
        }
        const allHeroes = game.getAllHeroes();
        for (let h of allHeroes) {
            if (h.isDead) continue;
            if (Math.hypot(h.x - this.x, h.y - this.y) < 600) {
                h.addXp(40);
            }
        }
    }

    draw(ctx, camera) {
        this.drawShadow(ctx, camera);
        let sx = this.x - camera.x; let sy = this.y - camera.y;
        ctx.save(); ctx.fillStyle = this.team === 'radiant' ? '#7cfc00' : '#8b008b';
        ctx.beginPath(); ctx.arc(sx, sy, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        if (this.hitEffectTimer > 0) {
            ctx.save(); ctx.fillStyle = 'rgba(255, 68, 0, 0.6)';
            ctx.beginPath(); ctx.arc(sx, sy, this.radius * 1.4, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
        this.drawHealthBar(ctx, camera);
    }
}

class WarlockGolem extends Creep {
    constructor(x, y, team) {
        super(x, y, team, 'melee', 'mid');
        this.radius = 25;
        this.maxHp = 1200;
        this.hp = 1200;
        this.damage = 60;
        this.baseSpeed = 200;
        this.speed = 200;
        this.attackRange = 90;
        this.lifeTime = 20.0;
        this.waypoints = null;
        this.isMovingToWaypoint = false;
    }
    update(dt) {
        if (this.isDead) return;
        this.lifeTime -= dt;
        if (this.lifeTime <= 0) {
            this.hp = 0;
            this.isDead = true;
            return;
        }
        super.update(dt);
    }
    draw(ctx, camera) {
        if (this.isDead) return;
        this.drawShadow(ctx, camera);
        let sx = this.x - camera.x; let sy = this.y - camera.y;
        ctx.save(); ctx.fillStyle = '#8b0000';
        ctx.beginPath(); ctx.arc(sx, sy, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        
        if (this.hitEffectTimer > 0) {
            ctx.save(); ctx.fillStyle = 'rgba(255, 68, 0, 0.6)';
            ctx.beginPath(); ctx.arc(sx, sy, this.radius * 1.4, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
        this.drawHealthBar(ctx, camera);
    }
}

class Catapult extends Entity {
    constructor(x, y, team, lane) {
        super(x, y, team, 24, 700, 90, 70);
        this.attackRange = 350;
        this.attackCooldown = 0;
        this.attackSpeed = 2.5; 
        this.bounty = 80;
        this.lane = lane;
        const map = game.map;
        const waypoints = (this.team === 'radiant') ? map.waypoints[lane] : map.waypointsReverse[lane];
        this.setWaypoints(waypoints);
        this._targetCheckTimer = 0;
    }

    findTarget() {
        const enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
        const neutrals = game.creeps.filter(c => c.team === 'neutral' && !c.isDead && c.isAttackable());
        enemies.push(...neutrals);
        
        const searchRadius = this.attackRange * 1.5;
        let best = null;
        let bestDist = Infinity;
        for (let e of enemies) {
            if (e.isDead) continue;
            if (!e.isAttackable()) continue;
            const d = Math.hypot(e.x - this.x, e.y - this.y);
            if (d <= searchRadius && d < bestDist) {
                best = e;
                bestDist = d;
            }
        }
        return best;
    }

    update(dt) {
        if (this.isDead) return;
        this.updateBuffs(dt);

        let rate = 1.0;
        if (this.headshotSlowTimer > 0) rate *= 0.5;
        if (this.lifeBreakSlowTimer > 0) rate *= 0.4;
        if (this.attackCooldown > 0) this.attackCooldown -= dt * rate;

        this._targetCheckTimer += dt;
        if (this._targetCheckTimer > 0.5 || !this.attackTarget || !this.attackTarget.isAttackable() || this.attackTarget.team === this.team) {
            this._targetCheckTimer = 0;
            const newTarget = this.findTarget();
            if (newTarget) {
                this.attackTarget = newTarget;
            } else {
                this.attackTarget = null;
                if (this.waypoints && this.waypoints.length > 0) {
                    this.isMovingToWaypoint = true;
                    if (this.currentWaypointIndex >= this.waypoints.length) {
                        this.currentWaypointIndex = this.waypoints.length - 1;
                    }
                    this.targetX = this.waypoints[this.currentWaypointIndex].x;
                    this.targetY = this.waypoints[this.currentWaypointIndex].y;
                }
            }
        }

        if (this.attackTarget && this.attackTarget.isAttackable() && !this.attackTarget.isDead) {
            let d = Math.hypot(this.attackTarget.x - this.x, this.attackTarget.y - this.y);
            if (d <= this.attackRange && this.attackCooldown <= 0) {
                this.performAttack();
            }
        }

        this.updateMovement(dt);
    }

    performAttack() {
        if (!this.attackTarget || this.attackTarget.isDead) return;
        let damage = this.damage;
        if (this.attackTarget instanceof Tower || this.attackTarget instanceof Ancient) {
            damage *= 2;
        }
        game.projectiles.push(new Projectile(this.x, this.y, this.attackTarget, damage, this.team, this));
        this.attackCooldown = this.attackSpeed;
    }

    draw(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        ctx.fillStyle = this.team === 'radiant' ? '#4caf50' : '#c62828';
        ctx.fillRect(screenX - 18, screenY - 12, 36, 24);

        ctx.fillStyle = '#5d4037';

        ctx.beginPath();
        ctx.arc(screenX - 12, screenY + 14, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(screenX + 12, screenY + 14, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#8d6e63';
        ctx.lineWidth = 4;

        ctx.beginPath();
        ctx.moveTo(screenX, screenY - 8);
        ctx.lineTo(screenX + (this.team === 'radiant' ? 20 : -20), screenY - 25);
        ctx.stroke();

        const barWidth = 40;
        ctx.fillStyle = '#000';
        ctx.fillRect(screenX - 20, screenY - 35, barWidth, 5);
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(screenX - 20, screenY - 35, barWidth * (this.hp / this.maxHp), 5);
    }
}

class Tower extends Entity {
    constructor(x, y, team, tier) {
        super(x, y, team, 32, 4500, 85, 0);
        this.attackRange = 360;
        this.attackSpeed = 1.3;
        this.glyphActive = false;
        this.glyphTimer = 0;
        this.tier = tier;
        this.lane = '';
        this.aggroSet = new Set();
    }

    addAggro(hero) {
        if (hero && hero.team !== this.team && !hero.isDead) {
            this.aggroSet.add(hero);
        }
    }

    isAttackable() {
        return !this.isDead && !this.glyphActive;
    }

    update(dt) {
        if (this.isDead) return;
        this.updateBuffs(dt);
        if (this.glyphActive) {
            this.glyphTimer -= dt;
            if (this.glyphTimer <= 0) {
                this.glyphActive = false;
                this.glyphTimer = 0;
            }
        }
        if (this.attackCooldown > 0) this.attackCooldown -= dt;

        const enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
        const neutrals = game.creeps.filter(c => c.team === 'neutral' && !c.isDead && c.isAttackable());
        enemies.push(...neutrals);
        
        const inRange = enemies.filter(e => {
            if (e.isDead || !e.isAttackable()) return false;
            const dist = Math.hypot(e.x - this.x, e.y - this.y);
            return dist <= this.attackRange;
        });

        let aggroTarget = null;
        for (let h of this.aggroSet) {
            if (h.isDead || h.team === this.team) continue;
            const dist = Math.hypot(h.x - this.x, h.y - this.y);
            if (dist <= this.attackRange) {
                aggroTarget = h;
                break;
            }
        }

        if (aggroTarget) {
            this.attackTarget = aggroTarget;
        } else {
            let creepTarget = null;
            for (let e of inRange) {
                if (e instanceof Creep) {
                    creepTarget = e;
                    break;
                }
            }
            if (creepTarget) {
                this.attackTarget = creepTarget;
            } else {
                this.attackTarget = inRange.length > 0 ? inRange[0] : null;
            }
        }

        if (this.attackTarget && this.attackCooldown <= 0) {
            this.attackCooldown = this.attackSpeed;
            game.projectiles.push(new Projectile(this.x, this.y - 40, this.attackTarget, this.damage, this.team, this));
        }

        if (Math.random() < 0.01) {
            const toRemove = [];
            for (let h of this.aggroSet) {
                if (h.isDead || h.team === this.team || Math.hypot(h.x - this.x, h.y - this.y) > this.attackRange * 1.5) {
                    toRemove.push(h);
                }
            }
            for (let h of toRemove) {
                this.aggroSet.delete(h);
            }
        }
    }

    takeDamage(amount, attacker, isFb = false, damageType = 'physical') {
        if (this.isDead || this.glyphActive) return;
        super.takeDamage(amount, attacker, isFb, damageType);
    }

    onDeath(attacker) { audio.play('tower_break'); }

    draw(ctx, camera) {
        if (this.isDead) return; this.drawShadow(ctx, camera);
        let sx = this.x - camera.x; let sy = this.y - camera.y;
        if (this.glyphActive) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(sx, sy - 10, this.radius + 18, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 191, 255, 0.8)';
            ctx.lineWidth = 4;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00bfff';
            ctx.stroke();
            ctx.fillStyle = 'rgba(0, 191, 255, 0.1)';
            ctx.fill();
            ctx.restore();
        }
        ctx.fillStyle = '#465262'; ctx.fillRect(sx - 20, sy - 50, 40, 65);
        ctx.fillStyle = this.team === 'radiant' ? '#2e8b57' : '#8b2525';
        ctx.fillRect(sx - 16, sy - 45, 32, 12);
        this.drawHealthBar(ctx, camera);
    }
}

class Ancient extends Entity {
    constructor(x, y, team) { super(x, y, team, 45, 2800, 0, 0); }
    update(dt) {
        if (this.isDead) return;
        this.updateBuffs(dt);
        super.update(dt);
    }
    onDeath(attacker) { game.endGame(this.team === 'radiant' ? 'dire' : 'radiant'); }
    draw(ctx, camera) {
        if (this.isDead) return; this.drawShadow(ctx, camera);
        let sx = this.x - camera.x; let sy = this.y - camera.y;
        ctx.save();
        ctx.fillStyle = this.team === 'radiant' ? '#1c5e3a' : '#611a1a';
        ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 3;
        ctx.fillRect(sx - 45, sy - 45, 90, 75); ctx.strokeRect(sx - 45, sy - 45, 90, 75);
        ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(sx - 35, sy - 35, 70, 55);
        ctx.restore(); this.drawHealthBar(ctx, camera);
    }
}

class Fountain {
    constructor(x, y, team) { this.x = x; this.y = y; this.team = team; this.radius = 150; }
    update(dt) {
        let heroes = [game.playerHero, ...game.alliedBots, game.enemyHero, ...game.enemyBots].filter(h => h && !h.isDead && h.team === this.team);
        for (let h of heroes) {
            if (Math.hypot(h.x - this.x, h.y - this.y) <= this.radius) {
                h.hp = Math.min(h.maxHp, h.hp + 100 * dt);
                h.mp = Math.min(h.maxMp, h.mp + 100 * dt);
            }
        }
    }
    draw(ctx, camera) {
        let sx = this.x - camera.x; let sy = this.y - camera.y;
        ctx.save();
        ctx.shadowBlur = 25; ctx.shadowColor = this.team === 'radiant' ? '#00bfff' : '#ff4500';
        ctx.fillStyle = this.team === 'radiant' ? 'rgba(0,191,255,0.15)' : 'rgba(255,69,0,0.15)';
        ctx.beginPath(); ctx.arc(sx, sy, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = '#2f4f4f'; ctx.beginPath(); ctx.arc(sx, sy, 30, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
}

class Projectile {
    constructor(x, y, target, damage, team, attacker) {
        this.x = x; this.y = y; this.target = target; this.damage = damage; this.team = team; this.attacker = attacker;
        this.speed = 500; this.radius = 5; this.isHs = false; this.isAss = false;
        this.isCrit = false; this.isBurningSpear = false;
        this.isManaBreak = false;
        this.isBroodmotherAttack = false;
        this.reflected = false;
        this.isSpell = false;
    }

    reflect() {
        if (this.reflected) return;
        if (!this.attacker) return;
        if (this.attacker.isDead) return;
        this.target = this.attacker;
        this.team = this.attacker.team === 'radiant' ? 'dire' : 'radiant';
        this.reflected = true;
        if (game) {
            game.effects.push({
                type: 'reflect',
                x: this.x,
                y: this.y,
                life: 0.1,
                radius: 10,
                team: this.team
            });
        }
    }

    update(dt) {
        if (!this.target || this.target.isDead) return true;
        if (this.isSpell && this.target.blockSpell && this.target.blockSpell(this.attacker)) {
            return true;
        }
        if (this.target.counterspellActive && !this.reflected) {
            this.reflect();
            return false;
        }
        let dx = this.target.x - this.x;
        let dy = this.target.y - this.y;
        let dist = Math.hypot(dx, dy);
        if (dist < 12) {
            if (!this.isAss && !this.isBurningSpear && !this.isManaBreak) {
                if (this.target.evasion > 0 && Math.random() < this.target.evasion) {
                    game.uiManager.addFloatingText(this.target.x, this.target.y - 30, 'MISS', '#ff6666');
                    return true;
                }
                // Промахивается АТАКУЮЩИЙ (если он ослеплён), а не цель
                if (this.attacker && this.attacker.missChance > 0 && Math.random() < this.attacker.missChance) {
                    game.uiManager.addFloatingText(this.attacker.x, this.attacker.y - 30, 'MISS (Blind)', '#ff6666');
                    return true;
                }
            }

            if (this.isManaBreak && this.attacker instanceof AntiMage) {
                const target = this.target;
                if (target.maxMp > 0) {
                    const burnAmount = Math.min(25, target.mp);
                    if (burnAmount > 0) {
                        target.mp -= burnAmount;
                        const bonusDamage = burnAmount;
                        target.takeDamage(bonusDamage, this.attacker, false, 'physical');
                        game.uiManager.addFloatingText(target.x, target.y - 30, `-${burnAmount} mana`, '#66ccff');
                    }
                }
            }

            if (this.isHs) {
                this.target.slowTimer = 1.5;
                this.target.headshotSlowTimer = 1.5;
                this.target.hitEffectTimer = 0.2;

                if (!(this.target instanceof Tower) && !(this.target instanceof Ancient)) {
                    let dx = this.target.x - this.attacker.x;
                    let dy = this.target.y - this.attacker.y;
                    let dist = Math.hypot(dx, dy) || 1;
                    let pushDistance = 35;
                    this.target.x += (dx / dist) * pushDistance;
                    this.target.y += (dy / dist) * pushDistance;
                    this.target.x = Math.max(50, Math.min(game.map.width - 50, this.target.x));
                    this.target.y = Math.max(50, Math.min(game.map.height - 50, this.target.y));
                }

                game.uiManager.addFloatingText(this.target.x, this.target.y - 30, "HEADSHOT", '#ffa500');
            }
            if (this.isCrit) {
                game.uiManager.addFloatingText(this.target.x, this.target.y - 45, "CRIT!", '#ff0000');
            }
            if (this.isBurningSpear) {
                if (!this.target.burningSpears) this.target.burningSpears = [];
                this.target.burningSpears.push({ duration: 9.0, tickTimer: 0, attacker: this.attacker });
            }
            let finalDamage = this.damage;
            if (this.isBroodmotherAttack && this.target._incapacitatingBite) {
                finalDamage += this.target._incapacitatingBite.bonusDamageTaken;
            }
            this.target.takeDamage(finalDamage, this.attacker);

            if (this.isBroodmotherAttack && this.attacker instanceof Broodmother && this.attacker.hungerActive) {
                const heal = this.damage * 0.4;
                this.attacker.hp = Math.min(this.attacker.maxHp, this.attacker.hp + heal);
                if (game.uiManager) game.uiManager.addFloatingText(this.attacker.x, this.attacker.y - 20, '+' + Math.floor(heal) + ' HP', '#66ff66');
            }

            try {
                const attacker = this.attacker;
                if (attacker && attacker.vladmirAura) {
                    let lifesteal = this.damage * 0.20;
                    if (this.target instanceof Creep) lifesteal *= 0.6;
                    attacker.hp = Math.min(attacker.maxHp, attacker.hp + lifesteal);
                }
            } catch (e) {}
            if (this.isAss && this.target.isDead) { game.uiManager.addFloatingText(this.target.x, this.target.y - 45, "ASSASSINATED!", '#ff0000'); }
            return true;
        }
        this.x += (dx / dist) * this.speed * dt;
        this.y += (dy / dist) * this.speed * dt;
        return false;
    }

    draw(ctx, camera) {
        let sx = this.x - camera.x; let sy = this.y - camera.y;
        let color = '#ffff00';
        if (this.isAss) color = '#ff0000';
        else if (this.isHs) color = '#ff8c00';
        else if (this.isBurningSpear) color = '#ff4500';
        else if (this.isManaBreak) color = '#66ccff';
        else if (this.isBroodmotherAttack) color = '#aa66ff';
        else if (this.reflected) color = '#ff66ff';
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(sx, sy, this.radius, 0, Math.PI*2); ctx.fill();
    }
}

class TurretRocket extends Projectile {
    constructor(x, y, target, damage, team, attacker) {
        super(x, y, target, damage, team, attacker);
        this.speed = 600;
        this.radius = 6;
        this.color = '#ff6600';
        this.explosionRadius = 100;
    }
    update(dt) {
        if (!this.target || this.target.isDead) return true;
        let dx = this.target.x - this.x;
        let dy = this.target.y - this.y;
        let dist = Math.hypot(dx, dy);
        if (dist < 15) {
            const enemies = this.team === 'radiant' ? game.direEntities() : game.radiantEntities();
            for (let e of enemies) {
                if (e.isDead) continue;
                const d = Math.hypot(e.x - this.x, e.y - this.y);
                if (d < this.explosionRadius) {
                    e.takeDamage(this.damage, this.attacker);
                    game.uiManager.addFloatingText(e.x, e.y - 20, '-' + this.damage, '#ff8800');
                }
            }
            return true;
        }
        this.x += (dx / dist) * this.speed * dt;
        this.y += (dy / dist) * this.speed * dt;
        return false;
    }
    draw(ctx, camera) {
        let sx = this.x - camera.x;
        let sy = this.y - camera.y;
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class BountyRune {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.radius = 12; this.clickRadius = 35;
        this.isSpawned = true;
        this.respawnTimer = 0;
        this.respawnCooldown = 30;
        this.goldReward = 70;
        this.color = '#f59e0b';
    }
    isClicked(mouseX, mouseY) {
        if (!this.isSpawned) return false;
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        return Math.hypot(dx, dy) <= this.clickRadius;
    }
    update(dt) {
        if (!this.isSpawned) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) this.isSpawned = true;
        }
    }
    draw(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        ctx.save();
        ctx.beginPath();
        ctx.arc(screenX, screenY, 35, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.06)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.restore();
        if (this.isSpawned) {
            const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.1;
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.radius * pulse, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('$', screenX, screenY);
        }
    }
    pickup(hero) {
        if (!this.isSpawned) return;
        this.isSpawned = false;
        this.respawnTimer = this.respawnCooldown;
        if (hero && typeof hero.gainGold === 'function') {
            hero.gainGold(this.goldReward);
        } else if (hero) {
            hero.gold += this.goldReward;
        }
        if (game.audioManager) {
            game.audioManager.play('buy');
        }
    }
}

class Barracks {
    constructor(x, y, team, type, lane) {
        this.x = x;
        this.y = y;
        this.team = team;
        this.type = type;
        this.lane = lane;
        this.radius = 20;
        this.maxHp = 1200;
        this.hp = 1200;
        this.isDead = false;
        this.armor = 5;
        this.t3Alive = true;
    }

    isAttackable() {
        return !this.isDead && this.isVulnerable();
    }

    isVulnerable() {
        if (this.isDead) return false;
        const lane = this.lane;
        const team = this.team;
        const towers = game.towers;
        const t3 = towers.find(t => t.team === team && t.lane === lane && t.tier === 3 && !t.isDead);
        return !t3;
    }

    takeDamage(amount, attacker) {
        if (this.isDead) return;
        if (!this.isVulnerable()) return;
        let reduction = this.armor / (this.armor + 100);
        amount = Math.max(1, amount * (1 - reduction));
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.isDead = true;
            audio.play('tower_break');
        }
    }

    update(dt) {}

    draw(ctx, camera) {
        if (this.isDead) return;
        const vulnerable = this.isVulnerable();
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;
        ctx.save();
        ctx.globalAlpha = vulnerable ? 1.0 : 0.4;
        ctx.fillStyle = this.team === 'radiant' ? '#2d7d2d' : '#7d2d2d';
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.fillRect(sx - 18, sy - 14, 36, 28);
        ctx.strokeRect(sx - 18, sy - 14, 36, 28);
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type === 'melee' ? '⚔️' : '🏹', sx, sy);
        ctx.restore();
        const barW = 40, barH = 4;
        ctx.fillStyle = '#000';
        ctx.fillRect(sx - barW/2, sy - 22, barW, barH);
        ctx.fillStyle = this.team === 'radiant' ? '#33ff33' : '#ff3333';
        ctx.fillRect(sx - barW/2, sy - 22, barW * (this.hp/this.maxHp), barH);
        if (!vulnerable) {
            ctx.fillStyle = '#ffaa00';
            ctx.font = '12px Arial';
            ctx.fillText('🔒', sx, sy - 30);
        }
    }
}

class NeutralCreep extends Entity {
    constructor(x, y, team, camp, type = 'weak') {
        const isWeak = type === 'weak';
        const hp = isWeak ? 450 : 850;
        const damage = isWeak ? 22 : 40;
        const speed = isWeak ? 280 : 290;
        super(x, y, 'neutral', 14, hp, damage, speed);
        this.camp = camp;
        this.type = type;
        this.leashRange = 700;
        this.returnSpeed = this.speed * 0.8;
        this.attackRange = 80;
        this.attackSpeed = 0.9;
        this.bountyGold = isWeak ? 50 : 100;
        this.bountyXp = isWeak ? 40 : 80;
        this._returning = false;
        this._homeX = x;
        this._homeY = y;
        this._targetCheckTimer = 0;
        this.isInCamp = true;
    }

    updateMovement(dt) {
        const distFromHome = Math.hypot(this.x - this._homeX, this.y - this._homeY);
        if (distFromHome > this.leashRange && !this.isDead) {
            this._returning = true;
            this.attackTarget = null;
            this.targetX = this._homeX;
            this.targetY = this._homeY;
            this.speed = this.returnSpeed;
        } else if (this._returning && distFromHome < 50) {
            this._returning = false;
            this.speed = this.baseSpeed;
            this.targetX = this._homeX;
            this.targetY = this._homeY;
            this.isInCamp = true;
        }

        if (this.attackTarget && !this._returning) {
            const d = Math.hypot(this.attackTarget.x - this.x, this.attackTarget.y - this.y);
            if (d <= this.attackRange) {
                this.targetX = this.x;
                this.targetY = this.y;
            } else {
                this.targetX = this.attackTarget.x;
                this.targetY = this.attackTarget.y;
            }
        } else if (this._returning) {
            // already directed to home
        }

        super.updateMovement(dt);
    }

    findTarget() {
        const enemies = [];
        if (game.playerHero && !game.playerHero.isDead) enemies.push(game.playerHero);
        if (game.enemyHero && !game.enemyHero.isDead) enemies.push(game.enemyHero);
        for (let bot of game.alliedBots) if (!bot.isDead) enemies.push(bot);
        for (let bot of game.enemyBots) if (!bot.isDead) enemies.push(bot);
        for (let c of game.creeps) {
            if (!c.isDead && c.team !== 'neutral') enemies.push(c);
        }
        const searchRadius = this.attackRange + 200;
        let best = null;
        let bestScore = -Infinity;
        for (let e of enemies) {
            if (e.isDead || e.team === this.team) continue;
            const dist = Math.hypot(e.x - this.x, e.y - this.y);
            if (dist > searchRadius) continue;
            let score = 0;
            if (e instanceof Hero) score = 100;
            else if (e instanceof Creep) score = 50;
            else if (e instanceof Spiderling || e instanceof WarlockGolem) score = 30;
            else score = 10;
            score -= dist * 0.1;
            if (score > bestScore) {
                bestScore = score;
                best = e;
            }
        }
        return best;
    }

    update(dt) {
        if (this.isDead) return;
        this.updateBuffs(dt);
        if (this.attackCooldown > 0) this.attackCooldown -= dt;

        this._targetCheckTimer += dt;
        if (this._targetCheckTimer > 0.5 || !this.attackTarget || !this.attackTarget.isAttackable() || this.attackTarget.team === this.team) {
            this._targetCheckTimer = 0;
            const newTarget = this.findTarget();
            if (newTarget) {
                this.attackTarget = newTarget;
                if (Math.hypot(this.x - this._homeX, this.y - this._homeY) > 100) {
                    this.isInCamp = false;
                }
            } else {
                this.attackTarget = null;
            }
        }

        if (this.attackTarget && this.attackTarget.isAttackable() && !this.attackTarget.isDead && !this._returning) {
            let d = Math.hypot(this.attackTarget.x - this.x, this.attackTarget.y - this.y);
            if (d <= this.attackRange && this.attackCooldown <= 0) {
                this.performAttack();
            }
        }

        this.updateMovement(dt);
    }

    performAttack() {
        if (!this.attackTarget || this.attackTarget.isDead) return;
        if (this.attackTarget.evasion > 0 && Math.random() < this.attackTarget.evasion) {
            game.uiManager.addFloatingText(this.attackTarget.x, this.attackTarget.y - 30, 'MISS', '#ff6666');
            this.attackCooldown = this.attackSpeed;
            return;
        }
        if (this.missChance > 0 && Math.random() < this.missChance) {
            game.uiManager.addFloatingText(this.x, this.y - 30, 'MISS (Blind)', '#ff6666');
            this.attackCooldown = this.attackSpeed;
            return;
        }
        this.attackCooldown = this.attackSpeed;
        this.attackTarget.takeDamage(this.damage, this);
    }

    onDeath(attacker) {
        if (attacker instanceof Hero) {
            attacker.gold += this.bountyGold;
            attacker.addXp(this.bountyXp);
            if (attacker === game.playerHero) {
                game.uiManager.addFloatingText(this.x, this.y - 15, `+${this.bountyGold} 🪙 (Neutral)`, '#ffd700');
            }
        }
        const allHeroes = game.getAllHeroes();
        for (let h of allHeroes) {
            if (h.isDead) continue;
            if (Math.hypot(h.x - this.x, h.y - this.y) < 600) {
                h.addXp(this.bountyXp * 0.5);
            }
        }
        if (this.camp) {
            this.camp.onCreepDeath(this);
        }
    }

    draw(ctx, camera) {
        if (this.isDead) return;
        this.drawShadow(ctx, camera);
        let sx = this.x - camera.x;
        let sy = this.y - camera.y;
        ctx.save();
        ctx.fillStyle = this.type === 'weak' ? '#8b8b00' : '#b8860b';
        ctx.beginPath();
        ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4a4a00';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
        this.drawHealthBar(ctx, camera);
    }
}

class NeutralCamp {
    constructor(x, y, type, teamSide) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.teamSide = teamSide;
        this.radius = 160;
        this.spawnTimer = 30;
        this.spawnInterval = 30;
        this.creeps = [];
        this.campBlocked = false;
        this._lastSpawnTime = 0;
        this._initialSpawnDone = false;
        this._lastSpawnAttemptTime = -10;
        this.spawnOffsets = [];
        if (type === 'weak') {
            this.spawnOffsets = [
                {x: -30, y: -30},
                {x: 30, y: -30},
                {x: -30, y: 30},
                {x: 30, y: 30}
            ];
        } else {
            this.spawnOffsets = [
                {x: -40, y: -20},
                {x: 40, y: -20},
                {x: 0, y: 30}
            ];
        }
    }

    isBlocked() {
        const checkRadius = this.radius + 30;
        const allHeroes = game.getAllHeroes();
        for (let h of allHeroes) {
            if (h.isDead) continue;
            if (Math.hypot(h.x - this.x, h.y - this.y) < checkRadius) {
                return true;
            }
        }
        for (let c of game.creeps) {
            if (c.isDead) continue;
            if (c instanceof NeutralCreep && c.camp === this) continue;
            if (Math.hypot(c.x - this.x, c.y - this.y) < checkRadius) {
                return true;
            }
        }
        for (let t of game.towers) {
            if (t.isDead) continue;
            if (Math.hypot(t.x - this.x, t.y - this.y) < checkRadius) {
                return true;
            }
        }
        for (let bot of [...game.alliedBots, ...game.enemyBots]) {
            if (!bot || bot.isDead) continue;
            if (Math.hypot(bot.x - this.x, bot.y - this.y) < checkRadius) {
                return true;
            }
        }
        return false;
    }

    spawn() {
        const alive = this.creeps.filter(c => !c.isDead);
        if (alive.length > 0) return false;

        if (this.isBlocked()) {
            this.campBlocked = true;
            return false;
        }
        this.campBlocked = false;

        for (let offset of this.spawnOffsets) {
            const cx = this.x + offset.x + (Math.random() - 0.5) * 20;
            const cy = this.y + offset.y + (Math.random() - 0.5) * 20;
            const creep = new NeutralCreep(cx, cy, 'neutral', this, this.type);
            this.creeps.push(creep);
            game.creeps.push(creep);
        }
        this._lastSpawnTime = game.matchTime;
        return true;
    }

    onCreepDeath(creep) {
        const alive = this.creeps.filter(c => !c.isDead);
        if (alive.length === 0) {
            this.spawnTimer = this.spawnInterval;
        }
    }

    update(dt) {
        this.creeps = this.creeps.filter(c => !c.isDead);
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            const spawned = this.spawn();
            if (spawned) {
                this.spawnTimer = this.spawnInterval;
            } else {
                this.spawnTimer = 1.5;
            }
        }
    }

    draw(ctx, camera) {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = this.teamSide === 'radiant' ? '#00ff00' : '#ff0000';
        ctx.beginPath();
        ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.restore();
        if (this.campBlocked) {
            ctx.save();
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(sx - 10, sy - 10);
            ctx.lineTo(sx + 10, sy + 10);
            ctx.moveTo(sx + 10, sy - 10);
            ctx.lineTo(sx - 10, sy + 10);
            ctx.stroke();
            ctx.restore();
        }
        ctx.save();
        ctx.fillStyle = this.teamSide === 'radiant' ? '#66ff66' : '#ff6666';
        ctx.beginPath();
        ctx.arc(sx, sy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    getMinimapPos(mapWidth, mapHeight) {
        return { x: (this.x / game.map.width) * mapWidth, y: (this.y / game.map.height) * mapHeight };
    }
}

// =========================================================================
//  ИИ БОТОВ (BotAI) — с поддержкой Tinker
// =========================================================================

class BotAI {
    constructor(hero, lane, game) {
        this.hero = hero;
        this.lane = lane;
        this.game = game;
        this.state = 'normal';
        this.fountain = hero.team === 'radiant' ? game.fountains[0] : game.fountains[1];
        this.waypoints = hero.team === 'radiant' ? game.map.waypoints[lane] : game.map.waypointsReverse[lane];
        this.waypointIndex = 0;
        this.retreatThreshold = 0.10;
        this.abilityTimer = 0;
        this.blinkTimer = 0;

        this.buildIndex = 0;
        this.buildTimer = 0;
        const name = hero.name;
        if (name === 'Huskar') {
            this.build = ['bracer', 'ringhealth', 'vitality', 'ringtarrasque', 'reaver', 'butterfly'];
            this.finalItems = ['vanguard', 'heart', 'butterfly'];
        } else if (name === 'Anti-Mage') {
            this.build = ['bracer', 'radiance', 'butterfly'];
            this.finalItems = ['bracer', 'radiance', 'butterfly'];
        } else if (name === 'Sniper') {
            this.build = ['bracer', 'sword', 'butterfly'];
            this.finalItems = ['sword', 'butterfly'];
        } else if (name === 'Morphling') {
            this.build = ['vladmir', 'linkens', 'butterfly'];
            this.finalItems = ['vladmir', 'linkens', 'butterfly'];
        } else if (name === 'Warlock') {
            this.build = ['radiance', 'ringtarrasque', 'reaver'];
            this.finalItems = ['radiance', 'heart'];
        } else if (name === 'Broodmother') {
            this.build = ['ringhealth', 'vitality', 'ringtarrasque', 'reaver', 'butterfly'];
            this.finalItems = ['vanguard', 'heart', 'butterfly'];
        } else if (name === 'Io') {
            this.build = ['ringhealth', 'vitality', 'ringtarrasque', 'reaver'];
            this.finalItems = ['bracer', 'vanguard', 'heart'];
        } else if (name === 'Tinker') {
            this.build = ['linkens', 'radiance'];
            this.finalItems = ['linkens', 'radiance'];
        } else {
            this.build = [];
            this.finalItems = [];
        }
        this.currentFinalItemIndex = 0;
        this.hero.gold = 200;
        this._lastTeleportTime = 0;

        if (hero instanceof Io) {
            this._ioTetherTarget = null;
            this._ioTetherCooldown = 0;
            this._ioLane = lane;
            this._ioHasTethered = false;
            this._ioTetherCheckTimer = 0;
        }
    }

    // ---------- НОВОЕ: сбор всей командой на Рошана и совместный пуш линии ----------
    updateRoshanSquad(dt) {
        const hero = this.hero;
        const game = this.game;
        if (!game.roshan) return;

        if (!game.roshanSquadState) game.roshanSquadState = {};
        if (!game.roshanSquadState[hero.team]) {
            game.roshanSquadState[hero.team] = { phase: 'idle', pushLane: null, lootTimer: 0 };
        }
        const squad = game.roshanSquadState[hero.team];

        // На 5-й минуте матча один раз решаем — идти на Рошана всей толпой
        if (squad.phase === 'idle') {
            if (game.matchTime >= 300) { //00000000000000000000000000000000000000000000000000000000
                squad.phase = game.roshan.isDead ? 'done' : 'grouping';
            }
            return;
        }

        if (squad.phase === 'done') return;

        // ---- Сбор к Рошану и фокус-атака ----
        if (squad.phase === 'grouping' || squad.phase === 'fighting') {
            if (game.roshan.isDead) {
                squad.phase = 'looting';
                squad.lootTimer = 1.5;
                this.state = 'roshan_group';
                hero.attackTarget = null;
                return;
            }

            const dist = Math.hypot(hero.x - game.roshan.x, hero.y - game.roshan.y);
            this.state = 'roshan_group';
            if (dist > hero.attackRange * 0.85) {
                hero.attackTarget = null;
                hero.moveTo(game.roshan.x, game.roshan.y);
            } else {
                squad.phase = 'fighting';
                hero.attackTarget = game.roshan;
                this.abilityTimer += dt;
                if (this.abilityTimer > 2.0) {
                    this.abilityTimer = 0;
                    this.useAbilities(game.roshan);
                }
            }
            return;
        }

        // ---- Ждём немного, пока щит (Аегис) подбирается штатным кодом в Game.update ----
        if (squad.phase === 'looting') {
            this.state = 'roshan_group';
            hero.attackTarget = null;
            squad.lootTimer -= dt;
            if (squad.lootTimer <= 0) {
                if (!squad.pushLane) {
                    const lanes = ['top', 'mid', 'bottom'];
                    squad.pushLane = lanes[Math.floor(Math.random() * lanes.length)];
                }
                squad.phase = 'pushing';
            }
            return;
        }

        // ---- Каждый бот САМ переключается на общую линию, независимо от остальных ----
        if (squad.phase === 'pushing') {
            if (!this._roshanPushApplied) {
                this._roshanPushApplied = true;
                this.lane = squad.pushLane;
                this.waypoints = hero.team === 'radiant' ? game.map.waypoints[this.lane] : game.map.waypointsReverse[this.lane];
                this.waypointIndex = 0;
                this.state = 'normal';
                if (this.waypoints && this.waypoints.length > 0) {
                    hero.moveTo(this.waypoints[0].x, this.waypoints[0].y);
                }
            }
            return;
        }
    }

    update(dt) {
        const hero = this.hero;
        if (hero.isDead) return;

        if (hero.isChannelingTeleport || hero.isKeenChanneling || hero.isRearming) {
            return;
        }

        hero.passiveGoldTimer += dt;
        if (hero.passiveGoldTimer >= 1.0) {
            hero.passiveGoldTimer -= 1.0;
            hero.gold += 2;
        }

        this.buildTimer += dt;
        if (this.buildTimer >= 1.0) {
            this.buildTimer = 0;
            this.tryBuyItem();
        }

        // Групповой поход на Рошана / совместный пуш линии (см. метод выше)
        this.updateRoshanSquad(dt);

        if (this.state !== 'roshan_group' && this.shouldUseTeleport()) {
            this.useTeleport();
        }

        // Специфическая логика для Io
        if (hero instanceof Io) {
            if (!hero.tetherTarget && !hero._origSpeed) {
                let target = null;
                if (game.playerHero && game.playerHero.team === hero.team && !game.playerHero.isDead) {
                    target = game.playerHero;
                }
                if (!target) {
                    const allies = hero.team === 'radiant' ? game.radiantEntities() : game.direEntities();
                    let closest = null;
                    let minDist = Infinity;
                    for (let a of allies) {
                        if (a === hero || a.isDead) continue;
                        if (!(a instanceof Hero)) continue;
                        const d = Math.hypot(a.x - hero.x, a.y - hero.y);
                        if (d < minDist) {
                            minDist = d;
                            closest = a;
                        }
                    }
                    target = closest;
                }
                if (target) {
                    hero.useTether(target);
                    this._ioHasTethered = true;
                }
            }

            if (hero.tetherTarget) {
                const dist = Math.hypot(hero.tetherTarget.x - hero.x, hero.tetherTarget.y - hero.y);
                if (dist > 850) {
                    hero.targetX = hero.tetherTarget.x;
                    hero.targetY = hero.tetherTarget.y;
                }
                if (dist > 950) {
                    hero.targetX = hero.tetherTarget.x;
                    hero.targetY = hero.tetherTarget.y;
                    hero.speed = hero.baseSpeed * 1.5;
                }
                if (dist > 1000) {
                    hero.breakTether();
                    hero.useTether(hero.tetherTarget);
                }
            }

            if (hero.attackTarget && hero.attackTarget.team !== hero.team && !hero.attackTarget.isDead) {
                if (hero.abilities[2].currentCooldown <= 0 && hero.mp >= 50 && !hero.overchargeActive) {
                    hero.useOvercharge();
                }
                const enemiesNear = hero.team === 'radiant' ? game.direEntities() : game.radiantEntities();
                let count = 0;
                for (let e of enemiesNear) {
                    if (e.isDead) continue;
                    if (Math.hypot(e.x - hero.x, e.y - hero.y) < 400) count++;
                }
                if (count >= 2 && hero.abilities[1].currentCooldown <= 0 && hero.mp >= 60 && !hero.spiritsActive) {
                    hero.useSpirits();
                }
            }

            if (hero.abilities[3].currentCooldown <= 0 && hero.mp >= 100 && !hero.isRelocateActive && !hero.isRelocateChanneling) {
                if (hero.tetherTarget && hero.tetherTarget.hp < hero.tetherTarget.maxHp * 0.3) {
                    const fountain = hero.team === 'radiant' ? game.fountains[0] : game.fountains[1];
                    if (fountain) {
                        hero.startRelocate(fountain.x, fountain.y);
                    }
                }
            }
        }

        const hpPercent = hero.hp / hero.maxHp;
        if (hpPercent <= this.retreatThreshold && this.state !== 'heal') {
            this.state = 'retreat';
            hero.attackTarget = null;
            hero.moveTo(this.fountain.x, this.fountain.y);
            if (hero instanceof AntiMage && hero.abilities[1].currentCooldown <= 0 && hero.mp >= 50) {
                let dx = this.fountain.x - hero.x;
                let dy = this.fountain.y - hero.y;
                let dist = Math.hypot(dx, dy);
                if (dist > 1) {
                    let step = 600 / dist;
                    let newX = hero.x + dx * step;
                    let newY = hero.y + dy * step;
                    newX = Math.max(0, Math.min(game.map.width, newX));
                    newY = Math.max(0, Math.min(game.map.height, newY));
                    hero.x = newX;
                    hero.y = newY;
                    hero.targetX = newX;
                    hero.targetY = newY;
                    hero.abilities[1].currentCooldown = hero.abilities[1].maxCooldown;
                    hero.mp -= 50;
                    if (game) {
                        game.effects.push({ type: 'blink', x: hero.x, y: hero.y, life: 0.3, radius: 40, team: hero.team });
                    }
                }
            }
        }

        if (this.state === 'retreat' || this.state === 'heal') {
            const dist = Math.hypot(hero.x - this.fountain.x, hero.y - this.fountain.y);
            if (dist < this.fountain.radius) {
                this.state = 'heal';
                if (hero.hp >= hero.maxHp) {
                    this.state = 'normal';
                    hero.attackTarget = null;
                    if (this.waypoints && this.waypoints.length > 0) {
                        this.waypointIndex = 0;
                        hero.moveTo(this.waypoints[0].x, this.waypoints[0].y);
                    }
                }
                return;
            }
            return;
        }

        if (this.state === 'normal') {
            const target = this.selectTarget();
            if (target) {
                hero.attackTarget = target;
                const d = Math.hypot(hero.x - target.x, hero.y - target.y);
                if (d > hero.attackRange * 0.85) {
                    hero.moveTo(target.x, target.y);
                }

                this.abilityTimer += dt;
                if (this.abilityTimer > 2.0) {
                    this.abilityTimer = 0;
                    this.useAbilities(target);
                }

                if (hero instanceof AntiMage) {
                    if (d > 400 && hero.abilities[1].currentCooldown <= 0 && hero.mp >= 50) {
                        hero.useAbility(1);
                    }
                }
            } else {
                hero.attackTarget = null;
                if (this.waypoints && this.waypoints.length > 0) {
                    if (this.waypointIndex >= this.waypoints.length) {
                        // стоим
                    } else {
                        const wp = this.waypoints[this.waypointIndex];
                        const dist = Math.hypot(hero.x - wp.x, hero.y - wp.y);
                        if (dist < 20) {
                            this.waypointIndex++;
                            if (this.waypointIndex < this.waypoints.length) {
                                hero.moveTo(this.waypoints[this.waypointIndex].x, this.waypoints[this.waypointIndex].y);
                            }
                        } else {
                            hero.moveTo(wp.x, wp.y);
                        }
                    }
                }
            }
        }
    }

    shouldUseTeleport() {
        const hero = this.hero;
        if (hero.isDead) return false;
        if (hero.teleportCharges <= 0) return false;
        if (hero.isChannelingTeleport) return false;
        if (this._lastTeleportTime > 0 && (Date.now() - this._lastTeleportTime) < 5000) return false;
        if (this.waypoints && this.waypoints.length > 0) {
            const nextWp = this.waypoints[Math.min(this.waypointIndex, this.waypoints.length - 1)];
            if (nextWp && Math.hypot(hero.x - nextWp.x, hero.y - nextWp.y) < 300) {
                return false;
            }
        }
        if (this.state === 'retreat' || this.state === 'heal') return false;
        if (hero.attackTarget && !hero.attackTarget.isDead) return false;
        return true;
    }

    useTeleport() {
        const hero = this.hero;
        if (!hero || hero.isDead) return;
        const lane = this.lane;
        const teamTowers = game.towers.filter(t => t.team === hero.team && t.lane === lane && !t.isDead);
        if (teamTowers.length === 0) return;
        let base = hero.team === 'radiant' ? game.map.radiantBase : game.map.direBase;
        let farthestTower = null;
        let maxDist = -Infinity;
        for (let t of teamTowers) {
            const dist = Math.hypot(t.x - base.x, t.y - base.y);
            if (dist > maxDist) {
                maxDist = dist;
                farthestTower = t;
            }
        }
        if (!farthestTower) return;
        if (hero.startTeleport(farthestTower)) {
            this._lastTeleportTime = Date.now();
            hero.attackTarget = null;
            hero.targetX = hero.x;
            hero.targetY = hero.y;
            this.state = 'normal';
        }
    }

    tryBuyItem() {
        const hero = this.hero;
        if (this.buildIndex >= this.build.length) return;

        let currentFinalItemId = null;
        if (this.currentFinalItemIndex < this.finalItems.length) {
            currentFinalItemId = this.finalItems[this.currentFinalItemIndex];
        }

        if (currentFinalItemId) {
            const hasFinal = hero.inventory.items.find(item => item.id === currentFinalItemId);
            if (hasFinal) {
                this.currentFinalItemIndex++;
                if (this.currentFinalItemIndex >= this.finalItems.length) {
                    this.buildIndex = this.build.length;
                }
                return;
            }
        }

        const itemId = this.build[this.buildIndex];
        const cost = this.getItemCost(itemId);
        if (hero.gold >= cost) {
            const hasItem = hero.inventory.items.find(item => item.id === itemId);
            if (hasItem) {
                this.buildIndex++;
                return;
            }
            const item = this.createItem(itemId);
            if (item && hero.inventory.addItem(item)) {
                hero.gold -= cost;
                audio.play('buy');
            }
        }
    }

    getItemCost(itemId) {
        const costs = {
            'ringhealth': 400,
            'vitality': 1000,
            'ringtarrasque': 1700,
            'reaver': 2500,
            'radiance': 1500,
            'sword': 1500,
            'vladmir': 1500,
            'linkens': 1500,
            'butterfly': 2500,
            'bracer' : 200,
            'wraithband': 200,
            'nulltalisman': 200,
            'dragonlance': 1500
        };
        return costs[itemId] || 0;
    }

    createItem(itemId) {
        const items = {
            'ringhealth': new Item('ringhealth', 'Ring of Health', 400, { hpRegen: 4.5 }),
            'vitality': new Item('vitality', 'Vitality Booster', 1000, { hp: 250 }),
            'ringtarrasque': new Item('ringtarrasque', 'Ring of Tarrasque', 1700, { hpRegen: 12 }),
            'reaver': new Item('reaver', 'Reaver', 2500, { hp: 25 }),
            'radiance': new Item('radiance', 'Radiance', 1500, { damageBonus: 20 }),
            'sword': new Item('sword', 'Crystalys', 1500, { damageBonus: 32, critChance: 0.3, critMultiplier: 1.6 }),
            'vladmir': new Item('vladmir', "Vladmir's Offering", 1500, { manaRegen: 0.75, armorBonus: 1 }),
            'linkens': new Item('linkens', "Linken's Sphere", 1500, { hp: 200, mana: 200, damage: 15, manaRegen: 5 }),
            'butterfly': new Item('butterfly', 'Butterfly', 2500, { agility: 35, evasion: 0.35, damage: 25 }),
            'bracer': new Item('bracer', 'Bracer', 200, { hp: 150, damage: 6, hpRegen: 0.75 }),
            'wraithband': new Item('wraithband', 'Wraith Band', 200, { agility: 6, damage: 6 }),
            'nulltalisman': new Item('nulltalisman', 'Null Talisman', 200, { intelligence: 6, manaRegen: 0.5 , damage: 6 }),
            'dragonlance': new Item('dragonlance', 'Dragon Lance', 1500, { damage: 20, attackRange: 70 }),
            'falconblade': new Item('falconblade', 'Falcon Blade', 475, { hp:200, damage: 14, manaRegen: 1.8 })
        };
        return items[itemId] || null;
    }

    selectTarget() {
        const hero = this.hero;
        const enemies = hero.team === 'radiant' ? this.game.direEntities() : this.game.radiantEntities();
        const neutrals = this.game.creeps.filter(c => c.team === 'neutral' && !c.isDead && c.isAttackable());
        enemies.push(...neutrals);

        const attackRange = hero.attackRange * 1.2;

        let closestHero = null;
        let minDistHero = Infinity;
        for (let e of enemies) {
            if (e.isDead || !e.isAttackable()) continue;
            if (!(e instanceof Hero)) continue;
            const d = Math.hypot(e.x - hero.x, e.y - hero.y);
            if (d <= attackRange && d < minDistHero) {
                minDistHero = d;
                closestHero = e;
            }
        }
        if (closestHero) return closestHero;

        let closestCreep = null;
        let minDistCreep = Infinity;
        for (let e of enemies) {
            if (e.isDead || !e.isAttackable()) continue;
            if (!(e instanceof Creep)) continue;
            const d = Math.hypot(e.x - hero.x, e.y - hero.y);
            if (d <= attackRange && d < minDistCreep) {
                minDistCreep = d;
                closestCreep = e;
            }
        }
        if (closestCreep) return closestCreep;

        let closestBuilding = null;
        let minDistBuilding = Infinity;
        for (let t of this.game.towers) {
            if (t.team === hero.team || t.isDead || !t.isAttackable()) continue;
            const d = Math.hypot(t.x - hero.x, t.y - hero.y);
            if (d < minDistBuilding) {
                minDistBuilding = d;
                closestBuilding = t;
            }
        }
        for (let b of this.game.barracks) {
            if (b.team === hero.team || b.isDead || !b.isAttackable()) continue;
            const d = Math.hypot(b.x - hero.x, b.y - hero.y);
            if (d < minDistBuilding) {
                minDistBuilding = d;
                closestBuilding = b;
            }
        }
        for (let a of this.game.ancients) {
            if (a.team === hero.team || a.isDead || !a.isAttackable()) continue;
            const d = Math.hypot(a.x - hero.x, a.y - hero.y);
            if (d < minDistBuilding) {
                minDistBuilding = d;
                closestBuilding = a;
            }
        }

        if (closestBuilding && minDistBuilding <= attackRange) {
            return closestBuilding;
        }

        return null;
    }

    useAbilities(target) {
        const hero = this.hero;
        if (hero instanceof Tinker) {
            if (hero.isRearming) return;
            const enemies = hero.team === 'radiant' ? this.game.direEntities() : this.game.radiantEntities();
            const nearEnemy = enemies.find(e => Math.hypot(e.x - hero.x, e.y - hero.y) < 700);
            if (nearEnemy) {
                if (hero.abilities[0].currentCooldown <= 0 && hero.mp >= hero.abilities[0].manaCost) {
                    hero.useAbility(0);
                    return;
                }
                if (hero.abilities[1].currentCooldown <= 0 && hero.mp >= hero.abilities[1].manaCost) {
                    hero.useAbility(1);
                    return;
                }
                if (hero.abilities[2].currentCooldown <= 0 && hero.mp >= hero.abilities[2].manaCost) {
                    hero.useAbility(2);
                    return;
                }
                if (hero.abilities[4].currentCooldown <= 0 && hero.mp >= hero.abilities[4].manaCost && !hero.isRearming) {
                    const q = hero.abilities[0], w = hero.abilities[1], e = hero.abilities[2], d = hero.abilities[3];
                    if (q.currentCooldown > 0 || w.currentCooldown > 0 || e.currentCooldown > 0 || d.currentCooldown > 0) {
                        hero.useAbility(4);
                        return;
                    }
                }
            } else {
                if (hero.abilities[4].currentCooldown <= 0 && hero.mp >= hero.abilities[4].manaCost && !hero.isRearming) {
                    const q = hero.abilities[0], w = hero.abilities[1], e = hero.abilities[2], d = hero.abilities[3];
                    if (q.currentCooldown > 0 || w.currentCooldown > 0 || e.currentCooldown > 0 || d.currentCooldown > 0) {
                        hero.useAbility(4);
                        return;
                    }
                }
            }
            return;
        }

        if (hero instanceof AntiMage) {
            if (hero.abilities[2].currentCooldown <= 0 && hero.mp >= 50) {
                const enemies = hero.team === 'radiant' ? this.game.direEntities() : this.game.radiantEntities();
                let nearbyEnemy = enemies.find(e => Math.hypot(e.x - hero.x, e.y - hero.y) < 500 && e instanceof Hero);
                if (nearbyEnemy && hero.hp / hero.maxHp < 0.7) {
                    hero.useAbility(2);
                }
            }
            if (hero.abilities[3].currentCooldown <= 0 && hero.mp >= 150) {
                const missing = (target.maxMp || 0) - (target.mp || 0);
                if (missing > 200) {
                    hero.attackTarget = target;
                    hero.useAbility(3);
                }
            }
        } else {
            for (let i = 0; i < hero.abilities.length; i++) {
                const ab = hero.abilities[i];
                if (ab.type === 'passive') continue;
                if (ab.currentCooldown > 0) continue;
                if (hero.mp < ab.manaCost) continue;
                const dist = Math.hypot(hero.x - target.x, hero.y - target.y);
                if (dist <= 500) {
                    hero.useAbility(i);
                    return;
                }
            }
        }
    }
}

// =========================================================================
//  UI Менеджер (UIManager)
// =========================================================================

class UIManager {
    constructor() { this.floatTexts = []; }
    addFloatingText(x, y, text, color) { this.floatTexts.push({ x, y, text, color, life: 1.0 }); }
    update(dt) {
        for (let i = this.floatTexts.length - 1; i >= 0; i--) {
            this.floatTexts[i].life -= dt; this.floatTexts[i].y -= 20 * dt;
            if (this.floatTexts[i].life <= 0) this.floatTexts.splice(i, 1);
        }
        this.syncHUD();
    }
    syncHUD() {
        let p = game.playerHero; if (!p) return;
        const heroLevelBadge = document.getElementById('hero-level-badge');
        const statDamage = document.getElementById('stat-damage');
        const statSpeed = document.getElementById('stat-speed');
        const statRange = document.getElementById('stat-range');
        const xpBar = document.getElementById('xp-bar');
        const xpText = document.getElementById('xp-text');
        const hpIndicator = document.getElementById('hp-indicator');
        const hpText = document.getElementById('hp-text');
        const hpRegenText = document.getElementById('hp-regen-text');
        const mpIndicator = document.getElementById('mp-indicator');
        const mpText = document.getElementById('mp-text');
        const mpRegenText = document.getElementById('mp-regen-text');
        const goldValue = document.getElementById('gold-value');

        if (heroLevelBadge) heroLevelBadge.innerText = p.level;
        if (statDamage) statDamage.innerText = Math.floor(p.damage);
        if (statSpeed) statSpeed.innerText = Math.floor(p.speed);
        if (statRange) statRange.innerText = Math.floor(p.attackRange);
        if (xpBar) xpBar.style.width = `${(p.xp / p.maxXp) * 100}%`;
        if (xpText) xpText.innerText = `${p.xp}/${p.maxXp} XP`;
        if (hpIndicator) hpIndicator.style.width = `${(p.hp / p.maxHp) * 100}%`;
        if (hpText) hpText.innerText = `${Math.floor(p.hp)}/${p.maxHp}`;
        if (hpRegenText) hpRegenText.innerText = `+${p.getHpRegen().toFixed(1)}`;
        if (mpIndicator) mpIndicator.style.width = p.maxMp > 0 ? `${(p.mp / p.maxMp) * 100}%` : '0%';
        if (mpText) mpText.innerText = p.maxMp > 0 ? `${Math.floor(p.mp)}/${p.maxMp}` : '0/0';
        if (mpRegenText) mpRegenText.innerText = p.maxMp > 0 ? `+${p.getMpRegen().toFixed(1)}` : '+0.0';
        if (goldValue) goldValue.innerText = Math.floor(p.gold);

        const profileIcon = document.getElementById('hero-profile-icon');
        if (profileIcon) {
            const heroKey = p.name || '';
            if (profileIcon.dataset.hero !== heroKey) {
                if (heroKey === 'Morphling') {
                    profileIcon.src = 'images/morphling_profile.gif';
                    profileIcon.alt = 'Morphling profile';
                } else if (heroKey === 'Sniper') {
                    profileIcon.src = 'images/sniper_profile.gif';
                    profileIcon.alt = 'Sniper profile';
                } else if (heroKey === 'Warlock') {
                    profileIcon.src = 'images/warlock_profile.webp';
                    profileIcon.alt = 'Warlock profile';
                } else if (heroKey === 'Bristleback') {
                    profileIcon.src = 'images/Bristleback_icon.svg';
                    profileIcon.alt = 'Bristleback profile';
                } else if (heroKey === 'Huskar') {
                    profileIcon.src = 'images/Huskar_icon.webp';
                    profileIcon.alt = 'Huskar profile';
                } else if (heroKey === 'Anti-Mage') {
                    profileIcon.src = 'images/antimage_profile.png';
                    profileIcon.alt = 'Anti-Mage profile';
                } else if (heroKey === 'Broodmother') {
                    profileIcon.src = 'images/broodmother_profile.png';
                    profileIcon.alt = 'Broodmother profile';
                } else if (heroKey === 'Io') {
                    profileIcon.src = 'images/io_profile.png';
                    profileIcon.alt = 'Io profile';
                } else if (heroKey === 'Tinker') {
                    profileIcon.src = 'images/Tinker_icon.png';
                    profileIcon.alt = 'Tinker profile';
                } else {
                    profileIcon.src = '';
                    profileIcon.alt = '';
                }
                profileIcon.dataset.hero = heroKey;
            }
            if (heroKey) profileIcon.classList.remove('hidden'); else profileIcon.classList.add('hidden');
        }

        let t = game.matchTime;
        const matchTimer = document.getElementById('match-timer');
        if (matchTimer) matchTimer.innerText = `${Math.floor(t/60).toString().padStart(2,'0')}:${Math.floor(t%60).toString().padStart(2,'0')}`;
        let rt = game.ancients.find(a => a.team === 'radiant');
        let dt = game.ancients.find(a => a.team === 'dire');
        if (rt && dt) {
            const radiantThroneHp = document.getElementById('radiant-throne-hp');
            const direThroneHp = document.getElementById('dire-throne-hp');
            if (radiantThroneHp) radiantThroneHp.innerText = `${Math.ceil((rt.hp/rt.maxHp)*100)}%`;
            if (direThroneHp) direThroneHp.innerText = `${Math.ceil((dt.hp/dt.maxHp)*100)}%`;
        }
        
        const totalSlots = p instanceof Tinker ? 5 : 4;
        for (let i = 0; i < totalSlots; i++) {
            let slot = document.getElementById(`ability-${i}`);
            let cd = document.getElementById(`cooldown-${i}`);
            let tt = document.getElementById(`tooltip-${i}`);
            let ab = p.abilities[i];
            if (ab) {
                if (slot) {
                    slot.style.display = "flex";
                    let displayName = ab.name;
                    if (p instanceof Sniper && i === 0) {
                        displayName = `${ab.name} (${p.shrapnelCharges})`;
                    }
                    if (p instanceof Tinker && i === 3) {
                        displayName = ab.name;
                    }
                    slot.querySelector('.ability-name').innerText = displayName;
                    tt.innerHTML = `<strong>${ab.name}</strong><br>${ab.description}<br>Cost: ${ab.manaCost} | CD: ${ab.maxCooldown}s`;
                    
                    if (p instanceof Sniper && i === 0) {
                        if (p.shrapnelCharges === 0) {
                            cd.style.opacity = 1;
                            cd.innerText = Math.ceil(p.shrapnelChargeCooldown - p.shrapnelChargeRegenTimer);
                        } else {
                            cd.style.opacity = 0;
                        }
                    } else {
                        if (ab.currentCooldown > 0) { cd.style.opacity = 1; cd.innerText = Math.ceil(ab.currentCooldown); }
                        else { cd.style.opacity = 0; }
                    }
                }
            } else {
                if (slot) slot.style.display = "none";
            }
        }
        if (!(p instanceof Tinker)) {
            const extraSlot = document.getElementById('ability-4');
            if (extraSlot) extraSlot.style.display = 'none';
        } else {
            const extraSlot = document.getElementById('ability-4');
            if (extraSlot) extraSlot.style.display = 'flex';
        }

        for (let i = 0; i < 6; i++) {
            let slot = document.querySelector(`.inventory-slot[data-slot="${i}"]`);
            if (slot) {
                let it = p.inventory.slots[i];
                slot.innerText = it ? it.name.split(' ')[0] : '';
                slot.style.background = it ? '#253341' : '#11161b';
            }
        }

        let glyphBtn = document.getElementById('glyph-btn');
        let glyphCd = document.getElementById('glyph-cooldown');
        if (glyphBtn && glyphCd) {
            let playerTeam = p?.team;
            let cooldown = playerTeam ? game.glyphCooldown[playerTeam] : 0;
            let active = playerTeam ? game.glyphActive[playerTeam] : false;
            glyphBtn.disabled = !p || p.isDead || cooldown > 0;
            if (active) {
                glyphBtn.classList.add('active');
                glyphBtn.title = `Glyph active (${Math.ceil(game.glyphTimer[playerTeam])}s)`;
            } else {
                glyphBtn.classList.remove('active');
                glyphBtn.title = cooldown > 0
                    ? `Glyph: ${Math.ceil(cooldown)}s`
                    : 'Activate Glyph (Protect towers)';
            }
            if (cooldown > 0) {
                glyphCd.innerText = Math.ceil(cooldown);
                glyphCd.style.visibility = 'visible';
                glyphCd.style.opacity = 1;
            } else {
                glyphCd.style.visibility = 'hidden';
                glyphCd.style.opacity = 0;
            }
        }
    }

    draw(ctx, camera) {
        ctx.save(); ctx.font = 'bold 14px Arial';
        for (let t of this.floatTexts) {
            ctx.fillStyle = t.color; ctx.globalAlpha = t.life; ctx.fillText(t.text, t.x - camera.x, t.y - camera.y);
        }
        ctx.restore(); this.drawMinimap();
    }

    drawMinimap() {
        const mCanvas = document.getElementById('minimapCanvas');
        if (!mCanvas) return;
        const mCtx = mCanvas.getContext('2d');
        const w = mCanvas.width, h = mCanvas.height;
        mCtx.clearRect(0, 0, w, h);
        mCtx.fillStyle = '#151c12';
        mCtx.fillRect(0, 0, w, h);

        const map = game.map;
        const lanes = ['top', 'mid', 'bottom'];
        for (let lane of lanes) {
            const wps = map.waypoints[lane];
            if (!wps || wps.length < 2) continue;
            mCtx.strokeStyle = '#3a5a3a';
            mCtx.lineWidth = 2;
            mCtx.beginPath();
            for (let wp of wps) {
                const sx = (wp.x / map.width) * w;
                const sy = (wp.y / map.height) * h;
                mCtx.lineTo(sx, sy);
            }
            mCtx.stroke();
        }

        const toM = (x, y) => ({ x: (x / map.width) * w, y: (y / map.height) * h });

        const player = game.playerHero;
        const isTeleportMode = player && player.isChannelingTeleport === false && player.teleportCharges > 0 && game._teleportSelectionMode;
        const isKeenMode = player && player instanceof Tinker && player.selectKeenTarget;
        let highlightTowers = [];
        if (isTeleportMode) {
            highlightTowers = game.towers.filter(t => t.team === player.team && !t.isDead);
        } else if (isKeenMode) {
            highlightTowers = game.towers.filter(t => t.team === player.team && !t.isDead);
        }

        for (let t of game.towers) {
            if (t.isDead) continue;
            const pos = toM(t.x, t.y);
            const isHighlight = highlightTowers.includes(t) || (isKeenMode && t.team === player.team);
            mCtx.beginPath();
            mCtx.arc(pos.x, pos.y, isHighlight ? 5 : 3, 0, Math.PI * 2);
            if (isHighlight) {
                mCtx.fillStyle = '#00ffff';
                mCtx.shadowBlur = 10;
                mCtx.shadowColor = '#00ffff';
            } else {
                mCtx.fillStyle = t.team === 'radiant' ? '#00ff00' : '#ff0000';
                mCtx.shadowBlur = 0;
            }
            mCtx.fill();
            mCtx.shadowBlur = 0;
        }

        for (let f of game.fountains) {
            if (f.team === player?.team && isKeenMode) {
                const pos = toM(f.x, f.y);
                mCtx.beginPath();
                mCtx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
                mCtx.fillStyle = '#00ffff';
                mCtx.shadowBlur = 10;
                mCtx.shadowColor = '#00ffff';
                mCtx.fill();
                mCtx.shadowBlur = 0;
            }
        }

        if (game.roshanLairs) {
            for (let lair of game.roshanLairs) {
                const pos = toM(lair.x, lair.y);
                mCtx.fillStyle = '#8b6b4f';
                mCtx.beginPath();
                mCtx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
                mCtx.fill();
                mCtx.fillStyle = '#ffd700';
                mCtx.font = '6px Arial';
                mCtx.textAlign = 'center';
                mCtx.fillText('R', pos.x, pos.y + 10);
            }
        }
        if (game.roshan && !game.roshan.isDead) {
            const pos = toM(game.roshan.x, game.roshan.y);
            mCtx.fillStyle = '#ff4444';
            mCtx.beginPath();
            mCtx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
            mCtx.fill();
        }

        for (let a of game.ancients) {
            const pos = toM(a.x, a.y);
            mCtx.fillStyle = a.team === 'radiant' ? '#00cc00' : '#cc0000';
            mCtx.beginPath(); mCtx.arc(pos.x, pos.y, 5, 0, Math.PI*2); mCtx.fill();
        }

        for (let c of game.creeps) {
            if (c.isDead) continue;
            const pos = toM(c.x, c.y);
            if (c instanceof NeutralCreep) {
                mCtx.fillStyle = '#ffaa00';
            } else {
                mCtx.fillStyle = c.team === 'radiant' ? '#7cfc00' : '#8b008b';
            }
            mCtx.beginPath(); mCtx.arc(pos.x, pos.y, 1.5, 0, Math.PI*2); mCtx.fill();
        }

        for (let camp of game.neutralCamps) {
            const pos = toM(camp.x, camp.y);
            mCtx.fillStyle = camp.teamSide === 'radiant' ? '#66ff66' : '#ff6666';
            mCtx.beginPath();
            mCtx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
            mCtx.fill();
        }

        if (game.playerHero && !game.playerHero.isDead) {
            const pos = toM(game.playerHero.x, game.playerHero.y);
            mCtx.fillStyle = '#00ffff';
            mCtx.beginPath(); mCtx.arc(pos.x, pos.y, 4, 0, Math.PI*2); mCtx.fill();
        }
        if (game.enemyHero && !game.enemyHero.isDead) {
            const pos = toM(game.enemyHero.x, game.enemyHero.y);
            mCtx.fillStyle = '#ff00ff';
            mCtx.beginPath(); mCtx.arc(pos.x, pos.y, 4, 0, Math.PI*2); mCtx.fill();
        }

        for (let bot of game.alliedBots) {
            if (!bot.isDead) {
                const pos = toM(bot.x, bot.y);
                mCtx.fillStyle = '#00ddff';
                mCtx.beginPath(); mCtx.arc(pos.x, pos.y, 2, 0, Math.PI*2); mCtx.fill();
            }
        }
        for (let bot of game.enemyBots) {
            if (!bot.isDead) {
                const pos = toM(bot.x, bot.y);
                mCtx.fillStyle = '#ff44aa';
                mCtx.beginPath(); mCtx.arc(pos.x, pos.y, 2, 0, Math.PI*2); mCtx.fill();
            }
        }
        for (let b of game.barracks) {
            if (b.isDead) continue;
            const pos = toM(b.x, b.y);
            mCtx.fillStyle = b.team === 'radiant' ? '#66ff66' : '#ff6666';
            mCtx.beginPath(); mCtx.arc(pos.x, pos.y, 2, 0, Math.PI*2); mCtx.fill();
        }

        if (isTeleportMode) {
            mCtx.fillStyle = 'rgba(0, 255, 255, 0.7)';
            mCtx.font = '8px Arial';
            mCtx.textAlign = 'center';
            mCtx.fillText('Click tower', w/2, h-4);
        }
        if (isKeenMode) {
            mCtx.fillStyle = 'rgba(255, 215, 0, 0.7)';
            mCtx.font = '8px Arial';
            mCtx.textAlign = 'center';
            mCtx.fillText('Click tower/fountain', w/2, h-4);
        }
    }
}

// =========================================================================
//  ОСНОВНОЙ КЛАСС ИГРЫ (Game) — ИСПРАВЛЕННЫЙ
// =========================================================================

class Game {
    constructor() {
        try {
            this.map = new GameMap();
            this.camera = new Camera(this.map);
            this.uiManager = new UIManager();
            this.playerHero = null;
            this.enemyHero = null;
            this.alliedBots = [];
            this.enemyBots = [];
            this.creeps = [];
            this.towers = [];
            this.barracks = [];
            this.ancients = [];
            this.fountains = [];
            this.projectiles = [];
            this.shrapnelZones = [];
            this.effects = [];
            this.matchTime = 0;
            this.creepTimer = 0;
            this.lastTime = performance.now();
            this.globalSpeedMultiplier = 0.75;
            this.glyphCooldown = { radiant: 0, dire: 0 };
            this.glyphMaxCooldown = 120;
            this.glyphActive = { radiant: false, dire: false };
            this.glyphDuration = 8;
            this.glyphTimer = { radiant: 0, dire: 0 };
            this.glyphShieldReduction = 0.4;
            this.waveNumber = 0;
            this.bountyRunes = [
                new BountyRune(525, 3750),
                new BountyRune(5475, 1125)
            ];
            this.goldTimer = 0;
            this._teleportSelectionMode = false;
            this._relocateSelectionMode = false;
            this._keenSelectionMode = false;
            this.neutralCamps = [];
            this.roshan = null;
            this.roshanLairs = [];
            this.aegisItems = [];

            this.initNeutralCamps();
            this.initWorld();
            this.initInput();
            this.initShopItems();
        } catch (err) {
            console.error('Ошибка в конструкторе Game:', err);
            alert('Не удалось загрузить игру. Пожалуйста, обновите страницу.');
            throw err;
        }
    }

    pickHeroForRole(role, usedHeroes) {
        const allHeroes = ['Morphling', 'Warlock', 'Sniper', 'Bristleback', 'Huskar', 'Anti-Mage', 'Broodmother', 'Io', 'Tinker'];
        const supportPool = ['Io', 'Warlock'];
        const midPool = ['Sniper', 'Huskar', 'Broodmother', 'Tinker'];
        const carryPool = ['Anti-Mage', 'Morphling', 'Huskar', 'Bristleback', 'Sniper'];
        const offlanePool = allHeroes.filter(h => !supportPool.includes(h));

        let pool;
        if (role === 4 || role === 5) pool = supportPool;
        else if (role === 2) pool = midPool;
        else if (role === 1) pool = carryPool;
        else if (role === 3) pool = offlanePool;
        else pool = allHeroes;

        const available = pool.filter(h => !usedHeroes.includes(h));
        if (available.length === 0) {
            const anyAvailable = allHeroes.filter(h => !usedHeroes.includes(h));
            return anyAvailable.length > 0 ? anyAvailable[Math.floor(Math.random() * anyAvailable.length)] : allHeroes[0];
        }
        return available[Math.floor(Math.random() * available.length)];
    }

    getLaneForRole(role, team) {
        if (role === 2) return 'mid';
        if (team === 'radiant') {
            return (role === 1 || role === 5) ? 'bottom' : 'top';
        } else { // dire
            return (role === 1 || role === 5) ? 'top' : 'bottom';
        }
    }

    start(role, selectedHeroName) {
        audio.init();
        const allRoles = [1, 2, 3, 4, 5];
        const playerRole = role;
        const remainingRoles = allRoles.filter(r => r !== playerRole);

        const radiantStart = this.map.radiantBase;
        this.playerHero = this.createHero(selectedHeroName, radiantStart.x, radiantStart.y, 'radiant', playerRole);
        this.playerHero.role = playerRole;

        const usedHeroes = [selectedHeroName];
        for (let r of remainingRoles) {
            const heroName = this.pickHeroForRole(r, usedHeroes);
            usedHeroes.push(heroName);
            const lane = this.getLaneForRole(r, 'radiant');
            const startX = radiantStart.x + (r * 30) - 60;
            const startY = radiantStart.y - (r * 20) - 40;
            const hero = this.createHero(heroName, startX, startY, 'radiant', r);
            hero.role = r;
            hero.ai = new BotAI(hero, lane, this);
            this.alliedBots.push(hero);
        }

        const enemyRole = allRoles[Math.floor(Math.random() * allRoles.length)];
        const direStart = this.map.direBase;
        const enemyHeroName = this.pickHeroForRole(enemyRole, []);
        this.enemyHero = this.createHero(enemyHeroName, direStart.x, direStart.y, 'dire', enemyRole);
        this.enemyHero.role = enemyRole;
        const enemyUsedHeroes = [enemyHeroName];
        const enemyRemainingRoles = allRoles.filter(r => r !== enemyRole);
        for (let r of enemyRemainingRoles) {
            const heroName = this.pickHeroForRole(r, enemyUsedHeroes);
            enemyUsedHeroes.push(heroName);
            const lane = this.getLaneForRole(r, 'dire');
            const startX = direStart.x - (r * 30) + 60;
            const startY = direStart.y + (r * 20) + 40;
            const hero = this.createHero(heroName, startX, startY, 'dire', r);
            hero.role = r;
            hero.ai = new BotAI(hero, lane, this);
            this.enemyBots.push(hero);
        }

        const enemyLane = this.getLaneForRole(enemyRole, 'dire');
        this.enemyHero.ai = new BotAI(this.enemyHero, enemyLane, this);

        document.getElementById('role-selection').classList.add('hidden');
        document.getElementById('hero-selection').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');

        canvas.style.pointerEvents = 'auto';

        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    initNeutralCamps() {
        const campsData = [
            { x: 1200, y: 3800, type: 'weak', side: 'radiant' },
            { x: 1200, y: 1800, type: 'weak', side: 'radiant' },
            { x: 800, y: 2800, type: 'strong', side: 'radiant' },
            { x: 2500, y: 4200, type: 'strong', side: 'radiant' },
            { x: 4800, y: 1800, type: 'weak', side: 'dire' },
            { x: 4800, y: 3800, type: 'weak', side: 'dire' },
            { x: 5200, y: 2800, type: 'strong', side: 'dire' },
            { x: 3500, y: 800, type: 'strong', side: 'dire' }
        ];
        for (let data of campsData) {
            const camp = new NeutralCamp(data.x, data.y, data.type, data.side);
            this.neutralCamps.push(camp);
        }
    }

    initShopItems() {
        const shopList = document.querySelector('.shop-items-list');
        if (!shopList) return;
        if (shopList.querySelector('[data-item="butterfly"]')) return;

        const items = [
            {
                id: 'bracer',
                title: 'Bracer',
                price: 200,
                stats: ['+6 Damage', '+3 Strength'],
                icon: 'images/bracer.webp',
                desc: 'Simple early game item.'
            },
            {
                id: 'wraithband',
                title: 'Wraith Band',
                price: 200,
                stats: ['+6 Damage', '+3 Agility'],
                icon: 'images/wraith_band.webp',
                desc: 'Simple early game item.'
            },
            {
                id: 'nulltalisman',
                title: 'Null Talisman',
                price: 200,
                stats: ['+6 Damage', '+3 Intelligence'],
                icon: 'images/null_talisman.webp',
                desc: 'Simple early game item.'
            },
            {
                id: 'falconblade',
                title: 'Falcon Blade',
                price: 475,
                icon: 'images/falcon_blade.webp',
                stats: ['+14 Damage', '+200 Health', '+1.8 Mana regen'],
            },
            {
                id: 'boots',
                title: 'Boots of Speed',
                price: 500,
                stats: ['+30 Movement Speed'],
                icon: 'images/Boots_of_speed_icon.webp',
                desc: 'Basic movement boots.'
            },
            {
                id: 'sword',
                title: 'Crystalys',
                price: 1500,
                stats: ['+32 Damage', '+30% Crit Chance', '+60% Crit Multiplier'],
                icon: 'images/Crystalys_icon.webp',
                desc: 'High burst damage.'
            },
            {
                id: 'vitality',
                title: 'Vitality Booster',
                price: 1000,
                stats: ['+250 Health'],
                icon: 'images/Vitality_booster_icon.webp',
                desc: 'Simple survivability item.'
            },
            {
                id: 'ringhealth',
                title: 'Ring of Health',
                price: 400,
                stats: ['+4.5 HP Regen'],
                icon: 'images/ring_of_health.webp',
                desc: 'Great sustain.'
            },
            {
                id: 'vladmir',
                title: 'Vladmir\'s Offering',
                price: 1500,
                stats: ['+0.75 Mana Regen', '+1 Armor'],
                icon: 'images/vladmirs_offering.webp',
                desc: 'Team sustain and armor.'
            },
            {
                id: 'linkens',
                title: 'Linken\'s Sphere',
                price: 1500,
                stats: ['+200 Health', '+200 Mana', '+15 Damage', '+5 Mana Regen'],
                icon: 'images/sphere.png',
                desc: 'Defensive spell block.'
            },
            {
                id: 'butterfly',
                title: 'Butterfly',
                price: 2500,
                stats: ['+35 Agility', '+35% Evasion', '+25 Damage'],
                icon: 'images/butterfly.webp',
                desc: 'Deadly agility carry item.'
            },
            {
                id: 'ringtarrasque',
                title: 'Ring of Tarrasque',
                price: 1700,
                stats: ['+12 HP Regen'],
                icon: 'images/ring_of_tarrasque.webp',
                desc: 'Tanky sustain item.'
            },
            {
                id: 'reaver',
                title: 'Reaver',
                price: 2500,
                stats: ['+25 Health'],
                icon: 'images/reaver.webp',
                desc: 'Reliable health scaling.'
            },
            {
                id: 'radiance',
                title: 'Radiance',
                price: 1500,
                stats: ['+20 Damage', 'Burns nearby enemies'],
                icon: 'images/radiance.webp',
                desc: 'Strong teamfight damage item.'
            },
            {
                id: 'dragonlance',
                title: 'Dragon Lance',
                price: 1500,
                stats: ['+20 Damage', '+70 Attack Range'],
                icon: '',
                desc: 'На ренджей брать!!!'
            }
        ];

        items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'shop-item';
            el.setAttribute('data-item', item.id);

            const iconWrap = document.createElement('div');
            iconWrap.className = 'shop-item-icon-wrap';

            if (item.icon) {
                const img = document.createElement('img');
                img.className = 'shop-item-icon';
                img.src = item.icon;
                img.alt = item.title;
                img.onerror = () => {
                    iconWrap.innerHTML = `<div class="shop-item-icon-fallback">${item.emoji}</div>`;
                };
                iconWrap.appendChild(img);
            } else {
                iconWrap.innerHTML = `<div class="shop-item-icon-fallback">${item.emoji}</div>`;
            }

            const info = document.createElement('div');
            info.className = 'shop-item-info';
            info.innerHTML = `
                <h3>${item.title}</h3>
                <p>Price: ${item.price} 🪙</p>
                ${item.stats.map(stat => `<p>${stat}</p>`).join('')}
                <p>${item.desc}</p>
            `;

            el.appendChild(iconWrap);
            el.appendChild(info);
            el.addEventListener('click', () => this.buyItem(item.id));
            shopList.appendChild(el);
        });
    }

    getAllHeroes() {
        const heroes = [];
        if (this.playerHero && !this.playerHero.isDead) heroes.push(this.playerHero);
        for (let bot of this.alliedBots) {
            if (!bot.isDead) heroes.push(bot);
        }
        if (this.enemyHero && !this.enemyHero.isDead) heroes.push(this.enemyHero);
        for (let bot of this.enemyBots) {
            if (!bot.isDead) heroes.push(bot);
        }
        return heroes;
    }

    initWorld() {
        this.ancients.push(new Ancient(this.map.radiantBase.x, this.map.radiantBase.y, 'radiant'));
        this.ancients.push(new Ancient(this.map.direBase.x, this.map.direBase.y, 'dire'));
        this.fountains.push(new Fountain(this.map.radiantBase.x - 100, this.map.radiantBase.y + 100, 'radiant'));
        this.fountains.push(new Fountain(this.map.direBase.x + 100, this.map.direBase.y - 100, 'dire'));

        const laneData = {
            top: {
                towers: {
                    radiant: [{x: 375, y: 3300}, {x: 375, y: 2100}, {x: 375, y: 1050}],
                    dire:    [{x: 1125, y: 750}, {x: 2625, y: 750}, {x: 4125, y: 750}]
                },
                barracks: {
                    radiant: {x: 375, y: 675},
                    dire:    {x: 4875, y: 750}
                }
            },
            mid: {
                towers: {
                    radiant: [{x: 2737.5, y: 2606.25}, {x: 1950, y: 3112.5}, {x: 1162.5, y: 3618.75}],
                    dire:    [{x: 3262.5, y: 2268.75}, {x: 4050, y: 1762.5}, {x: 4837.5, y: 1256.25}]
                },
                barracks: {
                    radiant: {x: 637.5, y: 3956.25},
                    dire:    {x: 5362.5, y: 918.75}
                }
            },
            bottom: {
                towers: {
                    radiant: [{x: 2100, y: 4125}, {x: 4256.25, y: 4125}, {x: 5625, y: 3337.5}],
                    dire:    [{x: 5625, y: 2625}, {x: 5625, y: 1875}, {x: 5625, y: 1125}]
                },
                barracks: {
                    radiant: {x: 1125, y: 4125},
                    dire:    {x: 5625, y: 937.5}
                }
            }
        };

        const lanes = ['top', 'mid', 'bottom'];
        for (let lane of lanes) {
            const data = laneData[lane];
            for (let i = 0; i < 3; i++) {
                const pos = data.towers.radiant[i];
                const tier = (lane === 'bottom') ? 3 - i : i + 1;
                const tower = new Tower(pos.x, pos.y, 'radiant', tier);
                tower.lane = lane;
                this.towers.push(tower);
            }
            for (let i = 0; i < 3; i++) {
                const pos = data.towers.dire[i];
                const tier = (lane === 'bottom') ? 3 - i : i + 1;
                const tower = new Tower(pos.x, pos.y, 'dire', tier);
                tower.lane = lane;
                this.towers.push(tower);
            }
            const bPosR = data.barracks.radiant;
            this.barracks.push(new Barracks(bPosR.x, bPosR.y - 20, 'radiant', 'melee', lane));
            this.barracks.push(new Barracks(bPosR.x, bPosR.y + 20, 'radiant', 'ranged', lane));
            const bPosD = data.barracks.dire;
            this.barracks.push(new Barracks(bPosD.x, bPosD.y - 20, 'dire', 'melee', lane));
            this.barracks.push(new Barracks(bPosD.x, bPosD.y + 20, 'dire', 'ranged', lane));
        }

        const lairTop = new RoshanLair(1200, 450, 'top');
        const lairBottom = new RoshanLair(4800, 4050, 'bottom');
        this.roshanLairs = [lairTop, lairBottom];
        
        this.roshan = new Roshan(lairTop.x, lairTop.y, lairTop, this);
        this.creeps.push(this.roshan);
    }

    createHero(name, x, y, team, role) {
        let hero;
        if (name === 'Morphling') hero = new Morphling(x, y, team);
        else if (name === 'Warlock') hero = new Warlock(x, y, team);
        else if (name === 'Sniper') hero = new Sniper(x, y, team);
        else if (name === 'Bristleback') hero = new Bristleback(x, y, team);
        else if (name === 'Huskar') hero = new Huskar(x, y, team);
        else if (name === 'Anti-Mage') hero = new AntiMage(x, y, team);
        else if (name === 'Broodmother') hero = new Broodmother(x, y, team);
        else if (name === 'Io') hero = new Io(x, y, team);
        else if (name === 'Tinker') hero = new Tinker(x, y, team);
        else hero = new Sniper(x, y, team);
        hero.role = role;
        return hero;
    }

    radiantEntities() {
        const result = [];
        if (this.playerHero && !this.playerHero.isDead) result.push(this.playerHero);
        for (let bot of this.alliedBots) if (!bot.isDead) result.push(bot);
        for (let c of this.creeps) if (!c.isDead && c.team === 'radiant') result.push(c);
        for (let t of this.towers) if (!t.isDead && t.team === 'radiant') result.push(t);
        for (let a of this.ancients) if (!a.isDead && a.team === 'radiant') result.push(a);
        return result;
    }

    direEntities() {
        const result = [];
        if (this.enemyHero && !this.enemyHero.isDead) result.push(this.enemyHero);
        for (let bot of this.enemyBots) if (!bot.isDead) result.push(bot);
        for (let c of this.creeps) if (!c.isDead && c.team === 'dire') result.push(c);
        for (let t of this.towers) if (!t.isDead && t.team === 'dire') result.push(t);
        for (let a of this.ancients) if (!a.isDead && a.team === 'dire') result.push(a);
        return result;
    }

    spawnWave() {
        this.waveNumber++;
        const lanes = ['top', 'mid', 'bottom'];
        for (let lane of lanes) {
            const radiantWp = this.map.waypoints[lane][0];
            const direWp = this.map.waypointsReverse[lane][0];
            for (let i = 0; i < 3; i++) {
                const offsetX = i * 20 - 20;
                const offsetY = i * 15 - 15;
                this.creeps.push(new Creep(radiantWp.x + offsetX, radiantWp.y + offsetY, 'radiant', 'melee', lane));
                this.creeps.push(new Creep(direWp.x + offsetX, direWp.y + offsetY, 'dire', 'melee', lane));
            }
            this.creeps.push(new Creep(radiantWp.x - 30, radiantWp.y - 20, 'radiant', 'ranged', lane));
            this.creeps.push(new Creep(direWp.x + 30, direWp.y + 20, 'dire', 'ranged', lane));
            if (this.waveNumber % 3 === 0) {
                this.creeps.push(new Catapult(radiantWp.x - 50, radiantWp.y - 30, 'radiant', lane));
                this.creeps.push(new Catapult(direWp.x + 50, direWp.y + 30, 'dire', lane));
            }
        }
    }

    initInput() {
        canvas.addEventListener('mousedown', (e) => {
            if (e.button !== 2) return;
            e.preventDefault();
            audio.init();

            const rect = canvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
            const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

            const wx = mouseX + this.camera.x;
            const wy = mouseY + this.camera.y;

            if (this.bountyRunes) {
                for (let rune of this.bountyRunes) {
                    if (rune.isClicked(wx, wy)) {
                        const distToRune = Math.hypot(this.playerHero.x - rune.x, this.playerHero.y - rune.y);
                        if (distToRune <= 100) {
                            rune.pickup(this.playerHero);
                        } else {
                            this.playerHero.setMoveTarget(rune.x, rune.y);
                        }
                        return;
                    }
                }
            }

            let player = this.playerHero;
            let enemyTeam = player.team === 'radiant' ? 'dire' : 'radiant';

            let possibleTargets = [];
            if (this.enemyHero && !this.enemyHero.isDead && this.enemyHero.isAttackable()) possibleTargets.push(this.enemyHero);
            for (let bot of this.enemyBots) {
                if (!bot.isDead && bot.isAttackable()) possibleTargets.push(bot);
            }
            for (let c of this.creeps) {
                if (c.team === enemyTeam && !c.isDead && c.isAttackable()) possibleTargets.push(c);
            }
            for (let c of this.creeps) {
                if (c.team === 'neutral' && !c.isDead && c.isAttackable()) {
                    possibleTargets.push(c);
                }
            }
            for (let t of this.towers) {
                if (t.team === enemyTeam && !t.isDead && t.isAttackable()) possibleTargets.push(t);
            }
            for (let b of this.barracks) {
                if (b.team === enemyTeam && !b.isDead && b.isAttackable()) possibleTargets.push(b);
            }
            for (let a of this.ancients) {
                if (a.team === enemyTeam && !a.isDead && a.isAttackable()) possibleTargets.push(a);
            }

            let clickedEnemy = null;
            let minDist = Infinity;
            for (let ent of possibleTargets) {
                const d = Math.hypot(ent.x - wx, ent.y - wy);
                if (d < ent.radius + 20 && d < minDist) {
                    minDist = d;
                    clickedEnemy = ent;
                }
            }

            if (clickedEnemy) {
                this.playerHero.attackTarget = clickedEnemy;
            } else {
                this.playerHero.attackTarget = null;
                this.playerHero.moveTo(wx, wy);
                this.uiManager.addFloatingText(wx, wy, "➔", '#00ff00');
            }
        });

        const minimapCanvas = document.getElementById('minimapCanvas');
        if (minimapCanvas) {
            minimapCanvas.addEventListener('click', (e) => {
                const player = this.playerHero;
                if (player instanceof Io && player.isRelocateSelectMode) {
                    const rect = minimapCanvas.getBoundingClientRect();
                    const scaleX = minimapCanvas.width / rect.width;
                    const scaleY = minimapCanvas.height / rect.height;
                    const mx = (e.clientX - rect.left) * scaleX;
                    const my = (e.clientY - rect.top) * scaleY;
                    if (mx < 0 || mx > minimapCanvas.width || my < 0 || my > minimapCanvas.height) return;

                    const map = this.map;
                    const gx = (mx / minimapCanvas.width) * map.width;
                    const gy = (my / minimapCanvas.height) * map.height;
                    player.startRelocate(gx, gy);
                    player.isRelocateSelectMode = false;
                    this._relocateSelectionMode = false;
                    e.preventDefault();
                    return;
                }

                if (player instanceof Tinker && player.selectKeenTarget) {
                    const rect = minimapCanvas.getBoundingClientRect();
                    const scaleX = minimapCanvas.width / rect.width;
                    const scaleY = minimapCanvas.height / rect.height;
                    const mx = (e.clientX - rect.left) * scaleX;
                    const my = (e.clientY - rect.top) * scaleY;
                    if (mx < 0 || mx > minimapCanvas.width || my < 0 || my > minimapCanvas.height) return;
                    const map = this.map;
                    const gx = (mx / minimapCanvas.width) * map.width;
                    const gy = (my / minimapCanvas.height) * map.height;
                    const clickRadiusPx = 15;
                    let target = null;
                    let minDist = Infinity;
                    for (let t of this.towers) {
                        if (t.team === player.team && !t.isDead) {
                            const tx = (t.x / map.width) * minimapCanvas.width;
                            const ty = (t.y / map.height) * minimapCanvas.height;
                            const d = Math.hypot(mx - tx, my - ty);
                            if (d < minDist && d <= clickRadiusPx) {
                                minDist = d;
                                target = t;
                            }
                        }
                    }
                    for (let f of this.fountains) {
                        if (f.team === player.team) {
                            const tx = (f.x / map.width) * minimapCanvas.width;
                            const ty = (f.y / map.height) * minimapCanvas.height;
                            const d = Math.hypot(mx - tx, my - ty);
                            if (d < minDist && d <= clickRadiusPx) {
                                minDist = d;
                                target = f;
                            }
                        }
                    }
                    if (target) {
                        player.startKeenTeleport(target);
                        player.selectKeenTarget = false;
                        this._keenSelectionMode = false;
                        e.stopPropagation();
                        e.preventDefault();
                    }
                    return;
                }

                if (!this._teleportSelectionMode || !this.playerHero || this.playerHero.isDead || this.playerHero.teleportCharges <= 0 || this.playerHero.isChannelingTeleport) {
                    return;
                }
                const rect = minimapCanvas.getBoundingClientRect();
                const scaleX = minimapCanvas.width / rect.width;
                const scaleY = minimapCanvas.height / rect.height;
                const mx = (e.clientX - rect.left) * scaleX;
                const my = (e.clientY - rect.top) * scaleY;
                if (mx < 0 || mx > minimapCanvas.width || my < 0 || my > minimapCanvas.height) return;

                const map = this.map;
                const gx = (mx / minimapCanvas.width) * map.width;
                const gy = (my / minimapCanvas.height) * map.height;
                const clickRadiusPx = 15;
                let closestTower = null;
                let minDist = Infinity;
                for (let t of this.towers) {
                    if (t.team === this.playerHero.team && !t.isDead) {
                        const tx = (t.x / map.width) * minimapCanvas.width;
                        const ty = (t.y / map.height) * minimapCanvas.height;
                        const d = Math.hypot(mx - tx, my - ty);
                        if (d < minDist && d <= clickRadiusPx) {
                            minDist = d;
                            closestTower = t;
                        }
                    }
                }
                if (closestTower) {
                    this.playerHero.startTeleport(closestTower);
                    this._teleportSelectionMode = false;
                    e.stopPropagation();
                    e.preventDefault();
                }
            });
        }

        window.addEventListener('keydown', (e) => {
            const k = e.key.toLowerCase();
            if (!this.playerHero || this.playerHero.isDead) return;
            if (k === 'q' || k === 'й') this.playerHero.useAbility(0);
            if (k === 'w' || k === 'ц') this.playerHero.useAbility(1);
            if (k === 'e' || k === 'у') this.playerHero.useAbility(2);
            if (k === 'r' || k === 'к') {
                if (this.playerHero instanceof Tinker) {
                    this.playerHero.useAbility(4);
                } else {
                    this.playerHero.useAbility(3);
                }
            }
            if (k === 'd' || k === 'в') {
                if (this.playerHero instanceof Tinker) {
                    this.playerHero.useAbility(3);
                }
            }
            if (k === 'p' || k === 'з') this.toggleShop();
            if (k === 'g' || k === 'п') this.activateGlyph();
            if (k === 't' || k === 'е') {
                if (this.playerHero && !this.playerHero.isDead && this.playerHero.teleportCharges > 0 && !this.playerHero.isChannelingTeleport) {
                    this._teleportSelectionMode = !this._teleportSelectionMode;
                    if (this._teleportSelectionMode) {
                        this.uiManager.addFloatingText(this.playerHero.x, this.playerHero.y - 50, '📡 Select tower on minimap', '#7dd3fc');
                    } else {
                        this.uiManager.addFloatingText(this.playerHero.x, this.playerHero.y - 50, '❌ Teleport cancelled', '#ff6666');
                    }
                } else if (this.playerHero && this.playerHero.isChannelingTeleport) {
                    this.playerHero.cancelTeleport('new');
                    this._teleportSelectionMode = false;
                }
            }
        });

        const openShopBtn = document.getElementById('open-shop-btn');
        if (openShopBtn) openShopBtn.addEventListener('click', () => this.toggleShop());
        const glyphBtn = document.getElementById('glyph-btn');
        if (glyphBtn) glyphBtn.addEventListener('click', () => this.activateGlyph());
        const closeShopBtn = document.getElementById('close-shop-btn');
        if (closeShopBtn) closeShopBtn.addEventListener('click', () => this.toggleShop());
        document.querySelectorAll('.shop-item').forEach(el => {
            el.addEventListener('click', () => this.buyItem(el.getAttribute('data-item')));
        });
        const ability1Button = document.getElementById('ability-1');
        if (ability1Button) {
            ability1Button.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (this.playerHero && this.playerHero.name === 'Huskar') {
                    this.playerHero.useAbility(1);
                }
            });
        }

        for (let i = 0; i < 5; i++) {
            const slot = document.getElementById(`ability-${i}`);
            if (slot) {
                slot.addEventListener('click', () => {
                    if (this.playerHero && !this.playerHero.isDead) {
                        this.playerHero.useAbility(i);
                    }
                });
            }
        }
    }

    toggleShop() { document.getElementById('shop-modal').classList.toggle('hidden'); }

    activateGlyph() { this.activateGlyphForTeam(this.playerHero?.team); }

    activateGlyphForTeam(team) {
        if (!team || this.glyphCooldown[team] > 0 || this.glyphActive[team]) return false;
        this.glyphActive[team] = true;
        this.glyphTimer[team] = this.glyphDuration;
        this.glyphCooldown[team] = this.glyphMaxCooldown;
        for (let tower of this.towers) {
            if (tower.team === team && !tower.isDead) {
                tower.glyphActive = true;
                tower.glyphTimer = this.glyphDuration;
            }
        }
        audio.play('ability');
        let heroForText = team === this.playerHero?.team ? this.playerHero : this.enemyHero;
        if (heroForText && !heroForText.isDead) {
            this.uiManager.addFloatingText(heroForText.x, heroForText.y - 40, 'Glyph activated', '#7dd3fc');
        }
        return true;
    }

    buyItem(type) {
        let p = this.playerHero; let it = null;
        if (type === 'boots') it = new Item('boots', 'Boots of Speed', 500, { speedBonus: 30 });
        if (type === 'sword') it = new Item('sword', 'Crystalys', 1500, { damageBonus: 32, critChance: 0.3, critMultiplier: 1.6 });
        if (type === 'vitality') it = new Item('vitality', 'Vitality Booster', 1000, { hp: 250 });
        if (type === 'ringhealth') it = new Item('ringhealth', 'Ring of Health', 400, { hpRegen: 4.5 });
        if (type === 'vladmir') it = new Item('vladmir', "Vladmir's Offering", 1500, { manaRegen: 0.75, armorBonus: 1 });
        if (type === 'linkens') it = new Item('linkens', "Linken's Sphere", 1500, { hp: 200, mana: 200, damage: 15, manaRegen: 5 });
        if (type === 'ringtarrasque') it = new Item('ringtarrasque', 'Ring of Tarrasque', 1700, { hpRegen: 12 });
        if (type === 'reaver') it = new Item('reaver', 'Reaver', 2500, { hp: 25 });
        if (type === 'radiance') it = new Item('radiance', 'Radiance', 1500, { damageBonus: 20 });
        if (type === 'butterfly') it = new Item('butterfly', 'Butterfly', 2500, { agility: 35, evasion: 0.35, damage: 25 });
        if (type === 'bracer') it = new Item('bracer', 'Bracer', 200, { hp: 100, damage: 6, hpRegen: 0.75 });
        if (type === 'wraithband') it = new Item('wraithband', 'Wraith Band', 200, { agility: 6, damage: 6 });
        if (type === 'nulltalisman') it = new Item('nulltalisman', 'Null Talisman', 200, { intelligence: 6, manaRegen: 0.5, damage: 6 });
        if (type === 'dragonlance') it = new Item('dragonlance', 'Dragon Lance', 1500, { rangeBonus: 70, damage: 20 });
        if (type === 'falconblade') it = new Item('falconblade', 'Falcon Blade', 475, { damage: 14, hp: 200, manaRegen: 1.8 });
        if (it && p.gold >= it.cost && p.inventory.addItem(it)) {
            p.gold -= it.cost; audio.play('buy');
            if (it.id === 'vladmir') { p.hasVladmir = true; }
            if (it.id === 'linkens') { p.hasLinkens = true; p.linkensCooldown = 0; }
        }
    }

    loop(time) {
        let dt = (time - this.lastTime) / 1000;
        this.lastTime = time;
        if (dt > 0.1) dt = 0.1;
        this.update(dt);
        this.render();
        requestAnimationFrame((t) => this.loop(t));
    }

    // ========== ИСПРАВЛЕННЫЙ МЕТОД update ==========
    update(dt) {
        this.matchTime += dt;
        this.creepTimer += dt;
        for (let team of ['radiant', 'dire']) {
            if (this.glyphCooldown[team] > 0) {
                this.glyphCooldown[team] = Math.max(0, this.glyphCooldown[team] - dt);
            }
            if (this.glyphActive[team]) {
                this.glyphTimer[team] -= dt;
                if (this.glyphTimer[team] <= 0) {
                    this.glyphActive[team] = false;
                    this.glyphTimer[team] = 0;
                }
            }
        }
        if (this.creepTimer >= 30 || this.matchTime === dt) { this.spawnWave(); this.creepTimer = 0; }

        this.goldTimer += dt;
        if (this.goldTimer >= 1.0) {
            this.goldTimer -= 1.0;
            if (this.playerHero && !this.playerHero.isDead) {
                this.playerHero.gold += 1;
            }
        }

        if (this.roshan) {
            if (this.roshan.isDead) {
                this.roshan.updateDead(dt);
            } else {
                this.roshan.update(dt);
            }
        }

        // Подбор Аегиса работает всегда, независимо от того, жив Рошан или уже убит
        if (this.aegisItems && this.aegisItems.length > 0) {
            if (this.playerHero && !this.playerHero.isDead) {
                for (let i = this.aegisItems.length - 1; i >= 0; i--) {
                    if (this.aegisItems[i].pickUp(this.playerHero)) {
                        this.aegisItems.splice(i, 1);
                    }
                }
            }
            for (let bot of [...this.alliedBots, ...this.enemyBots]) {
                if (bot && !bot.isDead) {
                    for (let i = this.aegisItems.length - 1; i >= 0; i--) {
                        if (this.aegisItems[i].pickUp(bot)) {
                            this.aegisItems.splice(i, 1);
                        }
                    }
                }
            }
        }

        // Воскрешение по Аегису теперь обрабатывается мгновенно внутри Hero.onDeath(),
        // поэтому здесь никаких дополнительных проверок isDead+hasAegis не нужно
        this.playerHero.update(dt);

        this.enemyHero.update(dt);
        if (this.enemyHero.ai) this.enemyHero.ai.update(dt);

        for (let bot of this.alliedBots) {
            bot.update(dt);
            if (bot.ai) bot.ai.update(dt);
        }
        for (let bot of this.enemyBots) {
            bot.update(dt);
            if (bot.ai) bot.ai.update(dt);
        }

        for (let i = this.creeps.length - 1; i >= 0; i--) {
            if (this.creeps[i].isDead) {
                if (this.creeps[i] !== this.roshan) {
                    this.creeps.splice(i, 1);
                }
            } else {
                this.creeps[i].update(dt);
            }
        }

        for (let camp of this.neutralCamps) {
            camp.update(dt);
        }

        for (let t of this.towers) t.update(dt);
        for (let b of this.barracks) b.update(dt);
        if (this.bountyRunes) {
            for (let rune of this.bountyRunes) rune.update(dt);
        }
        for (let f of this.fountains) f.update(dt);
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            if (this.projectiles[i].update(dt)) this.projectiles.splice(i, 1);
        }
        for (let i = this.shrapnelZones.length - 1; i >= 0; i--) {
            if (this.shrapnelZones[i].update(dt)) this.shrapnelZones.splice(i, 1);
        }
        for (let i = this.effects.length - 1; i >= 0; i--) {
            this.effects[i].life -= dt;
            if (this.effects[i].life <= 0) this.effects.splice(i, 1);
        }

        this.camera.update(this.playerHero.x, this.playerHero.y);
        this.uiManager.update(dt);
    }

    render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.map.draw(ctx, this.camera);

        if (this.roshanLairs) {
            for (let lair of this.roshanLairs) {
                lair.draw(ctx, this.camera);
            }
        }

        for (let zone of this.shrapnelZones) zone.draw(ctx, this.camera);
        for (let f of this.fountains) f.draw(ctx, this.camera);
        for (let t of this.towers) t.draw(ctx, this.camera);
        for (let b of this.barracks) b.draw(ctx, this.camera);
        if (this.bountyRunes) {
            for (let rune of this.bountyRunes) rune.draw(ctx, this.camera);
        }
        for (let a of this.ancients) a.draw(ctx, this.camera);
        for (let camp of this.neutralCamps) {
            camp.draw(ctx, this.camera);
        }

        for (let aegis of this.aegisItems) {
            aegis.draw(ctx, this.camera);
        }

        for (let c of this.creeps) {
            if (c === this.roshan) continue;
            c.draw(ctx, this.camera);
        }
        if (this.roshan) {
            this.roshan.draw(ctx, this.camera);
        }

        this.playerHero.draw(ctx, this.camera);
        this.enemyHero.draw(ctx, this.camera);
        for (let bot of this.alliedBots) bot.draw(ctx, this.camera);
        for (let bot of this.enemyBots) bot.draw(ctx, this.camera);

        for (let p of this.projectiles) p.draw(ctx, this.camera);
        for (let e of this.effects) {
            // обработка эффектов (оставлена как в вашем коде)
        }
        this.uiManager.draw(ctx, this.camera);
    }

    endGame(wonTeam) {
        document.getElementById('game-screen').classList.add('hidden');
        let scr = document.getElementById('end-screen');
        let title = document.getElementById('end-title');
        scr.classList.remove('hidden');
        if (wonTeam === this.playerHero.team) {
            title.innerText = "ПОБЕДА";
            title.style.color = "#00ff00";
            audio.play('victory');
        } else {
            title.innerText = "ПОРАЖЕНИЕ";
            title.style.color = "#ff0000";
            audio.play('defeat');
        }
    }
}

// =========================================================================
//  ИНИЦИАЛИЗАЦИЯ ИГРЫ И ВЫБОР ГЕРОЯ
// =========================================================================

let game = null;
let selectedRole = 0;

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded and parsed');

    try {
        game = new Game();
        console.log('Game instance created');
    } catch (err) {
        console.error('Failed to create Game:', err);
        alert('Ошибка при создании игры. Пожалуйста, обновите страницу.');
        return;
    }

    const roleBtns = document.querySelectorAll('.role-btn');
    console.log('Найдено кнопок ролей:', roleBtns.length);

    if (roleBtns.length === 0) {
        console.error('Кнопки ролей не найдены! Проверьте селектор .role-btn в HTML.');
        return;
    }

    roleBtns.forEach((btn) => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const role = parseInt(this.dataset.role);
            console.log('ROLE CLICK:', role);

            if (isNaN(role)) {
                console.warn('Не удалось получить роль из data-role');
                return;
            }

            selectedRole = role;
            console.log('Выбрана роль:', selectedRole);

            const roleScreen = document.getElementById('role-selection');
            const heroScreen = document.getElementById('hero-selection');

            if (!roleScreen || !heroScreen) {
                console.error("Экраны не найдены");
                return;
            }

            roleScreen.style.display = "none";
            heroScreen.style.display = "flex";
            roleScreen.classList.add("hidden");
            heroScreen.classList.remove("hidden");
        });
    });

    const heroCards = document.querySelectorAll('.hero-card');
    console.log('Найдено карточек героев:', heroCards.length);

    heroCards.forEach(card => {
        card.addEventListener('click', function() {
            const heroName = this.getAttribute('data-hero');
            console.log('Выбран герой:', heroName);

            if (!heroName) {
                console.warn('Не удалось получить имя героя');
                return;
            }

            if (selectedRole === 0) {
                alert('Please select a position first!');
                return;
            }

            if (!game || typeof game.start !== 'function') {
                console.error('Game не инициализирован или метод start отсутствует');
                alert('Игра не готова. Пожалуйста, обновите страницу.');
                return;
            }

            try {
                game.start(selectedRole, heroName);
                console.log('Игра запущена с героем:', heroName);
            } catch (err) {
                console.error('Ошибка при запуске игры:', err);
                alert('Ошибка при запуске игры: ' + err.message);
            }
        });
    });
});