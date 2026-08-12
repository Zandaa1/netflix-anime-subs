const fileInput = document.getElementById('fileInput');
const statusEl = document.getElementById('status');
const offsetValueEl = document.getElementById('offsetValue');
const toggleBtn = document.getElementById('toggleBtn');

let currentOffset = 0;
let subsHidden = false;

function fmtOffset(v) {
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}s`;
}

async function getActiveNetflixTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !tab.url.includes('netflix.com')) {
    statusEl.textContent = 'Open a Netflix video tab first.';
    return null;
  }
  return tab;
}

function sendToContent(message) {
  return getActiveNetflixTab().then((tab) => {
    if (!tab) return null;
    return chrome.tabs.sendMessage(tab.id, message).catch((err) => {
      statusEl.textContent = 'Content script not ready — reload the Netflix tab.';
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

// Parses basic WebVTT (no styling/positioning)
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
  return parseSRT(text); // default to srt
}

// ---- Event wiring ----

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  statusEl.textContent = `Parsing ${file.name}...`;
  const text = await file.text();
  const cues = parseSubtitleFile(file.name, text);

  if (cues.length === 0) {
    statusEl.textContent = `Couldn't find any cues in ${file.name}. Check the file format.`;
    return;
  }

  const result = await sendToContent({ type: 'LOAD_SUBS', cues, filename: file.name });
  if (result && result.ok) {
    statusEl.textContent = `Loaded ${cues.length} lines from ${file.name}.`;
    currentOffset = 0;
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
  toggleBtn.textContent = subsHidden ? 'Show subtitles' : 'Hide subtitles';
  await sendToContent({ type: 'SET_VISIBILITY', hidden: subsHidden });
});

// On popup open, ask content script for current state so UI reflects reality
(async () => {
  const state = await sendToContent({ type: 'GET_STATE' });
  if (state) {
    currentOffset = state.offset || 0;
    subsHidden = !!state.hidden;
    offsetValueEl.textContent = fmtOffset(currentOffset);
    toggleBtn.textContent = subsHidden ? 'Show subtitles' : 'Hide subtitles';
    if (state.cueCount) {
      statusEl.textContent = `${state.cueCount} lines loaded (${state.filename || 'unknown file'}).`;
    }
  }
})();
