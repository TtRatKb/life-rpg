(() => {
  const VERSION = "0.31.4ae";
  const SKILLS_VERSION = "0.31.4ac";
  const JOURNAL_REWARDS_VERSION = "0.31.4ab";
  const WEEKLY_REVIEW_VERSION = "0.31.4ac";
  const KNOWLEDGE_TREE_VERSION = "0.31.4ad";
  const HEALTH_TREE_VERSION = "0.31.4ae";
  const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
  if (standalone) document.body.classList.add("is-standalone-v251");

  if (!document.querySelector('link[data-life-rpg-skills]')) {
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = `./skills.css?v=${SKILLS_VERSION}`;
    style.dataset.lifeRpgSkills = SKILLS_VERSION;
    document.head.appendChild(style);
  }
  if (!document.querySelector('script[data-life-rpg-skills]')) {
    const script = document.createElement("script");
    script.src = `./skills.js?v=${SKILLS_VERSION}`;
    script.async = false;
    script.dataset.lifeRpgSkills = SKILLS_VERSION;
    document.head.appendChild(script);
  }

  if (!document.querySelector('script[data-life-rpg-journal-rewards]')) {
    const script = document.createElement("script");
    script.src = `./journal-rewards.js?v=${JOURNAL_REWARDS_VERSION}`;
    script.async = false;
    script.dataset.lifeRpgJournalRewards = JOURNAL_REWARDS_VERSION;
    document.head.appendChild(script);
  }

  if (!document.querySelector('link[data-life-rpg-weekly-review]')) {
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = `./weekly-review.css?v=${WEEKLY_REVIEW_VERSION}`;
    style.dataset.lifeRpgWeeklyReview = WEEKLY_REVIEW_VERSION;
    document.head.appendChild(style);
  }
  if (!document.querySelector('script[data-life-rpg-weekly-review]')) {
    const script = document.createElement("script");
    script.src = `./weekly-review.js?v=${WEEKLY_REVIEW_VERSION}`;
    script.async = false;
    script.dataset.lifeRpgWeeklyReview = WEEKLY_REVIEW_VERSION;
    document.head.appendChild(script);
  }

  if (!document.querySelector('link[data-life-rpg-knowledge-tree]')) {
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = `./knowledge-tree.css?v=${KNOWLEDGE_TREE_VERSION}`;
    style.dataset.lifeRpgKnowledgeTree = KNOWLEDGE_TREE_VERSION;
    document.head.appendChild(style);
  }
  if (!document.querySelector('script[data-life-rpg-knowledge-tree]')) {
    const script = document.createElement("script");
    script.src = `./knowledge-tree.js?v=${KNOWLEDGE_TREE_VERSION}`;
    script.async = false;
    script.dataset.lifeRpgKnowledgeTree = KNOWLEDGE_TREE_VERSION;
    document.head.appendChild(script);
  }

  if (!document.querySelector('link[data-life-rpg-health-tree]')) {
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = `./health-tree.css?v=${HEALTH_TREE_VERSION}`;
    style.dataset.lifeRpgHealthTree = HEALTH_TREE_VERSION;
    document.head.appendChild(style);
  }
  if (!document.querySelector('script[data-life-rpg-health-tree]')) {
    const script = document.createElement("script");
    script.src = `./health-tree.js?v=${HEALTH_TREE_VERSION}`;
    script.async = false;
    script.dataset.lifeRpgHealthTree = HEALTH_TREE_VERSION;
    document.head.appendChild(script);
  }

  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`./service-worker.js?v=${VERSION}`, { scope: "./" })
      .catch(error => console.warn("Life RPG service worker could not register", error));
  });
})();
