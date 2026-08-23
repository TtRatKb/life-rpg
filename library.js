(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState) {
    console.error("Life RPG Library could not initialize because LifeRPGApp is unavailable.");
    return;
  }

  const SCHEMA = 1;
  const SHADOW_KEY = "life-rpg-book-library-shadow-v1";
  const MAX_LOGS = 1200;

  const STATUSES = {
    reading: { label: "Reading", icon: "📖" },
    want: { label: "Want to Read", icon: "✦" },
    paused: { label: "Paused", icon: "◷" },
    finished: { label: "Finished", icon: "✓" },
    dnf: { label: "DNF", icon: "×" }
  };

  const ROLES = {
    fun: { label: "For Fun", icon: "🌸", realm: "Hobbies", description: "Fiction, comfort reads, romance, fantasy — because you want to read it." },
    knowledge: { label: "Knowledge", icon: "📚", realm: "Knowledge", description: "Nonfiction you want to learn from or think with." },
    growth: { label: "Personal Growth", icon: "✨", realm: "Knowledge", description: "Self-development, reflection, life skills, perspective." },
    japanese: { label: "Japanese", icon: "あ", realm: "Japanese", description: "Reading that supports Japanese study or immersion." },
    work: { label: "Work", icon: "📎", realm: "Work", description: "Books you are reading mainly for school or professional reasons." }
  };

  const SOURCES = {
    physical: { label: "Physical", icon: "📕" },
    kindle: { label: "Kindle", icon: "▣" },
    ku: { label: "Kindle Unlimited", icon: "∞" },
    borrowed: { label: "Borrowed", icon: "↗" },
    audio: { label: "Audiobook", icon: "🎧" },
    other: { label: "Other", icon: "✦" }
  };

  const els = {
    add: byId("addBookButton"),
    addSecondary: byId("addBookButtonSecondary"),
    emptyAdd: byId("libraryEmptyCreate"),
    bulk: byId("bulkAddBooksButton"),
    board: byId("libraryBoard"),
    empty: byId("libraryEmpty"),
    search: byId("librarySearch"),
    status: byId("libraryStatusFilter"),
    roleFilters: byId("libraryRoleFilters"),
    readingSummary: byId("librarySummaryReading"),
    wantSummary: byId("librarySummaryWant"),
    finishedSummary: byId("librarySummaryFinished"),

    dialog: byId("bookDialog"),
    form: byId("bookForm"),
    editId: byId("bookEditId"),
    dialogTitle: byId("bookDialogTitle"),
    close: byId("bookDialogClose"),
    cancel: byId("cancelBookButton"),
    deleteButton: byId("deleteBookButton"),
    title: byId("bookTitle"),
    author: byId("bookAuthor"),
    source: byId("bookSource"),
    totalPages: byId("bookTotalPages"),
    currentPage: byId("bookCurrentPage"),
    series: byId("bookSeries"),
    seriesNumber: byId("bookSeriesNumber"),
    continueSeries: byId("bookContinueSeries"),
    preferredGoal: byId("bookPreferredGoal"),
    notes: byId("bookNotes"),
    advanced: byId("bookAdvancedDetails"),
    preview: byId("bookQuickPreview"),

    bulkDialog: byId("bookBulkDialog"),
    bulkForm: byId("bookBulkForm"),
    bulkClose: byId("bookBulkClose"),
    bulkCancel: byId("bookBulkCancel"),
    bulkText: byId("bookBulkText"),
    bulkStatus: byId("bookBulkStatus"),
    bulkRole: byId("bookBulkRole"),
    bulkSource: byId("bookBulkSource"),
    bulkPreview: byId("bookBulkPreview"),

    logDialog: byId("bookLogDialog"),
    logForm: byId("bookLogForm"),
    logId: byId("bookLogId"),
    logTitle: byId("bookLogTitle"),
    logClose: byId("bookLogClose"),
    logCancel: byId("bookLogCancel"),
    logPagesWrap: byId("bookLogPagesWrap"),
    logPages: byId("bookLogPages"),
    logMinutesWrap: byId("bookLogMinutesWrap"),
    logMinutes: byId("bookLogMinutes"),
    logChapter: byId("bookLogChapter"),
    logPreview: byId("bookLogPreview"),

    toast: byId("libraryToast"),
    toastTitle: byId("libraryToastTitle"),
    toastDetail: byId("libraryToastDetail")
  };

  let initialized = false;
  let selectedRole = "all";
  let toastTimer = null;
  let logSuggestion = null;

  init();

  function init() {
    bindEvents();
    const changed = ensureState();
    initialized = true;
    if (changed) persist("book-library-init", { render: false });
    render();
    exposeApi();
  }

  function bindEvents() {
    [els.add, els.addSecondary, els.emptyAdd].forEach(button => button?.addEventListener("click", () => openBookDialog()));
    els.bulk?.addEventListener("click", openBulkDialog);
    els.close?.addEventListener("click", closeBookDialog);
    els.cancel?.addEventListener("click", closeBookDialog);
    els.form?.addEventListener("submit", saveBookFromDialog);
    els.deleteButton?.addEventListener("click", deleteCurrentBook);

    [els.title, els.author, els.source, els.totalPages, els.currentPage, els.series, els.seriesNumber, els.preferredGoal].forEach(input => {
      input?.addEventListener("input", renderQuickPreview);
      input?.addEventListener("change", renderQuickPreview);
    });
    els.continueSeries?.addEventListener("change", renderQuickPreview);
    els.form?.querySelectorAll('input[name="bookStatus"], input[name="bookRole"]').forEach(input => input.addEventListener("change", renderQuickPreview));

    els.search?.addEventListener("input", renderBoard);
    els.status?.addEventListener("change", renderBoard);
    els.roleFilters?.addEventListener("click", event => {
      const button = event.target.closest?.("[data-library-role]");
      if (!button) return;
      selectedRole = button.dataset.libraryRole || "all";
      els.roleFilters.querySelectorAll("[data-library-role]").forEach(node => node.classList.toggle("active", node === button));
      renderBoard();
    });

    document.addEventListener("click", event => {
      const edit = event.target.closest?.("[data-book-edit]");
      if (edit) {
        openBookDialog(edit.dataset.bookEdit);
        return;
      }

      const start = event.target.closest?.("[data-book-start]");
      if (start) {
        setBookStatus(start.dataset.bookStart, "reading");
        return;
      }

      const quick = event.target.closest?.("[data-book-quick-log]");
      if (quick) {
        const id = quick.dataset.bookQuickLog;
        const type = quick.dataset.bookLogType || "pages";
        const amount = Number(quick.dataset.bookLogAmount || 0);
        quickLog(id, type, amount);
        return;
      }

      const openLog = event.target.closest?.("[data-book-open-log]");
      if (openLog) {
        openLogDialog(openLog.dataset.bookOpenLog);
      }
    });

    els.bulkClose?.addEventListener("click", closeBulkDialog);
    els.bulkCancel?.addEventListener("click", closeBulkDialog);
    els.bulkForm?.addEventListener("submit", saveBulkBooks);
    [els.bulkText, els.bulkStatus, els.bulkRole, els.bulkSource].forEach(input => {
      input?.addEventListener("input", renderBulkPreview);
      input?.addEventListener("change", renderBulkPreview);
    });

    els.logClose?.addEventListener("click", closeLogDialog);
    els.logCancel?.addEventListener("click", closeLogDialog);
    els.logForm?.addEventListener("submit", saveLog);
    [els.logPages, els.logMinutes, els.logChapter].forEach(input => input?.addEventListener("input", renderLogPreview));
    document.addEventListener("click", event => {
      const nudge = event.target.closest?.("[data-book-log-nudge]");
      if (!nudge) return;
      const field = nudge.dataset.bookLogField;
      const amount = Number(nudge.dataset.bookLogNudge || 0);
      const input = field === "minutes" ? els.logMinutes : els.logPages;
      if (!input) return;
      input.value = String(Math.max(0, Number(input.value || 0) + amount));
      renderLogPreview();
    });

    window.addEventListener("life-rpg:render", () => {
      if (!initialized) return;
      ensureState();
      render();
    });
  }

  function ensureState() {
    const state = app.getState();
    let changed = false;
    if (!state.bookLibrary || typeof state.bookLibrary !== "object" || Array.isArray(state.bookLibrary)) {
      state.bookLibrary = readShadow() || defaultState();
      changed = true;
    }
    const library = state.bookLibrary;
    if (Number(library.schemaVersion || 0) < SCHEMA) { library.schemaVersion = SCHEMA; changed = true; }
    if (!Array.isArray(library.items)) { library.items = []; changed = true; }
    if (!Array.isArray(library.logs)) { library.logs = []; changed = true; }

    library.items.forEach(book => {
      if (!book.id) { book.id = makeId("book"); changed = true; }
      if (!book.title) { book.title = "Untitled book"; changed = true; }
      if (!STATUSES[book.status]) { book.status = "want"; changed = true; }
      if (!ROLES[book.role]) { book.role = "fun"; changed = true; }
      if (!SOURCES[book.source]) { book.source = "physical"; changed = true; }
      if (!book.preferredGoal || !["auto", "pages", "chapter", "minutes"].includes(book.preferredGoal)) { book.preferredGoal = "auto"; changed = true; }
      book.totalPages = safePositive(book.totalPages);
      book.currentPage = Math.max(0, Number(book.currentPage || 0));
      if (book.totalPages) book.currentPage = Math.min(book.currentPage, book.totalPages);
      if (!book.createdAt) { book.createdAt = Date.now(); changed = true; }
      if (!book.updatedAt) { book.updatedAt = book.createdAt; changed = true; }
      if (book.status === "reading" && !book.startedAt) { book.startedAt = book.updatedAt; changed = true; }
      if (book.status === "finished" && !book.finishedAt) { book.finishedAt = book.updatedAt; changed = true; }
      if (typeof book.continueSeries !== "boolean") { book.continueSeries = false; changed = true; }
    });

    if (library.logs.length > MAX_LOGS) library.logs = library.logs.slice(-MAX_LOGS);
    writeShadow(library);
    return changed;
  }

  function defaultState() {
    return { schemaVersion: SCHEMA, items: [], logs: [] };
  }

  function model() {
    ensureState();
    return app.getState().bookLibrary;
  }

  function persist(source, { render: shouldRender = true } = {}) {
    const current = model();
    if (current.logs.length > MAX_LOGS) current.logs = current.logs.slice(-MAX_LOGS);
    writeShadow(current);
    app.saveState({ source });
    if (shouldRender) render();
    dispatchChange(source);
  }

  function readShadow() {
    try {
      const raw = localStorage.getItem(SHADOW_KEY);
      if (!raw) return null;
      const value = JSON.parse(raw);
      return value && typeof value === "object" ? value : null;
    } catch { return null; }
  }

  function writeShadow(value) {
    try { localStorage.setItem(SHADOW_KEY, JSON.stringify(value)); } catch { /* main save remains canonical */ }
  }

  function dispatchChange(source) {
    try {
      window.dispatchEvent(new CustomEvent("life-rpg:library-change", { detail: { source } }));
    } catch { /* no-op */ }
  }

  function render() {
    renderSummary();
    renderBoard();
  }

  function renderSummary() {
    const items = model().items;
    if (els.readingSummary) els.readingSummary.textContent = items.filter(book => book.status === "reading").length;
    if (els.wantSummary) els.wantSummary.textContent = items.filter(book => book.status === "want").length;
    if (els.finishedSummary) els.finishedSummary.textContent = items.filter(book => book.status === "finished").length;
  }

  function renderBoard() {
    if (!els.board || !els.empty) return;
    const query = String(els.search?.value || "").trim().toLowerCase();
    const status = els.status?.value || "reading";
    let items = [...model().items];

    if (status !== "all") items = items.filter(book => book.status === status);
    if (selectedRole !== "all") items = items.filter(book => book.role === selectedRole);
    if (query) {
      items = items.filter(book => [book.title, book.author, book.series, ROLES[book.role]?.label, SOURCES[book.source]?.label]
        .some(value => String(value || "").toLowerCase().includes(query)));
    }

    items.sort(compareBooks);
    els.board.innerHTML = items.map(bookCardMarkup).join("");
    els.empty.classList.toggle("hidden", items.length > 0);
    if (!items.length) {
      const hasAny = model().items.length > 0;
      els.empty.querySelector("h3").textContent = hasAny ? "Nothing matches this shelf." : "Your Library is empty.";
      els.empty.querySelector("p").textContent = hasAny
        ? "Try another status, role, or search. The books are still here."
        : "Add one book in a few taps, or paste a whole list at once. Details like pages and series can wait until they are useful.";
    }
  }

  function compareBooks(a, b) {
    const statusOrder = { reading: 0, want: 1, paused: 2, finished: 3, dnf: 4 };
    const s = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
    if (s) return s;
    if (a.status === "reading") {
      const aTime = Number(a.lastReadAt || a.startedAt || a.createdAt || 0);
      const bTime = Number(b.lastReadAt || b.startedAt || b.createdAt || 0);
      return aTime - bTime; // neglected current reads surface first
    }
    return Number(b.updatedAt || 0) - Number(a.updatedAt || 0);
  }

  function bookCardMarkup(book) {
    const status = STATUSES[book.status] || STATUSES.want;
    const role = ROLES[book.role] || ROLES.fun;
    const source = SOURCES[book.source] || SOURCES.other;
    const progress = bookProgress(book);
    const isAudio = book.source === "audio";
    const last = book.lastReadAt ? humanAgo(book.lastReadAt) : book.status === "reading" ? "not logged yet" : "—";
    const seriesText = book.series ? `${esc(book.series)}${book.seriesNumber ? ` · #${esc(book.seriesNumber)}` : ""}` : "";
    const reasonBits = [];
    if (book.continueSeries && book.series) reasonBits.push("continue series");
    if (book.status === "reading" && daysSinceTimestamp(book.lastReadAt || book.startedAt || book.createdAt) >= 14) reasonBits.push("waiting for you");

    return `
      <article class="library-book-card-v16 status-${escAttr(book.status)}">
        <div class="library-book-spine-v16" aria-hidden="true"><span>${bookSpineMark(book)}</span></div>
        <div class="library-book-body-v16">
          <div class="library-book-top-v16">
            <div class="library-book-tags-v16">
              <span class="library-status-pill-v16">${status.icon} ${status.label}</span>
              <span>${role.icon} ${role.label}</span>
              <span>${source.icon} ${source.label}</span>
            </div>
            <button class="library-edit-button-v16" data-book-edit="${escAttr(book.id)}" type="button" aria-label="Edit ${escAttr(book.title)}">•••</button>
          </div>
          <div class="library-book-copy-v16">
            <h3>${esc(book.title)}</h3>
            <p class="library-author-v16">${book.author ? esc(book.author) : "Author not added"}</p>
            ${seriesText ? `<p class="library-series-v16">✦ ${seriesText}</p>` : ""}
          </div>
          ${progressMarkup(book, progress)}
          <div class="library-book-meta-v16">
            <span><small>LAST READ</small><strong>${esc(last)}</strong></span>
            <span><small>ROLE</small><strong>${role.realm}</strong></span>
            ${reasonBits.length ? `<span><small>NOTE</small><strong>${esc(reasonBits.join(" · "))}</strong></span>` : ""}
          </div>
          <div class="library-book-actions-v16">
            ${book.status === "want" ? `<button class="primary-button" data-book-start="${escAttr(book.id)}" type="button">Start reading</button>` : ""}
            ${book.status === "reading" && !isAudio ? `
              <button class="primary-button" data-book-quick-log="${escAttr(book.id)}" data-book-log-type="pages" data-book-log-amount="10" type="button">+10 pages</button>
              <button class="secondary-button" data-book-quick-log="${escAttr(book.id)}" data-book-log-type="pages" data-book-log-amount="25" type="button">+25</button>
              <button class="text-button" data-book-open-log="${escAttr(book.id)}" type="button">Log exact →</button>` : ""}
            ${book.status === "reading" && isAudio ? `
              <button class="primary-button" data-book-quick-log="${escAttr(book.id)}" data-book-log-type="minutes" data-book-log-amount="15" type="button">+15 min</button>
              <button class="secondary-button" data-book-quick-log="${escAttr(book.id)}" data-book-log-type="minutes" data-book-log-amount="30" type="button">+30</button>
              <button class="text-button" data-book-open-log="${escAttr(book.id)}" type="button">Log exact →</button>` : ""}
            ${!["reading", "want"].includes(book.status) ? `<button class="secondary-button" data-book-edit="${escAttr(book.id)}" type="button">View / edit</button>` : ""}
          </div>
        </div>
      </article>`;
  }

  function progressMarkup(book, progress) {
    if (book.source === "audio") {
      const totalMinutes = bookLogs(book.id).reduce((sum, log) => sum + Number(log.minutes || 0), 0);
      return `<div class="library-progress-block-v16 simple"><div class="row-between"><span>Listening logged</span><strong>${formatDuration(totalMinutes)}</strong></div></div>`;
    }
    if (book.totalPages) {
      return `<div class="library-progress-block-v16">
        <div class="row-between"><span>Page ${formatNumber(book.currentPage)} / ${formatNumber(book.totalPages)}</span><strong>${progress}%</strong></div>
        <div class="progress large"><span style="width:${progress}%"></span></div>
      </div>`;
    }
    if (book.currentPage > 0) {
      return `<div class="library-progress-block-v16 simple"><div class="row-between"><span>Current page</span><strong>${formatNumber(book.currentPage)}</strong></div><small>Add total pages later and the percentage appears automatically.</small></div>`;
    }
    return `<div class="library-progress-block-v16 simple"><div class="row-between"><span>Progress</span><strong>Not set</strong></div><small>You can still log reading with one tap.</small></div>`;
  }

  function openBookDialog(id = "") {
    if (!els.dialog || !els.form) return;
    const book = id ? findBook(id) : null;
    els.form.reset();
    if (els.editId) els.editId.value = book?.id || "";
    if (els.dialogTitle) els.dialogTitle.textContent = book ? "Edit book" : "Add a book";
    if (els.deleteButton) els.deleteButton.classList.toggle("hidden", !book);
    if (els.title) els.title.value = book?.title || "";
    if (els.author) els.author.value = book?.author || "";
    if (els.source) els.source.value = book?.source || "physical";
    if (els.totalPages) els.totalPages.value = book?.totalPages || "";
    if (els.currentPage) els.currentPage.value = book?.currentPage || "";
    if (els.series) els.series.value = book?.series || "";
    if (els.seriesNumber) els.seriesNumber.value = book?.seriesNumber || "";
    if (els.continueSeries) els.continueSeries.checked = Boolean(book?.continueSeries);
    if (els.preferredGoal) els.preferredGoal.value = book?.preferredGoal || "auto";
    if (els.notes) els.notes.value = book?.notes || "";
    setRadio("bookStatus", book?.status || "want");
    setRadio("bookRole", book?.role || "fun");
    if (els.advanced) els.advanced.open = Boolean(book && (book.totalPages || book.currentPage || book.series || book.notes || book.preferredGoal !== "auto"));
    renderQuickPreview();
    els.dialog.showModal();
    window.setTimeout(() => els.title?.focus(), 20);
  }

  function closeBookDialog() {
    els.dialog?.close();
  }

  function saveBookFromDialog(event) {
    event.preventDefault();
    const title = String(els.title?.value || "").trim();
    if (!title) return;

    const now = Date.now();
    const id = String(els.editId?.value || "");
    const existing = id ? findBook(id) : null;
    const status = radioValue("bookStatus") || "want";
    const role = radioValue("bookRole") || "fun";
    const totalPages = safePositive(els.totalPages?.value);
    const currentPage = Math.min(Math.max(0, Number(els.currentPage?.value || 0)), totalPages || Number.MAX_SAFE_INTEGER);

    const next = {
      ...(existing || {}),
      id: existing?.id || makeId("book"),
      title,
      author: String(els.author?.value || "").trim(),
      status,
      role,
      source: SOURCES[els.source?.value] ? els.source.value : "physical",
      totalPages,
      currentPage,
      series: String(els.series?.value || "").trim(),
      seriesNumber: String(els.seriesNumber?.value || "").trim(),
      continueSeries: Boolean(els.continueSeries?.checked),
      preferredGoal: ["auto", "pages", "chapter", "minutes"].includes(els.preferredGoal?.value) ? els.preferredGoal.value : "auto",
      notes: String(els.notes?.value || "").trim(),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      startedAt: status === "reading" ? (existing?.startedAt || now) : existing?.startedAt || null,
      finishedAt: status === "finished" ? (existing?.finishedAt || now) : status !== "finished" ? null : existing?.finishedAt
    };

    const items = model().items;
    if (existing) {
      const index = items.findIndex(book => book.id === existing.id);
      if (index >= 0) items[index] = next;
    } else {
      items.unshift(next);
    }

    closeBookDialog();
    persist(existing ? "book-library-edit" : "book-library-create");
    showToast(existing ? "Book updated" : "Added to Library", title);
  }

  function deleteCurrentBook() {
    const id = String(els.editId?.value || "");
    const book = findBook(id);
    if (!book) return;
    if (!window.confirm(`Remove “${book.title}” from the Library? Reading logs for this book will also be removed.`)) return;
    const library = model();
    library.items = library.items.filter(item => item.id !== id);
    library.logs = library.logs.filter(log => log.bookId !== id);
    closeBookDialog();
    persist("book-library-delete");
    showToast("Removed from Library", book.title);
  }

  function setBookStatus(id, status) {
    const book = findBook(id);
    if (!book || !STATUSES[status]) return;
    const now = Date.now();
    book.status = status;
    book.updatedAt = now;
    if (status === "reading" && !book.startedAt) book.startedAt = now;
    if (status === "finished") book.finishedAt = now;
    persist("book-library-status");
    showToast(status === "reading" ? "Now reading" : "Book updated", book.title);
  }

  function renderQuickPreview() {
    if (!els.preview) return;
    const title = String(els.title?.value || "Untitled book").trim() || "Untitled book";
    const status = STATUSES[radioValue("bookStatus") || "want"] || STATUSES.want;
    const role = ROLES[radioValue("bookRole") || "fun"] || ROLES.fun;
    const source = SOURCES[els.source?.value] || SOURCES.physical;
    const pages = safePositive(els.totalPages?.value);
    const current = Math.max(0, Number(els.currentPage?.value || 0));
    const pct = pages ? Math.floor(Math.min(100, current / pages * 100)) : null;
    els.preview.innerHTML = `
      <div class="library-preview-mark-v16">${role.icon}</div>
      <div><small>${status.icon} ${status.label} · ${source.icon} ${source.label}</small><strong>${esc(title)}</strong><span>${role.label}${pct === null ? "" : ` · ${pct}%`}</span></div>`;
  }

  function openBulkDialog() {
    if (!els.bulkDialog || !els.bulkForm) return;
    els.bulkForm.reset();
    if (els.bulkStatus) els.bulkStatus.value = "want";
    if (els.bulkRole) els.bulkRole.value = "fun";
    if (els.bulkSource) els.bulkSource.value = "physical";
    renderBulkPreview();
    els.bulkDialog.showModal();
    window.setTimeout(() => els.bulkText?.focus(), 20);
  }

  function closeBulkDialog() {
    els.bulkDialog?.close();
  }

  function parseBulkLines() {
    const lines = String(els.bulkText?.value || "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    return lines.map(line => {
      const parts = line.split(/\t|\s+—\s+|\s+\|\s+/).map(v => v.trim()).filter(Boolean);
      return { title: parts[0] || "", author: parts.slice(1).join(" — ") };
    }).filter(item => item.title);
  }

  function renderBulkPreview() {
    if (!els.bulkPreview) return;
    const entries = parseBulkLines();
    const status = STATUSES[els.bulkStatus?.value] || STATUSES.want;
    const role = ROLES[els.bulkRole?.value] || ROLES.fun;
    const source = SOURCES[els.bulkSource?.value] || SOURCES.physical;
    els.bulkPreview.innerHTML = entries.length
      ? `<strong>${entries.length} book${entries.length === 1 ? "" : "s"} ready</strong><span>${status.icon} ${status.label} · ${role.icon} ${role.label} · ${source.icon} ${source.label}</span><small>Tip: “Title — Author”, “Title | Author”, or pasted tab-separated title/author all work.</small>`
      : `<strong>Paste one title per line.</strong><span>You can categorize the whole batch once instead of filling out a database row by row.</span>`;
  }

  function saveBulkBooks(event) {
    event.preventDefault();
    const entries = parseBulkLines();
    if (!entries.length) return;
    const library = model();
    const status = STATUSES[els.bulkStatus?.value] ? els.bulkStatus.value : "want";
    const role = ROLES[els.bulkRole?.value] ? els.bulkRole.value : "fun";
    const source = SOURCES[els.bulkSource?.value] ? els.bulkSource.value : "physical";
    const existingKeys = new Set(library.items.map(book => duplicateKey(book.title, book.author)));
    const now = Date.now();
    let added = 0;
    let skipped = 0;

    entries.forEach((entry, index) => {
      const key = duplicateKey(entry.title, entry.author);
      if (existingKeys.has(key)) { skipped += 1; return; }
      existingKeys.add(key);
      library.items.push({
        id: makeId("book"), title: entry.title, author: entry.author, status, role, source,
        totalPages: null, currentPage: 0, series: "", seriesNumber: "", continueSeries: false,
        preferredGoal: "auto", notes: "", createdAt: now + index, updatedAt: now + index,
        startedAt: status === "reading" ? now : null, finishedAt: status === "finished" ? now : null, lastReadAt: null
      });
      added += 1;
    });

    closeBulkDialog();
    persist("book-library-bulk-add");
    showToast(`${added} book${added === 1 ? "" : "s"} added`, skipped ? `${skipped} duplicate${skipped === 1 ? "" : "s"} skipped.` : "Categorized in one pass.");
  }

  function duplicateKey(title, author) {
    return `${String(title || "").trim().toLowerCase()}|${String(author || "").trim().toLowerCase()}`;
  }

  function openLogDialog(id, suggestion = null) {
    const book = findBook(id);
    if (!book || !els.logDialog || !els.logForm) return;
    logSuggestion = suggestion && typeof suggestion === "object" ? suggestion : null;
    els.logForm.reset();
    if (els.logId) els.logId.value = book.id;
    if (els.logTitle) els.logTitle.textContent = book.title;
    const audio = book.source === "audio";
    els.logPagesWrap?.classList.toggle("hidden", audio);
    els.logMinutesWrap?.classList.toggle("hidden", !audio);
    if (els.logPages) els.logPages.value = !audio && logSuggestion?.type === "pages" ? String(logSuggestion.amount || 10) : "";
    if (els.logMinutes) els.logMinutes.value = audio && logSuggestion?.type === "minutes" ? String(logSuggestion.amount || 20) : "";
    if (els.logChapter) els.logChapter.checked = logSuggestion?.type === "chapter";
    renderLogPreview();
    els.logDialog.showModal();
  }

  function closeLogDialog() {
    els.logDialog?.close();
    logSuggestion = null;
  }

  function renderLogPreview() {
    if (!els.logPreview) return;
    const book = findBook(els.logId?.value);
    if (!book) { els.logPreview.innerHTML = ""; return; }
    if (book.source === "audio") {
      const minutes = Math.max(0, Number(els.logMinutes?.value || 0));
      els.logPreview.innerHTML = `<span>🎧</span><div><small>THIS LOG</small><strong>${minutes ? formatDuration(minutes) : "One listening session"}</strong><p>Last touched updates automatically. No extra database editing.</p></div>`;
      return;
    }
    const pages = Math.max(0, Number(els.logPages?.value || 0));
    const after = book.currentPage + pages;
    const capped = book.totalPages ? Math.min(after, book.totalPages) : after;
    const pct = book.totalPages ? Math.floor(capped / book.totalPages * 100) : null;
    const chapter = Boolean(els.logChapter?.checked);
    els.logPreview.innerHTML = `<span>📖</span><div><small>AFTER THIS LOG</small><strong>${pages ? `Page ${formatNumber(capped)}${pct === null ? "" : ` · ${pct}%`}` : chapter ? "Chapter logged" : "Reading session logged"}</strong><p>${book.totalPages && capped >= book.totalPages ? "This reaches the end — the book will be marked Finished automatically." : "Your current page and last-read date update automatically."}</p></div>`;
  }

  function saveLog(event) {
    event.preventDefault();
    const book = findBook(els.logId?.value);
    if (!book) return;
    const pages = book.source === "audio" ? 0 : Math.max(0, Number(els.logPages?.value || 0));
    const minutes = book.source === "audio" ? Math.max(0, Number(els.logMinutes?.value || 0)) : 0;
    const chapter = Boolean(els.logChapter?.checked);
    logBook(book, { pages, minutes, chapter, source: "dialog" });
    closeLogDialog();
  }

  function quickLog(id, type, amount) {
    const book = findBook(id);
    if (!book) return;
    logBook(book, type === "minutes" ? { minutes: amount, pages: 0, chapter: false, source: "quick" } : { pages: amount, minutes: 0, chapter: false, source: "quick" });
  }

  function logBook(book, { pages = 0, minutes = 0, chapter = false, source = "manual" } = {}) {
    const now = Date.now();
    if (book.status !== "reading") {
      book.status = "reading";
      book.startedAt ||= now;
    }
    if (pages > 0) {
      book.currentPage = Math.max(0, Number(book.currentPage || 0) + Number(pages));
      if (book.totalPages) book.currentPage = Math.min(book.currentPage, book.totalPages);
    }
    book.lastReadAt = now;
    book.updatedAt = now;
    book.sessions = Number(book.sessions || 0) + 1;
    if (book.totalPages && book.currentPage >= book.totalPages) {
      book.status = "finished";
      book.finishedAt = now;
    }
    model().logs.push({
      id: makeId("read"), bookId: book.id, at: now, date: dateKey(new Date(now)),
      pages: Number(pages || 0), minutes: Number(minutes || 0), chapter: Boolean(chapter), source
    });
    persist("book-library-log");
    const detail = book.status === "finished"
      ? "Finished ✨"
      : pages > 0
        ? `Now on page ${formatNumber(book.currentPage)}${book.totalPages ? ` / ${formatNumber(book.totalPages)}` : ""}`
        : minutes > 0 ? `${formatDuration(minutes)} logged` : "Reading session logged";
    showToast("Reading logged", `${book.title} · ${detail}`);
  }

  function bookProgress(book) {
    if (!book.totalPages) return null;
    return Math.floor(clamp(Number(book.currentPage || 0) / book.totalPages * 100, 0, 100));
  }

  function bookLogs(id) {
    return model().logs.filter(log => log.bookId === id);
  }

  function findBook(id) {
    return model().items.find(book => book.id === id) || null;
  }

  function exposeApi() {
    window.LifeRPGLibrary = {
      openLog: openLogDialog,
      openBook: openBookDialog,
      getItems: () => [...model().items],
      getLogs: id => bookLogs(id),
      findBook,
      roleMeta: role => ROLES[role] || ROLES.fun,
      statusMeta: status => STATUSES[status] || STATUSES.want
    };
  }

  function showToast(title, detail) {
    if (!els.toast) return;
    if (toastTimer) window.clearTimeout(toastTimer);
    if (els.toastTitle) els.toastTitle.textContent = title;
    if (els.toastDetail) els.toastDetail.textContent = detail;
    els.toast.classList.remove("hidden");
    requestAnimationFrame(() => els.toast.classList.add("show"));
    toastTimer = window.setTimeout(() => {
      els.toast.classList.remove("show");
      window.setTimeout(() => els.toast.classList.add("hidden"), 240);
    }, 3300);
  }

  function bookSpineMark(book) {
    if (book.role === "japanese") return "あ";
    if (book.role === "knowledge") return "K";
    if (book.role === "growth") return "✦";
    if (book.role === "work") return "W";
    return "❀";
  }

  function humanAgo(value) {
    const days = daysSinceTimestamp(value);
    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 35) {
      const weeks = Math.floor(days / 7);
      return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
    }
    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }

  function daysSinceTimestamp(value) {
    if (!value) return 0;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((today - date) / 86400000));
  }

  function formatDuration(minutes) {
    const n = Math.max(0, Math.round(Number(minutes || 0)));
    if (n < 60) return `${n} min`;
    const h = Math.floor(n / 60);
    const m = n % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  function safePositive(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function setRadio(name, value) {
    const input = els.form?.querySelector(`input[name="${name}"][value="${cssEscape(value)}"]`);
    if (input) input.checked = true;
  }

  function radioValue(name) {
    return els.form?.querySelector(`input[name="${name}"]:checked`)?.value || "";
  }

  function makeId(prefix) {
    if (window.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function dateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function formatNumber(value) {
    const n = Number(value || 0);
    return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value || 0)));
  }

  function byId(id) { return document.getElementById(id); }
  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  }
  function escAttr(value) { return esc(value); }
  function cssEscape(value) {
    return window.CSS?.escape ? CSS.escape(String(value ?? "")) : String(value ?? "").replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }
})();
