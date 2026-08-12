const fileInput = document.getElementById('fileInput');
const statusEl = document.getElementById('status');
const offsetValueEl = document.getElementById('offsetValue');
const toggleBtn = document.getElementById('toggleBtn');

let currentOffset = 1.0;
let subsHidden = false;

function fmtOffset(v) {
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}s`;
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[m]));
}

function renderStatus(cueCount, filename) {
  if (!filename || !cueCount) {
    statusEl.innerHTML = '<span class="status-placeholder">No subtitle file loaded</span>';
    statusEl.removeAttribute('title');
    return;
  }
  const safeName = escapeHtml(filename);
  statusEl.innerHTML = `<span class="badge">${cueCount} lines</span><span class="file-name" title="${safeName}">${safeName}</span>`;
  statusEl.title = filename;
}

async function getActiveNetflixTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !tab.url.includes('netflix.com')) {
    statusEl.innerHTML = '<span class="status-error">Open a Netflix video tab first.</span>';
    return null;
  }
  return tab;
}

function sendToContent(message) {
  return getActiveNetflixTab().then((tab) => {
    if (!tab) return null;
    return chrome.tabs.sendMessage(tab.id, message).catch((err) => {
      statusEl.innerHTML = '<span class="status-error">Reload the Netflix tab to activate.</span>';
      console.error(err);
      return null;
    });
  });
}

// ---- Subtitle parsing ----

function timeToSeconds(h, m, s, ms) {
  return (+h) * 3600 + (+m) * 60 + (+s) + (+ms) / 1000;
}

// Parses standard .srt
function parseSRT(text) {
  const blocks = text.replace(/\r/g, '').split(/\n\n+/);
  const cues = [];
  const timeRe = /(\d+):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d+):(\d{2}):(\d{2}),(\d{3})/;

  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length < 2) continue;

    const timeLineIdx = lines.findIndex((l) => timeRe.test(l));
    if (timeLineIdx === -1) continue;

    const match = lines[timeLineIdx].match(timeRe);
    const start = timeToSeconds(match[1], match[2], match[3], match[4]);
    const end = timeToSeconds(match[5], match[6], match[7], match[8]);
    const text = lines
      .slice(timeLineIdx + 1)
      .join('\n')
      .replace(/<[^>]+>/g, '') // strip basic HTML-ish tags
      .trim();

    if (text) cues.push({ start, end, text });
  }
  return cues;
}

// Parses basic WebVTT
function parseVTT(text) {
  const body = text.replace(/\r/g, '').replace(/^WEBVTT.*\n/, '');
  const blocks = body.split(/\n\n+/);
  const cues = [];
  const timeRe = /(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/;

  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim().length > 0);
    const timeLineIdx = lines.findIndex((l) => timeRe.test(l));
    if (timeLineIdx === -1) continue;

    const match = lines[timeLineIdx].match(timeRe);
    const start = timeToSeconds(match[1], match[2], match[3], match[4]);
    const end = timeToSeconds(match[5], match[6], match[7], match[8]);
    const text = lines
      .slice(timeLineIdx + 1)
      .join('\n')
      .replace(/<[^>]+>/g, '')
      .trim();

    if (text) cues.push({ start, end, text });
  }
  return cues;
}

function parseSubtitleFile(filename, text) {
  if (filename.toLowerCase().endsWith('.vtt')) return parseVTT(text);
  return parseSRT(text);
}

// ---- Event wiring ----

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  statusEl.innerHTML = `<span class="status-placeholder">Parsing ${escapeHtml(file.name)}...</span>`;
  const text = await file.text();
  const cues = parseSubtitleFile(file.name, text);

  if (cues.length === 0) {
    statusEl.innerHTML = `<span class="status-error">No cues found in ${escapeHtml(file.name)}.</span>`;
    return;
  }

  // Load subtitles and apply the default 1.0s offset immediately
  const result = await sendToContent({ type: 'LOAD_SUBS', cues, filename: file.name });
  if (result && result.ok) {
    currentOffset = 1.0;
    await sendToContent({ type: 'SET_OFFSET', offset: currentOffset });
    renderStatus(cues.length, file.name);
    offsetValueEl.textContent = fmtOffset(currentOffset);
  }
});

document.querySelectorAll('.offset-buttons button').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const delta = parseFloat(btn.dataset.delta);
    currentOffset = Math.round((currentOffset + delta) * 10) / 10;
    offsetValueEl.textContent = fmtOffset(currentOffset);
    await sendToContent({ type: 'SET_OFFSET', offset: currentOffset });
  });
});

toggleBtn.addEventListener('click', async () => {
  subsHidden = !subsHidden;
  toggleBtn.innerHTML = subsHidden
    ? '<span>👁️</span> Show Subtitles'
    : '<span>🙈</span> Hide Subtitles';
  toggleBtn.classList.toggle('is-hidden', subsHidden);
  await sendToContent({ type: 'SET_VISIBILITY', hidden: subsHidden });
});

// On popup open, restore state or set default offset to 1.0s
(async () => {
  offsetValueEl.textContent = fmtOffset(currentOffset);
  const state = await sendToContent({ type: 'GET_STATE' });
  if (state) {
    currentOffset = typeof state.offset === 'number' ? state.offset : 1.0;
    subsHidden = !!state.hidden;
    offsetValueEl.textContent = fmtOffset(currentOffset);
    toggleBtn.innerHTML = subsHidden
      ? '<span>👁️</span> Show Subtitles'
      : '<span>🙈</span> Hide Subtitles';
    toggleBtn.classList.toggle('is-hidden', subsHidden);
    if (state.cueCount) {
      renderStatus(state.cueCount, state.filename);
    }
  }
})();
