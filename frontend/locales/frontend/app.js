const LOCALE_CACHE = {};
let currentLang = localStorage.getItem("shieldpulse_lang") || "ar";
let dict = {};

const SUSPICIOUS_KEYWORDS = [
  "verify", "urgent", "account suspended", "password", "otp", "free gift", "login now",
  "تحديث حسابك", "عاجل", "تم إيقاف الحساب", "كلمة المرور", "رمز التحقق", "جائزة", "فوراً"
];

const SUSPICIOUS_TLDS = [".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".click", ".loan"];

const els = {
  brandName: document.getElementById("brandName"),
  badgeText: document.getElementById("badgeText"),
  heroTitle: document.getElementById("heroTitle"),
  heroSubtitle: document.getElementById("heroSubtitle"),
  inputField: document.getElementById("inputField"),
  scanBtn: document.getElementById("scanBtn"),
  sampleLinkBtn: document.getElementById("sampleLinkBtn"),
  sampleMsgBtn: document.getElementById("sampleMsgBtn"),
  clearBtn: document.getElementById("clearBtn"),
  langToggle: document.getElementById("langToggle"),
  resultBox: document.getElementById("resultBox"),
  resultTitle: document.getElementById("resultTitle"),
  statusText: document.getElementById("statusText"),
  scoreLabel: document.getElementById("scoreLabel"),
  scoreValue: document.getElementById("scoreValue"),
  reasonsList: document.getElementById("reasonsList"),
  adviceText: document.getElementById("adviceText"),
  pricingTitle: document.getElementById("pricingTitle"),
  freePlanTitle: document.getElementById("freePlanTitle"),
  freePlanDesc: document.getElementById("freePlanDesc"),
  proPlanTitle: document.getElementById("proPlanTitle"),
  proPlanDesc: document.getElementById("proPlanDesc"),
  buyBtn: document.getElementById("buyBtn")
};

async function loadLocale(lang) {
  if (LOCALE_CACHE[lang]) {
    return LOCALE_CACHE[lang];
  }
  const response = await fetch(`./locales/${lang}.json`);
  const data = await response.json();
  LOCALE_CACHE[lang] = data;
  return data;
}

async function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("shieldpulse_lang", lang);
  dict = await loadLocale(lang);

  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  els.langToggle.textContent = lang === "ar" ? "English" : "العربية";

  els.brandName.textContent = dict.brand;
  els.badgeText.textContent = dict.badge;
  els.heroTitle.textContent = dict.hero_title;
  els.heroSubtitle.textContent = dict.hero_subtitle;
  els.inputField.placeholder = dict.placeholder;
  els.scanBtn.textContent = dict.scan_btn;
  els.sampleLinkBtn.textContent = dict.sample_link;
  els.sampleMsgBtn.textContent = dict.sample_msg;
  els.clearBtn.textContent = dict.clear_btn;
  els.resultTitle.textContent = dict.result_title;
  els.scoreLabel.textContent = dict.score_label;
  els.pricingTitle.textContent = dict.pricing_title;
  els.freePlanTitle.textContent = dict.free_plan;
  els.freePlanDesc.textContent = dict.free_desc;
  els.proPlanTitle.textContent = dict.pro_plan;
  els.proPlanDesc.textContent = dict.pro_desc;
  els.buyBtn.textContent = dict.buy_btn;
}

function analyzeInput(raw) {
  const text = (raw || "").trim();
  const lowered = text.toLowerCase();
  let score = 0;
  const reasons = [];

  const urlMatch = text.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) {
    try {
      const parsed = new URL(urlMatch[0]);
      const host = parsed.hostname.toLowerCase();

      if (parsed.protocol === "http:") {
        score += 20;
        reasons.push(
          currentLang === "ar"
            ? "الرابط يستخدم اتصالاً غير مشفر HTTP."
            : "Link uses unencrypted HTTP protocol."
        );
      }

      if (SUSPICIOUS_TLDS.some((tld) => host.endsWith(tld))) {
        score += 30;
        reasons.push(
          currentLang === "ar"
            ? "امتداد النطاق يُستخدم بكثرة في الروابط المشبوهة."
            : "Domain extension is frequently abused in suspicious links."
        );
      }

      const dashes = (host.match(/-/g) || []).length;
      if (dashes >= 2 || host.length > 35) {
        score += 20;
        reasons.push(
          currentLang === "ar"
            ? "اسم النطاق طويل أو يحتوي على شرطات متعددة قد تُستخدم للتمويه."
            : "Domain name is long or contains multiple hyphens often used for lookalikes."
        );
      }
    } catch (_) {
      score += 15;
    }
  }

  const matched = SUSPICIOUS_KEYWORDS.filter((word) => lowered.includes(word));
  if (matched.length > 0) {
    score += Math.min(40, matched.length * 15);
    reasons.push(
      currentLang === "ar"
        ? "النص يحتوي على عبارات استعجال أو طلب بيانات شائعة في رسائل التصيد."
        : "Text includes urgency or credential prompts common in phishing."
    );
  }

  score = Math.min(score, 100);

  let status = "safe";
  let statusLabel = dict.safe;
  let advice = dict.advice_safe;

  if (score >= 60) {
    status = "danger";
    statusLabel = dict.danger;
    advice = dict.advice_danger;
  } else if (score >= 25) {
    status = "suspicious";
    statusLabel = dict.suspicious;
    advice = dict.advice_suspicious;
  }

  if (reasons.length === 0) {
    reasons.push(
      currentLang === "ar"
        ? "لم تظهر مؤشرات خطورة واضحة في الفحص الأولي."
        : "No obvious risk indicators found in the initial check."
    );
  }

  return { score, status, statusLabel, reasons, advice };
}

function renderResult(data) {
  els.resultBox.classList.remove("hidden", "safe", "suspicious", "danger");
  els.resultBox.classList.add(data.status);
  els.statusText.textContent = data.statusLabel;
  els.scoreValue.textContent = `${data.score}/100`;
  els.reasonsList.innerHTML = data.reasons.map((item) => `<li>${item}</li>`).join("");
  els.adviceText.textContent = data.advice;
}

els.scanBtn.addEventListener("click", () => {
  if (!els.inputField.value.trim()) return;
  renderResult(analyzeInput(els.inputField.value));
});

els.sampleLinkBtn.addEventListener("click", () => {
  els.inputField.value = "http://secure-bank-verify-login.xyz/auth";
  renderResult(analyzeInput(els.inputField.value));
});

els.sampleMsgBtn.addEventListener("click", () => {
  els.inputField.value =
    currentLang === "ar"
      ? "عاجل: تم إيقاف حسابك، أدخل كلمة المرور ورمز التحقق فوراً لتفادي الحظر."
      : "Urgent: Your account suspended. Verify password and OTP now to avoid lock.";
  renderResult(analyzeInput(els.inputField.value));
});

els.clearBtn.addEventListener("click", () => {
  els.inputField.value = "";
  els.resultBox.classList.add("hidden");
});

els.langToggle.addEventListener("click", () => {
  applyLanguage(currentLang === "ar" ? "en" : "ar");
});

applyLanguage(currentLang);
