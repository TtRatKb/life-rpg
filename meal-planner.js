(() => {
  const SCHEMA = 1;
  const DAY_MS = 86400000;
  const DEFAULT_TAG_LIMITS = { pasta: 1, potato: 1, rice: 1, tortilla: 1 };
  const ui = { tab: 'plan', weekOffset: 1, mode: 'main', editingDishId: null, swapBlockId: null };

  function app() { return window.LifeRPGApp; }
  function rootState() { return app()?.getState?.() || null; }
  function esc(value) { return app()?.escapeHtml?.(String(value ?? '')) || String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
  function attr(value) { return esc(value).replace(/`/g, '&#096;'); }
  function uid(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`; }
  function clamp(n, min, max) { return Math.min(max, Math.max(min, Number(n) || 0)); }
  function normalTag(value) { return String(value || '').trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '-'); }
  function displayTag(value) { return String(value || '').replace(/-/g, ' '); }

  function defaultPlanner() {
    return {
      schemaVersion: SCHEMA,
      dishes: [],
      plans: {},
      restockItems: [],
      settings: {
        defaultCooldownWeeks: 1,
        tagLimits: { ...DEFAULT_TAG_LIMITS },
        preferWeekendSpecials: true
      }
    };
  }

  function normalizeDish(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const tags = [...new Set((Array.isArray(raw.tags) ? raw.tags : String(raw.tags || '').split(','))
      .map(normalTag).filter(Boolean))];
    const cooldown = raw.cooldownWeeks === '' || raw.cooldownWeeks == null ? null : clamp(raw.cooldownWeeks, 0, 12);
    return {
      id: String(raw.id || uid('dish')),
      name: String(raw.name || 'Untitled dish').trim().slice(0, 140) || 'Untitled dish',
      days: clamp(raw.days || 1, 1, 4),
      tags,
      weekendSpecial: Boolean(raw.weekendSpecial),
      cooldownWeeks: cooldown,
      sourceUrl: String(raw.sourceUrl || '').trim().slice(0, 1400),
      ingredients: Array.isArray(raw.ingredients)
        ? raw.ingredients.map(v => String(v || '').trim()).filter(Boolean).slice(0, 160)
        : ingredientLines(raw.ingredients || ''),
      notes: String(raw.notes || '').trim().slice(0, 1600),
      active: raw.active !== false,
      createdAt: String(raw.createdAt || new Date().toISOString()),
      updatedAt: String(raw.updatedAt || raw.createdAt || new Date().toISOString())
    };
  }

  function ensureState() {
    const root = rootState();
    if (!root) return defaultPlanner();
    const current = root.mealPlanner && typeof root.mealPlanner === 'object' && !Array.isArray(root.mealPlanner)
      ? root.mealPlanner : {};
    const defaults = defaultPlanner();
    const planner = {
      ...defaults,
      ...current,
      schemaVersion: SCHEMA,
      dishes: (Array.isArray(current.dishes) ? current.dishes : []).map(normalizeDish).filter(Boolean),
      plans: current.plans && typeof current.plans === 'object' && !Array.isArray(current.plans) ? current.plans : {},
      restockItems: (Array.isArray(current.restockItems) ? current.restockItems : []).map(item => ({
        id: String(item?.id || uid('restock')),
        name: String(item?.name || '').trim().slice(0, 120),
        category: String(item?.category || 'Household').trim().slice(0, 60) || 'Household',
        need: Boolean(item?.need),
        active: item?.active !== false
      })).filter(item => item.name),
      settings: {
        ...defaults.settings,
        ...(current.settings || {}),
        defaultCooldownWeeks: clamp(current.settings?.defaultCooldownWeeks ?? 1, 0, 12),
        tagLimits: normalizeTagLimits(current.settings?.tagLimits),
        preferWeekendSpecials: current.settings?.preferWeekendSpecials !== false
      }
    };
    root.mealPlanner = planner;
    return planner;
  }

  function normalizeTagLimits(value) {
    const out = { ...DEFAULT_TAG_LIMITS };
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.entries(value).forEach(([key, limit]) => {
        const tag = normalTag(key);
        if (!tag) return;
        const n = Number(limit);
        if (Number.isFinite(n) && n >= 0) out[tag] = Math.floor(n);
      });
    }
    return out;
  }

  function ingredientLines(value) {
    return String(value || '').split(/\r?\n/).map(line => line.trim().replace(/^[•·*-]\s*/, '')).filter(Boolean).slice(0, 160);
  }

  function save(source = 'meal-planner') {
    app()?.saveState?.({ source });
    renderHomeSummary();
  }

  function localDateKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function parseLocalDate(key) {
    const [y,m,d] = String(key || '').split('-').map(Number);
    return new Date(y || 2000, Math.max(0, (m || 1) - 1), d || 1, 12, 0, 0, 0);
  }

  function mondayOf(date = new Date()) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
    const weekday = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - weekday);
    return d;
  }

  function weekStartForOffset(offset = ui.weekOffset) {
    const d = mondayOf(new Date());
    d.setDate(d.getDate() + Number(offset || 0) * 7);
    return d;
  }

  function weekKeyForOffset(offset = ui.weekOffset) { return localDateKey(weekStartForOffset(offset)); }
  function addDays(date, days) { const d = new Date(date); d.setDate(d.getDate() + Number(days || 0)); return d; }
  function weeksBetween(a, b) { return Math.round((mondayOf(a) - mondayOf(b)) / (7 * DAY_MS)); }

  function planFor(offset = ui.weekOffset) {
    const s = ensureState();
    return s.plans[weekKeyForOffset(offset)] || null;
  }

  function planDates(offset = ui.weekOffset) {
    const start = weekStartForOffset(offset);
    return Array.from({length: 7}, (_, index) => addDays(start, index));
  }

  function dishById(id) { return ensureState().dishes.find(item => item.id === id) || null; }
  function cooldownFor(dish) {
    return dish?.cooldownWeeks == null ? ensureState().settings.defaultCooldownWeeks : clamp(dish.cooldownWeeks, 0, 12);
  }

  function lastCommittedWeekForDish(dishId, targetWeekKey = null) {
    const target = targetWeekKey ? parseLocalDate(targetWeekKey) : new Date(8640000000000000);
    let best = null;
    Object.values(ensureState().plans || {}).forEach(plan => {
      if (!plan || plan.status !== 'committed' || !Array.isArray(plan.blocks)) return;
      const start = parseLocalDate(plan.weekStart || '');
      if (start >= target) return;
      if (!plan.blocks.some(block => block?.dishId === dishId)) return;
      if (!best || start > best) best = start;
    });
    return best;
  }

  function cooldownInfo(dish, targetWeekKey) {
    const last = lastCommittedWeekForDish(dish.id, targetWeekKey);
    if (!last) return { blocked: false, weeksAgo: null, last: null };
    const diff = weeksBetween(parseLocalDate(targetWeekKey), last);
    const cooldown = cooldownFor(dish);
    return { blocked: diff <= cooldown, weeksAgo: diff, last };
  }

  function tagCounts(blocks, excludeBlockId = null) {
    const counts = {};
    (blocks || []).forEach(block => {
      if (!block?.dishId || block.id === excludeBlockId) return;
      const dish = dishById(block.dishId);
      (dish?.tags || []).forEach(tag => { counts[tag] = (counts[tag] || 0) + 1; });
    });
    return counts;
  }

  function candidateAllowed(dish, ctx) {
    if (!dish || dish.active === false) return false;
    if (ctx.used?.has(dish.id)) return false;
    if (ctx.duration != null && Number(dish.days) !== Number(ctx.duration)) return false;
    if (Number(dish.days) > Number(ctx.remaining)) return false;
    if (cooldownInfo(dish, ctx.weekKey).blocked) return false;
    const limits = ensureState().settings.tagLimits || {};
    for (const tag of dish.tags || []) {
      const limit = Number(limits[tag]);
      if (Number.isFinite(limit) && limit > 0 && (Number(ctx.tagCounts?.[tag] || 0) + 1) > limit) return false;
    }
    return true;
  }

  function candidateScore(dish, startIndex, weekKey) {
    let score = 10;
    const last = lastCommittedWeekForDish(dish.id, weekKey);
    if (!last) score += 2.5;
    else score += Math.min(4, Math.max(0, weeksBetween(parseLocalDate(weekKey), last)) * 0.45);
    const touchesWeekend = Array.from({length: Number(dish.days || 1)}, (_, i) => startIndex + i).some(index => index >= 5);
    if (ensureState().settings.preferWeekendSpecials) {
      if (dish.weekendSpecial && touchesWeekend) score += 5;
      else if (dish.weekendSpecial && !touchesWeekend) score -= 1.5;
      else if (!dish.weekendSpecial && touchesWeekend) score -= 0.35;
    }
    score += Math.random() * 1.8;
    return score;
  }

  function generatePlan(weekKey = weekKeyForOffset()) {
    const s = ensureState();
    const dishes = s.dishes.filter(dish => dish.active !== false);
    const targetStart = parseLocalDate(weekKey);
    if (!dishes.length) return { weekStart: weekKey, status: 'draft', blocks: [], generatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };

    let best = { coverage: -1, score: -Infinity, blocks: [] };
    const visit = (index, blocks, used, counts, score, flexLeft) => {
      const coverage = blocks.reduce((sum, block) => sum + Number(block.duration || 0), 0);
      if (coverage > best.coverage || (coverage === best.coverage && score > best.score)) {
        best = { coverage, score, blocks: blocks.map(block => ({...block})) };
      }
      if (index >= 7 || coverage >= 7) return;

      const remaining = 7 - index;
      const candidates = dishes
        .filter(dish => candidateAllowed(dish, { used, tagCounts: counts, remaining, weekKey }))
        .map(dish => ({ dish, score: candidateScore(dish, index, weekKey) }))
        .sort((a,b) => b.score - a.score)
        .slice(0, 12);

      for (const entry of candidates) {
        const dish = entry.dish;
        const nextCounts = { ...counts };
        (dish.tags || []).forEach(tag => { nextCounts[tag] = (nextCounts[tag] || 0) + 1; });
        const block = { id: uid('meal'), dishId: dish.id, start: index, duration: Number(dish.days || 1) };
        visit(index + block.duration, [...blocks, block], new Set([...used, dish.id]), nextCounts, score + entry.score, flexLeft);
        if (best.coverage === 7 && best.score > score + 35) break;
      }

      if (flexLeft > 0) {
        const block = { id: uid('flex'), dishId: null, start: index, duration: 1, label: 'Open / leftovers' };
        visit(index + 1, [...blocks, block], used, counts, score - 7, flexLeft - 1);
      }
    };

    visit(0, [], new Set(), {}, 0, 1);
    return {
      weekStart: localDateKey(targetStart),
      status: 'draft',
      blocks: best.blocks,
      generatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      committedAt: null
    };
  }

  function generateCurrentWeek() {
    const s = ensureState();
    const key = weekKeyForOffset();
    const generated = generatePlan(key);
    s.plans[key] = generated;
    save('meal-plan-generate');
    render();
    if (!generated.blocks.length) app()?.showToast?.('Add a few dishes first, then Life RPG can build the week.');
    else if (coveredDays(generated) < 7) app()?.showToast?.(`Meal plan built for ${coveredDays(generated)}/7 days. Add a 1-day dish or loosen a rule for a full week.`);
    else app()?.showToast?.('🍲 Week planned. Swap anything that does not feel right.');
  }

  function coveredDays(plan) { return (plan?.blocks || []).reduce((sum, block) => sum + Number(block.duration || 0), 0); }

  function commitCurrentPlan() {
    const plan = planFor();
    if (!plan?.blocks?.some(block => block.dishId)) {
      app()?.showToast?.('Generate a meal plan first.');
      return;
    }
    plan.status = 'committed';
    plan.committedAt = new Date().toISOString();
    plan.updatedAt = new Date().toISOString();
    save('meal-plan-commit');
    render();
    app()?.showToast?.('✓ Meal plan saved · cooldowns now use this week.');
  }

  function compatibleSwaps(blockId) {
    const plan = planFor();
    const target = plan?.blocks?.find(block => block.id === blockId);
    if (!plan || !target) return [];
    const counts = tagCounts(plan.blocks, blockId);
    const used = new Set(plan.blocks.filter(block => block.id !== blockId && block.dishId).map(block => block.dishId));
    return ensureState().dishes
      .filter(dish => dish.id !== target.dishId)
      .filter(dish => candidateAllowed(dish, {
        used,
        tagCounts: counts,
        remaining: target.duration,
        duration: target.duration,
        weekKey: plan.weekStart
      }))
      .map(dish => ({ dish, score: candidateScore(dish, Number(target.start || 0), plan.weekStart) }))
      .sort((a,b) => b.score - a.score)
      .slice(0, 18)
      .map(item => item.dish);
  }

  function applySwap(dishId) {
    const plan = planFor();
    const block = plan?.blocks?.find(item => item.id === ui.swapBlockId);
    if (!plan || !block) return;
    const dish = dishById(dishId);
    if (!dish) return;
    block.dishId = dish.id;
    block.duration = dish.days;
    delete block.label;
    plan.updatedAt = new Date().toISOString();
    if (plan.status === 'committed') plan.committedAt = new Date().toISOString();
    ui.mode = 'main';
    ui.swapBlockId = null;
    save('meal-plan-swap');
    render();
    app()?.showToast?.(`↻ Swapped to ${dish.name}.`);
  }

  function weekLabel(offset = ui.weekOffset) {
    const dates = planDates(offset);
    const a = dates[0].toLocaleDateString('en-GB', { day:'numeric', month:'short' });
    const b = dates[6].toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
    return `${a} – ${b}`;
  }

  function lastUsedLabel(dish, targetWeekKey = weekKeyForOffset()) {
    const last = lastCommittedWeekForDish(dish.id, targetWeekKey);
    if (!last) return 'Not planned yet';
    const diff = weeksBetween(parseLocalDate(targetWeekKey), last);
    if (diff === 1) return 'Planned last week';
    return `Last planned ${diff} weeks ago`;
  }

  function openPlanner(tab = 'plan') {
    ui.tab = tab;
    ui.mode = 'main';
    ui.editingDishId = null;
    ui.swapBlockId = null;
    render();
    const nav = document.querySelector('.nav-button[data-view="meals"]');
    if (nav && !document.getElementById('view-meals')?.classList.contains('active')) nav.click();
  }

  function closePlanner() {
    document.querySelector('.nav-button[data-view="basecamp"]')?.click();
  }

  function render() {
    const page = document.getElementById('mealPlannerPageV314dz7');
    if (!page) return;
    if (ui.mode === 'dish') renderDishEditor(page);
    else if (ui.mode === 'swap') renderSwap(page);
    else renderMain(page);
    bindRenderedInputs(page);
  }

  function renderMain(page) {
    page.innerHTML = `<div class="meal-planner-shell-v314dz6 meal-planner-page-shell-v314dz7">
      <div class="meal-planner-head-v314dz6 meal-planner-page-head-v314dz7">
        <div><p class="eyebrow">ALLTAG · WEEKLY FOOD RHYTHM</p><h1>Essensplan 🍲</h1><p>Plane eure echte Woche — mit Cooldowns, Essensfamilien, Wochenendgerichten und einer Einkaufsliste, die daraus direkt entsteht.</p></div>
        <div class="meal-planner-page-summary-v314dz7"><span>WEEKLY UTILITY</span><strong>${esc(ensureState().dishes.length)} Gerichte</strong></div>
      </div>
      <nav class="meal-planner-tabs-v314dz6" aria-label="Meal planner sections">
        ${tabButton('plan','Week')} ${tabButton('dishes','Dishes')} ${tabButton('shopping','Shopping')} ${tabButton('rules','Rules')}
      </nav>
      <div class="meal-planner-body-v314dz6">${ui.tab === 'plan' ? renderPlanTab() : ui.tab === 'dishes' ? renderDishesTab() : ui.tab === 'shopping' ? renderShoppingTab() : renderRulesTab()}</div>
    </div>`;
  }

  function tabButton(id, label) { return `<button type="button" class="${ui.tab === id ? 'is-active' : ''}" data-meal-tab="${id}">${label}</button>`; }

  function renderPlanTab() {
    const plan = planFor();
    const dates = planDates();
    const s = ensureState();
    const planned = plan?.blocks?.filter(block => block.dishId).length || 0;
    return `<section class="meal-week-v314dz6">
      <div class="meal-week-toolbar-v314dz6">
        <button class="secondary-button" type="button" data-meal-action="prev-week">←</button>
        <div><small>${ui.weekOffset === 0 ? 'THIS WEEK' : ui.weekOffset === 1 ? 'NEXT WEEK' : 'WEEK'}</small><h3>${esc(weekLabel())}</h3></div>
        <button class="secondary-button" type="button" data-meal-action="next-week">→</button>
      </div>
      <div class="meal-plan-actions-v314dz6">
        <button class="primary-button" type="button" data-meal-action="generate" ${s.dishes.some(d => d.active !== false) ? '' : 'disabled'}>✦ ${plan ? 'Generate another plan' : 'Build this week'}</button>
        ${plan ? `<button class="secondary-button" type="button" data-meal-action="commit">${plan.status === 'committed' ? '✓ Plan in use' : 'Use this plan'}</button>` : ''}
        <span>${planned} dish${planned === 1 ? '' : 'es'} · ${plan ? `${coveredDays(plan)}/7 days` : 'not planned yet'}</span>
      </div>
      ${!s.dishes.length ? `<div class="meal-empty-v314dz6"><span>🍲</span><strong>Start with the dishes you actually cook.</strong><p>About 15–20 is already enough for useful weekly plans.</p><button class="primary-button" type="button" data-meal-tab="dishes">Add dishes</button></div>` : renderWeekGrid(plan, dates)}
      <div class="meal-plan-note-v314dz6"><strong>How the planner thinks</strong><span>Dish cooldowns block recent repeats. Tag limits stop combinations such as two pasta, potato, rice or tortilla meals in one week. “Weekend special” meals get a preference on Saturday/Sunday, not a hard lock.</span></div>
    </section>`;
  }

  function renderWeekGrid(plan, dates) {
    const blockByDay = new Map();
    (plan?.blocks || []).forEach(block => {
      for (let i = 0; i < Number(block.duration || 1); i += 1) blockByDay.set(Number(block.start || 0) + i, { block, part: i });
    });
    return `<div class="meal-week-grid-v314dz6">${dates.map((date,index) => {
      const hit = blockByDay.get(index);
      if (!hit) return dayCard(date, null, null, 0);
      return dayCard(date, hit.block, hit.block.dishId ? dishById(hit.block.dishId) : null, hit.part);
    }).join('')}</div>`;
  }

  function dayCard(date, block, dish, part) {
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    if (!block) return `<article class="meal-day-card-v314dz6 is-open ${weekend ? 'is-weekend' : ''}"><small>${esc(date.toLocaleDateString('en-GB',{weekday:'short'}).toUpperCase())}</small><b>${esc(date.toLocaleDateString('en-GB',{day:'numeric',month:'short'}))}</b><div><strong>Open</strong><span>No meal assigned</span></div></article>`;
    if (!dish) return `<article class="meal-day-card-v314dz6 is-open ${weekend ? 'is-weekend' : ''}"><small>${esc(date.toLocaleDateString('en-GB',{weekday:'short'}).toUpperCase())}</small><b>${esc(date.toLocaleDateString('en-GB',{day:'numeric',month:'short'}))}</b><div><strong>${esc(block.label || 'Open / leftovers')}</strong><span>Flexible day</span>${part === 0 ? `<button type="button" class="text-button" data-meal-swap="${attr(block.id)}">Find a 1-day dish ↻</button>` : ''}</div></article>`;
    return `<article class="meal-day-card-v314dz6 ${weekend ? 'is-weekend' : ''} ${dish.weekendSpecial ? 'is-special' : ''}">
      <small>${esc(date.toLocaleDateString('en-GB',{weekday:'short'}).toUpperCase())}</small><b>${esc(date.toLocaleDateString('en-GB',{day:'numeric',month:'short'}))}</b>
      <div><strong>${part ? `Leftovers · ${esc(dish.name)}` : esc(dish.name)}</strong><span>${part ? `Day ${part + 1}/${dish.days}` : dish.days > 1 ? `${dish.days} days` : '1 day'}${dish.weekendSpecial ? ' · ✦ weekend' : ''}</span>
      ${part === 0 ? `<div class="meal-day-actions-v314dz6"><button type="button" class="text-button" data-meal-swap="${attr(block.id)}">Swap ↻</button>${dish.sourceUrl ? `<button type="button" class="text-button" data-meal-open-url="${attr(dish.id)}">Recipe ↗</button>` : ''}</div>` : ''}</div>
    </article>`;
  }

  function renderDishesTab() {
    const s = ensureState();
    const targetWeek = weekKeyForOffset();
    return `<section>
      <div class="meal-section-heading-v314dz6"><div><small>DISH LIBRARY</small><h3>${s.dishes.length} dishes</h3><p>Keep this lightweight. Name, days and tags are enough for planning; ingredients are only needed if you want the shopping list.</p></div><button class="primary-button" type="button" data-meal-action="new-dish">＋ Add dish</button></div>
      ${s.dishes.length ? `<div class="meal-dish-grid-v314dz6">${s.dishes.map(dish => {
        const cd = cooldownInfo(dish, targetWeek);
        return `<article class="meal-dish-card-v314dz6 ${dish.active === false ? 'is-inactive' : ''}"><div class="meal-dish-title-v314dz6"><div><strong>${esc(dish.name)}</strong><span>${dish.days} day${dish.days === 1 ? '' : 's'}${dish.weekendSpecial ? ' · ✦ weekend special' : ''}</span></div><button class="secondary-button" type="button" data-meal-edit="${attr(dish.id)}">Edit</button></div><div class="meal-tags-v314dz6">${dish.tags.length ? dish.tags.map(tag => `<span>#${esc(displayTag(tag))}</span>`).join('') : '<span class="is-muted">no tags</span>'}</div><small>${esc(lastUsedLabel(dish, targetWeek))}${cd.blocked ? ` · cooldown for this week` : ''}</small></article>`;
      }).join('')}</div>` : `<div class="meal-empty-v314dz6"><span>🥘</span><strong>No dishes yet.</strong><p>Add the meals that already belong to your real rotation. You do not need recipes for all of them.</p></div>`}
    </section>`;
  }

  function renderShoppingTab() {
    const plan = planFor();
    const s = ensureState();
    const mealBlocks = (plan?.blocks || []).filter(block => block.dishId).map(block => ({ block, dish: dishById(block.dishId) })).filter(x => x.dish);
    const hasIngredients = mealBlocks.some(x => x.dish.ingredients?.length);
    return `<section>
      <div class="meal-section-heading-v314dz6"><div><small>WEEKLY SHOP</small><h3>${esc(weekLabel())}</h3><p>The recipe list and the recurring stock check stay separate, then combine when you copy.</p></div><button class="primary-button" type="button" data-meal-action="copy-shopping" ${plan ? '' : 'disabled'}>Copy shopping list</button></div>
      <div class="meal-shopping-columns-v314dz6">
        <section class="meal-shopping-card-v314dz6"><div class="meal-shopping-card-head-v314dz6"><div><small>MEALS</small><h4>Ingredients from the plan</h4></div></div>
          ${plan ? (hasIngredients ? mealBlocks.map(({dish}) => `<div class="meal-ingredient-group-v314dz6"><strong>${esc(dish.name)}</strong>${dish.ingredients.length ? `<ul>${dish.ingredients.map(line => `<li>□ ${esc(line)}</li>`).join('')}</ul>` : '<p>No ingredients saved.</p>'}</div>`).join('') : '<p class="muted">The week is planned, but these dishes do not have ingredients saved yet. You can add them gradually when useful.</p>') : '<p class="muted">Build a week first.</p>'}
        </section>
        <section class="meal-shopping-card-v314dz6"><div class="meal-shopping-card-head-v314dz6"><div><small>STOCK CHECK</small><h4>Do we still have it?</h4></div></div>
          <form class="meal-restock-add-v314dz6" data-meal-restock-form><input name="name" maxlength="120" placeholder="Coffee beans, toilet paper…" required><select name="category"><option>Food staples</option><option>Household</option><option>Bathroom</option><option>Other</option></select><button class="secondary-button" type="submit">Add</button></form>
          ${s.restockItems.length ? `<div class="meal-restock-list-v314dz6">${s.restockItems.map(item => `<label><input type="checkbox" data-meal-restock-need="${attr(item.id)}" ${item.need ? 'checked' : ''}><span><strong>${esc(item.name)}</strong><small>${esc(item.category)}</small></span><button type="button" class="text-button danger" data-meal-restock-delete="${attr(item.id)}">×</button></label>`).join('')}</div>` : '<p class="muted">Add recurring things you want to check before shopping.</p>'}
        </section>
      </div>
    </section>`;
  }

  function renderRulesTab() {
    const s = ensureState();
    const limits = Object.entries(s.settings.tagLimits || {}).sort(([a],[b]) => a.localeCompare(b));
    return `<section>
      <div class="meal-section-heading-v314dz6"><div><small>PLANNING RULES</small><h3>Variety without overthinking it.</h3><p>Tags are your conflict groups. Put both Burritos and Enchilada Lasagne under #tortilla and set that tag to 1 per week.</p></div></div>
      <div class="meal-rules-grid-v314dz6">
        <section class="meal-rule-card-v314dz6"><label><span>Default dish cooldown</span><select data-meal-setting="defaultCooldownWeeks">${[0,1,2,3,4].map(n => `<option value="${n}" ${s.settings.defaultCooldownWeeks === n ? 'selected' : ''}>${n === 0 ? 'No cooldown' : `${n} full week${n === 1 ? '' : 's'}`}</option>`).join('')}</select><small>1 means: if you had it last week, it cannot appear again this week.</small></label><label class="meal-check-row-v314dz6"><input type="checkbox" data-meal-setting="preferWeekendSpecials" ${s.settings.preferWeekendSpecials ? 'checked' : ''}><span>Prefer dishes marked “weekend special” on Saturday/Sunday.</span></label></section>
        <section class="meal-rule-card-v314dz6"><div class="meal-shopping-card-head-v314dz6"><div><small>TAG LIMITS</small><h4>Maximum different dishes per week</h4></div></div><form class="meal-tag-rule-add-v314dz6" data-meal-tag-rule-form><input name="tag" maxlength="60" placeholder="e.g. mexican" required><input name="limit" type="number" min="1" max="7" value="1" required><button class="secondary-button" type="submit">Add rule</button></form><div class="meal-tag-rules-v314dz6">${limits.map(([tag,limit]) => `<div><span>#${esc(displayTag(tag))}</span><label>max <input type="number" min="1" max="7" value="${Number(limit) || 1}" data-meal-tag-limit="${attr(tag)}"></label><button class="text-button danger" type="button" data-meal-tag-delete="${attr(tag)}">×</button></div>`).join('')}</div></section>
      </div>
    </section>`;
  }

  function renderDishEditor(dialog) {
    const s = ensureState();
    const dish = ui.editingDishId ? s.dishes.find(item => item.id === ui.editingDishId) : null;
    const d = dish || normalizeDish({ name:'', days:2, tags:[], cooldownWeeks:null, ingredients:[] });
    dialog.innerHTML = `<div class="meal-planner-shell-v314dz6 meal-planner-page-shell-v314dz7 is-editor"><div class="meal-planner-head-v314dz6"><div><p class="eyebrow">${dish ? 'EDIT DISH' : 'NEW DISH'}</p><h2>${dish ? esc(dish.name) : 'Add a meal'}</h2><p>A recipe is optional. The planner mainly needs duration, tags and cooldown.</p></div><button class="close-button" type="button" data-meal-action="editor-cancel" aria-label="Back">×</button></div>
      <form class="meal-dish-form-v314dz6" data-meal-dish-form>
        <label class="is-wide"><span>Name</span><input name="name" maxlength="140" value="${attr(dish?.name || '')}" placeholder="Burritos" required></label>
        <label><span>Feeds us for</span><select name="days">${[1,2,3,4].map(n => `<option value="${n}" ${Number(dish?.days || 2) === n ? 'selected' : ''}>${n} day${n === 1 ? '' : 's'}</option>`).join('')}</select></label>
        <label><span>Cooldown</span><select name="cooldownWeeks"><option value="" ${dish?.cooldownWeeks == null ? 'selected' : ''}>Use default</option>${[0,1,2,3,4].map(n => `<option value="${n}" ${dish?.cooldownWeeks === n ? 'selected' : ''}>${n === 0 ? 'None' : `${n} week${n === 1 ? '' : 's'}`}</option>`).join('')}</select></label>
        <label class="is-wide"><span>Tags / conflict groups</span><input name="tags" maxlength="500" value="${attr((dish?.tags || []).join(', '))}" placeholder="tortilla, mexican, veggie"><small>Comma separated. A tag only becomes a weekly limit when you add a rule for it.</small></label>
        <label class="meal-check-row-v314dz6 is-wide"><input name="weekendSpecial" type="checkbox" ${dish?.weekendSpecial ? 'checked' : ''}><span>Weekend / special meal — prefer this on Saturday or Sunday.</span></label>
        <label class="is-wide"><span>Recipe / Crouton / source URL <small>optional</small></span><input name="sourceUrl" type="text" inputmode="url" maxlength="1400" value="${attr(dish?.sourceUrl || '')}" placeholder="https://…"></label>
        <label class="is-wide"><span>Ingredients <small>optional · one per line</small></span><textarea name="ingredients" rows="9" placeholder="Paste the ingredient list here…">${esc((dish?.ingredients || []).join('\n'))}</textarea><small>Only plain text is stored — no images or webpage data.</small></label>
        <label class="is-wide"><span>Notes <small>optional</small></span><textarea name="notes" rows="3" maxlength="1600" placeholder="Anything useful when deciding…">${esc(dish?.notes || '')}</textarea></label>
        <div class="meal-editor-actions-v314dz6 is-wide"><button class="secondary-button" type="button" data-meal-action="editor-cancel">Cancel</button>${dish ? `<button class="text-button danger" type="button" data-meal-delete="${attr(dish.id)}">Delete dish</button>` : ''}<button class="primary-button" type="submit">Save dish</button></div>
      </form></div>`;
  }

  function renderSwap(dialog) {
    const plan = planFor();
    const block = plan?.blocks?.find(item => item.id === ui.swapBlockId);
    const current = block?.dishId ? dishById(block.dishId) : null;
    const swaps = compatibleSwaps(ui.swapBlockId);
    dialog.innerHTML = `<div class="meal-planner-shell-v314dz6 meal-planner-page-shell-v314dz7 is-editor"><div class="meal-planner-head-v314dz6"><div><p class="eyebrow">SWAP · ${esc(weekLabel())}</p><h2>${current ? esc(current.name) : 'Flexible day'}</h2><p>Only alternatives that still fit the rest of this week are shown.</p></div><button class="close-button" type="button" data-meal-action="swap-cancel" aria-label="Back">×</button></div>
      <div class="meal-swap-list-v314dz6">${swaps.length ? swaps.map(dish => `<button type="button" data-meal-apply-swap="${attr(dish.id)}"><span><strong>${esc(dish.name)}</strong><small>${dish.days} day${dish.days === 1 ? '' : 's'} · ${esc((dish.tags || []).map(tag => `#${displayTag(tag)}`).join(' · ') || 'no conflict tags')}</small></span><b>Choose</b></button>`).join('') : `<div class="meal-empty-v314dz6"><span>↻</span><strong>No compatible swap right now.</strong><p>For this slot, every same-length dish is either on cooldown, already in the week or would break one of your tag limits.</p></div>`}</div><div class="meal-editor-actions-v314dz6"><button class="secondary-button" type="button" data-meal-action="swap-cancel">Back to week</button></div></div>`;
  }

  function bindRenderedInputs(dialog) {
    dialog.querySelectorAll('[data-meal-setting]').forEach(input => input.addEventListener('change', () => {
      const s = ensureState();
      const key = input.dataset.mealSetting;
      s.settings[key] = input.type === 'checkbox' ? input.checked : clamp(input.value, 0, 12);
      save('meal-planner-settings');
      render();
    }));
    dialog.querySelectorAll('[data-meal-tag-limit]').forEach(input => input.addEventListener('change', () => {
      ensureState().settings.tagLimits[input.dataset.mealTagLimit] = clamp(input.value, 1, 7);
      save('meal-planner-tag-limit');
    }));
    dialog.querySelectorAll('[data-meal-restock-need]').forEach(input => input.addEventListener('change', () => {
      const item = ensureState().restockItems.find(x => x.id === input.dataset.mealRestockNeed);
      if (item) item.need = input.checked;
      save('meal-planner-restock-check');
    }));
  }

  function handleClick(event) {
    const target = event.target.closest('button,[data-meal-tab],[data-meal-setting]');
    if (!target) return;
    if (target.dataset.mealTab) { ui.tab = target.dataset.mealTab; ui.mode = 'main'; render(); return; }
    if (target.dataset.mealEdit) { ui.mode = 'dish'; ui.editingDishId = target.dataset.mealEdit; render(); return; }
    if (target.dataset.mealSwap) { ui.mode = 'swap'; ui.swapBlockId = target.dataset.mealSwap; render(); return; }
    if (target.dataset.mealApplySwap) { applySwap(target.dataset.mealApplySwap); return; }
    if (target.dataset.mealOpenUrl) {
      const dish = dishById(target.dataset.mealOpenUrl);
      if (dish?.sourceUrl) window.open(dish.sourceUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (target.dataset.mealDelete) { deleteDish(target.dataset.mealDelete); return; }
    if (target.dataset.mealRestockDelete) { deleteRestock(target.dataset.mealRestockDelete); return; }
    if (target.dataset.mealTagDelete) { deleteTagRule(target.dataset.mealTagDelete); return; }
    switch (target.dataset.mealAction) {
      case 'close': closePlanner(); break;
      case 'prev-week': ui.weekOffset = Math.max(-8, ui.weekOffset - 1); render(); break;
      case 'next-week': ui.weekOffset = Math.min(52, ui.weekOffset + 1); render(); break;
      case 'generate': generateCurrentWeek(); break;
      case 'commit': commitCurrentPlan(); break;
      case 'new-dish': ui.mode = 'dish'; ui.editingDishId = null; render(); break;
      case 'editor-cancel': ui.mode = 'main'; ui.tab = 'dishes'; ui.editingDishId = null; render(); break;
      case 'swap-cancel': ui.mode = 'main'; ui.swapBlockId = null; ui.tab = 'plan'; render(); break;
      case 'copy-shopping': copyShoppingList(); break;
      default: break;
    }
  }

  function handleSubmit(event) {
    const form = event.target;
    if (form.matches('[data-meal-dish-form]')) { event.preventDefault(); saveDishForm(form); }
    else if (form.matches('[data-meal-restock-form]')) { event.preventDefault(); addRestockForm(form); }
    else if (form.matches('[data-meal-tag-rule-form]')) { event.preventDefault(); addTagRuleForm(form); }
  }

  function saveDishForm(form) {
    const data = new FormData(form);
    const s = ensureState();
    const existing = ui.editingDishId ? s.dishes.find(item => item.id === ui.editingDishId) : null;
    const now = new Date().toISOString();
    const dish = normalizeDish({
      ...(existing || {}),
      id: existing?.id || uid('dish'),
      name: data.get('name'),
      days: data.get('days'),
      tags: String(data.get('tags') || '').split(','),
      weekendSpecial: data.get('weekendSpecial') === 'on',
      cooldownWeeks: data.get('cooldownWeeks') === '' ? null : data.get('cooldownWeeks'),
      sourceUrl: data.get('sourceUrl'),
      ingredients: ingredientLines(data.get('ingredients')),
      notes: data.get('notes'),
      active: true,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    });
    if (existing) Object.assign(existing, dish);
    else s.dishes.push(dish);
    save('meal-planner-dish');
    ui.mode = 'main'; ui.tab = 'dishes'; ui.editingDishId = null;
    render();
    app()?.showToast?.(`🍲 ${dish.name} saved.`);
  }

  function deleteDish(id) {
    const s = ensureState();
    const dish = s.dishes.find(item => item.id === id);
    if (!dish) return;
    if (!window.confirm(`Delete “${dish.name}” from the dish library? Existing old week plans keep their slot, but it will no longer be suggested.`)) return;
    s.dishes = s.dishes.filter(item => item.id !== id);
    save('meal-planner-dish-delete');
    ui.mode = 'main'; ui.tab = 'dishes'; ui.editingDishId = null;
    render();
  }

  function addRestockForm(form) {
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    if (!name) return;
    ensureState().restockItems.push({ id: uid('restock'), name: name.slice(0,120), category: String(data.get('category') || 'Other').slice(0,60), need: false, active: true });
    save('meal-planner-restock-add');
    render();
  }

  function deleteRestock(id) {
    const s = ensureState();
    s.restockItems = s.restockItems.filter(item => item.id !== id);
    save('meal-planner-restock-delete');
    render();
  }

  function addTagRuleForm(form) {
    const data = new FormData(form);
    const tag = normalTag(data.get('tag'));
    if (!tag) return;
    ensureState().settings.tagLimits[tag] = clamp(data.get('limit'), 1, 7);
    save('meal-planner-tag-add');
    render();
  }

  function deleteTagRule(tag) {
    delete ensureState().settings.tagLimits[tag];
    save('meal-planner-tag-delete');
    render();
  }

  function shoppingText() {
    const plan = planFor();
    if (!plan) return '';
    const lines = [`Shopping list · ${weekLabel()}`, ''];
    const blocks = plan.blocks.filter(block => block.dishId);
    blocks.forEach(block => {
      const dish = dishById(block.dishId);
      if (!dish?.ingredients?.length) return;
      lines.push(dish.name.toUpperCase());
      dish.ingredients.forEach(item => lines.push(`☐ ${item}`));
      lines.push('');
    });
    const needed = ensureState().restockItems.filter(item => item.active !== false && item.need);
    if (needed.length) {
      lines.push('RESTOCK');
      needed.sort((a,b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)).forEach(item => lines.push(`☐ ${item.name}${item.category ? ` · ${item.category}` : ''}`));
      lines.push('');
    }
    if (lines.length <= 2) lines.push('No saved ingredients or restock items marked as needed yet.');
    return lines.join('\n').trim();
  }

  async function copyShoppingList() {
    const text = shoppingText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      app()?.showToast?.('🛒 Shopping list copied.');
    } catch {
      const area = document.createElement('textarea');
      area.value = text; area.style.position = 'fixed'; area.style.opacity = '0'; document.body.appendChild(area); area.select();
      document.execCommand('copy'); area.remove();
      app()?.showToast?.('🛒 Shopping list copied.');
    }
  }

  function renderHomeSummary() {
    const host = document.getElementById('mealPlannerHomeSummaryV314dz6');
    if (!host) return;
    const key = weekKeyForOffset(1);
    const plan = ensureState().plans[key];
    if (!plan) { host.textContent = 'Next week is not planned yet.'; return; }
    const dishes = (plan.blocks || []).filter(block => block.dishId).length;
    host.textContent = `${dishes} dish${dishes === 1 ? '' : 'es'} · ${coveredDays(plan)}/7 days${plan.status === 'committed' ? ' · ready' : ' · draft'}`;
  }

  function bindPage() {
    const page = document.getElementById('mealPlannerPageV314dz7');
    if (!page || page.dataset.mealBound === '1') return;
    page.dataset.mealBound = '1';
    page.addEventListener('click', handleClick);
    page.addEventListener('submit', handleSubmit);
  }

  function init() {
    if (!app()) return;
    const root = rootState();
    const existed = Boolean(root?.mealPlanner);
    ensureState();
    bindPage();
    render();
    if (!existed) save('meal-planner-init');
    window.addEventListener('life-rpg:view-changed', event => {
      if (event?.detail?.view === 'meals') render();
    });
  }

  window.LifeRPGMealPlanner = {
    open: openPlanner,
    getState: ensureState,
    generatePlan,
    compatibleSwaps,
    shoppingText,
    weekKeyForOffset
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
