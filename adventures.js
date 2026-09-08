(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState) {
    console.error("Life RPG Side Adventures could not initialize because LifeRPGApp is unavailable.");
    return;
  }

  const SCHEMA = 3;
  const SHADOW_KEY = "life-rpg-side-adventures-shadow-v1";
  const MAX_LOGS = 600;
  const REALMS = ["Hobbies", "Recovery", "Japanese", "Knowledge", "Home", "Health", "Work"];
  const KINDS = {
    creative: { icon: "🎨", label: "Creative project" },
    skill: { icon: "🧶", label: "Skill / craft" },
    personal: { icon: "✨", label: "Personal project" },
    collection: { icon: "✦", label: "Collection / long game" },
    other: { icon: "🌸", label: "Other adventure" }
  };
  const ENERGY = {
    low: { label: "Low energy", icon: "☕", demand: 0.55 },
    medium: { label: "Medium energy", icon: "🌤️", demand: 1.35 },
    high: { label: "High energy", icon: "⚡", demand: 2.15 }
  };
  const REASONS = {
    "takes-space": { icon: "📦", label: "Takes up space" },
    "want-result": { icon: "✨", label: "I want the result" },
    learn: { icon: "🧠", label: "I want to learn this" },
    fun: { icon: "💕", label: "Just for fun" },
    gift: { icon: "🎁", label: "For someone" },
    deadline: { icon: "◷", label: "Has a real deadline" }
  };


  const CURATED_PACK_ID = "diy-project-pack-2026-09-07-b";
  const CURATED_ADVENTURES = [
    {
      curatedId: "custom-anime-manga-jeans",
      name: "Custom Anime / Manga Jeans",
      kind: "creative",
      realm: "Hobbies",
      energy: "medium",
      sessionMinutes: 30,
      reasonTags: ["want-result", "fun"],
      sourceLabel: "Your saved DIY reference video",
      sourceNote: "The screenshots clearly show direct painting on light denim and the finished multi-motif jeans. Exact construction for every final motif is not visible, so technique choices are kept explicit instead of guessed.",
      note: "Research and gather fabric-safe materials before painting. Then plan the composition and work section by section.",
      roadmap: [
        { key: "research-denim-paint", type: "research", milestone: "1 · Research & materials", label: "Research suitable paint or markers for denim", details: "Check which textile/fabric paints or markers are appropriate for denim, how they are cured, how washable they are, and whether the exact product needs heat-setting, textile medium or a sealer. Do not assume all products use the same finishing method.", minutes: 20, energy: "low" },
        { key: "inventory-denim-supplies", type: "materials", milestone: "1 · Research & materials", label: "Check what jeans-customizing supplies you already own", details: "Inventory brushes, fine detail tools, masking tape, backing cardboard, pencils/chalk and any fabric-safe paint/markers you already have. Turn the missing items into a concrete shopping list.", minutes: 10, energy: "low" },
        { key: "get-denim-supplies", type: "materials", milestone: "1 · Research & materials", label: "Get the missing jeans-painting supplies", details: "Buy/order the missing fabric-safe colours and prep/finishing supplies. Keep this step open until the required materials are actually available to use.", minutes: 15, energy: "low" },
        { key: "choose-jeans", type: "decision", milestone: "2 · Design", label: "Choose the jeans you want to permanently customize", details: "Pick the actual pair and confirm the fit before putting permanent paint or attached elements on it.", minutes: 10, energy: "low" },
        { key: "map-motifs", type: "decision", milestone: "2 · Design", label: "Choose the exact anime / manga motifs and map them across both legs", details: "Collect the references you actually want, then decide which thigh, knee, shin or pocket area each one belongs to so the finished design feels balanced.", minutes: 30, energy: "medium" },
        { key: "choose-techniques", type: "decision", milestone: "2 · Design", label: "Decide the technique for each motif", details: "For every planned element, decide whether you want direct fabric painting/marker work or a separate attached patch/panel effect. The reference shows direct painting, while every final motif's construction is not visible.", minutes: 20, energy: "medium" },
        { key: "prep-denim-work-area", type: "make", milestone: "3 · Prep", label: "Prepare the jeans and work area for painting", details: "Protect the work surface, prepare the selected textile products and place backing/cardboard inside the jeans so paint cannot transfer through.", minutes: 15, energy: "low" },
        { key: "transfer-first-section", type: "make", milestone: "3 · Prep", label: "Sketch or transfer the placement for the first section", details: "Lightly mark the first motif and its surrounding shapes before committing to the permanent layer.", minutes: 20, energy: "medium" },
        { key: "paint-first-graphics", type: "make", milestone: "4 · Build", label: "Paint the first large black / red graphic shapes", details: "Work on one bounded section rather than trying to fill the whole pair in one session. The reference visibly uses a brush for bold dark shapes on the denim.", minutes: 30, energy: "medium" },
        { key: "first-main-motif", type: "make", milestone: "4 · Build", label: "Complete one main character or manga-panel motif", details: "Finish one focal image/panel in the first section, including the major outlines and fill needed for that motif, then let it dry as required.", minutes: 45, energy: "medium" },
        { key: "second-main-motif", type: "make", milestone: "4 · Build", label: "Complete one major motif on the other leg", details: "Move to a second focal area so the design develops across both legs instead of overworking only one side.", minutes: 45, energy: "medium" },
        { key: "lettering-accents", type: "make", milestone: "4 · Build", label: "Add lettering and smaller graphic accents", details: "Use the remaining planned gaps for lettering, symbols, red marks or smaller manga-style details rather than adding random filler.", minutes: 30, energy: "medium" },
        { key: "composition-check", type: "finish", milestone: "5 · Finish", label: "Check the composition across both legs and add only missing details", details: "Try the jeans on or lay them out fully. Check visual balance, spacing and whether any planned area still looks unfinished before adding more.", minutes: 20, energy: "low" },
        { key: "cure-denim", type: "finish", milestone: "5 · Finish", label: "Let the design dry fully and cure/fix it according to the product instructions", details: "Follow the instructions for the exact textile paint/marker you chose, including any wait time, heat-setting or sealing required by that product.", minutes: 15, energy: "low" },
        { key: "wear-test-jeans", type: "finish", milestone: "5 · Finish", label: "Final wear test and tidy the finished jeans", details: "Check comfort and movement, inspect edges/details, and tidy any loose threads or small finish issues before calling the project complete.", minutes: 15, energy: "low" }
      ]
    },
    {
      curatedId: "crochet-ivy-choker",
      name: "Crochet Ivy Choker",
      kind: "skill",
      realm: "Hobbies",
      energy: "low",
      sessionMinutes: 20,
      reasonTags: ["want-result", "learn", "fun"],
      sourceLabel: "CrochetEverything · Crochet Ivy Choker Pattern",
      sourceUrl: "https://crocheteverything.com/crochet-ivy-choker-pattern-adorable-chic-accessory-for-stylish-look/",
      sourceNote: "Roadmap is based on the pattern text you supplied. The source does not actually spell out the mushroom-cap increase sequence, so that gap stays explicit rather than being invented.",
      note: "Pattern materials: yarn of your choice + a crochet hook suitable for the yarn. Missing materials are handled before the crochet steps. Decoration counts are intentionally your choice.",
      roadmap: [
        { key: "choose-yarn-hook", type: "materials", milestone: "1 · Setup & materials", label: "Choose yarn, colour and a suitable crochet hook", details: "The pattern says to use yarn of your choice and a hook suitable for that yarn. Choose the yarn first, then check its label/recommendation for an appropriate hook size.", minutes: 15, energy: "low" },
        { key: "inventory-choker-materials", type: "materials", milestone: "1 · Setup & materials", label: "Check whether you already have the yarn and hook you need", details: "Confirm the chosen yarn quantity/colour and hook are actually available. Add only missing items to a shopping list.", minutes: 5, energy: "low" },
        { key: "get-choker-materials", type: "materials", milestone: "1 · Setup & materials", label: "Get any missing choker materials", details: "Buy/order the missing yarn or hook. Keep this step open until the required materials are actually available to crochet with.", minutes: 10, energy: "low" },
        { key: "choose-choker-length", type: "decision", milestone: "1 · Setup & materials", label: "Choose a comfortable choker length", details: "The pattern says to make the starting chain fit comfortably around your neck; about 60 chains is only an example, not a fixed count.", minutes: 10, energy: "low" },
        { key: "base-first-side", type: "make", milestone: "2 · Choker base", label: "Crochet the starting chain and first single-crochet side", details: "Slip knot → chain to the chosen neck length → chain 1 more → single crochet into the 2nd stitch from the hook → single crochet in every stitch to the end → cut yarn and pull through.", minutes: 25, energy: "low" },
        { key: "base-opposite-side", type: "make", milestone: "2 · Choker base", label: "Single crochet along the opposite side of the initial chain", details: "Repeat the single-crochet process along the other side of the original foundation chain.", minutes: 20, energy: "low" },
        { key: "textured-edge", type: "make", milestone: "3 · Texture", label: "Add the textured edge across the choker", details: "Reattach yarn at the first stitch of one side → chain 2 + slip stitch into the same stitch → slip stitch into the next stitch → chain 2 + slip stitch into that same stitch → continue across.", minutes: 20, energy: "low" },
        { key: "strap-one", type: "make", milestone: "4 · Straps", label: "Crochet the first tie strap", details: "Single crochet on one edge → chain about 60 or your desired strap length → slip stitch back along the chain toward the choker → attach with a single crochet on the side.", minutes: 20, energy: "low" },
        { key: "strap-two", type: "make", milestone: "4 · Straps", label: "Crochet the second tie strap", details: "Repeat the same strap construction on the opposite side so the choker can be tied comfortably.", minutes: 20, energy: "low" },
        { key: "decoration-plan", type: "decision", milestone: "5 · Decoration plan", label: "Choose your ivy sizes and decide whether you want flowers and mushrooms", details: "Decide Small / Medium / Large ivy (or a mix), the approximate lengths you want, and whether flowers and mushrooms belong in your version. The pattern leaves amounts and placement up to you.", minutes: 10, energy: "low" },
        { key: "small-ivy", type: "make", milestone: "6 · Ivy", label: "Crochet one small ivy strand if you chose Small", details: "Slip knot → chain 7 → slip stitch into 2nd chain → slip stitch again with hook brought behind the chain before pulling through → chain 7 again → repeat to desired length. Leave extra yarn for attaching.", minutes: 20, energy: "low", optional: true },
        { key: "medium-ivy", type: "make", milestone: "6 · Ivy", label: "Crochet one medium ivy strand if you chose Medium", details: "Slip knot → chain 11 → single crochet into 3rd chain from hook → slip stitch in next → go behind chain and pull through yarn → chain 11 again → continue to desired length.", minutes: 20, energy: "low", optional: true },
        { key: "large-ivy", type: "make", milestone: "6 · Ivy", label: "Crochet one large ivy strand if you chose Large", details: "Slip knot → chain 17 → single crochet in 3rd chain → half double crochet in next → single crochet in next → slip stitch → work around/pull through as described → slip stitch → chain 17 again → continue to desired length.", minutes: 25, energy: "medium", optional: true },
        { key: "flowers", type: "make", milestone: "7 · Extras", label: "Crochet the flowers you decided to use", details: "Magic ring → chain 2 → 2 double crochets → chain 2 → slip stitch into ring. Repeat inside the ring for 5 petals, then pull the ring closed. Make as many as you chose in the decoration plan.", minutes: 25, energy: "low", optional: true },
        { key: "mushrooms", type: "make", milestone: "7 · Extras", label: "Crochet the mushrooms you decided to use", details: "Pattern text: magic ring + 6 single crochets → close and slip stitch to join. The source then says to increase in the next round to shape the cap but does not give the actual increase sequence. For the stem: chain 3 → slip stitch into first chain → single crochet into each, then attach stem to cap.", minutes: 30, energy: "medium", optional: true, warning: "Source gap: mushroom-cap increase sequence is not specified in the supplied pattern text." },
        { key: "layout-choker", type: "make", milestone: "8 · Assembly", label: "Lay out the finished pieces and choose the final placement", details: "Lay the choker flat and arrange ivy chains, flowers and mushrooms before tying anything on permanently.", minutes: 10, energy: "low" },
        { key: "attach-mushroom", type: "make", milestone: "8 · Assembly", label: "Attach the mushroom at the necklace centre if you are using mushrooms", details: "The pattern says to find the necklace centre first and secure the mushroom using its yarn ends through the necklace stitches.", minutes: 15, energy: "low", optional: true },
        { key: "attach-ivy", type: "make", milestone: "8 · Assembly", label: "Attach the ivy chains to the choker", details: "Place the ivy strands where you want them, use their extra yarn ends to tie them securely to the choker, then trim excess yarn appropriately.", minutes: 20, energy: "low" },
        { key: "attach-flowers", type: "make", milestone: "8 · Assembly", label: "Attach the flowers and secure the remaining yarn ends", details: "Attach flowers to ivy chains or directly to the choker as desired, secure them firmly, then tidy the remaining ends.", minutes: 20, energy: "low", optional: true },
        { key: "fit-choker", type: "finish", milestone: "8 · Assembly", label: "Try on the choker and make final fit or placement adjustments", details: "Check that the base and straps sit comfortably and that the decoration placement feels right before marking the adventure complete.", minutes: 10, energy: "low" }
      ]
    },
    {
      curatedId: "bakugo-paper-doll",
      name: "Bakugo Paper Doll / Paper Figure",
      kind: "creative",
      realm: "Hobbies",
      energy: "low",
      sessionMinutes: 20,
      reasonTags: ["want-result", "fun"],
      sourceLabel: "Your saved Bakugo paper-doll template reference",
      sourceNote: "The supplied image clearly shows a printable sheet with separate body, hair and costume/accessory pieces. The exact intended attachment method is not visible, so the roadmap includes a short research step instead of guessing glue/brads/folds.",
      note: "Secure the printable and confirm the intended assembly method before cutting the final copy.",
      roadmap: [
        { key: "save-paper-template", type: "research", milestone: "1 · Source & method", label: "Save the Bakugo template in the best resolution you can find", details: "Keep the original reference/template file somewhere you can print from without repeatedly compressing it.", minutes: 10, energy: "low" },
        { key: "research-paper-assembly", type: "research", milestone: "1 · Source & method", label: "Confirm how this specific paper doll is meant to be assembled", details: "Check whether the template is intended as a flat layered figure, folded papercraft, glued pieces, movable joints/brads, or another construction. Use the original pin/tutorial if available rather than guessing from the parts sheet.", minutes: 15, energy: "low" },
        { key: "choose-paper-size", type: "decision", milestone: "2 · Materials", label: "Choose the finished size and suitable paper weight", details: "Decide how large you want the figure, then pick printer paper/cardstock appropriate for the confirmed assembly method.", minutes: 10, energy: "low" },
        { key: "inventory-paper-doll", type: "materials", milestone: "2 · Materials", label: "Check your paper-craft supplies and make a missing-material list", details: "Check printer access, paper/cardstock, scissors or craft knife, cutting mat, adhesive and any brads/joint hardware required by the confirmed method.", minutes: 10, energy: "low" },
        { key: "get-paper-doll-materials", type: "materials", milestone: "2 · Materials", label: "Get the missing paper-doll materials", details: "Buy/order only what is missing and keep this step open until the required materials are actually ready to use.", minutes: 10, energy: "low" },
        { key: "print-paper-doll", type: "make", milestone: "3 · Print & cut", label: "Print the final template at the chosen size", details: "Print a clean final copy using the paper and scaling chosen in the setup steps.", minutes: 10, energy: "low" },
        { key: "cut-paper-parts", type: "make", milestone: "3 · Print & cut", label: "Cut out all body, hair and costume pieces", details: "Cut carefully around each component and keep small accessory pieces grouped so nothing is lost.", minutes: 30, energy: "medium" },
        { key: "prep-folds-joins", type: "make", milestone: "3 · Print & cut", label: "Prepare any folds, tabs or joint points required by the template", details: "Score/fold tabs or prepare joint holes only if the confirmed assembly method calls for them.", minutes: 15, energy: "medium" },
        { key: "assemble-paper-body", type: "make", milestone: "4 · Assemble", label: "Assemble the body base", details: "Join the main head/body/limb components using the method confirmed from the source.", minutes: 20, energy: "medium" },
        { key: "assemble-paper-hair", type: "make", milestone: "4 · Assemble", label: "Attach the front and back hair pieces", details: "Align the separate spiky hair components around the head and secure them according to the template method.", minutes: 15, energy: "medium" },
        { key: "assemble-paper-costume", type: "make", milestone: "4 · Assemble", label: "Add the costume and accessory pieces", details: "Attach the belt/costume/details from the sheet in the intended layer/order.", minutes: 20, energy: "medium" },
        { key: "paper-doll-final", type: "finish", milestone: "5 · Finish", label: "Check alignment, joins and loose edges", details: "Make any small corrections, reinforce weak joins if needed and make sure the finished figure sits/moves as intended by the template.", minutes: 10, energy: "low" }
      ]
    },
    {
      curatedId: "anime-paper-waterfall",
      name: "Anime Paper Waterfall",
      kind: "creative",
      realm: "Hobbies",
      energy: "medium",
      sessionMinutes: 25,
      reasonTags: ["want-result", "learn", "fun"],
      sourceLabel: "Your saved paper-waterfall tutorial reference",
      sourceNote: "The screenshot clearly shows an illustrated multi-panel paper waterfall, but not the full fold/glue mechanics. The roadmap therefore makes understanding the tutorial mechanism a required first step before final assembly.",
      note: "Verify the mechanism first, ideally with a quick scrap-paper prototype, before spending time on finished artwork.",
      roadmap: [
        { key: "study-waterfall-tutorial", type: "research", milestone: "1 · Understand the mechanism", label: "Watch/save the paper-waterfall tutorial and identify the exact fold/glue sequence", details: "Work out the actual pull-strip, fold spacing, panel attachment points and backing method from the source tutorial. Do not rely on guessed dimensions from the single screenshot.", minutes: 20, energy: "low" },
        { key: "waterfall-material-research", type: "research", milestone: "1 · Understand the mechanism", label: "Choose suitable paper/cardstock and adhesive for the waterfall", details: "Pick paper sturdy enough for repeated movement but still foldable, and an adhesive/tape that will not make the mechanism too bulky.", minutes: 10, energy: "low" },
        { key: "inventory-waterfall", type: "materials", milestone: "2 · Materials", label: "Check your paper-craft supplies for the waterfall", details: "Check cardstock/paper, ruler, pencil, cutting tool, cutting mat, adhesive/tape and colouring/drawing supplies. Make a list of only what is missing.", minutes: 10, energy: "low" },
        { key: "get-waterfall-materials", type: "materials", milestone: "2 · Materials", label: "Get any missing paper-waterfall materials", details: "Buy/order the missing supplies and keep this step open until the project can actually be built.", minutes: 10, energy: "low" },
        { key: "prototype-waterfall", type: "make", milestone: "3 · Prototype", label: "Build a quick scrap-paper prototype of the waterfall mechanism", details: "Use plain scrap paper first. Confirm that pulling the tab flips the panels cleanly before making the final illustrated version.", minutes: 25, energy: "medium" },
        { key: "plan-waterfall-panels", type: "decision", milestone: "4 · Artwork", label: "Choose the anime theme and plan the panel sequence", details: "Decide which character(s)/moments go on each panel and how many panels your verified mechanism supports.", minutes: 20, energy: "medium" },
        { key: "make-waterfall-art", type: "make", milestone: "4 · Artwork", label: "Draw, print or paint the finished panel artwork", details: "Create the individual images at the dimensions confirmed by the prototype/tutorial. Work panel by panel rather than trying to finish the whole set at once.", minutes: 45, energy: "medium" },
        { key: "cut-final-waterfall", type: "make", milestone: "5 · Final build", label: "Cut and mark the final waterfall strip, backing and panels", details: "Transfer the verified measurements/fold marks from the tutorial/prototype onto the final materials.", minutes: 20, energy: "medium" },
        { key: "assemble-final-waterfall", type: "make", milestone: "5 · Final build", label: "Assemble the final waterfall using the verified tutorial sequence", details: "Attach the panels and pull mechanism in the exact order/positions you confirmed during research and prototyping.", minutes: 30, energy: "medium" },
        { key: "test-waterfall", type: "finish", milestone: "5 · Final build", label: "Test the waterfall repeatedly and fix any catching or weak joins", details: "Pull it through several full cycles. Reinforce or trim only where needed so the panels flip reliably.", minutes: 15, energy: "low" },
        { key: "decorate-waterfall", type: "finish", milestone: "6 · Finish", label: "Add the final cover/backing decoration", details: "Once the mechanism works, add any final border, cover or decorative details that will not interfere with movement.", minutes: 20, energy: "low" }
      ]
    },
    {
      curatedId: "bakugo-charm-keychain",
      name: "Bakugo-Inspired Charm Keychain",
      kind: "creative",
      realm: "Hobbies",
      energy: "low",
      sessionMinutes: 20,
      reasonTags: ["want-result", "fun"],
      sourceLabel: "Your saved Bakugo-inspired keychain reference",
      sourceNote: "The reference shows orange hardware, letter beads, black/orange accent beads, a grenade-style charm and a small black plush/felt element. Exact purchased components can vary, so the project starts with a component plan and compatibility check.",
      note: "Plan the hardware and bead/charm sizes before buying so the pieces actually connect cleanly.",
      roadmap: [
        { key: "plan-keychain-components", type: "decision", milestone: "1 · Design", label: "Choose the exact Bakugo-inspired keychain components you want", details: "Decide which elements you actually want to recreate: clip colour, letter beads/name, grenade/explosion charm, accent beads and optional plush/felt charm.", minutes: 15, energy: "low" },
        { key: "research-keychain-hardware", type: "research", milestone: "1 · Design", label: "Check keychain hardware and component compatibility", details: "Check jump-ring size/gauge, bead holes, eye/head pins if needed, clip attachment points and whether you have suitable jewellery pliers. Make sure the planned pieces can physically connect before ordering them.", minutes: 15, energy: "low" },
        { key: "inventory-keychain", type: "materials", milestone: "2 · Materials", label: "Inventory the keychain supplies you already own", details: "Check clips, jump rings, pliers, beads, letters and charms; make one concrete list of missing components.", minutes: 10, energy: "low" },
        { key: "get-keychain-materials", type: "materials", milestone: "2 · Materials", label: "Get the missing keychain hardware, beads and charms", details: "Buy/order the missing components and keep this step open until everything needed for assembly is actually available.", minutes: 15, energy: "low" },
        { key: "layout-keychain", type: "make", milestone: "3 · Assembly", label: "Lay out all keychain components before connecting them", details: "Arrange the strands/charms next to the main clip to balance length, weight and colour before opening any jump rings.", minutes: 10, energy: "low" },
        { key: "make-letter-strand", type: "make", milestone: "3 · Assembly", label: "Assemble the letter-bead strand", details: "Build the planned letter/name element with the chosen spacer/accent beads and appropriate jewellery hardware.", minutes: 20, energy: "low" },
        { key: "make-bead-strands", type: "make", milestone: "3 · Assembly", label: "Assemble the orange/black accent bead sections", details: "Create the smaller bead connectors/segments you planned and attach them securely to their rings/pins.", minutes: 20, energy: "low" },
        { key: "attach-main-charms", type: "make", milestone: "3 · Assembly", label: "Attach the main themed charms to the keychain", details: "Add the grenade/explosion and any plush/felt or character-inspired pieces using correctly sized jump rings/hardware.", minutes: 20, energy: "low" },
        { key: "keychain-security-check", type: "finish", milestone: "4 · Finish", label: "Close every ring securely and test the finished keychain", details: "Check that jump rings are fully closed, nothing catches or falls off, and the finished weight/layout works on a bag or keys.", minutes: 10, energy: "low" }
      ]
    },
    {
      curatedId: "custom-bakugo-high-tops",
      name: "Custom Bakugo High-Top Sneakers",
      kind: "creative",
      realm: "Hobbies",
      energy: "medium",
      sessionMinutes: 30,
      reasonTags: ["want-result", "learn", "fun"],
      sourceLabel: "Your saved Bakugo-inspired sneaker reference",
      sourceNote: "The reference shows black canvas high-tops with orange laces/eyelets and Bakugo/explosion-style graphics. You said you do not currently own fabric paint, so material research and purchasing are explicit dependencies before painting begins.",
      note: "Research the exact paint/marker system for canvas shoes before buying supplies, then follow that product's preparation and curing/sealing instructions.",
      roadmap: [
        { key: "research-shoe-paint", type: "research", milestone: "1 · Research", label: "Research suitable paint or markers for canvas sneakers", details: "Compare products intended for canvas/fabric shoes, including durability, flex/cracking risk, colour opacity, preparation, curing and whether a finisher/sealer is actually recommended for that system.", minutes: 20, energy: "low" },
        { key: "research-shoe-prep", type: "research", milestone: "1 · Research", label: "Confirm the preparation and finishing steps for the paint system you choose", details: "Check cleaning/prep requirements, drying times, heat-setting or sealing instructions and care/washing guidance for the exact product. Do not mix generic advice with incompatible product instructions.", minutes: 15, energy: "low" },
        { key: "choose-shoes", type: "decision", milestone: "2 · Materials", label: "Choose the black high-top sneakers you want to customize", details: "Use a pair with a suitable canvas/fabric upper and confirm the fit before committing permanent artwork to them.", minutes: 15, energy: "low" },
        { key: "inventory-shoe-supplies", type: "materials", milestone: "2 · Materials", label: "Make a complete sneaker-customizing supply list", details: "Check what you already own, then list the missing paint/markers, brushes/detail tools, masking tape, prep materials, any required finisher/sealer and orange laces if you want the reference look.", minutes: 10, energy: "low" },
        { key: "get-shoe-supplies", type: "materials", milestone: "2 · Materials", label: "Get the missing sneaker paint and supplies", details: "Buy/order the missing canvas-safe products and accessories. Keep this step open until the shoes and required painting materials are actually in hand.", minutes: 15, energy: "low" },
        { key: "plan-shoe-design", type: "decision", milestone: "3 · Design", label: "Plan the Bakugo/explosion graphics for both shoes", details: "Collect the references you want and decide what belongs on each outer side, inner side and heel so the two shoes feel related without needing to be identical.", minutes: 30, energy: "medium" },
        { key: "prep-shoes", type: "make", milestone: "4 · Prep", label: "Clean, prepare and mask the sneakers", details: "Follow the chosen product's prep instructions, remove the laces and mask soles/edges or areas that should stay clean.", minutes: 20, energy: "medium" },
        { key: "sketch-shoe-design", type: "make", milestone: "4 · Prep", label: "Lightly sketch the planned graphics onto the shoes", details: "Transfer the major shapes and placement before applying permanent colour.", minutes: 30, energy: "medium" },
        { key: "paint-shoe-base", type: "make", milestone: "5 · Paint", label: "Paint the first major colour blocks and explosion shapes", details: "Work in controlled sections and respect drying/layering instructions for the paint system you chose.", minutes: 40, energy: "medium" },
        { key: "paint-shoe-details", type: "make", milestone: "5 · Paint", label: "Add lettering, outlines and smaller Bakugo-style details", details: "Finish the comic/explosion accents, outlines and any contrasting details after the larger colour areas are ready for them.", minutes: 40, energy: "medium" },
        { key: "balance-second-shoe", type: "make", milestone: "5 · Paint", label: "Complete and balance the design across the second shoe", details: "Compare the pair together and finish any planned graphics needed to make the set feel coherent.", minutes: 40, energy: "medium" },
        { key: "cure-shoes", type: "finish", milestone: "6 · Finish", label: "Let the artwork cure and finish/seal it exactly as the product requires", details: "Follow the actual paint/marker manufacturer's curing and finishing instructions, including any required wait time before wear.", minutes: 15, energy: "low" },
        { key: "relace-shoes", type: "finish", milestone: "6 · Finish", label: "Add the final laces and do a wear test", details: "Relace the shoes (orange if you chose that reference detail), inspect the artwork and check comfort/flex before calling the project complete.", minutes: 15, energy: "low" }
      ]
    }
  ];

  const els = {
    add: byId("addAdventureButton"),
    emptyAdd: byId("adventureEmptyCreate"),
    board: byId("adventureBoard"),
    empty: byId("adventureEmpty"),
    search: byId("adventureSearch"),
    status: byId("adventureStatusFilter"),
    kindFilters: byId("adventureKindFilters"),
    activeSummary: byId("adventureSummaryActive"),
    staleSummary: byId("adventureSummaryStale"),
    almostSummary: byId("adventureSummaryAlmost"),
    dialog: byId("adventureDialog"),
    form: byId("adventureForm"),
    editId: byId("adventureEditId"),
    dialogTitle: byId("adventureDialogTitle"),
    close: byId("adventureDialogClose"),
    cancel: byId("cancelAdventureButton"),
    deleteButton: byId("deleteAdventureButton"),
    saveAnother: byId("saveAdventureAnotherButton"),
    name: byId("adventureName"),
    kind: byId("adventureKind"),
    realm: byId("adventureRealm"),
    statusField: byId("adventureStatus"),
    energy: byId("adventureEnergy"),
    minutes: byId("adventureMinutes"),
    nextAction: byId("adventureNextAction"),
    progressMode: byId("adventureProgressMode"),
    progressWrap: byId("adventureProgressWrap"),
    progress: byId("adventureProgress"),
    incrementWrap: byId("adventureIncrementWrap"),
    increment: byId("adventureIncrement"),
    note: byId("adventureNote"),
    preview: byId("adventurePreview"),
    logDialog: byId("adventureLogDialog"),
    logForm: byId("adventureLogForm"),
    logId: byId("adventureLogId"),
    logTitle: byId("adventureLogTitle"),
    logPicker: byId("adventureLogPicker"),
    logChainStatus: byId("adventureLogChainStatus"),
    logClose: byId("adventureLogClose"),
    logCancel: byId("adventureLogCancel"),
    logFinishLine: byId("adventureLogFinishLine"),
    logProgressWrap: byId("adventureLogProgressWrap"),
    logProgress: byId("adventureLogProgress"),
    logNextAction: byId("adventureLogNextAction"),
    toast: byId("adventureToast"),
    toastTitle: byId("adventureToastTitle"),
    toastDetail: byId("adventureToastDetail")
  };

  let initialized = false;
  let selectedKind = "all";

  init();

  function init() {
    bindEvents();
    const changed = ensureState();
    initialized = true;
    if (changed) persist("side-adventures-init", { render: false });
    render();
    exposeApi();
  }

  function bindEvents() {
    els.add?.addEventListener("click", () => openAdventureDialog());
    els.emptyAdd?.addEventListener("click", () => openAdventureDialog());
    els.close?.addEventListener("click", closeAdventureDialog);
    els.cancel?.addEventListener("click", closeAdventureDialog);
    els.form?.addEventListener("submit", saveAdventureFromDialog);
    els.deleteButton?.addEventListener("click", deleteCurrentAdventure);
    els.progressMode?.addEventListener("change", renderFormState);
    [els.name, els.kind, els.realm, els.energy, els.minutes, els.nextAction, els.progress].forEach(input => input?.addEventListener("input", renderPreview));

    els.search?.addEventListener("input", renderBoard);
    els.status?.addEventListener("change", renderBoard);
    els.kindFilters?.addEventListener("click", event => {
      const button = event.target.closest?.("[data-adventure-kind]");
      if (!button) return;
      selectedKind = button.dataset.adventureKind || "all";
      els.kindFilters.querySelectorAll("[data-adventure-kind]").forEach(node => node.classList.toggle("active", node === button));
      renderBoard();
    });

    document.addEventListener("click", event => {
      const edit = event.target.closest?.("[data-adventure-edit]");
      if (edit) {
        openAdventureDialog(edit.dataset.adventureEdit);
        return;
      }
      const log = event.target.closest?.("[data-adventure-log]");
      if (log) {
        openLogDialog(log.dataset.adventureLog);
        return;
      }
      const pause = event.target.closest?.("[data-adventure-pause]");
      if (pause) {
        togglePause(pause.dataset.adventurePause);
        return;
      }
      const skipStep = event.target.closest?.("[data-adventure-roadmap-skip]");
      if (skipStep) {
        skipRoadmapStep(skipStep.dataset.adventureRoadmapSkip, skipStep.dataset.adventureStepId);
        return;
      }
      const quick = event.target.closest?.("[data-adventure-quick-progress]");
      if (quick && els.logProgress) {
        const value = clamp(Number(quick.dataset.adventureQuickProgress || 0), 0, 100);
        els.logProgress.value = String(value);
        updateLogProgressButtons();
      }
    });

    els.logClose?.addEventListener("click", closeLogDialog);
    els.logCancel?.addEventListener("click", closeLogDialog);
    els.logForm?.addEventListener("submit", logAdventureProgress);
    els.logPicker?.addEventListener("change", () => {
      const item = model().items.find(entry => entry.id === els.logPicker.value);
      if (item) configureLogForm(item);
    });
    els.logProgress?.addEventListener("input", updateLogProgressButtons);

    window.addEventListener("life-rpg:render", () => {
      if (!initialized) return;
      ensureState();
      render();
    });

    // The Adventures view can be entered long after startup. Re-render when it
    // becomes visible (and after bfcache restores) so the board never depends on
    // the timing of the initial app render.
    window.addEventListener("pageshow", () => {
      if (!initialized) return;
      ensureState();
      render();
    });
    document.addEventListener("click", event => {
      const nav = event.target.closest?.('[data-view="adventures"], [data-view-target="adventures"]');
      if (!nav || !initialized) return;
      requestAnimationFrame(() => {
        ensureState();
        render();
      });
    });
  }

  function ensureState() {
    const state = app.getState();
    let changed = false;
    if (!state.sideAdventures || typeof state.sideAdventures !== "object" || Array.isArray(state.sideAdventures)) {
      state.sideAdventures = readShadow() || defaultState();
      changed = true;
    }
    const model = state.sideAdventures;
    if (Number(model.schemaVersion || 0) < SCHEMA) { model.schemaVersion = SCHEMA; changed = true; }
    if (!Array.isArray(model.items)) { model.items = []; changed = true; }
    if (!Array.isArray(model.logs)) { model.logs = []; changed = true; }
    const safeItems = model.items.filter(item => item && typeof item === "object" && !Array.isArray(item));
    if (safeItems.length !== model.items.length) { model.items = safeItems; changed = true; }
    const safeLogs = model.logs.filter(item => item && typeof item === "object" && !Array.isArray(item));
    if (safeLogs.length !== model.logs.length) { model.logs = safeLogs; changed = true; }
    if (!model.curatedPacks || typeof model.curatedPacks !== "object" || Array.isArray(model.curatedPacks)) { model.curatedPacks = {}; changed = true; }
    if (!model.curatedPacks[CURATED_PACK_ID]) {
      importCuratedAdventurePack(model);
      model.curatedPacks[CURATED_PACK_ID] = Date.now();
      changed = true;
    }

    model.items.forEach(item => {
      if (!item.id) { item.id = makeId("adv"); changed = true; }
      if (!item.name) { item.name = "Untitled adventure"; changed = true; }
      if (!KINDS[item.kind]) { item.kind = "other"; changed = true; }
      if (!REALMS.includes(item.realm)) { item.realm = "Hobbies"; changed = true; }
      if (!["active", "paused", "finished"].includes(item.status)) { item.status = "active"; changed = true; }
      if (!ENERGY[item.energy]) { item.energy = "medium"; changed = true; }
      if (!Number.isFinite(Number(item.sessionMinutes))) { item.sessionMinutes = 30; changed = true; }
      if (!item.progressMode || !["percent", "simple"].includes(item.progressMode)) { item.progressMode = "percent"; changed = true; }
      item.progress = clamp(Number(item.progress || 0), 0, 100);
      if (!Number.isFinite(Number(item.progressIncrement))) { item.progressIncrement = 5; changed = true; }
      if (!Array.isArray(item.reasonTags)) { item.reasonTags = []; changed = true; }
      item.reasonTags = item.reasonTags.filter(tag => typeof tag === "string");
      if (!Array.isArray(item.roadmap)) { item.roadmap = []; changed = true; }
      const safeRoadmap = item.roadmap.filter(step => step && typeof step === "object" && !Array.isArray(step));
      if (safeRoadmap.length !== item.roadmap.length) { item.roadmap = safeRoadmap; changed = true; }
      item.roadmap.forEach((step, index) => {
        if (!step.id) { step.id = `${item.curatedId || item.id}-step-${index + 1}`; changed = true; }
        if (!step.label) { step.label = `Project step ${index + 1}`; changed = true; }
        if (!step.milestone) { step.milestone = "Roadmap"; changed = true; }
        if (!["pending", "done", "skipped"].includes(step.status)) { step.status = "pending"; changed = true; }
        if (!ENERGY[step.energy]) { step.energy = item.energy || "medium"; changed = true; }
        if (!Number.isFinite(Number(step.minutes))) { step.minutes = item.sessionMinutes || 30; changed = true; }
        if (!["research", "materials", "decision", "make", "finish"].includes(step.type)) { step.type = "make"; changed = true; }
        if (!step.key) { step.key = String(step.id || `${item.curatedId || item.id}-step-${index + 1}`); changed = true; }
        step.optional = Boolean(step.optional);
      });
      if (item.roadmap.length && item.roadmapManaged !== false) {
        const beforeSync = `${item.nextAction}|${item.progress}|${item.status}|${item.energy}|${item.sessionMinutes}`;
        syncRoadmapItem(item);
        const afterSync = `${item.nextAction}|${item.progress}|${item.status}|${item.energy}|${item.sessionMinutes}`;
        if (beforeSync !== afterSync) changed = true;
      }
      if (!item.createdAt) { item.createdAt = Date.now(); changed = true; }
      if (!item.updatedAt) { item.updatedAt = item.createdAt; changed = true; }
    });

    if (model.logs.length > MAX_LOGS) model.logs = model.logs.slice(-MAX_LOGS);
    writeShadow(model);
    return changed;
  }

  function importCuratedAdventurePack(currentModel) {
    const now = Date.now();
    CURATED_ADVENTURES.forEach((spec, specIndex) => {
      const existing = currentModel.items.find(item => item?.curatedId === spec.curatedId || String(item?.name || "").trim().toLowerCase() === spec.name.toLowerCase());
      if (existing) {
        if (!existing.curatedId) existing.curatedId = spec.curatedId;
        existing.sourceLabel = spec.sourceLabel || existing.sourceLabel || "";
        existing.sourceUrl = spec.sourceUrl || existing.sourceUrl || "";
        existing.sourceNote = spec.sourceNote || existing.sourceNote || "";
        if (!existing.note) existing.note = spec.note || "";
        if (!Array.isArray(existing.reasonTags) || !existing.reasonTags.length) existing.reasonTags = [...(spec.reasonTags || [])];
        existing.roadmap = mergeCuratedRoadmap(existing.roadmap, spec.roadmap, spec.curatedId);
        existing.roadmapManaged = true;
        syncRoadmapItem(existing);
        return;
      }
      const item = {
        id: `adv-curated-${spec.curatedId}`,
        curatedId: spec.curatedId,
        name: spec.name,
        kind: spec.kind || "other",
        realm: spec.realm || "Hobbies",
        status: "active",
        energy: spec.energy || "medium",
        sessionMinutes: Number(spec.sessionMinutes || 30),
        nextAction: "",
        progressMode: "percent",
        progress: 0,
        progressIncrement: 0,
        reasonTags: [...(spec.reasonTags || [])],
        note: spec.note || "",
        sourceLabel: spec.sourceLabel || "",
        sourceUrl: spec.sourceUrl || "",
        sourceNote: spec.sourceNote || "",
        roadmapManaged: true,
        roadmap: cloneRoadmap(spec.roadmap, spec.curatedId),
        sessions: 0,
        createdAt: now + specIndex,
        updatedAt: now + specIndex
      };
      syncRoadmapItem(item);
      currentModel.items.push(item);
    });
  }

  function normalizeRoadmapLabel(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function mergeCuratedRoadmap(existingSteps = [], newSteps = [], prefix = "roadmap") {
    const old = Array.isArray(existingSteps) ? existingSteps : [];
    const byKey = new Map(old.filter(step => step?.key).map(step => [String(step.key), step]));
    const byLabel = new Map(old.filter(step => step?.label).map(step => [normalizeRoadmapLabel(step.label), step]));
    return newSteps.map((step, index) => {
      const key = String(step.key || `step-${index + 1}`);
      const prior = byKey.get(key) || byLabel.get(normalizeRoadmapLabel(step.label));
      const fresh = cloneRoadmap([{ ...step, key }], prefix)[0];
      if (prior && ["done", "skipped"].includes(prior.status)) {
        fresh.status = prior.status;
        if (prior.completedAt) fresh.completedAt = prior.completedAt;
        if (prior.skippedAt) fresh.skippedAt = prior.skippedAt;
      }
      return fresh;
    });
  }

  function cloneRoadmap(steps = [], prefix = "roadmap") {
    return steps.map((step, index) => {
      const key = String(step.key || `step-${index + 1}`);
      return {
        id: `${prefix}-${key}`,
        key,
        type: ["research", "materials", "decision", "make", "finish"].includes(step.type) ? step.type : "make",
        milestone: String(step.milestone || "Roadmap"),
        label: String(step.label || `Project step ${index + 1}`),
        details: String(step.details || ""),
        minutes: clamp(Math.round(Number(step.minutes || 30)), 5, 240),
        energy: ENERGY[step.energy] ? step.energy : "medium",
        optional: Boolean(step.optional),
        warning: String(step.warning || ""),
        status: "pending"
      };
    });
  }

  function roadmapStats(item) {
    const steps = Array.isArray(item?.roadmap) ? item.roadmap : [];
    const done = steps.filter(step => step.status === "done").length;
    const skipped = steps.filter(step => step.status === "skipped").length;
    const resolved = done + skipped;
    const pending = Math.max(0, steps.length - resolved);
    return { total: steps.length, done, skipped, resolved, pending, percent: steps.length ? Math.round((resolved / steps.length) * 100) : 0 };
  }

  function currentRoadmapStep(item) {
    if (!Array.isArray(item?.roadmap)) return null;
    return item.roadmap.find(step => step.status === "pending") || null;
  }

  function syncRoadmapItem(item) {
    if (!Array.isArray(item?.roadmap) || !item.roadmap.length) return item;
    const stats = roadmapStats(item);
    item.progressMode = "percent";
    item.progressIncrement = 0;
    item.progress = stats.percent;
    const step = currentRoadmapStep(item);
    if (!step) {
      item.nextAction = "Roadmap complete";
      item.status = "finished";
      return item;
    }
    if (item.status === "finished") item.status = "active";
    item.nextAction = step.label;
    item.sessionMinutes = clamp(Math.round(Number(step.minutes || item.sessionMinutes || 30)), 5, 240);
    item.energy = ENERGY[step.energy] ? step.energy : item.energy;
    return item;
  }

  function roadmapNextProgress(item) {
    const steps = Array.isArray(item?.roadmap) ? item.roadmap : [];
    if (!steps.length) return clamp(Number(item?.progress || 0), 0, 100);
    const stats = roadmapStats(item);
    return Math.round((Math.min(steps.length, stats.resolved + 1) / steps.length) * 100);
  }

  function defaultState() {
    return { schemaVersion: SCHEMA, items: [], logs: [] };
  }

  function model() {
    ensureState();
    return app.getState().sideAdventures;
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
      window.dispatchEvent(new CustomEvent("life-rpg:adventure-change", { detail: { source } }));
    } catch { /* no-op */ }
  }

  function render() {
    renderSummary();
    renderBoard();
  }

  function renderSummary() {
    const items = Array.isArray(model().items) ? model().items.filter(item => item && typeof item === "object") : [];
    const active = items.filter(item => item.status === "active");
    const stale = active.filter(item => daysSince(item.lastTouchedAt || item.createdAt) >= 14);
    const almost = active.filter(item => item.progressMode === "percent" && Number(item.progress || 0) >= 75);
    if (els.activeSummary) els.activeSummary.textContent = String(active.length);
    if (els.staleSummary) els.staleSummary.textContent = String(stale.length);
    if (els.almostSummary) els.almostSummary.textContent = String(almost.length);
  }

  function renderBoard() {
    if (!els.board || !els.empty) return;

    try {
      const query = String(els.search?.value || "").trim().toLowerCase();
      const status = els.status?.value || "active";
      let items = Array.isArray(model().items)
        ? model().items.filter(item => item && typeof item === "object")
        : [];

      items = items.filter(item => status === "all" ? true : item.status === status);
      if (selectedKind !== "all") items = items.filter(item => item.kind === selectedKind);
      if (query) {
        items = items.filter(item => {
          const roadmap = Array.isArray(item.roadmap) ? item.roadmap.filter(step => step && typeof step === "object") : [];
          const haystack = [
            item.name, item.nextAction, item.note, item.realm, KINDS[item.kind]?.label,
            ...roadmap.flatMap(step => [step.label, step.details, step.milestone])
          ].map(value => String(value || "")).join(" ").toLowerCase();
          return haystack.includes(query);
        });
      }
      items.sort(sortAdventures);

      const cards = [];
      for (const item of items) {
        try {
          cards.push(adventureCardMarkup(item));
        } catch (error) {
          console.error("Life RPG could not render one Side Adventure card", item?.id, error);
          cards.push(`<article class="adventure-card-v15"><div class="empty-state compact"><strong>${esc(item?.name || "Side Adventure")}</strong><br>This project needs a small data repair. Its saved progress is still preserved.</div></article>`);
        }
      }

      els.board.innerHTML = cards.join("");
      const hasCards = cards.length > 0;
      els.empty.classList.toggle("hidden", hasCards);
      if (!hasCards) {
        const anySaved = Array.isArray(model().items) && model().items.length > 0;
        const heading = els.empty.querySelector("h3");
        const copy = els.empty.querySelector("p");
        const button = els.empty.querySelector("button");
        if (heading) heading.textContent = anySaved ? "No projects match this view." : "No Side Adventures here yet.";
        if (copy) copy.textContent = anySaved
          ? "Try All status/kinds or clear the search. Your saved Side Adventures are still there."
          : "Add something you genuinely want to return to. Side Adventures are for projects, crafts, collections and other open-ended things you want to keep moving.";
        if (button) button.textContent = anySaved ? "Add another project" : "Create the first one";
      }
    } catch (error) {
      console.error("Life RPG Side Adventure board render failed", error);
      els.board.innerHTML = "";
      els.empty.classList.remove("hidden");
      const heading = els.empty.querySelector("h3");
      const copy = els.empty.querySelector("p");
      if (heading) heading.textContent = "Your projects are still saved.";
      if (copy) copy.textContent = "The board hit a display error. Reloading this view will retry without deleting any project data.";
    }
  }

  function sortAdventures(a, b) {
    const statusRank = { active: 0, paused: 1, finished: 2 };
    const statusDiff = (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9);
    if (statusDiff) return statusDiff;
    const staleDiff = daysSince(b.lastTouchedAt || b.createdAt) - daysSince(a.lastTouchedAt || a.createdAt);
    if (Math.abs(staleDiff) > 6) return staleDiff;
    return Number(b.progress || 0) - Number(a.progress || 0) || String(a.name || "").localeCompare(String(b.name || ""));
  }

  function adventureCardMarkup(item) {
    const kind = KINDS[item.kind] || KINDS.other;
    const energy = ENERGY[item.energy] || ENERGY.medium;
    const last = lastTouchedLabel(item);
    const reasons = (Array.isArray(item.reasonTags) ? item.reasonTags : []).map(tag => REASONS[tag]).filter(Boolean);
    const progress = item.progressMode === "percent" ? clamp(Number(item.progress || 0), 0, 100) : null;
    const doneToday = touchedToday(item.id);
    const action = item.nextAction || "Choose one small next step";
    const statusLabel = item.status === "finished" ? "Finished" : item.status === "paused" ? "Paused" : "Active";

    return `
      <article class="adventure-card-v15 status-${escAttr(item.status)}">
        <header class="adventure-card-head-v15">
          <div class="adventure-card-icon-v15">${kind.icon}</div>
          <div class="adventure-card-title-v15">
            <div class="adventure-card-kickers-v15">
              <span>${esc(item.realm)}</span><span>${esc(kind.label)}</span><span>${esc(statusLabel)}</span>
            </div>
            <h3>${esc(item.name)}</h3>
          </div>
          <button class="habit-edit-button-v1" type="button" data-adventure-edit="${escAttr(item.id)}" aria-label="Edit ${escAttr(item.name)}">⋯</button>
        </header>

        ${progress === null ? "" : `
          <div class="adventure-progress-v15">
            <div class="row-between"><small>PROGRESS</small><strong>${progress}%</strong></div>
            <div class="progress"><span style="width:${progress}%"></span></div>
          </div>`}

        <section class="adventure-next-action-v15">
          <small>NEXT ACTION</small>
          <strong>${esc(action)}</strong>
          <span>${energy.icon} ${esc(energy.label)} · about ${Number(item.sessionMinutes || 30)} min</span>
        </section>

        ${reasons.length ? `<div class="adventure-reasons-v15">${reasons.map(reason => `<span>${reason.icon} ${esc(reason.label)}</span>`).join("")}</div>` : ""}
        ${item.note ? `<p class="adventure-note-v15">${esc(item.note)}</p>` : ""}
        ${roadmapMarkup(item)}

        <footer class="adventure-card-footer-v15">
          <span class="adventure-last-v15">${doneToday ? "✓ Touched today" : esc(last)}</span>
          <div class="adventure-card-actions-v15">
            ${item.status === "active" ? `<button class="primary-button" type="button" data-adventure-log="${escAttr(item.id)}">${doneToday ? "Log more" : "Log progress"}</button>` : ""}
            ${item.status !== "finished" ? `<button class="secondary-button" type="button" data-adventure-pause="${escAttr(item.id)}">${item.status === "paused" ? "Resume" : "Pause"}</button>` : ""}
          </div>
        </footer>
      </article>`;
  }

  function roadmapMarkup(item) {
    if (!Array.isArray(item?.roadmap) || !item.roadmap.length) return "";
    const stats = roadmapStats(item);
    const current = currentRoadmapStep(item);
    const milestones = [];
    item.roadmap.forEach(step => {
      let group = milestones.find(entry => entry.name === step.milestone);
      if (!group) { group = { name: step.milestone, steps: [] }; milestones.push(group); }
      group.steps.push(step);
    });
    const source = item.sourceUrl
      ? `<a class="adventure-source-link-v308" href="${escAttr(item.sourceUrl)}" target="_blank" rel="noreferrer">${esc(item.sourceLabel || "Reference source")} ↗</a>`
      : (item.sourceLabel ? `<span class="adventure-source-link-v308">${esc(item.sourceLabel)}</span>` : "");
    return `
      <details class="adventure-roadmap-v308">
        <summary><span>☷ ROADMAP</span><strong>${stats.resolved}/${stats.total} steps resolved</strong></summary>
        <div class="adventure-roadmap-body-v308">
          ${source ? `<div class="adventure-roadmap-source-v308">${source}${item.sourceNote ? `<p>${esc(item.sourceNote)}</p>` : ""}</div>` : ""}
          ${milestones.map(group => `
            <section class="adventure-roadmap-milestone-v308">
              <h4>${esc(group.name)}</h4>
              ${group.steps.map(step => {
                const isCurrent = current?.id === step.id;
                const stateIcon = step.status === "done" ? "✓" : step.status === "skipped" ? "↷" : isCurrent ? "→" : "○";
                const typeLabel = { research: "Research", materials: "Materials", decision: "Plan", make: "Make", finish: "Finish" }[step.type] || "Make";
                const meta = `${typeLabel} · ${ENERGY[step.energy]?.icon || "🌤️"} ${ENERGY[step.energy]?.label || "Medium energy"} · ~${Number(step.minutes || 30)} min${step.optional ? " · optional" : ""}`;
                return `<article class="adventure-roadmap-step-v308 status-${escAttr(step.status)} ${isCurrent ? "current" : ""}">
                  <span class="adventure-roadmap-state-v308">${stateIcon}</span>
                  <div><strong>${esc(step.label)}</strong><small>${esc(meta)}</small>${step.details ? `<p>${esc(step.details)}</p>` : ""}${step.warning ? `<p class="adventure-roadmap-warning-v308">⚠ ${esc(step.warning)}</p>` : ""}</div>
                  ${isCurrent && step.optional ? `<button class="secondary-button adventure-roadmap-skip-v308" type="button" data-adventure-roadmap-skip="${escAttr(item.id)}" data-adventure-step-id="${escAttr(step.id)}">Skip optional</button>` : ""}
                </article>`;
              }).join("")}
            </section>`).join("")}
        </div>
      </details>`;
  }

  function openAdventureDialog(id = null) {
    if (!els.dialog || !els.form) return;
    const item = id ? model().items.find(entry => entry.id === id) : null;
    els.form.reset();
    if (els.editId) els.editId.value = item?.id || "";
    if (els.dialogTitle) els.dialogTitle.textContent = item ? "Edit side adventure" : "Create a side adventure";
    els.deleteButton?.classList.toggle("hidden", !item);
    els.saveAnother?.classList.toggle("hidden", Boolean(item));
    if (els.name) els.name.value = item?.name || "";
    if (els.kind) els.kind.value = item?.kind || "creative";
    if (els.realm) els.realm.value = item?.realm || "Hobbies";
    if (els.statusField) els.statusField.value = item?.status || "active";
    if (els.energy) els.energy.value = item?.energy || "medium";
    if (els.minutes) els.minutes.value = String(item?.sessionMinutes || 30);
    if (els.nextAction) els.nextAction.value = item?.nextAction || "";
    if (els.progressMode) els.progressMode.value = item?.progressMode || "percent";
    if (els.progress) els.progress.value = String(item?.progress || 0);
    if (els.increment) els.increment.value = String(item?.progressIncrement ?? 5);
    if (els.note) els.note.value = item?.note || "";
    els.form.querySelectorAll("input[name='adventureReason']").forEach(input => { input.checked = item?.reasonTags?.includes(input.value) || false; });
    renderFormState();
    renderPreview();
    els.dialog.showModal();
    setTimeout(() => els.name?.focus(), 20);
  }

  function closeAdventureDialog() {
    if (els.dialog?.open) els.dialog.close();
  }

  function renderFormState() {
    const percent = els.progressMode?.value !== "simple";
    els.progressWrap?.classList.toggle("hidden", !percent);
    els.incrementWrap?.classList.toggle("hidden", !percent);
    renderPreview();
  }

  function renderPreview() {
    if (!els.preview) return;
    const percent = els.progressMode?.value !== "simple";
    const progress = clamp(Number(els.progress?.value || 0), 0, 100);
    const energy = ENERGY[els.energy?.value] || ENERGY.medium;
    els.preview.innerHTML = `
      <div><small>TODAY'S FINISH LINE</small><strong>${esc(els.nextAction?.value || "Add one specific next action")}</strong></div>
      <span>${energy.icon} ${esc(energy.label)} · about ${Number(els.minutes?.value || 30)} min${percent ? ` · ${progress}% complete` : ""}</span>`;
  }

  function saveAdventureFromDialog(event) {
    event.preventDefault();
    if (!els.form?.reportValidity()) return;
    const current = model();
    const id = els.editId?.value || "";
    const existing = current.items.find(item => item.id === id);
    const now = Date.now();
    const item = existing || { id: makeId("adv"), createdAt: now, sessions: 0 };
    item.name = String(els.name?.value || "").trim();
    item.kind = KINDS[els.kind?.value] ? els.kind.value : "other";
    item.realm = REALMS.includes(els.realm?.value) ? els.realm.value : "Hobbies";
    item.status = ["active", "paused", "finished"].includes(els.statusField?.value) ? els.statusField.value : "active";
    item.energy = ENERGY[els.energy?.value] ? els.energy.value : "medium";
    item.sessionMinutes = clamp(Math.round(Number(els.minutes?.value || 30)), 5, 240);
    item.nextAction = String(els.nextAction?.value || "").trim();
    item.progressMode = els.progressMode?.value === "simple" ? "simple" : "percent";
    item.progress = item.progressMode === "percent" ? clamp(Number(els.progress?.value || 0), 0, 100) : 0;
    item.progressIncrement = item.progressMode === "percent" ? clamp(Number(els.increment?.value || 0), 0, 100) : 0;
    item.reasonTags = [...els.form.querySelectorAll("input[name='adventureReason']:checked")].map(input => input.value).filter(tag => REASONS[tag]);
    item.note = String(els.note?.value || "").trim();
    item.updatedAt = now;
    if (item.progressMode === "percent" && item.progress >= 100) item.status = "finished";
    if (!existing) current.items.push(item);
    const stewardshipReward = existing ? null : window.LifeRPGStewardship?.rewardCreation?.({
      type: "adventure",
      id: item.id,
      label: item.name,
      fields: [item.name, item.kind]
    });
    const addAnother = !existing && event.submitter?.dataset.saveAnother === "true";
    persist(existing ? "side-adventure-edit" : "side-adventure-create");
    if (Number(stewardshipReward?.xp || 0) > 0 || Number(stewardshipReward?.storyEnergy || 0) > 0) app.renderAll?.();
    if (addAnother) {
      resetAdventureDialogForAnother({ kind: item.kind, realm: item.realm, energy: item.energy, sessionMinutes: item.sessionMinutes });
    } else {
      closeAdventureDialog();
    }
    if (stewardshipReward) {
      const upkeepText = window.LifeRPGStewardship?.statusText?.(stewardshipReward) || "";
      if (upkeepText) app.showToast?.(`Side Adventure added · ${upkeepText}`);
    }
  }

  function resetAdventureDialogForAnother(defaults = {}) {
    els.form?.reset();
    if (els.editId) els.editId.value = "";
    if (els.dialogTitle) els.dialogTitle.textContent = "Create a side adventure";
    els.deleteButton?.classList.add("hidden");
    els.saveAnother?.classList.remove("hidden");
    if (els.kind) els.kind.value = defaults.kind || "creative";
    if (els.realm) els.realm.value = defaults.realm || "Hobbies";
    if (els.energy) els.energy.value = defaults.energy || "medium";
    if (els.minutes) els.minutes.value = String(defaults.sessionMinutes || 30);
    if (els.statusField) els.statusField.value = "active";
    if (els.progressMode) els.progressMode.value = "percent";
    if (els.progress) els.progress.value = "0";
    if (els.increment) els.increment.value = "5";
    renderFormState();
    window.setTimeout(() => els.name?.focus(), 20);
  }

  function deleteCurrentAdventure() {
    const id = els.editId?.value;
    const item = model().items.find(entry => entry.id === id);
    if (!item) return;
    if (!window.confirm(`Delete “${item.name}”? Past logs for this adventure will also be removed.`)) return;
    const current = model();
    current.items = current.items.filter(entry => entry.id !== id);
    current.logs = current.logs.filter(log => log.adventureId !== id);
    persist("side-adventure-delete");
    closeAdventureDialog();
  }

  function togglePause(id) {
    const item = model().items.find(entry => entry.id === id);
    if (!item || item.status === "finished") return;
    item.status = item.status === "paused" ? "active" : "paused";
    item.updatedAt = Date.now();
    persist(item.status === "paused" ? "side-adventure-pause" : "side-adventure-resume");
  }

  function skipRoadmapStep(adventureId, stepId) {
    const item = model().items.find(entry => entry.id === adventureId);
    if (!item || !Array.isArray(item.roadmap) || !item.roadmap.length) return;
    const step = item.roadmap.find(entry => entry.id === stepId);
    const current = currentRoadmapStep(item);
    if (!step || !step.optional || step.status !== "pending" || current?.id !== step.id) return;
    step.status = "skipped";
    step.skippedAt = Date.now();
    item.updatedAt = step.skippedAt;
    syncRoadmapItem(item);
    persist("side-adventure-roadmap-skip");
    app.renderAll?.();
    app.showToast?.(`Skipped optional step · Next: ${item.nextAction || "roadmap complete"}`);
  }

  function openLogDialog(id) {
    const item = model().items.find(entry => entry.id === id);
    if (!item || !els.logDialog || !els.logForm) return;
    els.logForm.reset();
    populateLogPicker(item.id);
    configureLogForm(item);
    setChainLogStatus("");
    els.logDialog.showModal();
  }

  function populateLogPicker(selectedId = "") {
    if (!els.logPicker) return;
    const items = [...model().items].filter(item => item.status !== "finished").sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    els.logPicker.innerHTML = items.map(item => `<option value="${escAttr(item.id)}">${esc(item.name)}</option>`).join("");
    if (items.some(item => item.id === selectedId)) els.logPicker.value = selectedId;
  }

  function configureLogForm(item) {
    if (!item) return;
    const hasRoadmap = Array.isArray(item.roadmap) && item.roadmap.length > 0 && item.roadmapManaged !== false;
    const step = hasRoadmap ? currentRoadmapStep(item) : null;
    if (els.logId) els.logId.value = item.id;
    if (els.logPicker && els.logPicker.value !== item.id) els.logPicker.value = item.id;
    if (els.logTitle) els.logTitle.textContent = item.name;
    if (els.logFinishLine) els.logFinishLine.textContent = step?.label || item.nextAction || "Spend one focused session on this.";
    const percent = item.progressMode === "percent";
    els.logProgressWrap?.classList.toggle("hidden", !percent || hasRoadmap);
    if (els.logProgress) els.logProgress.value = String(hasRoadmap ? roadmapNextProgress(item) : (percent ? clamp(Number(item.progress || 0) + Number(item.progressIncrement || 0), 0, 100) : 0));
    if (els.logNextAction) {
      els.logNextAction.value = "";
      els.logNextAction.parentElement?.classList.toggle("hidden", hasRoadmap);
    }
    renderLogQuickButtons(hasRoadmap ? { ...item, progressMode: "simple" } : item);
  }

  function setChainLogStatus(message) {
    if (!els.logChainStatus) return;
    els.logChainStatus.textContent = message || "";
    els.logChainStatus.classList.toggle("hidden", !message);
  }

  function closeLogDialog() {
    if (els.logDialog?.open) els.logDialog.close();
    setChainLogStatus("");
  }

  function renderLogQuickButtons(item) {
    const holder = byId("adventureLogQuickProgress");
    if (!holder || item.progressMode !== "percent") {
      if (holder) holder.innerHTML = "";
      return;
    }
    const current = clamp(Number(item.progress || 0), 0, 100);
    const configured = clamp(Number(item.progressIncrement || 0), 0, 100);
    const options = [...new Set([configured ? current + configured : null, current + 5, current + 10, 100].filter(v => Number.isFinite(v)).map(v => clamp(v, 0, 100)))];
    holder.innerHTML = options.map(value => `<button type="button" class="adventure-progress-chip-v15" data-adventure-quick-progress="${value}">${value === 100 ? "Finish 100%" : `Set ${value}%`}</button>`).join("");
    updateLogProgressButtons();
  }

  function updateLogProgressButtons() {
    const value = Number(els.logProgress?.value || 0);
    byId("adventureLogQuickProgress")?.querySelectorAll("[data-adventure-quick-progress]").forEach(button => button.classList.toggle("active", Number(button.dataset.adventureQuickProgress) === value));
  }

  function adventureRewardSpec(item, at, roadmapStep = null) {
    const minutes = clamp(Number(roadmapStep?.minutes || item.sessionMinutes || item.minutes || 30), 10, 180);
    const rewardEnergy = roadmapStep?.energy || item.energy;
    const energyFactor = rewardEnergy === "high" ? 1.12 : rewardEnergy === "low" ? 0.9 : 1;
    const storyEnergyBase = Math.min(2.8, Math.max(0.35, minutes * 0.025 * energyFactor));
    const xp = Math.max(4, Math.round(storyEnergyBase * 10));
    const capability = app.inferCapability?.({
      realm: item.realm,
      label: item.name,
      kind: item.kind || "adventure"
    }) || "creativity";

    return {
      source: "adventure",
      sourceId: item.id,
      label: item.name,
      realm: item.realm,
      capability,
      xp,
      realmXP: xp,
      statXP: Math.max(1, Math.round(xp * 0.65)),
      coins: 10,
      storyEnergyBase,
      at: new Date(at).toISOString(),
      metadata: { minutes, energy: rewardEnergy, kind: item.kind, roadmapStepId: roadmapStep?.id || null, roadmapStepLabel: roadmapStep?.label || null }
    };
  }

  function logAdventureProgress(event) {
    event.preventDefault();
    const id = els.logId?.value;
    const item = model().items.find(entry => entry.id === id);
    if (!item) return;
    const before = clamp(Number(item.progress || 0), 0, 100);
    const wasFinished = item.status === "finished";
    const now = Date.now();
    const roadmapStep = Array.isArray(item.roadmap) && item.roadmap.length && item.roadmapManaged !== false ? currentRoadmapStep(item) : null;

    item.sessions = Number(item.sessions || 0) + 1;
    item.lastTouchedAt = now;
    item.updatedAt = now;

    let after = before;
    if (roadmapStep) {
      roadmapStep.status = "done";
      roadmapStep.completedAt = now;
      syncRoadmapItem(item);
      after = clamp(Number(item.progress || 0), 0, 100);
    } else {
      after = item.progressMode === "percent" ? clamp(Number(els.logProgress?.value || before), 0, 100) : before;
      item.progress = after;
      const nextAction = String(els.logNextAction?.value || "").trim();
      if (nextAction) item.nextAction = nextAction;
      if (item.progressMode === "percent" && after >= 100) item.status = "finished";
    }

    const reward = app.awardActivity?.(adventureRewardSpec(item, now, roadmapStep)) || {
      xp: 0, realmXP: 0, statXP: 0, storyEnergy: 0, rawStoryEnergy: 0, coins: 0
    };

    let finishReward = null;
    if (!wasFinished && item.status === "finished" && !item.finishRewardEventId) {
      finishReward = app.awardActivity?.({
        source: "adventure-finish",
        sourceId: item.id,
        label: `Finished: ${item.name}`,
        realm: item.realm,
        capability: app.inferCapability?.({ realm: item.realm, label: item.name, kind: item.kind || "adventure" }) || "creativity",
        xp: 15,
        realmXP: 15,
        statXP: 10,
        coins: 100,
        storyEnergyBase: 1.5,
        progressionRelevant: true,
        at: new Date(now).toISOString(),
        metadata: { adventureFinished: true }
      }) || null;
      item.finishRewardEventId = finishReward?.eventId || `local-adventure-finish-${now}`;
    }

    model().logs.push({
      id: makeId("advlog"),
      adventureId: item.id,
      at: now,
      date: todayKey(),
      progressBefore: before,
      progressAfter: after,
      roadmapStepId: roadmapStep?.id || null,
      roadmapStepLabel: roadmapStep?.label || null,
      xp: Number(reward.xp || 0),
      realmXP: Number(reward.realmXP || 0),
      statXP: Number(reward.statXP || 0),
      storyEnergy: Number(reward.storyEnergy || 0),
      rawStoryEnergy: Number(reward.rawStoryEnergy || 0),
      coins: Number(reward.coins || 0),
      finishCoins: Number(finishReward?.coins || 0),
      finishRewardEventId: finishReward?.eventId || null,
      rewardEventId: reward.eventId || null,
      deduped: Boolean(reward.deduped)
    });
    persist("side-adventure-progress");
    app.renderAll?.();
    const addAnother = event.submitter?.dataset.logAnother === "true";
    showToast(item, before, after, reward, finishReward, roadmapStep);
    if (addAnother) {
      populateLogPicker(item.status === "finished" ? "" : item.id);
      const nextItem = model().items.find(entry => entry.id === els.logPicker?.value);
      if (nextItem) {
        configureLogForm(nextItem);
        const nextLabel = nextItem.id === item.id && currentRoadmapStep(nextItem) ? ` Next: ${currentRoadmapStep(nextItem).label}` : "";
        setChainLogStatus(`✓ ${item.name} saved.${nextLabel} Pick another side adventure above or log another step.`);
        window.setTimeout(() => els.logPicker?.focus(), 20);
      } else {
        closeLogDialog();
      }
    } else {
      closeLogDialog();
    }
  }

  function showToast(item, before, after, reward = null, finishReward = null, roadmapStep = null) {
    if (!els.toast) return;
    if (els.toastTitle) els.toastTitle.textContent = item.name;
    if (els.toastDetail) {
      const delta = item.progressMode === "percent" && after !== before ? ` · ${after}% complete` : "";
      const rewardText = reward ? ` · +${app.formatEnergy?.(reward.storyEnergy) ?? reward.storyEnergy} 🔥 · +${Number(reward.xp || 0)} XP · +${Number(reward.coins || 0)} 🪙` : "";
      const finishText = finishReward ? ` · project finished +${Number(finishReward.coins || 0)} 🪙` : "";
      const stepText = roadmapStep ? ` · step complete${item.status === "finished" ? "" : ` · next: ${item.nextAction}`}` : "";
      els.toastDetail.textContent = `Progress logged${stepText}${delta}${rewardText}${finishText}`;
    }
    els.toast.classList.remove("hidden");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => els.toast?.classList.add("hidden"), 2800);
  }

  function touchedToday(id) {
    return model().logs.some(log => log.adventureId === id && (log.date === todayKey() || dateKeyFromValue(log.at) === todayKey()));
  }

  function lastTouchedLabel(item) {
    const timestamp = item.lastTouchedAt || item.createdAt;
    const days = daysSince(timestamp);
    if (!item.lastTouchedAt && days <= 0) return "Added today";
    if (!item.lastTouchedAt) return days === 1 ? "Not started · added 1 day ago" : `Not started · added ${days} days ago`;
    if (days <= 0) return "Touched today";
    if (days === 1) return "Last touched yesterday";
    if (days < 7) return `Last touched ${days} days ago`;
    if (days < 14) return `Last touched ${Math.floor(days / 7)} week ago`;
    if (days < 60) return `Last touched ${Math.floor(days / 7)} weeks ago`;
    return `Last touched ${Math.floor(days / 30)} months ago`;
  }

  function exposeApi() {
    window.LifeRPGAdventures = {
      getItems: () => [...model().items],
      getLogs: () => [...model().logs],
      getItem: id => model().items.find(item => item.id === id) || null,
      touchedToday,
      openCreate: () => openAdventureDialog(),
      openEdit: id => openAdventureDialog(id),
      openLog: id => openLogDialog(id),
      render
    };
  }

  function makeId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function todayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function dateKeyFromValue(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function daysSince(value) {
    if (!value) return 999;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 999;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((today - date) / 86400000));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
  }

  function byId(id) { return document.getElementById(id); }
  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }
  function escAttr(value) { return esc(value); }
})();
