(() => {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────
  let bars = [{ id: 0, pattern: '', isRegex: false, isCaseSensitive: false, matchIndex: 0 }];
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

  // ── Styles ─────────────────────────────────────────────────────────────────
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
      width: 320px;
      background: #ffffff;
      border-radius: 6px;
      border: 1px solid rgba(55, 53, 47, 0.14);
      box-shadow:
        rgba(15, 15, 15, 0.05) 0px 0px 0px 1px,
        rgba(15, 15, 15, 0.1) 0px 3px 6px,
        rgba(15, 15, 15, 0.2) 0px 9px 24px;
      font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont,
                   'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 14px;
      color: rgb(55, 53, 47);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      will-change: opacity, transform;
      opacity: 1;
      transform: scale(1) translateY(0);
      transform-origin: top right;
      transition: opacity 0.15s cubic-bezier(0.16, 1, 0.3, 1),
                  transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    }

    #msb-panel.msb-hidden {
      opacity: 0;
      transform: scale(0.95) translateY(-8px);
      pointer-events: none;
      transition: opacity 0.1s ease, transform 0.1s ease;
    }

    /* ── Header ── */
    #msb-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 8px 8px 12px;
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
      flex: 1;
    }

    #msb-header-actions {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .msb-icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border: none;
      background: none;
      cursor: pointer;
      color: rgba(55, 53, 47, 0.4);
      border-radius: 4px;
      transition: background 0.1s, color 0.1s;
      flex-shrink: 0;
    }

    .msb-icon-btn:hover {
      background: rgba(55, 53, 47, 0.08);
      color: rgb(55, 53, 47);
    }

    #msb-add-btn { font-size: 20px; line-height: 1; padding-bottom: 1px; }
    #msb-close   { font-size: 18px; line-height: 1; }

    /* ── Bars ── */
    #msb-bars {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 6px;
      max-height: calc(60vh - 52px);
      overflow-y: auto;
    }

    #msb-bars::-webkit-scrollbar { width: 3px; }
    #msb-bars::-webkit-scrollbar-thumb {
      background: rgba(55, 53, 47, 0.12);
      border-radius: 2px;
    }

    @keyframes msb-row-in {
      from { opacity: 0; transform: translateY(-5px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .msb-row {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 3px 4px;
      border-radius: 4px;
    }

    .msb-row.msb-row-new {
      animation: msb-row-in 0.15s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .msb-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
      border: 1.5px solid rgba(0, 0, 0, 0.12);
      transition: background 0.2s ease;
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
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .msb-input::placeholder { color: rgba(55, 53, 47, 0.28); }

    .msb-input:focus {
      border-color: rgba(35, 131, 226, 0.6);
      box-shadow: 0 0 0 2px rgba(35, 131, 226, 0.18);
    }

    .msb-input.input-error {
      border-color: rgba(235, 87, 87, 0.7);
      box-shadow: 0 0 0 2px rgba(235, 87, 87, 0.15);
    }

    /* shared pill-button style */
    .msb-toggle-btn {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 26px;
      padding: 0 5px;
      border: 1px solid rgba(55, 53, 47, 0.16);
      border-radius: 4px;
      background: none;
      color: rgba(55, 53, 47, 0.38);
      cursor: pointer;
      transition: background 0.1s, border-color 0.1s, color 0.1s;
      line-height: 1;
    }

    .msb-toggle-btn:hover {
      background: rgba(55, 53, 47, 0.06);
      border-color: rgba(55, 53, 47, 0.28);
      color: rgb(55, 53, 47);
    }

    .msb-toggle-btn.active {
      background: rgba(35, 131, 226, 0.1);
      border-color: rgba(35, 131, 226, 0.45);
      color: rgb(35, 131, 226);
    }

    .msb-regex-btn {
      font-size: 10.5px;
      font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace;
    }

    .msb-case-btn {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: -0.01em;
    }

    /* ── Per-bar navigation ── */
    .msb-nav {
      /*
       * Always in layout with a fixed width so the input never shifts.
       * Max count string is "99+/100+" (8 chars @ ~6.5px each ≈ 52px)
       * plus two 16px buttons = 84px total. No gap — flush layout.
       */
      display: flex;
      align-items: center;
      gap: 0;
      flex-shrink: 0;
      width: 84px;
      visibility: hidden;
      opacity: 0;
      transition: opacity 0.15s ease;
    }

    .msb-nav.visible {
      visibility: visible;
      opacity: 1;
    }

    .msb-nav-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 18px;
      padding: 0;
      border: none;
      background: none;
      cursor: pointer;
      color: rgba(55, 53, 47, 0.38);
      font-size: 9px;
      border-radius: 3px;
      transition: background 0.1s, color 0.1s;
      flex-shrink: 0;
    }

    .msb-nav-btn:hover {
      background: rgba(55, 53, 47, 0.08);
      color: rgb(55, 53, 47);
    }

    .msb-count {
      /* Fixed width sized to the longest possible string: "99+/100+" */
      width: 52px;
      font-size: 10.5px;
      color: rgba(55, 53, 47, 0.45);
      text-align: center;
      font-variant-numeric: tabular-nums;
      user-select: none;
      overflow: hidden;
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* ── Remove button ── */
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
      color: rgba(55, 53, 47, 0.25);
      font-size: 16px;
      line-height: 1;
      border-radius: 4px;
      transition: background 0.1s, color 0.1s;
    }

    .msb-remove-btn:hover {
      background: rgba(235, 87, 87, 0.1);
      color: rgb(235, 87, 87);
    }
  `;

  // ── Helpers ────────────────────────────────────────────────────────────────
  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function colorForIndex(idx) {
    return COLORS[idx % COLORS.length];
  }

  function getMarksForBar(barId) {
    return Array.from(document.querySelectorAll(`mark[data-msb="${barId}"]`));
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
      const flags = bar.isCaseSensitive ? 'g' : 'gi';
      re = new RegExp(source, flags);
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
        mark.setAttribute('data-msb', bar.id); // tag with bar id for per-bar counting
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

  // ── Counter + navigation ───────────────────────────────────────────────────
  const COUNT_CAP = 99;

  function fmtCount(n) {
    return n > COUNT_CAP ? `${COUNT_CAP}+` : String(n);
  }

  function fmtTotal(n) {
    return n > COUNT_CAP ? '100+' : String(n);
  }

  function activateMark(mark, select = false) {
    mark.setAttribute('data-msb-current', '');
    mark.scrollIntoView({ block: 'center', behavior: 'smooth' });
    if (select) {
      try {
        const range = document.createRange();
        range.selectNodeContents(mark);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (_) {}
    }
  }

  function updateCounter(bar) {
    const marks = getMarksForBar(bar.id);
    const total = marks.length;
    const row = shadow?.querySelector(`[data-bar-id="${bar.id}"]`);
    if (!row) return;

    const nav = row.querySelector('.msb-nav');
    const countEl = row.querySelector('.msb-count');

    marks.forEach((m) => m.removeAttribute('data-msb-current'));

    if (!bar.pattern || total === 0) {
      nav.classList.remove('visible');
      return;
    }

    bar.matchIndex = Math.min(bar.matchIndex, total - 1);
    countEl.textContent = `${fmtCount(bar.matchIndex + 1)}/${fmtTotal(total)}`;
    nav.classList.add('visible');

    activateMark(marks[bar.matchIndex]); // scroll only, no selection while typing
  }

  function navigateBar(bar, direction) {
    const marks = getMarksForBar(bar.id);
    if (!marks.length) return;

    marks[bar.matchIndex]?.removeAttribute('data-msb-current');

    bar.matchIndex = (bar.matchIndex + direction + marks.length) % marks.length;

    const row = shadow?.querySelector(`[data-bar-id="${bar.id}"]`);
    if (row) {
      row.querySelector('.msb-count').textContent =
        `${fmtCount(bar.matchIndex + 1)}/${fmtTotal(marks.length)}`;
    }

    activateMark(marks[bar.matchIndex], true); // scroll + select on explicit navigation
  }

  function runSearch() {
    clearHighlights();

    bars.forEach((bar, idx) => {
      bar.matchIndex = 0;
      const inputEl = shadow?.querySelector(`[data-bar-id="${bar.id}"] .msb-input`);
      const ok = highlightBar(bar, colorForIndex(idx));
      if (inputEl) inputEl.classList.toggle('input-error', !ok);
      updateCounter(bar);

    });
  }

  function scheduleSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runSearch, 150);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function renderBars(newBarId = null) {
    barsContainer.innerHTML = '';

    bars.forEach((bar, idx) => {
      const color = colorForIndex(idx);
      const row = document.createElement('div');
      row.className = 'msb-row' + (bar.id === newBarId ? ' msb-row-new' : '');
      row.dataset.barId = bar.id;

      // Dot
      const dot = document.createElement('span');
      dot.className = 'msb-dot';
      dot.style.background = color;

      // Input
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
        bar.matchIndex = 0;
        scheduleSearch();
      });

      // Regex toggle
      const regexBtn = document.createElement('button');
      regexBtn.className = 'msb-toggle-btn msb-regex-btn' + (bar.isRegex ? ' active' : '');
      regexBtn.title = 'Toggle regex mode';
      regexBtn.textContent = '.*';
      regexBtn.addEventListener('click', () => {
        bar.isRegex = !bar.isRegex;
        regexBtn.classList.toggle('active', bar.isRegex);
        runSearch();
      });

      // Case toggle
      const caseBtn = document.createElement('button');
      caseBtn.className = 'msb-toggle-btn msb-case-btn' + (bar.isCaseSensitive ? ' active' : '');
      caseBtn.title = 'Toggle case sensitive';
      caseBtn.textContent = 'Aa';
      caseBtn.addEventListener('click', () => {
        bar.isCaseSensitive = !bar.isCaseSensitive;
        caseBtn.classList.toggle('active', bar.isCaseSensitive);
        runSearch();
      });

      // Navigation group: ▲ N/total ▼
      const nav = document.createElement('div');
      nav.className = 'msb-nav';

      const prevBtn = document.createElement('button');
      prevBtn.className = 'msb-nav-btn';
      prevBtn.title = 'Previous match (Shift+Enter)';
      prevBtn.textContent = '↑';
      prevBtn.addEventListener('click', () => navigateBar(bar, -1));

      const countEl = document.createElement('span');
      countEl.className = 'msb-count';

      const nextBtn = document.createElement('button');
      nextBtn.className = 'msb-nav-btn';
      nextBtn.title = 'Next match (Enter)';
      nextBtn.textContent = '↓';
      nextBtn.addEventListener('click', () => navigateBar(bar, 1));

      nav.appendChild(prevBtn);
      nav.appendChild(countEl);
      nav.appendChild(nextBtn);

      // Remove button
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
      row.appendChild(caseBtn);
      row.appendChild(nav);
      row.appendChild(removeBtn);
      barsContainer.appendChild(row);
    });
  }

  // ── Panel init ─────────────────────────────────────────────────────────────
  function initPanel() {
    hostEl = document.createElement('div');
    hostEl.setAttribute('data-msb-host', '');
    document.body.appendChild(hostEl);

    // Style for active mark highlight — marks live in the main doc, not shadow DOM
    const markStyle = document.createElement('style');
    markStyle.id = 'msb-mark-style';
    markStyle.textContent =
      'mark[data-msb-current]{outline:2.5px solid rgba(0,0,0,0.4)!important;' +
      'outline-offset:1px;border-radius:2px;position:relative;z-index:1}';
    document.head.appendChild(markStyle);

    shadow = hostEl.attachShadow({ mode: 'open' });

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

    const headerActions = document.createElement('div');
    headerActions.id = 'msb-header-actions';

    const addBtn = document.createElement('button');
    addBtn.id = 'msb-add-btn';
    addBtn.className = 'msb-icon-btn';
    addBtn.title = 'Add search bar';
    addBtn.textContent = '+';
    addBtn.addEventListener('click', () => {
      const id = nextId++;
      bars.push({ id, pattern: '', isRegex: false, isCaseSensitive: false, matchIndex: 0 });
      renderBars(id);
      const inputs = shadow.querySelectorAll('.msb-input');
      if (inputs.length) inputs[inputs.length - 1].focus();
      runSearch();
    });

    const closeBtn = document.createElement('button');
    closeBtn.id = 'msb-close';
    closeBtn.className = 'msb-icon-btn';
    closeBtn.title = 'Close (Esc)';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', closePanel);

    headerActions.appendChild(addBtn);
    headerActions.appendChild(closeBtn);
    header.appendChild(title);
    header.appendChild(headerActions);

    barsContainer = document.createElement('div');
    barsContainer.id = 'msb-bars';

    panel.appendChild(header);
    panel.appendChild(barsContainer);
    shadow.appendChild(panel);

    // Enter / Shift+Enter to navigate within the focused bar
    shadow.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const row = e.target.closest('.msb-row');
      if (!row) return;
      const barId = Number(row.dataset.barId);
      const bar = bars.find((b) => b.id === barId);
      if (!bar) return;
      e.preventDefault();
      navigateBar(bar, e.shiftKey ? -1 : 1);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel && !panel.classList.contains('msb-hidden')) {
        closePanel();
      }
    });

    renderBars();
  }

  function openPanel() {
    panel.classList.remove('msb-hidden');
    runSearch(); // restore highlights cleared on close
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
