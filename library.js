(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState) {
    console.error("Life RPG Library could not initialize because LifeRPGApp is unavailable.");
    return;
  }

  const SCHEMA = 4;
  const LOOKUP_CACHE_KEY = "life-rpg-book-lookup-cache-v2";
  const LOOKUP_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
  const LOOKUP_LIMIT = 6;
  const SHADOW_KEY = "life-rpg-book-library-shadow-v1";
  const MAX_LOGS = 1200;

  const STATUSES = {
    reading: { label: "Reading", icon: "📖" },
    want: { label: "Want to Read", icon: "✦" },
    owned: { label: "Owned / Unread", icon: "⌂" },
    paused: { label: "Paused", icon: "◷" },
    finished: { label: "Finished", icon: "✓" },
    dnf: { label: "DNF", icon: "×" }
  };

  const KINDS = {
    book: { label: "Book", icon: "📚" },
    fanfiction: { label: "Fanfiction", icon: "✍️" },
    manga: { label: "Manga", icon: "🌸" },
    manhwa: { label: "Manhwa", icon: "💜" },
    webtoon: { label: "Webtoon", icon: "📱" }
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
    online: { label: "Read online", icon: "↗" },
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
    sort: byId("librarySort"),
    viewToggle: byId("libraryViewToggle"),
    mobileAdd: byId("libraryMobileAdd"),
    mobileBulk: byId("libraryMobileBulk"),
    roleFilters: byId("libraryRoleFilters"),
    kindFilters: byId("libraryKindFilters"),
    readingSummary: byId("librarySummaryReading"),
    wantSummary: byId("librarySummaryWant"),
    finishedSummary: byId("librarySummaryFinished"),
    ao3Bookmarklet: byId("libraryAo3Bookmarklet"),
    ao3Copy: byId("libraryAo3Copy"),
    ao3InstallStatus: byId("libraryAo3InstallStatus"),

    dialog: byId("bookDialog"),
    form: byId("bookForm"),
    editId: byId("bookEditId"),
    dialogTitle: byId("bookDialogTitle"),
    close: byId("bookDialogClose"),
    cancel: byId("cancelBookButton"),
    deleteButton: byId("deleteBookButton"),
    saveAnother: byId("saveBookAnotherButton"),
    title: byId("bookTitle"),
    author: byId("bookAuthor"),
    kind: byId("bookKind"),
    kindDetails: byId("bookKindDetails"),
    bookLookupPanel: byId("bookLookupPanel"),
    bookPageDetails: byId("bookPageDetails"),
    externalUrl: byId("bookExternalUrl"),
    fandom: byId("bookFandom"),
    publicationStatus: byId("bookPublicationStatus"),
    currentChapter: byId("bookCurrentChapter"),
    totalChapters: byId("bookTotalChapters"),
    chapterDetails: byId("bookChapterDetails"),
    volumeDetails: byId("bookVolumeDetails"),
    currentVolume: byId("bookCurrentVolume"),
    totalVolumes: byId("bookTotalVolumes"),
    progressUnit: byId("bookProgressUnit"),
    epubFile: byId("bookEpubFile"),
    epubStatus: byId("bookEpubStatus"),
    source: byId("bookSource"),
    totalPages: byId("bookTotalPages"),
    currentPage: byId("bookCurrentPage"),
    series: byId("bookSeries"),
    seriesNumber: byId("bookSeriesNumber"),
    seriesTotal: byId("bookSeriesTotal"),
    seriesDatalist: byId("bookSeriesDatalist"),
    seriesSuggestions: byId("bookSeriesSuggestions"),
    continueSeries: byId("bookContinueSeries"),
    preferredGoal: byId("bookPreferredGoal"),
    notes: byId("bookNotes"),
    advanced: byId("bookAdvancedDetails"),
    preview: byId("bookQuickPreview"),
    lookupPanel: byId("bookLookupPanel"),
    lookupHeading: byId("bookLookupHeading"), lookupProvider: byId("bookLookupProvider"), lookupFootnote: byId("bookLookupFootnote"),
    lookupQuery: byId("bookLookupQuery"),
    lookupSearch: byId("bookLookupSearch"),
    lookupStatus: byId("bookLookupStatus"),
    lookupSelection: byId("bookLookupSelection"),
    lookupResults: byId("bookLookupResults"),

    bulkDialog: byId("bookBulkDialog"),
    bulkForm: byId("bookBulkForm"),
    bulkClose: byId("bookBulkClose"),
    bulkCancel: byId("bookBulkCancel"),
    bulkText: byId("bookBulkText"),
    bulkStatus: byId("bookBulkStatus"),
    bulkRole: byId("bookBulkRole"),
    bulkSource: byId("bookBulkSource"),
    bulkPreview: byId("bookBulkPreview"),
    rewardHint: byId("bookRewardHint"),

    logDialog: byId("bookLogDialog"),
    logForm: byId("bookLogForm"),
    logId: byId("bookLogId"),
    logTitle: byId("bookLogTitle"),
    logPicker: byId("bookLogPicker"),
    logChainStatus: byId("bookLogChainStatus"),
    logClose: byId("bookLogClose"),
    logCancel: byId("bookLogCancel"),
    logPosition: byId("bookLogPosition"),
    logPagesWrap: byId("bookLogPagesWrap"),
    logPages: byId("bookLogPages"),
    logEndPage: byId("bookLogEndPage"),
    logMinutesWrap: byId("bookLogMinutesWrap"),
    logMinutes: byId("bookLogMinutes"),
    logChapter: byId("bookLogChapter"),
    logChapterCheck: byId("bookLogChapterCheck"),
    logChapterDetails: byId("bookLogChapterDetails"),
    logChapterCount: byId("bookLogChapterCount"),
    logChapterEnd: byId("bookLogChapterEnd"),
    logVolumeDetails: byId("bookLogVolumeDetails"),
    logVolumeCount: byId("bookLogVolumeCount"),
    logVolumeEnd: byId("bookLogVolumeEnd"),
    logPreview: byId("bookLogPreview"),
    finishButton: byId("bookFinishButton"),
    finishHint: byId("bookFinishHint"),

    toast: byId("libraryToast"),
    toastTitle: byId("libraryToastTitle"),
    toastDetail: byId("libraryToastDetail")
  };

  let initialized = false;
  let selectedRole = "all";
  let selectedKind = "all";
  let selectedSort = safeStorageGet("life-rpg-library-sort-v291") || "smart";
  let viewMode = safeStorageGet("life-rpg-library-view-v291") || "grid";
  let toastTimer = null;
  let logSuggestion = null;
  let logEntryMode = "pages";
  let lookupResults = [];
  let selectedLookup = null;
  let lookupCleared = false;
  let lookupController = null;
  let lookupResultsCollapsed = false;

  init();

  function init() {
    bindEvents();
    const changed = ensureState();
    initialized = true;
    if (changed) persist("book-library-init", { render: false });
    render();
    configureAo3Bookmarklet();
    consumeAo3Import();
    consumeMangagoProgress();
    exposeApi();
  }

  function bindEvents() {
    window.addEventListener("hashchange", consumeAo3Import);
    window.addEventListener("hashchange", consumeMangagoProgress);
    els.ao3Copy?.addEventListener("click", async () => {
      const code = makeAo3BookmarkletUrl();
      try {
        await navigator.clipboard.writeText(code);
        if (els.ao3InstallStatus) els.ao3InstallStatus.textContent = "Copied! Create a Firefox bookmark and paste the code into its URL field.";
      } catch {
        window.prompt("Copy this into the URL field of a new Firefox bookmark:", code);
      }
    });
    els.ao3Bookmarklet?.addEventListener("click", event => {
      event.preventDefault();
      if (els.ao3InstallStatus) els.ao3InstallStatus.textContent = "Drag the ✦ link into your Firefox bookmarks toolbar, or use Copy bookmarklet.";
    });
    [els.add, els.addSecondary, els.emptyAdd, els.mobileAdd].forEach(button => button?.addEventListener("click", () => openBookDialog()));
    [els.bulk, els.mobileBulk].forEach(button => button?.addEventListener("click", openBulkDialog));
    els.close?.addEventListener("click", closeBookDialog);
    els.cancel?.addEventListener("click", closeBookDialog);
    els.form?.addEventListener("submit", saveBookFromDialog);
    els.deleteButton?.addEventListener("click", deleteCurrentBook);
    els.lookupSearch?.addEventListener("click", runBookLookup);
    els.kind?.addEventListener("change", () => {
      const kind = els.kind.value;
      if (kind !== "book" && els.source?.value === "physical") els.source.value = "online";
      if (kind === "book" && els.source?.value === "online") els.source.value = "physical";
      if (kind !== "book" && els.preferredGoal) els.preferredGoal.value = "chapter";
      updateKindFields();
      renderQuickPreview();
    });
    els.progressUnit?.addEventListener("change", () => { updateKindFields(); renderQuickPreview(); });
    els.epubFile?.addEventListener("change", importEpubSelection);
    els.lookupQuery?.addEventListener("keydown", event => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      runBookLookup();
    });

    [els.title, els.author, els.source, els.totalPages, els.currentPage, els.series, els.seriesNumber, els.seriesTotal, els.preferredGoal,
      els.externalUrl, els.fandom, els.publicationStatus, els.currentChapter, els.totalChapters, els.currentVolume, els.totalVolumes].forEach(input => {
      input?.addEventListener("input", renderQuickPreview);
      input?.addEventListener("change", renderQuickPreview);
    });
    [els.title, els.author, els.series].forEach(input => {
      input?.addEventListener("input", renderSeriesSuggestions);
      input?.addEventListener("change", renderSeriesSuggestions);
    });
    els.continueSeries?.addEventListener("change", renderQuickPreview);
    els.form?.querySelectorAll('input[name="bookStatus"], input[name="bookRole"]').forEach(input => input.addEventListener("change", renderQuickPreview));

    els.search?.addEventListener("input", renderBoard);
    els.status?.addEventListener("change", renderBoard);
    els.sort?.addEventListener("change", () => { selectedSort = els.sort.value || "smart"; safeStorageSet("life-rpg-library-sort-v291", selectedSort); renderBoard(); });
    els.viewToggle?.addEventListener("click", event => {
      const button = event.target.closest?.("[data-library-view]");
      if (!button) return;
      viewMode = button.dataset.libraryView === "list" ? "list" : "grid";
      safeStorageSet("life-rpg-library-view-v291", viewMode);
      syncViewControls();
      renderBoard();
    });
    els.roleFilters?.addEventListener("click", event => {
      const button = event.target.closest?.("[data-library-role]");
      if (!button) return;
      selectedRole = button.dataset.libraryRole || "all";
      els.roleFilters.querySelectorAll("[data-library-role]").forEach(node => node.classList.toggle("active", node === button));
      renderBoard();
    });
    els.kindFilters?.addEventListener("click", event => {
      const button = event.target.closest?.("[data-library-kind]");
      if (!button) return;
      selectedKind = KINDS[button.dataset.libraryKind] ? button.dataset.libraryKind : "all";
      els.kindFilters.querySelectorAll("[data-library-kind]").forEach(node => node.classList.toggle("active", node === button));
      renderBoard();
    });

    document.addEventListener("click", event => {
      const lookupUse = event.target.closest?.("[data-book-lookup-use]");
      if (lookupUse) {
        applyLookupResult(Number(lookupUse.dataset.bookLookupUse || -1));
        return;
      }

      const lookupClear = event.target.closest?.("[data-book-lookup-clear]");
      if (lookupClear) {
        clearLookupSelection();
        return;
      }

      const lookupChange = event.target.closest?.("[data-book-lookup-change]");
      if (lookupChange) {
        lookupResultsCollapsed = false;
        renderLookupResults();
        renderLookupStatus(`${lookupResults.length} match${lookupResults.length === 1 ? "" : "es"} available — choose another match.`, "note");
        return;
      }

      const seriesUse = event.target.closest?.("[data-book-series-use]");
      if (seriesUse) {
        applySeriesSuggestion(decodeURIComponent(seriesUse.dataset.bookSeriesUse || ""));
        return;
      }

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
        return;
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
    els.logPicker?.addEventListener("change", () => {
      const book = findBook(els.logPicker.value);
      if (book) configureLogForm(book);
    });
    els.logPages?.addEventListener("input", () => {
      logEntryMode = "pages";
      if (els.logEndPage) els.logEndPage.value = "";
      renderLogPreview();
    });
    els.logEndPage?.addEventListener("input", () => {
      logEntryMode = "position";
      if (els.logPages) els.logPages.value = "";
      renderLogPreview();
    });
    [els.logMinutes, els.logChapter].forEach(input => input?.addEventListener("input", renderLogPreview));
    [els.logChapterCount, els.logChapterEnd, els.logVolumeCount, els.logVolumeEnd].forEach(input => input?.addEventListener("input", event => {
      if (event.target === els.logChapterCount && els.logChapterEnd) els.logChapterEnd.value = "";
      if (event.target === els.logChapterEnd && els.logChapterCount) els.logChapterCount.value = "";
      if (event.target === els.logVolumeCount && els.logVolumeEnd) els.logVolumeEnd.value = "";
      if (event.target === els.logVolumeEnd && els.logVolumeCount) els.logVolumeCount.value = "";
      renderLogPreview();
    }));
    els.finishButton?.addEventListener("click", finishCurrentBook);
    document.addEventListener("click", event => {
      const nudge = event.target.closest?.("[data-book-log-nudge]");
      if (!nudge) return;
      const field = nudge.dataset.bookLogField;
      const amount = Number(nudge.dataset.bookLogNudge || 0);
      const input = field === "minutes" ? els.logMinutes : els.logPages;
      if (!input) return;
      if (field === "pages") {
        logEntryMode = "pages";
        if (els.logEndPage) els.logEndPage.value = "";
      }
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
      if (!KINDS[book.kind]) { book.kind = "book"; changed = true; }
      if (typeof book.externalUrl !== "string") { book.externalUrl = ""; changed = true; }
      if (typeof book.fandom !== "string") { book.fandom = ""; changed = true; }
      if (!["unknown", "ongoing", "complete", "hiatus"].includes(book.publicationStatus)) { book.publicationStatus = "unknown"; changed = true; }
      if (!["chapters", "volumes"].includes(book.progressUnit)) { book.progressUnit = "chapters"; changed = true; }
      for (const field of ["currentChapter", "totalChapters", "currentVolume", "totalVolumes"]) {
        const value = field.startsWith("total") ? safePositive(book[field]) : Math.max(0, Math.floor(Number(book[field] || 0)) || 0);
        if (book[field] !== value) { book[field] = value; changed = true; }
      }
      if (book.totalChapters && book.currentChapter > book.totalChapters) { book.currentChapter = book.totalChapters; changed = true; }
      if (book.totalVolumes && book.currentVolume > book.totalVolumes) { book.currentVolume = book.totalVolumes; changed = true; }
      if (!book.preferredGoal || !["auto", "pages", "chapter", "minutes"].includes(book.preferredGoal)) { book.preferredGoal = "auto"; changed = true; }
      if (typeof book.coverUrl !== "string") { book.coverUrl = ""; changed = true; }
      if (typeof book.isbn !== "string") { book.isbn = ""; changed = true; }
      if (typeof book.publisher !== "string") { book.publisher = ""; changed = true; }
      if (typeof book.language !== "string") { book.language = ""; changed = true; }
      if (typeof book.catalogProvider !== "string") { book.catalogProvider = ""; changed = true; }
      if (typeof book.catalogKey !== "string") { book.catalogKey = ""; changed = true; }
      if (!Number.isFinite(Number(book.publishYear || 0))) { book.publishYear = null; changed = true; }
      book.totalPages = safePositive(book.totalPages);
      book.currentPage = Math.max(0, Number(book.currentPage || 0));
      if (book.totalPages) book.currentPage = Math.min(book.currentPage, book.totalPages);
      if (book.kind === "book" && book.totalPages && book.currentPage >= book.totalPages && book.status === "reading") {
        book.status = "finished";
        book.finishedAt ||= book.updatedAt || Date.now();
        changed = true;
      }
      if (!book.createdAt) { book.createdAt = Date.now(); changed = true; }
      if (!book.updatedAt) { book.updatedAt = book.createdAt; changed = true; }
      if (book.status === "reading" && !book.startedAt) { book.startedAt = book.updatedAt; changed = true; }
      if (book.status === "finished" && !book.finishedAt) { book.finishedAt = book.updatedAt; changed = true; }
      if (typeof book.continueSeries !== "boolean") { book.continueSeries = false; changed = true; }
      const normalizedSeriesTotal = safePositive(book.seriesTotal);
      if (book.seriesTotal !== normalizedSeriesTotal) { book.seriesTotal = normalizedSeriesTotal; changed = true; }
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

  function writeShadow(_value) {
    // V0.31.4ag: the canonical Life RPG save is now quota-safe. Older releases
    // duplicated this entire subsystem into localStorage, which could exhaust
    // Safari's small per-origin quota. Keep readShadow() for one-way recovery
    // from an old install, but retire the duplicate after the canonical save exists.
    try { localStorage.removeItem(SHADOW_KEY); } catch { /* best-effort cleanup */ }
  }

  function dispatchChange(source) {
    try {
      window.dispatchEvent(new CustomEvent("life-rpg:library-change", { detail: { source } }));
    } catch { /* no-op */ }
  }

  function render() {
    if (els.sort && els.sort.value !== selectedSort) els.sort.value = selectedSort;
    syncViewControls();
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
    if (selectedKind !== "all") items = items.filter(book => (book.kind || "book") === selectedKind);
    if (query) {
      items = items.filter(book => [book.title, book.author, book.series, book.fandom, KINDS[book.kind || "book"]?.label, ROLES[book.role]?.label, SOURCES[book.source]?.label]
        .some(value => String(value || "").toLowerCase().includes(query)));
    }

    items.sort(compareBooks);
    els.board.classList.toggle("collection-list-mode-v291", viewMode === "list");
    els.board.classList.toggle("collection-grid-mode-v291", viewMode !== "list");
    els.board.innerHTML = items.map(bookCardMarkup).join("");
    els.empty.classList.toggle("hidden", items.length > 0);
    if (!items.length) {
      const hasAny = model().items.length > 0;
      els.empty.querySelector("h3").textContent = hasAny ? "Nothing matches this shelf." : "Your Library is empty.";
      els.empty.querySelector("p").textContent = hasAny
        ? "Try another status, role, or search. The books are still here."
        : "Add a book, fanfiction, manga or manhwa in a few taps. Details can wait.";
    }
  }

  function compareBooks(a, b) {
    if (selectedSort === "title") return String(a.title || "").localeCompare(String(b.title || ""));
    if (selectedSort === "updated") return Number(b.updatedAt || 0) - Number(a.updatedAt || 0);
    if (selectedSort === "progress") return Number(bookProgress(b) || 0) - Number(bookProgress(a) || 0) || String(a.title || "").localeCompare(String(b.title || ""));
    if (selectedSort === "series") {
      const series = String(a.series || "~").localeCompare(String(b.series || "~"));
      if (series) return series;
      return Number(a.seriesNumber || 9999) - Number(b.seriesNumber || 9999) || String(a.title || "").localeCompare(String(b.title || ""));
    }
    const statusOrder = { reading: 0, owned: 1, want: 2, paused: 3, finished: 4, dnf: 5 };
    const statusDiff = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
    if (statusDiff) return statusDiff;
    if (a.status === "reading") {
      const aTime = Number(a.lastReadAt || a.startedAt || a.createdAt || 0);
      const bTime = Number(b.lastReadAt || b.startedAt || b.createdAt || 0);
      return aTime - bTime;
    }
    return Number(b.updatedAt || 0) - Number(a.updatedAt || 0);
  }

  function bookCardMarkup(book) {
    const status = STATUSES[book.status] || STATUSES.want;
    const role = ROLES[book.role] || ROLES.fun;
    const source = SOURCES[book.source] || SOURCES.other;
    const kind = KINDS[book.kind || "book"] || KINDS.book;
    const serial = isSerial(book);
    const unit = serial ? progressUnitFor(book) : "";
    const position = serial ? Number(unit === "volumes" ? book.currentVolume : book.currentChapter) || 0 : 0;
    const available = serial ? Number(unit === "volumes" ? book.totalVolumes : book.totalChapters) || 0 : 0;
    const caughtUp = Boolean(serial && available && position >= available);
    const readingLink = safeExternalUrl(book.externalUrl);
    const progress = bookProgress(book);
    const isAudio = book.source === "audio";
    const last = book.lastReadAt ? humanAgo(book.lastReadAt) : book.status === "reading" ? "not logged yet" : "—";
    const seriesText = book.series ? `${esc(book.series)}${book.seriesNumber ? ` · #${esc(book.seriesNumber)}` : ""}` : "";
    const reasonBits = [];
    if (book.continueSeries && book.series) reasonBits.push("continue series");
    if (book.status === "reading" && daysSinceTimestamp(book.lastReadAt || book.startedAt || book.createdAt) >= 14) reasonBits.push("waiting for you");
    const cover = safeCoverUrl(book.coverUrl);
    const catalogBits = [book.publishYear, book.publisher].filter(Boolean).slice(0, 2).join(" · ");
    const seriesInfo = seriesProgressText(book);

    return `
      <article class="library-book-card-v16 status-${escAttr(book.status)}${cover ? " has-cover-v161" : ""}">
        ${cover ? `<div class="library-book-cover-v161"><img src="${escAttr(cover)}" alt="Cover of ${escAttr(book.title)}" loading="lazy" /><span aria-hidden="true">${bookSpineMark(book)}</span></div>` : `<div class="library-book-spine-v16" aria-hidden="true"><span>${bookSpineMark(book)}</span></div>`}
        <div class="library-book-body-v16">
          <div class="library-book-top-v16">
            <div class="library-book-tags-v16">
              <span class="library-status-pill-v16">${status.icon} ${status.label}</span>
              <span>${kind.icon} ${kind.label}</span>
              <span>${role.icon} ${role.label}</span>
              <span>${source.icon} ${source.label}</span>
            </div>
            <button class="library-edit-button-v16" data-book-edit="${escAttr(book.id)}" type="button" aria-label="Edit ${escAttr(book.title)}">•••</button>
          </div>
          <div class="library-book-copy-v16">
            <h3>${esc(book.title)}</h3>
            <p class="library-author-v16">${book.author ? esc(book.author) : "Author not added"}</p>
            ${seriesText ? `<p class="library-series-v16">✦ ${seriesText}</p>` : ""}
            ${book.fandom ? `<p class="library-series-v16">♡ ${esc(book.fandom)}</p>` : ""}
            ${seriesInfo ? `<p class="library-series-progress-v291">${esc(seriesInfo)}</p>` : ""}
            ${catalogBits ? `<p class="library-catalog-line-v161">${esc(catalogBits)}</p>` : ""}
          </div>
          ${progressMarkup(book, progress)}
          <div class="library-book-meta-v16">
            <span><small>LAST READ</small><strong>${esc(last)}</strong></span>
            <span><small>ROLE</small><strong>${role.realm}</strong></span>
            ${reasonBits.length ? `<span><small>NOTE</small><strong>${esc(reasonBits.join(" · "))}</strong></span>` : ""}
          </div>
          <div class="library-book-actions-v16">
            ${["want", "owned"].includes(book.status) ? `<button class="primary-button" data-book-start="${escAttr(book.id)}" type="button">Start reading</button>` : ""}
            ${book.status === "reading" && serial && !caughtUp ? `
              <button class="primary-button" data-book-quick-log="${escAttr(book.id)}" data-book-log-type="${unit === "volumes" ? "volume" : "chapter"}" data-book-log-amount="1" type="button">+1 ${unit === "volumes" ? "volume" : "chapter"}</button>
              <button class="text-button" data-book-open-log="${escAttr(book.id)}" type="button">Log exact →</button>` : ""}
            ${book.status === "reading" && caughtUp ? `<span class="muted">✓ ${book.publicationStatus === "complete" ? "Final chapter/volume reached · mark Finished in Edit" : `Caught up with available ${unit}`}</span>` : ""}
            ${book.status === "reading" && !serial && !isAudio ? `
              <button class="primary-button" data-book-quick-log="${escAttr(book.id)}" data-book-log-type="pages" data-book-log-amount="10" type="button">+10 pages</button>
              <button class="secondary-button" data-book-quick-log="${escAttr(book.id)}" data-book-log-type="pages" data-book-log-amount="25" type="button">+25</button>
              <button class="text-button" data-book-open-log="${escAttr(book.id)}" type="button">Log exact →</button>` : ""}
            ${book.status === "reading" && !serial && isAudio ? `
              <button class="primary-button" data-book-quick-log="${escAttr(book.id)}" data-book-log-type="minutes" data-book-log-amount="15" type="button">+15 min</button>
              <button class="secondary-button" data-book-quick-log="${escAttr(book.id)}" data-book-log-type="minutes" data-book-log-amount="30" type="button">+30</button>
              <button class="text-button" data-book-open-log="${escAttr(book.id)}" type="button">Log exact →</button>` : ""}
            ${!["reading", "want"].includes(book.status) ? `<button class="secondary-button" data-book-edit="${escAttr(book.id)}" type="button">View / edit</button>` : ""}
            ${readingLink ? `<a class="secondary-button" href="${escAttr(readingLink)}" target="_blank" rel="noopener noreferrer">↗ Continue reading</a>` : ""}
          </div>
        </div>
      </article>`;
  }

  function progressMarkup(book, progress) {
    if (isSerial(book)) {
      const unit = progressUnitFor(book);
      const label = unit === "volumes" ? "Volumes" : "Chapters";
      const current = Number(unit === "volumes" ? book.currentVolume : book.currentChapter) || 0;
      const available = Number(unit === "volumes" ? book.totalVolumes : book.totalChapters) || 0;
      const ongoing = book.publicationStatus !== "complete";
      const text = available ? `${label}: ${current} / ${available} ${ongoing ? "available" : "total"}` : `${label} read: ${current} · total unknown`;
      const ratio = available ? Math.floor(clamp(current / available * 100, 0, 100)) : null;
      const note = ongoing ? (available && current >= available ? "Caught up for now · not marked Finished" : "Ongoing or completion unknown") : "Completed release";
      return `<div class="library-progress-block-v16 ${ratio === null ? "simple" : ""}">
        <div class="row-between"><span>${esc(text)}</span><strong>${ratio === null ? "" : `${ratio}%`}</strong></div>
        ${ratio === null ? "" : `<div class="progress large"><span style="width:${ratio}%"></span></div>`}
        <small>${esc(note)}</small>
      </div>`;
    }
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

  function isSerial(book) { return (book?.kind || "book") !== "book"; }

  function progressUnitFor(book) {
    return book?.kind === "fanfiction" ? "chapters" : book?.progressUnit === "volumes" ? "volumes" : "chapters";
  }

  function safeExternalUrl(value) {
    try {
      const url = new URL(String(value || "").trim());
      return url.protocol === "https:" && url.username === "" && url.password === "" ? url.href.slice(0, 2000) : "";
    } catch { return ""; }
  }

  // Runs as a user-installed bookmark on the AO3 page. No network fetch, accounts,
  // story body, or third-party service is involved: only visible metadata is read.
  // Keep this function self-contained; its source is serialized into the bookmark URL.
  function captureAo3Bookmarklet(destination) {
    const host = window.location.hostname.toLowerCase();
    const workId = window.location.pathname.match(/^\/works\/(\d+)(?:\/|$)/)?.[1];
    if (!["archiveofourown.org", "www.archiveofourown.org", "secure.ao3.org"].includes(host) || !workId) {
      window.alert("Open an AO3 fanfiction first, then use Add to Life RPG.");
      return;
    }
    const clean = value => String(value || "").replace(/\s+/g, " ").trim();
    const pick = selectors => {
      for (const selector of selectors) {
        const value = clean(document.querySelector(selector)?.textContent);
        if (value) return value;
      }
      return "";
    };
    const textList = selectors => [...new Set(Array.from(document.querySelectorAll(selectors))
      .map(node => clean(node.textContent)).filter(Boolean))];
    const title = pick(["#workskin .preface h2.title", ".work .preface h2.title", "h2.title.heading", "h2.title"]).slice(0, 180);
    if (!title) {
      window.alert("AO3 work title is not visible. Open the main work page and try again.");
      return;
    }
    const author = textList("h3.byline a[rel='author'], .work .byline a[rel='author'], .byline a[rel='author']");
    const fandom = textList("dd.fandom.tags a.tag, dd.fandom a.tag, h5.fandom.heading a.tag, h5.fandom.tags a.tag, h5.fandom a");
    let chapterText = pick(["dl.work.meta.group dd.stats dd.chapters", "dd.stats dd.chapters", "dd.chapters"]);
    if (!chapterText) chapterText = clean(document.querySelector("dt.chapters")?.nextElementSibling?.textContent);
    const chapterMatch = chapterText.match(/([\d,]+)\s*\/\s*([\d,]+|\?)/);
    const chapters = chapterMatch ? Number(chapterMatch[1].replace(/,/g, "")) : 0;
    const expected = chapterMatch && chapterMatch[2] !== "?" ? Number(chapterMatch[2].replace(/,/g, "")) : null;
    const complete = expected !== null && chapters > 0 && expected === chapters;
    const payload = {
      version: 1,
      source: "ao3",
      externalUrl: `https://archiveofourown.org/works/${workId}`,
      title,
      author: author.join(", ").slice(0, 120),
      fandom: fandom.join(" · ").slice(0, 160),
      totalChapters: chapters,
      publicationStatus: chapterMatch ? (complete ? "complete" : "ongoing") : "unknown"
    };
    if (!payload.author || !payload.fandom || !payload.totalChapters) {
      window.alert("This AO3 chapter page has incomplete work metadata. Opening the main work page; please click Add to Life RPG there.");
      window.location.assign("https://archiveofourown.org/works/" + workId);
      return;
    }
    const target = `${destination}#lr-ao3-import=${encodeURIComponent(JSON.stringify(payload))}`;
    const tab = window.open(target, "_blank");
    if (tab) { try { tab.opener = null; } catch { /* cross-window protection */ } }
    else window.location.assign(target);
  }

  function makeAo3BookmarkletUrl() {
    // Use the current installation's root (also works for local smoke tests).
    const destination = `${window.location.origin}${window.location.pathname}`;
    return `javascript:void((${captureAo3Bookmarklet.toString()})(${JSON.stringify(destination)}))`;
  }

  function configureAo3Bookmarklet() {
    if (els.ao3Bookmarklet) els.ao3Bookmarklet.href = makeAo3BookmarkletUrl();
  }

  function ao3WorkId(url) {
    const normalized = safeExternalUrl(url);
    if (!normalized) return "";
    const parsed = new URL(normalized);
    if (!["archiveofourown.org", "www.archiveofourown.org", "secure.ao3.org"].includes(parsed.hostname.toLowerCase())) return "";
    return parsed.pathname.match(/^\/works\/(\d+)(?:\/|$)/)?.[1] || "";
  }

  function parseAo3ImportHash(hash) {
    const prefix = "#lr-ao3-import=";
    if (!String(hash || "").startsWith(prefix) || hash.length > 4000) return null;
    try {
      const entry = JSON.parse(decodeURIComponent(hash.slice(prefix.length)));
      if (entry?.version !== 1 || entry.source !== "ao3" || typeof entry.title !== "string") return null;
      const id = ao3WorkId(entry.externalUrl);
      const title = entry.title.trim().slice(0, 180);
      if (!id || !title) return null;
      return {
        id,
        title,
        author: String(entry.author || "").trim().slice(0, 120),
        fandom: String(entry.fandom || "").trim().slice(0, 160),
        totalChapters: safePositive(entry.totalChapters),
        publicationStatus: ["ongoing", "complete", "unknown"].includes(entry.publicationStatus) ? entry.publicationStatus : "unknown",
        externalUrl: `https://archiveofourown.org/works/${id}`
      };
    } catch { return null; }
  }

  function consumeAo3Import() {
    const hash = window.location?.hash || "";
    if (!hash?.startsWith("#lr-ao3-import=")) return;
    // Remove potentially personal fandom/title details from the address bar first;
    // the fragment is never sent to the host or to Firebase.
    try { window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search); }
    catch { /* Continue with an ephemeral, unpersisted form. */ }
    const entry = parseAo3ImportHash(hash);
    if (!entry) {
      showToast("AO3 import needs another try", "Open the work page and use the bookmarklet again.");
      return;
    }
    app.showView?.("library");
    const existing = model().items.find(book => ao3WorkId(book.externalUrl) === entry.id);
    if (existing) {
      openBookDialog(existing.id);
      showToast("Already in your Library", "Your existing reading progress is untouched.");
      return;
    }
    openBookDialog();
    if (els.kind) els.kind.value = "fanfiction";
    if (els.source) els.source.value = "online";
    if (els.title) els.title.value = entry.title;
    if (els.author) els.author.value = entry.author;
    if (els.fandom) els.fandom.value = entry.fandom;
    if (els.externalUrl) els.externalUrl.value = entry.externalUrl;
    if (els.totalChapters) els.totalChapters.value = entry.totalChapters || "";
    if (els.publicationStatus) els.publicationStatus.value = entry.publicationStatus;
    if (els.preferredGoal) els.preferredGoal.value = "chapter";
    setRadio("bookStatus", "want");
    updateKindFields();
    renderQuickPreview();
  }


  // Receives only chapter-completion observations from the user's local Firefox
  // userscript. No account credentials, raw pages or Mangago requests enter Life RPG.
  function consumeMangagoProgress() {
    const hash = window.location?.hash || "";
    const prefix = "#lr-mangago-progress=";
    if (!hash.startsWith(prefix)) return;
    let record;
    try { record = JSON.parse(decodeURIComponent(hash.slice(prefix.length))); } catch { record = null; }
    try { window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search); }
    catch { /* Browser may not support replaceState in an embedded context. */ }
    const slug = String(record?.slug || "");
    const chapter = Number(record?.chapter);
    if (!/^[a-z0-9_-]{2,120}$/i.test(slug) || !Number.isSafeInteger(chapter) || chapter < 1 || chapter > 100000) {
      showToast("Mangago sync rejected", "Chapter information was invalid.");
      return;
    }
    const entry = model().items.find(book => {
      if (!["manga", "manhwa", "webtoon"].includes(book.kind)) return false;
      try {
        const url = new URL(book.externalUrl);
        return ["www.mangago.me", "mangago.me"].includes(url.hostname.toLowerCase())
          && url.pathname.match(/^\/read-manga\/([^/]+)/)?.[1]?.toLowerCase() === slug.toLowerCase();
      } catch { return false; }
    });
    if (!entry) {
      showToast("Mangago not linked yet", "Edit the matching manga in Library and set its Reading link to the Mangago /read-manga/ page.");
      return;
    }
    if (progressUnitFor(entry) !== "chapters") {
      showToast("Mangago sync needs chapters", "Set this title to Track progress by Chapters first.");
      return;
    }
    const current = Math.max(0, Number(entry.currentChapter || 0));
    if (chapter > current + 1) {
      showToast("Mangago sync needs a starting point", "Set the current chapter of " + entry.title + " to " + (chapter - 1) + " once, then reopen Life RPG.");
      return;
    }
    if (entry.totalChapters && chapter > entry.totalChapters) {
      showToast("Update published chapters", "Increase the total chapters for " + entry.title + " before syncing the new chapter.");
      return;
    }
    let accepted = chapter <= current;
    if (!accepted) {
      const result = logBook(entry, { chapters: 1, source: "mangago-userscript" });
      accepted = !result?.skipped && Number(entry.currentChapter) >= chapter;
    }
    // Acknowledge only after the canonical book log has been persisted.
    if (accepted) {
      window.dispatchEvent(new CustomEvent("life-rpg:mangago-progress-ack", { detail: slug + ":" + chapter }));
      if (chapter > current) showToast("Mangago chapter synced", entry.title + " · Chapter " + chapter);
    }
  }

  async function runBookLookup() {
    const query = String(els.lookupQuery?.value || "").trim();
    if (query.length < 2) {
      renderLookupStatus("Type a title, author, or ISBN first.", "note");
      return;
    }
    if (lookupController) lookupController.abort();
    lookupController = new AbortController();
    lookupResults = [];
    lookupResultsCollapsed = false;
    renderLookupResults();
    setLookupBusy(true);
    const catalog = ["manga", "manhwa", "webtoon"].includes(els.kind?.value) ? "Manga catalog" : "Open Library";
    renderLookupStatus("Searching " + catalog + "…", "loading");
    try {
      lookupResults = await lookupBooks(query, lookupController.signal);
      if (!lookupResults.length) {
        renderLookupStatus("No confident matches found. You can still enter the book manually below.", "empty");
      } else {
        renderLookupStatus(`${lookupResults.length} match${lookupResults.length === 1 ? "" : "es"} found — pick the edition/work that looks right.`, "success");
      }
      renderLookupResults();
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.warn("Reading catalog lookup failed", error);
      renderLookupStatus(error?.message || "Book lookup is unavailable right now. Manual entry still works.", "error");
    } finally {
      setLookupBusy(false);
      lookupController = null;
    }
  }

  async function lookupBooks(query, signal = undefined) {
    const normalized = String(query || "").trim();
    if (!normalized) return [];
    const mediaKind = KINDS[els.kind?.value] ? els.kind.value : "book";
    if (mediaKind !== "book" && mediaKind !== "fanfiction") return lookupManga(normalized, signal);
    const cacheKey = normalizeLookupCacheKey(normalized);
    const cached = readLookupCache(cacheKey);
    if (cached) return cached;

    const isbn = normalizeIsbn(normalized);
    const params = new URLSearchParams();
    if (isbn) params.set("isbn", isbn);
    else params.set("q", normalized);
    params.set("fields", "key,title,author_name,cover_i,first_publish_year,number_of_pages_median,isbn,publisher,language,edition_count,edition_key,series");
    params.set("limit", String(LOOKUP_LIMIT));

    const response = await fetch(`https://openlibrary.org/search.json?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal
    });
    if (response.status === 429) throw new Error("Open Library is rate-limiting searches for a moment. Try again in a few seconds.");
    if (!response.ok) throw new Error(`Open Library search failed (${response.status}). Manual entry still works.`);
    const data = await response.json();
    const results = (Array.isArray(data?.docs) ? data.docs : [])
      .map(doc => mapLookupDoc(doc, isbn))
      .filter(item => item.title)
      .slice(0, LOOKUP_LIMIT);
    writeLookupCache(cacheKey, results);
    return results;
  }

  async function lookupManga(query, signal) {
    const kind = els.kind?.value || "manga";
    const key = "jikan:" + kind + ":" + normalizeLookupCacheKey(query);
    const cached = readLookupCache(key);
    if (cached) return cached;
    const params = new URLSearchParams({ q: query, limit: String(LOOKUP_LIMIT), order_by: "score", sort: "desc" });
    const response = await fetch("https://api.jikan.moe/v4/manga?" + params, {
      headers: { Accept: "application/json" }, signal
    });
    if (response.status === 429) throw new Error("Manga catalog is busy. Please try again shortly.");
    if (!response.ok) throw new Error("Manga search unavailable (" + response.status + "). You can still enter it manually.");
    const data = await response.json();
    const results = (Array.isArray(data?.data) ? data.data : []).map(mapMangaResult)
      .filter(item => item.title && (!["manhwa", "webtoon"].includes(kind) || item.kind === kind || (kind === "webtoon" && item.kind === "manhwa")))
      .slice(0, LOOKUP_LIMIT);
    writeLookupCache(key, results);
    return results;
  }

  function mapMangaResult(item) {
    const type = String(item?.type || "").toLowerCase();
    const kind = type === "manhwa" ? "manhwa" : type === "webtoon" ? "webtoon" : "manga";
    const title = String(item?.title_english || item?.title || item?.title_japanese || "").trim().slice(0, 180);
    const status = String(item?.status || "").toLowerCase();
    return {
      provider: "jikan", key: String(item?.mal_id || ""), title, kind,
      author: (Array.isArray(item?.authors) ? item.authors : []).map(author => String(author?.name || "").trim()).filter(Boolean).join(", ").slice(0, 120),
      totalChapters: safePositive(item?.chapters), totalVolumes: safePositive(item?.volumes),
      publicationStatus: status.includes("finished") ? "complete" : status.includes("publishing") ? "ongoing" : "unknown",
      coverUrl: String(item?.images?.jpg?.image_url || item?.images?.webp?.image_url || ""),
      externalUrl: String(item?.url || ""), totalPages: 0, isbn: "", series: "",
      publishYear: safePositive(item?.published?.prop?.from?.year), publisher: "", language: "",
      editionCount: 0
    };
  }

  function mapLookupDoc(doc, searchedIsbn = "") {
    const isbnList = Array.isArray(doc?.isbn) ? doc.isbn.map(normalizeIsbn).filter(Boolean) : [];
    const isbn = searchedIsbn && isbnList.includes(searchedIsbn) ? searchedIsbn : (isbnList[0] || searchedIsbn || "");
    const coverId = Number(doc?.cover_i || 0) || null;
    const coverUrl = coverId
      ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
      : isbn ? `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbn)}-M.jpg` : "";
    const rawSeries = Array.isArray(doc?.series) ? String(doc.series[0] || "") : String(doc?.series || "");
    const parsedSeries = parseSeriesMetadata(rawSeries);
    const publisher = Array.isArray(doc?.publisher) ? String(doc.publisher[0] || "") : String(doc?.publisher || "");
    const languages = Array.isArray(doc?.language) ? doc.language.filter(Boolean) : [];
    return {
      provider: "openlibrary",
      key: String(doc?.key || ""),
      title: String(doc?.title || "").trim(),
      author: Array.isArray(doc?.author_name) ? doc.author_name.filter(Boolean).join(", ") : "",
      totalPages: safePositive(doc?.number_of_pages_median),
      pageCountApprox: Boolean(safePositive(doc?.number_of_pages_median)),
      series: parsedSeries.name,
      seriesNumber: parsedSeries.number,
      isbn,
      publishYear: safePositive(doc?.first_publish_year),
      publisher: publisher.trim(),
      language: languages.slice(0, 3).join(", "),
      editionCount: Math.max(0, Number(doc?.edition_count || 0)),
      coverUrl,
      coverId,
      editionKeys: Array.isArray(doc?.edition_key) ? doc.edition_key.slice(0, 8) : []
    };
  }

  function renderLookupResults() {
    if (!els.lookupResults) return;
    els.lookupResults.classList.toggle("hidden", lookupResultsCollapsed || !lookupResults.length);
    els.lookupResults.innerHTML = lookupResults.map((book, index) => {
      const meta = [book.kind ? book.kind.toUpperCase() : book.publishYear, book.totalChapters ? `${book.totalChapters} chapters` : "", book.totalVolumes ? `${book.totalVolumes} volumes` : "", book.totalPages ? `~${formatNumber(book.totalPages)} pages` : "", book.editionCount ? `${book.editionCount} editions` : ""]
        .filter(Boolean).join(" · ");
      const cover = safeCoverUrl(book.coverUrl);
      return `<article class="library-lookup-result-v161">
        <div class="library-lookup-cover-v161">${cover ? `<img src="${escAttr(cover)}" alt="" loading="lazy" />` : `<span>📖</span>`}</div>
        <div class="library-lookup-copy-v161">
          <strong>${esc(book.title)}</strong>
          <span>${book.author ? esc(book.author) : "Author not listed"}</span>
          <small>${meta ? esc(meta) : "Catalog match"}${book.publisher ? ` · ${esc(book.publisher)}` : ""}</small>
        </div>
        <button class="secondary-button" type="button" data-book-lookup-use="${index}">Use this book</button>
      </article>`;
    }).join("");
  }

  function applyLookupResult(index) {
    const book = lookupResults[index];
    if (!book) return;
    selectedLookup = { ...book };
    lookupCleared = false;
    if (book.provider === "jikan" && book.key) {
      const matching = model().items.find(item => item.catalogProvider === "jikan" && item.catalogKey === book.key);
      if (matching && matching.id !== els.editId?.value) {
        openBookDialog(matching.id);
        // The dialog reset clears the selected catalog object: restore it without touching progress.
        selectedLookup = { ...book };
      }
      // Keep the user's chosen category, e.g. webtoon for a Korean series.
      if (els.source && !els.editId?.value) els.source.value = "online";
      if (els.totalChapters && book.totalChapters && !els.totalChapters.value) els.totalChapters.value = String(book.totalChapters);
      if (els.totalVolumes && book.totalVolumes && !els.totalVolumes.value) els.totalVolumes.value = String(book.totalVolumes);
      if (els.publicationStatus && book.publicationStatus !== "unknown" && els.publicationStatus.value === "unknown") els.publicationStatus.value = book.publicationStatus;
      if (els.externalUrl && book.externalUrl && !els.externalUrl.value) els.externalUrl.value = book.externalUrl;
    }
    if (els.title) els.title.value = book.title || els.title.value;
    if (els.author) els.author.value = book.author || els.author.value;
    if (els.totalPages && book.totalPages) els.totalPages.value = String(book.totalPages);
    if (book.series) {
      const existingSeries = findSeriesByName(book.series);
      const canonicalName = existingSeries?.name || book.series;
      if (els.series) els.series.value = canonicalName;
      if (els.seriesNumber && !els.seriesNumber.value) els.seriesNumber.value = book.seriesNumber || suggestedNextSeriesNumber(canonicalName);
      if (els.seriesTotal && !els.seriesTotal.value && existingSeries?.total) els.seriesTotal.value = String(existingSeries.total);
      if (els.advanced) els.advanced.open = true;
    }
    lookupResultsCollapsed = true;
    renderLookupResults();
    renderLookupSelection();
    renderSeriesSuggestions();
    updateKindFields();
    renderQuickPreview();
    renderLookupStatus("Match applied. Search results folded away — you can change the match if needed.", "success");
  }

  function parseSeriesMetadata(value) {
    let raw = String(value || "").trim();
    if (!raw) return { name: "", number: "" };
    raw = raw.replace(/\s+/g, " ");
    const patterns = [
      /^(.*?)[\s,;:\-–—]+(?:book|vol(?:ume)?|#)\s*(\d+(?:\.\d+)?)\s*$/i,
      /^(.*?)\s*[#№]\s*(\d+(?:\.\d+)?)\s*$/i,
      /^(.*?)\s*\((\d+(?:\.\d+)?)\)\s*$/i
    ];
    for (const pattern of patterns) {
      const match = raw.match(pattern);
      if (match && String(match[1] || "").trim()) return { name: String(match[1]).trim(), number: String(match[2] || "").trim() };
    }
    return { name: raw, number: "" };
  }

  function seriesKey(value) {
    return String(value || "").trim().toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9À-ž]+/gi, " ").replace(/\s+/g, " ").trim();
  }

  function allSeriesInfo() {
    const map = new Map();
    model().items.forEach(book => {
      const name = String(book.series || "").trim();
      if (!name) return;
      const key = seriesKey(name);
      if (!key) return;
      const current = map.get(key) || { name, key, count: 0, numbers: [], total: 0, authors: new Set(), updatedAt: 0 };
      current.count += 1;
      const n = Number.parseFloat(String(book.seriesNumber || "").replace(",", "."));
      if (Number.isFinite(n) && n > 0) current.numbers.push(n);
      current.total = Math.max(current.total, Number(book.seriesTotal || 0));
      if (book.author) current.authors.add(String(book.author).trim().toLowerCase());
      current.updatedAt = Math.max(current.updatedAt, Number(book.updatedAt || book.createdAt || 0));
      map.set(key, current);
    });
    return [...map.values()].sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));
  }

  function findSeriesByName(name) {
    const key = seriesKey(name);
    return allSeriesInfo().find(item => item.key === key) || null;
  }

  function suggestedNextSeriesNumber(name) {
    const info = findSeriesByName(name);
    if (!info?.numbers?.length) return info?.count ? String(info.count + 1) : "";
    const integers = info.numbers.filter(Number.isInteger);
    if (!integers.length) return "";
    return String(Math.max(...integers) + 1);
  }

  function matchingSeriesSuggestions() {
    const all = allSeriesInfo();
    const author = String(els.author?.value || selectedLookup?.author || "").trim().toLowerCase();
    const imported = String(selectedLookup?.series || "").trim();
    const importedKey = seriesKey(imported);
    const matches = [];
    if (imported) {
      const existing = all.find(item => item.key === importedKey);
      matches.push({ name: existing?.name || imported, reason: existing ? "Open Library match · already in your Library" : "Open Library series", priority: 0 });
    }
    if (author) {
      all.filter(item => item.authors.has(author)).forEach(item => {
        if (!matches.some(match => seriesKey(match.name) === item.key)) matches.push({ name: item.name, reason: `${item.count} book${item.count === 1 ? "" : "s"} by this author already linked`, priority: 1 });
      });
    }
    return matches.sort((a, b) => a.priority - b.priority).slice(0, 4);
  }

  function renderSeriesSuggestions() {
    const all = allSeriesInfo();
    if (els.seriesDatalist) els.seriesDatalist.innerHTML = all.map(item => `<option value="${escAttr(item.name)}"></option>`).join("");
    if (!els.seriesSuggestions) return;
    const suggestions = matchingSeriesSuggestions();
    const current = String(els.series?.value || "").trim();
    const exact = current ? findSeriesByName(current) : null;
    if (exact && current !== exact.name && els.series) els.series.value = exact.name;
    if (!suggestions.length) {
      els.seriesSuggestions.classList.add("hidden");
      els.seriesSuggestions.innerHTML = "";
      return;
    }
    els.seriesSuggestions.innerHTML = `<small>SERIES SUGGESTIONS</small><div>${suggestions.map(item => {
      const info = findSeriesByName(item.name);
      const next = suggestedNextSeriesNumber(item.name);
      const suffix = info ? ` · next likely #${esc(next || "?")}` : "";
      return `<button type="button" class="library-series-chip-v303a" data-book-series-use="${encodeURIComponent(item.name)}"><strong>${esc(item.name)}</strong><span>${esc(item.reason + suffix)}</span></button>`;
    }).join("")}</div>`;
    els.seriesSuggestions.classList.remove("hidden");
  }

  function applySeriesSuggestion(name) {
    const cleaned = String(name || "").trim();
    if (!cleaned) return;
    const info = findSeriesByName(cleaned);
    if (els.series) els.series.value = info?.name || cleaned;
    if (els.seriesNumber && !String(els.seriesNumber.value || "").trim()) els.seriesNumber.value = suggestedNextSeriesNumber(cleaned);
    if (els.seriesTotal && !String(els.seriesTotal.value || "").trim() && info?.total) els.seriesTotal.value = String(info.total);
    if (els.advanced) els.advanced.open = true;
    renderSeriesSuggestions();
    renderQuickPreview();
  }

  function clearLookupSelection() {
    selectedLookup = null;
    lookupCleared = true;
    lookupResultsCollapsed = false;
    renderLookupResults();
    renderLookupSelection();
    renderQuickPreview();
    renderLookupStatus("Imported catalog link removed. Your typed fields stay as they are.", "note");
  }

  function renderLookupSelection() {
    if (!els.lookupSelection) return;
    if (!selectedLookup) {
      els.lookupSelection.classList.add("hidden");
      els.lookupSelection.innerHTML = "";
      return;
    }
    const meta = [selectedLookup.totalChapters ? `${selectedLookup.totalChapters} chapters` : "", selectedLookup.totalVolumes ? `${selectedLookup.totalVolumes} volumes` : "", selectedLookup.publishYear, selectedLookup.totalPages ? `${formatNumber(selectedLookup.totalPages)} pages` : "", selectedLookup.isbn ? `ISBN ${selectedLookup.isbn}` : ""]
      .filter(Boolean).join(" · ");
    const cover = safeCoverUrl(selectedLookup.coverUrl);
    els.lookupSelection.innerHTML = `${cover ? `<img src="${escAttr(cover)}" alt="" />` : `<span class="library-lookup-selected-mark-v161">✓</span>`}
      <div><small>CATALOG MATCH SELECTED</small><strong>${esc(selectedLookup.title || "Reading item")}</strong><span>${esc(meta || (selectedLookup.provider === "jikan" ? "Manga catalog" : "Open Library"))}</span></div>
      <div class="library-lookup-selection-actions-v303a">${lookupResults.length > 1 ? `<button class="text-button" type="button" data-book-lookup-change>Change match</button>` : ""}<button class="text-button" type="button" data-book-lookup-clear>Remove match</button></div>`;
    els.lookupSelection.classList.remove("hidden");
  }

  function renderLookupStatus(message = "", kind = "") {
    if (!els.lookupStatus) return;
    els.lookupStatus.textContent = message;
    els.lookupStatus.dataset.kind = kind;
    els.lookupStatus.classList.toggle("hidden", !message);
  }

  function setLookupBusy(busy) {
    if (els.lookupSearch) {
      els.lookupSearch.disabled = busy;
      els.lookupSearch.textContent = busy ? "Searching…" : "Find book";
    }
    if (els.lookupSearch && !busy) els.lookupSearch.textContent = ["manga", "manhwa", "webtoon"].includes(els.kind?.value) ? "Find manga" : "Find book";
    if (els.lookupQuery) els.lookupQuery.setAttribute("aria-busy", busy ? "true" : "false");
  }

  function lookupFromBook(book) {
    if (!book || !book.catalogProvider) return null;
    return {
      provider: book.catalogProvider,
      key: book.catalogKey || "",
      title: book.title || "",
      author: book.author || "",
      totalPages: safePositive(book.totalPages),
      totalChapters: safePositive(book.totalChapters), totalVolumes: safePositive(book.totalVolumes),
      pageCountApprox: Boolean(book.catalogPageCountApprox),
      series: book.series || "",
      seriesNumber: book.seriesNumber || "",
      isbn: book.isbn || "",
      publishYear: safePositive(book.publishYear),
      publisher: book.publisher || "",
      language: book.language || "",
      editionCount: 0,
      coverUrl: safeCoverUrl(book.coverUrl)
    };
  }

  function catalogFieldsForSave(existing, totalPages) {
    if (lookupCleared) {
      return { coverUrl: "", isbn: "", publishYear: null, publisher: "", language: "", catalogProvider: "", catalogKey: "", catalogUpdatedAt: null, catalogPageCountApprox: false };
    }
    const source = selectedLookup || (existing?.catalogProvider ? lookupFromBook(existing) : null);
    if (!source) {
      return { coverUrl: existing?.coverUrl || "", isbn: existing?.isbn || "", publishYear: existing?.publishYear || null, publisher: existing?.publisher || "", language: existing?.language || "", catalogProvider: existing?.catalogProvider || "", catalogKey: existing?.catalogKey || "", catalogUpdatedAt: existing?.catalogUpdatedAt || null, catalogPageCountApprox: Boolean(existing?.catalogPageCountApprox) };
    }
    const importedPages = safePositive(source.totalPages);
    return {
      coverUrl: safeCoverUrl(source.coverUrl),
      isbn: String(source.isbn || ""),
      publishYear: safePositive(source.publishYear),
      publisher: String(source.publisher || ""),
      language: String(source.language || ""),
      catalogProvider: String(source.provider || "openlibrary"),
      catalogKey: String(source.key || ""),
      catalogUpdatedAt: Date.now(),
      catalogPageCountApprox: Boolean(source.pageCountApprox && importedPages && totalPages === importedPages)
    };
  }

  function normalizeIsbn(value) {
    const clean = String(value || "").toUpperCase().replace(/[^0-9X]/g, "");
    return clean.length === 10 || clean.length === 13 ? clean : "";
  }

  function normalizeLookupCacheKey(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, " ").slice(0, 220);
  }

  function readLookupCache(key) {
    try {
      const cache = JSON.parse(localStorage.getItem(LOOKUP_CACHE_KEY) || "{}");
      const entry = cache?.[key];
      if (!entry || Date.now() - Number(entry.at || 0) > LOOKUP_CACHE_TTL || !Array.isArray(entry.results)) return null;
      return entry.results;
    } catch { return null; }
  }

  function writeLookupCache(key, results) {
    try {
      const now = Date.now();
      const cache = JSON.parse(localStorage.getItem(LOOKUP_CACHE_KEY) || "{}");
      Object.keys(cache).forEach(cacheKey => {
        if (now - Number(cache[cacheKey]?.at || 0) > LOOKUP_CACHE_TTL) delete cache[cacheKey];
      });
      cache[key] = { at: now, results };
      const keys = Object.keys(cache).sort((a, b) => Number(cache[b]?.at || 0) - Number(cache[a]?.at || 0)).slice(0, 30);
      const trimmed = {};
      keys.forEach(cacheKey => { trimmed[cacheKey] = cache[cacheKey]; });
      localStorage.setItem(LOOKUP_CACHE_KEY, JSON.stringify(trimmed));
    } catch { /* cache is optional */ }
  }

  function safeCoverUrl(value) {
    const url = String(value || "").trim();
    return /^https:\/\/(?:covers\.openlibrary\.org|cdn\.myanimelist\.net)\//i.test(url) ? url : "";
  }

  function openBookDialog(id = "") {
    if (!els.dialog || !els.form) return;
    const book = id ? findBook(id) : null;
    els.form.reset();
    if (els.editId) els.editId.value = book?.id || "";
    if (els.dialogTitle) els.dialogTitle.textContent = book ? "Edit reading entry" : "Add a read";
    if (els.deleteButton) els.deleteButton.classList.toggle("hidden", !book);
    els.saveAnother?.classList.toggle("hidden", Boolean(book));
    if (els.title) els.title.value = book?.title || "";
    if (els.author) els.author.value = book?.author || "";
    if (els.kind) els.kind.value = KINDS[book?.kind] ? book.kind : "book";
    if (els.source) els.source.value = book?.source || "physical";
    if (els.externalUrl) els.externalUrl.value = book?.externalUrl || "";
    if (els.fandom) els.fandom.value = book?.fandom || "";
    if (els.publicationStatus) els.publicationStatus.value = book?.publicationStatus || "unknown";
    if (els.progressUnit) els.progressUnit.value = book?.progressUnit || "chapters";
    if (els.currentChapter) els.currentChapter.value = book?.currentChapter || "";
    if (els.totalChapters) els.totalChapters.value = book?.totalChapters || "";
    if (els.currentVolume) els.currentVolume.value = book?.currentVolume || "";
    if (els.totalVolumes) els.totalVolumes.value = book?.totalVolumes || "";
    if (els.epubFile) els.epubFile.value = "";
    if (els.epubStatus) els.epubStatus.textContent = "Only metadata is read on this device; story text is never stored.";
    if (els.totalPages) els.totalPages.value = book?.totalPages || "";
    if (els.currentPage) els.currentPage.value = book?.currentPage || "";
    if (els.series) els.series.value = book?.series || "";
    if (els.seriesNumber) els.seriesNumber.value = book?.seriesNumber || "";
    if (els.seriesTotal) els.seriesTotal.value = book?.seriesTotal || "";
    if (els.continueSeries) els.continueSeries.checked = Boolean(book?.continueSeries);
    if (els.preferredGoal) els.preferredGoal.value = book?.preferredGoal || "auto";
    if (els.notes) els.notes.value = book?.notes || "";
    lookupResults = [];
    lookupResultsCollapsed = false;
    lookupCleared = false;
    selectedLookup = book ? lookupFromBook(book) : null;
    if (els.lookupQuery) els.lookupQuery.value = book ? [book.title, book.author].filter(Boolean).join(" ") : "";
    renderLookupStatus("");
    renderLookupResults();
    renderLookupSelection();
    renderSeriesSuggestions();
    setRadio("bookStatus", book?.status || "want");
    setRadio("bookRole", book?.role || "fun");
    if (els.advanced) els.advanced.open = Boolean(book && (book.totalPages || book.currentPage || book.series || book.seriesTotal || book.notes || book.preferredGoal !== "auto"));
    updateKindFields();
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
    const kind = KINDS[els.kind?.value] ? els.kind.value : "book";
    const totalPages = safePositive(els.totalPages?.value);
    const currentPage = Math.min(Math.max(0, Number(els.currentPage?.value || 0)), totalPages || Number.MAX_SAFE_INTEGER);

    const next = {
      ...(existing || {}),
      id: existing?.id || makeId("book"),
      title,
      author: String(els.author?.value || "").trim(),
      kind,
      externalUrl: safeExternalUrl(els.externalUrl?.value),
      fandom: String(els.fandom?.value || "").trim().slice(0, 160),
      publicationStatus: ["unknown", "ongoing", "complete", "hiatus"].includes(els.publicationStatus?.value) ? els.publicationStatus.value : "unknown",
      progressUnit: kind === "fanfiction" ? "chapters" : els.progressUnit?.value === "volumes" ? "volumes" : "chapters",
      currentChapter: Math.min(Math.max(0, Math.floor(Number(els.currentChapter?.value || 0))), safePositive(els.totalChapters?.value) || Number.MAX_SAFE_INTEGER),
      totalChapters: safePositive(els.totalChapters?.value),
      currentVolume: Math.min(Math.max(0, Math.floor(Number(els.currentVolume?.value || 0))), safePositive(els.totalVolumes?.value) || Number.MAX_SAFE_INTEGER),
      totalVolumes: safePositive(els.totalVolumes?.value),
      status,
      role,
       source: SOURCES[els.source?.value] ? els.source.value : "physical",
      totalPages,
      currentPage,
      series: String(els.series?.value || "").trim(),
      seriesNumber: String(els.seriesNumber?.value || "").trim(),
      seriesTotal: safePositive(els.seriesTotal?.value),
      continueSeries: Boolean(els.continueSeries?.checked),
      preferredGoal: ["auto", "pages", "chapter", "minutes"].includes(els.preferredGoal?.value) ? els.preferredGoal.value : "auto",
      notes: String(els.notes?.value || "").trim(),
      ...catalogFieldsForSave(existing, totalPages),
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

    const stewardshipReward = existing ? null : window.LifeRPGStewardship?.rewardCreation?.({
      type: "book",
      id: next.id,
      label: next.title,
      fields: [next.title, next.author]
    });

    const addAnother = !existing && event.submitter?.dataset.saveAnother === "true";
    persist(existing ? "book-library-edit" : "book-library-create");
    if (Number(stewardshipReward?.xp || 0) > 0 || Number(stewardshipReward?.storyEnergy || 0) > 0) app.renderAll?.();
    const upkeepText = window.LifeRPGStewardship?.statusText?.(stewardshipReward) || "";
    showToast(existing ? "Reading entry updated" : "Added to Library", [title, upkeepText].filter(Boolean).join(" · "));
    if (addAnother) {
      const defaults = { status, role, source: next.source, kind };
      resetBookDialogForAnother(defaults);
    } else {
      closeBookDialog();
    }
  }

  function resetBookDialogForAnother(defaults = {}) {
    els.form?.reset();
    if (els.editId) els.editId.value = "";
    if (els.dialogTitle) els.dialogTitle.textContent = "Add a read";
    els.deleteButton?.classList.add("hidden");
    els.saveAnother?.classList.remove("hidden");
    selectedLookup = null;
    lookupCleared = false;
    lookupResults = [];
    lookupResultsCollapsed = false;
    if (els.lookupQuery) els.lookupQuery.value = "";
    renderLookupStatus("");
    renderLookupResults();
    renderLookupSelection();
    renderSeriesSuggestions();
    setRadio("bookStatus", defaults.status || "want");
    setRadio("bookRole", defaults.role || "fun");
    if (els.source) els.source.value = defaults.source || "physical";
    if (els.kind) els.kind.value = defaults.kind || "book";
    if (els.epubStatus) els.epubStatus.textContent = "Only metadata is read on this device; story text is never stored.";
    if (els.advanced) els.advanced.open = false;
    updateKindFields();
    renderQuickPreview();
    window.setTimeout(() => {
      if (els.lookupQuery) els.lookupQuery.focus();
      else els.title?.focus();
    }, 20);
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
    const kind = KINDS[els.kind?.value] || KINDS.book;
    const pages = safePositive(els.totalPages?.value);
    const current = Math.max(0, Number(els.currentPage?.value || 0));
    const pct = pages ? Math.floor(Math.min(100, current / pages * 100)) : null;
    const cover = safeCoverUrl(lookupCleared ? "" : (selectedLookup?.coverUrl || findBook(els.editId?.value)?.coverUrl || ""));
    els.preview.innerHTML = `
      ${cover ? `<img class="library-preview-cover-v161" src="${escAttr(cover)}" alt="" />` : `<div class="library-preview-mark-v16">${role.icon}</div>`}
      <div><small>${kind.icon} ${kind.label} · ${status.icon} ${status.label} · ${source.icon} ${source.label}</small><strong>${esc(title)}</strong><span>${role.label}${els.kind?.value === "book" && pct !== null ? ` · ${pct}%` : ""}${selectedLookup && els.kind?.value === "book" ? " · catalog match selected" : ""}</span></div>`;
  }

  function updateKindFields() {
    const kind = KINDS[els.kind?.value] ? els.kind.value : "book";
    if (els.lookupPanel) els.lookupPanel.dataset.catalog = ["manga", "manhwa", "webtoon"].includes(kind) ? "manga" : "book";
    if (els.lookupHeading) els.lookupHeading.textContent = kind === "book" ? "Find it instead of typing it." : "Find a manga, manhwa or webtoon.";
    if (els.lookupProvider) els.lookupProvider.textContent = kind === "book" ? "Open Library" : "Jikan · MyAnimeList";
    if (els.lookupQuery) els.lookupQuery.placeholder = kind === "book" ? "Title, author or ISBN" : "Manga / manhwa / webtoon title";
    if (els.lookupSearch) els.lookupSearch.textContent = kind === "book" ? "Find book" : "Find manga";
    if (els.lookupFootnote) els.lookupFootnote.textContent = kind === "book" ? "Book lookup by Open Library. Details are editable." : "Manga metadata by the unofficial Jikan / MyAnimeList API. Chapter and volume totals may be unavailable.";
    const serial = kind !== "book";
    const unit = kind === "fanfiction" ? "chapters" : els.progressUnit?.value || "chapters";
    els.kindDetails?.classList.toggle("hidden", !serial);
    els.bookLookupPanel?.classList.toggle("hidden", serial);
    els.bookPageDetails?.classList.toggle("hidden", serial);
    els.chapterDetails?.classList.toggle("hidden", !serial || unit === "volumes");
    els.volumeDetails?.classList.toggle("hidden", !serial || unit !== "volumes");
    byId("bookProgressUnitRow")?.classList.toggle("hidden", !serial || kind === "fanfiction");
    byId("bookFandomRow")?.classList.toggle("hidden", kind !== "fanfiction");
    byId("bookEpubRow")?.classList.toggle("hidden", kind !== "fanfiction");
  }

  async function importEpubSelection() {
    const file = els.epubFile?.files?.[0];
    if (!file) return;
    if (els.epubStatus) els.epubStatus.textContent = "Reading EPUB metadata locally…";
    try {
      const info = await epubMetadata(file);
      if (els.kind) els.kind.value = "fanfiction";
      if (els.source?.value === "physical") els.source.value = "online";
      if (els.title && info.title) els.title.value = info.title;
      if (els.author && info.author) els.author.value = info.author;
      if (els.totalChapters && info.chapters && !Number(els.totalChapters.value || 0)) els.totalChapters.value = String(info.chapters);
      if (els.externalUrl && info.url && !els.externalUrl.value) els.externalUrl.value = info.url;
      if (els.preferredGoal) els.preferredGoal.value = "chapter";
      updateKindFields();
      renderQuickPreview();
      if (els.epubStatus) els.epubStatus.textContent = `Imported title/author${info.chapters ? ` and an estimate of ${info.chapters} chapters` : ""}. Please verify the chapter count; prefaces and notes can affect it. Only metadata is kept.`;
    } catch (error) {
      if (els.epubStatus) els.epubStatus.textContent = `Could not read this EPUB (${error?.message || "unsupported file"}). You can still enter the details manually.`;
    } finally {
      if (els.epubFile) els.epubFile.value = "";
    }
  }

  async function epubMetadata(file) {
    if (file.size > 30 * 1024 * 1024) throw new Error("file over 30 MB");
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length < 22) throw new Error("not a valid ZIP/EPUB");
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let end = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
      if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
    }
    if (end < 0) throw new Error("ZIP directory missing");
    const count = view.getUint16(end + 10, true);
    const entries = new Map();
    let offset = view.getUint32(end + 16, true);
    const decoder = new TextDecoder();
    for (let i = 0; i < count && i < 5000; i++) {
      if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) break;
      const method = view.getUint16(offset + 10, true);
      const compressedSize = view.getUint32(offset + 20, true);
      const uncompressedSize = view.getUint32(offset + 24, true);
      const nameLength = view.getUint16(offset + 28, true);
      const extraLength = view.getUint16(offset + 30, true);
      const commentLength = view.getUint16(offset + 32, true);
      const localOffset = view.getUint32(offset + 42, true);
      const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
      entries.set(name, { method, compressedSize, uncompressedSize, localOffset });
      offset += 46 + nameLength + extraLength + commentLength;
    }
    const read = name => {
      const entry = entries.get(name);
      if (!entry || entry.uncompressedSize > 3 * 1024 * 1024) return "";
      const at = entry.localOffset;
      if (at + 30 > bytes.length || view.getUint32(at, true) !== 0x04034b50) return "";
      const begin = at + 30 + view.getUint16(at + 26, true) + view.getUint16(at + 28, true);
      const data = bytes.subarray(begin, begin + entry.compressedSize);
      if (data.length !== entry.compressedSize) return "";
      if (entry.method === 0) return decoder.decode(data);
      if (entry.method !== 8 || !window.pako?.inflateRaw) return "";
      return decoder.decode(window.pako.inflateRaw(data));
    };
    const parseXml = value => new DOMParser().parseFromString(value, "application/xml");
    const container = parseXml(read("META-INF/container.xml"));
    let opfPath = container.getElementsByTagNameNS("*", "rootfile")[0]?.getAttribute("full-path") || "";
    if (!entries.has(opfPath)) opfPath = [...entries.keys()].find(name => /\.opf$/i.test(name)) || "";
    if (!opfPath) throw new Error("EPUB package metadata missing");
    const packageText = read(opfPath);
    if (!packageText) throw new Error("cannot decompress EPUB metadata");
    const opf = parseXml(packageText);
    const tag = name => opf.getElementsByTagNameNS("*", name)[0]?.textContent?.trim() || "";
    const title = tag("title");
    const author = tag("creator");
    if (!title) throw new Error("no title in EPUB");
    const identifier = [...opf.getElementsByTagNameNS("*", "identifier")].map(node => node.textContent?.trim() || "").find(value => /archiveofourown\.org\/works\/\d+/.test(value)) || "";
    const url = identifier.match(/https:\/\/(?:www\.)?archiveofourown\.org\/works\/\d+/)?.[0] || "";
    const items = new Map([...opf.getElementsByTagNameNS("*", "item")].map(node => [node.getAttribute("id"), node.getAttribute("href") || ""]));
    const chapterItems = [...opf.getElementsByTagNameNS("*", "itemref")].map(node => items.get(node.getAttribute("idref")) || "")
      .filter(path => /\.(xhtml|html?)(?:$|#)/i.test(path) && !/(?:cover|titlepage|toc|nav|intro|notes|afterword|preface)/i.test(path));
    const chapters = chapterItems.length > 0 && chapterItems.length <= 3000 ? chapterItems.length : null;
    return { title, author, chapters, url };
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
    const addedBooks = [];

    entries.forEach((entry, index) => {
      const key = duplicateKey(entry.title, entry.author);
      if (existingKeys.has(key)) { skipped += 1; return; }
      existingKeys.add(key);
      const book = {
        id: makeId("book"), title: entry.title, author: entry.author, status, role, source,
        totalPages: null, currentPage: 0, series: "", seriesNumber: "", seriesTotal: null, continueSeries: false,
        preferredGoal: "auto", notes: "", coverUrl: "", isbn: "", publishYear: null, publisher: "", language: "",
        catalogProvider: "", catalogKey: "", catalogUpdatedAt: null, catalogPageCountApprox: false,
        createdAt: now + index, updatedAt: now + index,
        startedAt: status === "reading" ? now : null, finishedAt: status === "finished" ? now : null, lastReadAt: null
      };
      library.items.push(book);
      addedBooks.push(book);
      added += 1;
    });

    const stewardshipReward = window.LifeRPGStewardship?.rewardMany?.(addedBooks
      .map(book => ({ type: "book", id: book.id, label: book.title, fields: [book.title, book.author] })));

    closeBulkDialog();
    persist("book-library-bulk-add");
    if (Number(stewardshipReward?.xp || 0) > 0 || Number(stewardshipReward?.storyEnergy || 0) > 0) app.renderAll?.();
    const baseDetail = skipped ? `${skipped} duplicate${skipped === 1 ? "" : "s"} skipped.` : "Categorized in one pass.";
    const upkeepText = window.LifeRPGStewardship?.statusText?.(stewardshipReward) || "";
    showToast(`${added} book${added === 1 ? "" : "s"} added`, [baseDetail, upkeepText].filter(Boolean).join(" · "));
  }

  function duplicateKey(title, author) {
    return `${String(title || "").trim().toLowerCase()}|${String(author || "").trim().toLowerCase()}`;
  }

  function openLogDialog(id, suggestion = null) {
    const book = findBook(id);
    if (!book || !els.logDialog || !els.logForm) return;
    logSuggestion = suggestion && typeof suggestion === "object" ? suggestion : null;
    els.logForm.reset();
    populateLogPicker(book.id);
    configureLogForm(book, logSuggestion);
    setChainLogStatus("");
    els.logDialog.showModal();
  }

  function populateLogPicker(selectedId = "") {
    if (!els.logPicker) return;
    const items = [...model().items].sort((a, b) => {
      const rank = value => value === "reading" ? 0 : value === "paused" ? 1 : value === "want" ? 2 : value === "finished" ? 3 : 4;
      return rank(a.status) - rank(b.status) || String(a.title || "").localeCompare(String(b.title || ""));
    });
    els.logPicker.innerHTML = items.map(book => `<option value="${escAttr(book.id)}">${esc(book.title)}${book.author ? ` — ${esc(book.author)}` : ""}</option>`).join("");
    if (items.some(book => book.id === selectedId)) els.logPicker.value = selectedId;
  }

  function configureLogForm(book, suggestion = null) {
    if (!book) return;
    if (els.logId) els.logId.value = book.id;
    if (els.logPicker && els.logPicker.value !== book.id) els.logPicker.value = book.id;
    if (els.logTitle) els.logTitle.textContent = book.title;
    const audio = book.source === "audio";
    const serial = isSerial(book);
    const unit = progressUnitFor(book);
    els.logPagesWrap?.classList.toggle("hidden", serial || audio);
    els.logMinutesWrap?.classList.toggle("hidden", serial || !audio);
    els.logChapterDetails?.classList.toggle("hidden", !serial || unit !== "chapters");
    els.logVolumeDetails?.classList.toggle("hidden", !serial || unit !== "volumes");
    els.logChapterCheck?.classList.toggle("hidden", serial);
    els.logPosition?.classList.toggle("hidden", audio);
    logEntryMode = "pages";
    if (els.logPages) els.logPages.value = !audio && suggestion?.type === "pages" ? String(suggestion.amount || 10) : "";
    if (els.logEndPage) {
      els.logEndPage.value = "";
      els.logEndPage.min = String(Math.max(0, Number(book.currentPage || 0)));
      els.logEndPage.max = book.totalPages ? String(book.totalPages) : "";
      els.logEndPage.placeholder = book.currentPage > 0 ? `currently ${formatNumber(book.currentPage)}` : "e.g. 143";
    }
    if (els.logMinutes) els.logMinutes.value = audio && suggestion?.type === "minutes" ? String(suggestion.amount || 20) : "";
    if (els.logChapter) els.logChapter.checked = suggestion?.type === "chapter";
    if (els.logChapterCount) els.logChapterCount.value = serial && unit === "chapters" && suggestion?.type === "chapter" ? String(suggestion.amount || 1) : "";
    if (els.logChapterEnd) {
      els.logChapterEnd.value = "";
      els.logChapterEnd.min = String(book.currentChapter || 0);
      els.logChapterEnd.max = book.totalChapters ? String(book.totalChapters) : "";
    }
    if (els.logVolumeCount) els.logVolumeCount.value = serial && unit === "volumes" && ["volume", "chapter"].includes(suggestion?.type) ? String(suggestion.amount || 1) : "";
    if (els.logVolumeEnd) {
      els.logVolumeEnd.value = "";
      els.logVolumeEnd.min = String(book.currentVolume || 0);
      els.logVolumeEnd.max = book.totalVolumes ? String(book.totalVolumes) : "";
    }
    renderLogPosition(book);
    renderFinishAction(book);
    renderLogPreview();
  }

  function renderLogPosition(book) {
    if (!els.logPosition || !book || book.source === "audio") return;
    if (isSerial(book)) {
      const unit = progressUnitFor(book);
      const current = unit === "volumes" ? Number(book.currentVolume || 0) : Number(book.currentChapter || 0);
      const total = unit === "volumes" ? Number(book.totalVolumes || 0) : Number(book.totalChapters || 0);
      const label = unit === "volumes" ? "Volume" : "Chapter";
      els.logPosition.innerHTML = `<span>📍</span><div><strong>${label} ${formatNumber(current)}${total ? ` / ${formatNumber(total)} available` : ""}</strong><p>Reading progress is tracked here, independently from the reading website. ${book.publicationStatus === "complete" ? "This work is complete." : "Caught up does not mean Finished."}</p></div>`;
      return;
    }
    const current = Math.max(0, Number(book.currentPage || 0));
    const total = safePositive(book.totalPages);
    const pct = total ? Math.floor(clamp(current / total * 100, 0, 100)) : null;
    els.logPosition.innerHTML = `<span>📍</span><div><strong>Current position: page ${formatNumber(current)}${total ? ` / ${formatNumber(total)}` : ""}</strong><p>${pct === null ? "Add total pages whenever you know them; the current page still stays tracked." : `${pct}% complete · every page log updates this automatically.`}</p></div>`;
  }

  function renderFinishAction(book) {
    if (!els.finishButton || !els.finishHint) return;
    const total = safePositive(book?.totalPages);
    const current = Math.max(0, Number(book?.currentPage || 0));
    const canFinish = Boolean(book && !isSerial(book) && book.source !== "audio" && total && book.status !== "finished");
    els.finishButton.classList.toggle("hidden", !canFinish);
    els.finishHint.classList.toggle("hidden", isSerial(book) || Boolean(total) || book?.source === "audio" || book?.status === "finished");
    if (canFinish) {
      const remaining = Math.max(0, total - current);
      els.finishButton.textContent = remaining > 0 ? `Finish Book · log remaining ${formatNumber(remaining)} pages` : "Finish Book";
      els.finishHint.textContent = "";
    } else if (!isSerial(book) && book?.source !== "audio" && book?.status !== "finished" && !total) {
      els.finishHint.textContent = "Add the book's total page count to use Finish Book and log the exact remaining pages automatically.";
    } else {
      els.finishHint.textContent = "";
    }
  }

  function resolvedLogPages(book) {
    if (!book || isSerial(book) || book.source === "audio") return 0;
    const before = Math.max(0, Number(book.currentPage || 0));
    if (logEntryMode === "position" && String(els.logEndPage?.value || "").trim() !== "") {
      let end = Math.max(before, Number(els.logEndPage.value || before));
      if (book.totalPages) end = Math.min(end, Number(book.totalPages));
      return Math.max(0, end - before);
    }
    return Math.max(0, Number(els.logPages?.value || 0));
  }

  function resolvedSerialLog(book) {
    if (!book || !isSerial(book)) return { chapters: 0, volumes: 0 };
    const unit = progressUnitFor(book);
    const volumes = unit === "volumes";
    const before = Math.max(0, Number(volumes ? book.currentVolume : book.currentChapter) || 0);
    const total = safePositive(volumes ? book.totalVolumes : book.totalChapters);
    const end = volumes ? els.logVolumeEnd?.value : els.logChapterEnd?.value;
    const count = volumes ? els.logVolumeCount?.value : els.logChapterCount?.value;
    const amount = String(end ?? "").trim()
      ? Math.max(0, Math.floor(Number(end) || 0) - before)
      : Math.max(0, Math.floor(Number(count || 0)));
    const actual = Math.min(amount, total ? Math.max(0, total - before) : 1000);
    return volumes ? { chapters: 0, volumes: actual } : { chapters: actual, volumes: 0 };
  }

  function setChainLogStatus(message) {
    if (!els.logChainStatus) return;
    els.logChainStatus.textContent = message || "";
    els.logChainStatus.classList.toggle("hidden", !message);
  }

  function closeLogDialog() {
    els.logDialog?.close();
    logSuggestion = null;
    setChainLogStatus("");
  }

  function renderLogPreview() {
    if (!els.logPreview) return;
    const book = findBook(els.logId?.value);
    if (!book) { els.logPreview.innerHTML = ""; return; }
    if (isSerial(book)) {
      const { chapters, volumes } = resolvedSerialLog(book);
      const unit = progressUnitFor(book);
      const count = unit === "volumes" ? volumes : chapters;
      const before = Number(unit === "volumes" ? book.currentVolume : book.currentChapter) || 0;
      const label = unit === "volumes" ? "Volume" : "Chapter";
      els.logPreview.innerHTML = `<span>📖</span><div><small>AFTER THIS LOG</small><strong>${label} ${before} → ${before + count}</strong><p>${count ? `${count} ${unit} added to your reading history.` : "Enter a new chapter/volume or the amount you read."}</p></div>`;
      return;
    }
    if (book.source === "audio") {
      const minutes = Math.max(0, Number(els.logMinutes?.value || 0));
      els.logPreview.innerHTML = `<span>🎧</span><div><small>THIS LOG</small><strong>${minutes ? formatDuration(minutes) : "One listening session"}</strong><p>Last touched updates automatically. No extra database editing.</p></div>`;
      return;
    }
    const pages = resolvedLogPages(book);
    const before = Math.max(0, Number(book.currentPage || 0));
    const after = before + pages;
    const capped = book.totalPages ? Math.min(after, book.totalPages) : after;
    const pct = book.totalPages ? Math.floor(capped / book.totalPages * 100) : null;
    const chapter = Boolean(els.logChapter?.checked);
    const positionText = pages > 0
      ? `Page ${formatNumber(before)} → ${formatNumber(capped)}${pct === null ? "" : ` · ${pct}%`}`
      : chapter ? "Chapter logged" : "Reading session logged";
    els.logPreview.innerHTML = `<span>📖</span><div><small>AFTER THIS LOG</small><strong>${positionText}</strong><p>${book.totalPages && capped >= book.totalPages ? "This reaches the end — the book will be marked Finished automatically." : "Your current page and last-read date update automatically."}</p></div>`;
  }

  function saveLog(event) {
    event.preventDefault();
    const book = findBook(els.logId?.value);
    if (!book) return;
    const serial = isSerial(book);
    const { chapters, volumes } = resolvedSerialLog(book);
    if (serial && !chapters && !volumes) {
      setChainLogStatus("No new chapters or volumes to log. Your previous progress stays untouched.");
      return;
    }
    const pages = book.source === "audio" ? 0 : resolvedLogPages(book);
    const minutes = book.source === "audio" ? Math.max(0, Number(els.logMinutes?.value || 0)) : 0;
    const chapter = Boolean(els.logChapter?.checked);
    const addAnother = event.submitter?.dataset.logAnother === "true";
    logBook(book, { pages, minutes, chapter: !serial && chapter, chapters, volumes, source: "dialog" });
    if (addAnother) {
      populateLogPicker(book.id);
      const nextBook = findBook(els.logPicker?.value || book.id) || book;
      configureLogForm(nextBook);
      setChainLogStatus(`✓ ${book.title} saved. Pick another book above or log another reading session.`);
      window.setTimeout(() => els.logPicker?.focus(), 20);
    } else {
      closeLogDialog();
    }
  }

  function finishCurrentBook() {
    const book = findBook(els.logId?.value);
    if (!book || isSerial(book) || book.source === "audio") return;
    const total = safePositive(book.totalPages);
    if (!total) {
      showToast("Total pages needed", "Add the book's total page count first so Life RPG can log the exact remaining pages.");
      return;
    }
    const remaining = Math.max(0, total - Math.max(0, Number(book.currentPage || 0)));
    const result = logBook(book, { pages: remaining, minutes: 0, chapter: false, source: "finish-book" });
    populateLogPicker(book.id);
    configureLogForm(book);
    const reward = result?.reward || {};
    const rewardText = reward.deduped ? "already counted from a linked reading quest" : `+${app.formatEnergy?.(reward.storyEnergy) ?? reward.storyEnergy} 🔥 · +${Number(reward.xp || 0)} XP · +${Number(reward.coins || 0)} 🪙`;
    const finishText = result?.finishReward ? ` · finish bonus +${Number(result.finishReward.coins || 0)} 🪙` : "";
    setChainLogStatus(`✓ ${book.title} finished · ${formatNumber(remaining)} remaining page${remaining === 1 ? "" : "s"} logged · ${rewardText}${finishText}.`);
  }

  function quickLog(id, type, amount) {
    const book = findBook(id);
    if (!book) return;
    if (isSerial(book)) {
      const volume = progressUnitFor(book) === "volumes";
      logBook(book, { chapters: volume ? 0 : amount, volumes: volume ? amount : 0, source: "quick" });
      return;
    }
    logBook(book, type === "minutes" ? { minutes: amount, pages: 0, chapter: false, source: "quick" } : { pages: amount, minutes: 0, chapter: false, source: "quick" });
  }

  function readingRewardSpec(book, { pages = 0, minutes = 0, chapter = false, chapters = 0, volumes = 0, at = Date.now() } = {}) {
    let storyEnergyBase = 0.2;
    if (pages > 0) storyEnergyBase = Math.min(3, Number(pages) * 0.04);
    else if (minutes > 0) storyEnergyBase = Math.min(3, Number(minutes) * 0.025);
    else if (chapter || chapters > 0 || volumes > 0) storyEnergyBase = 0.7;

    const role = ROLES[book.role] || ROLES.fun;
    const xp = Math.max(2, Math.round(storyEnergyBase * 10));
    const coins = pages > 0
      ? Math.min(15, Math.max(1, Math.round(Number(pages) / 2)))
      : minutes > 0
        ? Math.min(15, Math.max(1, Math.round(Number(minutes) / 6)))
        : chapter || chapters > 0 || volumes > 0 ? 5 : 0;
    const capability = book.role === "japanese" ? "japanese" : "knowledge";
    return {
      source: "library",
      sourceId: book.id,
      label: book.title,
      realm: role.realm,
      capability,
      xp,
      realmXP: xp,
      statXP: Math.max(1, Math.round(xp * 0.65)),
      coins,
      storyEnergyBase,
      dedupeFamily: "reading",
      at: new Date(at).toISOString(),
      metadata: { pages: Number(pages || 0), minutes: Number(minutes || 0), chapter: Boolean(chapter || chapters > 0 || volumes > 0), chapters, volumes, kind: book.kind || "book", role: book.role }
    };
  }

  function logBook(book, { pages = 0, minutes = 0, chapter = false, chapters = 0, volumes = 0, source = "manual" } = {}) {
    const now = Date.now();
    const wasFinished = book.status === "finished";
    if (isSerial(book)) {
      const unit = progressUnitFor(book);
      const before = Number(unit === "volumes" ? book.currentVolume : book.currentChapter) || 0;
      const total = safePositive(unit === "volumes" ? book.totalVolumes : book.totalChapters);
      const requested = Math.max(0, Math.floor(Number(unit === "volumes" ? volumes : chapters) || 0));
      const actual = total ? Math.min(requested, Math.max(0, total - before)) : Math.min(requested, 1000);
      if (!actual) {
        showToast("No new reading to log", total && before >= total ? "Caught up! Update the published chapter/volume count when new content appears." : "Enter a chapter or volume you actually read.");
        return { skipped: true };
      }
      if (unit === "volumes") { book.currentVolume = before + actual; volumes = actual; chapters = 0; }
      else { book.currentChapter = before + actual; chapters = actual; volumes = 0; }
    }
    if (book.status !== "reading" && !wasFinished) {
      book.status = "reading";
      book.startedAt ||= now;
    }

    const beforePage = Math.max(0, Number(book.currentPage || 0));
    if (!isSerial(book) && pages > 0) {
      book.currentPage = beforePage + Number(pages);
      if (book.totalPages) book.currentPage = Math.min(book.currentPage, book.totalPages);
    }
    const actualPages = Math.max(0, Number(book.currentPage || 0) - beforePage);

    book.lastReadAt = now;
    book.updatedAt = now;
    book.sessions = Number(book.sessions || 0) + 1;
    const unit = progressUnitFor(book);
    const totalSerial = isSerial(book) ? Number(unit === "volumes" ? book.totalVolumes : book.totalChapters) || 0 : 0;
    const currentSerial = isSerial(book) ? Number(unit === "volumes" ? book.currentVolume : book.currentChapter) || 0 : 0;
    if ((!isSerial(book) && book.totalPages && book.currentPage >= book.totalPages) ||
        (isSerial(book) && book.publicationStatus === "complete" && totalSerial && currentSerial >= totalSerial)) {
      book.status = "finished";
      book.finishedAt = now;
    }

    const reward = app.awardActivity?.(readingRewardSpec(book, {
      pages: actualPages,
      minutes: Number(minutes || 0),
      chapter,
      chapters,
      volumes,
      at: now
    })) || { xp: 0, realmXP: 0, statXP: 0, storyEnergy: 0, rawStoryEnergy: 0, coins: 0 };

    let finishReward = null;
    if (!wasFinished && book.status === "finished" && !book.finishRewardEventId) {
      finishReward = app.awardActivity?.({
        source: "book-finish",
        sourceId: book.id,
        label: `Finished: ${book.title}`,
        realm: (ROLES[book.role] || ROLES.fun).realm,
        capability: book.role === "japanese" ? "japanese" : "knowledge",
        xp: 10,
        realmXP: 10,
        statXP: 6,
        coins: 50,
        storyEnergyBase: 1,
        progressionRelevant: true,
        at: new Date(now).toISOString(),
        metadata: { bookFinished: true }
      }) || null;
      book.finishRewardEventId = finishReward?.eventId || `local-book-finish-${now}`;
    }

    model().logs.push({
      id: makeId("read"), bookId: book.id, at: now, date: dateKey(new Date(now)),
      pages: actualPages, minutes: Number(minutes || 0), chapter: Boolean(chapter || chapters || volumes), chapters, volumes, source,
      xp: Number(reward.xp || 0), realmXP: Number(reward.realmXP || 0), statXP: Number(reward.statXP || 0),
      storyEnergy: Number(reward.storyEnergy || 0), rawStoryEnergy: Number(reward.rawStoryEnergy || 0), coins: Number(reward.coins || 0),
      finishCoins: Number(finishReward?.coins || 0), finishRewardEventId: finishReward?.eventId || null,
      rewardEventId: reward.eventId || null, deduped: Boolean(reward.deduped)
    });
    persist("book-library-log");
    app.renderAll?.();
    const detail = book.status === "finished"
      ? "Finished ✨"
      : isSerial(book)
        ? `Now on ${unit === "volumes" ? "volume" : "chapter"} ${formatNumber(currentSerial)}${totalSerial ? ` / ${formatNumber(totalSerial)} available` : ""}`
        : actualPages > 0
        ? `Now on page ${formatNumber(book.currentPage)}${book.totalPages ? ` / ${formatNumber(book.totalPages)}` : ""}`
        : minutes > 0 ? `${formatDuration(minutes)} logged` : "Reading session logged";
    const rewardText = reward.deduped
      ? " · already counted from a linked reading quest"
      : ` · +${app.formatEnergy?.(reward.storyEnergy) ?? reward.storyEnergy} 🔥 · +${Number(reward.xp || 0)} XP · +${Number(reward.coins || 0)} 🪙`;
    const finishText = finishReward ? ` · finish bonus +${Number(finishReward.coins || 0)} 🪙` : "";
    showToast("Reading logged", `${book.title} · ${detail}${rewardText}${finishText}`);
    return { book, reward, finishReward, actualPages, chapters, volumes, minutes: Number(minutes || 0), chapter: Boolean(chapter || chapters || volumes) };
  }

  function bookProgress(book) {
    if (isSerial(book)) {
      const unit = progressUnitFor(book);
      const total = Number(unit === "volumes" ? book.totalVolumes : book.totalChapters) || 0;
      const current = Number(unit === "volumes" ? book.currentVolume : book.currentChapter) || 0;
      return total ? Math.floor(clamp(current / total * 100, 0, 100)) : null;
    }
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
      statusMeta: status => STATUSES[status] || STATUSES.want,
      searchCatalog: lookupBooks
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
    if (book.kind === "fanfiction") return "✍";
    if (book.kind === "manga") return "🌸";
    if (book.kind === "manhwa") return "💜";
    if (book.kind === "webtoon") return "▣";
    if (book.role === "japanese") return "あ";
    if (book.role === "knowledge") return "K";
    if (book.role === "growth") return "✦";
    if (book.role === "work") return "W";
    return "❀";
  }

  function seriesProgressText(book) {
    const series = String(book?.series || "").trim();
    if (!series) return "";
    const siblings = model().items.filter(item => String(item.series || "").trim().toLowerCase() === series.toLowerCase());
    const finished = siblings.filter(item => item.status === "finished").length;
    const configuredTotal = Math.max(...siblings.map(item => Number(item.seriesTotal || 0)), Number(book.seriesTotal || 0), 0);
    if (configuredTotal > 0) return `Series progress · ${finished}/${configuredTotal} finished`;
    if (siblings.length > 1) return `Series progress · ${finished}/${siblings.length} tracked finished`;
    return "";
  }

  function syncViewControls() {
    els.viewToggle?.querySelectorAll?.("[data-library-view]").forEach(button => {
      const active = (button.dataset.libraryView || "grid") === viewMode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function safeStorageGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function safeStorageSet(key, value) {
    try { localStorage.setItem(key, value); } catch { /* preference is non-critical */ }
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
