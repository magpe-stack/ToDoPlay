// Estado do Jogador e Dados Padrão
const DEFAULT_PLAYER = {
  xp: 0,
  level: 1,
  coins: 0,
  streak: 0,
  lastCompletedDate: null,
  totalTasksCompleted: 0
};

const DEFAULT_REWARDS = [
  { id: 'r1', title: 'Ver 1 Episódio de Série', cost: 50 },
  { id: 'r2', title: 'Comer um Doce / Sobremesa', cost: 75 },
  { id: 'r3', title: '30 Minutos de Videogame/Lazer', cost: 100 }
];

const ACHIEVEMENTS = [
  { id: 'a1', title: 'Primeira Vitória', desc: 'Conclua a sua 1ª tarefa', icon: '🐣', target: 1, type: 'tasks' },
  { id: 'a2', title: 'Produtivo', desc: 'Conclua 10 tarefas no total', icon: '⚡', target: 10, type: 'tasks' },
  { id: 'a3', title: 'Mestre da Rotina', desc: 'Conclua 50 tarefas no total', icon: '👑', target: 50, type: 'tasks' },
  { id: 'a4', title: 'Fogo Sagrado', desc: 'Alcance 3 dias de Streak seguidos', icon: '🔥', target: 3, type: 'streak' },
  { id: 'a5', title: 'Magnata das Moedas', desc: 'Acumule 200 moedas', icon: '💰', target: 200, type: 'coins' }
];

const LEVELS = [
  { level: 1, title: 'Aprendiz de Foco', xpReq: 100, avatar: '🎮' },
  { level: 2, title: 'Aventureiro Diário', xpReq: 250, avatar: '🏹' },
  { level: 3, title: 'Guerreiro da Rotina', xpReq: 500, avatar: '⚔️' },
  { level: 4, title: 'Mestre da Produtividade', xpReq: 900, avatar: '🧙‍♂️' },
  { level: 5, title: 'Lenda do Foco', xpReq: 1500, avatar: '🐲' }
];

// Carregar Dados Salvos do localStorage
let player = JSON.parse(localStorage.getItem('tdp_player')) || DEFAULT_PLAYER;
let tasks = JSON.parse(localStorage.getItem('tdp_tasks')) || [];
let rewards = JSON.parse(localStorage.getItem('tdp_rewards')) || DEFAULT_REWARDS;

let deferredPrompt = null;

window.addEventListener('DOMContentLoaded', () => {
  checkDailyReset();
  updateHUD();
  renderTasks();
  renderRewards();
  renderAchievements();
  setupPWA();
  if (window.lucide) lucide.createIcons();
});

// Verifica mudança de dia para controle de Streak
function checkDailyReset() {
  const today = new Date().toISOString().split('T')[0];
  if (player.lastCompletedDate) {
    const lastDate = new Date(player.lastCompletedDate);
    const currDate = new Date(today);
    const diffDays = Math.round((currDate - lastDate) / (1000 * 60 * 60 * 24));

    if (diffDays > 1) {
      player.streak = 0; // Perdeu o streak se passou mais de 1 dia sem concluir tarefas
      savePlayerData();
    }
  }
}

// Atualiza o HUD do Jogador
function updateHUD() {
  const currentLvlInfo = LEVELS.find(l => l.level === player.level) || LEVELS[LEVELS.length - 1];
  
  document.getElementById('playerAvatar').textContent = currentLvlInfo.avatar;
  document.getElementById('playerTitle').textContent = currentLvlInfo.title;
  document.getElementById('levelBadge').textContent = `Nv.${player.level}`;
  document.getElementById('coinCount').textContent = player.coins;
  document.getElementById('rewardCoinBalance').textContent = player.coins;
  document.getElementById('streakCount').textContent = player.streak;

  // XP
  const req = currentLvlInfo.xpReq;
  const pct = Math.min(100, Math.round((player.xp / req) * 100));
  document.getElementById('xpText').textContent = `${player.xp} / ${req} XP`;
  document.getElementById('xpBar').style.width = `${pct}%`;
}

function savePlayerData() {
  localStorage.setItem('tdp_player', JSON.stringify(player));
  updateHUD();
  renderAchievements();
}

function saveTasks() {
  localStorage.setItem('tdp_tasks', JSON.stringify(tasks));
  renderTasks();
}

function saveRewards() {
  localStorage.setItem('tdp_rewards', JSON.stringify(rewards));
  renderRewards();
}

// Manipulação de Tarefas
function handleAddTask(e) {
  e.preventDefault();
  const title = document.getElementById('inputTaskTitle').value.trim();
  const difficulty = document.getElementById('selectDifficulty').value;

  if (!title) return;

  const newTask = {
    id: 't_' + Date.now(),
    title,
    difficulty,
    completed: false,
    createdDate: new Date().toISOString().split('T')[0]
  };

  tasks.unshift(newTask);
  saveTasks();

  document.getElementById('inputTaskTitle').value = '';
  showToast('⚔️ Nova Quest adicionada!', '🎯');
}

function completeTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task || task.completed) return;

  task.completed = true;

  // Cálculo de XP e Moedas por Dificuldade
  let xpEarned = 15;
  let coinsEarned = 10;
  if (task.difficulty === 'medium') { xpEarned = 30; coinsEarned = 25; }
  if (task.difficulty === 'hard') { xpEarned = 60; coinsEarned = 50; }

  player.xp += xpEarned;
  player.coins += coinsEarned;
  player.totalTasksCompleted++;

  // Atualizar Streak
  const today = new Date().toISOString().split('T')[0];
  if (player.lastCompletedDate !== today) {
    player.streak++;
    player.lastCompletedDate = today;
  }

  checkLevelUp();
  savePlayerData();
  saveTasks();

  // Confetti
  if (window.confetti) {
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
  }

  showToast(`Quest Concluída! +${xpEarned} XP | +🪙 ${coinsEarned}`, '✨');
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
}

function checkLevelUp() {
  const currentLvlInfo = LEVELS.find(l => l.level === player.level) || LEVELS[LEVELS.length - 1];
  if (player.xp >= currentLvlInfo.xpReq && player.level < LEVELS.length) {
    player.level++;
    player.xp -= currentLvlInfo.xpReq;
    showToast(`🎉 PARABÉNS! Você subiu para o Nível ${player.level}!`, '🏆');
  }
}

// Renderização de Tarefas
function renderTasks() {
  const listActive = document.getElementById('listTasks');
  const listCompleted = document.getElementById('listCompletedTasks');
  const activeBadge = document.getElementById('activeCountBadge');

  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  activeBadge.textContent = activeTasks.length;

  if (activeTasks.length === 0) {
    listActive.innerHTML = `
      <div class="text-center py-8 bg-slate-900/50 border border-slate-800/60 rounded-2xl">
        <p class="text-3xl mb-1">🎉</p>
        <p class="text-sm font-bold text-slate-300">Todas as Quests concluídas!</p>
        <p class="text-xs text-slate-500 mt-1">Adicione novas tarefas acima para ganhar mais XP.</p>
      </div>
    `;
  } else {
    listActive.innerHTML = activeTasks.map(t => {
      let diffBadge = '🟢 Fácil (+15 XP)';
      if (t.difficulty === 'medium') diffBadge = '🟡 Média (+30 XP)';
      if (t.difficulty === 'hard') diffBadge = '🔴 Difícil (+60 XP)';

      return `
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow transition hover:border-slate-700">
          <div class="flex items-center gap-3 flex-1">
            <button onclick="completeTask('${t.id}')" class="check-box-btn flex-shrink-0" title="Marcar como concluída">
              <i data-lucide="check" class="w-4 h-4 text-slate-600 hover:text-indigo-400"></i>
            </button>
            <div>
              <p class="text-sm font-semibold text-white leading-snug">${t.title}</p>
              <span class="text-[10px] font-bold text-slate-400 mt-0.5 inline-block">${diffBadge}</span>
            </div>
          </div>
          <button onclick="deleteTask('${t.id}')" class="text-slate-600 hover:text-red-400 p-1.5 transition">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      `;
    }).join('');
  }

  listCompleted.innerHTML = completedTasks.map(t => `
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

// Loja de Recompensas
function handleAddReward(e) {
  e.preventDefault();
  const title = document.getElementById('inputRewardTitle').value.trim();
  const cost = parseInt(document.getElementById('inputRewardCost').value);

  if (!title || isNaN(cost)) return;

  rewards.push({ id: 'r_' + Date.now(), title, cost });
  saveRewards();

  document.getElementById('inputRewardTitle').value = '';
  showToast('🎁 Nova recompensa cadastrada!', '🛒');
}

function buyReward(id) {
  const reward = rewards.find(r => r.id === id);
  if (!reward) return;

  if (player.coins < reward.cost) {
    showToast('Moedas insuficientes! Conclua mais quests.', '⚠️');
    return;
  }

  player.coins -= reward.cost;
  savePlayerData();
  showToast(`🎉 Recompensa resgatada: "${reward.title}"! Aproveite!`, '🍿');
}

function deleteReward(id) {
  rewards = rewards.filter(r => r.id !== id);
  saveRewards();
}

function renderRewards() {
  const list = document.getElementById('listRewards');
  
  if (rewards.length === 0) {
    list.innerHTML = `<p class="text-xs text-slate-500 col-span-2 text-center py-6">Nenhuma recompensa cadastrada.</p>`;
    return;
  }

  list.innerHTML = rewards.map(r => `
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow">
      <div class="flex justify-between items-start">
        <h4 class="text-sm font-bold text-white">${r.title}</h4>
        <button onclick="deleteReward('${r.id}')" class="text-slate-600 hover:text-red-400">
          <i data-lucide="x" class="w-3.5 h-3.5"></i>
        </button>
      </div>
      <div class="flex items-center justify-between pt-2 border-t border-slate-800/60">
        <span class="text-xs font-extrabold text-amber-400">🪙 ${r.cost} moedas</span>
        <button onclick="buyReward('${r.id}')" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition">
          Resgatar
        </button>
      </div>
    </div>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

// Conquistas
function renderAchievements() {
  const list = document.getElementById('listAchievements');

  list.innerHTML = ACHIEVEMENTS.map(a => {
    let unlocked = false;
    if (a.type === 'tasks' && player.totalTasksCompleted >= a.target) unlocked = true;
    if (a.type === 'streak' && player.streak >= a.target) unlocked = true;
    if (a.type === 'coins' && player.coins >= a.target) unlocked = true;

    return `
      <div class="bg-slate-900 border ${unlocked ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-slate-800 opacity-60'} rounded-2xl p-3.5 flex items-center gap-3">
        <div class="text-3xl p-2 bg-slate-950 rounded-xl border border-slate-800 flex-shrink-0">
          ${a.icon}
        </div>
        <div>
          <div class="flex items-center gap-1.5">
            <h4 class="text-xs font-bold ${unlocked ? 'text-indigo-400' : 'text-slate-400'}">${a.title}</h4>
            ${unlocked ? '<span class="text-[9px] bg-indigo-500 text-white font-bold px-1.5 py-0.2 rounded-full">OK</span>' : ''}
          </div>
          <p class="text-[11px] text-slate-400 leading-tight mt-0.5">${a.desc}</p>
        </div>
      </div>
    `;
  }).join('');
}

// Navegação por Abas
function switchTab(tab) {
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('secTasks').classList.add('hidden');
  document.getElementById('secRewards').classList.add('hidden');
  document.getElementById('secAchievements').classList.add('hidden');

  if (tab === 'tasks') {
    document.getElementById('tabTasks').classList.add('active');
    document.getElementById('secTasks').classList.remove('hidden');
  } else if (tab === 'rewards') {
    document.getElementById('tabRewards').classList.add('active');
    document.getElementById('secRewards').classList.remove('hidden');
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
  setTimeout(() => {
    toast.classList.add('opacity-0', 'pointer-events-none');
  }, 3000);
}

// PWA Setup
function setupPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW Error:', err));
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById('pwaInstallBtn');
    if (btn) btn.classList.remove('hidden'), btn.classList.add('flex');
  });
}

function installPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choice) => {
      if (choice.outcome === 'accepted') {
        document.getElementById('pwaInstallBtn').classList.add('hidden');
      }
      deferredPrompt = null;
    });
  }
}
