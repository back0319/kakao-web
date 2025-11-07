"use strict";

// ===== 데이터 =====
const quotes = [
  "When you have eliminated the impossible, whatever remains, however improbable, must be the truth.",
  "There is nothing more deceptive than an obvious fact.",
  "I ought to know by this time that when a fact appears to be opposed to a long train of deductions it invariably proves to be capable of bearing some other interpretation.",
  "I never make exceptions. An exception disproves the rule.",
  "What one man can invent another can discover.",
  "Nothing clears up a case so much as stating it to another person.",
  "Education never ends, Watson. It is a series of lessons, with the greatest for the last.",
];

// ===== 상태 =====
let words = [];
let wordIndex = 0;
let startTime = 0;
let playing = false;

const BEST_KEY = "typing-game-best-ms";

// ===== DOM =====
const quoteEl = document.getElementById("quote");
const messageEl = document.getElementById("message");
const inputEl = document.getElementById("typed-value");
const startBtn = document.getElementById("start");
const modal = document.getElementById("result-modal");
const resultP = document.getElementById("result-desc");

// ===== 유틸 =====
function renderQuote(w) {
  quoteEl.innerHTML = w.map((x) => `<span>${x} </span>`).join("");
  setHighlight(0);
}
function setHighlight(idx) {
  for (const el of quoteEl.childNodes) el.className = "";
  if (quoteEl.childNodes[idx]) quoteEl.childNodes[idx].className = "highlight";
}
function setStartIcon() {
  startBtn.innerHTML = `<i class="fa-solid fa-play"></i> Start`;
}
function setRestartIcon() {
  startBtn.innerHTML = `<i class="fa-solid fa-rotate-right"></i> Restart`;
}

function getBestMs() {
  const raw = localStorage.getItem(BEST_KEY);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
  s;
}

function setBestMs(ms) {
  if (typeof ms === "number" && isFinite(ms) && ms > 0) {
    localStorage.setItem(BEST_KEY, String(ms));
  }
}

// ===== 게임 시작/재시작 =====
function startGame() {
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  words = quote.split(" ");
  wordIndex = 0;
  playing = true;

  renderQuote(words);
  messageEl.innerText = "";

  inputEl.value = "";
  inputEl.className = ""; // 효과 상태 초기화
  inputEl.disabled = false;
  inputEl.focus();

  // 중복 방지 후 리스너 등록
  inputEl.removeEventListener("input", handleInput);
  inputEl.addEventListener("input", handleInput);

  startTime = Date.now();
  setRestartIcon();
}

// ===== 입력 처리 =====
function handleInput() {
  if (!playing) return;

  const currentWord = words[wordIndex];
  const typed = inputEl.value;

  // 모든 입력에서 "typing" 느낌 부여
  inputEl.classList.add("typing");

  // 1) 마지막 단어까지 정확히 입력
  if (typed === currentWord && wordIndex === words.length - 1) {
    const elapsedMs = Date.now() - startTime;
    const elapsed = (elapsedMs / 1000).toFixed(2);

    // 최고 기록 저장/계산
    let bestMs = getBestMs();
    if (bestMs === null || elapsedMs < bestMs) {
      setBestMs(elapsedMs);
      bestMs = elapsedMs;
    }

    // 메시지 + 모달
    const bestSec = (bestMs / 1000).toFixed(2);
    messageEl.innerHTML = `<i class="fa-solid fa-trophy"></i> CONGRATULATIONS! You finished in ${elapsed}s.`;
    if (modal && typeof modal.showModal === "function") {
      resultP.textContent = `Time: ${elapsed}s  •  Best: ${bestSec}s`;
      modal.showModal();
    }

    // 완료 시: 입력 리스너 해제 + 입력창 비활성화
    inputEl.removeEventListener("input", handleInput);
    inputEl.disabled = true;
    playing = false;

    // 입력창 클릭으로 재활성(한 번만)
    const reenableOnce = () => {
      inputEl.disabled = false;
      inputEl.removeEventListener("click", reenableOnce);
      inputEl.focus();
    };
    inputEl.addEventListener("click", reenableOnce, { once: true });

    setStartIcon(); // 버튼 아이콘 Start로 환원
    return;
  }

  // 2) 단어를 정확히 입력하고 공백으로 구분했을 때 → 다음 단어
  if (typed.endsWith(" ") && typed.trim() === currentWord) {
    inputEl.value = "";
    wordIndex++;
    setHighlight(wordIndex);
    inputEl.classList.remove("error");
    inputEl.classList.add("ok"); // 작은 성공 피드백
    // ok 효과가 누적되지 않도록 다음 틱에 제거
    queueMicrotask(() => inputEl.classList.remove("ok"));
    return;
  }

  // 3) 접두 일치/오류 표시 (CSS 효과 연동)
  if (currentWord.startsWith(typed)) {
    inputEl.classList.remove("error");
    inputEl.classList.add("ok");
    queueMicrotask(() => inputEl.classList.remove("ok"));
  } else {
    inputEl.classList.add("error");
    // 흔들림 효과 후 클래스 자동 제거는 CSS 애니메이션으로 처리
  }
}

// ===== 이벤트 바인딩 =====
startBtn.addEventListener("click", startGame);
setStartIcon();
