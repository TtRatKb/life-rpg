(() => {
  'use strict';

  const COMMONS = (filename, width = 1280) =>
    `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(filename)}?width=${width}`;

  const PACKS = {
    hands: {
      id: 'hands-existing-sets-v1',
      label: 'Existing web set · Hands & Gestures',
      match: [
        /open\s*\/\s*fist\s*\/\s*point/i,
        /hands? doing/i,
        /expressive hands?/i,
        /foreshortened hand/i,
        /hand gesture/i,
        /hands? & anatomy/i
      ],
      refs: [
        {
          src: COMMONS('Character Hand Drawing Reference Umangzart.jpg', 1080),
          title: 'Dynamic Hand Pose Sketches',
          note: 'Existing hand-study sheet with expressive, foreshortened hand poses. Useful for studying silhouette, finger rhythm and overlapping forms.',
          credit: 'Umang Thapa / Umangzart · CC BY-SA 4.0',
          source: 'https://commons.wikimedia.org/wiki/File:Character_Hand_Drawing_Reference_Umangzart.jpg',
          license: 'https://creativecommons.org/licenses/by-sa/4.0/'
        },
        {
          src: COMMONS('Hand pose illustration.jpg', 1200),
          title: 'Interlocking / Clasped Hands Study',
          note: 'Existing hand illustration focused on overlapping fingers and two-hand interaction.',
          credit: 'Shiva Theerthagiri · CC BY 4.0',
          source: 'https://commons.wikimedia.org/wiki/File:Hand_pose_illustration.jpg',
          license: 'https://creativecommons.org/licenses/by/4.0/'
        },
        {
          src: COMMONS('P. 151, 24 hand gestures, from Chirologia... Wellcome L0071892.jpg', 1200),
          title: '24 Hand Gestures',
          note: 'Existing historical gesture plate showing many different rhetorical hand shapes. Best used for gesture variety rather than modern anatomy rendering.',
          credit: 'Wellcome Collection · CC BY 4.0',
          source: 'https://commons.wikimedia.org/wiki/File:P._151,_24_hand_gestures,_from_Chirologia..._Wellcome_L0071892.jpg',
          license: 'https://creativecommons.org/licenses/by/4.0/'
        }
      ]
    },

    duo: {
      id: 'jookpub-conversation-set-v1',
      label: 'JookpubStock · Conversation / Duo Set · 9 refs',
      match: [
        /two characters/i,
        /moment before/i,
        /moment after/i,
        /mini story/i,
        /story illustration/i,
        /interaction/i,
        /conversation/i,
        /shared action/i
      ],
      refs: [
        '002.jpg','003.jpg','005.jpg','006.png','007.jpg','008.jpg','009.png','010.jpg','011.jpg'
      ].map((suffix, i) => ({
        src: COMMONS(`Jookpub pose reference - Conversation ${suffix}`, 1280),
        title: `Conversation Pose ${i + 1}`,
        note: 'Existing two-person reference from JookpubStock’s Conversation series. Focus on spacing, eye-lines, weight distribution and the relationship between both figures.',
        credit: 'JookpubStock · CC BY 3.0',
        source: `https://commons.wikimedia.org/wiki/File:Jookpub_pose_reference_-_Conversation_${suffix.replace('.', '_')}`,
        license: 'https://creativecommons.org/licenses/by/3.0/'
      }))
    }
  };

  let activePack = null;
  let activeIndex = 0;
  let applying = false;

  const el = (id) => document.getElementById(id);

  function textContext() {
    return [
      el('briefingTitle')?.textContent,
      el('workspaceTitle')?.textContent,
      el('referenceTitle')?.textContent,
      el('browserTitle')?.textContent,
      el('workspaceKicker')?.textContent,
      el('briefingSummary')?.textContent
    ].filter(Boolean).join(' · ');
  }

  function pickPack() {
    const ctx = textContext();
    if (!ctx.trim()) return null;
    return Object.values(PACKS).find(pack => pack.match.some(rx => rx.test(ctx))) || null;
  }

  function safeSourceHtml(ref) {
    const source = ref.source ? `<a href="${ref.source}" target="_blank" rel="noopener">source ↗</a>` : '';
    const license = ref.license ? `<a href="${ref.license}" target="_blank" rel="noopener">license ↗</a>` : '';
    return `<span>${ref.credit}</span>${source}${license}`;
  }

  function renderThumbs(pack) {
    const thumbs = el('referenceThumbs');
    if (!thumbs) return;
    thumbs.innerHTML = '';
    pack.refs.forEach((ref, index) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = index === activeIndex ? 'is-active' : '';
      b.setAttribute('aria-label', `Reference ${index + 1}`);
      const img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      img.src = ref.src;
      b.appendChild(img);
      b.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        activeIndex = index;
        applyReference(pack, activeIndex);
      }, true);
      thumbs.appendChild(b);
    });
  }

  function syncSecondaryReferenceImages(ref) {
    const floating = el('floatingReferenceImage');
    const underlay = el('referenceUnderlay');
    const dialog = el('referenceDialogImage');
    if (floating && !el('floatingReference')?.classList.contains('is-hidden')) floating.src = ref.src;
    if (underlay && !underlay.classList.contains('is-hidden')) underlay.src = ref.src;
    if (dialog && el('referenceDialog')?.open) dialog.src = ref.src;
    if (el('floatingReferenceTitle')) el('floatingReferenceTitle').textContent = ref.title;
    if (el('floatingReferenceNote')) el('floatingReferenceNote').textContent = ref.note;
    if (el('floatingReferenceCounter')) el('floatingReferenceCounter').textContent = `${activeIndex + 1}/${activePack.refs.length}`;
  }

  function applyReference(pack, index = 0) {
    if (!pack || applying) return;
    applying = true;
    activePack = pack;
    activeIndex = Math.max(0, Math.min(index, pack.refs.length - 1));
    const ref = pack.refs[activeIndex];

    const viewer = el('referenceAssetViewer');
    viewer?.classList.remove('is-hidden');
    el('referenceLink')?.classList.add('is-hidden');

    if (el('referenceTitle')) el('referenceTitle').textContent = pack === PACKS.hands ? 'Hands & Gestures references' : 'Duo / Interaction references';
    if (el('referenceText')) el('referenceText').textContent = pack === PACKS.hands
      ? 'Existing reference sheets from Wikimedia Commons. No generated placeholder art.'
      : 'Existing JookpubStock Conversation reference set from Wikimedia Commons.';

    const img = el('referenceImage');
    if (img) {
      img.referrerPolicy = 'no-referrer';
      img.crossOrigin = 'anonymous';
      img.src = ref.src;
      img.alt = ref.title;
    }
    if (el('referenceAssetTitle')) el('referenceAssetTitle').textContent = ref.title;
    if (el('referenceAssetNote')) el('referenceAssetNote').textContent = ref.note;
    if (el('referenceSourceLine')) el('referenceSourceLine').innerHTML = safeSourceHtml(ref);
    if (el('referencePackLabel')) el('referencePackLabel').textContent = pack.label;
    if (el('referenceCounter')) el('referenceCounter').textContent = `${activeIndex + 1}/${pack.refs.length}`;

    renderThumbs(pack);
    syncSecondaryReferenceImages(ref);

    // Update briefing preview as well, so the existing set is visible before Start.
    const brief = el('referenceBrief');
    if (brief && !brief.closest('.is-hidden')) {
      const existing = brief.querySelector('.co-pack-preview');
      if (existing) existing.remove();
      const wrap = document.createElement('div');
      wrap.className = 'co-pack-preview';
      wrap.style.cssText = 'display:grid;grid-template-columns:minmax(110px,180px) 1fr;gap:12px;align-items:center;margin-top:10px;padding:10px;border:1px solid rgba(95,48,77,.12);border-radius:14px;background:rgba(255,255,255,.72)';
      wrap.innerHTML = `<img src="${ref.src}" alt="${ref.title}" referrerpolicy="no-referrer" style="width:100%;max-height:160px;object-fit:contain;border-radius:10px;background:#f7f0f4"><div><small style="font-weight:800;letter-spacing:.06em;color:#9a5577">${pack.label}</small><strong style="display:block;margin:4px 0">${ref.title}</strong><p style="margin:0;color:#77636f;font-size:12px;line-height:1.45">${ref.note}</p></div>`;
      brief.appendChild(wrap);
    }

    applying = false;
  }

  function navigate(delta) {
    if (!activePack) return;
    activeIndex = (activeIndex + delta + activePack.refs.length) % activePack.refs.length;
    applyReference(activePack, activeIndex);
  }

  function randomize() {
    if (!activePack || activePack.refs.length < 2) return;
    let next = activeIndex;
    while (next === activeIndex) next = Math.floor(Math.random() * activePack.refs.length);
    activeIndex = next;
    applyReference(activePack, activeIndex);
  }

  function installNavOverride(id, action) {
    const node = el(id);
    if (!node || node.dataset.coPackBound) return;
    node.dataset.coPackBound = '1';
    node.addEventListener('click', (e) => {
      if (!activePack) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      action();
    }, true);
  }

  function installControls() {
    installNavOverride('referencePrev', () => navigate(-1));
    installNavOverride('referenceNext', () => navigate(1));
    installNavOverride('referenceRandom', randomize);
    installNavOverride('floatingReferencePrev', () => navigate(-1));
    installNavOverride('floatingReferenceNext', () => navigate(1));

    const open = el('referenceOpen');
    if (open && !open.dataset.coPackBound) {
      open.dataset.coPackBound = '1';
      open.addEventListener('click', (e) => {
        if (!activePack) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        const ref = activePack.refs[activeIndex];
        if (el('referenceDialogImage')) el('referenceDialogImage').src = ref.src;
        el('referenceDialog')?.showModal?.();
      }, true);
    }

    ['referenceFloatToggle','referenceUnderlayToggle'].forEach(id => {
      const node = el(id);
      if (!node || node.dataset.coSyncBound) return;
      node.dataset.coSyncBound = '1';
      node.addEventListener('click', () => {
        if (!activePack) return;
        setTimeout(() => syncSecondaryReferenceImages(activePack.refs[activeIndex]), 0);
      });
    });
  }

  function refresh() {
    installControls();
    const pack = pickPack();
    if (!pack) {
      activePack = null;
      return;
    }
    if (activePack?.id !== pack.id) activeIndex = 0;
    setTimeout(() => applyReference(pack, activeIndex), 20);
  }

  function init() {
    installControls();
    document.addEventListener('click', () => setTimeout(refresh, 60), true);

    const observer = new MutationObserver(() => {
      clearTimeout(init._t);
      init._t = setTimeout(refresh, 80);
    });
    ['briefingTitle','workspaceTitle','referenceTitle','briefingView','workspaceView'].forEach(id => {
      const node = el(id);
      if (node) observer.observe(node, { childList: true, subtree: true, characterData: true, attributes: true });
    });

    refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
