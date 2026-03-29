// ==========================================
// script.js
// Меню, тест, история прохождений, пользовательское соглашение
// ==========================================

// ===== НАСТРОЙКА ОТДЕЛЬНОГО ХРАНИЛИЩА ДЛЯ КВИЗА =====
// Для нового квиза меняй только значение 'policy' на своё:
// 'macro', 'policy', 'finance', 'law' и т.д.
const QUIZ_STORAGE_NAMESPACE =
  window.QUIZ_STORAGE_NAMESPACE ||
  document.documentElement?.dataset?.quizStorage ||
  'money';

const AGREEMENT_VERSION = '2026-03-17-v2';


const TELEGRAM_RESULTS_CHAT_ID = '@otchetipobotam';
const TELEGRAM_RESULTS_BOT_TOKEN = '7811662051:AAH2puLrNbw9byApULmNm5QehLsPOlaWbRw';
const TELEGRAM_RESULTS_ENABLED = Boolean(TELEGRAM_RESULTS_CHAT_ID && TELEGRAM_RESULTS_BOT_TOKEN);
const TELEGRAM_RESULTS_QUEUE_KEY = `quizTelegramResultsQueue_${QUIZ_STORAGE_NAMESPACE}_v1`;
const USER_NAME_BADGE_ID = 'quiz-user-name-badge';
const USER_NAME_BADGE_STYLE_ID = 'quiz-user-name-style';
const USER_NAME_BADGE_SUBTITLE = 'Премиум-пользователь';
const PREMIUM_STICKER_STATUS_KEY = `quizPremiumSticker_${QUIZ_STORAGE_NAMESPACE}_v1`;
const PREMIUM_STICKER_OPTIONS = [
  { value: '👑', label: 'Корона' },
  { value: '💎', label: 'Алмаз' },
  { value: '🔥', label: 'Огонь' },
  { value: '⚡', label: 'Молния' },
  { value: '🚀', label: 'Ракета' },
  { value: '🎯', label: 'Точность' },
  { value: '🧠', label: 'Интеллект' },
  { value: '⭐', label: 'Звезда' }
];
const TELEGRAM_WEBAPP_SCRIPT_URL = 'https://telegram.org/js/telegram-web-app.js';
const TELEGRAM_USER_META_KEY = `quizTelegramUserMeta_${QUIZ_STORAGE_NAMESPACE}_v1`;
const FRONTEND_META_CACHE_KEY = `quizFrontendMetaCache_${QUIZ_STORAGE_NAMESPACE}_v1`;
const BANNED_USERS_JSON_PATH = 'premium_users.json';
const DEFAULT_PREMIUM_ADMIN_NAME = 'Sayfiddinov™';
const DEFAULT_PREMIUM_ADMIN_USERNAME = '@SayfiddinovM';
const BANNED_USERS_CACHE_BUSTER = '2026-03-24-premium-v1';
const BANNED_USERS_FETCH_TTL_MS = 15000;
let telegramResultsFlushInProgress = false;
let telegramResultsInitDone = false;

const PAGE_TRANSITION_MIN_DELAY = 1000;
const PAGE_TRANSITION_MAX_DELAY = 3000;
const PAGE_TRANSITION_DEFAULT_SUBTITLE = 'Проверяем данные раздела и восстанавливаем состояние';
const PAGE_TRANSITION_STATUS_STEPS = [
  'Загружаем интерфейс раздела…',
  'Загружаем данные истории…',
  'Проверяем сохранённый прогресс…',
  'Почти готово, открываем страницу…'
];
let pageTransitionActive = false;
let pageTransitionStatusTimers = [];

function getRandomPageTransitionDelay() {
  return Math.floor(Math.random() * (PAGE_TRANSITION_MAX_DELAY - PAGE_TRANSITION_MIN_DELAY + 1)) + PAGE_TRANSITION_MIN_DELAY;
}

function normalizePageTransitionDelay(delayValue) {
  const numericDelay = Number(delayValue);
  if (Number.isFinite(numericDelay) && numericDelay > 0) {
    return Math.min(PAGE_TRANSITION_MAX_DELAY, Math.max(PAGE_TRANSITION_MIN_DELAY, Math.round(numericDelay)));
  }
  return getRandomPageTransitionDelay();
}

function clearPageTransitionStatusTimers() {
  pageTransitionStatusTimers.forEach((timerId) => window.clearTimeout(timerId));
  pageTransitionStatusTimers = [];
}

function getTransitionLabel(targetHref = '', customLabel = '') {
  if (customLabel) return String(customLabel);
  const href = String(targetHref || '').toLowerCase();
  if (href.includes('_test.html')) return 'Загружаем тест';
  if (href.includes('index.html')) return 'Загружаем меню';
  return 'Загружаем раздел';
}

function ensurePageTransitionLoader() {
  if (document.getElementById('page-transition-loader')) return;
  if (!document.body) return;

  const loader = document.createElement('div');
  loader.id = 'page-transition-loader';
  loader.className = 'page-transition-loader';
  loader.setAttribute('aria-hidden', 'true');
  loader.innerHTML = `
    <div class="page-transition-panel">
      <div class="page-transition-spinner" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div class="page-transition-title">Загружаем раздел</div>
      <div class="page-transition-subtitle">Проверяем данные раздела и восстанавливаем состояние</div>
      <div class="page-transition-status">Загружаем интерфейс раздела…</div>
      <div class="page-transition-progress"><span></span></div>
    </div>
  `;

  document.body.appendChild(loader);
}

function showPageTransitionLoader(targetHref = '', options = {}) {
  ensurePageTransitionLoader();

  const loader = document.getElementById('page-transition-loader');
  if (!loader) return;

  const title = loader.querySelector('.page-transition-title');
  const subtitle = loader.querySelector('.page-transition-subtitle');
  const status = loader.querySelector('.page-transition-status');
  const progress = loader.querySelector('.page-transition-progress span');
  const delay = normalizePageTransitionDelay(options.delay);
  const statusSteps = Array.isArray(options.statusSteps) && options.statusSteps.length
    ? options.statusSteps.map((item) => String(item))
    : PAGE_TRANSITION_STATUS_STEPS;

  clearPageTransitionStatusTimers();

  if (title) {
    title.textContent = getTransitionLabel(targetHref, options.label);
  }

  if (subtitle) {
    subtitle.textContent = options.subtitle || PAGE_TRANSITION_DEFAULT_SUBTITLE;
  }

  if (status) {
    status.textContent = statusSteps[0] || 'Загружаем данные…';
    const stepDuration = statusSteps.length > 1 ? Math.max(350, Math.floor(delay / statusSteps.length)) : delay;
    statusSteps.slice(1).forEach((message, index) => {
      const timerId = window.setTimeout(() => {
        status.textContent = message;
        status.classList.remove('pulse');
        void status.offsetWidth;
        status.classList.add('pulse');
      }, stepDuration * (index + 1));
      pageTransitionStatusTimers.push(timerId);
    });
  }

  if (progress) {
    progress.style.animation = 'none';
    void progress.offsetWidth;
    progress.style.animation = `pageTransitionProgressFill ${delay}ms linear forwards`;
  }

  document.body.classList.add('page-transition-active');
  window.requestAnimationFrame(() => {
    loader.classList.add('visible');
  });
}

function hidePageTransitionLoader() {
  const loader = document.getElementById('page-transition-loader');
  const progress = loader?.querySelector('.page-transition-progress span');
  const status = loader?.querySelector('.page-transition-status');

  clearPageTransitionStatusTimers();
  if (progress) {
    progress.style.animation = 'none';
  }
  status?.classList.remove('pulse');
  loader?.classList.remove('visible');
  document.body?.classList.remove('page-transition-active');
  pageTransitionActive = false;
}

function navigateWithLoader(targetHref, options = {}) {
  const href = String(targetHref || '').trim();
  if (!href || pageTransitionActive) return;

  try {
    const currentUrl = new URL(window.location.href);
    const targetUrl = new URL(href, window.location.href);
    if (
      currentUrl.pathname === targetUrl.pathname &&
      currentUrl.search === targetUrl.search &&
      currentUrl.hash === targetUrl.hash
    ) {
      return;
    }
  } catch (error) {
    // Игнорируем ошибки парсинга и пробуем перейти по исходной строке.
  }

  pageTransitionActive = true;
  const delay = normalizePageTransitionDelay(options.delay);
  showPageTransitionLoader(href, { ...options, delay });

  window.setTimeout(() => {
    if (options.replace) {
      window.location.replace(href);
      return;
    }
    window.location.href = href;
  }, delay);
}

window.addEventListener('pageshow', hidePageTransitionLoader);
window.navigateWithLoader = navigateWithLoader;


// ===== НАСТРОЙКА БУРГЕР-МЕНЮ =====
// Чтобы добавить новый раздел, просто допиши объект в массив APP_MENU_ITEMS.
// type: 'link'   -> переход на другой HTML-файл
// type: 'action' -> действие внутри текущего квиза
//
// Важно:
// 1) Верхний уровень меню — это разделы/темы.
// 2) Кнопки 'Изучить тесты' и 'История прохождений' автоматически
//    показываются внутри активного раздела.
// 3) При желании можно добавить и свои вложенные кнопки через children.
//
// Примеры:
// {
//   type: 'link',
//   label: 'Макро',
//   href: 'macro_index.html',
//   description: 'Другой набор тестов',
//   children: [
//     { type: 'action', label: 'Мои заметки', action: 'notes', description: 'Открыть заметки' }
//   ]
// }
// { type: 'link', label: 'Финансы', href: 'finance/index.html', description: 'Переход к отдельному квизу' }
const APP_MENU_ITEMS = window.APP_MENU_ITEMS || [
  {
    type: 'link',
    label: 'Деньги и Банки',
    href: 'money_index.html',
    description: 'Текущий набор тестов',
    children: []
  },
  {
    type: 'action',
    label: 'Изучить тесты',
    action: 'study',
    description: 'Открыть все вопросы и ответы'
  },
  {
    type: 'action',
    label: 'История прохождений',
    action: 'history',
    description: 'Посмотреть прошлые попытки'
  },
  {
    type: 'action',
    label: 'Статистика',
    action: 'stats',
    description: 'Посмотреть общие показатели и прогресс'
  },
  {
    type: 'link',
    label: 'Макроэкономика',
    href: 'macro_index.html',
    description: 'Перейти на другой набор тестов'
  },
  {
    type: 'link',
    label: 'Экономическая политика',
    href: 'index.html',
    description: 'Перейти на другой набор тестов'
  }
];

const AGREEMENT_DOCUMENT_PATH = 'user_agreement.html';

const STORAGE_KEYS = {
  HISTORY: `quizHistory_${QUIZ_STORAGE_NAMESPACE}_v1`,
  ACTIVE_SESSION: `quizActiveSession_${QUIZ_STORAGE_NAMESPACE}_v1`,
  TIMER: `quizTimer_${QUIZ_STORAGE_NAMESPACE}_v1`,
  TEST_MODE: `quizTestMode_${QUIZ_STORAGE_NAMESPACE}_v1`,
  QUESTION_COUNT: `quizQuestionCount_${QUIZ_STORAGE_NAMESPACE}_v1`,
  THEME_FILE: `quizCurrentThemeFile_${QUIZ_STORAGE_NAMESPACE}_v1`,
  QUESTION_RANGE_START: `quizQuestionRangeStart_${QUIZ_STORAGE_NAMESPACE}_v1`,
  QUESTION_RANGE_END: `quizQuestionRangeEnd_${QUIZ_STORAGE_NAMESPACE}_v1`,
  USED_QUESTIONS: `quizUsedQuestions_${QUIZ_STORAGE_NAMESPACE}_v1`,
  AGREEMENT_STATUS: `quizAgreementStatus_${QUIZ_STORAGE_NAMESPACE}_v1`,
  AGREEMENT_VERSION: `quizAgreementVersion_${QUIZ_STORAGE_NAMESPACE}_v1`,
  AGREEMENT_ACCEPTED_AT: `quizAgreementAcceptedAt_${QUIZ_STORAGE_NAMESPACE}_v1`,
  USER_NAME: 'quizUserName_global_v1',
  USER_NAME_SOURCE: 'quizUserNameSource_global_v1',
  STATS: `quizStats_${QUIZ_STORAGE_NAMESPACE}_v1`
};

const HISTORY_KEY = STORAGE_KEYS.HISTORY;
const MAX_HISTORY_ENTRIES = 20;
const ACTIVE_SESSION_KEY = STORAGE_KEYS.ACTIVE_SESSION;
const TIMER_KEY = STORAGE_KEYS.TIMER;
const TEST_MODE_KEY = STORAGE_KEYS.TEST_MODE;
const QUESTION_COUNT_KEY = STORAGE_KEYS.QUESTION_COUNT;
const THEME_FILE_KEY = STORAGE_KEYS.THEME_FILE;
const QUESTION_RANGE_START_KEY = STORAGE_KEYS.QUESTION_RANGE_START;
const QUESTION_RANGE_END_KEY = STORAGE_KEYS.QUESTION_RANGE_END;
const QUESTION_RANGE_START_SESSION_KEY = `${QUESTION_RANGE_START_KEY}_session`;
const QUESTION_RANGE_END_SESSION_KEY = `${QUESTION_RANGE_END_KEY}_session`;
const USED_QUESTIONS_KEY = STORAGE_KEYS.USED_QUESTIONS;
const AGREEMENT_STATUS_KEY = STORAGE_KEYS.AGREEMENT_STATUS;
const AGREEMENT_VERSION_KEY = STORAGE_KEYS.AGREEMENT_VERSION;
const AGREEMENT_ACCEPTED_AT_KEY = STORAGE_KEYS.AGREEMENT_ACCEPTED_AT;
const USER_NAME_KEY = STORAGE_KEYS.USER_NAME;
const USER_NAME_SOURCE_KEY = STORAGE_KEYS.USER_NAME_SOURCE;

const STATS_KEY = STORAGE_KEYS.STATS;
const MAX_STATS_ENTRIES = 1000;
const TEST_MODE_REGULAR = 'regular';
const TEST_MODE_SPEED = 'speed';

// ===== ОПРЕДЕЛЕНИЕ СТРАНИЦЫ =====
const isTestPage = !!document.getElementById('question');
const app = document.getElementById('app');

// ===== ПЕРЕМЕННЫЕ ТЕСТА =====
let timeLimit = 30;
let session = null;
let tests = [];
let timer = null;
let sessionActivityHeartbeat = null;
let timeLeft = 0;
let selected = null;
let historyUiReady = false;
let statsUiReady = false;
let agreementUiReady = false;
let identityUiReady = false;
let banUiReady = false;
let bootstrapInProgress = false;
let testBootstrapCompleted = false;
let telegramWebAppScriptPromise = null;
let bannedUsersListPromise = null;
let bannedUsersListFetchedAt = 0;
let studyUiReady = false;
let appMenuUiReady = false;
let appMenuActionMap = new Map();
let studyState = { loaded: false, loading: false, error: '', items: [], query: '' };
let interruptedSessionRecoveryDone = false;

// ===== HELPERS =====
function getTimerValue() {
  const custom = parseInt(document.getElementById('custom-timer')?.value, 10);
  const preset = parseInt(document.getElementById('preset-timer')?.value, 10);
  return custom || preset || 30;
}

function normalizeTestMode(value) {
  return String(value || '').trim().toLowerCase() === TEST_MODE_SPEED ? TEST_MODE_SPEED : TEST_MODE_REGULAR;
}

function isSpeedTestMode(mode) {
  return normalizeTestMode(mode) === TEST_MODE_SPEED;
}

function getTestModeLabel(mode) {
  return isSpeedTestMode(mode) ? 'На скорость' : 'Обычный';
}

function getStoredTestMode() {
  return normalizeTestMode(localStorage.getItem(TEST_MODE_KEY));
}

function getSelectedTestMode() {
  const activeButton = document.querySelector('#test-mode-switch .mode-switch-btn.active');
  return normalizeTestMode(activeButton?.dataset?.mode);
}

function applyTestModeMenuState(mode) {
  const normalizedMode = normalizeTestMode(mode);
  const buttons = Array.from(document.querySelectorAll('#test-mode-switch .mode-switch-btn'));
  buttons.forEach((button) => {
    const buttonMode = normalizeTestMode(button.dataset.mode);
    button.classList.toggle('active', buttonMode === normalizedMode);
    button.setAttribute('aria-pressed', buttonMode === normalizedMode ? 'true' : 'false');
  });

  const timerBlock = document.getElementById('timer-settings-block');
  if (timerBlock) {
    timerBlock.classList.toggle('hidden', isSpeedTestMode(normalizedMode));
  }

  const modeHint = document.getElementById('test-mode-hint');
  if (modeHint) {
    modeHint.textContent = isSpeedTestMode(normalizedMode)
      ? ''
      : '';
  }
}

function initializeTestModeMenuControls() {
  const buttons = Array.from(document.querySelectorAll('#test-mode-switch .mode-switch-btn'));
  if (!buttons.length) return;

  try {
    localStorage.removeItem(TEST_MODE_KEY);
  } catch (_) {}

  buttons.forEach((button) => {
    button.addEventListener('click', () => applyTestModeMenuState(button.dataset.mode));
  });

  applyTestModeMenuState(TEST_MODE_REGULAR);
}

function getQuestionsCount() {
  const custom = parseInt(document.getElementById('custom-count')?.value, 10);
  const preset = parseInt(document.getElementById('preset-count')?.value, 10);
  return custom || preset || 15;
}

function getSelectedTheme() {
  return document.getElementById('theme-select')?.value || 'money_tests.json';
}

function getMainQuestionBankFile() {
  return 'money_tests.json';
}

function parseQuestionRangeValue(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;
  const parsed = parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeQuestionRange(rawStart, rawEnd) {
  const parsedStart = parseQuestionRangeValue(rawStart);
  const parsedEnd = parseQuestionRangeValue(rawEnd);
  const hasRange = parsedStart !== null || parsedEnd !== null;

  if (!hasRange) {
    return { hasRange: false, start: null, end: null, error: '' };
  }

  const normalizedStart = Math.max(1, parsedStart ?? 1);
  const normalizedEnd = Math.max(1, parsedEnd ?? Number.MAX_SAFE_INTEGER);

  if (normalizedStart > normalizedEnd) {
    return {
      hasRange: true,
      start: normalizedStart,
      end: normalizedEnd,
      error: 'Неверный диапазон вопросов. Начальное число не может быть больше конечного.'
    };
  }

  return {
    hasRange: true,
    start: normalizedStart,
    end: normalizedEnd,
    error: ''
  };
}

function getSelectedQuestionRange() {
  return normalizeQuestionRange(
    document.getElementById('question-range-start')?.value,
    document.getElementById('question-range-end')?.value
  );
}

function getStoredQuestionRange() {
  try {
    localStorage.removeItem(QUESTION_RANGE_START_KEY);
    localStorage.removeItem(QUESTION_RANGE_END_KEY);
  } catch (_) {}

  return normalizeQuestionRange(
    sessionStorage.getItem(QUESTION_RANGE_START_SESSION_KEY),
    sessionStorage.getItem(QUESTION_RANGE_END_SESSION_KEY)
  );
}

function persistQuestionRangeSelection(range) {
  try {
    localStorage.removeItem(QUESTION_RANGE_START_KEY);
    localStorage.removeItem(QUESTION_RANGE_END_KEY);
  } catch (_) {}

  if (!range?.hasRange) {
    sessionStorage.removeItem(QUESTION_RANGE_START_SESSION_KEY);
    sessionStorage.removeItem(QUESTION_RANGE_END_SESSION_KEY);
    return;
  }

  sessionStorage.setItem(QUESTION_RANGE_START_SESSION_KEY, String(range.start));
  sessionStorage.setItem(QUESTION_RANGE_END_SESSION_KEY, String(range.end));
}

function getQuestionRangeLabel(rangeStart, rangeEnd) {
  if (!Number.isInteger(rangeStart) || !Number.isInteger(rangeEnd)) return '';
  return `Диапазон вопросов ${rangeStart}-${rangeEnd}`;
}

function getThemeLabelWithRange(themeFile, rangeStart, rangeEnd) {
  const baseLabel = getThemeLabel(themeFile);
  const rangeLabel = getQuestionRangeLabel(rangeStart, rangeEnd);
  return rangeLabel ? `${baseLabel} · ${rangeLabel}` : baseLabel;
}

function applyQuestionRange(sourceQuestions, range) {
  if (!Array.isArray(sourceQuestions)) return [];
  if (!range?.hasRange) return sourceQuestions;

  const maxQuestionNumber = sourceQuestions.length;
  const effectiveStart = Math.min(Math.max(1, range.start), maxQuestionNumber || 1);
  const effectiveEnd = Math.min(Math.max(effectiveStart, range.end), maxQuestionNumber || effectiveStart);

  return sourceQuestions.filter((question, index) => {
    const questionNumber = index + 1;
    return questionNumber >= effectiveStart && questionNumber <= effectiveEnd;
  });
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatDateTimeToMinute(timestamp) {
  const d = new Date(timestamp);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTimeToSecond(timestamp) {
  const d = new Date(timestamp);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function getMinuteSeed(timestamp) {
  const d = new Date(timestamp);
  return Number(
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`
  );
}

function formatDuration(totalSeconds) {
  const sec = Math.max(0, Number(totalSeconds) || 0);
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}



function formatStatsNumber(value) {
  const numeric = Number(value);
  const safe = Number.isFinite(numeric) ? numeric : 0;
  return safe.toLocaleString('ru-RU');
}

function formatStatsPercent(value) {
  const numeric = Number(value);
  const safe = Number.isFinite(numeric) ? numeric : 0;
  return `${safe.toFixed(1)}%`;
}

function formatStatsDurationVerbose(totalSeconds) {
  const sec = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  const parts = [];

  if (hours > 0) parts.push(`${hours} ч`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes} мин`);
  parts.push(`${seconds} сек`);
  return parts.join(' ');
}

function clampStatsValue(value, min = 0, max = 100) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.min(max, Math.max(min, numeric));
}

function getDayKey(timestamp) {
  const d = new Date(Number(timestamp) || Date.now());
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getStartOfTodayTimestamp() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
}

function averageStats(values) {
  if (!Array.isArray(values) || !values.length) return 0;
  const safeValues = values.filter((value) => Number.isFinite(Number(value)));
  if (!safeValues.length) return 0;
  return safeValues.reduce((sum, value) => sum + Number(value), 0) / safeValues.length;
}

function buildStatsSummaryFromHistoryEntry(entry) {
  const normalized = normalizeHistoryEntryRecord(entry);
  if (!normalized?.id) return null;

  const answers = Array.isArray(normalized.answers) ? normalized.answers : [];
  const answeredQuestions = normalizeNonNegativeInteger(normalized.totalQuestions, answers.length);
  const plannedQuestions = Math.max(normalizeNonNegativeInteger(normalized.plannedQuestions, answeredQuestions), answeredQuestions);
  const score = normalizeNonNegativeInteger(normalized.score, 0);
  const timeoutCount = answers.filter((answer) => answer?.timeout).length;
  const incorrectCount = Math.max(0, answeredQuestions - score - timeoutCount);
  const skippedCount = Math.max(0, plannedQuestions - answeredQuestions);

  return normalizeStatsSummaryRecord({
    id: normalized.id,
    startedAt: normalized.startedAt,
    finishedAt: normalized.finishedAt,
    durationSeconds: normalized.durationSeconds,
    score,
    answeredQuestions,
    plannedQuestions,
    incorrectCount,
    skippedCount,
    timeoutCount,
    completionType: normalized.completionType || 'finished',
    stopReason: normalized.stopReason || null,
    stopLabel: normalized.stopLabel || null,
    themeFile: normalized.themeFile || null,
    themeLabel: normalized.themeLabel || getThemeLabel(normalized.themeFile),
    testMode: normalizeTestMode(normalized.testMode),
    modeLabel: normalized.modeLabel || getTestModeLabel(normalized.testMode),
    userName: normalizeUserDisplayName(normalized.userName || '—') || '—'
  });
}

function normalizeStatsSummaryRecord(record) {
  if (!record || typeof record !== 'object' || !record.id) return null;

  const startedAt = normalizePositiveTimestamp(record.startedAt);
  if (!startedAt) return null;

  const finishedAt = normalizePositiveTimestamp(record.finishedAt, startedAt);
  if (finishedAt < startedAt) return null;

  const answeredQuestions = normalizeNonNegativeInteger(record.answeredQuestions, 0);
  const plannedQuestions = Math.max(normalizeNonNegativeInteger(record.plannedQuestions, answeredQuestions), answeredQuestions);
  const score = normalizeNonNegativeInteger(record.score, 0);
  if (answeredQuestions <= 0 || plannedQuestions <= 0 || score > answeredQuestions) return null;

  const timeoutCount = normalizeNonNegativeInteger(record.timeoutCount, 0);
  if (timeoutCount > answeredQuestions) return null;

  const incorrectCount = normalizeNonNegativeInteger(record.incorrectCount, Math.max(0, answeredQuestions - score - timeoutCount));
  const skippedCount = normalizeNonNegativeInteger(record.skippedCount, Math.max(0, plannedQuestions - answeredQuestions));
  const durationSeconds = Math.max(1, normalizeNonNegativeInteger(record.durationSeconds, Math.round((finishedAt - startedAt) / 1000)));

  return {
    id: String(record.id),
    startedAt,
    finishedAt,
    durationSeconds,
    score,
    answeredQuestions,
    plannedQuestions,
    incorrectCount,
    skippedCount,
    timeoutCount,
    completionType: record.completionType || 'finished',
    stopReason: record.stopReason || null,
    stopLabel: record.stopLabel || null,
    themeFile: record.themeFile || null,
    themeLabel: record.themeLabel || getThemeLabel(record.themeFile),
    testMode: normalizeTestMode(record.testMode),
    modeLabel: record.modeLabel || getTestModeLabel(record.testMode),
    userName: normalizeUserDisplayName(record.userName || '—') || '—'
  };
}

function normalizeStatsEntries(entries) {
  if (!Array.isArray(entries)) return [];

  const byId = new Map();
  entries.forEach((entry) => {
    const normalized = normalizeStatsSummaryRecord(entry);
    if (!normalized?.id) return;
    const existing = byId.get(normalized.id);
    if (!existing || existing.finishedAt <= normalized.finishedAt) {
      byId.set(normalized.id, normalized);
    }
  });

  const normalized = Array.from(byId.values()).sort((a, b) => a.finishedAt - b.finishedAt);
  return normalized.length > MAX_STATS_ENTRIES ? normalized.slice(-MAX_STATS_ENTRIES) : normalized;
}

function getStatsEntries() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const normalized = normalizeStatsEntries(parsed);
    const historySeed = getHistory()
      .map(buildStatsSummaryFromHistoryEntry)
      .filter(Boolean);
    const combined = normalizeStatsEntries([...normalized, ...historySeed]);

    if (JSON.stringify(parsed) !== JSON.stringify(combined)) {
      localStorage.setItem(STATS_KEY, JSON.stringify(combined));
    }

    return combined;
  } catch {
    return [];
  }
}

function saveStatsEntries(entries) {
  localStorage.setItem(STATS_KEY, JSON.stringify(normalizeStatsEntries(entries)));
}

function upsertStatsSummaryEntry(entry) {
  const summary = buildStatsSummaryFromHistoryEntry(entry);
  if (!summary) return;

  const current = getStatsEntries();
  current.push(summary);
  saveStatsEntries(current);
}

function isInterruptedStatsEntry(entry) {
  return entry?.completionType === 'tab_closed' || entry?.stopReason === 'tab_closed';
}

function isCompletedStatsEntry(entry) {
  return !isInterruptedStatsEntry(entry) && entry?.answeredQuestions >= entry?.plannedQuestions;
}

function isEarlyFinishedStatsEntry(entry) {
  return !isInterruptedStatsEntry(entry) && entry?.answeredQuestions < entry?.plannedQuestions;
}


function compareStatsPerformance(a, b) {
  const scoreDiff = (b?.score || 0) - (a?.score || 0);
  if (scoreDiff !== 0) return scoreDiff;

  const accuracyA = a?.answeredQuestions ? a.score / a.answeredQuestions : 0;
  const accuracyB = b?.answeredQuestions ? b.score / b.answeredQuestions : 0;
  const accuracyDiff = accuracyB - accuracyA;
  if (accuracyDiff !== 0) return accuracyDiff;

  const answeredDiff = (b?.answeredQuestions || 0) - (a?.answeredQuestions || 0);
  if (answeredDiff !== 0) return answeredDiff;

  const plannedDiff = (b?.plannedQuestions || 0) - (a?.plannedQuestions || 0);
  if (plannedDiff !== 0) return plannedDiff;

  const durationDiff = (a?.durationSeconds || 0) - (b?.durationSeconds || 0);
  if (durationDiff !== 0) return durationDiff;

  return (a?.finishedAt || 0) - (b?.finishedAt || 0);
}

function getBestStatsEntry(entries) {
  if (!Array.isArray(entries) || !entries.length) return null;
  return [...entries].sort(compareStatsPerformance)[0] || null;
}

function computeOverallUserIndex(stats) {
  if (!stats) return 0;

  const consistency = clampStatsValue(stats.stabilityScore);
  const activity = clampStatsValue(Math.min(100, stats.activeDays * 4 + stats.totalAttempts * 2));
  const score = (
    stats.overallCorrectPercent * 0.35 +
    stats.completedRate * 0.2 +
    stats.averagePercentPerTest * 0.2 +
    consistency * 0.15 +
    activity * 0.1
  );

  return Math.round(clampStatsValue(score));
}

function getUserLevelByIndex(index) {
  if (index >= 90) return 'Эксперт';
  if (index >= 75) return 'Продвинутый';
  if (index >= 60) return 'Уверенный';
  if (index >= 40) return 'Средний';
  return 'Начальный';
}

function computeStatsSnapshot() {
  const entries = getStatsEntries().sort((a, b) => a.finishedAt - b.finishedAt);
  if (!entries.length) return null;

  const now = Date.now();
  const startOfToday = getStartOfTodayTimestamp();
  const startOf7Days = now - 7 * 24 * 60 * 60 * 1000;
  const startOf30Days = now - 30 * 24 * 60 * 60 * 1000;

  const totalAttempts = entries.length;
  const completedTests = entries.filter(isCompletedStatsEntry).length;
  const earlyFinishedTests = entries.filter(isEarlyFinishedStatsEntry).length;
  const interruptedTests = entries.filter(isInterruptedStatsEntry).length;
  const totalAnsweredQuestions = entries.reduce((sum, entry) => sum + entry.answeredQuestions, 0);
  const totalCorrectAnswers = entries.reduce((sum, entry) => sum + entry.score, 0);
  const totalTimeoutQuestions = entries.reduce((sum, entry) => sum + entry.timeoutCount, 0);
  const totalIncorrectAnswers = entries.reduce((sum, entry) => sum + entry.incorrectCount, 0);
  const totalSkippedQuestions = entries.reduce((sum, entry) => sum + entry.skippedCount, 0);
  const totalPlannedQuestions = entries.reduce((sum, entry) => sum + entry.plannedQuestions, 0);
  const totalDurationSeconds = entries.reduce((sum, entry) => sum + entry.durationSeconds, 0);

  const percentByTest = entries.map((entry) => entry.answeredQuestions > 0 ? (entry.score / entry.answeredQuestions) * 100 : 0);
  const averagePercentPerTest = averageStats(percentByTest);
  const averageCorrectPerTest = totalAttempts ? totalCorrectAnswers / totalAttempts : 0;
  const averageErrorsPerTest = totalAttempts ? totalIncorrectAnswers / totalAttempts : 0;
  const averagePlannedQuestionsPerTest = totalAttempts ? totalPlannedQuestions / totalAttempts : 0;
  const averageAnsweredQuestionsPerTest = totalAttempts ? totalAnsweredQuestions / totalAttempts : 0;
  const averageDurationPerTest = totalAttempts ? totalDurationSeconds / totalAttempts : 0;
  const averageTimePerQuestion = totalAnsweredQuestions ? totalDurationSeconds / totalAnsweredQuestions : 0;
  const averageTimePerCorrect = totalCorrectAnswers ? totalDurationSeconds / totalCorrectAnswers : 0;
  const averageTimePerIncorrect = totalIncorrectAnswers ? totalDurationSeconds / totalIncorrectAnswers : 0;
  const overallCorrectPercent = totalAnsweredQuestions ? (totalCorrectAnswers / totalAnsweredQuestions) * 100 : 0;

  const bestEntry = getBestStatsEntry(entries);

  const lastEntry = entries[entries.length - 1] || null;
  const dayKeys = new Set(entries.map((entry) => getDayKey(entry.finishedAt)));
  const firstStartedAt = entries[0]?.startedAt || now;
  const daysUsing = Math.max(1, Math.floor((getStartOfTodayTimestamp() - new Date(firstStartedAt).setHours(0, 0, 0, 0)) / 86400000) + 1);

  const recentToday = entries.filter((entry) => entry.finishedAt >= startOfToday);
  const recent7 = entries.filter((entry) => entry.finishedAt >= startOf7Days);
  const recent30 = entries.filter((entry) => entry.finishedAt >= startOf30Days);

  const speedEntries = entries.filter((entry) => isSpeedTestMode(entry.testMode));
  const speedCompletedEntries = speedEntries.filter(isCompletedStatsEntry);
  const speedEarlyFinishedEntries = speedEntries.filter(isEarlyFinishedStatsEntry);
  const speedInterruptedEntries = speedEntries.filter(isInterruptedStatsEntry);
  const speedTotalAnsweredQuestions = speedEntries.reduce((sum, entry) => sum + entry.answeredQuestions, 0);
  const speedTotalCorrectAnswers = speedEntries.reduce((sum, entry) => sum + entry.score, 0);
  const speedTotalDurationSeconds = speedEntries.reduce((sum, entry) => sum + entry.durationSeconds, 0);
  const speedAveragePercentPerTest = averageStats(speedEntries.map((entry) => entry.answeredQuestions > 0 ? (entry.score / entry.answeredQuestions) * 100 : 0));
  const speedAverageDurationPerTest = speedEntries.length ? speedTotalDurationSeconds / speedEntries.length : 0;
  const speedCompletedRate = speedEntries.length ? (speedCompletedEntries.length / speedEntries.length) * 100 : 0;
  const speedBestEntry = getBestStatsEntry(speedEntries);
  const speedFastestCompletedEntry = speedCompletedEntries.length
    ? [...speedCompletedEntries].sort((a, b) => ((a?.durationSeconds || 0) - (b?.durationSeconds || 0)) || compareStatsPerformance(a, b))[0]
    : null;

  const averageSquaredDeviation = percentByTest.length
    ? averageStats(percentByTest.map((value) => (value - averagePercentPerTest) ** 2))
    : 0;
  const stdDeviation = Math.sqrt(averageSquaredDeviation);
  const stabilityScore = clampStatsValue(100 - stdDeviation * 2);
  const completedRate = totalAttempts ? (completedTests / totalAttempts) * 100 : 0;
  const earlyFinishedRate = totalAttempts ? (earlyFinishedTests / totalAttempts) * 100 : 0;
  const interruptedRate = totalAttempts ? (interruptedTests / totalAttempts) * 100 : 0;
  const aboveAverageTests = percentByTest.filter((value) => value > averagePercentPerTest).length;
  const belowAverageTests = percentByTest.filter((value) => value < averagePercentPerTest).length;

  const stats = {
    totalAttempts,
    completedTests,
    earlyFinishedTests,
    interruptedTests,
    totalAnsweredQuestions,
    totalCorrectAnswers,
    totalIncorrectAnswers,
    totalSkippedQuestions,
    totalTimeoutQuestions,
    totalPlannedQuestions,
    overallCorrectPercent,
    averagePercentPerTest,
    averageCorrectPerTest,
    averageErrorsPerTest,
    averagePlannedQuestionsPerTest,
    averageAnsweredQuestionsPerTest,
    averageDurationPerTest,
    averageTimePerQuestion,
    averageTimePerCorrect,
    averageTimePerIncorrect,
    bestEntry,
    totalDurationSeconds,
    daysUsing,
    activeDays: dayKeys.size,
    testsToday: recentToday.length,
    tests7Days: recent7.length,
    tests30Days: recent30.length,
    questionsToday: recentToday.reduce((sum, entry) => sum + entry.answeredQuestions, 0),
    questions7Days: recent7.reduce((sum, entry) => sum + entry.answeredQuestions, 0),
    questions30Days: recent30.reduce((sum, entry) => sum + entry.answeredQuestions, 0),
    lastEntry,
    completedRate,
    earlyFinishedRate,
    interruptedRate,
    aboveAverageTests,
    belowAverageTests,
    stabilityScore,
    speedEntriesCount: speedEntries.length,
    speedCompletedTests: speedCompletedEntries.length,
    speedEarlyFinishedTests: speedEarlyFinishedEntries.length,
    speedInterruptedTests: speedInterruptedEntries.length,
    speedTotalAnsweredQuestions,
    speedTotalCorrectAnswers,
    speedTotalDurationSeconds,
    speedAveragePercentPerTest,
    speedAverageDurationPerTest,
    speedCompletedRate,
    speedBestEntry,
    speedFastestCompletedEntry
  };

  stats.userIndex = computeOverallUserIndex(stats);
  stats.userLevel = getUserLevelByIndex(stats.userIndex);
  return stats;
}


function buildStatsMetricItem(label, value, note = '') {
  return `
    <div class="stats-metric-item">
      <div class="stats-metric-label">${escapeHtml(label)}</div>
      <div class="stats-metric-value">${escapeHtml(value)}</div>
      ${note ? `<div class="stats-metric-note">${escapeHtml(note)}</div>` : ''}
    </div>
  `;
}

function getStatsPercentMood(percent) {
  const numeric = Number(percent) || 0;
  if (numeric >= 95) return 'Почти идеально';
  if (numeric >= 85) return 'Очень сильный результат';
  if (numeric >= 70) return 'Хороший темп';
  if (numeric >= 50) return 'Есть база';
  return 'Нужно подтянуть';
}

function formatStatsScoreLine(entry) {
  if (!entry) return '—';
  return `${formatStatsNumber(entry.score)} из ${formatStatsNumber(entry.answeredQuestions)}`;
}

function buildStatsHeroCard(stats, bestPercent) {
  if (!stats.bestEntry) {
    return `
      <div class="stats-hero-card">
        <div class="stats-hero-title">Лучший результат</div>
        <div class="stats-hero-score">—</div>
        <div class="stats-hero-subtitle">Результаты появятся после завершения тестов</div>
      </div>
    `;
  }

  const bestDuration = formatStatsDurationVerbose(stats.bestEntry.durationSeconds || 0);
  const bestTheme = stats.bestEntry.themeLabel || 'Без темы';
  const totalQuestions = stats.bestEntry.totalQuestions || stats.bestEntry.answeredQuestions || 0;

  return `
    <div class="stats-hero-card">
      <div class="stats-hero-title">Лучший результат</div>
      <div class="stats-hero-score">${escapeHtml(formatStatsScoreLine(stats.bestEntry))}</div>
      <div class="stats-hero-subtitle">${escapeHtml(formatStatsPercent(bestPercent))} • ${escapeHtml(getStatsPercentMood(bestPercent))}</div>
      <div class="stats-pill-row">
        <div class="stats-pill">Тема: ${escapeHtml(bestTheme)}</div>
        <div class="stats-pill">Всего в тесте: ${escapeHtml(formatStatsNumber(totalQuestions))}</div>
        <div class="stats-pill">Время: ${escapeHtml(bestDuration)}</div>
      </div>
    </div>
  `;
}

function buildStatsSummaryCard(label, value, note = '', accent = '') {
  const accentClass = accent ? ` stats-highlight-card--${accent}` : '';
  return `
    <div class="stats-highlight-card${accentClass}">
      <div class="stats-highlight-label">${escapeHtml(label)}</div>
      <div class="stats-highlight-value">${escapeHtml(value)}</div>
      ${note ? `<div class="stats-highlight-note">${escapeHtml(note)}</div>` : ''}
    </div>
  `;
}

function renderStatsContent() {
  const container = document.getElementById('stats-content');
  if (!container) return;

  const stats = computeStatsSnapshot();
  if (!stats) {
    container.innerHTML = `
      <div class="history-empty">
        Статистика пока пустая. Сначала завершите хотя бы один тест.
      </div>
    `;
    return;
  }

  const bestPercent = stats.bestEntry?.answeredQuestions
    ? (stats.bestEntry.score / stats.bestEntry.answeredQuestions) * 100
    : 0;
  const lastPercent = stats.lastEntry?.answeredQuestions
    ? (stats.lastEntry.score / stats.lastEntry.answeredQuestions) * 100
    : 0;
  const averagePercentMood = getStatsPercentMood(stats.averagePercentPerTest);
  const levelNote = `${stats.userLevel} • индекс ${formatStatsNumber(stats.userIndex)}`;
  const speedBestPercent = stats.speedBestEntry?.answeredQuestions
    ? (stats.speedBestEntry.score / stats.speedBestEntry.answeredQuestions) * 100
    : 0;
  const speedFastestPercent = stats.speedFastestCompletedEntry?.answeredQuestions
    ? (stats.speedFastestCompletedEntry.score / stats.speedFastestCompletedEntry.answeredQuestions) * 100
    : 0;
  const speedAverageMood = getStatsPercentMood(stats.speedAveragePercentPerTest);

  container.innerHTML = `
    <div class="stats-highlight-grid">
      ${buildStatsHeroCard(stats, bestPercent)}
      ${buildStatsSummaryCard('Всего попыток', formatStatsNumber(stats.totalAttempts), `${formatStatsNumber(stats.completedTests)} завершено • ${formatStatsNumber(stats.interruptedTests)} прервано`, 'calm')}
      ${buildStatsSummaryCard('Средний результат', formatStatsPercent(stats.averagePercentPerTest), averagePercentMood, 'success')}
      ${buildStatsSummaryCard('⚡ Режим скорости', formatStatsNumber(stats.speedEntriesCount), `${formatStatsNumber(stats.speedCompletedTests)} завершено • ${formatStatsDurationVerbose(stats.speedAverageDurationPerTest)}`, 'speed')}
      ${buildStatsSummaryCard('Последний результат', stats.lastEntry ? formatStatsScoreLine(stats.lastEntry) : '—', stats.lastEntry ? `${formatStatsPercent(lastPercent)} • ${formatDateTimeToSecond(stats.lastEntry.finishedAt)}` : 'Нет завершённых тестов', 'warm')}
      ${buildStatsSummaryCard('Время в тестах', formatStatsDurationVerbose(stats.totalDurationSeconds), `${formatStatsNumber(stats.activeDays)} активных дней`, 'violet')}
      ${buildStatsSummaryCard('Уровень пользователя', stats.userLevel, levelNote, 'dark')}
    </div>

    <div class="stats-section">
      <div class="stats-section-title">Основные показатели</div>
      <div class="stats-metric-grid">
        ${buildStatsMetricItem('Общее количество пройденных тестов', formatStatsNumber(stats.totalAttempts))}
        ${buildStatsMetricItem('Общее количество завершённых тестов', formatStatsNumber(stats.completedTests))}
        ${buildStatsMetricItem('Общее количество досрочно завершённых тестов', formatStatsNumber(stats.earlyFinishedTests))}
        ${buildStatsMetricItem('Общее количество незавершённых, прерванных тестов', formatStatsNumber(stats.interruptedTests))}
        ${buildStatsMetricItem('Общее количество всех попыток', formatStatsNumber(stats.totalAttempts))}
        ${buildStatsMetricItem('Общее количество отвеченных вопросов', formatStatsNumber(stats.totalAnsweredQuestions))}
        ${buildStatsMetricItem('Общее количество правильных ответов', formatStatsNumber(stats.totalCorrectAnswers))}
        ${buildStatsMetricItem('Общее количество неправильных ответов', formatStatsNumber(stats.totalIncorrectAnswers))}
        ${buildStatsMetricItem('Общее количество пропущенных вопросов', formatStatsNumber(stats.totalSkippedQuestions))}
        ${buildStatsMetricItem('Общее количество вопросов, у которых время закончилось', formatStatsNumber(stats.totalTimeoutQuestions))}
        ${buildStatsMetricItem('Общий процент правильных ответов', formatStatsPercent(stats.overallCorrectPercent), getStatsPercentMood(stats.overallCorrectPercent))}
      </div>
    </div>

    <div class="stats-section">
      <div class="stats-section-title">Средние значения</div>
      <div class="stats-metric-grid">
        ${buildStatsMetricItem('Средний процент за тест', formatStatsPercent(stats.averagePercentPerTest), averagePercentMood)}
        ${buildStatsMetricItem('Среднее количество правильных ответов за тест', formatStatsNumber(stats.averageCorrectPerTest.toFixed(1)))}
        ${buildStatsMetricItem('Среднее количество ошибок за тест', formatStatsNumber(stats.averageErrorsPerTest.toFixed(1)))}
        ${buildStatsMetricItem('Среднее количество вопросов в одном тесте', formatStatsNumber(stats.averagePlannedQuestionsPerTest.toFixed(1)))}
        ${buildStatsMetricItem('Среднее количество реально отвеченных вопросов за тест', formatStatsNumber(stats.averageAnsweredQuestionsPerTest.toFixed(1)))}
        ${buildStatsMetricItem('Среднее время одного теста', formatStatsDurationVerbose(stats.averageDurationPerTest))}
        ${buildStatsMetricItem('Среднее время на один вопрос', formatStatsDurationVerbose(stats.averageTimePerQuestion))}
        ${buildStatsMetricItem('Среднее время на один правильный ответ', formatStatsDurationVerbose(stats.averageTimePerCorrect))}
        ${buildStatsMetricItem('Среднее время на один неправильный ответ', formatStatsDurationVerbose(stats.averageTimePerIncorrect))}
      </div>
    </div>

    <div class="stats-section">
      <div class="stats-section-title">Лучший результат и время</div>
      <div class="stats-metric-grid">
        ${buildStatsMetricItem('Лучший результат за всё время', stats.bestEntry ? formatStatsScoreLine(stats.bestEntry) : '—', stats.bestEntry ? `${formatStatsPercent(bestPercent)} • ${stats.bestEntry.themeLabel || '—'} • ${formatStatsDurationVerbose(stats.bestEntry.durationSeconds || 0)}` : '')}
        ${buildStatsMetricItem('Общее время в тестах', formatStatsDurationVerbose(stats.totalDurationSeconds))}
        ${buildStatsMetricItem('Последний результат', stats.lastEntry ? formatStatsScoreLine(stats.lastEntry) : '—', stats.lastEntry ? `${formatStatsPercent(lastPercent)} • ${formatDateTimeToSecond(stats.lastEntry.finishedAt)}` : '')}
      </div>
    </div>

    <div class="stats-section">
      <div class="stats-section-title">Итоги активности</div>
      <div class="stats-metric-grid">
        ${buildStatsMetricItem('Сколько дней пользователь уже пользуется ботом', formatStatsNumber(stats.daysUsing))}
        ${buildStatsMetricItem('Сколько дней был активен', formatStatsNumber(stats.activeDays))}
        ${buildStatsMetricItem('Сколько тестов решил сегодня', formatStatsNumber(stats.testsToday))}
        ${buildStatsMetricItem('Сколько тестов решил за 7 дней', formatStatsNumber(stats.tests7Days))}
        ${buildStatsMetricItem('Сколько тестов решил за 30 дней', formatStatsNumber(stats.tests30Days))}
        ${buildStatsMetricItem('Сколько вопросов решил сегодня', formatStatsNumber(stats.questionsToday))}
        ${buildStatsMetricItem('Сколько вопросов решил за неделю', formatStatsNumber(stats.questions7Days))}
        ${buildStatsMetricItem('Сколько вопросов решил за месяц', formatStatsNumber(stats.questions30Days))}
        ${buildStatsMetricItem('Последняя дата прохождения теста', stats.lastEntry ? formatDateTimeToSecond(stats.lastEntry.finishedAt) : '—')}
      </div>
    </div>

    <div class="stats-section">
      <div class="stats-section-title">Стабильность и завершение</div>
      <div class="stats-metric-grid">
        ${buildStatsMetricItem('Процент завершённых тестов от всех начатых', formatStatsPercent(stats.completedRate))}
        ${buildStatsMetricItem('Процент досрочно завершённых тестов', formatStatsPercent(stats.earlyFinishedRate))}
        ${buildStatsMetricItem('Процент незавершённых, прерванных тестов', formatStatsPercent(stats.interruptedRate))}
        ${buildStatsMetricItem('Количество тестов выше среднего результата', formatStatsNumber(stats.aboveAverageTests))}
        ${buildStatsMetricItem('Количество тестов ниже среднего результата', formatStatsNumber(stats.belowAverageTests))}
        ${buildStatsMetricItem('Стабильность результатов', formatStatsPercent(stats.stabilityScore))}
        ${buildStatsMetricItem('Общий индекс пользователя', formatStatsNumber(stats.userIndex), stats.userLevel)}
      </div>
    </div>


    <div class="stats-section stats-section-speed">
      <div class="stats-section-title">⚡ Режим на скорость</div>
      <div class="stats-metric-grid">
        ${buildStatsMetricItem('Тестов в режиме скорости', formatStatsNumber(stats.speedEntriesCount))}
        ${buildStatsMetricItem('Завершено в режиме скорости', formatStatsNumber(stats.speedCompletedTests), `Процент завершения: ${formatStatsPercent(stats.speedCompletedRate)}`)}
        ${buildStatsMetricItem('Досрочно завершено в режиме скорости', formatStatsNumber(stats.speedEarlyFinishedTests))}
        ${buildStatsMetricItem('Прервано в режиме скорости', formatStatsNumber(stats.speedInterruptedTests))}
        ${buildStatsMetricItem('Решено вопросов в режиме скорости', formatStatsNumber(stats.speedTotalAnsweredQuestions))}
        ${buildStatsMetricItem('Верных ответов в режиме скорости', formatStatsNumber(stats.speedTotalCorrectAnswers))}
        ${buildStatsMetricItem('Средний результат в режиме скорости', formatStatsPercent(stats.speedAveragePercentPerTest), speedAverageMood)}
        ${buildStatsMetricItem('Среднее время теста в режиме скорости', formatStatsDurationVerbose(stats.speedAverageDurationPerTest))}
        ${buildStatsMetricItem('Лучший результат в режиме скорости', stats.speedBestEntry ? formatStatsScoreLine(stats.speedBestEntry) : '—', stats.speedBestEntry ? `${formatStatsPercent(speedBestPercent)} • ${stats.speedBestEntry.themeLabel || '—'} • ${formatStatsDurationVerbose(stats.speedBestEntry.durationSeconds || 0)}` : 'Пока нет завершённых тестов на скорость')}
        ${buildStatsMetricItem('Рекорд скорости', stats.speedFastestCompletedEntry ? formatStatsDurationVerbose(stats.speedFastestCompletedEntry.durationSeconds || 0) : '—', stats.speedFastestCompletedEntry ? `${formatStatsScoreLine(stats.speedFastestCompletedEntry)} • ${formatStatsPercent(speedFastestPercent)}` : 'Пока нет полностью завершённых тестов на скорость')}
      </div>
    </div>

    <div class="stats-section">
      <div class="stats-section-title">Полезные сводки</div>
      <div class="stats-metric-grid">
        ${buildStatsMetricItem('Тестов пройдено', formatStatsNumber(stats.totalAttempts))}
        ${buildStatsMetricItem('Вопросов решено', formatStatsNumber(stats.totalAnsweredQuestions))}
        ${buildStatsMetricItem('Верных ответов', formatStatsNumber(stats.totalCorrectAnswers))}
        ${buildStatsMetricItem('Ошибок', formatStatsNumber(stats.totalIncorrectAnswers))}
        ${buildStatsMetricItem('Пропущено', formatStatsNumber(stats.totalSkippedQuestions))}
        ${buildStatsMetricItem('Время вышло', formatStatsNumber(stats.totalTimeoutQuestions))}
        ${buildStatsMetricItem('Средний результат', formatStatsPercent(stats.averagePercentPerTest), averagePercentMood)}
        ${buildStatsMetricItem('Общий уровень', stats.userLevel, `Индекс: ${formatStatsNumber(stats.userIndex)}`)}
      </div>
    </div>
  `;
}

function initStatsUi(options = {}) {
  if (statsUiReady) return;
  statsUiReady = true;

  const withButton = options.withButton === true;
  let button = null;

  if (withButton) {
    button = document.createElement('button');
    button.id = 'stats-toggle';
    button.className = 'history-toggle';
    button.textContent = 'Статистика';
  }

  const modal = document.createElement('div');
  modal.id = 'stats-modal';
  modal.className = 'history-modal hidden';
  modal.innerHTML = `
    <div class="history-panel stats-panel">
      <div class="history-panel-header">
        <div>
          <div class="history-title">Статистика</div>
          <div class="history-subtitle">Общие показатели, средние значения, активность и индекс пользователя</div>
        </div>
        <button id="stats-close" class="history-close" aria-label="Закрыть">×</button>
      </div>
      <div id="stats-content" class="stats-content"></div>
    </div>
  `;

  if (button) document.body.appendChild(button);
  document.body.appendChild(modal);

  button?.addEventListener('click', openStatsModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeStatsModal();
  });
  modal.querySelector('#stats-close')?.addEventListener('click', closeStatsModal);
}

function openStatsModal() {
  renderStatsContent();
  document.body.classList.add('stats-modal-open');
  document.body.classList.add('app-surface-open');
  document.getElementById('stats-modal')?.classList.remove('hidden');
}

function closeStatsModal() {
  document.body.classList.remove('stats-modal-open');
  document.body.classList.remove('app-surface-open');
  document.getElementById('stats-modal')?.classList.add('hidden');
}

function normalizeUserDisplayName(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function getStoredUserName() {
  try {
    return normalizeUserDisplayName(localStorage.getItem(USER_NAME_KEY));
  } catch {
    return '';
  }
}

function saveUserName(value, source = 'manual') {
  const normalized = normalizeUserDisplayName(value);
  if (!normalized) return '';

  try {
    localStorage.setItem(USER_NAME_KEY, normalized);
    localStorage.setItem(USER_NAME_SOURCE_KEY, String(source || 'manual'));
  } catch {
    // ничего
  }

  renderUserNameBadge();
  return normalized;
}

function normalizeTelegramUserId(value) {
  if (value === null || value === undefined || value === '') return '';

  const raw = String(value).trim();
  if (!raw) return '';

  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 0) {
    return String(Math.trunc(numeric));
  }

  return /^\d+$/.test(raw) ? raw : '';
}

function normalizeTelegramUsername(value) {
  return String(value ?? '')
    .replace(/^@+/, '')
    .replace(/\s+/g, '')
    .trim()
    .slice(0, 64);
}

function extractTelegramWebAppUserMeta(user) {
  if (!user || typeof user !== 'object') {
    return { userId: '', username: '' };
  }

  return {
    userId: normalizeTelegramUserId(user.id),
    username: normalizeTelegramUsername(user.username)
  };
}

function getStoredTelegramUserMeta() {
  try {
    const raw = localStorage.getItem(TELEGRAM_USER_META_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      userId: normalizeTelegramUserId(parsed?.userId),
      username: normalizeTelegramUsername(parsed?.username)
    };
  } catch {
    return { userId: '', username: '' };
  }
}

function saveTelegramUserMeta(meta) {
  const normalized = {
    userId: normalizeTelegramUserId(meta?.userId),
    username: normalizeTelegramUsername(meta?.username)
  };

  try {
    localStorage.setItem(TELEGRAM_USER_META_KEY, JSON.stringify(normalized));
  } catch {
    // ничего
  }

  return normalized;
}

function getCurrentTelegramUserMeta() {
  const liveMeta = extractTelegramWebAppUserMeta(window.Telegram?.WebApp?.initDataUnsafe?.user);
  if (liveMeta.userId || liveMeta.username) {
    return saveTelegramUserMeta(liveMeta);
  }
  return getStoredTelegramUserMeta();
}

function formatTelegramUsernameForReport(value) {
  const username = normalizeTelegramUsername(value);
  return username ? `@${username}` : 'недоступен';
}


function clipFrontEndMetaString(value, maxLength = 280) {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

function normalizeFrontEndMeta(meta) {
  const raw = meta && typeof meta === 'object' ? meta : {};
  const normalizeNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
  const normalizeBoolean = (value) => typeof value === 'boolean' ? value : null;
  const normalizeString = (value, maxLength = 280) => clipFrontEndMetaString(value, maxLength);
  const normalizeStringArray = (value, maxItems = 8, maxLength = 48) => Array.isArray(value)
    ? value.map((item) => normalizeString(item, maxLength)).filter(Boolean).slice(0, maxItems)
    : [];

  return {
    capturedAt: normalizeNumber(raw.capturedAt),
    deviceModel: normalizeString(raw.deviceModel, 120),
    osName: normalizeString(raw.osName, 80),
    osVersion: normalizeString(raw.osVersion, 80),
    browserName: normalizeString(raw.browserName, 80),
    browserVersion: normalizeString(raw.browserVersion, 80),
    userAgent: normalizeString(raw.userAgent, 700),
    platform: normalizeString(raw.platform, 120),
    language: normalizeString(raw.language, 40),
    languages: normalizeStringArray(raw.languages, 8, 32),
    timezone: normalizeString(raw.timezone, 80),
    online: normalizeBoolean(raw.online),
    cookieEnabled: normalizeBoolean(raw.cookieEnabled),
    hardwareConcurrency: normalizeNumber(raw.hardwareConcurrency),
    deviceMemory: normalizeNumber(raw.deviceMemory),
    maxTouchPoints: normalizeNumber(raw.maxTouchPoints),
    screenWidth: normalizeNumber(raw.screenWidth),
    screenHeight: normalizeNumber(raw.screenHeight),
    availWidth: normalizeNumber(raw.availWidth),
    availHeight: normalizeNumber(raw.availHeight),
    colorDepth: normalizeNumber(raw.colorDepth),
    viewportWidth: normalizeNumber(raw.viewportWidth),
    viewportHeight: normalizeNumber(raw.viewportHeight),
    devicePixelRatio: normalizeNumber(raw.devicePixelRatio),
    connectionType: normalizeString(raw.connectionType, 40),
    connectionEffectiveType: normalizeString(raw.connectionEffectiveType, 40),
    connectionDownlink: normalizeNumber(raw.connectionDownlink),
    connectionRtt: normalizeNumber(raw.connectionRtt),
    connectionSaveData: normalizeBoolean(raw.connectionSaveData),
    telegramWebAppAvailable: normalizeBoolean(raw.telegramWebAppAvailable),
    telegramWebAppPlatform: normalizeString(raw.telegramWebAppPlatform, 80),
    telegramWebAppVersion: normalizeString(raw.telegramWebAppVersion, 80),
    telegramWebAppColorScheme: normalizeString(raw.telegramWebAppColorScheme, 40),
    telegramWebAppIsExpanded: normalizeBoolean(raw.telegramWebAppIsExpanded),
    telegramWebAppViewportHeight: normalizeNumber(raw.telegramWebAppViewportHeight),
    telegramWebAppViewportStableHeight: normalizeNumber(raw.telegramWebAppViewportStableHeight),
    telegramStartParam: normalizeString(raw.telegramStartParam, 120),
    telegramThemeParamsKeys: normalizeNumber(raw.telegramThemeParamsKeys),
    telegramAndroidAppVersion: normalizeString(raw.telegramAndroidAppVersion, 40),
    telegramAndroidVersion: normalizeString(raw.telegramAndroidVersion, 40),
    telegramAndroidSdkVersion: normalizeString(raw.telegramAndroidSdkVersion, 40),
    telegramAndroidPerformanceClass: normalizeString(raw.telegramAndroidPerformanceClass, 40)
  };
}

function isMeaningfulFrontEndMeta(meta) {
  const normalized = normalizeFrontEndMeta(meta);
  return Boolean(
    normalized.userAgent
    || normalized.deviceModel
    || normalized.osName
    || normalized.browserName
    || normalized.language
    || normalized.timezone
    || (normalized.screenWidth !== null && normalized.screenWidth > 0 && normalized.screenHeight !== null && normalized.screenHeight > 0)
    || (normalized.viewportWidth !== null && normalized.viewportWidth > 0 && normalized.viewportHeight !== null && normalized.viewportHeight > 0)
    || (normalized.hardwareConcurrency !== null && normalized.hardwareConcurrency > 0)
    || (normalized.deviceMemory !== null && normalized.deviceMemory > 0)
    || normalized.telegramWebAppAvailable === true
    || normalized.telegramWebAppPlatform
    || normalized.telegramWebAppVersion
  );
}

function mergeFrontEndMetaSnapshots(baseMeta, candidateMeta) {
  const base = normalizeFrontEndMeta(baseMeta);
  const candidate = normalizeFrontEndMeta(candidateMeta);
  const merged = { ...base };
  const numericKeys = [
    'capturedAt',
    'hardwareConcurrency',
    'deviceMemory',
    'maxTouchPoints',
    'screenWidth',
    'screenHeight',
    'availWidth',
    'availHeight',
    'colorDepth',
    'viewportWidth',
    'viewportHeight',
    'devicePixelRatio',
    'connectionDownlink',
    'connectionRtt',
    'telegramWebAppViewportHeight',
    'telegramWebAppViewportStableHeight',
    'telegramThemeParamsKeys'
  ];
  const positiveOnlyNumericKeys = new Set([
    'screenWidth',
    'screenHeight',
    'availWidth',
    'availHeight',
    'viewportWidth',
    'viewportHeight',
    'devicePixelRatio',
    'hardwareConcurrency',
    'deviceMemory',
    'maxTouchPoints',
    'connectionDownlink',
    'telegramWebAppViewportHeight',
    'telegramWebAppViewportStableHeight'
  ]);
  const stringKeys = [
    'deviceModel',
    'osName',
    'osVersion',
    'browserName',
    'browserVersion',
    'userAgent',
    'platform',
    'language',
    'timezone',
    'connectionType',
    'connectionEffectiveType',
    'telegramWebAppPlatform',
    'telegramWebAppVersion',
    'telegramWebAppColorScheme',
    'telegramStartParam',
    'telegramAndroidAppVersion',
    'telegramAndroidVersion',
    'telegramAndroidSdkVersion',
    'telegramAndroidPerformanceClass'
  ];
  const booleanKeys = [
    'online',
    'cookieEnabled',
    'connectionSaveData',
    'telegramWebAppAvailable',
    'telegramWebAppIsExpanded'
  ];

  numericKeys.forEach((key) => {
    const value = candidate[key];
    if (value === null || value === undefined || Number.isNaN(value)) return;
    if (positiveOnlyNumericKeys.has(key) && Number(value) <= 0) return;
    merged[key] = Number(value);
  });

  stringKeys.forEach((key) => {
    const value = candidate[key];
    if (typeof value === 'string' && value.trim()) {
      merged[key] = value;
    }
  });

  booleanKeys.forEach((key) => {
    const value = candidate[key];
    if (typeof value === 'boolean') {
      merged[key] = value;
    }
  });

  if (Array.isArray(candidate.languages) && candidate.languages.length) {
    merged.languages = [...candidate.languages];
  }

  return normalizeFrontEndMeta(merged);
}

function getStoredFrontEndMetaSnapshot() {
  try {
    const raw = localStorage.getItem(FRONTEND_META_CACHE_KEY);
    if (!raw) return normalizeFrontEndMeta({});
    return normalizeFrontEndMeta(JSON.parse(raw));
  } catch {
    return normalizeFrontEndMeta({});
  }
}

function storeFrontEndMetaSnapshot(meta) {
  try {
    const merged = mergeFrontEndMetaSnapshots(getStoredFrontEndMetaSnapshot(), meta);
    if (!isMeaningfulFrontEndMeta(merged)) return merged;
    localStorage.setItem(FRONTEND_META_CACHE_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return normalizeFrontEndMeta(meta);
  }
}

function getBestAvailableFrontEndMeta(preferredMeta = null, options = {}) {
  let merged = mergeFrontEndMetaSnapshots(getStoredFrontEndMetaSnapshot(), preferredMeta);
  const canCollectLive = options.collectLive === false ? false : document.visibilityState !== 'hidden';

  if (canCollectLive) {
    merged = mergeFrontEndMetaSnapshots(merged, collectFrontEndMeta());
  }

  if (options.persist !== false) {
    merged = storeFrontEndMetaSnapshot(merged);
  }

  return normalizeFrontEndMeta(merged);
}

function parseTelegramAndroidUserAgentDetails(userAgent) {
  const normalizedUa = String(userAgent || '');
  const match = normalizedUa.match(/Telegram-Android\/([^\s]+)\s+\(([^;]+);\s*Android\s+([^;]+);\s*SDK\s+([^;]+);\s*([^)]+)\)/i);
  if (!match) {
    return {
      appVersion: '',
      deviceModel: '',
      androidVersion: '',
      sdkVersion: '',
      performanceClass: ''
    };
  }

  return {
    appVersion: clipFrontEndMetaString(match[1], 40),
    deviceModel: clipFrontEndMetaString(match[2], 120),
    androidVersion: clipFrontEndMetaString(match[3], 40),
    sdkVersion: clipFrontEndMetaString(match[4], 40),
    performanceClass: clipFrontEndMetaString(match[5], 40)
  };
}

function detectBrowserFromUserAgent(userAgent) {
  const ua = String(userAgent || '');
  const rules = [
    [/Edg\/([\d.]+)/i, 'Edge'],
    [/OPR\/([\d.]+)/i, 'Opera'],
    [/SamsungBrowser\/([\d.]+)/i, 'Samsung Browser'],
    [/Chrome\/([\d.]+)/i, 'Chrome'],
    [/Firefox\/([\d.]+)/i, 'Firefox'],
    [/Version\/([\d.]+).*Safari/i, 'Safari']
  ];

  for (const [pattern, name] of rules) {
    const match = ua.match(pattern);
    if (match) {
      return {
        name,
        version: clipFrontEndMetaString(match[1], 40)
      };
    }
  }

  return {
    name: '',
    version: ''
  };
}

function detectOsFromUserAgent(userAgent, platformHint = '') {
  const ua = String(userAgent || '');
  const platform = String(platformHint || '');
  const rules = [
    [/Android\s+([\d.]+)/i, 'Android'],
    [/(?:iPhone|iPad|iPod).*OS\s([\d_]+)/i, 'iOS'],
    [/Windows NT\s+([\d.]+)/i, 'Windows'],
    [/Mac OS X\s+([\d_]+)/i, 'macOS']
  ];

  for (const [pattern, name] of rules) {
    const match = ua.match(pattern);
    if (match) {
      return {
        name,
        version: clipFrontEndMetaString(String(match[1]).replace(/_/g, '.'), 40)
      };
    }
  }

  if (/Linux/i.test(platform) || /Linux/i.test(ua)) {
    return { name: 'Linux', version: '' };
  }

  return {
    name: '',
    version: ''
  };
}

function detectDeviceModel(userAgent) {
  const ua = String(userAgent || '');
  const telegramAndroidMeta = parseTelegramAndroidUserAgentDetails(ua);
  if (telegramAndroidMeta.deviceModel) {
    return telegramAndroidMeta.deviceModel;
  }

  const androidBuildMatch = ua.match(/Android[^;]*;\s*([^;()]+?)\s+Build\//i);
  if (androidBuildMatch?.[1]) {
    return clipFrontEndMetaString(androidBuildMatch[1], 120);
  }

  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Windows/i.test(ua)) return 'Windows device';
  if (/Macintosh/i.test(ua)) return 'Mac';
  if (/Linux/i.test(ua)) return 'Linux device';

  return '';
}

function formatFrontEndBoolean(value) {
  return value === null || value === undefined ? 'недоступно' : (value ? 'да' : 'нет');
}

function formatFrontEndDimension(width, height) {
  const normalizedWidth = Number.isFinite(Number(width)) ? Number(width) : null;
  const normalizedHeight = Number.isFinite(Number(height)) ? Number(height) : null;
  if (normalizedWidth === null || normalizedHeight === null) return 'недоступно';
  return `${normalizedWidth}×${normalizedHeight}`;
}

function collectFrontEndMeta() {
  const nav = window.navigator || {};
  const ua = String(nav.userAgent || '');
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection || null;
  const telegramWebApp = window.Telegram?.WebApp;
  const browserMeta = detectBrowserFromUserAgent(ua);
  const osMeta = detectOsFromUserAgent(ua, nav.platform || telegramWebApp?.platform || '');
  const telegramAndroidMeta = parseTelegramAndroidUserAgentDetails(ua);
  let timeZone = '';

  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    timeZone = '';
  }

  return normalizeFrontEndMeta({
    capturedAt: Date.now(),
    deviceModel: detectDeviceModel(ua),
    osName: osMeta.name,
    osVersion: telegramAndroidMeta.androidVersion || osMeta.version,
    browserName: browserMeta.name,
    browserVersion: browserMeta.version,
    userAgent: ua,
    platform: nav.platform || telegramWebApp?.platform || '',
    language: nav.language || '',
    languages: Array.isArray(nav.languages) ? nav.languages : [],
    timezone: timeZone,
    online: typeof nav.onLine === 'boolean' ? nav.onLine : null,
    cookieEnabled: typeof nav.cookieEnabled === 'boolean' ? nav.cookieEnabled : null,
    hardwareConcurrency: nav.hardwareConcurrency,
    deviceMemory: nav.deviceMemory,
    maxTouchPoints: nav.maxTouchPoints,
    screenWidth: window.screen?.width,
    screenHeight: window.screen?.height,
    availWidth: window.screen?.availWidth,
    availHeight: window.screen?.availHeight,
    colorDepth: window.screen?.colorDepth,
    viewportWidth: window.innerWidth || document.documentElement?.clientWidth,
    viewportHeight: window.innerHeight || document.documentElement?.clientHeight,
    devicePixelRatio: window.devicePixelRatio,
    connectionType: connection?.type,
    connectionEffectiveType: connection?.effectiveType,
    connectionDownlink: connection?.downlink,
    connectionRtt: connection?.rtt,
    connectionSaveData: typeof connection?.saveData === 'boolean' ? connection.saveData : null,
    telegramWebAppAvailable: !!telegramWebApp,
    telegramWebAppPlatform: telegramWebApp?.platform,
    telegramWebAppVersion: telegramWebApp?.version,
    telegramWebAppColorScheme: telegramWebApp?.colorScheme,
    telegramWebAppIsExpanded: typeof telegramWebApp?.isExpanded === 'boolean' ? telegramWebApp.isExpanded : null,
    telegramWebAppViewportHeight: telegramWebApp?.viewportHeight,
    telegramWebAppViewportStableHeight: telegramWebApp?.viewportStableHeight,
    telegramStartParam: telegramWebApp?.initDataUnsafe?.start_param,
    telegramThemeParamsKeys: telegramWebApp?.themeParams ? Object.keys(telegramWebApp.themeParams).length : null,
    telegramAndroidAppVersion: telegramAndroidMeta.appVersion,
    telegramAndroidVersion: telegramAndroidMeta.androidVersion,
    telegramAndroidSdkVersion: telegramAndroidMeta.sdkVersion,
    telegramAndroidPerformanceClass: telegramAndroidMeta.performanceClass
  });
}

function buildFrontEndReportLines(frontendMeta) {
  const meta = normalizeFrontEndMeta(frontendMeta || collectFrontEndMeta());
  const osLabel = meta.osName ? `${meta.osName}${meta.osVersion ? ` ${meta.osVersion}` : ''}` : 'недоступно';
  const browserLabel = meta.browserName ? `${meta.browserName}${meta.browserVersion ? ` ${meta.browserVersion}` : ''}` : 'недоступно';
  const connectionParts = [];
  if (meta.connectionEffectiveType) connectionParts.push(`effective=${meta.connectionEffectiveType}`);
  if (meta.connectionType) connectionParts.push(`type=${meta.connectionType}`);
  if (meta.connectionDownlink !== null) connectionParts.push(`downlink=${meta.connectionDownlink}Mb/s`);
  if (meta.connectionRtt !== null) connectionParts.push(`rtt=${meta.connectionRtt}ms`);
  if (meta.connectionSaveData !== null) connectionParts.push(`saveData=${meta.connectionSaveData ? 'on' : 'off'}`);
  const cpuRamLabel = [
    meta.hardwareConcurrency !== null ? `${meta.hardwareConcurrency} cores` : '',
    meta.deviceMemory !== null ? `${meta.deviceMemory} GB RAM` : ''
  ].filter(Boolean).join(' • ') || 'недоступно';
  const telegramParts = [];
  telegramParts.push(meta.telegramWebAppAvailable ? 'available' : 'not available');
  if (meta.telegramWebAppPlatform) telegramParts.push(`platform=${meta.telegramWebAppPlatform}`);
  if (meta.telegramWebAppVersion) telegramParts.push(`version=${meta.telegramWebAppVersion}`);
  if (meta.telegramWebAppColorScheme) telegramParts.push(`theme=${meta.telegramWebAppColorScheme}`);
  if (meta.telegramWebAppIsExpanded !== null) telegramParts.push(`expanded=${meta.telegramWebAppIsExpanded ? 'yes' : 'no'}`);
  if (meta.telegramWebAppViewportStableHeight !== null) telegramParts.push(`stableViewport=${meta.telegramWebAppViewportStableHeight}`);
  if (meta.telegramAndroidPerformanceClass) telegramParts.push(`perf=${meta.telegramAndroidPerformanceClass}`);
  if (meta.telegramAndroidAppVersion) telegramParts.push(`tgAndroid=${meta.telegramAndroidAppVersion}`);
  if (meta.telegramAndroidSdkVersion) telegramParts.push(`sdk=${meta.telegramAndroidSdkVersion}`);

  return [
    '',
    'Данные фронтенда:',
    `📱 Устройство: ${meta.deviceModel || 'недоступно'}`,
    `🧩 ОС: ${osLabel}`,
    `🌐 Браузер/WebView: ${browserLabel}`,
    `🖥 Экран: ${formatFrontEndDimension(meta.screenWidth, meta.screenHeight)} • viewport ${formatFrontEndDimension(meta.viewportWidth, meta.viewportHeight)} • DPR ${meta.devicePixelRatio !== null ? meta.devicePixelRatio : 'недоступно'}`,
    `🗣 Язык: ${meta.language || 'недоступно'}${meta.languages.length ? ` (${meta.languages.join(', ')})` : ''}`,
    `🌍 Часовой пояс: ${meta.timezone || 'недоступно'}`,
    `📡 Сеть: ${connectionParts.join(' • ') || 'недоступно'}`,
    `🧠 CPU / RAM: ${cpuRamLabel}`,
    `📲 Telegram WebApp: ${telegramParts.join(' • ') || 'недоступно'}`,
    `🧾 User-Agent: ${meta.userAgent || 'недоступно'}`
  ];
}


async function loadBannedUserIds(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && bannedUsersListPromise && (now - bannedUsersListFetchedAt) < BANNED_USERS_FETCH_TTL_MS) {
    return bannedUsersListPromise;
  }

  bannedUsersListFetchedAt = now;
  bannedUsersListPromise = (async () => {
    try {
      const response = await fetch(`${BANNED_USERS_JSON_PATH}?v=${encodeURIComponent(BANNED_USERS_CACHE_BUSTER)}&ts=${now}`, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'omit',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const rawList = Array.isArray(data)
        ? data
        : Array.isArray(data?.premiumUserIds)
          ? data.premiumUserIds
          : [];

      return {
        premiumUserIds: rawList.map(normalizeTelegramUserId).filter(Boolean),
        adminName: normalizeUserDisplayName(data?.adminName || DEFAULT_PREMIUM_ADMIN_NAME) || DEFAULT_PREMIUM_ADMIN_NAME,
        adminUsername: normalizeTelegramUsername(data?.adminUsername || DEFAULT_PREMIUM_ADMIN_USERNAME) || normalizeTelegramUsername(DEFAULT_PREMIUM_ADMIN_USERNAME)
      };
    } catch (error) {
      console.warn('Не удалось загрузить список Premium Users:', error);
      return {
        premiumUserIds: [],
        adminName: DEFAULT_PREMIUM_ADMIN_NAME,
        adminUsername: normalizeTelegramUsername(DEFAULT_PREMIUM_ADMIN_USERNAME)
      };
    }
  })();

  return bannedUsersListPromise;
}


function initBanUi() {
  if (banUiReady) return;
  banUiReady = true;

  if (!document.body) return;

  if (!document.getElementById('ban-overlay-style') && document.head) {
    const style = document.createElement('style');
    style.id = 'ban-overlay-style';
    style.textContent = `
      #ban-overlay .agreement-panel,
      #user-id-wait-overlay .agreement-panel {
        width: min(92vw, 560px);
        text-align: center;
      }

      #ban-overlay .agreement-lead,
      #user-id-wait-overlay .agreement-lead {
        margin-bottom: 0;
      }

      #ban-overlay .premium-copy {
        margin: 16px 0 0;
        color: #4b5563;
        font-size: 14px;
        line-height: 1.55;
      }

      #ban-overlay .premium-admin-card {
        margin-top: 18px;
        padding: 16px 18px;
        border-radius: 20px;
        background: rgba(79, 70, 229, 0.08);
        border: 1px solid rgba(79, 70, 229, 0.16);
        text-align: left;
      }

      #ban-overlay .premium-admin-label {
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #6d28d9;
        margin-bottom: 8px;
      }

      #ban-overlay .premium-admin-name {
        font-size: 18px;
        font-weight: 800;
        color: #111827;
      }

      #ban-overlay .premium-admin-username {
        display: inline-flex;
        margin-top: 8px;
        font-size: 15px;
        font-weight: 700;
        color: #4f46e5;
        text-decoration: none;
        word-break: break-word;
      }

      #ban-overlay .premium-admin-username:hover {
        text-decoration: underline;
      }

      #ban-overlay .premium-note {
        margin-top: 16px;
        font-size: 13px;
        line-height: 1.5;
        color: #6b7280;
      }

      #ban-overlay .agreement-actions {
        justify-content: center;
      }
    `;
    document.head.appendChild(style);
  }

  if (!document.getElementById('user-id-wait-overlay')) {
    const waitOverlay = document.createElement('div');
    waitOverlay.id = 'user-id-wait-overlay';
    waitOverlay.className = 'agreement-overlay hidden';
    waitOverlay.innerHTML = `
      <div class="agreement-panel">
        <div class="agreement-badge">Проверка</div>
        <h2 class="agreement-title">Проверяем доступ...</h2>
        <p class="agreement-lead">Пожалуйста, подождите.</p>
      </div>
    `;
    document.body.appendChild(waitOverlay);
  }

  if (!document.getElementById('ban-overlay')) {
    const banOverlay = document.createElement('div');
    banOverlay.id = 'ban-overlay';
    banOverlay.className = 'agreement-overlay hidden';
    banOverlay.innerHTML = `
      <div class="agreement-panel">
        <div class="agreement-badge">Premium доступ</div>
        <h2 class="agreement-title">Бесплатный доступ завершён</h2>
        <p class="agreement-lead">Пробный доступ к этому боту завершился. Для продолжения нужен активный Premium-доступ.</p>
        <p class="premium-copy">Если у вас уже был временный доступ, возможно срок подписки истёк. Для продления или покупки новой подписки свяжитесь с администратором.</p>
        <div class="premium-admin-card">
          <div class="premium-admin-label">Администратор</div>
          <div class="premium-admin-name" data-role="premium-admin-name">${DEFAULT_PREMIUM_ADMIN_NAME}</div>
          <a class="premium-admin-username" data-role="premium-admin-username" href="#" target="_blank" rel="noopener noreferrer">${DEFAULT_PREMIUM_ADMIN_USERNAME}</a>
        </div>
        <p class="premium-note" data-role="premium-access-note">После подтверждения оплаты ваш Telegram ID будет добавлен в список Premium Users, и доступ откроется автоматически.</p>
        <div class="agreement-actions">
          <button id="premium-access-refresh" class="main">Проверить доступ</button>
        </div>
      </div>
    `;

    banOverlay.querySelector('#premium-access-refresh')?.addEventListener('click', () => {
      hideBanOverlay();
      bootstrapApplicationState();
    });

    document.body.appendChild(banOverlay);
  }
}

function hasBlockingSurfaceOpen() {
  const ids = [
    'agreement-overlay',
    'identity-overlay',
    'user-id-wait-overlay',
    'ban-overlay',
    'history-modal',
    'study-modal',
    'app-menu-overlay'
  ];

  return ids.some((id) => {
    const element = document.getElementById(id);
    return element && !element.classList.contains('hidden');
  });
}

function showUserIdWaitOverlay() {
  initBanUi();
  document.body.classList.add('agreement-page-locked');
  document.body.classList.add('app-surface-open');
  document.getElementById('user-id-wait-overlay')?.classList.remove('hidden');
}

function hideUserIdWaitOverlay() {
  const overlay = document.getElementById('user-id-wait-overlay');
  overlay?.classList.add('hidden');

  if (!hasBlockingSurfaceOpen()) {
    document.body.classList.remove('agreement-page-locked');
    document.body.classList.remove('app-surface-open');
  }
}

function applyPremiumAccessOverlayContent(accessStatus = {}) {
  const overlay = document.getElementById('ban-overlay');
  if (!overlay) return;

  const adminName = normalizeUserDisplayName(accessStatus?.adminName || DEFAULT_PREMIUM_ADMIN_NAME) || DEFAULT_PREMIUM_ADMIN_NAME;
  const adminUsername = normalizeTelegramUsername(accessStatus?.adminUsername || DEFAULT_PREMIUM_ADMIN_USERNAME) || normalizeTelegramUsername(DEFAULT_PREMIUM_ADMIN_USERNAME);
  const adminNameNode = overlay.querySelector('[data-role="premium-admin-name"]');
  const adminUsernameNode = overlay.querySelector('[data-role="premium-admin-username"]');
  const noteNode = overlay.querySelector('[data-role="premium-access-note"]');

  if (adminNameNode) {
    adminNameNode.textContent = adminName;
  }

  if (adminUsernameNode) {
    const visibleUsername = adminUsername ? `@${adminUsername}` : 'недоступен';
    adminUsernameNode.textContent = visibleUsername;
    if (adminUsername) {
      adminUsernameNode.setAttribute('href', `https://t.me/${adminUsername}`);
      adminUsernameNode.classList.remove('hidden');
    } else {
      adminUsernameNode.setAttribute('href', '#');
    }
  }

  if (noteNode) {
    noteNode.textContent = accessStatus?.userId
      ? 'Чтобы открыть доступ, обратитесь к администратору. После оплаты ваш Telegram ID будет добавлен в список Premium Users, и бот откроется автоматически.'
      : 'Обратитесь к администратору для подключения подписки.';
  }
}

function showBanOverlay(accessStatus = {}) {
  initBanUi();
  applyPremiumAccessOverlayContent(accessStatus);
  document.body.classList.add('agreement-page-locked');
  document.body.classList.add('app-surface-open');
  document.getElementById('ban-overlay')?.classList.remove('hidden');
}

function hideBanOverlay() {
  const overlay = document.getElementById('ban-overlay');
  overlay?.classList.add('hidden');

  if (!hasBlockingSurfaceOpen()) {
    document.body.classList.remove('agreement-page-locked');
    document.body.classList.remove('app-surface-open');
  }
}

async function getCurrentBanStatus() {
  const [telegramMeta, premiumConfig] = await Promise.all([
    resolveTelegramUserMetaForBanCheck(),
    loadBannedUserIds(true)
  ]);

  const normalizedUserId = normalizeTelegramUserId(telegramMeta?.userId);
  const premiumUserIds = Array.isArray(premiumConfig?.premiumUserIds)
    ? premiumConfig.premiumUserIds.map(normalizeTelegramUserId).filter(Boolean)
    : [];
  const hasAccess = normalizedUserId ? premiumUserIds.includes(normalizedUserId) : false;

  return {
    blocked: !hasAccess,
    userId: normalizedUserId,
    username: normalizeTelegramUsername(telegramMeta?.username),
    adminName: normalizeUserDisplayName(premiumConfig?.adminName || DEFAULT_PREMIUM_ADMIN_NAME) || DEFAULT_PREMIUM_ADMIN_NAME,
    adminUsername: normalizeTelegramUsername(premiumConfig?.adminUsername || DEFAULT_PREMIUM_ADMIN_USERNAME) || normalizeTelegramUsername(DEFAULT_PREMIUM_ADMIN_USERNAME)
  };
}

async function resolveTelegramUserMetaForBanCheck() {
  showUserIdWaitOverlay();

  const startedAt = Date.now();
  const maxWaitMs = 2200;

  while ((Date.now() - startedAt) < maxWaitMs) {
    const liveMeta = extractTelegramWebAppUserMeta(window.Telegram?.WebApp?.initDataUnsafe?.user);
    if (normalizeTelegramUserId(liveMeta?.userId)) {
      hideUserIdWaitOverlay();
      return saveTelegramUserMeta(liveMeta);
    }

    try {
      const webApp = await loadTelegramWebAppScript().catch(() => null);
      if (webApp && typeof webApp.ready === 'function') {
        try {
          webApp.ready();
        } catch {
          // ничего
        }
      }

      const fetchedMeta = extractTelegramWebAppUserMeta(webApp?.initDataUnsafe?.user);
      if (normalizeTelegramUserId(fetchedMeta?.userId)) {
        hideUserIdWaitOverlay();
        return saveTelegramUserMeta(fetchedMeta);
      }
    } catch {
      // ничего
    }

    await new Promise((resolve) => window.setTimeout(resolve, 350));
  }

  hideUserIdWaitOverlay();
  return extractTelegramWebAppUserMeta(window.Telegram?.WebApp?.initDataUnsafe?.user);
}

function getTelegramWebAppUserDisplayName(user) {
  if (!user || typeof user !== 'object') return '';

  const fullName = normalizeUserDisplayName([user.first_name, user.last_name].filter(Boolean).join(' '));
  if (fullName) return fullName;

  if (user.username) {
    return normalizeUserDisplayName(`@${String(user.username).replace(/^@+/, '')}`);
  }

  return '';
}

function ensureUserNameBadgeStyle() {
  if (document.getElementById(USER_NAME_BADGE_STYLE_ID) || !document.head) return;

  const style = document.createElement('style');
  style.id = USER_NAME_BADGE_STYLE_ID;
  style.textContent = `
    #${USER_NAME_BADGE_ID} {
      position: fixed;
      top: 14px;
      right: 14px;
      z-index: 1450;
      display: inline-flex;
      align-items: flex-start;
      gap: 10px;
      box-sizing: border-box;
      max-width: min(76vw, 360px);
      padding: 10px 12px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.96);
      border: 1px solid rgba(99, 102, 241, 0.16);
      box-shadow: 0 14px 32px rgba(15, 23, 42, 0.10);
      backdrop-filter: blur(14px);
      color: #111827;
      font-size: 13px;
      line-height: 1.2;
    }

    #${USER_NAME_BADGE_ID}.hidden {
      display: none;
    }

    #${USER_NAME_BADGE_ID} .quiz-user-name-badge-label {
      flex: 0 0 auto;
      margin-top: 2px;
      font-weight: 700;
      color: #4f46e5;
      white-space: nowrap;
      font-size: 12px;
    }

    #${USER_NAME_BADGE_ID} .quiz-user-name-badge-content {
      min-width: 0;
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    #${USER_NAME_BADGE_ID} .quiz-user-name-badge-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    #${USER_NAME_BADGE_ID} .quiz-user-name-badge-sticker {
      flex: 0 0 auto;
      font-size: 18px;
      line-height: 1;
      filter: drop-shadow(0 2px 4px rgba(79, 70, 229, 0.18));
    }

    #${USER_NAME_BADGE_ID} .quiz-user-name-badge-value {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
      color: #111827;
      font-size: 12px;
    }

    #${USER_NAME_BADGE_ID} .quiz-user-name-badge-subtitle {
      font-size: 11px;
      line-height: 1.35;
      color: #6b7280;
    }

    #${USER_NAME_BADGE_ID} .quiz-user-name-badge-action {
      flex: 0 0 auto;
      width: 34px;
      height: 34px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(99, 102, 241, 0.18);
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(238, 242, 255, 0.98), rgba(224, 231, 255, 0.94));
      color: #4338ca;
      cursor: pointer;
      box-shadow: 0 8px 20px rgba(79, 70, 229, 0.12);
      font-size: 18px;
      line-height: 1;
      transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
    }

    #${USER_NAME_BADGE_ID} .quiz-user-name-badge-action:hover,
    #${USER_NAME_BADGE_ID} .quiz-user-name-badge-action:focus-visible {
      transform: translateY(-1px);
      box-shadow: 0 12px 24px rgba(79, 70, 229, 0.18);
      background: linear-gradient(135deg, rgba(224, 231, 255, 0.98), rgba(199, 210, 254, 0.96));
      outline: none;
    }

    #${USER_NAME_BADGE_ID} .quiz-user-name-badge-sticker-panel {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      display: none;
      width: 184px;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      padding: 10px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.98);
      border: 1px solid rgba(99, 102, 241, 0.14);
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.14);
      backdrop-filter: blur(14px);
    }

    #${USER_NAME_BADGE_ID} .quiz-user-name-badge-sticker-panel.open {
      display: grid;
    }

    #${USER_NAME_BADGE_ID} .quiz-user-name-badge-sticker-option {
      width: 100%;
      aspect-ratio: 1 / 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(99, 102, 241, 0.12);
      border-radius: 12px;
      background: #ffffff;
      font-size: 24px;
      line-height: 1;
      cursor: pointer;
      transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
    }

    #${USER_NAME_BADGE_ID} .quiz-user-name-badge-sticker-option:hover,
    #${USER_NAME_BADGE_ID} .quiz-user-name-badge-sticker-option:focus-visible {
      transform: translateY(-1px);
      border-color: rgba(79, 70, 229, 0.32);
      box-shadow: 0 10px 22px rgba(79, 70, 229, 0.14);
      outline: none;
    }

    #${USER_NAME_BADGE_ID} .quiz-user-name-badge-sticker-option.active {
      border-color: rgba(79, 70, 229, 0.48);
      box-shadow: inset 0 0 0 1px rgba(79, 70, 229, 0.2), 0 10px 22px rgba(79, 70, 229, 0.14);
      background: linear-gradient(135deg, rgba(238, 242, 255, 0.98), rgba(224, 231, 255, 0.96));
    }

    #identity-overlay .identity-panel {
      width: min(92vw, 520px);
    }

    #identity-overlay .identity-field {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 12px;
      text-align: left;
    }

    #identity-overlay .identity-field label {
      font-size: 14px;
      font-weight: 700;
      color: #1f2937;
    }

    #identity-overlay .identity-field input {
      width: 100%;
      box-sizing: border-box;
      font-size: 16px;
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid #d1d5db;
      color: #111827;
      background: #ffffff;
    }

    #identity-overlay .identity-help {
      margin-top: 10px;
      font-size: 13px;
      line-height: 1.45;
      color: #6b7280;
    }

    @media (max-width: 640px) {
      #${USER_NAME_BADGE_ID} {
        top: 12px;
        right: 12px;
        left: auto;
        width: auto;
        max-width: calc(100vw - 92px);
        padding: 9px 10px;
        gap: 8px;
        font-size: 12px;
      }

      #${USER_NAME_BADGE_ID} .quiz-user-name-badge-label {
        margin-top: 1px;
        font-size: 11px;
      }

      #${USER_NAME_BADGE_ID} .quiz-user-name-badge-name-row {
        gap: 6px;
      }

      #${USER_NAME_BADGE_ID} .quiz-user-name-badge-value {
        white-space: nowrap;
        font-size: 11px;
      }

      #${USER_NAME_BADGE_ID} .quiz-user-name-badge-subtitle {
        font-size: 10px;
        line-height: 1.2;
      }

      #${USER_NAME_BADGE_ID} .quiz-user-name-badge-action {
        width: 32px;
        height: 32px;
        border-radius: 10px;
        font-size: 17px;
      }

      #${USER_NAME_BADGE_ID} .quiz-user-name-badge-sticker-panel {
        width: min(188px, calc(100vw - 24px));
      }
    }

    @media (max-width: 380px) {
      #${USER_NAME_BADGE_ID} {
        right: 8px;
        max-width: calc(100vw - 86px);
        padding: 8px 9px;
        gap: 7px;
      }

      #${USER_NAME_BADGE_ID} .quiz-user-name-badge-label,
      #${USER_NAME_BADGE_ID} .quiz-user-name-badge-value {
        font-size: 10.5px;
      }

      #${USER_NAME_BADGE_ID} .quiz-user-name-badge-subtitle {
        font-size: 9.5px;
      }

      #${USER_NAME_BADGE_ID} .quiz-user-name-badge-action {
        width: 30px;
        height: 30px;
        font-size: 16px;
      }
    }

      #${USER_NAME_BADGE_ID} .quiz-user-name-badge-label,
      #${USER_NAME_BADGE_ID} .quiz-user-name-badge-value {
        font-size: 10.5px;
      }

      #${USER_NAME_BADGE_ID} .quiz-user-name-badge-subtitle {
        font-size: 9.5px;
      }

      #${USER_NAME_BADGE_ID} .quiz-user-name-badge-action {
        width: 28px;
        height: 28px;
        font-size: 15px;
      }
    }
  `;

  document.head.appendChild(style);
}

function normalizePremiumStickerStatus(value) {
  const normalized = String(value || '').trim();
  const matched = PREMIUM_STICKER_OPTIONS.find((option) => option.value === normalized);
  return matched ? matched.value : PREMIUM_STICKER_OPTIONS[0].value;
}

function getStoredPremiumStickerStatus() {
  try {
    return normalizePremiumStickerStatus(localStorage.getItem(PREMIUM_STICKER_STATUS_KEY));
  } catch {
    return normalizePremiumStickerStatus('');
  }
}

function saveStoredPremiumStickerStatus(value) {
  const normalized = normalizePremiumStickerStatus(value);
  try {
    localStorage.setItem(PREMIUM_STICKER_STATUS_KEY, normalized);
  } catch {
    // ничего
  }
  return normalized;
}

function closePremiumStickerPicker() {
  const badge = document.getElementById(USER_NAME_BADGE_ID);
  if (!badge) return;

  const panel = badge.querySelector('.quiz-user-name-badge-sticker-panel');
  const button = badge.querySelector('.quiz-user-name-badge-action');
  if (panel) {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
  }
  if (button) {
    button.setAttribute('aria-expanded', 'false');
  }
}

function togglePremiumStickerPicker(forceState = null) {
  const badge = ensureUserNameBadge();
  if (!badge) return;

  const panel = badge.querySelector('.quiz-user-name-badge-sticker-panel');
  const button = badge.querySelector('.quiz-user-name-badge-action');
  if (!panel || !button) return;

  const nextState = typeof forceState === 'boolean' ? forceState : !panel.classList.contains('open');
  panel.classList.toggle('open', nextState);
  panel.setAttribute('aria-hidden', nextState ? 'false' : 'true');
  button.setAttribute('aria-expanded', nextState ? 'true' : 'false');
}

function bindPremiumStickerPickerEvents(badge) {
  if (!badge || badge.dataset.stickerPickerBound === '1') return;

  const button = badge.querySelector('.quiz-user-name-badge-action');
  const optionButtons = Array.from(badge.querySelectorAll('.quiz-user-name-badge-sticker-option'));

  if (button) {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      togglePremiumStickerPicker();
    });
  }

  optionButtons.forEach((optionButton) => {
    optionButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const selectedSticker = optionButton.dataset.sticker || '';
      saveStoredPremiumStickerStatus(selectedSticker);
      renderUserNameBadge();
      closePremiumStickerPicker();
    });
  });

  if (!document.body.dataset.quizPremiumStickerPickerBound) {
    document.addEventListener('click', (event) => {
      const currentBadge = document.getElementById(USER_NAME_BADGE_ID);
      if (!currentBadge) return;
      if (currentBadge.contains(event.target)) return;
      closePremiumStickerPicker();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closePremiumStickerPicker();
      }
    });

    document.body.dataset.quizPremiumStickerPickerBound = '1';
  }

  badge.dataset.stickerPickerBound = '1';
}

function ensureUserNameBadge() {
  ensureUserNameBadgeStyle();
  if (!document.body) return null;

  let badge = document.getElementById(USER_NAME_BADGE_ID);
  if (badge) return badge;

  const stickerOptionsMarkup = PREMIUM_STICKER_OPTIONS.map((option) => {
    const value = option?.value || '';
    const label = option?.label || value;
    return `<button type="button" class="quiz-user-name-badge-sticker-option" data-sticker="${value}" title="${label}" aria-label="${label}">${value}</button>`;
  }).join('');

  badge = document.createElement('div');
  badge.id = USER_NAME_BADGE_ID;
  badge.className = 'hidden';
  badge.innerHTML = `
    <span class="quiz-user-name-badge-label">Имя</span>
    <span class="quiz-user-name-badge-content">
      <span class="quiz-user-name-badge-name-row">
        <span class="quiz-user-name-badge-value"></span>
      </span>
      <span class="quiz-user-name-badge-subtitle"></span>
    </span>
    <button type="button" class="quiz-user-name-badge-action" aria-label="Изменить стикер-статус" title="Изменить стикер-статус" aria-expanded="false"></button>
    <div class="quiz-user-name-badge-sticker-panel" aria-hidden="true">${stickerOptionsMarkup}</div>
  `;

  document.body.appendChild(badge);
  bindPremiumStickerPickerEvents(badge);
  return badge;
}

function renderUserNameBadge() {
  const badge = ensureUserNameBadge();
  if (!badge) return;

  const valueEl = badge.querySelector('.quiz-user-name-badge-value');
  const subtitleEl = badge.querySelector('.quiz-user-name-badge-subtitle');
  const stickerEl = badge.querySelector('.quiz-user-name-badge-sticker');
  const actionButton = badge.querySelector('.quiz-user-name-badge-action');
  const optionButtons = Array.from(badge.querySelectorAll('.quiz-user-name-badge-sticker-option'));
  const currentName = getStoredUserName();
  const currentSticker = getStoredPremiumStickerStatus();

  if (valueEl) {
    valueEl.textContent = currentName || '—';
  }
  if (subtitleEl) {
    subtitleEl.textContent = USER_NAME_BADGE_SUBTITLE;
  }
  if (stickerEl) {
    stickerEl.textContent = currentSticker;
  }
  if (actionButton) {
    actionButton.textContent = currentSticker;
  }

  optionButtons.forEach((button) => {
    const isActive = button.dataset.sticker === currentSticker;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  badge.classList.toggle('hidden', !currentName);
}

function loadTelegramWebAppScript() {
  if (window.Telegram?.WebApp) {
    return Promise.resolve(window.Telegram.WebApp);
  }

  if (telegramWebAppScriptPromise) {
    return telegramWebAppScriptPromise;
  }

  telegramWebAppScriptPromise = new Promise((resolve, reject) => {
    const existingScript = Array.from(document.scripts || []).find((item) => item.src && item.src.includes('telegram-web-app.js'));
    if (existingScript) {
      if (window.Telegram?.WebApp) {
        resolve(window.Telegram.WebApp);
        return;
      }
      existingScript.addEventListener('load', () => resolve(window.Telegram?.WebApp || null), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Telegram WebApp script load failed')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = TELEGRAM_WEBAPP_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(window.Telegram?.WebApp || null);
    script.onerror = () => reject(new Error('Telegram WebApp script load failed'));

    if (document.head) {
      document.head.appendChild(script);
    } else if (document.body) {
      document.body.appendChild(script);
    } else {
      reject(new Error('Document is not ready for script injection'));
    }
  });

  return telegramWebAppScriptPromise;
}

async function captureTelegramWebAppUserMeta() {
  const cached = getCurrentTelegramUserMeta();
  if (cached.userId || cached.username) {
    return cached;
  }

  try {
    const webApp = await Promise.race([
      loadTelegramWebAppScript(),
      new Promise((resolve) => window.setTimeout(() => resolve(null), 1600))
    ]);

    if (!webApp) return getStoredTelegramUserMeta();

    if (typeof webApp.ready === 'function') {
      try {
        webApp.ready();
      } catch {
        // ничего
      }
    }

    const meta = extractTelegramWebAppUserMeta(webApp.initDataUnsafe?.user);
    if (!meta.userId && !meta.username) {
      return getStoredTelegramUserMeta();
    }

    return saveTelegramUserMeta(meta);
  } catch {
    return getStoredTelegramUserMeta();
  }
}

async function tryResolveUserNameFromTelegramWebApp() {
  if (getStoredUserName()) {
    return getStoredUserName();
  }

  try {
    const webApp = await Promise.race([
      loadTelegramWebAppScript(),
      new Promise((resolve) => window.setTimeout(() => resolve(null), 1600))
    ]);

    if (!webApp) return '';

    if (typeof webApp.ready === 'function') {
      try {
        webApp.ready();
      } catch {
        // ничего
      }
    }

    const telegramUser = webApp.initDataUnsafe?.user;
    saveTelegramUserMeta(extractTelegramWebAppUserMeta(telegramUser));
    const resolvedName = getTelegramWebAppUserDisplayName(telegramUser);
    if (!resolvedName) return '';

    return saveUserName(resolvedName, 'telegram_webapp');
  } catch (error) {
    console.warn('Не удалось получить имя из Telegram WebApp:', error);
    return '';
  }
}

function initIdentityUi() {
  if (identityUiReady) return;
  identityUiReady = true;

  ensureUserNameBadgeStyle();
  renderUserNameBadge();

  if (!document.body) return;

  const overlay = document.createElement('div');
  overlay.id = 'identity-overlay';
  overlay.className = 'agreement-overlay hidden';
  overlay.innerHTML = `
    <div class="agreement-panel identity-panel">
      <div class="agreement-badge">Имя</div>
      <h2 class="agreement-title">Введите имя для продолжения</h2>
      

      <div class="identity-field">
        <label for="identity-name-input">Имя</label>
        <input id="identity-name-input" type="text" maxlength="80" autocomplete="name" placeholder="Например: Sayfiddinov" />
      </div>

      

      <div class="agreement-actions">
        <button id="identity-continue" class="main">Продолжить</button>
      </div>

    </div>
  `;

  document.body.appendChild(overlay);

  const input = overlay.querySelector('#identity-name-input');
  const button = overlay.querySelector('#identity-continue');

  const submitIdentity = () => {
    const enteredName = normalizeUserDisplayName(input?.value || '');
    if (!enteredName) {
      input?.focus();
      return;
    }

    saveUserName(enteredName, 'manual');
    hideIdentityOverlay();
    bootstrapApplicationState();
  };

  button?.addEventListener('click', submitIdentity);
  input?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitIdentity();
    }
  });
}

function showIdentityOverlay(message = '') {
  initIdentityUi();

  const overlay = document.getElementById('identity-overlay');
  const input = document.getElementById('identity-name-input');

  if (!overlay) return;

  if (input && !input.value.trim()) {
    input.value = getStoredUserName();
  }

  document.body.classList.add('agreement-page-locked');
  document.body.classList.add('app-surface-open');
  overlay.classList.remove('hidden');

  window.setTimeout(() => {
    input?.focus();
    input?.select();
  }, 40);
}

function hideIdentityOverlay() {
  const overlay = document.getElementById('identity-overlay');
  overlay?.classList.add('hidden');

  const agreementOverlay = document.getElementById('agreement-overlay');
  const agreementVisible = agreementOverlay && !agreementOverlay.classList.contains('hidden');

  if (!agreementVisible) {
    document.body.classList.remove('agreement-page-locked');
    document.body.classList.remove('app-surface-open');
  }
}

async function bootstrapApplicationState() {
  if (bootstrapInProgress) return false;
  bootstrapInProgress = true;

  try {
    renderUserNameBadge();

    const accessStatus = await getCurrentBanStatus();
    if (accessStatus.blocked) {
      hideUserIdWaitOverlay();
      hideAgreementOverlay();
      hideIdentityOverlay();
      showBanOverlay(accessStatus);
      return false;
    }

    hideUserIdWaitOverlay();
    hideBanOverlay();

    if (!isAgreementAccepted()) {
      hideIdentityOverlay();
      showAgreementOverlay();
      if (localStorage.getItem(AGREEMENT_STATUS_KEY) === 'declined') {
        showAgreementDeclinedState();
      }
      return false;
    }

    hideAgreementOverlay();
    captureTelegramWebAppUserMeta();
    await reconcileInterruptedSessionOnEntry();

    let currentName = getStoredUserName();
    if (!currentName) {
      currentName = await tryResolveUserNameFromTelegramWebApp();
    }

    if (!currentName) {
      showIdentityOverlay('Введите имя для продолжения.');
      return false;
    }

    hideIdentityOverlay();
    renderUserNameBadge();

    if (isTestPage && !testBootstrapCompleted) {
      testBootstrapCompleted = true;
      attachSuspiciousActivityTracking();
      startTest();
    }

    return true;
  } finally {
    bootstrapInProgress = false;
  }
}


function getSourceQuestionNumber(themeFile, sourceIndex) {
  const zeroBasedIndex = Number(sourceIndex);
  if (!Number.isInteger(zeroBasedIndex) || zeroBasedIndex < 0) return null;

  const fileName = String(themeFile || '');
  const macroRangeMatch = fileName.match(/_(\d{3})_(\d{3})\.json$/i);
  if (macroRangeMatch) {
    return Number(macroRangeMatch[1]) + zeroBasedIndex;
  }

  const partMatch = fileName.match(/_part_(\d+)\.json$/i);
  if (partMatch) {
    return (Number(partMatch[1]) - 1) * 50 + zeroBasedIndex + 1;
  }

  return zeroBasedIndex + 1;
}

function getQuizDisplayLabel() {
  const labels = {
    macro: 'Макроэкономика',
    policy: 'Экономическая политика',
    money: 'Деньги и банки'
  };

  return labels[QUIZ_STORAGE_NAMESPACE] || QUIZ_STORAGE_NAMESPACE || 'Тест';
}

function getTelegramResultsQueue() {
  try {
    const raw = localStorage.getItem(TELEGRAM_RESULTS_QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTelegramResultsQueue(queue) {
  try {
    localStorage.setItem(TELEGRAM_RESULTS_QUEUE_KEY, JSON.stringify(Array.isArray(queue) ? queue : []));
  } catch {
    // ничего
  }
}

function formatTelegramAnswerLine(answer) {
  const questionNumber = Number.isInteger(answer?.sourceQuestionNumber)
    ? answer.sourceQuestionNumber
    : answer?.questionIndex;

  if (answer?.timeout) {
    return `№${questionNumber} — время вышло — ⏱`;
  }

  if (Number.isInteger(answer?.selectedIndex)) {
    return `№${questionNumber} — ответ ${answer.selectedIndex + 1} — ${answer.isCorrect ? '✅' : '❌'}`;
  }

  return `№${questionNumber} — без ответа — ❔`;
}

function normalizeComparableTelegramText(value) {
  return String(value ?? '').trim().toLowerCase();
}

function doesHistoryEntryBelongToIdentity(historyEntry, identity) {
  const targetUserId = normalizeTelegramUserId(identity?.telegramUserMeta?.userId);
  const entryUserId = normalizeTelegramUserId(historyEntry?.telegramUserMeta?.userId);
  if (targetUserId && entryUserId) {
    return targetUserId === entryUserId;
  }

  const targetUsername = normalizeTelegramUsername(identity?.telegramUserMeta?.username);
  const entryUsername = normalizeTelegramUsername(historyEntry?.telegramUserMeta?.username);
  if (targetUsername && entryUsername) {
    return targetUsername === entryUsername;
  }

  const targetName = normalizeComparableTelegramText(identity?.userName);
  const entryName = normalizeComparableTelegramText(historyEntry?.userName);
  if (targetName && entryName) {
    return targetName === entryName;
  }

  return false;
}

function buildTelegramHistoryExportAnswer(answer) {
  return {
    questionIndex: Number.isInteger(answer?.questionIndex) ? answer.questionIndex : null,
    sourceQuestionNumber: Number.isInteger(answer?.sourceQuestionNumber) ? answer.sourceQuestionNumber : null,
    selectedIndex: Number.isInteger(answer?.selectedIndex) ? answer.selectedIndex : null,
    selectedOptionNumber: Number.isInteger(answer?.selectedIndex) ? answer.selectedIndex + 1 : null,
    isCorrect: !!answer?.isCorrect,
    timeout: !!answer?.timeout
  };
}

function buildTelegramHistoryExportEntry(historyEntry) {
  const normalizedEntry = normalizeHistoryEntryRecord(historyEntry);
  if (!normalizedEntry) return null;

  const plannedCount = Number(normalizedEntry?.plannedQuestions) || Number(normalizedEntry?.totalQuestions) || 0;
  const answeredCount = Number(normalizedEntry?.totalQuestions) || 0;
  const entryTelegramUserMeta = normalizedEntry?.telegramUserMeta || {};

  return {
    id: normalizedEntry?.id || null,
    userName: normalizedEntry?.userName || '—',
    userId: normalizeTelegramUserId(entryTelegramUserMeta?.userId) || 'недоступен',
    username: formatTelegramUsernameForReport(entryTelegramUserMeta?.username),
    quiz: getQuizDisplayLabel(),
    quizNamespace: QUIZ_STORAGE_NAMESPACE,
    themeFile: normalizedEntry?.themeFile || null,
    themeLabel: normalizedEntry?.themeLabel || null,
    testMode: normalizeTestMode(normalizedEntry?.testMode),
    modeLabel: normalizedEntry?.modeLabel || getTestModeLabel(normalizedEntry?.testMode),
    startedAt: Number(normalizedEntry?.startedAt) || null,
    startedAtIso: Number(normalizedEntry?.startedAt) ? new Date(normalizedEntry.startedAt).toISOString() : null,
    finishedAt: Number(normalizedEntry?.finishedAt) || null,
    finishedAtIso: Number(normalizedEntry?.finishedAt) ? new Date(normalizedEntry.finishedAt).toISOString() : null,
    durationSeconds: Number(normalizedEntry?.durationSeconds) || 0,
    durationLabel: normalizedEntry?.durationLabel || formatDuration(Number(normalizedEntry?.durationSeconds) || 0),
    score: Number(normalizedEntry?.score) || 0,
    plannedQuestions: plannedCount,
    answeredQuestions: answeredCount,
    completedEarly: answeredCount < plannedCount,
    completionType: normalizedEntry?.completionType || 'finished',
    stopReason: normalizedEntry?.stopReason || null,
    stopLabel: normalizedEntry?.stopLabel || null,
    frontendMeta: normalizeFrontEndMeta(normalizedEntry?.frontendMeta)
  };
}


function buildTelegramUserStatsSummaryPayload(entry) {
  const stats = computeStatsSnapshot();
  if (!stats) return null;

  const bestEntry = stats.bestEntry || null;
  const bestPercent = bestEntry?.answeredQuestions ? (bestEntry.score / bestEntry.answeredQuestions) * 100 : 0;
  const lastEntry = stats.lastEntry || entry || null;
  const lastPercent = lastEntry?.answeredQuestions ? (lastEntry.score / lastEntry.answeredQuestions) * 100 : 0;

  return {
    totalAttempts: stats.totalAttempts,
    completedTests: stats.completedTests,
    earlyFinishedTests: stats.earlyFinishedTests,
    interruptedTests: stats.interruptedTests,
    totalAnsweredQuestions: stats.totalAnsweredQuestions,
    totalCorrectAnswers: stats.totalCorrectAnswers,
    totalIncorrectAnswers: stats.totalIncorrectAnswers,
    totalSkippedQuestions: stats.totalSkippedQuestions,
    totalTimeoutQuestions: stats.totalTimeoutQuestions,
    overallCorrectPercent: stats.overallCorrectPercent,
    averagePercentPerTest: stats.averagePercentPerTest,
    totalDurationSeconds: stats.totalDurationSeconds,
    activeDays: stats.activeDays,
    daysUsing: stats.daysUsing,
    completedRate: stats.completedRate,
    earlyFinishedRate: stats.earlyFinishedRate,
    interruptedRate: stats.interruptedRate,
    userIndex: stats.userIndex,
    userLevel: stats.userLevel,
    bestResult: bestEntry ? {
      score: bestEntry.score,
      answeredQuestions: bestEntry.answeredQuestions,
      plannedQuestions: bestEntry.plannedQuestions,
      percent: bestPercent,
      themeLabel: bestEntry.themeLabel || 'Без темы',
      durationSeconds: bestEntry.durationSeconds || 0
    } : null,
    lastResult: lastEntry ? {
      score: lastEntry.score || 0,
      answeredQuestions: lastEntry.answeredQuestions || lastEntry.totalQuestions || 0,
      plannedQuestions: lastEntry.plannedQuestions || lastEntry.totalQuestions || 0,
      percent: lastPercent,
      finishedAt: lastEntry.finishedAt || null
    } : null
  };
}

function buildTelegramUserStatsSummaryLines(entry) {
  const stats = buildTelegramUserStatsSummaryPayload(entry);
  if (!stats) {
    return ['', 'Статистика пользователя:', 'Статистика пока недоступна'];
  }

  const lines = [
    '',
    'Статистика пользователя:',
    `📚 Всего попыток: ${formatStatsNumber(stats.totalAttempts)}`,
    `✅ Завершено: ${formatStatsNumber(stats.completedTests)} • ⏹ Досрочно: ${formatStatsNumber(stats.earlyFinishedTests)} • 🚪 Прервано: ${formatStatsNumber(stats.interruptedTests)}`,
    `❓ Вопросов: отвечено ${formatStatsNumber(stats.totalAnsweredQuestions)} • верно ${formatStatsNumber(stats.totalCorrectAnswers)} • неверно ${formatStatsNumber(stats.totalIncorrectAnswers)}`,
    `⏭ Пропущено: ${formatStatsNumber(stats.totalSkippedQuestions)} • ⏱ Таймаутов: ${formatStatsNumber(stats.totalTimeoutQuestions)}`,
    `📈 Процент: общий ${formatStatsPercent(stats.overallCorrectPercent)} • средний за тест ${formatStatsPercent(stats.averagePercentPerTest)}`,
    `⌛ Всего времени: ${formatStatsDurationVerbose(stats.totalDurationSeconds)} • активных дней ${formatStatsNumber(stats.activeDays)}/${formatStatsNumber(stats.daysUsing)}`,
    `🏁 Завершаемость: ${formatStatsPercent(stats.completedRate)} • досрочно ${formatStatsPercent(stats.earlyFinishedRate)} • прервано ${formatStatsPercent(stats.interruptedRate)}`,
    `🧠 Уровень: ${stats.userLevel} • индекс ${formatStatsNumber(stats.userIndex)}`
  ];

  if (stats.bestResult) {
    lines.push(`🏆 Лучший результат: ${formatStatsNumber(stats.bestResult.score)} из ${formatStatsNumber(stats.bestResult.answeredQuestions)} (${formatStatsPercent(stats.bestResult.percent)}) • ${stats.bestResult.themeLabel}`);
  }

  if (stats.lastResult?.finishedAt) {
    lines.push(`🕘 Последний результат: ${formatStatsNumber(stats.lastResult.score)} из ${formatStatsNumber(stats.lastResult.answeredQuestions)} (${formatStatsPercent(stats.lastResult.percent)}) • ${formatDateTimeToSecond(stats.lastResult.finishedAt)}`);
  }

  return lines;
}

function sanitizeTelegramHistoryFileSegment(value, fallback = 'user') {
  const cleaned = String(value ?? '')
    .trim()
    .replace(/[^\p{L}\p{N}._-]+/gu, '_')
    .replace(/^_+|_+$/g, '');

  return cleaned || fallback;
}

function buildTelegramHistoryFilePayload(entry) {
  const telegramUserMeta = entry?.telegramUserMeta || getCurrentTelegramUserMeta();
  const currentUserName = entry?.userName || getStoredUserName() || '—';

  const userHistory = getHistory()
    .sort((a, b) => (Number(a?.startedAt) || 0) - (Number(b?.startedAt) || 0));

  const filePayload = {
    exportedAt: Date.now(),
    exportedAtIso: new Date().toISOString(),
    quiz: getQuizDisplayLabel(),
    quizNamespace: QUIZ_STORAGE_NAMESPACE,
    currentAttemptId: entry?.id || null,
    historyCount: userHistory.length,
    currentUser: {
      name: currentUserName,
      userId: normalizeTelegramUserId(telegramUserMeta?.userId) || 'недоступен',
      username: formatTelegramUsernameForReport(telegramUserMeta?.username),
      frontendMeta: getBestAvailableFrontEndMeta(entry?.frontendMeta, { collectLive: false })
    },
    statsSummary: buildTelegramUserStatsSummaryPayload(entry),
    history: userHistory.map(buildTelegramHistoryExportEntry).filter(Boolean)
  };

  const safeName = sanitizeTelegramHistoryFileSegment(
    normalizeTelegramUsername(telegramUserMeta?.username)
      || currentUserName
      || normalizeTelegramUserId(telegramUserMeta?.userId),
    'user'
  );
  const safeAttemptId = sanitizeTelegramHistoryFileSegment(entry?.id || Date.now(), 'attempt');

  return {
    fileName: `history_${QUIZ_STORAGE_NAMESPACE}_${safeName}_${safeAttemptId}.json`,
    caption: `${getQuizDisplayLabel()} • история пользователя • ${entry?.id || 'без_id'}`.slice(0, 1024),
    content: JSON.stringify(filePayload, null, 2)
  };
}

function buildTelegramResultsReportChunks(entry) {
  const answeredCount = Number(entry?.totalQuestions) || 0;
  const plannedCount = Number(entry?.plannedQuestions) || answeredCount;
  const telegramUserMeta = entry?.telegramUserMeta || getCurrentTelegramUserMeta();
  const telegramUserId = telegramUserMeta?.userId || 'недоступен';
  const telegramUsername = formatTelegramUsernameForReport(telegramUserMeta?.username);
  const frontendMeta = getBestAvailableFrontEndMeta(entry?.frontendMeta, { collectLive: false });
  const headerLines = [
    `📘 ${getQuizDisplayLabel()}`,
    `🆔 ${entry?.id || '—'}`,
    `👤 Имя: ${entry?.userName || '—'}`,
    `🪪 User ID: ${telegramUserId}`,
    `🔗 Username: ${telegramUsername}`,
    `📂 Тема: ${entry?.themeLabel || entry?.themeFile || '—'}`,
    `⚙️ Режим: ${entry?.modeLabel || getTestModeLabel(entry?.testMode)}`,
    `🕒 Начало: ${formatDateTimeToSecond(entry?.startedAt || Date.now())}`,
    `🏁 Конец: ${formatDateTimeToSecond(entry?.finishedAt || Date.now())}`,
    `⌛ Время: ${entry?.durationLabel || formatDuration(entry?.durationSeconds || 0)} (${entry?.durationSeconds || 0} сек.)`,
    `✅ Результат: ${entry?.score || 0}/${answeredCount}`,
    `📝 Выпало вопросов: ${plannedCount}`,
    `📌 Зафиксировано ответов: ${answeredCount}`,
    `⛔ Досрочно завершён: ${answeredCount < plannedCount ? 'да' : 'нет'}`
  ];

  if (entry?.completionType === 'tab_closed') {
    headerLines.push(`🚪 Причина завершения: вкладка / WebApp закрыт`);
  }

  const answerLines = Array.isArray(entry?.answers) && entry.answers.length
    ? entry.answers.map(formatTelegramAnswerLine)
    : ['Ответов нет.'];

  const allLines = [...headerLines, ...buildFrontEndReportLines(frontendMeta), ...buildTelegramUserStatsSummaryLines(entry), '', 'Ответы по номерам из JSON:', ...answerLines];
  const maxChunkLength = 3500;
  const chunks = [];
  let currentChunk = '';

  allLines.forEach((line) => {
    const safeLine = String(line ?? '');
    const nextChunk = currentChunk ? `${currentChunk}
${safeLine}` : safeLine;
    if (nextChunk.length > maxChunkLength && currentChunk) {
      chunks.push(currentChunk);
      currentChunk = safeLine;
    } else {
      currentChunk = nextChunk;
    }
  });

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.map((chunk, index) => {
    if (index === 0) return chunk;
    return `🧾 Продолжение отчёта (${index + 1}/${chunks.length})

${chunk}`;
  });
}

async function sendTelegramResultsMessage(text) {
  if (!TELEGRAM_RESULTS_ENABLED || !text) {
    throw new Error('Отправка в Telegram отключена');
  }

  const normalizedText = String(text);

  try {
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_RESULTS_CHAT_ID);
    formData.append('text', normalizedText);
    formData.append('disable_web_page_preview', 'true');

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_RESULTS_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      keepalive: true,
      referrerPolicy: 'no-referrer',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data?.ok) {
      throw new Error(data?.description || 'Telegram API error');
    }

    return data;
  } catch (postError) {
    const url = `https://api.telegram.org/bot${TELEGRAM_RESULTS_BOT_TOKEN}/sendMessage`
      + `?chat_id=${encodeURIComponent(TELEGRAM_RESULTS_CHAT_ID)}`
      + `&text=${encodeURIComponent(normalizedText)}`
      + `&disable_web_page_preview=true`;

    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      keepalive: true,
      referrerPolicy: 'no-referrer'
    });

    if (!response.ok) {
      throw postError instanceof Error ? postError : new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data?.ok) {
      throw new Error(data?.description || 'Telegram API error');
    }

    return data;
  }
}

async function sendTelegramResultsDocument(filePayload) {
  if (!TELEGRAM_RESULTS_ENABLED || !filePayload?.content) {
    throw new Error('Отправка файла в Telegram отключена');
  }

  const formData = new FormData();
  formData.append('chat_id', TELEGRAM_RESULTS_CHAT_ID);
  formData.append('disable_content_type_detection', 'true');

  if (filePayload.caption) {
    formData.append('caption', String(filePayload.caption).slice(0, 1024));
  }

  const fileName = sanitizeTelegramHistoryFileSegment(filePayload.fileName, 'history.json');
  const blob = new Blob([filePayload.content], { type: 'application/json;charset=utf-8' });
  formData.append('document', blob, fileName.endsWith('.json') ? fileName : `${fileName}.json`);

  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_RESULTS_BOT_TOKEN}/sendDocument`, {
    method: 'POST',
    mode: 'cors',
    credentials: 'omit',
    cache: 'no-store',
    body: formData
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data?.ok) {
    throw new Error(data?.description || 'Telegram API error');
  }

  return data;
}

async function sendTelegramResultsChunks(chunks) {
  for (let index = 0; index < chunks.length; index += 1) {
    await sendTelegramResultsMessage(chunks[index]);
    if (index < chunks.length - 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 150));
    }
  }
}

function scheduleTelegramResultsQueueFlush(delays = [0, 700, 2500, 7000]) {
  const queue = Array.isArray(delays) ? delays : [0];
  queue.forEach((delay) => {
    const safeDelay = Math.max(0, Number(delay) || 0);
    window.setTimeout(() => {
      tryFlushTelegramResultsQueue();
    }, safeDelay);
  });
}

function sendTelegramResultsMessageViaBeacon(text) {
  if (!TELEGRAM_RESULTS_ENABLED || !text || typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') {
    return false;
  }

  try {
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_RESULTS_CHAT_ID);
    formData.append('text', String(text));
    formData.append('disable_web_page_preview', 'true');

    return navigator.sendBeacon(`https://api.telegram.org/bot${TELEGRAM_RESULTS_BOT_TOKEN}/sendMessage`, formData);
  } catch (error) {
    console.warn('Не удалось отправить текст через sendBeacon:', error);
    return false;
  }
}

function sendTelegramResultsDocumentViaBeacon(filePayload) {
  if (!TELEGRAM_RESULTS_ENABLED || !filePayload?.content || typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') {
    return false;
  }

  try {
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_RESULTS_CHAT_ID);
    formData.append('disable_content_type_detection', 'true');

    if (filePayload.caption) {
      formData.append('caption', String(filePayload.caption).slice(0, 1024));
    }

    const fileName = sanitizeTelegramHistoryFileSegment(filePayload.fileName, 'history.json');
    const blob = new Blob([filePayload.content], { type: 'application/json;charset=utf-8' });
    formData.append('document', blob, fileName.endsWith('.json') ? fileName : `${fileName}.json`);

    return navigator.sendBeacon(`https://api.telegram.org/bot${TELEGRAM_RESULTS_BOT_TOKEN}/sendDocument`, formData);
  } catch (error) {
    console.warn('Не удалось отправить JSON через sendBeacon:', error);
    return false;
  }
}

function trySendTelegramResultsReportViaBeacon(entry) {
  if (!entry?.id) return false;

  let sentAny = false;
  const chunks = buildTelegramResultsReportChunks(entry);
  chunks.forEach((chunk) => {
    if (sendTelegramResultsMessageViaBeacon(chunk)) {
      sentAny = true;
    }
  });

  const historyFile = buildTelegramHistoryFilePayload(entry);
  if (historyFile?.content && sendTelegramResultsDocumentViaBeacon(historyFile)) {
    sentAny = true;
  }

  return sentAny;
}

function queueTelegramResultsReport(entry) {
  const normalizedEntry = normalizeHistoryEntryRecord(entry);
  if (!TELEGRAM_RESULTS_ENABLED || !normalizedEntry?.id) return;

  const queue = getTelegramResultsQueue();
  entry = normalizedEntry;
  if (queue.some((item) => item?.reportId === entry.id)) {
    return;
  }

  storeFrontEndMetaSnapshot(normalizedEntry.frontendMeta);

  queue.push({
    reportId: entry.id,
    createdAt: Date.now(),
    attempts: 0,
    textSent: false,
    historyFileSent: false,
    chunks: buildTelegramResultsReportChunks(entry),
    historyFile: buildTelegramHistoryFilePayload(entry)
  });

  saveTelegramResultsQueue(queue);
}

async function tryFlushTelegramResultsQueue() {
  if (!TELEGRAM_RESULTS_ENABLED || telegramResultsFlushInProgress) return;

  const queue = getTelegramResultsQueue();
  if (!queue.length) return;

  telegramResultsFlushInProgress = true;

  try {
    let pendingQueue = getTelegramResultsQueue();

    for (const item of pendingQueue) {
      const reportId = item?.reportId;
      if (!reportId) continue;

      item.attempts = (Number(item.attempts) || 0) + 1;
      item.lastAttemptAt = Date.now();
      saveTelegramResultsQueue(pendingQueue);

      try {
        if (!item.textSent) {
          await sendTelegramResultsChunks(Array.isArray(item.chunks) ? item.chunks : []);
          item.textSent = true;
          saveTelegramResultsQueue(pendingQueue);
        }

        if (!item.historyFileSent && item.historyFile?.content) {
          await sendTelegramResultsDocument(item.historyFile);
          item.historyFileSent = true;
          saveTelegramResultsQueue(pendingQueue);
        } else if (!item.historyFile?.content) {
          item.historyFileSent = true;
          saveTelegramResultsQueue(pendingQueue);
        }

        pendingQueue = getTelegramResultsQueue().filter((queueItem) => queueItem?.reportId !== reportId);
        saveTelegramResultsQueue(pendingQueue);
      } catch (error) {
        console.warn('Не удалось отправить отчёт в Telegram:', error);
        break;
      }
    }
  } finally {
    telegramResultsFlushInProgress = false;
  }
}

function initTelegramResultsDelivery() {
  if (telegramResultsInitDone) return;
  telegramResultsInitDone = true;

  window.addEventListener('load', () => {
    window.setTimeout(() => {
      captureTelegramWebAppUserMeta();
    }, 80);

    window.setTimeout(() => {
      tryFlushTelegramResultsQueue();
    }, 400);

    scheduleTelegramResultsQueueFlush([1200, 3500, 8000]);
  });

  window.addEventListener('online', () => {
    window.setTimeout(() => {
      tryFlushTelegramResultsQueue();
    }, 250);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      tryFlushTelegramResultsQueue();
      scheduleTelegramResultsQueueFlush([600, 2200]);
    }
  });
}


function shuffleArray(items) {
  const arr = [...(Array.isArray(items) ? items : [])];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function normalizeQuestionKeyPart(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function getQuestionKey(question) {
  if (question && question.id !== undefined && question.id !== null && question.id !== '') {
    return `id:${String(question.id)}`;
  }

  const normalizedQuestion = normalizeQuestionKeyPart(question?.question);
  const normalizedOptions = Array.isArray(question?.options)
    ? question.options.map(normalizeQuestionKeyPart).join('||')
    : '';
  const answerIndex = Number.isInteger(Number(question?.answer)) ? Number(question.answer) : '';

  return `q:${normalizedQuestion}::o:${normalizedOptions}::a:${answerIndex}`;
}

function dedupeQuestions(items) {
  const unique = [];
  const seen = new Set();

  (Array.isArray(items) ? items : []).forEach((question, index) => {
    const key = getQuestionKey(question);
    if (seen.has(key)) return;
    seen.add(key);
    unique.push({ ...question, __questionKey: key, __sourceIndex: index });
  });

  return unique;
}

function getUsedQuestionsState() {
  try {
    const raw = localStorage.getItem(USED_QUESTIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveUsedQuestionsState(state) {
  localStorage.setItem(USED_QUESTIONS_KEY, JSON.stringify(state || {}));
}

function selectRandomQuestions(sourceQuestions, requestedCount, themeFile) {
  const uniqueQuestions = dedupeQuestions(sourceQuestions);
  const totalAvailable = uniqueQuestions.length;
  const totalNeeded = Math.min(Math.max(1, Number(requestedCount) || 1), totalAvailable || 0);

  if (!totalAvailable || !totalNeeded) return [];

  const usedState = getUsedQuestionsState();
  const usedForTheme = Array.isArray(usedState[themeFile]) ? usedState[themeFile] : [];
  const usedSet = new Set(usedForTheme);

  const unusedQuestions = uniqueQuestions.filter(q => !usedSet.has(q.__questionKey));
  const picked = shuffleArray(unusedQuestions).slice(0, totalNeeded);

  let nextUsed;

  if (picked.length < totalNeeded) {
    const pickedKeys = new Set(picked.map(q => q.__questionKey));
    const refillPool = uniqueQuestions.filter(q => !pickedKeys.has(q.__questionKey));
    picked.push(...shuffleArray(refillPool).slice(0, totalNeeded - picked.length));
    nextUsed = picked.map(q => q.__questionKey);
  } else {
    nextUsed = [...new Set([...usedForTheme, ...picked.map(q => q.__questionKey)])];
  }

  usedState[themeFile] = nextUsed;
  saveUsedQuestionsState(usedState);

  return picked.map((question) => ({ ...question }));
}

function getThemeLabel(fileName) {
  const map = {
    'dengi_i_banki_tests_part_1.json': 'Вопросы 1-50',
    'dengi_i_banki_tests_part_2.json': 'Вопросы 51-100',
    'dengi_i_banki_tests_part_3.json': 'Вопросы 101-150',
    'dengi_i_banki_tests_part_4.json': 'Вопросы 151-200',
    'dengi_i_banki_tests_part_5.json': 'Вопросы 201-250',
    'dengi_i_banki_tests_part_6.json': 'Вопросы 251-291',
    'money_tests.json': 'Все вопросы (Микс)'
  };
  return map[fileName] || fileName || 'Неизвестная тема';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getHistoryTimestamp(entry) {
  if (!entry || typeof entry !== 'object') return 0;
  const finishedAt = Number(entry.finishedAt);
  if (Number.isFinite(finishedAt) && finishedAt > 0) return finishedAt;
  const startedAt = Number(entry.startedAt);
  if (Number.isFinite(startedAt) && startedAt > 0) return startedAt;
  return 0;
}

function normalizeNonNegativeInteger(value, fallback = 0) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return Math.floor(numeric);
  }
  return fallback;
}

function normalizePositiveTimestamp(value, fallback = 0) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return Math.floor(numeric);
  }
  return fallback;
}

function normalizeHistoryEntryRecord(entry) {
  if (!entry || typeof entry !== 'object' || !entry.id) return null;

  const startedAt = normalizePositiveTimestamp(entry.startedAt);
  if (!startedAt) return null;

  const finishedAt = normalizePositiveTimestamp(entry.finishedAt, startedAt);
  if (finishedAt < startedAt) return null;

  const answers = Array.isArray(entry.answers)
    ? entry.answers.filter((answer) => answer && typeof answer === 'object')
    : [];
  const answeredFromAnswers = answers.length;
  const rawTotalQuestions = normalizeNonNegativeInteger(entry.totalQuestions, 0);
  const totalQuestions = Math.max(rawTotalQuestions, answeredFromAnswers);
  const rawPlannedQuestions = normalizeNonNegativeInteger(entry.plannedQuestions, 0);
  const plannedQuestions = Math.max(rawPlannedQuestions, totalQuestions);
  const score = normalizeNonNegativeInteger(entry.score, 0);

  if (totalQuestions <= 0 || score > totalQuestions) {
    return null;
  }

  const derivedDuration = Math.max(1, Math.round((finishedAt - startedAt) / 1000));
  const durationSeconds = Math.max(1, normalizeNonNegativeInteger(entry.durationSeconds, derivedDuration));
  const telegramUserMeta = {
    userId: normalizeTelegramUserId(entry?.telegramUserMeta?.userId),
    username: normalizeTelegramUsername(entry?.telegramUserMeta?.username)
  };

  return {
    ...entry,
    minuteSeed: getMinuteSeed(startedAt),
    userName: normalizeUserDisplayName(entry.userName || '—') || '—',
    telegramUserMeta,
    startedAt,
    startedAtLabel: formatDateTimeToMinute(startedAt),
    finishedAt,
    finishedAtLabel: formatDateTimeToMinute(finishedAt),
    durationSeconds,
    durationLabel: entry.durationLabel || formatDuration(durationSeconds),
    score,
    totalQuestions,
    plannedQuestions,
    themeLabel: entry.themeLabel || getThemeLabel(entry.themeFile),
    testMode: normalizeTestMode(entry.testMode),
    modeLabel: entry.modeLabel || getTestModeLabel(entry.testMode),
    cheatLog: Array.isArray(entry.cheatLog) ? entry.cheatLog : [],
    completionType: entry.completionType || 'finished',
    stopReason: entry.stopReason || null,
    stopLabel: entry.stopLabel || null,
    frontendMeta: normalizeFrontEndMeta(entry.frontendMeta),
    answers
  };
}

function normalizeHistoryEntries(history) {
  if (!Array.isArray(history)) return [];

  const byId = new Map();
  history.forEach((item) => {
    const normalizedItem = normalizeHistoryEntryRecord(item);
    if (!normalizedItem?.id) return;

    const existing = byId.get(normalizedItem.id);
    if (!existing || getHistoryTimestamp(existing) <= getHistoryTimestamp(normalizedItem)) {
      byId.set(normalizedItem.id, normalizedItem);
    }
  });

  const normalized = Array.from(byId.values())
    .sort((a, b) => getHistoryTimestamp(a) - getHistoryTimestamp(b));

  return normalized.length > MAX_HISTORY_ENTRIES
    ? normalized.slice(-MAX_HISTORY_ENTRIES)
    : normalized;
}

function getHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const normalized = normalizeHistoryEntries(parsed);

    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(normalized));
    }

    return normalized;
  } catch {
    return [];
  }
}

function saveHistory(history) {
  const normalized = normalizeHistoryEntries(history);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(normalized));
}

function generateHistoryId(timestamp) {
  const history = getHistory();
  const minuteSeed = getMinuteSeed(timestamp);
  const sameMinuteCount = history.filter(item => item.minuteSeed === minuteSeed).length + 1;

  const partA = (minuteSeed * 37 + 73) % 100000000;
  const partB = ((minuteSeed % 1000000) * (sameMinuteCount + 11) + 97) % 1000000;
  const digitSum = String(minuteSeed)
    .split('')
    .reduce((sum, digit) => sum + Number(digit), 0);
  const checksum = (digitSum * 19 + sameMinuteCount * 7 + (partA % 97)) % 1000;

  return `H-${String(partA).padStart(8, '0')}-${String(partB).padStart(6, '0')}-${String(checksum).padStart(3, '0')}`;
}

function downloadTextFile(fileName, content, mimeType = 'application/json;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function isAgreementAccepted() {
  return localStorage.getItem(AGREEMENT_STATUS_KEY) === 'accepted'
    && localStorage.getItem(AGREEMENT_VERSION_KEY) === AGREEMENT_VERSION;
}

function setAgreementAccepted() {
  localStorage.setItem(AGREEMENT_STATUS_KEY, 'accepted');
  localStorage.setItem(AGREEMENT_VERSION_KEY, AGREEMENT_VERSION);
  localStorage.setItem(AGREEMENT_ACCEPTED_AT_KEY, String(Date.now()));
}

function setAgreementDeclined() {
  localStorage.setItem(AGREEMENT_STATUS_KEY, 'declined');
  localStorage.setItem(AGREEMENT_VERSION_KEY, AGREEMENT_VERSION);
}

function initAgreementUi() {
  if (agreementUiReady) return;
  agreementUiReady = true;

  const overlay = document.createElement('div');
  overlay.id = 'agreement-overlay';
  overlay.className = 'agreement-overlay hidden';
  overlay.innerHTML = `
    <div class="agreement-panel">
      <div class="agreement-badge">Важно</div>
      <h2 class="agreement-title">Пользовательское соглашение</h2>
      <p class="agreement-lead">Для продолжения нужно принять условия использования бота.</p>

      <div id="agreement-short" class="agreement-short">
        <div>• честное прохождение тестов без читерства;</div>
        <div>• запрет на вмешательство в работу бота и подделку результатов;</div>
        <div>• фиксация подозрительных действий во время прохождения теста.</div>
      </div>

      <div id="agreement-text" class="agreement-text hidden" style="padding:10px;"><iframe src="${AGREEMENT_DOCUMENT_PATH}?embed=1" title="Пользовательское соглашение" loading="lazy" style="width:100%;height:min(58vh,560px);border:0;border-radius:18px;background:#ffffff;"></iframe></div>

      <div class="agreement-actions">
        <button id="agreement-read" class="main secondary">Прочитать соглашение</button>
        <button id="agreement-decline" class="main danger">Отклонить</button>
        <button id="agreement-accept" class="main">Принять</button>
      </div>

      <div id="agreement-status" class="agreement-status hidden"></div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#agreement-read')?.addEventListener('click', () => {
    const text = overlay.querySelector('#agreement-text');
    const readBtn = overlay.querySelector('#agreement-read');
    if (!text || !readBtn) return;
    text.classList.toggle('hidden');
    readBtn.textContent = text.classList.contains('hidden') ? 'Прочитать соглашение' : 'Скрыть соглашение';
  });

  overlay.querySelector('#agreement-accept')?.addEventListener('click', () => {
    setAgreementAccepted();
    hideAgreementOverlay();
    bootstrapApplicationState();
  });

  overlay.querySelector('#agreement-decline')?.addEventListener('click', () => {
    setAgreementDeclined();
    showAgreementDeclinedState();
  });
}

function showAgreementOverlay() {
  initAgreementUi();
  document.body.classList.add('agreement-page-locked');
  document.body.classList.add('app-surface-open');
  document.getElementById('agreement-overlay')?.classList.remove('hidden');
}

function hideAgreementOverlay() {
  document.body.classList.remove('agreement-page-locked');
  document.body.classList.remove('app-surface-open');
  document.getElementById('agreement-overlay')?.classList.add('hidden');
}

function showAgreementDeclinedState() {
  initAgreementUi();
  const overlay = document.getElementById('agreement-overlay');
  const status = document.getElementById('agreement-status');
  if (!overlay || !status) return;

  status.classList.remove('hidden');
  status.innerHTML = 'Вы отклонили соглашение. Без его принятия доступ к боту закрыт.';

  const acceptBtn = overlay.querySelector('#agreement-accept');
  const readBtn = overlay.querySelector('#agreement-read');
  const declineBtn = overlay.querySelector('#agreement-decline');

  if (acceptBtn) acceptBtn.textContent = 'Вернуться и принять';
  if (readBtn) readBtn.textContent = 'Прочитать соглашение';
  if (declineBtn) declineBtn.disabled = true;

  showAgreementOverlay();
}

function enforceAgreementOnEntry() {
  if (isAgreementAccepted()) {
    hideAgreementOverlay();
    return true;
  }

  if (isTestPage) {
    navigateWithLoader('money_index.html', { replace: true, delay: 120, label: 'Возвращаемся в меню' });
    return false;
  }

  showAgreementOverlay();
  if (localStorage.getItem(AGREEMENT_STATUS_KEY) === 'declined') {
    showAgreementDeclinedState();
  }
  return false;
}


function initStudyUi(options = {}) {
  if (studyUiReady) return;
  studyUiReady = true;

  const withButton = options.withButton === true;
  let button = null;

  if (withButton) {
    button = document.createElement('button');
    button.id = 'study-toggle';
    button.className = 'history-toggle study-toggle';
    button.textContent = 'Изучить тесты';
  }

  const modal = document.createElement('div');
  modal.id = 'study-modal';
  modal.className = 'history-modal hidden';
  modal.innerHTML = `
    <div class="history-panel study-panel">
      <div class="history-panel-header">
        <div>
          <div class="history-title">Изучить тесты</div>
          <div class="history-subtitle">Поиск по вопросу или ответу</div>
        </div>
        <button id="study-close" class="history-close" aria-label="Закрыть">×</button>
      </div>
      <div class="study-search-wrap">
        <input id="study-search-input" class="study-search-input" type="text" placeholder="Поиск по вопросу или ответу" autocomplete="off" inputmode="search">
      </div>
      <div id="study-search-meta" class="study-search-meta hidden"></div>
      <div id="study-list" class="study-list">
        <div class="history-empty">Загрузка тестов...</div>
      </div>
    </div>
  `;

  if (button) document.body.appendChild(button);
  document.body.appendChild(modal);

  button?.addEventListener('click', openStudyModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeStudyModal();
  });
  modal.querySelector('#study-close')?.addEventListener('click', closeStudyModal);
  modal.querySelector('#study-search-input')?.addEventListener('input', (event) => {
    studyState.query = String(event.target.value || '');
    renderStudyList();
  });
}

function openStudyModal() {
  document.body.classList.add('study-modal-open');
  document.body.classList.add('app-surface-open');
  document.getElementById('study-modal')?.classList.remove('hidden');
  const input = document.getElementById('study-search-input');
  if (input) input.value = studyState.query || '';
  renderStudyList();
  if (!studyState.loaded && !studyState.loading) {
    loadStudyTests();
  }
}

function closeStudyModal() {
  document.body.classList.remove('study-modal-open');
  document.body.classList.remove('app-surface-open');
  document.getElementById('study-modal')?.classList.add('hidden');
  studyState.query = '';
  const input = document.getElementById('study-search-input');
  if (input) input.value = '';
  const meta = document.getElementById('study-search-meta');
  if (meta) {
    meta.textContent = '';
    meta.classList.add('hidden');
  }
}

function loadStudyTests() {
  studyState.loading = true;
  studyState.error = '';
  renderStudyList();

  fetch('money_tests.json')
    .then((response) => {
      if (!response.ok) throw new Error('Не удалось загрузить money_tests.json');
      return response.json();
    })
    .then((data) => {
      studyState.items = Array.isArray(data) ? data : [];
      studyState.loaded = true;
      studyState.loading = false;
      renderStudyList();
    })
    .catch((error) => {
      studyState.error = error.message || 'Ошибка загрузки тестов';
      studyState.loading = false;
      renderStudyList();
    });
}

function normalizeStudySearchQuery(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function buildStudySearchHaystack(item, index) {
  const options = Array.isArray(item?.options) ? item.options : [];
  return normalizeStudySearchQuery([
    index + 1,
    item?.question || '',
    ...options
  ].join(' '));
}

function renderStudyList() {
  const container = document.getElementById('study-list');
  if (!container) return;

  const meta = document.getElementById('study-search-meta');
  const query = normalizeStudySearchQuery(studyState.query || '');

  if (studyState.loading) {
    if (meta) {
      meta.textContent = '';
      meta.classList.add('hidden');
    }
    container.innerHTML = `
      <div class="history-empty">Загрузка тестов...</div>
    `;
    return;
  }

  if (studyState.error) {
    if (meta) {
      meta.textContent = '';
      meta.classList.add('hidden');
    }
    container.innerHTML = `
      <div class="history-empty">
        <div>Не получилось открыть раздел изучения тестов.</div>
        <div class="study-error">${escapeHtml(studyState.error)}</div>
        <button class="main study-retry" id="study-retry-btn">Повторить</button>
      </div>
    `;
    document.getElementById('study-retry-btn')?.addEventListener('click', loadStudyTests);
    return;
  }

  if (!studyState.items.length) {
    if (meta) {
      meta.textContent = '';
      meta.classList.add('hidden');
    }
    container.innerHTML = `
      <div class="history-empty">В файле money_tests.json пока нет тестов.</div>
    `;
    return;
  }

  const visibleItems = studyState.items
    .map((item, index) => ({ item, index }))
    .filter((entry) => !query || buildStudySearchHaystack(entry.item, entry.index).includes(query));

  if (meta) {
    if (query) {
      meta.textContent = `Найдено: ${visibleItems.length} из ${studyState.items.length}`;
      meta.classList.remove('hidden');
    } else {
      meta.textContent = '';
      meta.classList.add('hidden');
    }
  }

  if (!visibleItems.length) {
    container.innerHTML = `
      <div class="history-empty">Ничего не найдено.</div>
    `;
    return;
  }

  container.innerHTML = visibleItems.map((entry) => {
    const item = entry.item;
    const index = entry.index;
    const options = Array.isArray(item?.options) ? item.options : [];
    const answerIndex = Number(item?.answer);
    const safeQuestion = escapeHtml(item?.question || `Вопрос ${index + 1}`);
    const sourceQuestionNumber = index + 1;
    const hasGeneratedOptions = item?.chatgptGeneratedOptions === true && !(sourceQuestionNumber >= 282 && sourceQuestionNumber <= 291);
    const generatedBadge = hasGeneratedOptions
      ? '<div class="generated-options-badge generated-options-badge-study">Варианты сгенерированы с помощью ChatGPT</div>'
      : '';

    return `
      <div class="study-card ${hasGeneratedOptions ? 'generated-question-card' : ''}">
        <div class="study-question-row">
          <span class="answer-number">${index + 1}</span>
          <div class="study-question-text">${safeQuestion}</div>
        </div>
        ${generatedBadge}
        <div class="study-options">
          ${options.map((option, optionIndex) => `
            <div class="study-option ${optionIndex === answerIndex ? 'correct' : ''}">
              <span class="study-option-letter">${String.fromCharCode(1040 + optionIndex)}.</span>
              <span>${escapeHtml(option)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function initHistoryUi(options = {}) {
  if (historyUiReady) return;
  historyUiReady = true;

  const withButton = options.withButton === true;
  let button = null;

  if (withButton) {
    button = document.createElement('button');
    button.id = 'history-toggle';
    button.className = 'history-toggle';
    button.textContent = 'История';
  }

  const modal = document.createElement('div');
  modal.id = 'history-modal';
  modal.className = 'history-modal hidden';
  modal.innerHTML = `
    <div class="history-panel">
      <div class="history-panel-header">
        <div>
          <div class="history-title">История прохождений</div>
          <div class="history-subtitle">Дата, длительность, счёт, ID и подробные ответы</div>
        </div>
        <button id="history-close" class="history-close" aria-label="Закрыть">×</button>
      </div>
      <div id="history-list" class="history-list"></div>
    </div>
  `;

  if (button) document.body.appendChild(button);
  document.body.appendChild(modal);

  button?.addEventListener('click', openHistoryModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeHistoryModal();
  });
  modal.querySelector('#history-close')?.addEventListener('click', closeHistoryModal);

  const historyList = modal.querySelector('#history-list');
  historyList?.addEventListener('click', (event) => {
    const target = event.target.closest('button[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const id = target.dataset.id;

    if (action === 'toggle') toggleHistoryDetails(id);
    if (action === 'download') downloadHistoryEntry(id);
  });
}

function openHistoryModal() {
  renderHistoryList();
  document.body.classList.add('history-modal-open');
  document.body.classList.add('app-surface-open');
  document.getElementById('history-modal')?.classList.remove('hidden');
}

function closeHistoryModal() {
  document.body.classList.remove('history-modal-open');
  document.body.classList.remove('app-surface-open');
  document.getElementById('history-modal')?.classList.add('hidden');
}

function initAppMenuUi() {
  if (appMenuUiReady || isTestPage) return;
  appMenuUiReady = true;

  const toggle = document.createElement('button');
  toggle.id = 'app-menu-toggle';
  toggle.className = 'app-menu-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-label', 'Открыть меню');
  toggle.innerHTML = '<span></span><span></span><span></span>';

  const overlay = document.createElement('div');
  overlay.id = 'app-menu-overlay';
  overlay.className = 'app-menu-overlay hidden';
  overlay.innerHTML = `
    <aside class="app-drawer">
      <div class="app-drawer-header">
        <div>
          <div class="app-drawer-title">Меню</div>
          <div class="app-drawer-subtitle">Переходы и быстрые действия</div>
        </div>
        <button id="app-menu-close" class="app-drawer-close" type="button" aria-label="Закрыть меню">×</button>
      </div>
      <div id="app-menu-list" class="app-menu-list"></div>
      <div class="app-menu-footer" style="margin-top:18px;padding:6px 4px 2px;">
        <button id="app-agreement-link" type="button" style="padding:0;border:none;background:none;color:#4f46e5;text-decoration:underline;font-size:14px;font-weight:700;cursor:pointer;">Пользовательское соглашение</button>
      </div>
    </aside>
  `;

  document.body.appendChild(toggle);
  document.body.appendChild(overlay);

  toggle.addEventListener('click', openAppMenu);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeAppMenu();
  });
  overlay.querySelector('#app-menu-close')?.addEventListener('click', closeAppMenu);
  overlay.querySelector('#app-agreement-link')?.addEventListener('click', () => {
    closeAppMenu();
    navigateWithLoader(AGREEMENT_DOCUMENT_PATH, { delay: 120, label: 'Открываем пользовательское соглашение' });
  });

  renderAppMenuItems();
}

function openAppMenu() {
  document.getElementById('app-menu-overlay')?.classList.remove('hidden');
  document.body.classList.add('app-menu-open');
}

function closeAppMenu() {
  document.getElementById('app-menu-overlay')?.classList.add('hidden');
  document.body.classList.remove('app-menu-open');
}

function normalizeMenuPath(pathname) {
  const clean = String(pathname || '')
    .split('?')[0]
    .split('#')[0]
    .replace(/\/+/g, '/');

  if (!clean) return '/index.html';

  let normalized = clean;
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  if (normalized.endsWith('/')) normalized += 'index.html';

  return normalized.toLowerCase();
}

function getMenuItemPath(href) {
  try {
    return normalizeMenuPath(new URL(String(href || ''), window.location.href).pathname);
  } catch (error) {
    return normalizeMenuPath(String(href || ''));
  }
}

function getSharedAppMenuActions() {
  return APP_MENU_ITEMS.filter(item => item && item.type === 'action');
}

function getTopLevelAppMenuItems() {
  return APP_MENU_ITEMS.filter(item => item && item.type !== 'action');
}

function getMenuItemSignature(item) {
  if (!item) return '';
  return JSON.stringify({
    type: item.type || '',
    label: item.label || '',
    href: item.href || '',
    action: item.action || ''
  });
}

function getUniqueMenuItems(items) {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).filter(item => {
    const signature = getMenuItemSignature(item);
    if (!signature || seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

function getActiveAppMenuChildren(item, isActive) {
  if (!isActive) return [];

  const localChildren = Array.isArray(item?.children) ? item.children.filter(Boolean) : [];
  const sharedActions = getSharedAppMenuActions();
  return getUniqueMenuItems([...localChildren, ...sharedActions]);
}

function renderStandaloneAppMenuActions(container) {
  const sharedActions = getSharedAppMenuActions();
  if (!container || !sharedActions.length) return;

  const html = sharedActions.map((item, index) => {
    const description = item.description ? `<div class="app-menu-item-desc">${escapeHtml(item.description)}</div>` : '';
    const key = `standalone-${index}`;
    appMenuActionMap.set(key, item);

    return `
      <button
        class="app-menu-item app-menu-item-standalone"
        type="button"
        data-menu-key="${key}"
      >
        <div class="app-menu-item-label-row">
          <span class="app-menu-item-label">${escapeHtml(item.label || 'Без названия')}</span>
        </div>
        ${description}
      </button>
    `;
  }).join('');

  container.innerHTML = html;
}

function renderAppMenuItems() {
  const container = document.getElementById('app-menu-list');
  if (!container) return;

  appMenuActionMap = new Map();

  const currentPath = normalizeMenuPath(window.location.pathname);
  const topLevelItems = getTopLevelAppMenuItems();

  if (!topLevelItems.length) {
    renderStandaloneAppMenuActions(container);
  } else {
    const hasActiveLink = topLevelItems.some(item => {
      if (item.type !== 'link' || !item.href) return false;
      return getMenuItemPath(String(item.href || '')) === currentPath;
    });

    container.innerHTML = topLevelItems.map((item, index) => {
      const description = item.description ? `<div class="app-menu-item-desc">${escapeHtml(item.description)}</div>` : '';
      const isLink = item.type === 'link';
      const href = String(item.href || '');
      const itemPath = getMenuItemPath(href);
      const isActive = isLink && itemPath === currentPath;
      const children = getActiveAppMenuChildren(item, isActive);
      const topKey = `top-${index}`;
      appMenuActionMap.set(topKey, item);

      const childrenHtml = isActive && children.length
        ? `
          <div class="app-menu-children">
            ${children.map((child, childIndex) => {
              const childDescription = child.description ? `<div class="app-menu-subitem-desc">${escapeHtml(child.description)}</div>` : '';
              const childKey = `child-${index}-${childIndex}`;
              appMenuActionMap.set(childKey, child);
              return `
                <button
                  class="app-menu-subitem"
                  type="button"
                  data-menu-key="${childKey}"
                >
                  <div class="app-menu-subitem-label">${escapeHtml(child.label || 'Без названия')}</div>
                  ${childDescription}
                </button>
              `;
            }).join('')}
          </div>
        `
        : '';

      return `
        <div class="app-menu-card ${isActive ? 'active' : ''}">
          <button
            class="app-menu-item ${isActive ? 'active is-current' : ''}"
            type="button"
            data-menu-key="${topKey}"
          >
            <div class="app-menu-item-label-row">
              <span class="app-menu-item-label">${escapeHtml(item.label || 'Без названия')}</span>
              ${isActive ? '<span class="app-menu-item-badge">Сейчас</span>' : ''}
            </div>
            ${description}
          </button>
          ${childrenHtml}
        </div>
      `;
    }).join('');

    if (!hasActiveLink) {
      container.insertAdjacentHTML('beforeend', '<div class="app-menu-standalone-actions"></div>');
      renderStandaloneAppMenuActions(container.querySelector('.app-menu-standalone-actions'));
    }
  }

  container.querySelectorAll('[data-menu-key]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = appMenuActionMap.get(button.dataset.menuKey || '');
      if (!item) return;
      handleAppMenuItemClick(item);
    });
  });
}

function handleAppMenuItemClick(item) {
  if (!item) return;

  if (item.type === 'action') {
    closeAppMenu();

    if (item.action === 'study') {
      openStudyModal();
      return;
    }

    if (item.action === 'history') {
      openHistoryModal();
      return;
    }

    if (item.action === 'stats') {
      openStatsModal();
      return;
    }

    if (typeof item.onClick === 'function') {
      item.onClick();
    }
    return;
  }

  if (item.type === 'link' && item.href) {
    const itemPath = getMenuItemPath(String(item.href || ''));
    const currentPath = normalizeMenuPath(window.location.pathname);

    if (itemPath === currentPath) {
      return;
    }

    navigateWithLoader(item.href, { label: item.label ? `Открываем: ${item.label}` : 'Загружаем раздел' });
  }
}

function toggleHistoryDetails(id) {
  const details = document.querySelector(`.history-details[data-id="${CSS.escape(id)}"]`);
  const actionBtn = document.querySelector(`button[data-action="toggle"][data-id="${CSS.escape(id)}"]`);
  if (!details || !actionBtn) return;

  details.classList.toggle('hidden');
  actionBtn.textContent = details.classList.contains('hidden') ? 'Открыть' : 'Скрыть';
}

function deleteHistoryEntry(id) {
  return;
}

function downloadHistoryEntry(id) {
  const history = getHistory();
  const entry = history.find(item => item.id === id);
  if (!entry) return;

  downloadTextFile(
    `history-${QUIZ_STORAGE_NAMESPACE}-${entry.id}.json`,
    JSON.stringify(entry, null, 2)
  );
}

function renderHistoryList() {
  const container = document.getElementById('history-list');
  if (!container) return;

  const history = getHistory().sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));

  if (!history.length) {
    container.innerHTML = `
      <div class="history-empty">
        История пока пустая. После завершения теста здесь появятся все попытки.
      </div>
    `;
    return;
  }

  container.innerHTML = history.map(entry => {
    const suspiciousCount = entry.cheatLog?.length || 0;
    const plannedQuestions = entry.plannedQuestions || entry.totalQuestions;
    const stoppedEarly = plannedQuestions > entry.totalQuestions;
    const detailsHtml = (entry.answers || []).map((answer, index) => {
      const selectedText = answer.timeout
        ? 'Не выбрано — время вышло'
        : (answer.selectedText ?? 'Не выбрано');
      const statusText = answer.timeout
        ? 'Время вышло'
        : answer.isCorrect
          ? 'Правильно'
          : 'Неправильно';
      const statusClass = answer.timeout ? 'timeout' : (answer.isCorrect ? 'ok' : 'bad');

      return `
        <div class="answer-card">
          <div class="answer-card-top">
            <span class="answer-number">${index + 1}</span>
            <span class="answer-status ${statusClass}">${statusText}</span>
          </div>
          <div class="answer-question">${escapeHtml(answer.question)}</div>
          <div class="answer-line"><b>Выбрано:</b> ${escapeHtml(selectedText)}</div>
          <div class="answer-line"><b>Правильный:</b> ${escapeHtml(answer.correctText ?? '—')}</div>
        </div>
      `;
    }).join('');

    const cheatHtml = suspiciousCount
      ? `
        <div class="cheat-log">
          <div class="cheat-log-title">Подозрительные действия</div>
          ${(entry.cheatLog || []).map(log => `
            <div class="cheat-log-item">${escapeHtml(log.label)} — ${escapeHtml(log.atLabel)}</div>
          `).join('')}
        </div>
      `
      : `<div class="cheat-log clean">Подозрительных действий не обнаружено</div>`;

    return `
      <div class="history-item">
        <div class="history-item-head">
          <div class="history-summary">
            <div class="history-id">${escapeHtml(entry.id)}</div>
            <div class="history-meta">
              <span>📅 ${escapeHtml(entry.finishedAtLabel || formatDateTimeToMinute(entry.finishedAt))}</span>
              <span>⏳ ${escapeHtml(entry.durationLabel || formatDuration(entry.durationSeconds))}</span>
              <span>✅ ${entry.score}/${entry.totalQuestions}</span>
              <span>📚 ${escapeHtml(entry.themeLabel || getThemeLabel(entry.themeFile))}</span>
              <span>⚠️ ${suspiciousCount}</span>
            </div>
          </div>
          <div class="history-actions">
            <button data-action="toggle" data-id="${escapeHtml(entry.id)}">Открыть</button>
            <button data-action="download" data-id="${escapeHtml(entry.id)}">Скачать</button>
          </div>
        </div>
        <div class="history-details hidden" data-id="${escapeHtml(entry.id)}">
          <div class="history-detail-grid">
            <div><b>ID теста:</b> ${escapeHtml(entry.id)}</div>
            <div><b>Начало:</b> ${escapeHtml(entry.startedAtLabel || formatDateTimeToMinute(entry.startedAt))}</div>
            <div><b>Окончание:</b> ${escapeHtml(entry.finishedAtLabel || formatDateTimeToMinute(entry.finishedAt))}</div>
            <div><b>Отвечено вопросов:</b> ${entry.totalQuestions}</div>
            <div><b>План вопросов:</b> ${plannedQuestions}${stoppedEarly ? ' (тест завершён досрочно)' : ''}</div>
          </div>
          ${cheatHtml}
          <div class="answers-list">${detailsHtml}</div>
        </div>
      </div>
    `;
  }).join('');
}

function updateSessionLastActivityTimestamp(at = Date.now()) {
  if (!session) return;

  const normalizedStart = normalizePositiveTimestamp(session.start, Date.now());
  const normalizedAt = normalizePositiveTimestamp(at, normalizedStart);
  session.lastActivityAt = Math.max(normalizedStart, normalizedAt);
}

function pulseSessionActivity(saveSnapshot = true, at = Date.now()) {
  if (!session || session.review || session.finished || session.saved) return;
  updateSessionLastActivityTimestamp(at);
  if (saveSnapshot) {
    saveActiveSessionSnapshot();
  }
}

function stopSessionActivityHeartbeat() {
  if (sessionActivityHeartbeat) {
    clearInterval(sessionActivityHeartbeat);
    sessionActivityHeartbeat = null;
  }
}

function startSessionActivityHeartbeat() {
  stopSessionActivityHeartbeat();
  if (!isTestPage) return;

  sessionActivityHeartbeat = window.setInterval(() => {
    if (!session || session.review || session.finished || session.saved) return;
    pulseSessionActivity(true);
  }, 1000);
}

function getSnapshotLastActivityAt(snapshot) {
  if (!snapshot) return 0;

  let candidate = normalizePositiveTimestamp(snapshot?.lastActivityAt, normalizePositiveTimestamp(snapshot?.startedAt));

  if (Array.isArray(snapshot?.cheatLog)) {
    snapshot.cheatLog.forEach((event) => {
      const eventAt = normalizePositiveTimestamp(event?.at);
      if (eventAt > candidate) {
        candidate = eventAt;
      }
    });
  }

  return Math.max(candidate, normalizePositiveTimestamp(snapshot?.startedAt));
}

function logCheatEvent(type, label) {
  if (!isTestPage || !session || session.review || session.finished) return;
  session.cheatLog = session.cheatLog || [];

  const now = Date.now();
  const last = session.cheatLog[session.cheatLog.length - 1];
  if (last && last.type === type && now - last.at < 1500) return;

  session.cheatLog.push({
    type,
    label,
    at: now,
    atLabel: formatDateTimeToSecond(now)
  });

  pulseSessionActivity(true, now);
}

function saveActiveSessionSnapshot() {
  if (!session) return;
  try {
    session.frontendMeta = getBestAvailableFrontEndMeta(session.frontendMeta);
    const serializedTests = Array.isArray(tests)
      ? tests.map((question) => ({
          question: typeof question?.question === 'string' ? question.question : '',
          options: Array.isArray(question?.options) ? [...question.options] : [],
          answer: Number.isInteger(Number(question?.answer)) ? Number(question.answer) : null,
          sourceIndex: Number.isInteger(question?.sourceIndex) ? question.sourceIndex : null,
          sourceQuestionNumber: Number.isInteger(question?.sourceQuestionNumber)
            ? question.sourceQuestionNumber
            : getSourceQuestionNumber(session.themeFile, question?.sourceIndex)
        }))
      : [];

    const serializedAnswers = Array.isArray(session.answers)
      ? session.answers.map((answerState) => ({
          selected: Number.isInteger(answerState?.selected) ? answerState.selected : null,
          answered: !!answerState?.answered,
          timeout: !!answerState?.timeout
        }))
      : [];

    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({
      snapshotVersion: 2,
      id: session.id || generateHistoryId(session.start),
      startedAt: session.start,
      lastActivityAt: normalizePositiveTimestamp(session.lastActivityAt, session.start || Date.now()),
      index: Number.isInteger(session.index) ? session.index : 0,
      score: Number(session.score) || 0,
      plannedTotal: Number.isInteger(session.plannedTotal) ? session.plannedTotal : null,
      testMode: normalizeTestMode(session.testMode),
      themeFile: session.themeFile || localStorage.getItem(THEME_FILE_KEY) || null,
      selectedThemeFile: session.selectedThemeFile || localStorage.getItem(THEME_FILE_KEY) || null,
      rangeStart: Number.isInteger(session.rangeStart) ? session.rangeStart : null,
      rangeEnd: Number.isInteger(session.rangeEnd) ? session.rangeEnd : null,
      cheatLog: Array.isArray(session.cheatLog) ? session.cheatLog : [],
      answers: serializedAnswers,
      tests: serializedTests,
      userName: getStoredUserName() || '',
      telegramUserMeta: getCurrentTelegramUserMeta(),
      frontendMeta: getBestAvailableFrontEndMeta(session.frontendMeta, { collectLive: false })
    }));
  } catch {
    // ничего
  }
}

function clearActiveSessionSnapshot() {
  localStorage.removeItem(ACTIVE_SESSION_KEY);
}

function getActiveSessionSnapshot() {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const startedAt = Number(parsed?.startedAt);
    if (!Number.isFinite(startedAt) || startedAt <= 0) {
      return null;
    }

    const themeFile = typeof parsed?.themeFile === 'string' && parsed.themeFile.trim()
      ? parsed.themeFile.trim()
      : (localStorage.getItem(THEME_FILE_KEY) || null);
    const selectedThemeFile = typeof parsed?.selectedThemeFile === 'string' && parsed.selectedThemeFile.trim()
      ? parsed.selectedThemeFile.trim()
      : themeFile;

    const lastActivityAt = normalizePositiveTimestamp(parsed?.lastActivityAt, startedAt);

    const normalizedTests = Array.isArray(parsed?.tests)
      ? parsed.tests.map((question) => ({
          question: typeof question?.question === 'string' ? question.question : '',
          options: Array.isArray(question?.options) ? [...question.options] : [],
          answer: Number.isInteger(Number(question?.answer)) ? Number(question.answer) : null,
          sourceIndex: Number.isInteger(question?.sourceIndex) ? question.sourceIndex : null,
          sourceQuestionNumber: Number.isInteger(question?.sourceQuestionNumber)
            ? question.sourceQuestionNumber
            : getSourceQuestionNumber(themeFile, question?.sourceIndex)
        }))
      : [];

    const normalizedAnswers = Array.isArray(parsed?.answers)
      ? parsed.answers.map((answerState) => ({
          selected: Number.isInteger(answerState?.selected) ? answerState.selected : null,
          answered: !!answerState?.answered,
          timeout: !!answerState?.timeout
        }))
      : [];

    return {
      snapshotVersion: Number(parsed?.snapshotVersion) || 1,
      id: String(parsed?.id || generateHistoryId(startedAt)),
      startedAt,
      lastActivityAt: Math.max(lastActivityAt, startedAt),
      index: Number.isInteger(parsed?.index) ? parsed.index : 0,
      score: Math.max(0, Number(parsed?.score) || 0),
      plannedTotal: Number.isInteger(parsed?.plannedTotal) ? parsed.plannedTotal : null,
      testMode: normalizeTestMode(parsed?.testMode),
      themeFile,
      selectedThemeFile,
      rangeStart: Number.isInteger(parsed?.rangeStart) ? parsed.rangeStart : null,
      rangeEnd: Number.isInteger(parsed?.rangeEnd) ? parsed.rangeEnd : null,
      cheatLog: Array.isArray(parsed?.cheatLog) ? parsed.cheatLog : [],
      answers: normalizedAnswers,
      tests: normalizedTests,
      userName: normalizeUserDisplayName(parsed?.userName || getStoredUserName() || ''),
      frontendMeta: getBestAvailableFrontEndMeta(parsed?.frontendMeta, { collectLive: false }),
      telegramUserMeta: {
        userId: normalizeTelegramUserId(parsed?.telegramUserMeta?.userId),
        username: normalizeTelegramUsername(parsed?.telegramUserMeta?.username)
      }
    };
  } catch {
    return null;
  }
}

function doesActiveSessionSnapshotBelongToCurrentIdentity(snapshot) {
  if (!snapshot) return false;

  const currentMeta = getCurrentTelegramUserMeta();
  const snapshotMeta = snapshot.telegramUserMeta || {};

  const snapshotUserId = normalizeTelegramUserId(snapshotMeta?.userId);
  const currentUserId = normalizeTelegramUserId(currentMeta?.userId);
  if (snapshotUserId && currentUserId) {
    return snapshotUserId === currentUserId;
  }

  const snapshotUsername = normalizeTelegramUsername(snapshotMeta?.username);
  const currentUsername = normalizeTelegramUsername(currentMeta?.username);
  if (snapshotUsername && currentUsername) {
    return snapshotUsername === currentUsername;
  }

  return true;
}

function buildHistoryEntryFromSnapshot(snapshot, options = {}) {
  if (!snapshot) return null;

  const finishedAt = normalizePositiveTimestamp(options?.finishedAt, getSnapshotLastActivityAt(snapshot));
  const answersState = Array.isArray(snapshot.answers) ? snapshot.answers : [];
  const questionState = Array.isArray(snapshot.tests) ? snapshot.tests : [];
  const completedAnswerIndexes = answersState.reduce((indexes, answerState, index) => {
    if (answerState && (answerState.answered || answerState.timeout)) {
      indexes.push(index);
    }
    return indexes;
  }, []);

  const totalQuestions = completedAnswerIndexes.length;
  const plannedQuestions = Number.isInteger(snapshot.plannedTotal)
    ? snapshot.plannedTotal
    : (questionState.length || totalQuestions);
  const durationSeconds = Math.max(1, Math.round((finishedAt - snapshot.startedAt) / 1000));
  const completionType = options?.completionType || 'finished';
  const stopReason = options?.stopReason || null;
  const stopLabel = options?.stopLabel || null;
  const baseTelegramMeta = snapshot.telegramUserMeta || {};
  const liveTelegramMeta = getCurrentTelegramUserMeta();
  const frontendMeta = getBestAvailableFrontEndMeta(snapshot.frontendMeta, { collectLive: true });
  storeFrontEndMetaSnapshot(frontendMeta);
  const telegramUserMeta = {
    userId: normalizeTelegramUserId(liveTelegramMeta?.userId || baseTelegramMeta?.userId),
    username: normalizeTelegramUsername(liveTelegramMeta?.username || baseTelegramMeta?.username)
  };

  return {
    id: snapshot.id || generateHistoryId(snapshot.startedAt),
    minuteSeed: getMinuteSeed(snapshot.startedAt),
    userName: snapshot.userName || getStoredUserName() || '—',
    telegramUserMeta,
    frontendMeta,
    startedAt: snapshot.startedAt,
    startedAtLabel: formatDateTimeToMinute(snapshot.startedAt),
    finishedAt,
    finishedAtLabel: formatDateTimeToMinute(finishedAt),
    durationSeconds,
    durationLabel: formatDuration(durationSeconds),
    score: Math.max(0, Number(snapshot.score) || 0),
    totalQuestions,
    plannedQuestions,
    themeFile: snapshot.themeFile,
    themeLabel: getThemeLabelWithRange(snapshot.themeFile, snapshot.rangeStart, snapshot.rangeEnd),
    testMode: normalizeTestMode(snapshot.testMode),
    modeLabel: getTestModeLabel(snapshot.testMode),
    cheatLog: Array.isArray(snapshot.cheatLog) ? snapshot.cheatLog : [],
    completionType,
    stopReason,
    stopLabel,
    answers: completedAnswerIndexes.map((index) => {
      const question = questionState[index] || {};
      const answerState = answersState[index] || {};
      const selectedIndex = Number.isInteger(answerState?.selected) ? answerState.selected : null;
      const correctIndex = Number.isInteger(Number(question?.answer)) ? Number(question.answer) : null;
      const optionsList = Array.isArray(question?.options) ? [...question.options] : [];
      const timeout = !!answerState?.timeout;
      const questionNumber = Number.isInteger(question?.sourceQuestionNumber)
        ? question.sourceQuestionNumber
        : getSourceQuestionNumber(snapshot.themeFile, question?.sourceIndex ?? index);
      const hasValidCorrectIndex = correctIndex !== null && optionsList[correctIndex] !== undefined;
      return {
        questionIndex: index + 1,
        sourceQuestionNumber: Number.isInteger(questionNumber) ? questionNumber : null,
        question: typeof question?.question === 'string' ? question.question : '',
        selectedIndex,
        selectedText: selectedIndex !== null && optionsList[selectedIndex] !== undefined ? optionsList[selectedIndex] : null,
        correctIndex,
        correctText: hasValidCorrectIndex ? optionsList[correctIndex] : null,
        isCorrect: !timeout && selectedIndex !== null && correctIndex !== null && selectedIndex === correctIndex,
        timeout,
        options: optionsList
      };
    })
  };
}

async function reconcileInterruptedSessionOnEntry() {
  if (interruptedSessionRecoveryDone) return null;
  interruptedSessionRecoveryDone = true;

  const snapshot = getActiveSessionSnapshot();
  if (!snapshot) return null;
  if (!doesActiveSessionSnapshotBelongToCurrentIdentity(snapshot)) return null;

  const existingHistory = getHistory().find((entry) => String(entry?.id || '') === String(snapshot.id || ''));
  if (existingHistory) {
    clearActiveSessionSnapshot();
    await tryFlushTelegramResultsQueue();
    return existingHistory;
  }

  const entry = normalizeHistoryEntryRecord(buildHistoryEntryFromSnapshot(snapshot, {
    completionType: 'tab_closed',
    stopReason: 'tab_closed',
    stopLabel: 'Вкладка / WebApp закрыт'
  }));

  if (!entry) {
    clearActiveSessionSnapshot();
    return null;
  }

  const history = getHistory();
  history.push(entry);
  saveHistory(history);
  upsertStatsSummaryEntry(entry);
  queueTelegramResultsReport(entry);
  clearActiveSessionSnapshot();
  await tryFlushTelegramResultsQueue();

  return entry;
}

function getCompletedAnswerIndexes() {
  if (!session?.answers?.length) return [];

  return session.answers.reduce((indexes, answerState, index) => {
    if (answerState && (answerState.answered || answerState.timeout)) {
      indexes.push(index);
    }
    return indexes;
  }, []);
}

function buildHistoryEntryFromSession(options = {}) {
  if (!session) return null;

  const finishedAt = normalizePositiveTimestamp(options?.finishedAt, normalizePositiveTimestamp(session.lastActivityAt, Date.now()));
  const completedAnswerIndexes = getCompletedAnswerIndexes();
  const totalQuestions = completedAnswerIndexes.length;
  const plannedQuestions = Number.isInteger(session.plannedTotal) ? session.plannedTotal : tests.length;
  const durationSeconds = Math.max(1, Math.round((finishedAt - session.start) / 1000));
  const historyId = session.id || generateHistoryId(session.start);
  const completionType = options?.completionType || 'finished';
  const stopReason = options?.stopReason || null;
  const stopLabel = options?.stopLabel || null;

  return {
    id: historyId,
    minuteSeed: getMinuteSeed(session.start),
    userName: getStoredUserName() || '—',
    telegramUserMeta: getCurrentTelegramUserMeta(),
    frontendMeta: getBestAvailableFrontEndMeta(session.frontendMeta, { collectLive: false }),
    startedAt: session.start,
    startedAtLabel: formatDateTimeToMinute(session.start),
    finishedAt,
    finishedAtLabel: formatDateTimeToMinute(finishedAt),
    durationSeconds,
    durationLabel: formatDuration(durationSeconds),
    score: session.score,
    totalQuestions,
    plannedQuestions,
    themeFile: session.themeFile,
    themeLabel: getThemeLabelWithRange(session.themeFile, session.rangeStart, session.rangeEnd),
    testMode: normalizeTestMode(session.testMode),
    modeLabel: getTestModeLabel(session.testMode),
    cheatLog: session.cheatLog || [],
    completionType,
    stopReason,
    stopLabel,
    answers: completedAnswerIndexes.map(index => {
      const question = tests[index];
      const answerState = session.answers[index] || {};
      const selectedIndex = Number.isInteger(answerState.selected) ? answerState.selected : null;
      const correctIndex = question.answer;
      const timeout = !!answerState.timeout;
      return {
        questionIndex: index + 1,
        sourceQuestionNumber: Number.isInteger(question.sourceQuestionNumber) ? question.sourceQuestionNumber : null,
        question: question.question,
        selectedIndex,
        selectedText: selectedIndex !== null ? question.options[selectedIndex] : null,
        correctIndex,
        correctText: question.options[correctIndex],
        isCorrect: !timeout && selectedIndex === correctIndex,
        timeout,
        options: [...question.options]
      };
    })
  };
}

function persistSessionResult(options = {}) {
  if (!session || session.saved) return null;

  stopSessionActivityHeartbeat();
  updateSessionLastActivityTimestamp(options?.finishedAt || Date.now());

  const entry = normalizeHistoryEntryRecord(buildHistoryEntryFromSession(options));
  if (!entry) {
    session.saved = true;
    session.finished = true;
    clearActiveSessionSnapshot();
    return null;
  }

  const history = getHistory();
  history.push(entry);
  saveHistory(history);
  upsertStatsSummaryEntry(entry);
  queueTelegramResultsReport(entry);

  if (options?.tryBeacon) {
    trySendTelegramResultsReportViaBeacon(entry);
  }

  if (!options?.skipImmediateFlush) {
    tryFlushTelegramResultsQueue();
    scheduleTelegramResultsQueueFlush([350, 1400, 4500, 10000]);
  } else {
    scheduleTelegramResultsQueueFlush([1200, 5000]);
  }

  session.saved = true;
  session.finished = true;
  session.id = entry.id;
  session.completionType = entry.completionType;
  session.stopReason = entry.stopReason;
  clearActiveSessionSnapshot();

  return entry;
}

function persistFinishedSession() {
  return persistSessionResult();
}

function persistInterruptedSession(reason = 'tab_closed') {
  return persistSessionResult({
    completionType: 'tab_closed',
    stopReason: reason,
    stopLabel: 'Вкладка / WebApp закрыт',
    tryBeacon: true,
    skipImmediateFlush: true
  });
}

function attachSuspiciousActivityTracking() {
  if (!isTestPage) return;

  const finalizeInterruptedSession = () => {
    if (!session || session.review || session.finished || session.saved) return;
    const closedAt = Date.now();
    pulseSessionActivity(true, closedAt);
    logCheatEvent('before_unload', 'Вкладка / WebApp закрыт во время теста');
    persistInterruptedSession('tab_closed');
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      logCheatEvent('visibility_hidden', 'Скрытие вкладки / переход в другое приложение');
    }
  });

  window.addEventListener('blur', () => {
    logCheatEvent('window_blur', 'Потеря фокуса окна');
  });

  window.addEventListener('pagehide', finalizeInterruptedSession);
  window.addEventListener('beforeunload', finalizeInterruptedSession);
}

// ==========================================
// ИНИЦИАЛИЗАЦИЯ
// ==========================================
initAgreementUi();
initIdentityUi();
initStudyUi({ withButton: false });
initHistoryUi({ withButton: false });
initStatsUi({ withButton: false });

if (!isTestPage) {
  initAppMenuUi();
}

if (!isTestPage && app) {
  renderMenu();
}

initTelegramResultsDelivery();
renderUserNameBadge();
bootstrapApplicationState();

// ==========================================
// ЛОГИКА ДЛЯ МЕНЮ (INDEX.HTML)
// ==========================================
function initializeQuestionRangeMenuInputs() {
  const startInput = document.getElementById('question-range-start');
  const endInput = document.getElementById('question-range-end');
  if (!startInput || !endInput) return;

  startInput.value = '';
  endInput.value = '';

  try {
    localStorage.removeItem(QUESTION_RANGE_START_KEY);
    localStorage.removeItem(QUESTION_RANGE_END_KEY);
  } catch (_) {}
}

function clearQuestionRangeSelection() {
  try {
    localStorage.removeItem(QUESTION_RANGE_START_KEY);
    localStorage.removeItem(QUESTION_RANGE_END_KEY);
  } catch (_) {}
  sessionStorage.removeItem(QUESTION_RANGE_START_SESSION_KEY);
  sessionStorage.removeItem(QUESTION_RANGE_END_SESSION_KEY);
}

function renderMenu() {
  app.innerHTML = `
<div class="card">
    <div class="author">Created by Sayfiddinov</div>
    <h2>Добро пожаловать 👋</h2>
    <p><b>Деньги и Банки</b></p>

    <label>⚙️ Режим теста</label>
    <div class="mode-switch" id="test-mode-switch">
        <button type="button" class="mode-switch-btn active" data-mode="regular">Обычный режим</button>
        <button type="button" class="mode-switch-btn" data-mode="speed">Режим на скорость</button>
    </div>
    <div class="mode-hint" id="test-mode-hint"></div>


    <label>📚 Выберите тему</label>
    <div class="row">
        <select id="theme-select">
            <option value="dengi_i_banki_tests_part_1.json">Вопросы 1-50</option>
            <option value="dengi_i_banki_tests_part_2.json">Вопросы 51-100</option>
            <option value="dengi_i_banki_tests_part_3.json">Вопросы 101-150</option>
            <option value="dengi_i_banki_tests_part_4.json">Вопросы 151-200</option>
            <option value="dengi_i_banki_tests_part_5.json">Вопросы 201-250</option>
            <option value="dengi_i_banki_tests_part_6.json">Вопросы 251-291</option>
            <option value="money_tests.json" selected>Все вопросы (Микс)</option>
        </select>
    </div>

    <div id="timer-settings-block">
        <label>⏱ Время на вопрос (сек)</label>
        <div class="row">
            <select id="preset-timer">
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="30" selected>30</option>
                <option value="60">60</option>
            </select>
            <input id="custom-timer" type="number" min="5" placeholder="своё">
        </div>
    </div>

    <label>📝 Количество вопросов</label>
    <div class="row">
        <select id="preset-count">
            <option value="1000000000" selected>Все вопросы</option>
            <option value="15">15</option>
            <option value="25">25</option>
            <option value="30">30</option>
            <option value="35">35</option>
            <option value="50">50</option>
        </select>
        <input id="custom-count" type="number" min="1" placeholder="своё">
    </div>

    <label>🔢 Диапазон вопросов</label>
    <div class="row range-row">
        <input id="question-range-start" type="number" inputmode="numeric" placeholder="от">
        <input id="question-range-end" type="number" inputmode="numeric" placeholder="до">
    </div>

    <button class="main" id="startBtn">Начать тест</button>
</div>`;

  renderUserNameBadge();
  initializeQuestionRangeMenuInputs();
  initializeTestModeMenuControls();

  document.getElementById('startBtn').onclick = async () => {
    const ready = await bootstrapApplicationState();
    if (!ready) return;

    const selectedQuestionRange = getSelectedQuestionRange();
    if (selectedQuestionRange.error) {
      alert(selectedQuestionRange.error);
      return;
    }

    persistQuestionRangeSelection(selectedQuestionRange);
    localStorage.setItem(TEST_MODE_KEY, getSelectedTestMode());
    localStorage.setItem(TIMER_KEY, getTimerValue());
    localStorage.setItem(QUESTION_COUNT_KEY, getQuestionsCount());
    localStorage.setItem(THEME_FILE_KEY, getSelectedTheme());
    navigateWithLoader('money_test.html', { label: 'Подготавливаем тест' });
  };
}

// ==========================================
// ЛОГИКА ДЛЯ ТЕСТА (TEST.HTML)
// ==========================================
function startTest() {
  timeLimit = parseInt(localStorage.getItem(TIMER_KEY), 10) || 30;
  const selectedTestMode = getStoredTestMode();
  const countLimit = parseInt(localStorage.getItem(QUESTION_COUNT_KEY), 10) || 15;
  const selectedThemeFile = localStorage.getItem(THEME_FILE_KEY) || 'money_tests.json';
  const questionRange = getStoredQuestionRange();
  clearQuestionRangeSelection();
  if (questionRange.error) {
    persistQuestionRangeSelection({ hasRange: false });
    alert(questionRange.error);
    navigateWithLoader(window.location.pathname.replace('_test.html', '_index.html').split('/').pop(), { label: 'Возвращаемся в меню' });
    return;
  }
  const themeFile = questionRange.hasRange ? getMainQuestionBankFile() : selectedThemeFile;
  const sessionStartedAt = Date.now();

  session = {
    id: generateHistoryId(sessionStartedAt),
    start: sessionStartedAt,
    lastActivityAt: sessionStartedAt,
    index: 0,
    score: 0,
    review: false,
    finished: false,
    saved: false,
    themeFile,
    selectedThemeFile,
    rangeStart: questionRange.hasRange ? questionRange.start : null,
    rangeEnd: questionRange.hasRange ? questionRange.end : null,
    plannedTotal: null,
    testMode: selectedTestMode,
    answers: [],
    cheatLog: [],
    frontendMeta: getBestAvailableFrontEndMeta(null, { collectLive: true })
  };

  saveActiveSessionSnapshot();
  startSessionActivityHeartbeat();

  fetch(themeFile)
    .then(r => {
      if (!r.ok) throw new Error('Файл темы не найден');
      return r.json();
    })
    .then(data => {
      const sourcePool = applyQuestionRange(data, questionRange);
      if (!sourcePool.length) {
        throw new Error('По выбранному диапазону вопросы не найдены');
      }

      if (questionRange.hasRange) {
        session.rangeStart = Math.min(Math.max(1, questionRange.start), data.length || 1);
        session.rangeEnd = Math.min(Math.max(session.rangeStart, questionRange.end), data.length || session.rangeStart);
      }

      const randomPoolKey = questionRange.hasRange
        ? `${themeFile}::range:${session.rangeStart}-${session.rangeEnd}`
        : themeFile;
      const selectedQuestions = selectRandomQuestions(sourcePool, countLimit, randomPoolKey);

      tests = selectedQuestions.map(q => {
        const originalAnswerIndex = Number(q.answer);
        const correctText = q.options[originalAnswerIndex];
        const shuffledOptions = shuffleArray(q.options);
        const newAnswerIndex = shuffledOptions.indexOf(correctText);
        return { ...q, options: shuffledOptions, answer: newAnswerIndex, sourceIndex: q.__sourceIndex ?? null, sourceQuestionNumber: getSourceQuestionNumber(themeFile, q.__sourceIndex) };
      });

      session.plannedTotal = tests.length;
      saveActiveSessionSnapshot();
      showQuestion();
    })
    .catch(err => {
      alert('Ошибка загрузки теста: ' + err.message);
      navigateWithLoader('money_index.html', { label: 'Возвращаемся в меню' });
    });
}

function showQuestion() {
  clearInterval(timer);
  selected = null;

  const q = tests[session.index];
  if (!q) return finish();

  const state = session.answers[session.index] || { selected: null, answered: false, timeout: false };
  selected = state.selected;
  pulseSessionActivity(true);

  const qContainer = document.getElementById('question');
  const optionsEl = document.getElementById('options');

  if (!qContainer || !optionsEl) return;

  qContainer.innerHTML = `
    <div class="progress-wrap">
      <div class="progress">
        ${session.review ? `Просмотр ${session.index + 1} / ${tests.length}` : `Вопрос ${session.index + 1} из ${tests.length}`}
      </div>
      ${isSpeedTestMode(session?.testMode) ? '<div class="speed-mode-badge">⚡ На скорость</div>' : ''}
    </div>
    <div class="test-question-text">${escapeHtml(q.question)}</div>
    ${(q.chatgptGeneratedOptions === true && !(Number.isInteger(q?.sourceQuestionNumber) && q.sourceQuestionNumber >= 282 && q.sourceQuestionNumber <= 291)) ? '<div class="generated-options-badge generated-options-badge-test">Варианты сгенерированы с помощью ChatGPT</div>' : ''}
  `;

  optionsEl.innerHTML = '';
  let confirmBtn = null;

  q.options.forEach((text, i) => {
    const btn = document.createElement('button');
    btn.className = 'option';
    btn.textContent = text;

    if (state.answered || state.timeout || session.review) {
      btn.disabled = true;
      if (i === q.answer) btn.classList.add('correct');
      if (state.selected !== null && i === state.selected && i !== q.answer) btn.classList.add('wrong');
    } else {
      btn.onclick = () => {
        selected = i;
        optionsEl.querySelectorAll('.option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        if (confirmBtn) confirmBtn.disabled = false;
      };
      if (i === selected) btn.classList.add('selected');
    }

    optionsEl.appendChild(btn);
  });

  if (!state.answered && !state.timeout && !session.review) {
    confirmBtn = document.createElement('button');
    confirmBtn.className = 'main';
    confirmBtn.textContent = 'Ответить';
    confirmBtn.disabled = selected === null;
    confirmBtn.onclick = () => confirmAnswer(false);
    optionsEl.appendChild(confirmBtn);

    if (!isSpeedTestMode(session?.testMode)) {
      startTimer();
    }
  } else {
    const t = document.getElementById('timer');
    if (!isSpeedTestMode(session?.testMode) && t) {
      t.textContent = session.review ? '📋 Режим просмотра' : '⏱ Ответ зафиксирован';
    }
  }

  if (isSpeedTestMode(session?.testMode) && !session.review && !session.finished) {
    startTimer();
  }

  renderUserNameBadge();
  renderTopFinishButton();
  renderNavButtons();
}

function startTimer() {
  const t = document.getElementById('timer');
  if (!t) return;

  pulseSessionActivity(true);
  t.className = 'timer';
  t.classList.remove('warning');

  if (isSpeedTestMode(session?.testMode)) {
    t.classList.add('speed-mode');
    const renderElapsed = () => {
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - normalizePositiveTimestamp(session?.start, Date.now())) / 1000));
      t.innerHTML = `<span class="timer-speed-label">⚡ На скорость</span><span class="timer-speed-value">${formatDuration(elapsedSeconds)}</span>`;
    };

    renderElapsed();
    timer = setInterval(() => {
      pulseSessionActivity(true);
      renderElapsed();
    }, 1000);
    return;
  }

  t.classList.remove('speed-mode');
  timeLeft = timeLimit;
  t.textContent = `⏱ ${timeLeft}`;

  timer = setInterval(() => {
    pulseSessionActivity(true);
    timeLeft--;
    t.textContent = `⏱ ${timeLeft}`;
    if (timeLeft <= 5) t.classList.add('warning');
    if (timeLeft <= 0) {
      clearInterval(timer);
      confirmAnswer(true);
    }
  }, 1000);
}

function confirmAnswer(fromTimer) {
  clearInterval(timer);
  const q = tests[session.index];

  session.answers[session.index] = {
    selected: fromTimer ? null : selected,
    answered: !fromTimer,
    timeout: fromTimer
  };

  if (!fromTimer && selected === q.answer) session.score++;
  pulseSessionActivity(true);
  showQuestion();
}

function renderTopFinishButton() {
  const card = document.querySelector('.card');
  if (!card) return;

  let topActions = card.querySelector('.test-top-actions');
  if (!topActions) {
    topActions = document.createElement('div');
    topActions.className = 'test-top-actions';

    const timerEl = document.getElementById('timer');
    if (timerEl) {
      card.insertBefore(topActions, timerEl);
    } else {
      card.prepend(topActions);
    }
  }

  topActions.innerHTML = '';

  const state = session && session.answers ? session.answers[session.index] : null;
  if (!state || session.review || session.finished) {
    return;
  }

  const finishBtn = document.createElement('button');
  finishBtn.type = 'button';
  finishBtn.className = 'top-finish-btn';
  finishBtn.textContent = 'Завершить тест';
  finishBtn.onclick = requestFinishConfirmation;

  topActions.appendChild(finishBtn);
}

function renderNavButtons() {
  const optionsEl = document.getElementById('options');
  let nav = document.querySelector('.nav-buttons');

  if (!nav) {
    nav = document.createElement('div');
    nav.className = 'nav-buttons';
    optionsEl.appendChild(nav);
  }

  nav.innerHTML = '';
  const state = session.answers[session.index];
  const arrowsRow = document.createElement('div');
  arrowsRow.className = 'nav-arrows';

  if (session.index > 0 && (state?.answered || state?.timeout || session.review)) {
    const prev = document.createElement('button');
    prev.textContent = '←';
    prev.onclick = () => {
      session.index--;
      showQuestion();
    };
    arrowsRow.appendChild(prev);
  }

  if ((state || session.review) && session.index < tests.length - 1) {
    const next = document.createElement('button');
    next.textContent = '→';
    next.onclick = () => {
      session.index++;
      showQuestion();
    };
    arrowsRow.appendChild(next);
  }

  if (arrowsRow.children.length) {
    nav.appendChild(arrowsRow);
  }
}

function requestFinishConfirmation() {
  if (!session || session.review || session.finished) return;

  const confirmed = window.confirm(
    'Вы действительно хотите остановить тест?\n\nНажмите «ОК», чтобы завершить тест, или «Отмена», чтобы продолжить.'
  );

  if (confirmed) {
    void finish();
  }
}

async function finish() {
  clearInterval(timer);
  persistFinishedSession();
  await new Promise((resolve) => window.setTimeout(resolve, 250));

  const card = document.querySelector('.card');
  if (!card) return;

  const answeredCount = getCompletedAnswerIndexes().length;
  const plannedQuestions = Number.isInteger(session.plannedTotal) ? session.plannedTotal : tests.length;
  const earlyFinishNote = answeredCount < plannedQuestions
    ? `<p>📝 Отвечено до остановки: ${answeredCount} из ${plannedQuestions}</p>`
    : '';

  card.innerHTML = `
    <h2>Тест завершён</h2>
    <p>👤 Гость</p>
    <p>🆔 ${escapeHtml(session.id || '—')}</p>
    <p>📅 ${escapeHtml(formatDateTimeToMinute(Date.now()))}</p>
    <p>⚙️ ${escapeHtml(getTestModeLabel(session?.testMode))}</p>
    <p>✅ ${session.score}/${answeredCount}</p>
    ${earlyFinishNote}
    <button class="main" onclick="startReview()">📋 Просмотреть ответы</button>
    <button class="main" onclick="openHistoryModal()">🕘 Открыть историю</button>
    <button class="main" onclick="navigateWithLoader('index.html', { label: 'Возвращаемся в меню' })">🏠 В главное меню</button>
  `;
}

function startReview() {
  stopSessionActivityHeartbeat();
  session.review = true;
  session.index = 0;

  const answeredCount = getCompletedAnswerIndexes().length;
  if (answeredCount > 0 && answeredCount < tests.length) {
    tests = tests.slice(0, answeredCount);
    session.answers = session.answers.slice(0, answeredCount);
  }

  const card = document.querySelector('.card');
  if (!card) return;

  card.innerHTML = `<div id="timer"></div><div id="question"></div><div id="options"></div>`;
  showQuestion();
}
