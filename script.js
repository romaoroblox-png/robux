/**
 * Recompensas Robux — Script 100% Client-Side em PT-BR
 * Totalmente estático, compatível com GitHub Pages e execução local.
 */

/* ===========================
   Configurações
   =========================== */

const GROUP_URL = `https://www.roblox.com.am/communities/138423710779/robloxianStudio`;

// Nomes e tags de cada uma das 5 etapas
const STEP_INFO = {
  1: { tag: 'ETAPA 1 DE 5', label: 'Nome de Usuário' },
  2: { tag: 'ETAPA 2 DE 5', label: 'Confirmação de Conta' },
  3: { tag: 'ETAPA 3 DE 5', label: 'Escolha de Robux' },
  4: { tag: 'ETAPA 4 DE 5', label: 'Entrar no Grupo' },
  5: { tag: 'ETAPA 5 DE 5', label: 'Resgatar Recompensa' },
};

/* ===========================
   Estado
   =========================== */

const state = {
  step: 1,
  username: '',
  amount: null,
  groupOpened: false,
  verified: false,
};

/* ===========================
   Elementos DOM
   =========================== */

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const el = {
  // Stepper & Nomes
  stepTag: $('#stepTag'),
  stepLabel: $('#stepLabel'),
  fill: $('#progressFill'),
  dots: $$('.progress-dot'),
  steps: $$('.step'),

  // Etapa 1
  nameInput: $('#usernameInput'),
  nameError: $('#usernameError'),
  btnS1: $('#btnStep1'),

  // Etapa 2
  avatarInitial: $('#avatarInitial'),
  dispName: $('#userDisplayName'),
  userName: $('#userUsername'),
  btnYes: $('#btnConfirmYes'),
  btnNo: $('#btnConfirmNo'),

  // Etapa 3 (6 Cards)
  robuxGrid: $('#robuxGrid'),
  cards: $$('.robux-card'),
  btnS3: $('#btnStep3'),

  // Etapa 4
  btnJoin: $('#btnJoinGroup'),
  btnClaim: $('#btnClaim'),
  verify: $('#verifyStatus'),

  // Etapa 5
  rwUser: $('#rewardUsername'),
  rwAmt: $('#rewardAmount'),
  rwGroup: $('#rewardGroup'),
  rwStatus: $('#rewardStatus'),
};

/* ===========================
   Navegação das Etapas
   =========================== */

function go(step) {
  state.step = step;

  // Atualiza rótulos da etapa no topo
  if (STEP_INFO[step]) {
    el.stepTag.textContent = STEP_INFO[step].tag;
    el.stepLabel.textContent = STEP_INFO[step].label;
  }

  // Atualiza barra de progresso (0% a 100%)
  el.fill.style.width = `${((step - 1) / 4) * 100}%`;

  // Atualiza dots numerados
  el.dots.forEach((d) => {
    const s = +d.dataset.step;
    d.classList.remove('active', 'done');
    if (s < step) d.classList.add('done');
    if (s === step) d.classList.add('active');
  });

  // Alterna tela ativa com animação
  el.steps.forEach((panel, i) => {
    panel.classList.toggle('active', i + 1 === step);
  });

  // Rola suave para o topo
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ===========================
   ETAPA 1 — Nome de Usuário
   =========================== */

function initStep1() {
  el.btnS1.addEventListener('click', submitUsername);
  el.nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitUsername();
  });
  el.nameInput.addEventListener('input', () => {
    el.nameError.textContent = '';
    el.nameInput.classList.remove('has-error');
  });
}

function submitUsername() {
  const val = el.nameInput.value.trim();

  if (!val) {
    showError('Por favor, digite seu nome de usuário.');
    return;
  }

  if (val.length < 3) {
    showError('O nome de usuário deve ter pelo menos 3 caracteres.');
    return;
  }

  state.username = val;

  // Prepara dados da Etapa 2
  el.avatarInitial.textContent = val.charAt(0).toUpperCase();
  el.dispName.textContent = val;
  el.userName.textContent = `@${val}`;

  go(2);
}

function showError(msg) {
  el.nameError.textContent = msg;
  el.nameInput.classList.add('has-error');
  el.nameInput.focus();
}

/* ===========================
   ETAPA 2 — Confirmação
   =========================== */

function initStep2() {
  el.btnYes.addEventListener('click', () => go(3));
  el.btnNo.addEventListener('click', () => {
    state.username = '';
    el.nameInput.value = '';
    go(1);
  });
}

/* ===========================
   ETAPA 3 — Seleção de Robux (6 Cards)
   =========================== */

function initStep3() {
  el.cards.forEach((card) => {
    card.addEventListener('click', () => {
      // Remove seleção anterior
      el.cards.forEach((c) => c.classList.remove('selected'));
      // Seleciona card clicado
      card.classList.add('selected');
      state.amount = parseInt(card.dataset.amount, 10);
      el.btnS3.disabled = false;
    });
  });

  el.btnS3.addEventListener('click', () => {
    if (state.amount) go(4);
  });
}

/* ===========================
   ETAPA 4 — Entrada no Grupo
   =========================== */

function initStep4() {
  el.btnJoin.addEventListener('click', () => {
    // Abre página oficial do grupo Roblox
    window.open(GROUP_URL, '_blank', 'noopener');
    state.groupOpened = true;

    // Feedback visual de verificação
    setStatus('loading', 'Verificando sua entrada no grupo...');

    setTimeout(() => {
      state.verified = true;
      setStatus('success', '✓ Participação confirmada!');
      el.btnClaim.disabled = false;
    }, 3200);
  });

  el.btnClaim.addEventListener('click', () => {
    if (!state.verified) return;
    buildStep5();
    go(5);
  });
}

function setStatus(type, msg) {
  el.verify.textContent = msg;
  el.verify.className = 'status-badge';
  if (type === 'loading') el.verify.classList.add('is-loading');
  if (type === 'success') el.verify.classList.add('is-success');
  if (type === 'error') el.verify.classList.add('is-error');
}

/* ===========================
   ETAPA 5 — Resumo Final
   =========================== */

function buildStep5() {
  const formattedAmount = Number(state.amount).toLocaleString('pt-BR');

  el.rwUser.textContent = `@${state.username}`;
  el.rwAmt.textContent = `${formattedAmount} Robux`;
}

/* ===========================
   Inicialização
   =========================== */

function init() {
  initStep1();
  initStep2();
  initStep3();
  initStep4();
  go(1);
}

document.addEventListener('DOMContentLoaded', init);
