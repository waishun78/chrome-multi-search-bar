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
  // Map<barId, mark[]> of lead-fragment marks built during each highlight pass.
  // Avoids repeated full-document querySelectorAll calls for navigation/counters.
  // Set to null when stale (cleared by clearHighlights, rebuilt by highlightAll).
  let markCache = null;

  // ── Debounce ───────────────────────────────────────────────────────────────
  let debounceTimer = null;

  // ── Styles (Linear-inspired dark UI) ──────────────────────────────────────
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
      background: #1a1a1e;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow:
        0 0 0 1px rgba(0, 0, 0, 0.4),
        0 8px 16px rgba(0, 0, 0, 0.4),
        0 24px 48px rgba(0, 0, 0, 0.3);
      font-family: 'Inter', ui-sans-serif, -apple-system, BlinkMacSystemFont,
                   'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.82);
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
      padding: 7px 7px 7px 11px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      flex-shrink: 0;
    }

    #msb-title {
      font-size: 11px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.3);
      text-transform: uppercase;
      letter-spacing: 0.07em;
      user-select: none;
      flex: 1;
    }

    #msb-header-actions {
      display: flex;
      align-items: center;
      gap: 1px;
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
      color: rgba(255, 255, 255, 0.3);
      border-radius: 5px;
      transition: background 0.15s, color 0.15s;
      flex-shrink: 0;
    }

    .msb-icon-btn:hover {
      background: rgba(255, 255, 255, 0.07);
      color: rgba(255, 255, 255, 0.75);
    }

    #msb-add-btn { font-size: 19px; line-height: 1; padding-bottom: 1px; }
    #msb-close   { font-size: 17px; line-height: 1; }

    /* ── Bars ── */
    #msb-bars {
      display: flex;
      flex-direction: column;
      gap: 1px;
      padding: 5px;
      max-height: calc(60vh - 46px);
      overflow-y: auto;
    }

    #msb-bars::-webkit-scrollbar { width: 3px; }
    #msb-bars::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.08);
      border-radius: 2px;
    }

    @keyframes msb-row-in {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .msb-row {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 3px 3px;
      border-radius: 5px;
    }

    .msb-row:hover { background: rgba(255, 255, 255, 0.03); }

    .msb-row.msb-row-new {
      animation: msb-row-in 0.15s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .msb-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
      border: 1px solid rgba(0, 0, 0, 0.25);
      transition: background 0.2s ease;
    }

    .msb-input {
      flex: 1;
      min-width: 0;
      padding: 5px 8px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 5px;
      font-size: 12.5px;
      font-family: inherit;
      color: rgba(255, 255, 255, 0.82);
      background: rgba(255, 255, 255, 0.04);
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .msb-input::placeholder { color: rgba(255, 255, 255, 0.22); }

    .msb-input:focus {
      border-color: rgba(255, 255, 255, 0.18);
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.06);
    }

    .msb-input.input-error {
      border-color: rgba(248, 81, 73, 0.6);
      box-shadow: 0 0 0 2px rgba(248, 81, 73, 0.12);
    }

    /* shared toggle pill — regex + case */
    .msb-toggle-btn {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 24px;
      padding: 0 5px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 5px;
      background: none;
      color: rgba(255, 255, 255, 0.28);
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, color 0.15s;
      line-height: 1;
    }

    .msb-toggle-btn:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.14);
      color: rgba(255, 255, 255, 0.65);
    }

    .msb-toggle-btn.active {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.22);
      color: rgba(255, 255, 255, 0.9);
    }

    .msb-regex-btn {
      font-size: 10px;
      font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace;
    }

    .msb-case-btn {
      font-size: 10.5px;
      font-weight: 600;
    }

    /* ── Per-bar navigation ── */
    .msb-nav {
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
      color: rgba(255, 255, 255, 0.25);
      font-size: 9px;
      border-radius: 3px;
      transition: background 0.15s, color 0.15s;
      flex-shrink: 0;
    }

    .msb-nav-btn:hover {
      background: rgba(255, 255, 255, 0.07);
      color: rgba(255, 255, 255, 0.7);
    }

    .msb-count {
      width: 52px;
      font-size: 10.5px;
      color: rgba(255, 255, 255, 0.25);
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
      width: 20px;
      height: 20px;
      border: none;
      background: none;
      cursor: pointer;
      color: rgba(255, 255, 255, 0.18);
      font-size: 15px;
      line-height: 1;
      border-radius: 4px;
      transition: background 0.15s, color 0.15s;
    }

    .msb-remove-btn:hover {
      background: rgba(248, 81, 73, 0.12);
      color: rgba(248, 81, 73, 0.85);
    }
  `;

  // ── Helpers ────────────────────────────────────────────────────────────────
  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Color keyed on bar.id so removing a bar never shifts other bars' colors
  function colorForBar(bar) {
    return COLORS[bar.id % COLORS.length];
  }

  // Returns lead-fragment marks for a bar from the cache built by highlightAll.
  // Falls back to a live DOM query only if the cache is unavailable.
  function getMarksForBar(barId) {
    return markCache?.get(barId) ?? [];
  }

  // ── Highlight engine ───────────────────────────────────────────────────────
  function clearHighlights() {
    markCache = null;
    // Collect unique parents first; normalize each exactly once after all
    // replacements rather than after every individual mark (O(parents) not O(marks)).
    const parents = new Set();
    document.querySelectorAll('mark[data-msb]').forEach((mark) => {
      const parent = mark.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(mark.textContent), mark);
      parents.add(parent);
    });
    parents.forEach((p) => p.normalize());
  }

  const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'NOSCRIPT', 'IFRAME',
  ]);

  // Block-level elements that form search boundaries — text nodes are grouped
  // by their nearest block ancestor so patterns can match across inline elements
  // like <em>, <span>, <strong>, <a> without being split.
  const BLOCK_TAGS = new Set([
    'ADDRESS','ARTICLE','ASIDE','BLOCKQUOTE','CANVAS','DD','DIV','DL',
    'FIELDSET','FIGCAPTION','FIGURE','FOOTER','FORM',
    'H1','H2','H3','H4','H5','H6',
    'HEADER','HR','LI','MAIN','NAV','OL','P',
    'PRE','SECTION','TABLE','TFOOT','THEAD','TBODY','TD','TH','TR',
    'UL','VIDEO','BODY',
  ]);

  function nearestBlock(el) {
    let cur = el;
    while (cur && !BLOCK_TAGS.has(cur.tagName)) cur = cur.parentElement;
    return cur || document.body;
  }

  function makeMarkEl(bar, text, isCont) {
    const mark = document.createElement('mark');
    mark.setAttribute('data-msb', bar.id);
    if (isCont) mark.setAttribute('data-msb-cont', '');
    mark.style.background = colorForBar(bar);
    mark.style.color = 'rgba(55,53,47,0.9)';
    mark.style.borderRadius = '2px';
    mark.style.padding = '0 1px';
    mark.textContent = text;
    // Register lead fragments in markCache so getMarksForBar() needs no DOM query.
    if (!isCont) {
      if (!markCache.has(bar.id)) markCache.set(bar.id, []);
      markCache.get(bar.id).push(mark);
    }
    return mark;
  }

  // Single coordinated pass:
  // • Groups text nodes by nearest block ancestor so regexes can match across
  //   inline elements (e.g. "the <em>NTUC AI Career Coach</em>" is one virtual
  //   string, not two separate text nodes).
  // • Runs all bar regexes simultaneously on the virtual string before any DOM
  //   mutations, so a pattern is never blocked by another bar's <mark>.
  // • Multi-node matches produce a first <mark> + continuation <mark data-msb-cont>
  //   fragments; only non-continuation marks count for navigation/counter.
  function highlightAll() {
    // Build regex entries for every bar; mark invalid patterns on their inputs.
    const entries = bars.map((bar) => {
      const inputEl = shadow?.querySelector(`[data-bar-id="${bar.id}"] .msb-input`);
      if (!bar.pattern || bar.pattern.length < MIN_QUERY_LENGTH) {
        inputEl?.classList.remove('input-error');
        return null;
      }
      try {
        const source = bar.isRegex ? bar.pattern : escapeRegex(bar.pattern);
        const flags = bar.isCaseSensitive ? 'g' : 'gi';
        inputEl?.classList.remove('input-error');
        return { bar, re: new RegExp(source, flags) };
      } catch (_) {
        inputEl?.classList.add('input-error');
        return null;
      }
    }).filter(Boolean);

    if (!entries.length) return;

    // Fresh cache for this pass; makeMarkEl populates it for every lead fragment.
    markCache = new Map();
    // Precompute bar priority once — avoids O(n) indexOf inside the sort comparator.
    const barOrder = new Map(bars.map((b, i) => [b, i]));

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;

          // Skip CSS-hidden elements
          if (parent?.checkVisibility &&
              !parent.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true })) {
            return NodeFilter.FILTER_REJECT;
          }

          let el = parent;
          while (el) {
            if (el === hostEl) return NodeFilter.FILTER_REJECT;
            if (SKIP_TAGS.has(el.tagName)) return NodeFilter.FILTER_REJECT;
            if (el.getAttribute('aria-hidden') === 'true') return NodeFilter.FILTER_REJECT;
            el = el.parentElement;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    // Collect all text nodes in document order.
    const textNodes = [];
    let n;
    while ((n = walker.nextNode())) textNodes.push(n);

    // Group by nearest block ancestor (order within each group is document order).
    const groups = new Map();
    textNodes.forEach((node) => {
      const block = nearestBlock(node.parentElement);
      if (!groups.has(block)) groups.set(block, []);
      groups.get(block).push(node);
    });

    let totalMatches = 0; // running total across all groups for the global cap

    groups.forEach((nodes) => {
      // Bail out early once the global cap is reached to avoid further DOM work.
      if (totalMatches >= MAX_MATCHES_TOTAL) return;

      // Build virtual string with O(n) join rather than O(n²) concatenation.
      const segments = [];
      let offset = 0;
      nodes.forEach((node) => {
        const len = node.nodeValue.length;
        segments.push({ node, start: offset, end: offset + len });
        offset += len;
      });
      const virtualStr = nodes.map((n) => n.nodeValue).join('');

      // Collect matches from all bars; cap per group AND globally so a single
      // broad pattern on a huge page cannot freeze the main thread.
      const allMatches = [];
      const groupBudget = Math.min(MAX_MATCHES_PER_GROUP, MAX_MATCHES_TOTAL - totalMatches);
      for (const { bar, re } of entries) {
        if (allMatches.length >= groupBudget) break;
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(virtualStr)) !== null) {
          allMatches.push({ start: m.index, end: m.index + m[0].length, bar });
          if (m[0].length === 0) re.lastIndex++;
          if (allMatches.length >= groupBudget) break;
        }
      }

      if (!allMatches.length) return;

      // Sort and resolve overlaps (earlier start wins; ties go to earlier bar).
      allMatches.sort((a, b) => a.start - b.start || barOrder.get(a.bar) - barOrder.get(b.bar));
      const kept = [];
      let cursor = 0;
      for (const m of allMatches) {
        if (m.start >= cursor) { kept.push(m); cursor = m.end; }
      }
      totalMatches += kept.length;

      // Map matches to per-text-node intervals using a two-pointer scan.
      // Both kept[] and segments[] are sorted by start; matches don't overlap,
      // so the segment pointer only ever advances — O(kept + segments) total.
      const nodeIntervals = new Map(nodes.map((node) => [node, []]));
      let segPtr = 0;
      kept.forEach(({ start, end, bar }) => {
        while (segPtr < segments.length && segments[segPtr].end <= start) segPtr++;
        let isFirst = true;
        for (let i = segPtr; i < segments.length && segments[i].start < end; i++) {
          const { node, start: segStart, end: segEnd } = segments[i];
          const oStart = Math.max(start, segStart);
          const oEnd   = Math.min(end, segEnd);
          if (oStart < oEnd) {
            nodeIntervals.get(node).push({
              start: oStart - segStart,
              end:   oEnd   - segStart,
              bar,
              isCont: !isFirst,
            });
            isFirst = false;
          }
        }
      });

      // Apply intervals to each text node (replace with fragment).
      nodes.forEach((node) => {
        const intervals = nodeIntervals.get(node);
        if (!intervals.length) return;
        intervals.sort((a, b) => a.start - b.start);

        const text = node.nodeValue;
        const frag = document.createDocumentFragment();
        let pos = 0;
        intervals.forEach(({ start, end, bar, isCont }) => {
          if (start > pos) frag.appendChild(document.createTextNode(text.slice(pos, start)));
          frag.appendChild(makeMarkEl(bar, text.slice(start, end), isCont));
          pos = end;
        });
        if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
        // Guard against the node being detached by a page mutation between
        // TreeWalker collection and this point (common on SPA pages).
        if (node.parentNode) node.parentNode.replaceChild(frag, node);
      });
    });
  }

  // ── Counter + navigation ───────────────────────────────────────────────────
  const COUNT_CAP = 99;
  // Minimum pattern length before a search is attempted.
  // Single-character (and very short) patterns can match thousands of times on
  // large pages, freezing the main thread. Two characters is the practical
  // minimum for a meaningful search.
  const MIN_QUERY_LENGTH = 2;
  // Cap matches per block group — prevents a single giant <div> from dominating.
  const MAX_MATCHES_PER_GROUP = 500;
  // Hard ceiling across *all* groups combined.  Even with MAX_MATCHES_PER_GROUP
  // in place a page with hundreds of groups could accumulate far more matches;
  // this keeps total DOM mutations bounded regardless of page size.
  const MAX_MATCHES_TOTAL = 5_000;

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
    bars.forEach((bar) => { bar.matchIndex = 0; });
    highlightAll();
    bars.forEach((bar) => updateCounter(bar));
  }

  function scheduleSearch() {
    clearTimeout(debounceTimer);
    // Use a longer delay for short patterns — they match far more nodes and are
    // the primary cause of janky typing on content-heavy pages.
    const shortest = bars.reduce(
      (min, b) => (b.pattern.length >= MIN_QUERY_LENGTH ? Math.min(min, b.pattern.length) : min),
      Infinity,
    );
    const delay = shortest <= 2 ? 350 : shortest <= 3 ? 200 : 150;
    debounceTimer = setTimeout(runSearch, isFinite(shortest) ? delay : 150);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  // Show/hide every remove button based on current bar count.
  // Called after any add or remove — touches only the visibility property.
  function syncRemoveBtns() {
    const hide = bars.length === 1;
    shadow.querySelectorAll('.msb-remove-btn').forEach((btn) => {
      btn.style.visibility = hide ? 'hidden' : 'visible';
    });
  }

  // Build and return a single row element for `bar`.
  // Pass animate=true only for newly added bars so existing rows are untouched.
  function createRow(bar, animate = false) {
    const color = colorForBar(bar);

    const row = document.createElement('div');
    row.className = 'msb-row' + (animate ? ' msb-row-new' : '');
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
      bar.matchIndex = 0;
      scheduleSearch();
    });

    const regexBtn = document.createElement('button');
    regexBtn.className = 'msb-toggle-btn msb-regex-btn' + (bar.isRegex ? ' active' : '');
    regexBtn.title = 'Toggle regex mode';
    regexBtn.textContent = '.*';
    regexBtn.addEventListener('click', () => {
      bar.isRegex = !bar.isRegex;
      regexBtn.classList.toggle('active', bar.isRegex);
      runSearch();
    });

    const caseBtn = document.createElement('button');
    caseBtn.className = 'msb-toggle-btn msb-case-btn' + (bar.isCaseSensitive ? ' active' : '');
    caseBtn.title = 'Toggle case sensitive';
    caseBtn.textContent = 'Aa';
    caseBtn.addEventListener('click', () => {
      bar.isCaseSensitive = !bar.isCaseSensitive;
      caseBtn.classList.toggle('active', bar.isCaseSensitive);
      runSearch();
    });

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

    const removeBtn = document.createElement('button');
    removeBtn.className = 'msb-remove-btn';
    removeBtn.title = 'Remove';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
      const i = bars.findIndex((b) => b.id === bar.id);
      if (i !== -1) bars.splice(i, 1);
      row.remove();          // remove only this row — no full re-render
      syncRemoveBtns();
      runSearch();
    });

    row.appendChild(dot);
    row.appendChild(input);
    row.appendChild(regexBtn);
    row.appendChild(caseBtn);
    row.appendChild(nav);
    row.appendChild(removeBtn);
    return row;
  }

  // Full render — used only on initial panel creation.
  function renderBars() {
    barsContainer.innerHTML = '';
    bars.forEach((bar) => barsContainer.appendChild(createRow(bar)));
    syncRemoveBtns();
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
      'mark[data-msb-current]{outline:2px solid rgba(0,0,0,0.55)!important;' +
      'outline-offset:0px;border-radius:2px;position:relative;z-index:1;' +
      'filter:brightness(0.82) saturate(1.3)!important}';
    document.head.appendChild(markStyle);

    shadow = hostEl.attachShadow({ mode: 'closed' });

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
      const bar = { id, pattern: '', isRegex: false, isCaseSensitive: false, matchIndex: 0 };
      bars.push(bar);
      barsContainer.appendChild(createRow(bar, true)); // append only the new row
      syncRemoveBtns();
      shadow.getElementById(`msb-input-${id}`)?.focus();
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

    // Intercept keystrokes at the window CAPTURE phase — the very first step of
    // event dispatch — so we beat even site shortcuts registered with {capture:true}
    // on document. Shadow-root bubbling listeners fire too late for those.
    //
    // When a key is pressed inside our shadow DOM the event's target is retargeted
    // to hostEl at the window level (shadow DOM encapsulation), so e.target===hostEl
    // reliably identifies events that originated from our panel.
    //
    // stopPropagation() here prevents JS handlers further down the path from seeing
    // the event, but does NOT prevent the browser's native text-insertion into the
    // focused <input> — that happens outside the JS event system.
    window.addEventListener('keydown', (e) => {
      if (!panel || panel.classList.contains('msb-hidden')) return;
      if (e.target !== hostEl) return; // event didn't come from inside our panel

      if (e.key === 'Escape') {
        closePanel();
        e.stopPropagation();
        return;
      }

      if (e.key === 'Enter') {
        // shadow.activeElement gives the real focused element inside the closed shadow.
        const row = shadow.activeElement?.closest?.('.msb-row');
        if (row) {
          const barId = Number(row.dataset.barId);
          const bar = bars.find((b) => b.id === barId);
          if (bar) {
            e.preventDefault();
            navigateBar(bar, e.shiftKey ? -1 : 1);
          }
        }
      }

      e.stopPropagation();
    }, { capture: true });

    // Also close on Escape when focus is outside the panel (e.g. user clicked page).
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
  chrome.runtime.onMessage.addListener((msg, sender) => {
    // Only accept messages from this extension's own background script.
    if (sender.id !== chrome.runtime.id) return;
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
