(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  let mode = 'dock'; // dock | float | underlay
  let dragState = null;
  let resizeState = null;

  function currentReferenceSrc() {
    const img = $('referenceImage');
    return img?.currentSrc || img?.getAttribute('src') || '';
  }

  function copyCurrentReference(target) {
    if (!target) return;
    const src = currentReferenceSrc();
    if (!src) return;
    target.removeAttribute('crossorigin');
    target.referrerPolicy = 'no-referrer';
    target.src = src;
    target.alt = $('referenceImage')?.alt || 'Practice reference';
  }

  function ensureModeControls() {
    const floatButton = $('referenceFloatToggle');
    const underlayButton = $('referenceUnderlayToggle');
    if (!floatButton || !underlayButton || $('referenceModeDock')) return;

    const oldRow = floatButton.closest('.tool-row');
    if (oldRow) oldRow.style.display = 'none';

    const wrap = document.createElement('div');
    wrap.className = 'reference-mode-wrap';
    wrap.innerHTML = `
      <small>REFERENCE DISPLAY</small>
      <div class="reference-mode-grid">
        <button id="referenceModeDock" type="button" class="is-active">▤ Dock</button>
        <button id="referenceModeFloat" type="button">▣ Canvas window</button>
        <button id="referenceModeUnderlay" type="button">◫ Underlay</button>
      </div>
      <p class="reference-mode-help">Dock keeps the reference at the side. Canvas window is draggable and resizable. Underlay places it faintly behind your drawing.</p>`;

    const viewer = $('referenceAssetViewer');
    (viewer || $('referencePanel'))?.insertAdjacentElement('afterend', wrap);

    $('referenceModeDock')?.addEventListener('click', () => setMode('dock'));
    $('referenceModeFloat')?.addEventListener('click', () => setMode('float'));
    $('referenceModeUnderlay')?.addEventListener('click', () => setMode('underlay'));
  }

  function moveFloatingReferenceIntoCanvas() {
    const viewport = $('canvasViewport');
    const floating = $('floatingReference');
    if (!viewport || !floating) return;
    if (floating.parentElement !== viewport) viewport.appendChild(floating);
    floating.classList.add('reference-float-in-canvas');

    if (!$('referenceFloatResize')) {
      const handle = document.createElement('div');
      handle.id = 'referenceFloatResize';
      handle.className = 'reference-float-resize';
      handle.setAttribute('aria-label', 'Resize reference window');
      floating.appendChild(handle);
      handle.addEventListener('pointerdown', beginResize, { passive: false });
    }

    // Never let drawing/panning handlers see pointer events that belong to the reference window.
    ['pointerdown','pointermove','pointerup','pointercancel','touchstart','touchmove','touchend','wheel'].forEach(type => {
      floating.addEventListener(type, (e) => e.stopPropagation());
    });

    $('floatingReferenceHandle')?.addEventListener('pointerdown', beginDrag, { passive: false });
  }

  function setMode(next) {
    mode = next;
    const floating = $('floatingReference');
    const underlay = $('referenceUnderlay');
    const opacityRow = $('referenceUnderlayOpacityRow');

    ['Dock','Float','Underlay'].forEach(name => {
      $('referenceMode' + name)?.classList.toggle('is-active', next === name.toLowerCase());
    });

    if (next === 'float') {
      if (underlay) underlay.classList.add('is-hidden');
      opacityRow?.classList.add('is-hidden');
      if (floating) {
        copyCurrentReference($('floatingReferenceImage'));
        floating.classList.remove('is-hidden');
        constrainFloatToViewport();
      }
    } else if (next === 'underlay') {
      floating?.classList.add('is-hidden');
      if (underlay) {
        copyCurrentReference(underlay);
        underlay.classList.remove('is-hidden');
        const opacity = Number($('referenceUnderlayOpacity')?.value || 20) / 100;
        underlay.style.opacity = String(opacity);
      }
      opacityRow?.classList.remove('is-hidden');
    } else {
      floating?.classList.add('is-hidden');
      underlay?.classList.add('is-hidden');
      opacityRow?.classList.add('is-hidden');
    }
  }

  function beginDrag(e) {
    if (mode !== 'float' || e.target.closest('button')) return;
    const floating = $('floatingReference');
    const viewport = $('canvasViewport');
    if (!floating || !viewport) return;
    e.preventDefault();
    e.stopPropagation();
    const f = floating.getBoundingClientRect();
    const v = viewport.getBoundingClientRect();
    dragState = {
      pointerId: e.pointerId,
      dx: e.clientX - f.left,
      dy: e.clientY - f.top,
      viewportLeft: v.left,
      viewportTop: v.top
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    window.addEventListener('pointermove', dragMove, true);
    window.addEventListener('pointerup', endDrag, true);
    window.addEventListener('pointercancel', endDrag, true);
  }

  function dragMove(e) {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    const floating = $('floatingReference');
    const viewport = $('canvasViewport');
    if (!floating || !viewport) return;
    e.preventDefault();
    e.stopPropagation();
    const v = viewport.getBoundingClientRect();
    const f = floating.getBoundingClientRect();
    const maxLeft = Math.max(0, v.width - f.width);
    const maxTop = Math.max(0, v.height - f.height);
    const left = Math.min(maxLeft, Math.max(0, e.clientX - v.left - dragState.dx));
    const top = Math.min(maxTop, Math.max(0, e.clientY - v.top - dragState.dy));
    floating.style.left = `${left}px`;
    floating.style.top = `${top}px`;
    floating.style.right = 'auto';
  }

  function endDrag(e) {
    if (!dragState || (e.pointerId != null && e.pointerId !== dragState.pointerId)) return;
    dragState = null;
    window.removeEventListener('pointermove', dragMove, true);
    window.removeEventListener('pointerup', endDrag, true);
    window.removeEventListener('pointercancel', endDrag, true);
  }

  function beginResize(e) {
    const floating = $('floatingReference');
    if (!floating || mode !== 'float') return;
    e.preventDefault();
    e.stopPropagation();
    const rect = floating.getBoundingClientRect();
    resizeState = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      width: rect.width,
      height: rect.height
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    window.addEventListener('pointermove', resizeMove, true);
    window.addEventListener('pointerup', endResize, true);
    window.addEventListener('pointercancel', endResize, true);
  }

  function resizeMove(e) {
    if (!resizeState || e.pointerId !== resizeState.pointerId) return;
    const floating = $('floatingReference');
    const viewport = $('canvasViewport');
    if (!floating || !viewport) return;
    e.preventDefault();
    e.stopPropagation();
    const f = floating.getBoundingClientRect();
    const v = viewport.getBoundingClientRect();
    const maxWidth = Math.max(180, v.right - f.left - 4);
    const maxHeight = Math.max(170, v.bottom - f.top - 4);
    const width = Math.min(maxWidth, Math.max(180, resizeState.width + e.clientX - resizeState.startX));
    const height = Math.min(maxHeight, Math.max(170, resizeState.height + e.clientY - resizeState.startY));
    floating.style.width = `${width}px`;
    floating.style.height = `${height}px`;
  }

  function endResize(e) {
    if (!resizeState || (e.pointerId != null && e.pointerId !== resizeState.pointerId)) return;
    resizeState = null;
    window.removeEventListener('pointermove', resizeMove, true);
    window.removeEventListener('pointerup', endResize, true);
    window.removeEventListener('pointercancel', endResize, true);
  }

  function constrainFloatToViewport() {
    const floating = $('floatingReference');
    const viewport = $('canvasViewport');
    if (!floating || !viewport || floating.classList.contains('is-hidden')) return;
    const f = floating.getBoundingClientRect();
    const v = viewport.getBoundingClientRect();
    let left = f.left - v.left;
    let top = f.top - v.top;
    left = Math.min(Math.max(0, left), Math.max(0, v.width - f.width));
    top = Math.min(Math.max(0, top), Math.max(0, v.height - f.height));
    floating.style.left = `${left}px`;
    floating.style.top = `${top}px`;
    floating.style.right = 'auto';
  }

  function bindOpacity() {
    const slider = $('referenceUnderlayOpacity');
    if (!slider) return;
    // Default lower than before for actual tracing / construction use.
    slider.value = '20';
    if ($('referenceUnderlayOpacityLabel')) $('referenceUnderlayOpacityLabel').textContent = '20%';
    slider.addEventListener('input', () => {
      const value = Math.max(5, Math.min(80, Number(slider.value || 20)));
      if ($('referenceUnderlayOpacityLabel')) $('referenceUnderlayOpacityLabel').textContent = `${value}%`;
      if ($('referenceUnderlay')) $('referenceUnderlay').style.opacity = String(value / 100);
    });
  }

  function overrideOldModeButtons() {
    // Existing buttons remain hidden for compatibility, but prevent old handlers from unexpectedly toggling state.
    ['referenceFloatToggle','referenceUnderlayToggle'].forEach(id => {
      $(id)?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
      }, true);
    });
    $('floatingReferenceClose')?.addEventListener('click', (e) => {
      if (mode === 'float') {
        e.preventDefault();
        e.stopImmediatePropagation();
        setMode('dock');
      }
    }, true);
  }

  function syncWhenReferenceChanges() {
    const main = $('referenceImage');
    if (!main) return;
    const observer = new MutationObserver(() => {
      setTimeout(() => {
        if (mode === 'float') copyCurrentReference($('floatingReferenceImage'));
        if (mode === 'underlay') copyCurrentReference($('referenceUnderlay'));
      }, 20);
    });
    observer.observe(main, { attributes: true, attributeFilter: ['src','alt'] });
    main.addEventListener('load', () => {
      if (mode === 'float') copyCurrentReference($('floatingReferenceImage'));
      if (mode === 'underlay') copyCurrentReference($('referenceUnderlay'));
    });
  }

  function init() {
    ensureModeControls();
    moveFloatingReferenceIntoCanvas();
    bindOpacity();
    overrideOldModeButtons();
    syncWhenReferenceChanges();
    setMode('dock');
    window.addEventListener('resize', constrainFloatToViewport);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
