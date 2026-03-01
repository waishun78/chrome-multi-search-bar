(() => {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────
  let bars = [{ id: 0, pattern: '', isRegex: false }];
  let nextId = 1;
  const COLORS = [
    '#FFEB3B', '#67e8f9', '#86efac', '#f9a8d4',
    '#fdba74', '#d8b4fe', '#fca5a5', '#6ee7b7',
  ];

  // ── DOM refs ───────────────────────────────────────────────────────────────
  let hostEl = null;
  let shadow = null;
  let panel = null;
  let barsContainer = null;

  // ── Debounce ───────────────────────────────────────────────────────────────
  let debounceTimer = null;

  // ── Styles (inline so they apply synchronously — no async <link> race) ────
  const MSB_CSS = `
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    #msb-panel {
      position: fixed;
      top: 56px;
      right: 16px;
      z-index: 2147483647;
      width: 300px;
      background: #ffffff;
      border-radius: 6px;
      border: 1px solid rgba(55, 53, 47, 0.14);
      box-shadow: rgba(15, 15, 15, 0.05) 0px 0px 0px 1px,
                  rgba(15, 15, 15, 0.1) 0px 3px 6px,
                  rgba(15, 15, 15, 0.2) 0px 9px 24px;
      font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont,
                   'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 14px;
      color: rgb(55, 53, 47);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 1;
      transform: scale(1) translateY(0);
      transform-origin: top right;
      transition: opacity 0.12s ease, transform 0.12s ease;
    }

    #msb-panel.msb-hidden {
      opacity: 0;
      transform: scale(0.96) translateY(-6px);
      pointer-events: none;
    }

    /* ── Header ── */
    #msb-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px 8px 12px;
      border-bottom: 1px solid rgba(55, 53, 47, 0.09);
      flex-shrink: 0;
    }

    #msb-title {
      font-size: 11px;
      font-weight: 600;
      color: rgba(55, 53, 47, 0.5);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      user-select: none;
    }

    #msb-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border: none;
      background: none;
      cursor: pointer;
      color: rgba(55, 53, 47, 0.4);
      font-size: 17px;
      line-height: 1;
      border-radius: 4px;
      transition: background 0.1s, color 0.1s;
      flex-shrink: 0;
    }

    #msb-close:hover {
      background: rgba(55, 53, 47, 0.08);
      color: rgb(55, 53, 47);
    }

    /* ── Bars ── */
    #msb-bars {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 6px;
      max-height: calc(60vh - 84px);
      overflow-y: auto;
    }

    #msb-bars::-webkit-scrollbar {
      width: 3px;
    }

    #msb-bars::-webkit-scrollbar-thumb {
      background: rgba(55, 53, 47, 0.12);
      border-radius: 2px;
    }

    .msb-row {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 3px 4px;
      border-radius: 4px;
    }

    .msb-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
      border: 1.5px solid rgba(0, 0, 0, 0.12);
    }

    .msb-input {
      flex: 1;
      min-width: 0;
      padding: 5px 8px;
      border: 1px solid rgba(55, 53, 47, 0.16);
      border-radius: 4px;
      font-size: 13px;
      font-family: inherit;
      color: rgb(55, 53, 47);
      background: #fff;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .msb-input::placeholder {
      color: rgba(55, 53, 47, 0.28);
    }

    .msb-input:focus {
      border-color: rgba(35, 131, 226, 0.6);
      box-shadow: 0 0 0 2px rgba(35, 131, 226, 0.18);
    }

    .msb-input.input-error {
      border-color: rgba(235, 87, 87, 0.7);
      box-shadow: 0 0 0 2px rgba(235, 87, 87, 0.15);
    }

    .msb-regex-btn {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 26px;
      padding: 0 5px;
      border: 1px solid rgba(55, 53, 47, 0.16);
      border-radius: 4px;
      background: none;
      color: rgba(55, 53, 47, 0.4);
      font-size: 10.5px;
      font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace;
      cursor: pointer;
      transition: background 0.1s, border-color 0.1s, color 0.1s;
    }

    .msb-regex-btn:hover {
      background: rgba(55, 53, 47, 0.06);
      border-color: rgba(55, 53, 47, 0.28);
      color: rgb(55, 53, 47);
    }

    .msb-regex-btn.regex-active {
      background: rgba(35, 131, 226, 0.1);
      border-color: rgba(35, 131, 226, 0.45);
      color: rgb(35, 131, 226);
    }

    .msb-remove-btn {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border: none;
      background: none;
      cursor: pointer;
      color: rgba(55, 53, 47, 0.28);
      font-size: 16px;
      line-height: 1;
      border-radius: 4px;
      transition: background 0.1s, color 0.1s;
    }

    .msb-remove-btn:hover {
      background: rgba(235, 87, 87, 0.1);
      color: rgb(235, 87, 87);
    }

    /* ── Footer ── */
    #msb-footer {
      border-top: 1px solid rgba(55, 53, 47, 0.07);
      padding: 4px 6px 6px;
      flex-shrink: 0;
    }

    #msb-add-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      width: 100%;
      padding: 5px 6px;
      border: none;
      border-radius: 4px;
      background: none;
      color: rgba(55, 53, 47, 0.4);
      font-size: 13px;
      font-family: inherit;
      cursor: pointer;
      text-align: left;
      transition: background 0.1s, color 0.1s;
    }

    #msb-add-btn:hover {
      background: rgba(55, 53, 47, 0.06);
      color: rgb(55, 53, 47);
    }

    #msb-add-icon {
      font-size: 16px;
      line-height: 1;
      color: rgba(55, 53, 47, 0.35);
      transition: color 0.1s;
    }

    #msb-add-btn:hover #msb-add-icon {
      color: rgb(55, 53, 47);
    }
  `;

  // ── Helpers ────────────────────────────────────────────────────────────────
  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function colorForIndex(idx) {
    return COLORS[idx % COLORS.length];
  }

  // ── Highlight engine ───────────────────────────────────────────────────────
  function clearHighlights() {
    document.querySelectorAll('mark[data-msb]').forEach((mark) => {
      const parent = mark.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(mark.textContent), mark);
      parent.normalize();
    });
  }

  const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'NOSCRIPT', 'IFRAME',
  ]);

  function highlightBar(bar, color) {
    if (!bar.pattern) return true;

    let re;
    try {
      const source = bar.isRegex ? bar.pattern : escapeRegex(bar.pattern);
      re = new RegExp(source, 'gi');
    } catch (_) {
      return false;
    }

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          let el = node.parentElement;
          while (el) {
            if (el === hostEl) return NodeFilter.FILTER_REJECT;
            if (SKIP_TAGS.has(el.tagName)) return NodeFilter.FILTER_REJECT;
            el = el.parentElement;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) textNodes.push(node);

    textNodes.forEach((textNode) => {
      const text = textNode.nodeValue;
      if (!text) return;

      re.lastIndex = 0;
      let match;
      const parts = [];
      let lastIndex = 0;

      while ((match = re.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push(document.createTextNode(text.slice(lastIndex, match.index)));
        }
        const mark = document.createElement('mark');
        mark.setAttribute('data-msb', '');
        mark.style.background = color;
        mark.style.color = 'rgba(55,53,47,0.9)';
        mark.style.borderRadius = '2px';
        mark.style.padding = '0 1px';
        mark.textContent = match[0];
        parts.push(mark);
        lastIndex = match.index + match[0].length;
        if (match[0].length === 0) re.lastIndex++;
      }

      if (!parts.length) return;

      if (lastIndex < text.length) {
        parts.push(document.createTextNode(text.slice(lastIndex)));
      }

      const frag = document.createDocumentFragment();
      parts.forEach((p) => frag.appendChild(p));
      textNode.parentNode.replaceChild(frag, textNode);
    });

    return true;
  }

  function runSearch() {
    clearHighlights();
    bars.forEach((bar, idx) => {
      const inputEl = shadow?.querySelector(`[data-bar-id="${bar.id}"] .msb-input`);
      const ok = highlightBar(bar, colorForIndex(idx));
      if (inputEl) inputEl.classList.toggle('input-error', !ok);
    });
  }

  function scheduleSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runSearch, 150);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function renderBars() {
    barsContainer.innerHTML = '';

    bars.forEach((bar, idx) => {
      const color = colorForIndex(idx);
      const row = document.createElement('div');
      row.className = 'msb-row';
      row.dataset.barId = bar.id;

      const dot = document.createElement('span');
      dot.className = 'msb-dot';
      dot.style.background = color;

      const input = document.createElement('input');
      input.type = 'text';
      input.id = `msb-input-${bar.id}`;
      input.name = `msb-input-${bar.id}`;
      input.autocomplete = 'off';
      input.className = 'msb-input';
      input.placeholder = 'Search…';
      input.value = bar.pattern;
      input.addEventListener('input', (e) => {
        bar.pattern = e.target.value;
        scheduleSearch();
      });

      const regexBtn = document.createElement('button');
      regexBtn.className = 'msb-regex-btn' + (bar.isRegex ? ' regex-active' : '');
      regexBtn.title = 'Toggle regex mode';
      regexBtn.textContent = '.*';
      regexBtn.addEventListener('click', () => {
        bar.isRegex = !bar.isRegex;
        regexBtn.classList.toggle('regex-active', bar.isRegex);
        runSearch();
      });

      const removeBtn = document.createElement('button');
      removeBtn.className = 'msb-remove-btn';
      removeBtn.title = 'Remove';
      removeBtn.textContent = '×';
      removeBtn.style.visibility = bars.length === 1 ? 'hidden' : 'visible';
      removeBtn.addEventListener('click', () => {
        const i = bars.findIndex((b) => b.id === bar.id);
        if (i !== -1) bars.splice(i, 1);
        renderBars();
        runSearch();
      });

      row.appendChild(dot);
      row.appendChild(input);
      row.appendChild(regexBtn);
      row.appendChild(removeBtn);
      barsContainer.appendChild(row);
    });
  }

  // ── Panel init ─────────────────────────────────────────────────────────────
  function initPanel() {
    hostEl = document.createElement('div');
    hostEl.setAttribute('data-msb-host', '');
    document.body.appendChild(hostEl);

    shadow = hostEl.attachShadow({ mode: 'open' });

    // Inline styles — avoids async <link> loading race that breaks fixed positioning
    const style = document.createElement('style');
    style.textContent = MSB_CSS;
    shadow.appendChild(style);

    panel = document.createElement('div');
    panel.id = 'msb-panel';

    // Header
    const header = document.createElement('div');
    header.id = 'msb-header';

    const title = document.createElement('span');
    title.id = 'msb-title';
    title.textContent = 'Search';

    const closeBtn = document.createElement('button');
    closeBtn.id = 'msb-close';
    closeBtn.title = 'Close (Esc)';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', closePanel);

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Bars
    barsContainer = document.createElement('div');
    barsContainer.id = 'msb-bars';

    // Footer
    const footer = document.createElement('div');
    footer.id = 'msb-footer';

    const addBtn = document.createElement('button');
    addBtn.id = 'msb-add-btn';
    addBtn.innerHTML = '<span id="msb-add-icon">+</span> Add search bar';
    addBtn.addEventListener('click', () => {
      bars.push({ id: nextId++, pattern: '', isRegex: false });
      renderBars();
      const inputs = shadow.querySelectorAll('.msb-input');
      if (inputs.length) inputs[inputs.length - 1].focus();
      runSearch();
    });

    footer.appendChild(addBtn);
    panel.appendChild(header);
    panel.appendChild(barsContainer);
    panel.appendChild(footer);
    shadow.appendChild(panel);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel && !panel.classList.contains('msb-hidden')) {
        closePanel();
      }
    });

    renderBars();
  }

  function openPanel() {
    panel.classList.remove('msb-hidden');
    const firstInput = shadow.querySelector('.msb-input');
    if (firstInput) firstInput.focus();
  }

  function closePanel() {
    panel.classList.add('msb-hidden');
    clearHighlights();
  }

  // ── Message listener ───────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type !== 'TOGGLE') return;

    if (!hostEl) {
      initPanel();
      openPanel();
    } else if (panel.classList.contains('msb-hidden')) {
      openPanel();
    } else {
      closePanel();
    }
  });
})();
