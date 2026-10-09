// Base dos Chefões do Jogo
const BOSSES = [
  { stage: 1, name: "Monstro da Procrastinação", maxHp: 100, emoji: "👹", desc: "O primeiro obstáculo na sua jornada pelo foco!" },
  { stage: 2, name: "Golem da Distração", maxHp: 200, emoji: "🗿", desc: "Tenta roubar sua atenção a todo segundo." },
  { stage: 3, name: "Dragão do Cansaço", maxHp: 350, emoji: "🐉", desc: "Fogo nas pendências para superá-lo!" },
  { stage: 4, name: "Sombra da Dúvida", maxHp: 500, emoji: "👤", desc: "Confie na sua constância para vencê-lo." },
  { stage: 5, name: "Imperador do Caos", maxHp: 800, emoji: "👑", desc: "O grande vilão da organização pessoal!" }
];

// Gerador Automatizado de 100 Medalhas com Frases Secretas
function generate100Achievements() {
  const achs = [];
  
  // Categorias: tasks (1..50), streak (51..70), boss (71..85), level (86..100)
  for (let i = 1; i <= 50; i++) {
    achs.push({
      id: `a_${i}`,
      category: 'tasks',
      title: `Mestre das Quests ${i}`,
      desc: `Conclua ${i * 2} tarefas no total.`,
      target: i * 2,
      icon: i % 2 === 0 ? '🎯' : '⚔️',
      phrase: `Frase Secreta #${i}: "O sucesso é a soma de pequenos esforços repetidos dia após dia."`
    });
  }

  for (let i = 51; i <= 70; i++) {
    const dayReq = i - 50;
    achs.push({
      id: `a_${i}`,
      category: 'streak',
      title: `Guardião da Chama ${dayReq}d`,
      desc: `Alcance ${dayReq} dias de sequência seguidos.`,
      target: dayReq,
      icon: '🔥',
      phrase: `Frase Secreta #${i}: "A constância vence o talento quando o talento não é constante."`
    });
  }

  for (let i = 71; i <= 85; i++) {
    const bossReq = i - 70;
    achs.push({
      id: `a_${i}`,
      category: 'boss',
      title: `Caçador de Chefões ${bossReq}`,
      desc: `Derrote ${bossReq} chefões na arena.`,
      target: bossReq,
      icon: '🏆',
      phrase: `Frase Secreta #${i}: "Sua força aumenta na exata medida dos obstáculos que você supera."`
    });
  }

  for (let i = 86; i <= 100; i++) {
    const lvlReq = i - 85;
    achs.push({
      id: `a_${i}`,
      category: 'level',
      title: `Sábio do Foco Nv.${lvlReq}`,
      desc: `Alcance o Nível ${lvlReq} de jogador.`,
      target: lvlReq,
      icon: '⭐',
      phrase: `Frase Secreta #${i}: "Sua única competição real é contra quem você foi ontem."`
    });
  }

  return achs;
}

const ACHIEVEMENTS_DATA = generate100Achievements();

// Estado do Jogador
const DEFAULT_PLAYER = {
  xp: 0,
  level: 1,
  streak: 0,
  lastCompletedDate: null,
  totalTasksCompleted: 0,
  bossStage: 1,
  bossCurrentHp: 100,
  bossesDefeated: 0,
  theme: 'dark'
};

let player = JSON.parse(localStorage.getItem('tdp_v2_player')) || DEFAULT_PLAYER;
let tasks = JSON.parse(localStorage.getItem('tdp_v2_tasks')) || [];
let activeAchCategory = 'all';

window.addEventListener('DOMContentLoaded', () => {
  applyTheme(player.theme || 'dark');
  updateHUD();
  renderTasks();
  renderBoss();
  renderAchievements();
  setupPWA();
  if (window.lucide) lucide.createIcons();
});

// Tema Claro / Escuro
function toggleTheme() {
  const newTheme = player.theme === 'dark' ? 'light' : 'dark';
  player.theme = newTheme;
  applyTheme(newTheme);
  savePlayerData();
}

function applyTheme(theme) {
  const html = document.documentElement;
  const sun = document.getElementById('themeIconSun');
  const moon = document.getElementById('themeIconMoon');

  if (theme === 'light') {
    html.classList.add('light');
    html.classList.remove('dark');
    if (sun) sun.classList.remove('hidden');
    if (moon) moon.classList.add('hidden');
  } else {
    html.classList.add('dark');
    html.classList.remove('light');
    if (sun) sun.classList.add('hidden');
    if (moon) moon.classList.remove('hidden');
  }
}

// HUD
function updateHUD() {
  document.getElementById('levelBadge').textContent = `Nv.${player.level}`;
  document.getElementById('streakCount').textContent = player.streak;
  document.getElementById('bossesDefeatedCount').textContent = player.bossesDefeated;

  const reqXp = player.level * 100;
  const pct = Math.min(100, Math.round((player.xp / reqXp) * 100));
  document.getElementById('xpText').textContent = `${player.xp} / ${reqXp} XP`;
  document.getElementById('xpBar').style.width = `${pct}%`;
}

function savePlayerData() {
  localStorage.setItem('tdp_v2_player', JSON.stringify(player));
  updateHUD();
  renderBoss();
  renderAchievements();
}

function saveTasks() {
  localStorage.setItem('tdp_v2_tasks', JSON.stringify(tasks));
  renderTasks();
}

// Tarefas e Combate ao Chefão
function handleAddTask(e) {
  e.preventDefault();
  const title = document.getElementById('inputTaskTitle').value.trim();
  const difficulty = document.getElementById('selectDifficulty').value;

  if (!title) return;

  tasks.unshift({
    id: 't_' + Date.now(),
    title,
    difficulty,
    completed: false
  });

  saveTasks();
  document.getElementById('inputTaskTitle').value = '';
  showToast('Quest adicionada!', '⚔️');
}

function completeTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task || task.completed) return;

  task.completed = true;

  let xpEarned = 15;
  let damage = 15;
  if (task.difficulty === 'medium') { xpEarned = 30; damage = 30; }
  if (task.difficulty === 'hard') { xpEarned = 60; damage = 60; }

  player.xp += xpEarned;
  player.totalTasksCompleted++;

  // Aplicar Dano no Chefão
  player.bossCurrentHp = Math.max(0, player.bossCurrentHp - damage);

  // Animação de Dano no Emoji
  const bossEmoji = document.getElementById('bossEmoji');
  if (bossEmoji) {
    bossEmoji.classList.add('scale-125', 'rotate-12');
    setTimeout(() => bossEmoji.classList.remove('scale-125', 'rotate-12'), 200);
  }

  // Se Derrotou o Chefão
  if (player.bossCurrentHp <= 0) {
    player.bossesDefeated++;
    player.bossStage++;
    
    const nextBoss = BOSSES.find(b => b.stage === player.bossStage) || {
      stage: player.bossStage,
      name: `Chefão Supremo Lvl ${player.bossStage}`,
      maxHp: player.bossStage * 250,
      emoji: "🐲",
      desc: "Um inimigo poderoso gerado pela sua alta produtividade!"
    };

    player.bossCurrentHp = nextBoss.maxHp;
    showToast(`💥 CHEFÃO DERROTADO! Você avançou para a Fase ${player.bossStage}!`, '🏆');
  }

  // Atualizar Streak
  const today = new Date().toISOString().split('T')[0];
  if (player.lastCompletedDate !== today) {
    player.streak++;
    player.lastCompletedDate = today;
  }

  checkLevelUp();
  savePlayerData();
  saveTasks();

  if (window.confetti) confetti({ particleCount: 35, spread: 60 });
  showToast(`Quest Concluída! +${xpEarned} XP | 💥 ${damage} de Dano!`, '✨');
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
}

function checkLevelUp() {
  const reqXp = player.level * 100;
  if (player.xp >= reqXp) {
    player.level++;
    player.xp -= reqXp;
    showToast(`🎉 NÍVEL AUMENTADO! Você agora é Nível ${player.level}!`, '⭐');
  }
}

// Renderizar Arena do Chefão
function renderBoss() {
  const currentBoss = BOSSES.find(b => b.stage === player.bossStage) || {
    stage: player.bossStage,
    name: `Chefão Supremo Nv.${player.bossStage}`,
    maxHp: player.bossStage * 250,
    emoji: "🐲",
    desc: "Um inimigo colossal desafiando seu foco!"
  };

  document.getElementById('bossStageText').textContent = `Fase ${currentBoss.stage}`;
  document.getElementById('bossEmoji').textContent = currentBoss.emoji;
  document.getElementById('bossName').textContent = currentBoss.name;
  document.getElementById('bossDesc').textContent = currentBoss.desc;

  const pct = Math.min(100, Math.round((player.bossCurrentHp / currentBoss.maxHp) * 100));
  document.getElementById('bossHpText').textContent = `${player.bossCurrentHp} / ${currentBoss.maxHp}`;
  document.getElementById('bossHpBar').style.width = `${pct}%`;
}

// Renderizar Tarefas
function renderTasks() {
  const listActive = document.getElementById('listTasks');
  const listCompleted = document.getElementById('listCompletedTasks');
  const activeBadge = document.getElementById('activeCountBadge');

  const active = tasks.filter(t => !t.completed);
  const completed = tasks.filter(t => t.completed);

  activeBadge.textContent = active.length;

  if (active.length === 0) {
    listActive.innerHTML = `
      <div class="text-center py-8 bg-slate-900/50 border border-slate-800/60 rounded-2xl">
        <p class="text-3xl mb-1">🎉</p>
        <p class="text-sm font-bold text-slate-300">Todas as tarefas concluídas!</p>
      </div>
    `;
  } else {
    listActive.innerHTML = active.map(t => `
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow">
        <div class="flex items-center gap-3 flex-1">
          <button onclick="completeTask('${t.id}')" class="check-box-btn flex-shrink-0">
            <i data-lucide="check" class="w-4 h-4 text-slate-600 hover:text-indigo-400"></i>
          </button>
          <div>
            <p class="text-sm font-semibold text-white leading-snug">${t.title}</p>
            <span class="text-[10px] font-bold text-slate-400 mt-0.5 inline-block">${t.difficulty.toUpperCase()}</span>
          </div>
        </div>
        <button onclick="deleteTask('${t.id}')" class="text-slate-600 hover:text-red-400 p-1.5">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    `).join('');
  }

  listCompleted.innerHTML = completed.map(t => `
    <div class="bg-slate-900/40 border border-slate-800/40 rounded-xl p-3 flex items-center justify-between gap-3 text-slate-500">
      <div class="flex items-center gap-2.5">
        <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-500"></i>
        <span class="text-xs line-through">${t.title}</span>
      </div>
      <button onclick="deleteTask('${t.id}')" class="text-slate-700 hover:text-red-400 p-1">
        <i data-lucide="x" class="w-3.5 h-3.5"></i>
      </button>
    </div>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

// Renderizar Conquistas
function renderAchievements() {
  const list = document.getElementById('listAchievements');
  let unlockedTotal = 0;

  const filtered = ACHIEVEMENTS_DATA.filter(a => activeAchCategory === 'all' || a.category === activeAchCategory);

  list.innerHTML = filtered.map(a => {
    let unlocked = false;
    if (a.category === 'tasks' && player.totalTasksCompleted >= a.target) unlocked = true;
    if (a.category === 'streak' && player.streak >= a.target) unlocked = true;
    if (a.category === 'boss' && player.bossesDefeated >= a.target) unlocked = true;
    if (a.category === 'level' && player.level >= a.target) unlocked = true;

    if (unlocked) unlockedTotal++;

    return `
      <div class="bg-slate-900 border ${unlocked ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-800 opacity-50'} rounded-2xl p-3.5 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="text-2xl p-2 bg-slate-950 rounded-xl border border-slate-800 flex-shrink-0">
            ${unlocked ? a.icon : '🔒'}
          </div>
          <div>
            <h4 class="text-xs font-bold ${unlocked ? 'text-amber-400' : 'text-slate-400'}">${a.title}</h4>
            <p class="text-[11px] text-slate-400 leading-tight mt-0.5">${a.desc}</p>
          </div>
        </div>
        ${unlocked ? `
          <button onclick="openPhraseModal('${a.title}', '${a.phrase}', '${a.icon}')" class="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-[10px] rounded-lg shadow whitespace-nowrap">
            Ver Frase
          </button>
        ` : ''}
      </div>
    `;
  }).join('');

  document.getElementById('achievementsCountBadge').textContent = `${unlockedTotal} / 100`;
}

function filterAchievements(cat) {
  activeAchCategory = cat;
  document.querySelectorAll('.ach-tab').forEach(b => b.classList.remove('active', 'bg-indigo-600', 'text-white'));
  renderAchievements();
}

// Modal de Frase Secreta
function openPhraseModal(title, phrase, icon) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalPhrase').textContent = phrase;
  document.getElementById('modalIcon').textContent = icon;
  document.getElementById('phraseModal').classList.remove('hidden');
  document.getElementById('phraseModal').classList.add('flex');
}

function closePhraseModal() {
  document.getElementById('phraseModal').classList.add('hidden');
  document.getElementById('phraseModal').classList.remove('flex');
}

function switchTab(tab) {
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('secTasks').classList.add('hidden');
  document.getElementById('secBoss').classList.add('hidden');
  document.getElementById('secAchievements').classList.add('hidden');

  if (tab === 'tasks') {
    document.getElementById('tabTasks').classList.add('active');
    document.getElementById('secTasks').classList.remove('hidden');
  } else if (tab === 'boss') {
    document.getElementById('tabBoss').classList.add('active');
    document.getElementById('secBoss').classList.remove('hidden');
  } else if (tab === 'achievements') {
    document.getElementById('tabAchievements').classList.add('active');
    document.getElementById('secAchievements').classList.remove('hidden');
  }
}

function showToast(msg, icon = '🎉') {
  const toast = document.getElementById('toast');
  document.getElementById('toastMessage').textContent = msg;
  document.getElementById('toastIcon').textContent = icon;

  toast.classList.remove('opacity-0', 'pointer-events-none');
  setTimeout(() => toast.classList.add('opacity-0', 'pointer-events-none'), 3000);
}

function setupPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW Error:', err));
  }
}
