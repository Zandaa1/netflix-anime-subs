(() => {
  const state = {
    cues: [],
    offset: 0.1,
    hidden: false,
    filename: null,
    videoEl: null,
    overlayEl: null,
    lastCueIndex: -1,
  };

  function createOverlay() {
    if (state.overlayEl) return state.overlayEl;
    const el = document.createElement('div');
    el.id = 'ncs-subtitle-overlay';
    document.body.appendChild(el);
    state.overlayEl = el;
    return el;
  }

  function positionOverlay() {
    if (!state.videoEl || !state.overlayEl) return;
    const rect = state.videoEl.getBoundingClientRect();
    // Anchor overlay to the video's bounding box so it survives fullscreen/resize.
    state.overlayEl.style.left = `${rect.left}px`;
    state.overlayEl.style.top = `${rect.top}px`;
    state.overlayEl.style.width = `${rect.width}px`;
    state.overlayEl.style.height = `${rect.height}px`;
  }

  function findVideo() {
    return document.querySelector('video');
  }

  // Linear scan is fine at this scale (a few hundred to low thousands of cues).
  function findCueIndex(t) {
    for (let i = 0; i < state.cues.length; i++) {
      const c = state.cues[i];
      if (t >= c.start && t <= c.end) return i;
      if (t < c.start) return -1; // cues are sorted; nothing matches yet
    }
    return -1;
  }

  function renderAtCurrentTime() {
    if (!state.videoEl || !state.overlayEl) return;
    if (state.hidden || state.cues.length === 0) {
      state.overlayEl.textContent = '';
      return;
    }

    const t = state.videoEl.currentTime - state.offset;
    const idx = findCueIndex(t);

    if (idx !== state.lastCueIndex) {
      state.overlayEl.textContent = idx === -1 ? '' : state.cues[idx].text;
      state.lastCueIndex = idx;
    }
  }

  function attachToVideo(video) {
    if (state.videoEl === video) return;
    state.videoEl = video;
    createOverlay();
    positionOverlay();
    state.lastCueIndex = -1;

    video.addEventListener('timeupdate', renderAtCurrentTime);
    video.addEventListener('seeked', renderAtCurrentTime);

    // Keep overlay aligned through fullscreen toggles / layout shifts.
    window.addEventListener('resize', positionOverlay);
    document.addEventListener('fullscreenchange', () => setTimeout(positionOverlay, 50));

    const posInterval = setInterval(() => {
      if (!document.body.contains(video)) {
        clearInterval(posInterval);
        return;
      }
      positionOverlay();
    }, 500);
  }

  // Netflix is an SPA: episodes change without a full page reload,
  // so keep watching for a (possibly new) <video> element.
  const observer = new MutationObserver(() => {
    const video = findVideo();
    if (video && video !== state.videoEl) {
      attachToVideo(video);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Initial attempt in case the video is already present.
  const existing = findVideo();
  if (existing) attachToVideo(existing);

  // ---- Message handling from popup ----
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'LOAD_SUBS': {
        state.cues = message.cues.slice().sort((a, b) => a.start - b.start);
        state.filename = message.filename;
        state.lastCueIndex = -1;
        sendResponse({ ok: true });
        break;
      }
      case 'SET_OFFSET': {
        state.offset = message.offset;
        state.lastCueIndex = -1;
        renderAtCurrentTime();
        sendResponse({ ok: true });
        break;
      }
      case 'SET_VISIBILITY': {
        state.hidden = message.hidden;
        state.lastCueIndex = -1;
        renderAtCurrentTime();
        sendResponse({ ok: true });
        break;
      }
      case 'GET_STATE': {
        sendResponse({
          offset: state.offset,
          hidden: state.hidden,
          cueCount: state.cues.length,
          filename: state.filename,
        });
        break;
      }
      default:
        break;
    }
    return true; // keep the message channel open for async sendResponse
  });
})();
