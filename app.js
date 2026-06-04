const STORAGE_KEY = "iching.coin.history.v1";
const MAX_HISTORY = 30;
const MEDIAPIPE_VERSION = "0.10.35";
const SNAP_COOLDOWN_MS = 1400;
const SNAP_PRIME_WINDOW_MS = 700;
const AUDIO_SNAP_COOLDOWN_MS = 1100;
const FIVE_FINGER_CAST_HOLD_MS = 620;
const FIVE_FINGER_CAST_COOLDOWN_MS = 3800;
const FIVE_FINGER_CAST_SPREAD = 0.72;
const FINGER_TIP_INDEXES = [4, 8, 12, 16, 20];
const UI_LANG = document.documentElement.lang?.toLowerCase().startsWith("en") ? "en" : "zh";
const IS_EN = UI_LANG === "en";
function ui(zh, en) {
  return IS_EN ? en : zh;
}
function joinText(items) {
  return items.join(IS_EN ? ", " : "、");
}
function coinFaceText(face) {
  if (!IS_EN) return face;
  return face === "背" ? "back" : "character";
}
const GESTURE_IDLE_STATUS = ui(
  "實驗功能：打響指會逐爻擲卦；五指合攏並保持一瞬，會一鍵出六爻。聲音偵測會聽短促而清脆的高頻峰值。",
  "Experimental: snap to cast line by line; close all five fingers and hold briefly to cast all six lines. Audio detection listens for a short crisp high-frequency peak."
);
const PROMPT_CLOSING_CALL = "卦示機緣，人行方成。多行善事，自得善果。未來所有命運仍掌握在你的手上。";
const PRO_UNLOCK_KEY = "iching.coin.pro.v1";
const DEFAULT_UNLOCK_CODE_HASH = "b9a3416d64a91902032a7ec7f97c9754e56575e20d137c77fdf5aca7bdaa66b6";
const DEFAULT_MONETIZATION = {
  checkoutUrl: "",
  whatsappNumber: "",
  proPrice: "HK$28",
  consultLabel: "六爻解卦委託",
  unlockCodeHash: DEFAULT_UNLOCK_CODE_HASH,
};
const MONETIZATION = {
  ...DEFAULT_MONETIZATION,
  ...(globalThis.ICHING_MONETIZATION_CONFIG || {}),
};
const AUDIO_SENSITIVITY = {
  strict: {
    peakFloor: 0.12,
    baselinePeak: 5.4,
    transientDelta: 0.05,
    transientFloor: 0.08,
    transientBaseline: 3.6,
    crisp: 0.36,
    transientCrisp: 0.24,
  },
  normal: {
    peakFloor: 0.095,
    baselinePeak: 4.6,
    transientDelta: 0.03,
    transientFloor: 0.055,
    transientBaseline: 3,
    crisp: 0.28,
    transientCrisp: 0.18,
  },
  sensitive: {
    peakFloor: 0.065,
    baselinePeak: 3.4,
    transientDelta: 0.018,
    transientFloor: 0.038,
    transientBaseline: 2.1,
    crisp: 0.22,
    transientCrisp: 0.14,
  },
};

const promptPacks = {
  decision: {
    label: ui("決策 / 轉折", "Decision / turning point"),
    focus: ui(
      "請把重點放在我現在應該前進、等待、轉方向，還是先停一停；每個建議都要講成日常人聽得明的說法。",
      "Focus on whether I should move ahead, wait, change direction or pause first. Every suggestion must be written in everyday language."
    ),
    pro: ui(
      "輸出一張白話下一步清單：今日可做、今個星期可做、暫時不要做、還要問清楚；每項都要短而實際。",
      "Create a plain next-step list: what to do today, what to do this week, what not to do yet, and what to clarify. Keep each item short and practical."
    ),
    questions: ui(
      "列出 3 條我應該補充給 AI 或真人顧問的背景資料問題。",
      "List 3 pieces of background information I should add for an AI or human consultant."
    ),
  },
  relationship: {
    label: ui("感情 / 關係", "Relationship"),
    focus: ui(
      "請把重點放在兩個人現在怎樣相處、哪裏容易誤會、應該怎樣開口；不要叫我猜心、試探或操控對方。",
      "Focus on how the people are relating now, where misunderstanding may happen, and how to speak clearly. Do not suggest mind-reading, testing or controlling the other person."
    ),
    pro: ui(
      "輸出白話關係清單：我現在的位置、對方可能感到的壓力、應該講的話、不應該講的話。",
      "Create a plain relationship list: where I stand, what pressure the other person may feel, what to say and what not to say."
    ),
    questions: ui(
      "列出 3 條有助釐清關係狀態的追問，不要鼓勵猜心或監控。",
      "List 3 follow-up questions that clarify the relationship without encouraging mind-reading or monitoring."
    ),
  },
  career: {
    label: ui("事業 / 工作", "Career / work"),
    focus: ui(
      "請把重點放在工作上現在最卡的是人、錢、時間、機會還是能力；然後講短期可以做的實際步驟。",
      "Focus on what is most stuck at work now: people, money, time, opportunity or ability. Then give practical short-term steps."
    ),
    pro: ui(
      "輸出白話工作清單：先推哪件事、避開哪種內耗、應該向誰爭取什麼、30 日內看什麼結果。",
      "Create a plain work list: what to push first, what friction to avoid, who to ask for what, and what result to check within 30 days."
    ),
    questions: ui(
      "列出 3 條工作背景追問，例如角色、權限、收入壓力、團隊關係或市場窗口。",
      "List 3 work-context follow-up questions, such as role, authority, income pressure, team relationship or market window."
    ),
  },
  wealth: {
    label: ui("財務 / 投資", "Finance / investing"),
    focus: ui(
      "請把重點放在我承不承受得起、最壞情況會怎樣、應否先保留現金；不要保證賺錢，也不要直接叫我買或賣。",
      "Focus on whether I can afford the risk, what the worst case may be, and whether I should keep cash first. Do not promise profit or directly tell me to buy or sell."
    ),
    pro: ui(
      "輸出白話財務清單：我控制到的風險、控制不到的風險、最壞情況、幾時要停手、還要查清楚什麼。",
      "Create a plain finance list: risks I can control, risks I cannot control, the worst case, when to stop, and what facts to verify."
    ),
    questions: ui(
      "列出 3 條財務背景追問，例如時間線、金額比例、流動性、家庭責任或債務壓力。",
      "List 3 finance-context follow-up questions, such as timeline, percentage of assets, liquidity, family responsibility or debt pressure."
    ),
  },
};

const promptStyleMeta = {
  neutral: {
    label: ui("中立直解", "Neutral reading"),
    summary: ui(
      "中立、直接，不恐嚇也不亂安慰。",
      "Neutral and direct, without fear or empty comfort."
    ),
  },
  healer: {
    label: ui("療癒師語氣", "Healer tone"),
    summary: ui(
      "先令人放鬆和被理解，再用很溫柔但實際的說法講清局勢。",
      "Starts with calm and care, then explains the situation gently and practically."
    ),
  },
  sarcastic: {
    label: ui("嘲諷模式", "Sarcastic mode"),
    summary: ui(
      "用少少寸嘴和幽默提醒你別自欺，但不羞辱、不恐嚇，最後仍要給清楚下一步。",
      "Uses light sarcasm to challenge self-deception, without humiliation or fear, then gives clear next steps."
    ),
  },
  advisor: {
    label: ui("顧問式分析", "Consultant analysis"),
    summary: ui(
      "先拆局勢，再講風險、資源、時間點和可執行選項。",
      "Breaks down the situation first, then risks, resources, timing and executable options."
    ),
  },
  action: {
    label: ui("行動建議優先", "Action-first advice"),
    summary: ui(
      "少講玄理，多講可以做、暫緩、避免和觀察的行動。",
      "Less theory, more practical actions to do, pause, avoid and watch."
    ),
  },
};

const trigramOrder = ["111", "110", "101", "100", "011", "010", "001", "000"];
const trigramMeta = {
  "111": { name: "乾", nature: "天", quality: "剛健、創始、主導" },
  "110": { name: "兌", nature: "澤", quality: "交流、喜悅、口舌" },
  "101": { name: "離", nature: "火", quality: "光明、依附、辨識" },
  "100": { name: "震", nature: "雷", quality: "啟動、震動、行動" },
  "011": { name: "巽", nature: "風", quality: "滲透、順入、調整" },
  "010": { name: "坎", nature: "水", quality: "險阻、流動、深處" },
  "001": { name: "艮", nature: "山", quality: "止步、界線、沉穩" },
  "000": { name: "坤", nature: "地", quality: "承載、順勢、養成" },
};

const kingWenTable = {
  "111": [1, 43, 14, 34, 9, 5, 26, 11],
  "110": [10, 58, 38, 54, 61, 60, 41, 19],
  "101": [13, 49, 30, 55, 37, 63, 22, 36],
  "100": [25, 17, 21, 51, 42, 3, 27, 24],
  "011": [44, 28, 50, 32, 57, 48, 18, 46],
  "010": [6, 47, 64, 40, 59, 29, 4, 7],
  "001": [33, 31, 56, 62, 53, 39, 52, 15],
  "000": [12, 45, 35, 16, 20, 8, 23, 2],
};

const hexagrams = {
  1: ["乾為天", "創始", "剛健", "主動"],
  2: ["坤為地", "承載", "順勢", "養成"],
  3: ["水雷屯", "初難", "萌芽", "建立秩序"],
  4: ["山水蒙", "啟蒙", "學習", "釐清"],
  5: ["水天需", "等待", "蓄勢", "時機"],
  6: ["天水訟", "爭議", "界線", "求證"],
  7: ["地水師", "組織", "紀律", "帶隊"],
  8: ["水地比", "親比", "結盟", "歸屬"],
  9: ["風天小畜", "小蓄", "收斂", "細節"],
  10: ["天澤履", "履行", "禮節", "風險分寸"],
  11: ["地天泰", "通泰", "上下相交", "開展"],
  12: ["天地否", "閉塞", "不交", "保守"],
  13: ["天火同人", "同道", "合作", "公開"],
  14: ["火天大有", "豐盛", "資源", "掌握"],
  15: ["地山謙", "謙退", "節制", "低姿態"],
  16: ["雷地豫", "預備", "振奮", "動員"],
  17: ["澤雷隨", "跟隨", "順勢", "調頻"],
  18: ["山風蠱", "整頓", "修復", "舊患"],
  19: ["地澤臨", "臨近", "督導", "擴張"],
  20: ["風地觀", "觀察", "審視", "示範"],
  21: ["火雷噬嗑", "決斷", "執法", "咬合"],
  22: ["山火賁", "修飾", "形象", "文采"],
  23: ["山地剝", "剝落", "耗損", "止跌"],
  24: ["地雷復", "回復", "轉機", "重新開始"],
  25: ["天雷無妄", "無妄", "真誠", "不妄動"],
  26: ["山天大畜", "大蓄", "積累", "約束"],
  27: ["山雷頤", "滋養", "入口", "自養"],
  28: ["澤風大過", "過重", "承壓", "非常手段"],
  29: ["坎為水", "重險", "習坎", "穿越困難"],
  30: ["離為火", "明辨", "依附", "照見"],
  31: ["澤山咸", "感應", "吸引", "互動"],
  32: ["雷風恆", "持久", "規律", "承諾"],
  33: ["天山遯", "退避", "保全", "抽離"],
  34: ["雷天大壯", "壯大", "力量", "節制衝勁"],
  35: ["火地晉", "晉升", "前進", "被看見"],
  36: ["地火明夷", "受傷之明", "低調", "守光"],
  37: ["風火家人", "家人", "內部秩序", "角色"],
  38: ["火澤睽", "分歧", "異中求同", "距離"],
  39: ["水山蹇", "阻滯", "繞路", "求援"],
  40: ["雷水解", "解除", "鬆綁", "釋放"],
  41: ["山澤損", "減損", "取捨", "節約"],
  42: ["風雷益", "增益", "投入", "互利"],
  43: ["澤天夬", "決裂", "宣告", "果斷"],
  44: ["天風姤", "相遇", "誘惑", "邊界"],
  45: ["澤地萃", "聚集", "資源匯合", "凝聚"],
  46: ["地風升", "上升", "漸進", "成長"],
  47: ["澤水困", "困局", "受限", "守正"],
  48: ["水風井", "井養", "基礎", "穩定供給"],
  49: ["澤火革", "改革", "換局", "去舊"],
  50: ["火風鼎", "鼎新", "承載價值", "成器"],
  51: ["震為雷", "震動", "驚醒", "啟動"],
  52: ["艮為山", "止", "界線", "安定"],
  53: ["風山漸", "漸進", "循序", "成形"],
  54: ["雷澤歸妹", "歸妹", "不正位", "調整關係"],
  55: ["雷火豐", "豐盛", "高峰", "明中有變"],
  56: ["火山旅", "旅途", "暫居", "謹慎"],
  57: ["巽為風", "順入", "滲透", "柔進"],
  58: ["兌為澤", "悅", "交流", "說服"],
  59: ["風水渙", "渙散", "化解", "重新凝聚"],
  60: ["水澤節", "節制", "規則", "限度"],
  61: ["風澤中孚", "信實", "內在誠意", "共鳴"],
  62: ["雷山小過", "小過", "細節超前", "低飛"],
  63: ["水火既濟", "既成", "完成後守成", "平衡"],
  64: ["火水未濟", "未成", "過渡", "完成前"],
};

const lineLabels = IS_EN
  ? ["First line", "Second line", "Third line", "Fourth line", "Fifth line", "Top line"]
  : ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"];
const els = {
  question: document.querySelector("#question"),
  questionCount: document.querySelector("#questionCount"),
  sampleQuestion: document.querySelector("#sampleQuestion"),
  coinTray: document.querySelector("#coinTray"),
  coins: Array.from(document.querySelectorAll(".coin")),
  castStatus: document.querySelector("#castStatus"),
  castButton: document.querySelector("#castButton"),
  resetButton: document.querySelector("#resetButton"),
  copyButton: document.querySelector("#copyButton"),
  lineStack: document.querySelector("#lineStack"),
  progressLabel: document.querySelector("#progressLabel"),
  primaryHex: document.querySelector("#primaryHex"),
  primaryMeta: document.querySelector("#primaryMeta"),
  changedHex: document.querySelector("#changedHex"),
  changedMeta: document.querySelector("#changedMeta"),
  movingLines: document.querySelector("#movingLines"),
  promptStyle: document.querySelector("#promptStyle"),
  promptStyleNote: document.querySelector("#promptStyleNote"),
  promptToneBadge: document.querySelector("#promptToneBadge"),
  promptToneSummary: document.querySelector("#promptToneSummary"),
  promptPack: document.querySelector("#promptPack"),
  promptSection: document.querySelector("#promptSection"),
  promptOutput: document.querySelector("#promptOutput"),
  proPreview: document.querySelector("#proPreview"),
  proPromptOutput: document.querySelector("#proPromptOutput"),
  resultCopyButton: document.querySelector("#resultCopyButton"),
  resultProCheckout: document.querySelector("#resultProCheckout"),
  resultWhatsAppConsult: document.querySelector("#resultWhatsAppConsult"),
  resultBarProCheckout: document.querySelector("#resultBarProCheckout"),
  resultBarDeliveryWhatsApp: document.querySelector("#resultBarDeliveryWhatsApp"),
  resultBarConsult: document.querySelector("#resultBarConsult"),
  checkoutLink: document.querySelector("#checkoutLink"),
  fulfillmentCheckout: document.querySelector("#fulfillmentCheckout"),
  checkoutNote: document.querySelector("#checkoutNote"),
  unlockCode: document.querySelector("#unlockCode"),
  applyUnlock: document.querySelector("#applyUnlock"),
  copyProButton: document.querySelector("#copyProButton"),
  commissionCheckout: document.querySelector("#commissionCheckout"),
  tierProCheckout: document.querySelector("#tierProCheckout"),
  tierQuickConsult: document.querySelector("#tierQuickConsult"),
  tierDeepConsult: document.querySelector("#tierDeepConsult"),
  whatsappConsult: document.querySelector("#whatsappConsult"),
  deliveryWhatsApp: document.querySelector("#deliveryWhatsApp"),
  shareCanvas: document.querySelector("#shareCanvas"),
  generateShareCard: document.querySelector("#generateShareCard"),
  downloadShareCard: document.querySelector("#downloadShareCard"),
  historyList: document.querySelector("#historyList"),
  clearHistory: document.querySelector("#clearHistory"),
  toast: document.querySelector("#toast"),
  gestureVideo: document.querySelector("#gestureVideo"),
  gestureCanvas: document.querySelector("#gestureCanvas"),
  cameraFrame: document.querySelector("#cameraFrame"),
  gestureBadge: document.querySelector("#gestureBadge"),
  gestureStatus: document.querySelector("#gestureStatus"),
  audioMeter: document.querySelector("#audioMeter"),
  audioReadout: document.querySelector("#audioReadout"),
  frequencyMeter: document.querySelector("#frequencyMeter"),
  frequencyReadout: document.querySelector("#frequencyReadout"),
  visionMeter: document.querySelector("#visionMeter"),
  visionReadout: document.querySelector("#visionReadout"),
  snapSensitivity: document.querySelector("#snapSensitivity"),
  startGesture: document.querySelector("#startGesture"),
  stopGesture: document.querySelector("#stopGesture"),
};

const state = {
  question: "",
  lines: [],
  coinsByLine: [],
  savedId: null,
  proUnlocked: localStorage.getItem(PRO_UNLOCK_KEY) === "unlocked",
  gesture: {
    active: false,
    loading: false,
    stream: null,
    handLandmarker: null,
    audioContext: null,
    analyser: null,
    audioSource: null,
    audioData: null,
    freqData: null,
    rafId: null,
    lastVideoTime: -1,
    lastFrameAt: 0,
    lastDistance: null,
    lastMiddleTip: null,
    primedAt: 0,
    fiveFoldStartedAt: 0,
    lastTriggerAt: 0,
    lastAudioTriggerAt: 0,
    lastFullCastAt: 0,
    lastTipSpread: null,
    audioBaseline: 0.018,
    audioPeakHold: 0,
    lastRms: 0,
    lastHighRatio: 0,
  },
};

function cleanInput(value, maxLength) {
  return value.replace(/<[^>]*>/g, "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength);
}

function tossCoins() {
  const coins = Array.from({ length: 3 }, () => {
    const isBack = Math.random() >= 0.5;
    return {
      face: isBack ? "背" : "字",
      value: isBack ? 3 : 2,
    };
  });
  return { coins, total: coins.reduce((sum, coin) => sum + coin.value, 0) };
}

function lineInfo(value) {
  const map = {
    6: {
      name: ui("老陰", "Old Yin"),
      bit: 0,
      changedBit: 1,
      moving: true,
      prompt: ui("老陰，陰爻變陽爻", "Old Yin: a yin line changing into yang"),
    },
    7: {
      name: ui("少陽", "Young Yang"),
      bit: 1,
      changedBit: 1,
      moving: false,
      prompt: ui("少陽，陽爻不變", "Young Yang: a stable yang line"),
    },
    8: {
      name: ui("少陰", "Young Yin"),
      bit: 0,
      changedBit: 0,
      moving: false,
      prompt: ui("少陰，陰爻不變", "Young Yin: a stable yin line"),
    },
    9: {
      name: ui("老陽", "Old Yang"),
      bit: 1,
      changedBit: 0,
      moving: true,
      prompt: ui("老陽，陽爻變陰爻", "Old Yang: a yang line changing into yin"),
    },
  };
  return map[value];
}

function hexFromBits(bits) {
  const lower = bits.slice(0, 3).join("");
  const upper = bits.slice(3, 6).join("");
  const upperIndex = trigramOrder.indexOf(upper);
  const number = kingWenTable[lower][upperIndex];
  return buildHex(number, upper, lower, bits);
}

function buildHex(number, upper, lower, bits = []) {
  const data = hexagrams[number];
  return {
    number,
    name: data[0],
    keywords: data.slice(1),
    bits: bits.map(String),
    upper: trigramMeta[upper],
    lower: trigramMeta[lower],
    upperKey: upper,
    lowerKey: lower,
  };
}

function formatHexTitle(hex) {
  return IS_EN ? `Hexagram ${hex.number} · ${hex.name}` : `第 ${hex.number} 卦 · ${hex.name}`;
}

function formatHexMeta(hex) {
  return IS_EN
    ? `Upper ${hex.upper.nature}${hex.upper.name} · Lower ${hex.lower.nature}${hex.lower.name} | Keywords: ${joinText(hex.keywords)}`
    : `上${hex.upper.nature}${hex.upper.name} · 下${hex.lower.nature}${hex.lower.name}｜${joinText(hex.keywords)}`;
}

function getReading() {
  if (state.lines.length < 6) return null;
  const originalBits = state.lines.map((value) => lineInfo(value).bit);
  const changedBits = state.lines.map((value) => lineInfo(value).changedBit);
  const moving = state.lines
    .map((value, index) => (lineInfo(value).moving ? index + 1 : null))
    .filter(Boolean);
  return {
    primary: hexFromBits(originalBits),
    changed: hexFromBits(changedBits),
    moving,
  };
}

function renderLines() {
  els.lineStack.innerHTML = "";
  for (let i = 5; i >= 0; i -= 1) {
    const value = state.lines[i];
    const row = document.createElement("div");
    row.className = "line-row";

    const label = document.createElement("small");
    label.textContent = lineLabels[i];

    const line = document.createElement("div");
    line.className = "yao empty";
    const type = document.createElement("div");
    type.className = "line-type";
    type.textContent = ui("待擲", "Pending");

    if (value) {
      const info = lineInfo(value);
      line.className = `yao ${info.bit ? "yang" : "yin"}${info.moving ? " moving" : ""}`;
      if (info.moving) {
        const marker = document.createElement("span");
        marker.textContent = ui("變", "Chg");
        line.append(marker);
      }
      type.textContent = `${value} · ${info.name}`;
    }

    row.append(label, line, type);
    els.lineStack.append(row);
  }
  els.progressLabel.textContent = `${state.lines.length} / 6`;
}

function renderResult() {
  const reading = getReading();
  if (!reading) {
    els.primaryHex.textContent = ui("未成卦", "Not cast yet");
    els.primaryMeta.textContent = ui("擲滿六爻後顯示", "Shown after six lines");
    els.changedHex.textContent = ui("未成卦", "Not cast yet");
    els.changedMeta.textContent = ui("有動爻時顯示", "Shown when moving lines appear");
    els.movingLines.textContent = ui("未有", "None yet");
    els.copyButton.disabled = true;
    els.promptSection.hidden = true;
    if (els.copyProButton) els.copyProButton.disabled = true;
    return;
  }

  els.primaryHex.textContent = formatHexTitle(reading.primary);
  els.primaryMeta.textContent = formatHexMeta(reading.primary);

  if (reading.moving.length) {
    els.changedHex.textContent = formatHexTitle(reading.changed);
    els.changedMeta.textContent = formatHexMeta(reading.changed);
    els.movingLines.textContent = joinText(reading.moving.map((line) => lineLabels[line - 1]));
  } else {
    els.changedHex.textContent = ui("無變卦", "No changed hexagram");
    els.changedMeta.textContent = ui(
      "六爻皆不動，重點集中在本卦整體卦意。",
      "No moving lines; focus on the primary hexagram as a whole."
    );
    els.movingLines.textContent = ui("未有", "None");
  }

  els.copyButton.disabled = false;
  els.promptSection.hidden = false;
  updatePromptOutputs(reading);
}

function getPromptStyleMeta() {
  const style = els.promptStyle?.value || "neutral";
  return promptStyleMeta[style] || promptStyleMeta.neutral;
}

function renderPromptStyleSummary() {
  const meta = getPromptStyleMeta();
  if (els.promptStyleNote) {
    els.promptStyleNote.textContent = meta.summary;
  }
  if (els.promptToneBadge) {
    els.promptToneBadge.textContent = meta.label;
  }
  if (els.promptToneSummary) {
    els.promptToneSummary.textContent = ui(
      `${meta.summary} 複製前可先切換模式，內容會即時更新。`,
      `${meta.summary} Change the mode before copying and the prompt updates immediately.`
    );
  }
}

function updatePromptOutputs(reading = getReading()) {
  if (!reading) return;
  renderPromptStyleSummary();
  const freePrompt = buildPrompt(reading, { mode: "free" });
  const proPrompt = buildPrompt(reading, { mode: "pro" });
  els.promptOutput.value = freePrompt;
  const promptMeta = getPromptStyleMeta();

  if (state.proUnlocked) {
    els.proPromptOutput.hidden = false;
    els.proPromptOutput.value = proPrompt;
    els.proPreview.textContent = ui(
      `Pro Prompt 已解鎖，現正使用「${promptMeta.label}」，可以直接複製完整版本。`,
      `Pro Prompt unlocked. Current tone: ${promptMeta.label}. You can copy the full version.`
    );
    els.copyProButton.disabled = false;
  } else {
    els.proPromptOutput.hidden = true;
    els.proPromptOutput.value = "";
    els.proPreview.textContent = ui(
      `已準備「${promptMeta.label}」：白話拆局、3 條追問、下一步清單、容易看錯的地方、可複製完整 prompt。`,
      `Prepared in ${promptMeta.label}: plain-language reading, 3 follow-up questions, next-step list, easy-to-misread points and copy-ready prompt.`
    );
    els.copyProButton.disabled = true;
  }
  renderMonetizationLinks(reading);
  drawShareCard(reading);
}

function renderMonetizationLinks(reading = getReading()) {
  const paymentUrl = getCheckoutUrl(reading);
  const consultUrl = getWhatsAppUrl(reading, { intent: "consult" });
  const deliveryUrl = getWhatsAppUrl(reading, { intent: "delivery" });
  const quickConsultUrl = getWhatsAppUrl(reading, { intent: "quick" });
  const deepConsultUrl = getWhatsAppUrl(reading, { intent: "deep" });
  const checkoutText = MONETIZATION.checkoutUrl
    ? reading
      ? ui(`已起卦，${MONETIZATION.proPrice} 解鎖白話 Pro Prompt`, `Cast complete: unlock plain Pro Prompt · ${MONETIZATION.proPrice}`)
      : ui(`${MONETIZATION.proPrice} 解鎖白話 Pro Prompt`, `Unlock plain Pro Prompt · ${MONETIZATION.proPrice}`)
    : ui("WhatsApp 取得付款連結", "Get payment link on WhatsApp");
  [els.checkoutLink, els.commissionCheckout, els.fulfillmentCheckout, els.tierProCheckout, els.resultProCheckout, els.resultBarProCheckout].forEach((link) => {
    if (!link) return;
    link.href = paymentUrl;
    link.textContent = checkoutText;
  });
  if (els.whatsappConsult) {
    els.whatsappConsult.href = consultUrl;
  }
  if (els.deliveryWhatsApp) {
    els.deliveryWhatsApp.href = deliveryUrl;
  }
  if (els.resultBarDeliveryWhatsApp) {
    els.resultBarDeliveryWhatsApp.href = deliveryUrl;
  }
  if (els.resultWhatsAppConsult) {
    els.resultWhatsAppConsult.href = quickConsultUrl;
  }
  if (els.resultBarConsult) {
    els.resultBarConsult.href = consultUrl;
  }
  if (els.tierQuickConsult) {
    els.tierQuickConsult.href = quickConsultUrl;
  }
  if (els.tierDeepConsult) {
    els.tierDeepConsult.href = deepConsultUrl;
  }
  if (els.checkoutNote) {
    els.checkoutNote.textContent = MONETIZATION.checkoutUrl
      ? ui(
          "付款後請用 WhatsApp 發送收據，核對後會回覆 Pro 解鎖碼。",
          "After payment, send your Stripe receipt via WhatsApp. The Pro unlock code will be sent after verification."
        )
      : ui(
          "暫未填入 Stripe Payment Link；此 MVP 會先用 WhatsApp 承接付款與委託。",
          "Stripe Payment Link is not configured yet; this MVP will handle payment and consultation through WhatsApp first."
        );
  }
}

function getCheckoutUrl(reading = getReading()) {
  if (MONETIZATION.checkoutUrl) return MONETIZATION.checkoutUrl;
  return getWhatsAppUrl(reading, { intent: "payment" });
}

function getWhatsAppUrl(reading = getReading(), { intent = "consult" } = {}) {
  const question = cleanInput(els.question.value, 180) || ui("我想查詢六爻解卦", "I would like an I Ching six-line reading.");
  const hexText = reading
    ? ui(
        `本卦：第 ${reading.primary.number} 卦《${reading.primary.name}》；變卦：${reading.moving.length ? `第 ${reading.changed.number} 卦《${reading.changed.name}》` : "無變卦"}`,
        `Primary hexagram: Hexagram ${reading.primary.number} ${reading.primary.name}; Changed hexagram: ${reading.moving.length ? `Hexagram ${reading.changed.number} ${reading.changed.name}` : "none"}`
      )
    : ui("尚未完成起卦", "Casting not completed yet");
  const prefixes = {
    payment: ui(`我想購買 ${MONETIZATION.proPrice} Pro Prompt 解鎖碼。`, `I would like to buy the ${MONETIZATION.proPrice} Pro Prompt unlock code.`),
    delivery: ui("我已完成付款，想領取 Pro Prompt 解鎖碼。", "I have completed payment and would like to receive the Pro Prompt unlock code."),
    quick: ui("我想預約 HK$188 真人簡批。", "I would like to book the HK$188 human quick reading."),
    deep: ui("我想了解 HK$1680 起找大師父協助的安排。", "I would like to learn about the HK$1680+ senior master consultation arrangement."),
    consult: ui("我想委託真人拆解這支卦。", "I would like a human reading for this hexagram."),
  };
  const prefix = prefixes[intent] || prefixes.consult;
  const message = ui(
    `${prefix}\n\n問題：${question}\n${hexText}\n\n網站：${location.origin}${location.pathname}`,
    `${prefix}\n\nQuestion: ${question}\n${hexText}\n\nWebsite: ${location.origin}${location.pathname}`
  );
  const phone = MONETIZATION.whatsappNumber.replace(/\D/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function renderControls() {
  const nextLine = state.lines.length + 1;
  els.castButton.disabled = state.lines.length >= 6;
  els.castButton.textContent = state.lines.length >= 6 ? ui("已成卦", "Completed") : ui(`擲第 ${nextLine} 爻`, `Cast line ${nextLine}`);
  if (state.lines.length === 0) {
    els.castStatus.textContent = ui(
      "準備由初爻開始。每次會擲三枚銅錢，共六次。",
      "Ready to begin from the first line. Each cast tosses three coins, six times in total."
    );
  } else if (state.lines.length < 6) {
    els.castStatus.textContent = ui(
      `已完成 ${state.lines.length} 爻，下一步擲${lineLabels[state.lines.length]}。`,
      `${state.lines.length} line(s) completed. Next: ${lineLabels[state.lines.length]}.`
    );
  } else {
    els.castStatus.textContent = ui(
      "六爻已成。你可以複製 prompt，貼到外部 AI 作中立解卦。",
      "The six lines are complete. Copy the prompt and paste it into an external AI for a neutral reading."
    );
  }
}

function renderCoins(coins) {
  els.coins.forEach((coinEl, index) => {
    const coin = coins?.[index] || { face: index === 1 ? "背" : "字" };
    coinEl.dataset.face = coin.face;
    coinEl.textContent = coin.face;
    coinEl.classList.remove("is-tossing");
    window.requestAnimationFrame(() => coinEl.classList.add("is-tossing"));
  });
}

function renderAll() {
  state.question = els.question.value;
  els.questionCount.textContent = `${state.question.length} / 180`;
  renderLines();
  renderResult();
  renderControls();
  renderHistory();
}

function setGestureStatus(message, badge = null) {
  els.gestureStatus.textContent = message;
  if (badge) els.gestureBadge.textContent = badge;
}

function updateDiagnostics({ rms = null, highRatio = null, vision = null } = {}) {
  if (rms !== null && els.audioMeter && els.audioReadout) {
    const audioPct = Math.min(Math.round(rms * 320), 100);
    els.audioMeter.style.width = `${audioPct}%`;
    els.audioReadout.textContent = `${Math.round(rms * 100)}%`;
  }
  if (highRatio !== null && els.frequencyMeter && els.frequencyReadout) {
    const frequencyPct = Math.min(Math.round(highRatio * 100), 100);
    els.frequencyMeter.style.width = `${frequencyPct}%`;
    els.frequencyReadout.textContent = `${Math.round(highRatio * 100)}%`;
  }
  if (vision !== null && els.visionMeter && els.visionReadout) {
    const states = {
      idle: ["0%", ui("未載入", "Not loaded")],
      loading: ["38%", ui("載入中", "Loading")],
      ready: ["100%", ui("已就緒", "Ready")],
      unavailable: ["16%", ui("只用聲音", "Audio only")],
    };
    const [width, label] = states[vision] || states.idle;
    els.visionMeter.style.width = width;
    els.visionReadout.textContent = label;
  }
}

function getAudioSensitivity() {
  const selected = els.snapSensitivity?.value || "normal";
  return AUDIO_SENSITIVITY[selected] || AUDIO_SENSITIVITY.normal;
}

async function loadVisionModule() {
  if (window.vision?.HandLandmarker) return window.vision;
  window.vision = await import(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/vision_bundle.mjs`);
  return window.vision;
}

async function getHandLandmarker() {
  if (state.gesture.handLandmarker) return state.gesture.handLandmarker;
  await loadVisionModule();
  const { FilesetResolver, HandLandmarker } = window.vision || {};
  if (!FilesetResolver || !HandLandmarker) {
    throw new Error("MediaPipe Hand Landmarker is unavailable");
  }
  const vision = await FilesetResolver.forVisionTasks(
    `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`
  );
  state.gesture.handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
    },
    runningMode: "VIDEO",
    numHands: 1,
    minHandDetectionConfidence: 0.55,
    minHandPresenceConfidence: 0.55,
    minTrackingConfidence: 0.55,
  });
  return state.gesture.handLandmarker;
}

async function startGestureCamera() {
  if (state.gesture.active || state.gesture.loading) return;
  if (!navigator.mediaDevices?.getUserMedia) {
    setGestureStatus(
      ui("此瀏覽器不支援相機存取，請改用 HTTPS 或較新的瀏覽器。", "This browser does not support camera access. Use HTTPS or a newer browser."),
      ui("不支援相機", "No camera")
    );
    return;
  }

  state.gesture.loading = true;
  els.startGesture.disabled = true;
  setGestureStatus(ui("正在請求相機與麥克風權限。", "Requesting camera and microphone permissions."), ui("啟動中", "Starting"));

  try {
    const stream = await getGestureMediaStream();
    state.gesture.stream = stream;
    setupAudioDetection(stream);
    if (state.gesture.audioContext?.state === "suspended") {
      await state.gesture.audioContext.resume();
    }
    state.gesture.active = true;
    state.gesture.lastVideoTime = -1;
    state.gesture.lastDistance = null;
    state.gesture.lastMiddleTip = null;
    state.gesture.primedAt = 0;
    state.gesture.fiveFoldStartedAt = 0;
    state.gesture.lastTipSpread = null;
    if (stream.getVideoTracks().length) {
      els.gestureVideo.srcObject = stream;
      els.gestureVideo.play().catch(() => {
        setGestureStatus(
          ui("相機預覽未能自動播放；聲音識別仍然可用。", "Camera preview could not autoplay; audio detection is still available."),
          ui("只用聲音", "Audio only")
        );
      });
      els.cameraFrame.classList.add("is-active");
    }
    els.stopGesture.disabled = false;
    gestureLoop();
    setGestureStatus(
      ui("聲音識別已開啟，正在載入手部識別模型。", "Audio detection is active. Loading the hand model."),
      ui("聲音已啟動", "Audio on")
    );
    updateDiagnostics({ vision: "loading" });
    try {
      state.gesture.handLandmarker = await getHandLandmarker();
      updateDiagnostics({ vision: "ready" });
      setGestureStatus(
        stream.getVideoTracks().length
          ? ui("相機與聲音已開啟。打響指逐爻擲卦；五指合攏保持一瞬，會一手出六爻。", "Camera and audio are active. Snap to cast line by line; close five fingers briefly to cast all six lines.")
          : ui("聲音識別已開啟；未有相機畫面，所以只用響指聲觸發。", "Audio detection is active. No camera view is available, so snap sound alone will trigger casting."),
        stream.getVideoTracks().length ? ui("等待手勢/聲音", "Waiting") : ui("只用聲音", "Audio only")
      );
    } catch (modelError) {
      updateDiagnostics({ vision: "unavailable" });
      setGestureStatus(
        ui("聲音識別已開啟；手部模型載入失敗，現在只用響指聲觸發。", "Audio detection is active. The hand model failed to load, so snap sound alone will trigger casting."),
        ui("只用聲音", "Audio only")
      );
    }
  } catch (error) {
    stopGestureCamera();
    const denied = error?.name === "NotAllowedError";
    setGestureStatus(
      denied
        ? ui("相機或麥克風權限被拒。請在瀏覽器允許 camera/microphone 後再試。", "Camera or microphone permission was denied. Allow camera/microphone in the browser and try again.")
        : ui(`識別未能啟動：${error.message || "未知錯誤"}`, `Recognition could not start: ${error.message || "unknown error"}`),
      ui("未啟動", "Off")
    );
  } finally {
    state.gesture.loading = false;
    els.startGesture.disabled = state.gesture.active;
  }
}

async function getGestureMediaStream() {
  const audio = {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  };
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
      audio,
    });
  } catch (error) {
    if (error?.name === "NotAllowedError") throw error;
    return navigator.mediaDevices.getUserMedia({ video: false, audio });
  }
}

function stopGestureCamera() {
  if (state.gesture.rafId) {
    cancelAnimationFrame(state.gesture.rafId);
    state.gesture.rafId = null;
  }
  if (state.gesture.stream) {
    state.gesture.stream.getTracks().forEach((track) => track.stop());
  }
  if (state.gesture.audioSource) {
    state.gesture.audioSource.disconnect();
  }
  if (state.gesture.audioContext) {
    state.gesture.audioContext.close();
  }
  state.gesture.active = false;
  state.gesture.loading = false;
  state.gesture.stream = null;
  state.gesture.audioContext = null;
  state.gesture.analyser = null;
  state.gesture.audioSource = null;
  state.gesture.audioData = null;
  state.gesture.freqData = null;
  state.gesture.lastDistance = null;
  state.gesture.lastMiddleTip = null;
  state.gesture.primedAt = 0;
  state.gesture.fiveFoldStartedAt = 0;
  state.gesture.lastTipSpread = null;
  state.gesture.audioPeakHold = 0;
  state.gesture.lastRms = 0;
  state.gesture.lastHighRatio = 0;
  els.gestureVideo.pause();
  els.gestureVideo.removeAttribute("src");
  els.gestureVideo.srcObject = null;
  clearGestureCanvas();
  els.cameraFrame.classList.remove("is-active", "is-triggered", "is-audio-hot");
  els.startGesture.disabled = false;
  els.stopGesture.disabled = true;
  updateDiagnostics({ rms: 0, highRatio: 0, vision: "idle" });
  setGestureStatus(ui("相機已停止。", "Camera stopped."), ui("相機未啟動", "Camera off"));
}

function setupAudioDetection(stream) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    setGestureStatus(
      ui("此瀏覽器不支援 Web Audio，會只用相機手勢偵測。", "This browser does not support Web Audio, so only camera gesture detection will be used."),
      ui("只用相機", "Camera only")
    );
    return;
  }
  const audioContext = new AudioContextClass();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.2;
  const audioSource = audioContext.createMediaStreamSource(stream);
  audioSource.connect(analyser);
  state.gesture.audioContext = audioContext;
  state.gesture.analyser = analyser;
  state.gesture.audioSource = audioSource;
  state.gesture.audioData = new Uint8Array(analyser.fftSize);
  state.gesture.freqData = new Uint8Array(analyser.frequencyBinCount);
  state.gesture.audioBaseline = 0.018;
  state.gesture.audioPeakHold = 0;
  state.gesture.lastRms = 0;
  state.gesture.lastHighRatio = 0;
  updateDiagnostics({ rms: 0, highRatio: 0 });
  audioContext.resume().catch(() => {});
}

function gestureLoop() {
  if (!state.gesture.active) return;
  const video = els.gestureVideo;
  if (state.gesture.handLandmarker && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.currentTime !== state.gesture.lastVideoTime) {
    state.gesture.lastVideoTime = video.currentTime;
    const now = performance.now();
    const result = state.gesture.handLandmarker.detectForVideo(video, now);
    handleGestureResult(result, now);
  }
  analyzeAudioSnap(performance.now());
  state.gesture.rafId = requestAnimationFrame(gestureLoop);
}

function handleGestureResult(result, now) {
  const landmarks = result?.landmarks?.[0];
  if (!landmarks) {
    clearGestureCanvas();
    if (now - state.gesture.lastTriggerAt > 900) {
      setGestureStatus(
        ui("未見到手。請把手放在鏡頭中央，光線要足夠。", "No hand detected. Place your hand in the centre of the camera with enough light."),
        ui("尋找手部", "Finding hand")
      );
    }
    state.gesture.lastDistance = null;
    state.gesture.lastMiddleTip = null;
    state.gesture.primedAt = 0;
    state.gesture.fiveFoldStartedAt = 0;
    state.gesture.lastTipSpread = null;
    return;
  }

  drawGestureOverlay(landmarks);
  const fullCastGesture = analyzeFiveFingerCloseGesture(landmarks, now);
  if (fullCastGesture) return;

  const snap = analyzeSnapGesture(landmarks, now);
  if (!snap) return;

  triggerGestureCast();
  els.cameraFrame.classList.add("is-triggered");
  window.setTimeout(() => els.cameraFrame.classList.remove("is-triggered"), 420);
}

function analyzeFiveFingerCloseGesture(landmarks, now) {
  const palmScale = getPalmScale(landmarks);
  const tipSpread = getTipSpread(landmarks, palmScale);
  state.gesture.lastTipSpread = tipSpread;

  if (tipSpread > FIVE_FINGER_CAST_SPREAD) {
    state.gesture.fiveFoldStartedAt = 0;
    return false;
  }

  state.gesture.lastDistance = null;
  state.gesture.lastMiddleTip = null;
  state.gesture.primedAt = 0;

  if (!state.gesture.fiveFoldStartedAt) {
    state.gesture.fiveFoldStartedAt = now;
  }

  if (state.lines.length >= 6) {
    setGestureStatus(
      ui("六爻已成。張開手或按重來後，可以再五指合攏起新卦。", "The six lines are complete. Open your hand or reset before using the five-finger cast again."),
      ui("已成卦", "Complete")
    );
    return true;
  }

  if (!cleanInput(els.question.value, 180)) {
    state.gesture.fiveFoldStartedAt = 0;
    setGestureStatus(
      ui("請先寫下你的問題，再五指合攏一手成卦。", "Write your question first, then close five fingers to cast the full hexagram."),
      ui("需要問題", "Question needed")
    );
    return true;
  }

  const heldMs = now - state.gesture.fiveFoldStartedAt;
  if (heldMs < FIVE_FINGER_CAST_HOLD_MS) {
    setGestureStatus(
      ui("五指已合攏。保持一瞬，即可一手出六爻；命運皆掌控在你手。", "Five fingers closed. Hold for a moment to cast all six lines; destiny remains in your hands."),
      ui("五指合攏", "Five fingers")
    );
    return true;
  }

  const cooldownPassed = (!state.gesture.lastFullCastAt || now - state.gesture.lastFullCastAt > FIVE_FINGER_CAST_COOLDOWN_MS)
    && (!state.gesture.lastTriggerAt || now - state.gesture.lastTriggerAt > SNAP_COOLDOWN_MS);
  if (!cooldownPassed) return true;

  state.gesture.lastFullCastAt = now;
  state.gesture.lastTriggerAt = now;
  state.gesture.fiveFoldStartedAt = 0;
  const completed = triggerFullHandCast();
  if (completed) {
    els.cameraFrame.classList.add("is-triggered");
    window.setTimeout(() => els.cameraFrame.classList.remove("is-triggered"), 520);
  }
  return true;
}

function analyzeSnapGesture(landmarks, now) {
  const thumbTip = landmarks[4];
  const middleTip = landmarks[12];
  const palmScale = getPalmScale(landmarks);
  const pinchDistance = distance2d(thumbTip, middleTip) / palmScale;
  const frameMs = Math.max(now - (state.gesture.lastFrameAt || now), 16);
  const middleSpeed = state.gesture.lastMiddleTip
    ? distance2d(middleTip, state.gesture.lastMiddleTip) / (frameMs / 1000)
    : 0;
  const distanceDelta = state.gesture.lastDistance == null ? 0 : pinchDistance - state.gesture.lastDistance;

  state.gesture.lastFrameAt = now;
  state.gesture.lastDistance = pinchDistance;
  state.gesture.lastMiddleTip = { ...middleTip };

  if (pinchDistance < 0.36) {
    state.gesture.primedAt = now;
    setGestureStatus(
      ui("已見到手指貼近。現在快速打響指，手勢或聲音都可觸發。", "Fingers are close. Snap quickly now; gesture or sound can trigger the cast."),
      ui("已準備", "Primed")
    );
    return false;
  }

  const isWithinPrimeWindow = state.gesture.primedAt && now - state.gesture.primedAt < SNAP_PRIME_WINDOW_MS;
  const hasCooldownPassed = now - state.gesture.lastTriggerAt > SNAP_COOLDOWN_MS;
  const openedFast = pinchDistance > 0.56 && distanceDelta > 0.1 && middleSpeed > 0.55;

  if (isWithinPrimeWindow && hasCooldownPassed && openedFast) {
    state.gesture.lastTriggerAt = now;
    state.gesture.primedAt = 0;
    return true;
  }

  if (state.lines.length >= 6) {
    setGestureStatus(
      ui("六爻已成。按重來後可以再用打響指起新卦。", "The six lines are complete. Reset before using snap casting again."),
      ui("已成卦", "Complete")
    );
  } else {
    setGestureStatus(
      ui("已見到手。請先合攏拇指與中指，再快速分開。", "Hand detected. Bring thumb and middle finger together, then separate quickly."),
      ui("手部已識別", "Hand seen")
    );
  }
  return false;
}

function analyzeAudioSnap(now) {
  const analyser = state.gesture.analyser;
  if (!analyser || !state.gesture.audioData || !state.gesture.freqData) return false;
  analyser.getByteTimeDomainData(state.gesture.audioData);
  analyser.getByteFrequencyData(state.gesture.freqData);

  const rms = getRms(state.gesture.audioData);
  const highRatio = getHighFrequencyRatio(state.gesture.freqData);
  const rmsDelta = Math.max(0, rms - state.gesture.lastRms);
  const handPrimed = Boolean(state.gesture.primedAt && now - state.gesture.primedAt < SNAP_PRIME_WINDOW_MS);
  const sensitivity = getAudioSensitivity();
  const handBoost = handPrimed ? 0.78 : 1;
  state.gesture.audioBaseline = state.gesture.audioBaseline * 0.96 + Math.min(rms, 0.18) * 0.04;
  state.gesture.audioPeakHold = Math.max(rms, state.gesture.audioPeakHold * 0.88);
  state.gesture.lastRms = rms;
  state.gesture.lastHighRatio = highRatio;
  updateDiagnostics({ rms: state.gesture.audioPeakHold, highRatio });

  const isSharpPeak = rms > Math.max(
    sensitivity.peakFloor * handBoost,
    state.gesture.audioBaseline * sensitivity.baselinePeak * handBoost
  );
  const isFastTransient = rmsDelta > sensitivity.transientDelta * handBoost
    && rms > Math.max(
      sensitivity.transientFloor * handBoost,
      state.gesture.audioBaseline * sensitivity.transientBaseline * handBoost
    );
  const isCrisp = highRatio > sensitivity.crisp * handBoost
    || (highRatio > sensitivity.transientCrisp * handBoost && isFastTransient);
  const cooldownPassed = now - state.gesture.lastAudioTriggerAt > AUDIO_SNAP_COOLDOWN_MS;
  const castCooldownPassed = now - state.gesture.lastTriggerAt > SNAP_COOLDOWN_MS;

  if (isSharpPeak || isFastTransient) {
    els.cameraFrame.classList.add("is-audio-hot");
    window.setTimeout(() => els.cameraFrame.classList.remove("is-audio-hot"), 260);
  }

  if ((isSharpPeak || isFastTransient) && isCrisp && cooldownPassed && castCooldownPassed) {
    state.gesture.lastAudioTriggerAt = now;
    state.gesture.lastTriggerAt = now;
    triggerGestureCast(handPrimed ? "fusion" : "sound");
    els.cameraFrame.classList.add("is-triggered");
    window.setTimeout(() => els.cameraFrame.classList.remove("is-triggered"), 420);
    return true;
  }
  return false;
}

function triggerGestureCast(source = "vision") {
  if (state.lines.length >= 6) {
    setGestureStatus(
      ui("六爻已成。按重來後可以再用打響指起新卦。", "The six lines are complete. Reset before using snap casting again."),
      ui("已成卦", "Complete")
    );
    return;
  }
  const before = state.lines.length;
  castNextLine();
  if (state.lines.length > before) {
    const label = source === "sound" ? ui("聲音", "sound") : source === "fusion" ? ui("手勢＋聲音", "gesture + sound") : ui("手勢", "gesture");
    setGestureStatus(
      ui(
        `已偵測到打響指${label}，完成${lineLabels[state.lines.length - 1]}。`,
        `Snap ${label} detected. ${lineLabels[state.lines.length - 1]} completed.`
      ),
      ui("已擲爻", "Line cast")
    );
  }
}

function triggerFullHandCast() {
  if (state.lines.length >= 6) {
    setGestureStatus(
      ui("六爻已成。按重來後可以再五指合攏起新卦。", "The six lines are complete. Reset before using the five-finger cast again."),
      ui("已成卦", "Complete")
    );
    return false;
  }

  const before = state.lines.length;
  while (state.lines.length < 6) {
    if (!castNextLine()) break;
  }
  const added = state.lines.length - before;
  if (!added) {
    setGestureStatus(
      ui("請先寫下你的問題，再五指合攏一手成卦。", "Write your question first, then close five fingers to cast the full hexagram."),
      ui("需要問題", "Question needed")
    );
    return false;
  }

  setGestureStatus(
    ui(
      added === 6
        ? "五指合攏，一手成卦。六爻已出，命運皆掌控在你手。"
        : `五指合攏，已補齊餘下 ${added} 爻。六爻已出，命運皆掌控在你手。`,
      added === 6
        ? "Five fingers closed: the full hexagram is cast. Destiny remains in your hands."
        : `Five fingers closed: ${added} remaining line(s) completed. Destiny remains in your hands.`
    ),
    ui("一手成卦", "Full cast")
  );
  showToast(ui("五指合攏，一手出六爻。", "Five-finger full cast completed."));
  return true;
}

function getPalmScale(landmarks) {
  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  const indexMcp = landmarks[5];
  const pinkyMcp = landmarks[17];
  return Math.max(distance2d(wrist, middleMcp), distance2d(indexMcp, pinkyMcp), 0.05);
}

function getTipSpread(landmarks, palmScale) {
  const tips = FINGER_TIP_INDEXES.map((index) => landmarks[index]).filter(Boolean);
  let maxDistance = 0;
  tips.forEach((tip, index) => {
    tips.slice(index + 1).forEach((otherTip) => {
      maxDistance = Math.max(maxDistance, distance2d(tip, otherTip));
    });
  });
  return maxDistance / palmScale;
}

function distance2d(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getRms(samples) {
  let total = 0;
  for (const sample of samples) {
    const centered = (sample - 128) / 128;
    total += centered * centered;
  }
  return Math.sqrt(total / samples.length);
}

function getHighFrequencyRatio(freqData) {
  let high = 0;
  let total = 0;
  const highStart = Math.floor(freqData.length * 0.45);
  for (let i = 2; i < freqData.length; i += 1) {
    const value = freqData[i];
    total += value;
    if (i >= highStart) high += value;
  }
  return total ? high / total : 0;
}

function drawGestureOverlay(landmarks) {
  const canvas = els.gestureCanvas;
  const video = els.gestureVideo;
  const width = video.videoWidth || 640;
  const height = video.videoHeight || 480;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  ctx.lineWidth = Math.max(width * 0.006, 3);
  ctx.strokeStyle = "rgba(241, 207, 117, 0.92)";
  ctx.fillStyle = "rgba(123, 181, 155, 0.9)";
  drawHandLine(ctx, landmarks, width, height, [0, 5, 9, 13, 17, 0]);
  drawHandLine(ctx, landmarks, width, height, [4, 3, 2, 1, 0]);
  drawHandLine(ctx, landmarks, width, height, [8, 7, 6, 5]);
  drawHandLine(ctx, landmarks, width, height, [12, 11, 10, 9]);
  drawHandLine(ctx, landmarks, width, height, [16, 15, 14, 13]);
  drawHandLine(ctx, landmarks, width, height, [20, 19, 18, 17]);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.78)";
  drawHandLine(ctx, landmarks, width, height, [4, 12]);
  if (state.gesture.lastTipSpread !== null && state.gesture.lastTipSpread <= FIVE_FINGER_CAST_SPREAD) {
    drawHandLine(ctx, landmarks, width, height, [4, 8, 12, 16, 20, 4]);
  }
  FINGER_TIP_INDEXES.forEach((index) => {
    const point = landmarks[index];
    ctx.beginPath();
    ctx.arc(point.x * width, point.y * height, 8, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawHandLine(ctx, landmarks, width, height, indexes) {
  ctx.beginPath();
  indexes.forEach((index, order) => {
    const point = landmarks[index];
    const x = point.x * width;
    const y = point.y * height;
    if (order === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function clearGestureCanvas() {
  const canvas = els.gestureCanvas;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function buildPrompt(reading, { mode = "free" } = {}) {
  const question = cleanInput(els.question.value, 180) || ui(
    "未填寫問題，請先協助我將卦象作一般性分析。",
    "No question was entered. Please interpret this cast as a general situation reading."
  );
  const style = els.promptStyle?.value || "neutral";
  const pack = promptPacks[els.promptPack?.value || "decision"] || promptPacks.decision;
  const styleText = {
    neutral: ui(
      "請以中立、直接、尊重《易經》象義的方式解讀；不要空泛安慰，不要恐嚇，不要把卦意硬套成單一答案。",
      "Read this neutrally, directly and with respect for I Ching symbolism. Avoid vague comfort, fear-based claims or forcing the hexagram into one fixed answer."
    ),
    healer: ui(
      "請以療癒師語氣解讀：先讓人放鬆和感到被理解，再講清局勢。語氣要溫柔、穩定、接地；不要過度安慰，不要叫人逃避現實，也不要把問題包裝成一定會好。",
      "Use a healer tone: help the reader feel calm and understood before explaining the situation. Be gentle, steady and grounded. Do not over-comfort, encourage avoidance or pretend everything will definitely be fine."
    ),
    sarcastic: ui(
      "請以嘲諷模式解讀：可以用少少寸嘴、幽默和反問提醒我別自欺，但不要羞辱、恐嚇、歧視或攻擊脆弱處。每次講完笑點，都要補回一句清楚、有用、做得到的下一步。",
      "Use sarcastic mode: use light sarcasm, humor and sharp questions to challenge self-deception, but do not humiliate, threaten, discriminate or attack vulnerable points. After every joke or jab, add one clear, useful and doable next step."
    ),
    advisor: ui(
      "請以顧問式分析：先講局勢，再講風險、資源、時間點和可執行選項；保持中立，不要過度神化。",
      "Use a consultant-style analysis: situation first, then risks, resources, timing and executable options. Stay neutral and do not over-mystify."
    ),
    action: ui(
      "請優先輸出行動建議：哪些事應該做、暫緩、避免、觀察；每項建議要扣回卦象與動爻。",
      "Prioritize action advice: what to do, pause, avoid and observe. Every suggestion must connect back to the hexagram and moving lines."
    ),
  }[style] || promptStyleMeta.neutral.summary;

  const lineRows = state.lines
    .map((value, index) => {
      const info = lineInfo(value);
      const coins = state.coinsByLine[index]
        .map((coin) => `${coinFaceText(coin.face)}(${coin.value})`)
        .join(" + ");
      return IS_EN
        ? `${lineLabels[index]}: ${coins} = ${value}; ${info.prompt}`
        : `${lineLabels[index]}：${coins} = ${value}，${info.prompt}`;
    })
    .join("\n");

  const movingText = reading.moving.length
    ? joinText(reading.moving.map((line) => lineLabels[line - 1]))
    : ui("無動爻", "No moving lines");

  const changedText = reading.moving.length
    ? ui(
        `變卦：第 ${reading.changed.number} 卦《${reading.changed.name}》，上${reading.changed.upper.nature}${reading.changed.upper.name}、下${reading.changed.lower.nature}${reading.changed.lower.name}，關鍵詞：${joinText(reading.changed.keywords)}`,
        `Changed hexagram: Hexagram ${reading.changed.number} ${reading.changed.name}; upper ${reading.changed.upper.nature}${reading.changed.upper.name}, lower ${reading.changed.lower.nature}${reading.changed.lower.name}; keywords: ${joinText(reading.changed.keywords)}`
      )
    : ui(
        "變卦：無；六爻皆不動，請集中分析本卦整體卦意。",
        "Changed hexagram: none. All six lines are stable, so focus on the primary hexagram as a whole."
      );

  const basePrompt = IS_EN ? `You are an I Ching interpreter familiar with the six-line three-coin method. Analyze the data below instead of casting again.

User question:
${question}

Scenario:
${pack.label}

Casting method:
Three coins were tossed six times, from the first line upward. Character side = 2, back side = 3; 6 = Old Yin, 7 = Young Yang, 8 = Young Yin, 9 = Old Yang. Old Yin and Old Yang are moving lines.

Six line results:
${lineRows}

Primary hexagram:
Hexagram ${reading.primary.number} ${reading.primary.name}; upper ${reading.primary.upper.nature}${reading.primary.upper.name}, lower ${reading.primary.lower.nature}${reading.primary.lower.name}; keywords: ${joinText(reading.primary.keywords)}

Moving lines:
${movingText}

${changedText}

Reading requirements:
${styleText}
${pack.focus}

Plain-language rules:
- Answer in simple everyday English. Assume the reader has never studied I Ching and may not know academic words.
- Do not use jargon. If you must mention a term such as moving line or changed hexagram, explain it immediately in plain words.
- Use short sentences. Prefer concrete examples from daily life over abstract theory.
- Be respectful and practical. Do not sound mysterious, superior or academic.

Use this structure:
1. One-sentence answer: say the main message in plain words.
2. What is happening now: explain the situation like speaking to a normal person.
3. What is changing: if there are moving lines, explain them as "the part that is changing"; if none, say the situation is steadier and the main hexagram matters most.
4. What may happen next: explain the changed hexagram in simple words; if none, do not force a future prediction.
5. What I can do: list 3-5 simple actions.
6. What not to do: list 2-3 traps or wrong moves.
7. Final reminder: I still need to decide and act for myself.`
    : `你是一位熟悉《易經》六爻銅錢起卦的解卦者。請根據以下資料作分析，而不是重新起卦。

用戶問題：
${question}

問題場景：
${pack.label}

起卦方式：
三枚銅錢擲六次，由初爻至上爻，由下而上成卦。字=2，背=3；6=老陰、7=少陽、8=少陰、9=老陽；老陰與老陽為動爻。

六爻結果：
${lineRows}

本卦：
第 ${reading.primary.number} 卦《${reading.primary.name}》，上${reading.primary.upper.nature}${reading.primary.upper.name}、下${reading.primary.lower.nature}${reading.primary.lower.name}，關鍵詞：${reading.primary.keywords.join("、")}

動爻：
${movingText}

${changedText}

解讀要求：
${styleText}
${pack.focus}

白話要求：
- 請用香港人看得明的繁體中文回答，越淺白越好。
- 假設讀者完全不懂《易經》，也不懂術語；不要拋書面字、古文或玄學術語。
- 如果一定要提「本卦、動爻、變卦」，要即刻用白話解釋，例如「現在的情況」、「正在變的地方」、「之後可能變成的方向」。
- 每句要短，像真人慢慢解釋給街坊聽。不要扮高深，不要用恐嚇語氣。
- 多用生活例子，少用抽象道理。

請按以下結構輸出：
1. 一句話答案：先用一句最淺白的話講重點。
2. 現在發生咩事：用日常說法解釋這個卦在講什麼。
3. 邊度正在變：如有動爻，講清楚哪幾個地方正在變；如無動爻，就講局勢較穩，重點在當前情況。
4. 之後可能點走：如有變卦，用白話講可能變成什麼情況；如無變卦，不要硬作預言。
5. 我可以做咩：列出 3-5 件簡單、做得到的事。
6. 我不要做咩：列出 2-3 個最容易做錯的位。
7. 最後提醒：講清楚卦只提供提醒，最後仍要自己決定和行動。`;

  if (mode !== "pro") return `${basePrompt}

${PROMPT_CLOSING_CALL}`;

  const proRequirements = IS_EN ? `Pro plain-language deepening:
1. First explain the real stuck point in 5 short sentences or fewer. Use plain words, not theory.
2. ${pack.pro}
3. Simple next-step list: "do first", "wait first", "do not force", and "what sign to watch". Keep every item short.
4. Where I may be wrong: list 3 things that could make this reading less accurate. Remind me not to treat the hexagram as a guarantee.
5. Questions to clarify next: ${pack.questions}
6. End with an action summary under 80 words that a normal person can paste into notes and understand immediately.`
    : `Pro 白話加強要求：
1. 先用 5 句以內講出真正卡住的地方。要用普通人聽得明的話，不要講理論。
2. ${pack.pro}
3. 簡單下一步清單：先做什麼、先等等什麼、不要硬推什麼、觀察什麼信號。每項要短。
4. 我可能看錯的地方：列出 3 個可能令今次解讀不準的原因，提醒我不要把卦當成保證。
5. 下一步要問清楚的問題：${pack.questions}
6. 輸出一段 80 字內的行動摘要，要普通人一看就明，可以直接貼到備忘錄。`;

  return `${basePrompt}

${proRequirements}

${PROMPT_CLOSING_CALL}`;
}

function saveHistory() {
  const reading = getReading();
  if (!reading || state.savedId) return;
  const item = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    createdAt: new Date().toISOString(),
    question: cleanInput(els.question.value, 180),
    lines: [...state.lines],
    coinsByLine: state.coinsByLine.map((coins) => coins.map((coin) => ({ ...coin }))),
    primary: {
      number: reading.primary.number,
      name: reading.primary.name,
    },
    changed: reading.moving.length
      ? {
          number: reading.changed.number,
          name: reading.changed.name,
        }
      : null,
    moving: reading.moving,
  };
  const history = loadHistory();
  history.unshift(item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  state.savedId = item.id;
}

function loadHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function renderHistory() {
  const history = loadHistory();
  els.historyList.innerHTML = "";
  if (!history.length) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = ui(
      "未有本機紀錄。完成一次起卦後會自動儲存在這裡。",
      "No local history yet. A completed cast will be saved here automatically."
    );
    els.historyList.append(empty);
    return;
  }

  history.forEach((item) => {
    const row = document.createElement("article");
    row.className = "history-item";
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    const changed = item.changed
      ? ui(` → 第 ${item.changed.number} 卦 ${item.changed.name}`, ` -> Hexagram ${item.changed.number} ${item.changed.name}`)
      : ui(" · 無變卦", " · no changed hexagram");
    title.textContent = ui(
      `第 ${item.primary.number} 卦 ${item.primary.name}${changed}`,
      `Hexagram ${item.primary.number} ${item.primary.name}${changed}`
    );
    const meta = document.createElement("span");
    const date = new Intl.DateTimeFormat(IS_EN ? "en-HK" : "zh-HK", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(item.createdAt));
    meta.textContent = ui(
      `${date}｜${item.question || "未填問題"}｜動爻：${item.moving.length ? joinText(item.moving.map((line) => lineLabels[line - 1])) : "無"}`,
      `${date} | ${item.question || "No question"} | Moving: ${item.moving.length ? joinText(item.moving.map((line) => lineLabels[line - 1])) : "none"}`
    );
    copy.append(title, meta);

    const actions = document.createElement("div");
    const restore = document.createElement("button");
    restore.type = "button";
    restore.textContent = "↺";
    restore.title = ui("載入此紀錄", "Load this record");
    restore.addEventListener("click", () => restoreHistory(item));
    actions.append(restore);
    row.append(copy, actions);
    els.historyList.append(row);
  });
}

function restoreHistory(item) {
  state.lines = [...item.lines];
  state.coinsByLine = item.coinsByLine.map((coins) => coins.map((coin) => ({ ...coin })));
  state.savedId = item.id;
  els.question.value = item.question || "";
  renderCoins(state.coinsByLine[state.coinsByLine.length - 1]);
  renderAll();
  document.querySelector("#oracle").scrollIntoView({ behavior: "smooth", block: "start" });
  showToast(ui("已載入本機紀錄。", "Local record loaded."));
}

function resetReading() {
  state.lines = [];
  state.coinsByLine = [];
  state.savedId = null;
  renderCoins(null);
  renderAll();
  if (state.gesture.active) {
    setGestureStatus(ui("已重來。打響指逐爻擲卦；五指合攏可一手成卦。", "Reset complete. Snap line by line, or close five fingers for a full cast."), ui("等待手勢/聲音", "Waiting"));
  } else if (!state.gesture.loading) {
    setGestureStatus(GESTURE_IDLE_STATUS, ui("相機未啟動", "Camera off"));
  }
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.remove("is-visible"), 2600);
}

function castNextLine() {
  const question = cleanInput(els.question.value, 180);
  if (!question) {
    showToast(ui("請先寫下你的問題，起卦會更清晰。", "Write your question first so the reading has a clear focus."));
    els.question.focus();
    return false;
  }
  if (state.lines.length >= 6) return false;
  const result = tossCoins();
  state.lines.push(result.total);
  state.coinsByLine.push(result.coins);
  renderCoins(result.coins);
  renderAll();
  const info = lineInfo(result.total);
  els.castStatus.textContent = ui(
    `${lineLabels[state.lines.length - 1]}：${result.total}，${info.name}。`,
    `${lineLabels[state.lines.length - 1]}: ${result.total}, ${info.name}.`
  );
  if (state.lines.length === 6) {
    saveHistory();
    renderAll();
    showToast(ui("六爻已成，AI Prompt 已準備好。", "The six lines are complete. Your AI prompt is ready."));
  }
  return true;
}

async function copyPrompt() {
  const reading = getReading();
  if (!reading) return;
  const prompt = buildPrompt(reading, { mode: "free" });
  const tone = getPromptStyleMeta().label;
  els.promptOutput.value = prompt;
  try {
    await navigator.clipboard.writeText(prompt);
    showToast(ui(`已複製「${tone}」AI Prompt。`, `${tone} AI Prompt copied.`));
  } catch {
    els.promptOutput.select();
    document.execCommand("copy");
    showToast(ui(`已選取並複製「${tone}」prompt。`, `${tone} prompt selected and copied.`));
  }
}

async function copyProPrompt() {
  const reading = getReading();
  if (!reading || !state.proUnlocked) return;
  const prompt = buildPrompt(reading, { mode: "pro" });
  const tone = getPromptStyleMeta().label;
  els.proPromptOutput.value = prompt;
  try {
    await navigator.clipboard.writeText(prompt);
    showToast(ui(`已複製「${tone}」Pro Prompt。`, `${tone} Pro Prompt copied.`));
  } catch {
    els.proPromptOutput.hidden = false;
    els.proPromptOutput.select();
    document.execCommand("copy");
    showToast(ui(`已選取並複製「${tone}」Pro Prompt。`, `${tone} Pro Prompt selected and copied.`));
  }
}

async function applyProUnlock() {
  const code = (els.unlockCode.value || "").trim().toUpperCase();
  if (!(await isUnlockCodeValid(code))) {
    showToast(ui("解鎖碼未能確認。", "Unlock code could not be verified."));
    return;
  }
  state.proUnlocked = true;
  localStorage.setItem(PRO_UNLOCK_KEY, "unlocked");
  updatePromptOutputs();
  showToast(ui("Pro Prompt 已解鎖。", "Pro Prompt unlocked."));
}

async function isUnlockCodeValid(code) {
  if (!code) return false;
  const expectedHash = String(MONETIZATION.unlockCodeHash || "").trim().toLowerCase();
  if (expectedHash) {
    const actualHash = await sha256Hex(code);
    return actualHash === expectedHash;
  }

  const legacyCode = String(MONETIZATION.unlockCode || "").trim().toUpperCase();
  return Boolean(legacyCode && code === legacyCode);
}

async function sha256Hex(value) {
  if (!globalThis.crypto?.subtle) return "";
  const data = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const chars = String(text).split("");
  const lines = [];
  let line = "";
  chars.forEach((char) => {
    const test = line + char;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((row, index) => {
    const suffix = index === maxLines - 1 && lines.length > maxLines ? "..." : "";
    ctx.fillText(row + suffix, x, y + index * lineHeight);
  });
  return Math.min(lines.length, maxLines) * lineHeight;
}

function drawShareCard(reading = getReading()) {
  if (!reading || !els.shareCanvas) return;
  const canvas = els.shareCanvas;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#10130d");
  gradient.addColorStop(0.48, "#173027");
  gradient.addColorStop(1, "#21170d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(241, 207, 117, 0.38)";
  ctx.lineWidth = 4;
  ctx.strokeRect(60, 60, width - 120, height - 120);

  ctx.fillStyle = "#e2b64e";
  ctx.font = "700 34px Inter, sans-serif";
  ctx.fillText("I CHING COIN ORACLE", 92, 130);
  ctx.fillStyle = "#f6eddb";
  ctx.font = "800 72px 'Noto Serif TC', serif";
  ctx.fillText(IS_EN ? `Hexagram ${reading.primary.number}` : `第 ${reading.primary.number} 卦`, 92, 235);
  ctx.font = "800 96px 'Noto Serif TC', serif";
  ctx.fillText(reading.primary.name, 92, 340);

  ctx.fillStyle = "rgba(246, 237, 219, 0.8)";
  ctx.font = "600 36px 'Noto Serif TC', serif";
  const question = cleanInput(els.question.value, 180) || ui("未填寫問題", "No question entered");
  wrapCanvasText(ctx, ui(`問：${question}`, `Question: ${question}`), 92, 430, width - 184, 54, 4);

  ctx.fillStyle = "rgba(241, 207, 117, 0.9)";
  ctx.font = "700 34px Inter, sans-serif";
  ctx.fillText(
    ui(
      `變卦：${reading.moving.length ? `第 ${reading.changed.number} 卦《${reading.changed.name}》` : "無變卦"}`,
      `Changed: ${reading.moving.length ? `Hexagram ${reading.changed.number} ${reading.changed.name}` : "none"}`
    ),
    92,
    700
  );
  ctx.fillText(
    ui(
      `動爻：${reading.moving.length ? joinText(reading.moving.map((line) => lineLabels[line - 1])) : "無"}`,
      `Moving: ${reading.moving.length ? joinText(reading.moving.map((line) => lineLabels[line - 1])) : "none"}`
    ),
    92,
    760
  );

  const bits = reading.primary.bits;
  for (let i = 0; i < 6; i += 1) {
    const y = 900 - i * 56;
    const isYang = bits[i] === "1";
    ctx.fillStyle = i === 0 || i === 5 ? "#f1cf75" : "#f6eddb";
    if (isYang) {
      ctx.fillRect(180, y, 720, 22);
    } else {
      ctx.fillRect(180, y, 310, 22);
      ctx.fillRect(590, y, 310, 22);
    }
  }

  ctx.fillStyle = "rgba(246, 237, 219, 0.72)";
  ctx.font = "600 30px Inter, sans-serif";
  ctx.fillText(ui("六次銅錢起卦 · 生成 AI 解卦 Prompt", "Six coin casts · AI reading prompt"), 92, 1180);
  ctx.fillStyle = "#8ecab1";
  ctx.fillText(location.hostname || "iching-coin-oracle.pages.dev", 92, 1230);
}

function downloadShareCard() {
  const reading = getReading();
  if (!reading || !els.shareCanvas) return;
  drawShareCard(reading);
  const link = document.createElement("a");
  link.download = `iching-${reading.primary.number}-${reading.primary.name}.png`;
  link.href = els.shareCanvas.toDataURL("image/png");
  link.click();
  showToast(ui("分享圖卡已生成。", "Share card generated."));
}

els.question.addEventListener("input", () => {
  const cleaned = cleanInput(els.question.value, 180);
  if (cleaned !== els.question.value.trim()) {
    els.question.value = cleaned;
  }
  state.question = els.question.value;
  els.questionCount.textContent = `${els.question.value.length} / 180`;
  if (getReading()) {
    updatePromptOutputs();
  }
});

els.sampleQuestion.addEventListener("click", () => {
  els.question.value = ui(
    "我今個月應該如何安排工作與財務重點，先穩住現有收入還是主動開拓新機會？",
    "How should I arrange my work and finances this month: stabilize current income first, or actively explore new opportunities?"
  );
  renderAll();
  els.question.focus();
});

els.castButton.addEventListener("click", castNextLine);
els.resetButton.addEventListener("click", resetReading);
els.copyButton.addEventListener("click", copyPrompt);
els.resultCopyButton?.addEventListener("click", copyPrompt);
els.copyProButton?.addEventListener("click", copyProPrompt);
els.applyUnlock?.addEventListener("click", () => {
  void applyProUnlock();
});
els.unlockCode?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") void applyProUnlock();
});
els.generateShareCard?.addEventListener("click", () => {
  drawShareCard();
  showToast(ui("分享圖卡已更新。", "Share card updated."));
});
els.downloadShareCard?.addEventListener("click", downloadShareCard);
els.startGesture.addEventListener("click", startGestureCamera);
els.stopGesture.addEventListener("click", stopGestureCamera);
els.snapSensitivity?.addEventListener("change", () => {
  if (state.gesture.active) {
    setGestureStatus(
      ui("聲音靈敏度已更新。請再打一次響指測試觸發。", "Audio sensitivity updated. Snap again to test triggering."),
      ui("等待手勢/聲音", "Waiting")
    );
  }
});
els.promptStyle.addEventListener("change", () => {
  renderPromptStyleSummary();
  if (getReading()) updatePromptOutputs();
});
els.promptPack?.addEventListener("change", () => {
  if (getReading()) updatePromptOutputs();
});
els.clearHistory.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
  showToast(ui("本機紀錄已清除。", "Local history cleared."));
});

renderAll();
renderPromptStyleSummary();
renderMonetizationLinks();
