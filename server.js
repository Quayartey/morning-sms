const express = require("express");
const cors    = require("cors");
const cron    = require("node-cron");
const AT      = require("africastalking");
const fs      = require("fs");
const path    = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ─── All sensitive config comes from Railway environment variables ────────────
const cfg = {
  username : process.env.AT_USERNAME || "",
  apiKey   : process.env.AT_API_KEY  || "",
  herName  : process.env.HER_NAME    || "Love",
  herPhone : process.env.HER_PHONE   || "",
  sendTime : process.env.SEND_TIME   || "07:00",   // e.g. "07:00"
  sendDays : process.env.SEND_DAYS   || "every",   // every | weekdays | weekdays+sat
  rotation : process.env.ROTATION    || "sequential",
  template : process.env.TEMPLATE    ||
    "Good morning {name}! \uD83C\uDF05\n\n{quote}\n\nHave an amazing day. You've got this! \uD83D\uDCAA\u2764\uFE0F",
};

// ─── Quotes stored in a flat JSON file (persists across restarts on Railway) ──
const QUOTES_FILE = path.join(__dirname, "quotes.json");
const LOGS_FILE   = path.join(__dirname, "logs.json");

function loadQuotes() {
  try { return JSON.parse(fs.readFileSync(QUOTES_FILE)); } catch { return []; }
}
function saveQuotes(q) { fs.writeFileSync(QUOTES_FILE, JSON.stringify(q, null, 2)); }

function loadLogs() {
  try { return JSON.parse(fs.readFileSync(LOGS_FILE)); } catch { return []; }
}
function addLog(entry) {
  const logs = loadLogs();
  logs.unshift({ ...entry, time: new Date().toISOString() });
  fs.writeFileSync(LOGS_FILE, JSON.stringify(logs.slice(0, 200), null, 2));
}

// ─── Quote index persisted simply in a tiny file ─────────────────────────────
const IDX_FILE = path.join(__dirname, "index.json");
function getIndex() { try { return JSON.parse(fs.readFileSync(IDX_FILE)).i || 0; } catch { return 0; } }
function setIndex(i) { fs.writeFileSync(IDX_FILE, JSON.stringify({ i })); }

function pickQuote() {
  const quotes = loadQuotes();
  if (!quotes.length) return "You are stronger than you know. Today is yours — own it! 💪";
  if (cfg.rotation === "random") return quotes[Math.floor(Math.random() * quotes.length)].text;
  const idx = getIndex() % quotes.length;
  setIndex(idx + 1);
  return quotes[idx].text;
}

// ─── Send SMS ────────────────────────────────────────────────────────────────
async function sendSMS(message) {
  const at  = AT({ username: cfg.username, apiKey: cfg.apiKey });
  const res = await at.SMS.send({ to: [cfg.herPhone], message });
  return res?.SMSMessageData?.Recipients?.[0]?.status || "Unknown";
}

async function sendMorning() {
  if (!cfg.username || !cfg.apiKey || !cfg.herPhone) {
    console.log("⚠️  Missing credentials — set environment variables in Railway.");
    return;
  }
  const quote   = pickQuote();
  const message = cfg.template
    .replace("{name}",  cfg.herName)
    .replace("{quote}", quote);
  console.log(`📤 Sending morning SMS to ${cfg.herPhone}…`);
  try {
    const status = await sendSMS(message);
    console.log("✅ Status:", status);
    addLog({ type: "scheduled", quote, status });
  } catch (err) {
    console.error("❌ Error:", err.message);
    addLog({ type: "scheduled", quote, status: "Error: " + err.message });
  }
}

// ─── Scheduler ───────────────────────────────────────────────────────────────
function startScheduler() {
  const [hour, minute] = (cfg.sendTime).split(":").map(Number);
  const days = { every: "*", weekdays: "1-5", "weekdays+sat": "1-6" }[cfg.sendDays] || "*";
  const expr  = `${minute} ${hour} * * ${days}`;
  console.log(`⏰  Cron scheduled: "${expr}" (Africa/Accra time)`);
  cron.schedule(expr, sendMorning, { timezone: "Africa/Accra" });
}

startScheduler();

// ─── API ─────────────────────────────────────────────────────────────────────
app.get("/api/status", (req, res) => {
  res.json({
    ready     : !!(cfg.username && cfg.apiKey && cfg.herPhone),
    herName   : cfg.herName,
    herPhone  : cfg.herPhone ? cfg.herPhone.slice(0, 5) + "****" : "",
    sendTime  : cfg.sendTime,
    sendDays  : cfg.sendDays,
    rotation  : cfg.rotation,
    quoteCount: loadQuotes().length,
  });
});

app.get("/api/quotes",        (req, res) => res.json(loadQuotes()));
app.post("/api/quotes",       (req, res) => { const q = loadQuotes(); q.push(req.body); saveQuotes(q); res.json({ ok: true }); });
app.delete("/api/quotes/:i",  (req, res) => { const q = loadQuotes(); q.splice(Number(req.params.i), 1); saveQuotes(q); res.json({ ok: true }); });
app.get("/api/logs",          (req, res) => res.json(loadLogs()));

app.post("/api/send-test", async (req, res) => {
  if (!cfg.username || !cfg.apiKey || !cfg.herPhone)
    return res.status(400).json({ error: "Set AT_USERNAME, AT_API_KEY and HER_PHONE in Railway environment variables." });
  const quote   = pickQuote();
  const message = cfg.template.replace("{name}", cfg.herName).replace("{quote}", quote);
  try {
    const status = await sendSMS(message);
    addLog({ type: "test", quote, status });
    res.json({ ok: true, status, message });
  } catch (err) {
    addLog({ type: "test", quote, status: "Error: " + err.message });
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "dashboard.html")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`\n🌅 Morning SMS server live on port ${PORT}\n`));
