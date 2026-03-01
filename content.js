(() => {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────
  let bars = [{ id: 0, pattern: '', isRegex: false }];
  let nextId = 1;
  const COLORS = [
    '#FFFF00', '#00FFFF', '#90EE90', '#FFB6C1',
    '#FFA500', '#DDA0DD', '#FF6347', '#40E0D0',
  ];

  // ── DOM refs (set on first initialise) ────────────────────────────────────
  let hostEl = null;
  let shadow = null;
  let panel = null;
  let barsContainer = null;

  // ── Debounce timer ────────────────────────────────────────────────────────
  let debounceTimer = null;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function colorForBar(bar) {
    const idx = bars.indexOf(bar);
    return COLORS[idx % COLORS.length];
  }

  // ── Highlight engine ──────────────────────────────────────────────────────
  function clearHighlights() {
    const marks = document.querySelectorAll('mark[data-msb]');
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      if (!parent) return;
      // Replace mark with its text content
      const text = document.createTextNode(mark.textContent);
      parent.replaceChild(text, mark);
      parent.normalize();
    });
  }

  const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'NOSCRIPT', 'IFRAME',
  ]);

  function highlightBar(bar, color) {
    const rawPattern = bar.pattern;
    if (!rawPattern) return true; // no pattern — nothing to do, not an error

    let re;
    try {
      const source = bar.isRegex ? rawPattern : escapeRegex(rawPattern);
      re = new RegExp(source, 'gi');
    } catch (_) {
      return false; // invalid regex
    }

    // Gather text nodes first (avoid live-list mutation issues)
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          // Skip if inside an element we don't want to touch
          let el = node.parentElement;
          while (el) {
            if (el === hostEl) return NodeFilter.FILTER_REJECT;
            if (SKIP_TAGS.has(el.tagName)) return NodeFilter.FILTER_REJECT;
            if (el.hasAttribute('data-msb-host')) return NodeFilter.FILTER_REJECT;
            el = el.parentElement;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }

    // Process each text node
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
        mark.style.color = '#000';
        mark.style.borderRadius = '2px';
        mark.style.padding = '0 1px';
        mark.textContent = match[0];
        parts.push(mark);
        lastIndex = match.index + match[0].length;

        // Avoid infinite loop on zero-length matches
        if (match[0].length === 0) re.lastIndex++;
      }

      if (parts.length === 0) return; // no matches in this node

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

    bars.forEach((bar) => {
      const inputEl = shadow
        ? shadow.querySelector(`[data-bar-id="${bar.id}"] .msb-input`)
        : null;

      const ok = highlightBar(bar, colorForBar(bar));

      if (inputEl) {
        if (ok) {
          inputEl.classList.remove('input-error');
        } else {
          inputEl.classList.add('input-error');
        }
      }
    });
  }

  function scheduleSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runSearch, 150);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function renderBars() {
    barsContainer.innerHTML = '';

    bars.forEach((bar) => {
      const color = colorForBar(bar);
      const row = document.createElement('div');
      row.className = 'msb-row';
      row.dataset.barId = bar.id;

      // Color dot
      const dot = document.createElement('span');
      dot.className = 'msb-dot';
      dot.style.background = color;

      // Search input
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'msb-input';
      input.placeholder = 'Search…';
      input.value = bar.pattern;
      input.addEventListener('input', (e) => {
        bar.pattern = e.target.value;
        scheduleSearch();
      });

      // Regex toggle
      const regexBtn = document.createElement('button');
      regexBtn.className = 'msb-regex-btn' + (bar.isRegex ? ' regex-active' : '');
      regexBtn.title = 'Toggle regex';
      regexBtn.textContent = '.*';
      regexBtn.addEventListener('click', () => {
        bar.isRegex = !bar.isRegex;
        regexBtn.classList.toggle('regex-active', bar.isRegex);
        runSearch();
      });

      // Remove button (hidden when only 1 bar)
      const removeBtn = document.createElement('button');
      removeBtn.className = 'msb-remove-btn';
      removeBtn.title = 'Remove this bar';
      removeBtn.textContent = '×';
      removeBtn.style.visibility = bars.length === 1 ? 'hidden' : 'visible';
      removeBtn.addEventListener('click', () => {
        const idx = bars.findIndex((b) => b.id === bar.id);
        if (idx !== -1) bars.splice(idx, 1);
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

  // ── Panel init ────────────────────────────────────────────────────────────
  function initPanel() {
    // Host element (outside shadow — just an anchor)
    hostEl = document.createElement('div');
    hostEl.setAttribute('data-msb-host', '');
    document.body.appendChild(hostEl);

    shadow = hostEl.attachShadow({ mode: 'open' });

    // Inject CSS into shadow root
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('content.css');
    shadow.appendChild(link);

    // Panel
    panel = document.createElement('div');
    panel.id = 'msb-panel';

    // Header
    const header = document.createElement('div');
    header.id = 'msb-header';

    const title = document.createElement('span');
    title.id = 'msb-title';
    title.textContent = 'Multi-Search';

    const closeBtn = document.createElement('button');
    closeBtn.id = 'msb-close';
    closeBtn.title = 'Close';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', closePanel);

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Bars container
    barsContainer = document.createElement('div');
    barsContainer.id = 'msb-bars';

    // Footer
    const footer = document.createElement('div');
    footer.id = 'msb-footer';

    const addBtn = document.createElement('button');
    addBtn.id = 'msb-add-btn';
    addBtn.textContent = '+ Add search bar';
    addBtn.addEventListener('click', () => {
      bars.push({ id: nextId++, pattern: '', isRegex: false });
      renderBars();
      // Focus the new (last) input
      const inputs = shadow.querySelectorAll('.msb-input');
      if (inputs.length > 0) inputs[inputs.length - 1].focus();
      runSearch();
    });

    footer.appendChild(addBtn);

    panel.appendChild(header);
    panel.appendChild(barsContainer);
    panel.appendChild(footer);
    shadow.appendChild(panel);

    // Escape key closes panel
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel && !panel.classList.contains('msb-hidden')) {
        closePanel();
      }
    });

    renderBars();
  }

  function openPanel() {
    panel.classList.remove('msb-hidden');
    // Focus first input
    const firstInput = shadow.querySelector('.msb-input');
    if (firstInput) firstInput.focus();
  }

  function closePanel() {
    panel.classList.add('msb-hidden');
    clearHighlights();
  }

  // ── Message listener ──────────────────────────────────────────────────────
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
