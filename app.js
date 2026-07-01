import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getDatabase,
  ref,
  onValue,
  update
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBH3ccNKz5P7shmcgtHTTCK-Yg_LtoW4-4",
  authDomain: "bkg-soop.firebaseapp.com",
  databaseURL: "https://bkg-soop-default-rtdb.firebaseio.com",
  projectId: "bkg-soop",
  storageBucket: "bkg-soop.firebasestorage.app",
  messagingSenderId: "569354931997",
  appId: "1:569354931997:web:e5acdc63a6aa8a53871bf4",
  measurementId: "G-SRFPHLCMDL"
};

const ADMIN_UID = "7rYEhRouIuZdEK3bRoQtYUz7arW2";
const ADMIN_EMAIL_DOMAIN = "bkg-soop.com";
const ROOT_PATH = "bkgSoopRecordBoard";
const PLAYERS_PATH = `${ROOT_PATH}/players`;
const MEMBER_ARCHIVE_PATH = `${ROOT_PATH}/memberArchive`;
const MONTHLY_MATCHES_PATH = `${ROOT_PATH}/monthlyMatches`;
const MONTHLY_STATS_PATH = `${ROOT_PATH}/monthlyStats`;
const MANUAL_ADJUSTMENTS_PATH = `${ROOT_PATH}/manualAdjustments`;

const TIER_GROUPS = [
  { name: "0티어", subs: ["GOD", "상", "중", "하", "최하"] },
  { name: "1티어", subs: ["최상", "상", "중", "하"] },
  { name: "2티어", subs: ["최상", "상", "중", "하"] },
  { name: "3티어", subs: ["최상", "상", "중", "하"] }
];

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

let currentUser = null;
let isAdmin = false;
let players = [];
let monthlyMatches = {};
let monthlyStats = {};
let manualAdjustments = {};
let archivesByPlayer = {};
let cardSelections = loadCardSelections();
let selectedMonth = getCurrentMonthKey();
let archiveUnsubscribers = [null, null, null];
let subscribedArchivePlayerIds = [null, null, null];

const adminBtn = document.getElementById("adminBtn");
const monthSelect = document.getElementById("monthSelect");
const refreshBtn = document.getElementById("refreshBtn");
const connectStatusEl = document.getElementById("connectStatus");
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalClose = document.getElementById("modalClose");

adminBtn.addEventListener("click", async () => {
  if (isAdmin) {
    await signOut(auth);
    return;
  }

  openLoginModal();
});

refreshBtn.addEventListener("click", () => {
  renderAll();
});

monthSelect.addEventListener("change", () => {
  selectedMonth = monthSelect.value;
  renderAll();
});

modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  isAdmin = Boolean(user && user.uid === ADMIN_UID);
  adminBtn.textContent = isAdmin ? "관리자 로그아웃" : "관리자 로그인";

  if (user && !isAdmin) {
    alert("관리자 권한이 없는 계정입니다.");
    signOut(auth);
  }

  renderAll();
});

onValue(
  ref(db, PLAYERS_PATH),
  (snapshot) => {
    const rawPlayers = snapshot.val() || {};
    players = convertPlayers(rawPlayers);
    connectStatusEl.textContent = "Firebase 연결 완료";
    connectStatusEl.classList.remove("fail");
    connectStatusEl.classList.add("ok");
    renderAll();
  },
  (error) => {
    connectStatusEl.textContent = "Firebase 연결 실패";
    connectStatusEl.classList.remove("ok");
    connectStatusEl.classList.add("fail");
    alert(`멤버 데이터를 불러오지 못했습니다.\n${error.message}`);
  }
);

onValue(
  ref(db, MONTHLY_MATCHES_PATH),
  (snapshot) => {
    monthlyMatches = snapshot.val() || {};
    renderMonthOptions();
    renderAll();
  }
);

onValue(
  ref(db, MONTHLY_STATS_PATH),
  (snapshot) => {
    monthlyStats = snapshot.val() || {};
    renderMonthOptions();
    renderAll();
  }
);

onValue(
  ref(db, MANUAL_ADJUSTMENTS_PATH),
  (snapshot) => {
    manualAdjustments = snapshot.val() || {};
    renderMonthOptions();
    renderAll();
  }
);

renderMonthOptions();
renderAll();

function convertPlayers(rawPlayers) {
  return Object.entries(rawPlayers)
    .map(([id, player]) => {
      const tier = isValidTier(player.tier) ? player.tier : "0티어";
      const subTier = isValidSubTier(tier, player.subTier)
        ? player.subTier
        : getDefaultSubTier(tier);

      return {
        id,
        name: player.name || "이름없음",
        shortName: player.shortName || "",
        tier,
        subTier,
        profileImageUrl: player.profileImageUrl || player.profileImage || "",
        createdAt: player.createdAt || 0
      };
    })
    .sort((a, b) => {
      if (a.tier !== b.tier) return a.tier.localeCompare(b.tier, "ko");
      if (a.subTier !== b.subTier) return a.subTier.localeCompare(b.subTier, "ko");
      if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
      return a.name.localeCompare(b.name, "ko");
    });
}

function renderMonthOptions() {
  const adjustmentMonths = Object.values(manualAdjustments || {}).flatMap((playerAdjustments) => {
    return Object.values(playerAdjustments || {}).map((adjustment) => adjustment.month).filter(Boolean);
  });

  const months = new Set([
    ...Object.keys(monthlyMatches || {}),
    ...Object.keys(monthlyStats || {}),
    ...adjustmentMonths
  ]);
  months.add(selectedMonth);
  months.add(getCurrentMonthKey());

  const sortedMonths = [...months].sort((a, b) => b.localeCompare(a));

  monthSelect.innerHTML = sortedMonths
    .map((month) => {
      const selected = month === selectedMonth ? "selected" : "";
      return `<option value="${month}" ${selected}>${getMonthFullLabel(month)}</option>`;
    })
    .join("");
}

function renderAll() {
  document.querySelectorAll(".member-card").forEach((cardEl, index) => {
    renderCard(cardEl, index);
  });
  bindSearchEvents();
}

function renderCard(cardEl, cardIndex) {
  const selectedId = cardSelections[cardIndex] || null;
  const player = selectedId ? players.find((item) => item.id === selectedId) : null;

  subscribeArchiveForCard(cardIndex, player ? selectedId : null);

  if (!player) {
    cardEl.innerHTML = `
      ${createSearchBlock(cardIndex, "")}
      <div class="empty-state">
        <div>
          <strong>멤버를 선택하세요</strong>
          검색한 멤버의 누적 전적이 표시됩니다.
        </div>
      </div>
    `;
    return;
  }

  const archiveRecords = getPlayerArchiveRecords(player.id);
  const adjustmentRecords = getPlayerManualAdjustments(player.id);
  const totalStats = mergeStats(
    calculateStats(archiveRecords),
    calculateAdjustmentStats(adjustmentRecords)
  );
  const monthlyRecords = archiveRecords.filter((record) => record.month === selectedMonth);
  const monthlyAdjustmentRecords = adjustmentRecords.filter((record) => record.month === selectedMonth);
  const monthlyStats = mergeStats(
    calculateStats(monthlyRecords),
    calculateAdjustmentStats(monthlyAdjustmentRecords)
  );
  const monthTotalMatches = getTotalMatchesForMonth(selectedMonth);
  const participation = monthTotalMatches
    ? (monthlyStats.matches / monthTotalMatches) * 100
    : 0;
  const recentFive = getRecentFive(archiveRecords);
  const tierClass = getTierClass(player.tier);
  const tierLabel = `${player.tier} ${player.subTier}`.trim();
  const monthLabel = getMonthShortLabel(selectedMonth);

  cardEl.innerHTML = `
    ${createSearchBlock(cardIndex, player.name)}

    <section class="profile-summary">
      ${createProfileVisual(player)}
      <div class="member-info">
        <h2 class="member-name">${escapeHtml(player.name)}</h2>
        <span class="tier-badge ${tierClass}">${escapeHtml(tierLabel)}</span>
        <button class="edit-member-btn ${isAdmin ? "" : "hidden"}" type="button" data-edit-player="${player.id}">멤버 수정</button>
      </div>
    </section>

    <section class="stats-grid">
      <div class="stat-box">
        <h3 class="stat-title">누적 전적</h3>
        ${createTripleBox(totalStats)}
        <p class="rate-line">승률 <strong>${formatRate(totalStats.rate)}%</strong></p>
      </div>

      <div class="stat-box">
        <h3 class="stat-title">${monthLabel} 전적</h3>
        ${createTripleBox(monthlyStats)}
        <p class="rate-line">승률 <strong>${formatRate(monthlyStats.rate)}%</strong></p>
      </div>

      <div class="stat-box is-compact">
        <h3 class="stat-title">${monthLabel} 참여율</h3>
        <p class="participation-count">${monthlyStats.matches} / ${monthTotalMatches}<span>판</span></p>
        <div class="progress-track" aria-label="참여율 ${participation.toFixed(1)}%">
          <div class="progress-fill" style="width:${Math.min(participation, 100)}%"></div>
        </div>
        <div class="progress-label">${participation.toFixed(1)}%</div>
      </div>

      <div class="stat-box is-compact">
        <h3 class="stat-title">최근 5전</h3>
        <div class="recent-list">
          ${createRecentBadges(recentFive)}
        </div>
      </div>
    </section>
  `;

  cardEl.querySelector("[data-edit-player]")?.addEventListener("click", () => {
    openEditPlayerModal(player.id);
  });
}


function createProfileVisual(player) {
  const imageUrl = String(player.profileImageUrl || "").trim();
  const avatar = `<div class="bkg-avatar ${imageUrl ? "hidden" : ""}" style="background:${hashColor(player.id)}">BKG</div>`;

  if (!imageUrl) {
    return avatar;
  }

  return `
    <div class="profile-visual">
      <img
        class="profile-image"
        src="${escapeAttr(imageUrl)}"
        alt="${escapeAttr(player.name)} 프로필"
        loading="lazy"
        onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');"
      />
      ${avatar}
    </div>
  `;
}

function createSearchBlock(cardIndex, value) {
  return `
    <div class="search-block">
      <label class="search-label">멤버 검색</label>
      <div class="search-row">
        <input class="search-input" data-card-index="${cardIndex}" type="text" value="${escapeAttr(value)}" placeholder="이름을 입력하세요" autocomplete="off" />
        <div class="search-icon">🔍</div>
      </div>
      <ul class="suggestion-list"></ul>
    </div>
  `;
}

function subscribeArchiveForCard(cardIndex, playerId) {
  if (subscribedArchivePlayerIds[cardIndex] === playerId) return;

  if (archiveUnsubscribers[cardIndex]) {
    archiveUnsubscribers[cardIndex]();
    archiveUnsubscribers[cardIndex] = null;
  }

  subscribedArchivePlayerIds[cardIndex] = playerId || null;

  if (!playerId) return;

  archiveUnsubscribers[cardIndex] = onValue(ref(db, `${MEMBER_ARCHIVE_PATH}/${playerId}`), (snapshot) => {
    archivesByPlayer[playerId] = snapshot.val() || {};
    const cardEl = document.querySelector(`.member-card[data-card-index="${cardIndex}"]`);
    if (cardEl) renderCard(cardEl, cardIndex);
    bindSearchEvents();
  });
}

function bindSearchEvents() {
  document.querySelectorAll(".search-input").forEach((input) => {
    if (input.dataset.bound === "1") return;
    input.dataset.bound = "1";

    const cardIndex = Number(input.dataset.cardIndex);
    const card = input.closest(".member-card");
    const list = card.querySelector(".suggestion-list");

    input.addEventListener("input", () => {
      const keyword = normalizeName(input.value);
      const candidates = players
        .filter((player) => {
          if (!keyword) return false;
          return (
            normalizeName(player.name).includes(keyword) ||
            normalizeName(player.shortName).includes(keyword) ||
            normalizeName(`${player.tier} ${player.subTier}`).includes(keyword)
          );
        })
        .slice(0, 8);

      if (!keyword || candidates.length === 0) {
        list.classList.remove("is-open");
        list.innerHTML = "";
        return;
      }

      list.innerHTML = candidates.map((player) => {
        const tierLabel = `${player.tier} ${player.subTier}`.trim();
        const shortName = player.shortName ? ` / ${escapeHtml(player.shortName)}` : "";
        return `
          <li>
            <button type="button" data-member-id="${player.id}">
              ${escapeHtml(player.name)}${shortName} · ${escapeHtml(tierLabel)}
            </button>
          </li>
        `;
      }).join("");
      list.classList.add("is-open");

      list.querySelectorAll("button").forEach((button) => {
        button.addEventListener("click", () => {
          cardSelections[cardIndex] = button.dataset.memberId;
          saveCardSelections();
          list.classList.remove("is-open");
          renderAll();
        });
      });
    });

    input.addEventListener("focus", () => input.dispatchEvent(new Event("input")));
    input.addEventListener("blur", () => {
      window.setTimeout(() => list.classList.remove("is-open"), 140);
    });
  });
}

function getPlayerArchiveRecords(playerId) {
  const archive = archivesByPlayer[playerId] || {};
  return Object.entries(archive).map(([matchId, record]) => ({
    matchId,
    date: record.date || "",
    month: record.month || "",
    result: record.result || "",
    createdAt: Number(record.createdAt || 0)
  }));
}

function getPlayerManualAdjustments(playerId) {
  const adjustments = manualAdjustments[playerId] || {};
  return Object.entries(adjustments).map(([adjustmentId, adjustment]) => {
    const wins = Math.max(0, Number(adjustment.wins || 0));
    const losses = Math.max(0, Number(adjustment.losses || 0));
    const explicitMatches = Number(adjustment.matches || 0);
    const matches = explicitMatches > 0 ? explicitMatches : wins + losses;

    return {
      adjustmentId,
      month: adjustment.month || "",
      matches,
      wins,
      losses,
      note: adjustment.note || "",
      createdAt: Number(adjustment.createdAt || 0)
    };
  });
}

function calculateAdjustmentStats(adjustments) {
  const wins = adjustments.reduce((sum, adjustment) => sum + Number(adjustment.wins || 0), 0);
  const losses = adjustments.reduce((sum, adjustment) => sum + Number(adjustment.losses || 0), 0);
  const matches = adjustments.reduce((sum, adjustment) => {
    const explicitMatches = Number(adjustment.matches || 0);
    if (explicitMatches > 0) return sum + explicitMatches;
    return sum + Number(adjustment.wins || 0) + Number(adjustment.losses || 0);
  }, 0);
  const safeMatches = Math.max(matches, wins + losses);
  const rate = safeMatches ? (wins / safeMatches) * 100 : 0;
  return { matches: safeMatches, wins, losses, rate };
}

function mergeStats(baseStats, adjustmentStats) {
  const matches = Number(baseStats.matches || 0) + Number(adjustmentStats.matches || 0);
  const wins = Number(baseStats.wins || 0) + Number(adjustmentStats.wins || 0);
  const losses = Number(baseStats.losses || 0) + Number(adjustmentStats.losses || 0);
  const rate = matches ? (wins / matches) * 100 : 0;
  return { matches, wins, losses, rate };
}

function calculateStats(records) {
  const wins = records.filter((record) => record.result === "W").length;
  const losses = records.filter((record) => record.result === "L").length;
  const matches = wins + losses;
  const rate = matches ? (wins / matches) * 100 : 0;
  return { matches, wins, losses, rate };
}

function getTotalMatchesForMonth(month) {
  const liveMonthlyCount = Object.keys(monthlyMatches[month] || {}).length;
  const initialCount = Number(monthlyStats[month]?.initialTotalMatches || 0);
  return initialCount + liveMonthlyCount;
}

function getRecentFive(records) {
  return [...records]
    .sort((a, b) => {
      if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
      if (b.date !== a.date) return String(b.date).localeCompare(String(a.date));
      return String(b.matchId).localeCompare(String(a.matchId));
    })
    .slice(0, 5);
}

function createTripleBox(stats) {
  return `
    <div class="triple">
      <div class="triple-cell">
        <span class="triple-num">${stats.matches}</span>
        <span class="triple-label">전적</span>
      </div>
      <div class="triple-cell">
        <span class="triple-num">${stats.wins}</span>
        <span class="triple-label">승리</span>
      </div>
      <div class="triple-cell">
        <span class="triple-num">${stats.losses}</span>
        <span class="triple-label">패배</span>
      </div>
    </div>
  `;
}

function createRecentBadges(records) {
  const padded = [...records];
  while (padded.length < 5) padded.push({ result: "" });

  return padded.slice(0, 5).map((record) => {
    if (record.result === "W") return `<span class="result-badge result-win">승</span>`;
    if (record.result === "L") return `<span class="result-badge result-lose">패</span>`;
    return `<span class="result-badge result-empty">-</span>`;
  }).join("");
}

function openLoginModal() {
  openModal(
    "관리자 로그인",
    `
      <form class="form" id="loginForm">
        <label>
          아이디
          <input type="text" id="loginIdInput" placeholder="예: admin" autocomplete="username" />
        </label>

        <label>
          비밀번호
          <input type="password" id="passwordInput" placeholder="비밀번호 입력" autocomplete="current-password" />
        </label>

        <div class="form-actions">
          <button type="submit" class="submit-btn">로그인</button>
          <button type="button" class="cancel-btn" data-close>취소</button>
        </div>
      </form>

      <div class="notice">
        이메일 전체가 아니라 <b>@${ADMIN_EMAIL_DOMAIN}</b> 앞부분만 입력하면 됩니다.<br>
        예: admin@${ADMIN_EMAIL_DOMAIN} → admin
      </div>

      <div id="loginError" class="error-text hidden"></div>
    `
  );

  document.getElementById("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const idValue = document.getElementById("loginIdInput").value.trim();
    const password = document.getElementById("passwordInput").value;
    const errorEl = document.getElementById("loginError");

    if (!idValue || !password) {
      errorEl.textContent = "아이디와 비밀번호를 모두 입력해 주세요.";
      errorEl.classList.remove("hidden");
      return;
    }

    const email = idValue.includes("@") ? idValue : `${idValue}@${ADMIN_EMAIL_DOMAIN}`;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      closeModal();
    } catch (error) {
      errorEl.textContent = getLoginErrorMessage(error);
      errorEl.classList.remove("hidden");
    }
  });

  bindCloseButtons();
}

function openEditPlayerModal(playerId) {
  if (!isAdmin) {
    openLoginModal();
    return;
  }

  const player = players.find((item) => item.id === playerId);
  if (!player) return;

  const tierOptions = TIER_GROUPS.map((group) => {
    const selected = player.tier === group.name ? "selected" : "";
    return `<option value="${group.name}" ${selected}>${group.name}</option>`;
  }).join("");

  openModal(
    "멤버 정보 수정",
    `
      <form class="form" id="editPlayerForm">
        <label>
          풀네임
          <input type="text" id="editPlayerName" value="${escapeAttr(player.name)}" autocomplete="off" />
        </label>

        <label>
          두글자 닉네임
          <input type="text" id="editPlayerShortName" value="${escapeAttr(player.shortName || "")}" maxlength="2" autocomplete="off" />
        </label>

        <label>
          상위 티어
          <select id="editPlayerTier">${tierOptions}</select>
        </label>

        <label>
          하위 티어
          <select id="editPlayerSubTier"></select>
        </label>

        <label>
          프로필 이미지 URL 또는 상대경로
          <input type="text" id="editProfileImageUrl" value="${escapeAttr(player.profileImageUrl || "")}" placeholder="./images/profiles/파일명.webp" autocomplete="off" />
          <span class="form-hint">이미지 없으면 빈칸으로 두면 BKG 배지가 표시됩니다.</span>
        </label>

        <div class="form-actions">
          <button type="submit" class="submit-btn">저장</button>
          <button type="button" class="cancel-btn" data-close>취소</button>
        </div>
      </form>
    `
  );

  const tierSelect = document.getElementById("editPlayerTier");
  const subTierSelect = document.getElementById("editPlayerSubTier");
  fillSubTierOptions(tierSelect.value, subTierSelect, player.subTier);

  tierSelect.addEventListener("change", () => {
    fillSubTierOptions(tierSelect.value, subTierSelect);
  });

  document.getElementById("editPlayerForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("editPlayerName").value.trim();
    const shortName = document.getElementById("editPlayerShortName").value.trim();
    const tier = tierSelect.value;
    const subTier = subTierSelect.value;
    const profileImageUrl = document.getElementById("editProfileImageUrl").value.trim();

    if (profileImageUrl && !isValidProfileImagePath(profileImageUrl)) {
      alert("프로필 이미지 URL은 http://, https://, ./, ../, /, images/ 중 하나로 시작해야 합니다.");
      return;
    }

    if (!name) {
      alert("풀네임을 입력해 주세요.");
      return;
    }

    if (!shortName) {
      alert("두글자 닉네임을 입력해 주세요.");
      return;
    }

    if (shortName.length > 2) {
      alert("두글자 닉네임은 최대 2글자까지 입력할 수 있습니다.");
      return;
    }

    const duplicatedName = players.some((item) => item.id !== playerId && item.name === name);
    const duplicatedShortName = players.some((item) => item.id !== playerId && item.shortName === shortName);

    if (duplicatedName) {
      alert("이미 등록된 풀네임입니다.");
      return;
    }

    if (duplicatedShortName) {
      alert("이미 등록된 두글자 닉네임입니다.");
      return;
    }

    try {
      await update(ref(db), {
        [`${PLAYERS_PATH}/${playerId}/name`]: name,
        [`${PLAYERS_PATH}/${playerId}/shortName`]: shortName,
        [`${PLAYERS_PATH}/${playerId}/tier`]: tier,
        [`${PLAYERS_PATH}/${playerId}/subTier`]: subTier,
        [`${PLAYERS_PATH}/${playerId}/profileImageUrl`]: profileImageUrl,
        [`${ROOT_PATH}/meta`]: createMeta()
      });
      closeModal();
    } catch (error) {
      alert(`저장에 실패했습니다.\n${error.message}`);
    }
  });

  bindCloseButtons();
}

function openModal(title, bodyHtml) {
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHtml;
  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
  modalBody.innerHTML = "";
}

function bindCloseButtons() {
  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", closeModal);
  });
}


function isValidProfileImagePath(value) {
  return /^(https?:\/\/|\.\/|\.\.\/|\/|images\/)/i.test(value);
}

function fillSubTierOptions(tierName, selectEl, selectedSubTier = "") {
  const group = TIER_GROUPS.find((item) => item.name === tierName);
  const subs = group ? group.subs : [];

  selectEl.innerHTML = subs.map((sub) => {
    const selected = selectedSubTier === sub ? "selected" : "";
    return `<option value="${sub}" ${selected}>${sub}</option>`;
  }).join("");
}

function createMeta() {
  return {
    updatedAt: new Date().toLocaleString("ko-KR"),
    updatedBy: currentUser ? currentUser.uid : ""
  };
}

function getCurrentMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getMonthFullLabel(monthKey) {
  const [year, month] = String(monthKey).split("-");
  return `${year}년 ${Number(month)}월`;
}

function getMonthShortLabel(monthKey) {
  const [, month] = String(monthKey).split("-");
  return `${Number(month)}월`;
}

function formatRate(value) {
  return Number(value || 0).toFixed(2);
}

function getTierClass(tier) {
  if (String(tier).startsWith("0티어")) return "tier-0";
  if (String(tier).startsWith("1티어")) return "tier-1";
  if (String(tier).startsWith("2티어")) return "tier-2";
  return "tier-3";
}

function hashColor(id) {
  const colors = [
    "#ef4444", "#f97316", "#eab308", "#22c55e",
    "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899",
    "#64748b", "#0ea5e9", "#84cc16", "#f43f5e"
  ];

  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

function normalizeName(name) {
  return String(name || "").trim().toLowerCase();
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(text) {
  return escapeHtml(text);
}

function isValidTier(tierName) {
  return TIER_GROUPS.some((group) => group.name === tierName);
}

function isValidSubTier(tierName, subTierName) {
  const group = TIER_GROUPS.find((item) => item.name === tierName);
  return group ? group.subs.includes(subTierName) : false;
}

function getDefaultSubTier(tierName) {
  const group = TIER_GROUPS.find((item) => item.name === tierName);
  return group ? group.subs[0] : "GOD";
}

function loadCardSelections() {
  try {
    const parsed = JSON.parse(localStorage.getItem("bkgGGCardSelections") || "[]");
    return [parsed[0] || null, parsed[1] || null, parsed[2] || null];
  } catch {
    return [null, null, null];
  }
}

function saveCardSelections() {
  localStorage.setItem("bkgGGCardSelections", JSON.stringify(cardSelections));
}

function getLoginErrorMessage(error) {
  switch (error.code) {
    case "auth/invalid-email":
      return "아이디 형식이 올바르지 않습니다.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "아이디 또는 비밀번호가 올바르지 않습니다.";
    case "auth/too-many-requests":
      return "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.";
    default:
      return `로그인에 실패했습니다. ${error.message}`;
  }
}
