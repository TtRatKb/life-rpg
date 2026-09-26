(() => {
  const VERSION = '0.31.4dp';
  const STORAGE_PREFIX = 'lifeRpgColoringStudio';
  const EMBEDDED = window.parent !== window && new URLSearchParams(location.search).get('embedded') === '1';
  const CANVAS_WIDTH = 1122;
  const CANVAS_HEIGHT = 1402;
  const QUICK_COLORS = ['#111111', '#ffffff', '#d8759e', '#f2b7cf', '#a64673', '#f4d35e', '#7cc6fe', '#70c1b3', '#f08a5d', '#7b7fda'];
  const CARD_LIBRARY = [
      {
      id: 'bakugo-trading-card-level-1',
      title: 'Bakugo · Level 1',
      unlockId: 'coloring-studio',
      assetCandidates: ['assets/coloring/bakugo-trading-card-line.png?v=0.31.4dn']
    },
    { id: 'bakugo-hero-classic', title: 'Bakugo · Hero Classic', unlockId: 'color-card-bakugo-hero-classic', assetCandidates: ['assets/coloring/bakugo-hero-classic-line.png?v=0.31.4dn'] },
    { id: 'bakugo-battle-heat', title: 'Bakugo · Battle Heat', unlockId: 'color-card-bakugo-battle-heat', assetCandidates: ['assets/coloring/bakugo-battle-heat-line.png?v=0.31.4dn'] },
    { id: 'bakugo-alley-strut', title: 'Bakugo · Alley Strut', unlockId: 'color-card-bakugo-alley-strut', assetCandidates: ['assets/coloring/bakugo-alley-strut-line.png?v=0.31.4dn'] },
    { id: 'bakugo-rooftop-break', title: 'Bakugo · Rooftop Break', unlockId: 'color-card-bakugo-rooftop-break', assetCandidates: ['assets/coloring/bakugo-rooftop-break-line.png?v=0.31.4dn'] },
    { id: 'bakugo-chair-taunt', title: 'Bakugo · Chair Taunt', unlockId: 'color-card-bakugo-chair-taunt', assetCandidates: ['assets/coloring/bakugo-chair-taunt-line.png?v=0.31.4dn'] },
    { id: 'bakugo-post-training', title: 'Bakugo · Post-Training', unlockId: 'color-card-bakugo-post-training', assetCandidates: ['assets/coloring/bakugo-post-training-line.png?v=0.31.4dn'] },
    { id: 'kirishima-hero-grin', title: 'Kirishima · Hero Grin', unlockId: 'color-card-kirishima-hero-grin', assetCandidates: ['assets/coloring/kirishima-hero-grin-line.png?v=0.31.4dp'] } ,
    { id: 'kirishima-sunshine-break', title: 'Kirishima · Sunshine Break', unlockId: 'color-card-kirishima-sunshine-break', assetCandidates: ['assets/coloring/kirishima-sunshine-break-line.png?v=0.31.4dp'] } ,
    { id: 'kirishima-training-glow', title: 'Kirishima · Training Glow', unlockId: 'color-card-kirishima-training-glow', assetCandidates: ['assets/coloring/kirishima-training-glow-line.png?v=0.31.4dp'] } ,
    { id: 'kirishima-red-riot-edge', title: 'Kirishima · Red Riot Edge', unlockId: 'color-card-kirishima-red-riot-edge', assetCandidates: ['assets/coloring/kirishima-red-riot-edge-line.png?v=0.31.4dp'] } ,
    { id: 'kirishima-casual-charm', title: 'Kirishima · Casual Charm', unlockId: 'color-card-kirishima-casual-charm', assetCandidates: ['assets/coloring/kirishima-casual-charm-line.png?v=0.31.4dp'] } ,
    { id: 'kirishima-chair-sideways', title: 'Kirishima · Chair Sideways', unlockId: 'color-card-kirishima-chair-sideways', assetCandidates: ['assets/coloring/kirishima-chair-sideways-line.png?v=0.31.4dp'] } ,
    { id: 'kirishima-stretch-break', title: 'Kirishima · Stretch Break', unlockId: 'color-card-kirishima-stretch-break', assetCandidates: ['assets/coloring/kirishima-stretch-break-line.png?v=0.31.4dp'] } ,
    { id: 'kirishima-come-at-me', title: 'Kirishima · Come At Me', unlockId: 'color-card-kirishima-come-at-me', assetCandidates: ['assets/coloring/kirishima-come-at-me-line.png?v=0.31.4dp'] } ,
    { id: 'kirishima-lean-in', title: 'Kirishima · Lean In', unlockId: 'color-card-kirishima-lean-in', assetCandidates: ['assets/coloring/kirishima-lean-in-line.png?v=0.31.4dp'] }
  ];

  const state = {
    currentCard: CARD_LIBRARY[0],
    activeTool: 'pen',
    brushSize: 18,
    opacity: 1,
    softness: 0.6,
    brightness: 1,
    selectedHue: 335,
    selectedSat: 0.45,
    currentColor: '#d8759e',
    currentPointerId: null,
    drawing: false,
    panning: false,
    lastPoint: null,
    zoom: 1,
    minZoom: 0.2,
    maxZoom: 6,
    panX: 0,
    panY: 0,
    hasManualView: false,
    touchPointers: new Map(),
    touchGesture: null,
    saveTimer: null,
    pendingSave: false,
    isLineArtReady: false,
    lineMaskCanvas: document.createElement('canvas'),
    lineMaskCtx: null,
    undoStack: [],
    redoStack: []
  };

  const els = {};
  let ctx;
  let cardLoadToken = 0;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    bindElements();
    state.lineMaskCanvas.width = CANVAS_WIDTH;
    state.lineMaskCanvas.height = CANVAS_HEIGHT;
    state.lineMaskCtx = state.lineMaskCanvas.getContext('2d', { willReadFrequently: true });
    ctx = els.paintCanvas.getContext('2d', { willReadFrequently: true });
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    renderLibrary();
    setupColorWheel();
    setupControls();
    setupCanvasEvents();
    refreshBrushLabels();
    setCurrentColor(state.currentColor);
    updateToolButtons();
    updateSavePill('ready', 'Ready');
    if (!EMBEDDED) loadCard(state.currentCard);
    window.addEventListener('resize', handleResize);
    window.addEventListener('pagehide', flushPainting);
  }

  function bindElements() {
    Object.assign(els, {
      backToLifeRpg: document.getElementById('backToLifeRpg'),
      savePill: document.getElementById('savePill'),
      cardLibrary: document.getElementById('cardLibrary'),
      toggleTools: document.getElementById('toggleTools'),
      toolsPanel: document.getElementById('toolsPanel'),
      canvasViewport: document.getElementById('canvasViewport'),
      canvasStage: document.getElementById('canvasStage'),
      paintCanvas: document.getElementById('paintCanvas'),
      lineArt: document.getElementById('lineArt'),
      zoomBadge: document.getElementById('zoomBadge'),
      colorWheel: document.getElementById('colorWheel'),
      brightness: document.getElementById('brightness'),
      brightnessValue: document.getElementById('brightnessValue'),
      colorPreview: document.getElementById('colorPreview'),
      hexInput: document.getElementById('hexInput'),
      quickColors: document.getElementById('quickColors'),
      brushSize: document.getElementById('brushSize'),
      brushSizeValue: document.getElementById('brushSizeValue'),
      opacity: document.getElementById('opacity'),
      opacityValue: document.getElementById('opacityValue'),
      softness: document.getElementById('softness'),
      softnessValue: document.getElementById('softnessValue'),
      penButton: document.getElementById('penButton'),
      softBrushButton: document.getElementById('softBrushButton'),
      smudgeButton: document.getElementById('smudgeButton'),
      bucketButton: document.getElementById('bucketButton'),
      eyedropperButton: document.getElementById('eyedropperButton'),
      handButton: document.getElementById('handButton'),
      eraserButton: document.getElementById('eraserButton'),
      undoButton: document.getElementById('undoButton'),
      redoButton: document.getElementById('redoButton'),
      zoomOutButton: document.getElementById('zoomOutButton'),
      zoomInButton: document.getElementById('zoomInButton'),
      zoomResetButton: document.getElementById('zoomResetButton'),
      zoomFitButton: document.getElementById('zoomFitButton'),
      exportButton: document.getElementById('exportButton'),
      finishButton: document.getElementById('finishButton'),
      clearButton: document.getElementById('clearButton')
    });
  }

  function setupControls() {
    els.backToLifeRpg.addEventListener('click', () => {
      flushPainting();
      if (EMBEDDED && window.parent.LifeRPGLifeHub?.showStudioGallery) window.parent.LifeRPGLifeHub.showStudioGallery('coloring');
      else window.location.href = 'index.html';
    });
    els.toggleTools?.addEventListener('click', () => {
      els.toolsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    els.brightness.addEventListener('input', () => {
      state.brightness = Number(els.brightness.value) / 100;
      els.brightnessValue.textContent = `${els.brightness.value}%`;
      syncColorFromWheelState();
      drawColorWheel();
    });
    els.brushSize.addEventListener('input', () => {
      state.brushSize = Number(els.brushSize.value);
      refreshBrushLabels();
    });
    els.opacity.addEventListener('input', () => {
      state.opacity = Number(els.opacity.value) / 100;
      refreshBrushLabels();
    });
    els.softness.addEventListener('input', () => {
      state.softness = Number(els.softness.value) / 100;
      refreshBrushLabels();
    });

    els.hexInput.addEventListener('change', () => {
      const normalized = normalizeHex(els.hexInput.value);
      if (!normalized) {
        els.hexInput.value = state.currentColor;
        return;
      }
      setCurrentColor(normalized, true);
    });

    [
      ['penButton', 'pen'],
      ['softBrushButton', 'soft'],
      ['smudgeButton', 'smudge'],
      ['bucketButton', 'bucket'],
      ['eyedropperButton', 'eyedropper'],
      ['handButton', 'hand'],
      ['eraserButton', 'eraser']
    ].forEach(([id, tool]) => {
      els[id].addEventListener('click', () => setTool(tool));
    });

    els.undoButton.addEventListener('click', undo);
    els.redoButton.addEventListener('click', redo);
    els.clearButton.addEventListener('click', clearPainting);
    els.exportButton.addEventListener('click', exportPng);
    els.finishButton.addEventListener('click', toggleFinished);

    els.zoomInButton.addEventListener('click', () => zoomBy(1.2));
    els.zoomOutButton.addEventListener('click', () => zoomBy(1 / 1.2));
    els.zoomResetButton.addEventListener('click', () => resetZoom());
    els.zoomFitButton.addEventListener('click', () => fitToViewport(true));
  }

  function refreshBrushLabels() {
    els.brushSizeValue.textContent = `${state.brushSize}px`;
    els.opacityValue.textContent = `${Math.round(state.opacity * 100)}%`;
    els.softnessValue.textContent = `${Math.round(state.softness * 100)}%`;
  }

  function cardUnlocked(card) {
    const graph = EMBEDDED ? window.parent?.LifeRPGTalentTreeGraph : window.LifeRPGTalentTreeGraph;
    // Old standalone entry has no main-save graph; keep the original Level 1
    // accessible for recovery, but never expose a newly locked card there.
    if (!graph?.isContentUnlocked) return card.id === 'bakugo-trading-card-level-1';
    if (card.id === 'bakugo-trading-card-level-1') return graph.isContentUnlocked('Hobbies', 'coloring-studio');
    return Boolean(graph.isContentUnlocked('Hobbies', card.unlockId));
  }

  function renderLibrary() {
    els.cardLibrary.innerHTML = '';
    CARD_LIBRARY.forEach((card) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'card-button';
      const owned = cardUnlocked(card);
      if (!owned) { button.classList.add('is-locked'); button.setAttribute('aria-disabled', 'true'); }
      if (state.currentCard && state.currentCard.id === card.id) button.classList.add('is-active');
      button.innerHTML = `
        <img class="card-thumb" alt="${card.title}" />
        <div class="card-meta">
          <strong>${card.title}</strong>
          <span class="card-pill">${owned ? 'Owned' : '🔒 Locked'}</span>
        </div>
      `;
      const thumb = button.querySelector('.card-thumb');
      loadFirstAvailableAsset(card.assetCandidates).then((src) => { if (src) thumb.src = src; });
      const save = readCardSave(card.id);
      if (save?.finished) {
        const done = document.createElement('div');
        done.className = 'card-pill';
        done.textContent = 'Finished';
        button.querySelector('.card-meta').appendChild(done);
      }
      button.addEventListener('click', () => {
        if (!cardUnlocked(card)) return;
        flushPainting();
        loadCard(card);
      });
      els.cardLibrary.appendChild(button);
    });
  }

  async function loadCard(card) {
    if (!cardUnlocked(card)) return false;
    flushPainting();
    const token = ++cardLoadToken;
    state.currentCard = card;
    updateSavePill('saving', 'Loading');
    state.isLineArtReady = false;

    const src = await loadFirstAvailableAsset(card.assetCandidates);
    if(token !== cardLoadToken) return;
    if (!src) {
      updateSavePill('error', 'Asset missing');
      return;
    }

    await loadImageElement(els.lineArt, src);
    if(token !== cardLoadToken) return;
    buildLineMask();
    clearCanvas();
    const save = readCardSave(card.id);
    if (save?.painting) {
      await loadPainting(save.painting);
    }
    if(token !== cardLoadToken) return;
    applyTransform(1, 0, 0, false);
    fitToViewport(false);
    updateFinishButton();
    updateSavePill('ready', 'Ready');
    renderLibrary();
  }

  function loadFirstAvailableAsset(candidates) {
    return new Promise((resolve) => {
      let index = 0;
      const tryNext = () => {
        if (index >= candidates.length) {
          resolve(null);
          return;
        }
        const src = candidates[index++];
        const img = new Image();
        img.onload = () => resolve(src);
        img.onerror = tryNext;
        img.src = src;
      };
      tryNext();
    });
  }

  function loadImageElement(imgEl, src) {
    return new Promise((resolve, reject) => {
      imgEl.onload = () => resolve();
      imgEl.onerror = reject;
      imgEl.src = src;
    });
  }

  function buildLineMask() {
    state.lineMaskCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    state.lineMaskCtx.drawImage(els.lineArt, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    state.isLineArtReady = true;
  }

  function loadPainting(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        clearCanvas();
        ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = dataUrl;
    });
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    state.undoStack = [];
    state.redoStack = [];
  }

  function setupColorWheel() {
    drawColorWheel();
    renderQuickColors();
    let draggingWheel = false;
    const pick = (event) => {
      const rect = els.colorWheel.getBoundingClientRect();
      const x = ((event.clientX || event.touches?.[0]?.clientX) - rect.left) * (els.colorWheel.width / rect.width);
      const y = ((event.clientY || event.touches?.[0]?.clientY) - rect.top) * (els.colorWheel.height / rect.height);
      pickFromWheel(x, y);
    };
    els.colorWheel.addEventListener('pointerdown', (event) => {
      draggingWheel = true;
      pick(event);
      els.colorWheel.setPointerCapture?.(event.pointerId);
    });
    els.colorWheel.addEventListener('pointermove', (event) => { if (draggingWheel) pick(event); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((name) => {
      els.colorWheel.addEventListener(name, () => { draggingWheel = false; });
    });
  }

  function drawColorWheel() {
    const wheelCtx = els.colorWheel.getContext('2d');
    const { width, height } = els.colorWheel;
    const radius = width / 2;
    const img = wheelCtx.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - radius;
        const dy = y - radius;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const idx = (y * width + x) * 4;
        if (dist > radius) {
          img.data[idx + 3] = 0;
          continue;
        }
        const sat = Math.min(1, dist / radius);
        const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
        const rgb = hsbToRgb(angle, sat, state.brightness);
        img.data[idx] = rgb.r;
        img.data[idx + 1] = rgb.g;
        img.data[idx + 2] = rgb.b;
        img.data[idx + 3] = 255;
      }
    }
    wheelCtx.putImageData(img, 0, 0);
    const marker = polarToWheelPoint(state.selectedHue, state.selectedSat, radius);
    wheelCtx.beginPath();
    wheelCtx.arc(marker.x, marker.y, 7, 0, Math.PI * 2);
    wheelCtx.strokeStyle = '#fff';
    wheelCtx.lineWidth = 3;
    wheelCtx.stroke();
    wheelCtx.beginPath();
    wheelCtx.arc(marker.x, marker.y, 8.5, 0, Math.PI * 2);
    wheelCtx.strokeStyle = 'rgba(53,35,56,0.55)';
    wheelCtx.lineWidth = 1.5;
    wheelCtx.stroke();
  }

  function polarToWheelPoint(hue, sat, radius) {
    const angle = hue * Math.PI / 180;
    const r = sat * radius;
    return { x: radius + Math.cos(angle) * r, y: radius + Math.sin(angle) * r };
  }

  function pickFromWheel(x, y) {
    const radius = els.colorWheel.width / 2;
    const dx = x - radius;
    const dy = y - radius;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > radius) return;
    state.selectedSat = Math.min(1, dist / radius);
    state.selectedHue = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    syncColorFromWheelState();
    drawColorWheel();
  }

  function syncColorFromWheelState() {
    const rgb = hsbToRgb(state.selectedHue, state.selectedSat, state.brightness);
    setCurrentColor(rgbToHex(rgb.r, rgb.g, rgb.b), false);
  }

  function renderQuickColors() {
    els.quickColors.innerHTML = '';
    QUICK_COLORS.forEach((hex) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'swatch';
      button.style.background = hex;
      button.title = hex;
      button.addEventListener('click', () => setCurrentColor(hex, true));
      els.quickColors.appendChild(button);
    });
  }

  function setCurrentColor(hex, syncWheel = false) {
    const normalized = normalizeHex(hex) || '#d8759e';
    state.currentColor = normalized;
    els.hexInput.value = normalized.toUpperCase();
    els.colorPreview.style.background = normalized;
    if (syncWheel) {
      const { h, s, b } = hexToHsb(normalized);
      state.selectedHue = h;
      state.selectedSat = s;
      state.brightness = b;
      els.brightness.value = Math.round(b * 100);
      els.brightnessValue.textContent = `${Math.round(b * 100)}%`;
      drawColorWheel();
    }
  }

  function setupCanvasEvents() {
    els.canvasViewport.addEventListener('pointerdown', onPointerDown);
    els.canvasViewport.addEventListener('pointermove', onPointerMove);
    els.canvasViewport.addEventListener('pointerup', onPointerUp);
    els.canvasViewport.addEventListener('pointercancel', onPointerUp);
    els.canvasViewport.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('keydown', onKeyDown);
  }

  function onPointerDown(event) {
    if (!state.isLineArtReady) return;
    if (event.pointerType === 'touch') {
      event.preventDefault();
      state.touchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      els.canvasViewport.setPointerCapture?.(event.pointerId);
      if (state.touchPointers.size === 2) beginTouchGesture();
      return;
    }
    const point = screenToCanvas(event.clientX, event.clientY);
    if (!point) return;
    els.canvasViewport.setPointerCapture?.(event.pointerId);
    state.currentPointerId = event.pointerId;

    if (state.activeTool === 'eyedropper') {
      pickColor(point.x, point.y);
      return;
    }
    if (state.activeTool === 'bucket') {
      pushUndoState();
      floodFill(point.x, point.y);
      scheduleSave();
      return;
    }
    if (state.activeTool === 'hand' || event.button === 1 || event.altKey) {
      state.panning = true;
      state.lastPoint = { x: event.clientX, y: event.clientY };
      return;
    }

    state.drawing = true;
    state.lastPoint = point;
    pushUndoState();
    stampAt(point, true);
  }

  function onPointerMove(event) {
    if (event.pointerType === 'touch') {
      if (!state.touchPointers.has(event.pointerId)) return;
      event.preventDefault();
      state.touchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (state.touchPointers.size === 2) {
        if (!state.touchGesture) beginTouchGesture();
        updateTouchGesture();
      }
      return;
    }
    if (state.panning && state.lastPoint) {
      const dx = event.clientX - state.lastPoint.x;
      const dy = event.clientY - state.lastPoint.y;
      state.lastPoint = { x: event.clientX, y: event.clientY };
      applyTransform(state.zoom, state.panX + dx, state.panY + dy, true);
      return;
    }
    if (!state.drawing) return;
    const point = screenToCanvas(event.clientX, event.clientY);
    if (!point || !state.lastPoint) return;
    drawSegment(state.lastPoint, point);
    state.lastPoint = point;
  }

  function onPointerUp(event) {
    if (event?.pointerType === 'touch') {
      state.touchPointers.delete(event.pointerId);
      if (state.touchPointers.size < 2) state.touchGesture = null;
      return;
    }
    if (state.drawing) scheduleSave();
    state.drawing = false;
    state.panning = false;
    state.lastPoint = null;
    state.currentPointerId = null;
  }

  function touchMetrics() {
    const points = [...state.touchPointers.values()];
    if (points.length < 2) return null;
    const a = points[0], b = points[1];
    return { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)) };
  }

  function beginTouchGesture() {
    const metrics = touchMetrics();
    if (!metrics) return;
    const rect = els.canvasViewport.getBoundingClientRect();
    state.touchGesture = {
      startDistance: metrics.distance,
      startZoom: state.zoom,
      worldX: (metrics.cx - rect.left - state.panX) / state.zoom,
      worldY: (metrics.cy - rect.top - state.panY) / state.zoom
    };
  }

  function updateTouchGesture() {
    const metrics = touchMetrics();
    if (!metrics || !state.touchGesture) return;
    const rect = els.canvasViewport.getBoundingClientRect();
    const nextZoom = clamp(state.touchGesture.startZoom * (metrics.distance / state.touchGesture.startDistance), state.minZoom, state.maxZoom);
    const panX = metrics.cx - rect.left - state.touchGesture.worldX * nextZoom;
    const panY = metrics.cy - rect.top - state.touchGesture.worldY * nextZoom;
    applyTransform(nextZoom, panX, panY, true);
  }

  function onWheel(event) {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey || true) {
      const factor = event.deltaY < 0 ? 1.1 : 0.9;
      zoomBy(factor, event.clientX, event.clientY);
    }
  }

  function onKeyDown(event) {
    const isMeta = event.ctrlKey || event.metaKey;
    if (isMeta && event.key.toLowerCase() === 'z' && !event.shiftKey) {
      event.preventDefault();
      undo();
    } else if (isMeta && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))) {
      event.preventDefault();
      redo();
    }
  }

  function screenToCanvas(clientX, clientY) {
    const rect = els.canvasViewport.getBoundingClientRect();
    const x = (clientX - rect.left - state.panX) / state.zoom;
    const y = (clientY - rect.top - state.panY) / state.zoom;
    if (x < 0 || y < 0 || x > CANVAS_WIDTH || y > CANVAS_HEIGHT) return null;
    return { x, y };
  }

  function setTool(tool) {
    state.activeTool = tool;
    updateToolButtons();
  }

  function updateToolButtons() {
    const mapping = {
      pen: els.penButton,
      soft: els.softBrushButton,
      smudge: els.smudgeButton,
      bucket: els.bucketButton,
      eyedropper: els.eyedropperButton,
      hand: els.handButton,
      eraser: els.eraserButton
    };
    Object.entries(mapping).forEach(([tool, button]) => button.classList.toggle('is-active', state.activeTool === tool));
  }

  function drawSegment(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distance = Math.hypot(dx, dy);
    const step = Math.max(1, state.brushSize * (state.activeTool === 'soft' || state.activeTool === 'smudge' ? 0.18 : 0.24));
    const steps = Math.max(1, Math.ceil(distance / step));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      stampAt({ x: a.x + dx * t, y: a.y + dy * t }, false, a);
    }
  }

  function stampAt(point, initial = false, previousPoint = null) {
    if (state.activeTool === 'smudge') {
      smudgeAt(point, previousPoint || point);
      return;
    }
    if (state.activeTool === 'soft') {
      softStamp(point.x, point.y, state.brushSize / 2, state.currentColor, state.opacity, state.softness);
      return;
    }
    if (state.activeTool === 'eraser') {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = `rgba(0,0,0,${state.opacity})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, Math.max(0.5, state.brushSize / 2), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.strokeStyle = hexToRgba(state.currentColor, state.opacity);
    ctx.fillStyle = hexToRgba(state.currentColor, state.opacity);
    ctx.lineWidth = state.brushSize;
    if (initial) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, state.brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(previousPoint?.x ?? point.x, previousPoint?.y ?? point.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function softStamp(x, y, radius, color, opacity, softness) {
    const inner = Math.max(0, radius * (1 - softness));
    const gradient = ctx.createRadialGradient(x, y, inner, x, y, radius);
    const rgba = hexToRgb(color);
    gradient.addColorStop(0, `rgba(${rgba.r},${rgba.g},${rgba.b},${opacity})`);
    gradient.addColorStop(1, `rgba(${rgba.r},${rgba.g},${rgba.b},0)`);
    ctx.save();
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function smudgeAt(point, previousPoint) {
    const sample = sampleCanvasColor(previousPoint.x, previousPoint.y, Math.max(2, Math.round(state.brushSize * 0.14)));
    if (!sample) return;
    const radius = Math.max(1, state.brushSize / 2);
    const inner = Math.max(0, radius * (1 - state.softness));
    const gradient = ctx.createRadialGradient(point.x, point.y, inner, point.x, point.y, radius);
    const alpha1 = Math.max(0.05, Math.min(0.45, sample.a * state.opacity * 0.35));
    const alpha2 = Math.max(0.02, alpha1 * 0.35);
    gradient.addColorStop(0, `rgba(${sample.r},${sample.g},${sample.b},${alpha1})`);
    gradient.addColorStop(1, `rgba(${sample.r},${sample.g},${sample.b},0)`);
    ctx.save();
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function sampleCanvasColor(x, y, radius = 2) {
    const sx = Math.max(0, Math.round(x - radius));
    const sy = Math.max(0, Math.round(y - radius));
    const sw = Math.min(CANVAS_WIDTH - sx, radius * 2 + 1);
    const sh = Math.min(CANVAS_HEIGHT - sy, radius * 2 + 1);
    if (sw <= 0 || sh <= 0) return null;
    const data = ctx.getImageData(sx, sy, sw, sh).data;
    let r = 0, g = 0, b = 0, a = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3] / 255;
      if (alpha <= 0.02) continue;
      r += data[i] * alpha;
      g += data[i + 1] * alpha;
      b += data[i + 2] * alpha;
      a += alpha;
      count++;
    }
    if (!count || a <= 0.01) return null;
    return { r: Math.round(r / a), g: Math.round(g / a), b: Math.round(b / a), a: Math.min(1, a / count) };
  }

  function pickColor(x, y) {
    const sample = sampleCanvasColor(x, y, 3);
    if (sample) setCurrentColor(rgbToHex(sample.r, sample.g, sample.b), true);
  }

  function floodFill(x, y) {
    if (!state.isLineArtReady) return;
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const paintData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const lineData = state.lineMaskCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;
    const fillRgb = hexToRgb(state.currentColor);
    const fillColor = [fillRgb.r, fillRgb.g, fillRgb.b, Math.round(state.opacity * 255)];
    const targetIndex = (iy * CANVAS_WIDTH + ix) * 4;
    if (isBarrier(lineData, targetIndex)) return;
    const target = [paintData.data[targetIndex], paintData.data[targetIndex + 1], paintData.data[targetIndex + 2], paintData.data[targetIndex + 3]];
    if (colorsNear(target, fillColor, 8)) return;

    const stack = [[ix, iy]];
    const visited = new Uint8Array(CANVAS_WIDTH * CANVAS_HEIGHT);
    while (stack.length) {
      const [cx, cy] = stack.pop();
      if (cx < 0 || cy < 0 || cx >= CANVAS_WIDTH || cy >= CANVAS_HEIGHT) continue;
      const pos = cy * CANVAS_WIDTH + cx;
      if (visited[pos]) continue;
      visited[pos] = 1;
      const idx = pos * 4;
      if (isBarrier(lineData, idx)) continue;
      const current = [paintData.data[idx], paintData.data[idx + 1], paintData.data[idx + 2], paintData.data[idx + 3]];
      if (!colorsNear(current, target, 24)) continue;
      paintData.data[idx] = fillColor[0];
      paintData.data[idx + 1] = fillColor[1];
      paintData.data[idx + 2] = fillColor[2];
      paintData.data[idx + 3] = fillColor[3];
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    ctx.putImageData(paintData, 0, 0);
  }

  function isBarrier(lineData, idx) {
    const a = lineData[idx + 3];
    if (a < 24) return false;
    const lum = (lineData[idx] + lineData[idx + 1] + lineData[idx + 2]) / 3;
    return lum < 235;
  }

  function colorsNear(a, b, tolerance) {
    return Math.abs(a[0] - b[0]) <= tolerance &&
      Math.abs(a[1] - b[1]) <= tolerance &&
      Math.abs(a[2] - b[2]) <= tolerance &&
      Math.abs(a[3] - b[3]) <= tolerance;
  }

  function pushUndoState() {
    try {
      state.undoStack.push(ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT));
      if (state.undoStack.length > 12) state.undoStack.shift();
      state.redoStack = [];
    } catch (error) {
      console.warn('Undo snapshot failed', error);
    }
  }

  function undo() {
    if (!state.undoStack.length) return;
    state.redoStack.push(ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT));
    const snapshot = state.undoStack.pop();
    ctx.putImageData(snapshot, 0, 0);
    scheduleSave();
  }

  function redo() {
    if (!state.redoStack.length) return;
    state.undoStack.push(ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT));
    const snapshot = state.redoStack.pop();
    ctx.putImageData(snapshot, 0, 0);
    scheduleSave();
  }

  function clearPainting() {
    pushUndoState();
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    scheduleSave();
  }

  function updateFinishButton() {
    const save = readCardSave(state.currentCard.id);
    const finished = !!save?.finished;
    els.finishButton.textContent = finished ? 'Finished ✓' : 'Mark finished';
    els.finishButton.classList.toggle('is-active', finished);
  }

  function toggleFinished() {
    const save = readCardSave(state.currentCard.id) || {};
    save.finished = !save.finished;
    writeCardSave(state.currentCard.id, save);
    updateFinishButton();
    renderLibrary();
  }

  function scheduleSave() {
    updateSavePill('saving', 'Saving');
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(saveCurrentPainting, 250);
  }

  function flushPainting() {
    if (!state.saveTimer || !state.isLineArtReady) return;
    clearTimeout(state.saveTimer);
    state.saveTimer = null;
    saveCurrentPainting();
  }

  function saveCurrentPainting() {
    state.saveTimer = null;
    if (!state.isLineArtReady) return;
    try {
      const save = readCardSave(state.currentCard.id) || {};
      save.painting = els.paintCanvas.toDataURL('image/png');
      writeCardSave(state.currentCard.id, save);
      updateSavePill('ready', 'Saved');
    } catch (error) {
      console.error(error);
      updateSavePill('error', 'Save error');
    }
  }

  window.LifeRPGColoringStudioBridge = {
    catalog: () => CARD_LIBRARY.map(card => ({id:card.id,title:card.title,src:card.assetCandidates[0],unlockId:card.unlockId,series:card.id.startsWith('kirishima-')?'Kirishima':'Bakugo'})),
    openCard: async id => {
      const card = CARD_LIBRARY.find(item => item.id === id);
      if (!card || !cardUnlocked(card)) return false;
      flushPainting();
      await loadCard(card);
      return true;
    },
    flush: flushPainting
  };

  function readCardSave(cardId) {
    try {
      return JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}:${cardId}`) || 'null');
    } catch {
      return null;
    }
  }

  function writeCardSave(cardId, payload) {
    localStorage.setItem(`${STORAGE_PREFIX}:${cardId}`, JSON.stringify(payload));
  }

  function updateSavePill(stateName, label) {
    els.savePill.dataset.state = stateName;
    els.savePill.querySelector('b').textContent = label;
  }

  function exportPng() {
    const composite = document.createElement('canvas');
    composite.width = CANVAS_WIDTH;
    composite.height = CANVAS_HEIGHT;
    const compositeCtx = composite.getContext('2d');
    compositeCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    compositeCtx.drawImage(els.paintCanvas, 0, 0);
    compositeCtx.drawImage(els.lineArt, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const link = document.createElement('a');
    link.href = composite.toDataURL('image/png');
    link.download = `${state.currentCard.id}-colored.png`;
    link.click();
  }

  function handleResize() {
    if (!state.hasManualView) fitToViewport(false);
  }

  function fitToViewport(force = false) {
    const rect = els.canvasViewport.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const scale = Math.min(rect.width / CANVAS_WIDTH, rect.height / CANVAS_HEIGHT);
    const panX = (rect.width - CANVAS_WIDTH * scale) / 2;
    const panY = (rect.height - CANVAS_HEIGHT * scale) / 2;
    applyTransform(scale, panX, panY, force ? true : false);
    state.hasManualView = false;
  }

  function resetZoom() {
    const rect = els.canvasViewport.getBoundingClientRect();
    const panX = (rect.width - CANVAS_WIDTH) / 2;
    const panY = (rect.height - CANVAS_HEIGHT) / 2;
    applyTransform(1, panX, panY, true);
  }

  function zoomBy(factor, clientX = null, clientY = null) {
    const rect = els.canvasViewport.getBoundingClientRect();
    const originX = clientX ?? (rect.left + rect.width / 2);
    const originY = clientY ?? (rect.top + rect.height / 2);
    const before = screenToCanvas(originX, originY) || { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
    const nextZoom = clamp(state.zoom * factor, state.minZoom, state.maxZoom);
    const panX = originX - rect.left - before.x * nextZoom;
    const panY = originY - rect.top - before.y * nextZoom;
    applyTransform(nextZoom, panX, panY, true);
  }

  function applyTransform(zoom, panX, panY, manual = true) {
    state.zoom = clamp(zoom, state.minZoom, state.maxZoom);
    state.panX = panX;
    state.panY = panY;
    state.hasManualView = manual || state.hasManualView;
    els.canvasStage.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
    els.zoomBadge.textContent = `${Math.round(state.zoom * 100)}%`;
  }

  function normalizeHex(value) {
    if (!value) return null;
    let hex = value.trim().replace(/^#/, '');
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
    return `#${hex.toLowerCase()}`;
  }

  function hexToRgb(hex) {
    const normalized = normalizeHex(hex);
    const int = parseInt(normalized.slice(1), 16);
    return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
  }

  function hexToRgba(hex, alpha) {
    const rgb = hexToRgb(hex);
    return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
  }

  function rgbToHex(r, g, b) {
    return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
  }

  function hsbToRgb(h, s, v) {
    const c = v * s;
    const hp = h / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    let r1 = 0, g1 = 0, b1 = 0;
    if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
    else if (hp < 2) [r1, g1, b1] = [x, c, 0];
    else if (hp < 3) [r1, g1, b1] = [0, c, x];
    else if (hp < 4) [r1, g1, b1] = [0, x, c];
    else if (hp < 5) [r1, g1, b1] = [x, 0, c];
    else [r1, g1, b1] = [c, 0, x];
    const m = v - c;
    return { r: Math.round((r1 + m) * 255), g: Math.round((g1 + m) * 255), b: Math.round((b1 + m) * 255) };
  }

  function hexToHsb(hex) {
    const { r, g, b } = hexToRgb(hex);
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
      if (max === rn) h = 60 * (((gn - bn) / d) % 6);
      else if (max === gn) h = 60 * ((bn - rn) / d + 2);
      else h = 60 * ((rn - gn) / d + 4);
    }
    if (h < 0) h += 360;
    const s = max === 0 ? 0 : d / max;
    return { h, s, b: max };
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
})();
