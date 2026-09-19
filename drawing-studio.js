(() => {
  "use strict";

  const VERSION = "0.31.4cl";
  const DB_NAME = "life-rpg-drawing-studio-v2";
  const STORE = "drawings";
  const META_KEY = "lifeRpgDrawingStudioMetaV2";
  const LEGACY_META_KEY = "lifeRpgDrawingStudioMetaV1";
  const REWARD_QUEUE_KEY = "lifeRpgDrawingStudioRewardQueueV1";
  const WIDTH = 1200;
  const HEIGHT = 900;
  const MAX_ACTIONS = 800;

  const TRACKS = [
    { id: "all", icon: "✦", title: "All challenges", blurb: "30 guided studies" },
    { id: "dynamic", icon: "⚡", title: "Dynamic Figures", blurb: "Gesture, action, flow" },
    { id: "anatomy", icon: "◇", title: "Hands & Anatomy", blurb: "Structure and proportion" },
    { id: "hair", icon: "〰", title: "Faces & Hair", blurb: "Hair masses and motion" },
    { id: "perspective", icon: "▱", title: "Perspective & BG", blurb: "Space and environments" },
    { id: "rendering", icon: "◐", title: "Color & Rendering", blurb: "Value and light" },
    { id: "story", icon: "✧", title: "Story Illustration", blurb: "Images that communicate" }
  ];

  const TRACK_RESOURCES = {
    dynamic: [
      { label: "Proko · Figure Drawing Fundamentals", url: "https://www.proko.com/course/figure-drawing-fundamentals" },
      { label: "Line of Action · Figure practice", url: "https://line-of-action.com/practice-tools" }
    ],
    anatomy: [
      { label: "Proko · Figure Drawing Fundamentals", url: "https://www.proko.com/course/figure-drawing-fundamentals" },
      { label: "Line of Action · Hands & figure practice", url: "https://line-of-action.com/practice-tools" }
    ],
    hair: [
      { label: "Proko · Drawing Basics", url: "https://www.proko.com/course/drawing-basics" }
    ],
    perspective: [
      { label: "Proko · Perspective Fundamentals", url: "https://www.proko.com/course/the-perspective-course" },
      { label: "Ctrl+Paint · Free Video Library", url: "https://www.ctrlpaint.com/library" }
    ],
    rendering: [
      { label: "Ctrl+Paint · Digital Painting Library", url: "https://www.ctrlpaint.com/library" },
      { label: "Proko · Drawing Basics · Value & Edges", url: "https://www.proko.com/course/drawing-basics" }
    ],
    story: [
      { label: "Ctrl+Paint · Composition & Film Studies", url: "https://www.ctrlpaint.com/library" }
    ]
  };

  const REWARDS = {
    small:  { xp: 10, realmXP: 10, statXP: 7, coins: 8, storyEnergyBase: .20, skillXP: 8 },
    medium: { xp: 14, realmXP: 14, statXP: 10, coins: 12, storyEnergyBase: .28, skillXP: 11 },
    large:  { xp: 19, realmXP: 19, statXP: 14, coins: 16, storyEnergyBase: .38, skillXP: 15 },
    epic:   { xp: 28, realmXP: 28, statXP: 20, coins: 24, storyEnergyBase: .55, skillXP: 22 }
  };

  const CHALLENGES = [
    {
      id: "gesture-30s-five",
      track: "dynamic",
      icon: "⚡",
      type: "TIMED GESTURE",
      title: "5× 30s Gesture Burst",
      summary: "Five tiny poses where motion matters more than anatomy.",
      goal: "Train your eye to find the whole pose, line of action and weight before details steal your attention.",
      remember: "These are allowed to look messy. If a pose reads in a few sweeping lines, the exercise is working.",
      steps: [
        "Pick a figure reference and find the main line of action before drawing anything else.",
        "Add only the head, ribcage/pelvis direction and limb flow.",
        "Stop when the 30 seconds end — do not polish.",
        "Repeat for five different poses and compare which one feels most alive."
      ],
      minutes: 3,
      difficulty: "Intermediate",
      rewardClass: "small",
      tags: ["Gesture", "Warm-up", "Pose"],
      timer: { rounds: 5, secondsPerRound: 30 },
      referenceTitle: "Figure reference",
      referenceText: "Use any pose reference. Line of Action's figure practice tool is ideal for fast timed poses.",
      referenceUrl: "https://line-of-action.com/practice-tools",
      guide: drawGestureGuide
    },
    {
      id: "gesture-2m-three",
      track: "dynamic",
      icon: "⏱",
      type: "TIMED GESTURE",
      title: "3× 2-Minute Action Pose",
      summary: "Long enough to add structure, short enough to keep the energy.",
      goal: "Keep the gesture while adding ribcage, pelvis and simple limbs as three-dimensional masses.",
      remember: "Do not replace the gesture with an outline. Build on top of it.",
      steps: [
        "Spend the first 20 seconds on line of action and tilt.",
        "Block in ribcage and pelvis as simple volumes.",
        "Connect limbs with cylinders or tapered forms.",
        "Use the final seconds only to clarify overlaps and weight."
      ],
      minutes: 6,
      difficulty: "Intermediate",
      rewardClass: "small",
      tags: ["Gesture", "Structure", "Pose"],
      timer: { rounds: 3, secondsPerRound: 120 },
      referenceTitle: "Figure reference",
      referenceText: "Use a different pose each round. Aim for action, not finished anatomy.",
      referenceUrl: "https://line-of-action.com/practice-tools",
      guide: drawGestureStructureGuide
    },
    {
      id: "push-the-pose",
      track: "dynamic",
      icon: "↗",
      type: "POSE DESIGN",
      title: "Push the Pose",
      summary: "Draw a pose once, then redraw it with stronger curves, tilt and intent.",
      goal: "Learn to exaggerate a pose without losing its balance or readability.",
      remember: "The second version should feel more decisive, not merely more distorted.",
      steps: [
        "Sketch the reference pose simply on the left side.",
        "Identify the biggest curve, counter-curve and weight-bearing leg.",
        "On the right, exaggerate those choices by roughly 15–30%.",
        "Compare silhouettes: which version communicates the action faster?"
      ],
      minutes: 10,
      difficulty: "Intermediate",
      rewardClass: "medium",
      tags: ["Gesture", "Exaggeration", "Pose"],
      timer: { rounds: 1, secondsPerRound: 600 },
      referenceTitle: "Pose reference",
      referenceText: "Use a standing, reaching, running or turning pose. The built-in split guide is only a workspace cue.",
      referenceUrl: "https://line-of-action.com/practice-tools",
      guide: drawPushPoseGuide
    },
    {
      id: "ribcage-pelvis-twist",
      track: "anatomy",
      icon: "◇",
      type: "CONSTRUCTION",
      title: "Ribcage + Pelvis Twist",
      summary: "Six tiny torsos: tilt, lean and twist without arms or details.",
      goal: "See the torso as two major masses with an elastic relationship instead of one stiff block.",
      remember: "Keep them simple enough that you can clearly see which way each mass faces.",
      steps: [
        "Use the six guide slots as separate mini studies.",
        "Draw ribcage as an egg/box and pelvis as a simplified block.",
        "Change tilt, twist and lean in every slot.",
        "Add one centerline around each mass to show its orientation."
      ],
      minutes: 10,
      difficulty: "Intermediate",
      rewardClass: "medium",
      tags: ["Anatomy", "Torso", "Twist"],
      timer: { rounds: 1, secondsPerRound: 600 },
      referenceTitle: "Construction guide",
      referenceText: "The faint examples show orientation only; invent your own six combinations rather than tracing them exactly.",
      guide: drawTorsoTwistGuide
    },
    {
      id: "action-mannequin",
      track: "anatomy",
      icon: "◈",
      type: "CONSTRUCTION",
      title: "Action Mannequin",
      summary: "Build one dynamic figure entirely from simple 3D forms before anatomy.",
      goal: "Make the body occupy believable space so anatomy has something solid to sit on later.",
      remember: "Boxes, cylinders and spheres are not childish shortcuts — they are the structure.",
      steps: [
        "Lay down a line of action.",
        "Add head, ribcage and pelvis as simple masses with clear perspective.",
        "Build limbs from cylinders and joints from simple balls/hinges.",
        "Only after the mannequin reads clearly, add a loose outer contour."
      ],
      minutes: 15,
      difficulty: "Intermediate",
      rewardClass: "medium",
      tags: ["Construction", "3D Form", "Pose"],
      timer: { rounds: 1, secondsPerRound: 900 },
      referenceTitle: "Pose reference",
      referenceText: "Choose any dynamic figure photo. Reduce it aggressively to simple forms first.",
      referenceUrl: "https://line-of-action.com/practice-tools",
      guide: drawMannequinGuide
    },
    {
      id: "hand-open-fist-point",
      track: "anatomy",
      icon: "✋",
      type: "HAND STUDY",
      title: "Open / Fist / Point",
      summary: "Three hand gestures built from palm mass, finger groups and direction.",
      goal: "Stop thinking of hands as ten complicated outlines and start seeing a palm block plus grouped finger forms.",
      remember: "Get the gesture and palm angle right before separating every finger.",
      steps: [
        "Block the palm as a flattened box or wedge.",
        "Mark the knuckle arc and thumb base.",
        "Group the fingers before drawing individual digits.",
        "Do one open hand, one fist and one pointing hand."
      ],
      minutes: 10,
      difficulty: "Intermediate",
      rewardClass: "small",
      tags: ["Hands", "Construction", "Gesture"],
      timer: { rounds: 1, secondsPerRound: 600 },
      referenceTitle: "Hand reference",
      referenceText: "Use photo references; the guide only shows the three workspace targets.",
      referenceUrl: "https://line-of-action.com/practice-tools",
      guide: drawHandSlotsGuide
    },
    {
      id: "hands-doing-something",
      track: "anatomy",
      icon: "☕",
      type: "INTERACTION STUDY",
      title: "Hands Doing Something",
      summary: "A hand holding a mug, phone, sleeve or other object.",
      goal: "Practice contact, grip and object interaction so hands become part of the story instead of isolated anatomy homework.",
      remember: "Draw the object first. The hand has to wrap around something that actually exists in space.",
      steps: [
        "Choose a simple object and draw its main volume in perspective.",
        "Add the palm mass where it contacts the object.",
        "Place the thumb and finger group around the form.",
        "Clarify overlaps and pressure/contact points last."
      ],
      minutes: 15,
      difficulty: "Intermediate",
      rewardClass: "medium",
      tags: ["Hands", "Props", "Interaction"],
      timer: { rounds: 1, secondsPerRound: 900 },
      referenceTitle: "Hand + object reference",
      referenceText: "A photo of your own hand holding a mug or phone works perfectly for this challenge.",
      guide: drawHandObjectGuide
    },
    {
      id: "hair-big-shapes",
      track: "hair",
      icon: "〰",
      type: "HAIR STUDY",
      title: "Hair as Big Shapes",
      summary: "Three hairstyles using only major masses before individual strands.",
      goal: "Make hair feel designed and dimensional instead of a collection of disconnected spikes or lines.",
      remember: "Start from the skull. Hair sits on top of the head and has volume away from it.",
      steps: [
        "Draw three simple head masses.",
        "Add the overall hair silhouette with 3–6 large clumps only.",
        "Show the parting/root direction and the main flow.",
        "Add just a few secondary strands where they help the form."
      ],
      minutes: 10,
      difficulty: "Intermediate",
      rewardClass: "small",
      tags: ["Hair", "Shape", "Design"],
      timer: { rounds: 1, secondsPerRound: 600 },
      referenceTitle: "Hair construction guide",
      referenceText: "The built-in heads show skull volume and flow arrows, not finished hairstyles to copy.",
      guide: drawHairMassGuide
    },
    {
      id: "hair-flow-study",
      track: "hair",
      icon: "≈",
      type: "MOTION STUDY",
      title: "Hair Flow Study",
      summary: "Five small studies where hair reacts to gravity and movement.",
      goal: "Use hair to reinforce head direction, gravity and the character's motion.",
      remember: "Hair flow should serve the pose. Avoid making every clump point in a different unrelated direction.",
      steps: [
        "Mark the head tilt and root/parting area.",
        "Choose one dominant flow direction for each study.",
        "Group hair into large ribbons or clumps following that flow.",
        "Vary only the secondary strands after the big movement works."
      ],
      minutes: 15,
      difficulty: "Intermediate",
      rewardClass: "medium",
      tags: ["Hair", "Motion", "Flow"],
      timer: { rounds: 1, secondsPerRound: 900 },
      referenceTitle: "Flow guide",
      referenceText: "Use screenshots or photos with turning, wind or falling hair. The guide gives five flow directions to test.",
      guide: drawHairFlowGuide
    },
    {
      id: "one-point-room",
      track: "perspective",
      icon: "▱",
      type: "PERSPECTIVE",
      title: "One-Point Room",
      summary: "Construct a simple room, then make it feel lived in.",
      goal: "Practice horizon, vanishing point and believable depth without getting buried in architectural detail.",
      remember: "Perspective is there to organize space. A simple convincing room beats a detailed broken one.",
      steps: [
        "Use or move away from the guide horizon and vanishing point.",
        "Block floor, ceiling and side walls with converging lines.",
        "Add two large furniture forms such as bed, desk or couch.",
        "Finish with 3–5 small story props that imply who lives there."
      ],
      minutes: 25,
      difficulty: "Intermediate",
      rewardClass: "large",
      tags: ["Perspective", "Background", "Interior"],
      timer: { rounds: 1, secondsPerRound: 1500 },
      referenceTitle: "Perspective grid",
      referenceText: "The built-in guide supplies a horizon, vanishing point and light grid. Toggle it off periodically to check whether the room still reads.",
      guide: drawOnePointRoomGuide
    },
    {
      id: "three-value-study",
      track: "rendering",
      icon: "◐",
      type: "VALUE STUDY",
      title: "3-Value Study",
      summary: "Reduce a reference to light, mid and dark before rendering anything.",
      goal: "Train value grouping so lighting and focal point remain readable even without detail or color.",
      remember: "Do not chase tiny gradients. Decide which of three value families each shape belongs to.",
      steps: [
        "Pick a reference with a clear light direction.",
        "Squint or zoom out and identify the largest light, mid and dark shapes.",
        "Block those three groups with broad strokes only.",
        "Check the thumbnail size: the subject and light direction should still read."
      ],
      minutes: 15,
      difficulty: "Intermediate",
      rewardClass: "medium",
      tags: ["Value", "Light", "Rendering"],
      timer: { rounds: 1, secondsPerRound: 900 },
      referenceTitle: "Value guide",
      referenceText: "The built-in strip shows three target value families. Use any photo or anime still with strong lighting as your subject.",
      guide: drawValueGuide
    },
    {
      id: "moment-before",
      track: "story",
      icon: "✧",
      type: "MINI ILLUSTRATION",
      title: "Moment Before",
      summary: "Draw the instant immediately before something important happens.",
      goal: "Tell a story through pose, staging, environment and anticipation — not through a caption.",
      remember: "Ask what changed one second before and what will change one second after. Put clues for both in the frame.",
      steps: [
        "Write one sentence: what is about to happen?",
        "Make three tiny composition thumbnails before choosing one.",
        "Place character action and the main environmental clue before details.",
        "Use foreground/midground/background and one clear light direction.",
        "Stop when the story reads; polish is optional."
      ],
      minutes: 30,
      difficulty: "Intermediate",
      rewardClass: "large",
      tags: ["Story", "Composition", "Scene"],
      timer: { rounds: 1, secondsPerRound: 1800 },
      referenceTitle: "Story staging guide",
      referenceText: "The guide gives three thumbnail frames and a larger final frame. The content is entirely yours.",
      guide: drawStoryGuide
    }
    ,
    {
      id: "balance-check-pose",
      track: "dynamic",
      icon: "⚖",
      type: "POSE CHECK",
      title: "Balance Check Pose",
      summary: "Build a standing or leaning pose that actually feels supported by gravity.",
      goal: "Train weight distribution, center of gravity and readable support so your characters stop feeling like they might topple over.",
      remember: "A dynamic pose can be extreme and still feel balanced if the weight has somewhere believable to go.",
      steps: [
        "Draw the line of action and mark the head, ribcage and pelvis tilt.",
        "Mark the weight-bearing foot and imagine a vertical plumb line from the body's center of mass.",
        "Adjust hips, knees and shoulders until the pose feels supported.",
        "Redraw once with a slightly stronger lean while preserving believable balance."
      ],
      minutes: 10,
      difficulty: "Intermediate",
      rewardClass: "medium",
      tags: ["Pose", "Balance", "Gesture"],
      timer: { rounds: 1, secondsPerRound: 600 },
      referenceTitle: "Balance practice",
      referenceText: "Use any standing, leaning or contrapposto photo. The built-in guide gives you a plumb line and support zone.",
      referenceUrl: "https://line-of-action.com/practice-tools",
      guide: drawBalanceGuide
    },
    {
      id: "two-character-reaction",
      track: "dynamic",
      icon: "⇄",
      type: "INTERACTION POSE",
      title: "Two Characters, One Reaction",
      summary: "Make two bodies react to the same event instead of posing independently.",
      goal: "Practice shared action, opposing gesture and spatial interaction so a scene feels like something is happening.",
      remember: "The relationship between the poses matters more than either pose by itself.",
      steps: [
        "Choose a simple event: pull, catch, shove, grab, dodge or turn toward something.",
        "Draw both lines of action before adding anatomy.",
        "Place the shared contact point or common focal point.",
        "Build the figures as simple forms and check that their forces feel connected."
      ],
      minutes: 20,
      difficulty: "Intermediate",
      rewardClass: "medium",
      tags: ["Pose", "Interaction", "Story"],
      timer: { rounds: 1, secondsPerRound: 1200 },
      referenceTitle: "Interaction pose",
      referenceText: "Use two-person action references or stage the pose yourself with simple stick figures first.",
      referenceUrl: "https://line-of-action.com/practice-tools",
      guide: drawInteractionGuide
    },
    {
      id: "body-proportion-debug",
      track: "anatomy",
      icon: "⌁",
      type: "PROPORTION STUDY",
      title: "Body Proportion Debug",
      summary: "Draw a figure, measure it, then deliberately fix the parts that feel off.",
      goal: "Turn 'I can see something is wrong' into a repeatable correction process using landmarks and comparative measuring.",
      remember: "The goal is not a perfect canon ratio; it is consistency inside the figure you chose to draw.",
      steps: [
        "Sketch the full figure quickly without measuring.",
        "Mark head height, shoulder line, ribcage, pelvis, knees and feet.",
        "Compare major lengths and widths against your reference.",
        "Redraw the corrected version beside the first one and note the biggest change."
      ],
      minutes: 15,
      difficulty: "Intermediate",
      rewardClass: "medium",
      tags: ["Proportions", "Measuring", "Figure"],
      timer: { rounds: 1, secondsPerRound: 900 },
      referenceTitle: "Proportion correction",
      referenceText: "Use a full-body reference with a clear camera angle. The guide gives landmark lines, not a fixed anime body ratio.",
      referenceUrl: "https://www.proko.com/course/figure-drawing-fundamentals",
      guide: drawProportionGuide
    },
    {
      id: "head-turn-sheet",
      track: "hair",
      icon: "◔",
      type: "HEAD STUDY",
      title: "Head Turn Sheet",
      summary: "Keep one character recognizable across front, 3/4, profile and tilted views.",
      goal: "Practice skull volume, feature placement and consistency when the head rotates in space.",
      remember: "The centerline and brow line wrap around the head; they are not flat stickers on the face.",
      steps: [
        "Draw four simple head masses first.",
        "Wrap a centerline and brow line around each head.",
        "Place jaw, eyes, nose and mouth using those guides.",
        "Only then add the character's specific hair silhouette and details."
      ],
      minutes: 20,
      difficulty: "Intermediate",
      rewardClass: "medium",
      tags: ["Face", "Perspective", "Consistency"],
      timer: { rounds: 1, secondsPerRound: 1200 },
      referenceTitle: "Head rotation",
      referenceText: "Use one character or face reference and reconstruct it from several angles. The guide gives four head slots with wrap lines.",
      guide: drawHeadTurnGuide
    },
    {
      id: "expression-quartet",
      track: "hair",
      icon: "☺",
      type: "EXPRESSION STUDY",
      title: "Expression Quartet",
      summary: "Draw the same face as neutral, annoyed, smug and hurt without losing identity.",
      goal: "Practice expression through brows, eyes, mouth and head attitude rather than changing the whole character design.",
      remember: "Tiny changes around the eyes and mouth often carry more emotion than huge distortions.",
      steps: [
        "Block the same head angle four times.",
        "Keep face proportions and hairstyle consistent.",
        "Change brows and eyes first, then mouth and cheek tension.",
        "Compare the four silhouettes and make sure identity survives the expression shift."
      ],
      minutes: 20,
      difficulty: "Intermediate",
      rewardClass: "medium",
      tags: ["Face", "Expression", "Consistency"],
      timer: { rounds: 1, secondsPerRound: 1200 },
      referenceTitle: "Expression grid",
      referenceText: "Use your own character or an anime reference sheet. The guide simply separates four expression slots.",
      guide: drawExpressionGuide
    },
    {
      id: "hair-in-action",
      track: "hair",
      icon: "➰",
      type: "MOTION STUDY",
      title: "Hair in Action",
      summary: "Let hair reinforce a turn, run or sudden stop instead of behaving like a helmet.",
      goal: "Coordinate head movement, gravity and secondary motion so hair supports the pose.",
      remember: "Hair lags behind motion. The roots follow the skull; the lengths follow momentum and gravity.",
      steps: [
        "Choose a turning, running or falling pose.",
        "Mark the head direction and the opposite lag direction of the hair mass.",
        "Draw 3–5 large ribbons or clumps before any strands.",
        "Add a few smaller strands only where they reinforce the main motion."
      ],
      minutes: 20,
      difficulty: "Intermediate",
      rewardClass: "medium",
      tags: ["Hair", "Motion", "Pose"],
      timer: { rounds: 1, secondsPerRound: 1200 },
      referenceTitle: "Hair motion",
      referenceText: "Use photos, animation stills or your own character turning quickly. The guide shows delayed flow directions.",
      guide: drawHairActionGuide
    },
    {
      id: "two-point-street",
      track: "perspective",
      icon: "⌂",
      type: "PERSPECTIVE",
      title: "Two-Point Street Corner",
      summary: "Build a simple street corner with believable depth before adding detail.",
      goal: "Practice two vanishing directions and repeated architectural forms without overcomplicating the scene.",
      remember: "Keep the big boxes correct first. Windows and signs cannot rescue broken space.",
      steps: [
        "Place a horizon and two vanishing points outside or near the frame.",
        "Build one main corner box and extend two street directions.",
        "Add two or three secondary building boxes.",
        "Use repeated windows, signs or pavement lines to reinforce depth."
      ],
      minutes: 25,
      difficulty: "Intermediate",
      rewardClass: "large",
      tags: ["Perspective", "Background", "Urban"],
      timer: { rounds: 1, secondsPerRound: 1500 },
      referenceTitle: "Two-point guide",
      referenceText: "The built-in guide gives horizon and two vanishing directions. Use a simple street photo only for design ideas.",
      referenceUrl: "https://www.proko.com/course/the-perspective-course",
      guide: drawTwoPointGuide
    },
    {
      id: "cafe-corner",
      track: "perspective",
      icon: "☕",
      type: "BACKGROUND STUDY",
      title: "Café Corner",
      summary: "Turn boxes into a small believable interior with furniture and a focal area.",
      goal: "Practice interior depth, object scale and making a background feel designed instead of empty.",
      remember: "A few large furniture masses and clear depth cues are enough to sell a space.",
      steps: [
        "Choose one-point or two-point perspective and place the horizon.",
        "Block walls, floor and the largest furniture masses.",
        "Add a table, booth, counter or shelf using the same perspective system.",
        "Finish with 3–5 props that imply what kind of café this is."
      ],
      minutes: 25,
      difficulty: "Intermediate",
      rewardClass: "large",
      tags: ["Background", "Interior", "Perspective"],
      timer: { rounds: 1, secondsPerRound: 1500 },
      referenceTitle: "Interior construction",
      referenceText: "Use the guide as a room box and add your own furniture. A real café photo can help with design and prop ideas.",
      referenceUrl: "https://www.ctrlpaint.com/library",
      guide: drawCafeGuide
    },
    {
      id: "character-in-space",
      track: "perspective",
      icon: "♙",
      type: "FIGURE + SPACE",
      title: "Character in Space",
      summary: "Place a character convincingly inside a perspective room instead of floating in front of it.",
      goal: "Connect eye level, body scale and floor contact so character and environment feel like one scene.",
      remember: "The feet, horizon and camera height determine whether the figure belongs in the room.",
      steps: [
        "Construct a simple room or street box first.",
        "Mark the horizon and choose where the character stands on the ground plane.",
        "Block the figure with simple forms at the correct scale.",
        "Check feet contact, head height and overlaps with nearby objects."
      ],
      minutes: 20,
      difficulty: "Intermediate",
      rewardClass: "large",
      tags: ["Perspective", "Figure", "Scene"],
      timer: { rounds: 1, secondsPerRound: 1200 },
      referenceTitle: "Figure placement",
      referenceText: "The guide gives a room grid plus two possible figure positions. Use it as a scale check, not a tracing target.",
      referenceUrl: "https://www.proko.com/course/the-perspective-course",
      guide: drawCharacterSpaceGuide
    },
    {
      id: "depth-layering",
      track: "perspective",
      icon: "▤",
      type: "COMPOSITION STUDY",
      title: "Foreground / Midground / Background",
      summary: "Create a scene with three clear depth layers instead of one flat stage.",
      goal: "Use overlap, scale and contrast to make a simple scene feel deeper and more cinematic.",
      remember: "Every layer should have a job: frame, subject, or context.",
      steps: [
        "Block one large foreground shape that partially frames the image.",
        "Place the main character or action in the midground.",
        "Add a simpler background layer with smaller shapes and lower contrast.",
        "Check the image at thumbnail size: the depth should still read."
      ],
      minutes: 20,
      difficulty: "Intermediate",
      rewardClass: "medium",
      tags: ["Composition", "Depth", "Background"],
      timer: { rounds: 1, secondsPerRound: 1200 },
      referenceTitle: "Depth layers",
      referenceText: "The guide divides the frame into three conceptual depth zones. Use any scene idea you like.",
      referenceUrl: "https://www.ctrlpaint.com/library",
      guide: drawDepthGuide
    },
    {
      id: "single-light-source",
      track: "rendering",
      icon: "☀",
      type: "LIGHT STUDY",
      title: "Single Light Source",
      summary: "Shade one head or torso using one clear light direction and simple planes.",
      goal: "Make form readable with deliberate light and shadow instead of adding random soft shading everywhere.",
      remember: "Choose the light direction first. Every shadow decision should answer to it.",
      steps: [
        "Draw or reuse a simple head or torso sketch.",
        "Place one light arrow and divide the form into light-facing and shadow-facing planes.",
        "Block the shadow family as one large shape.",
        "Add only a few soft transitions where the form turns gradually."
      ],
      minutes: 20,
      difficulty: "Intermediate",
      rewardClass: "medium",
      tags: ["Light", "Shading", "Form"],
      timer: { rounds: 1, secondsPerRound: 1200 },
      referenceTitle: "Light direction",
      referenceText: "The guide gives a simple head mass and movable-looking light arrow. You can replace it with your own sketch.",
      referenceUrl: "https://www.ctrlpaint.com/library",
      guide: drawSingleLightGuide
    },
    {
      id: "warm-light-cool-shadow",
      track: "rendering",
      icon: "◑",
      type: "COLOR STUDY",
      title: "Warm Light / Cool Shadow",
      summary: "Use temperature contrast to make a simple portrait or scene feel more intentional.",
      goal: "Practice separating light and shadow families by temperature as well as value.",
      remember: "Warm/cool is a relationship, not a rule that every lit pixel must be orange and every shadow blue.",
      steps: [
        "Choose a simple sketch with one main light direction.",
        "Pick one warm light family and one cooler shadow family.",
        "Keep values readable before adding saturation changes.",
        "Add one small accent color only after the big temperature split works."
      ],
      minutes: 20,
      difficulty: "Intermediate",
      rewardClass: "medium",
      tags: ["Color", "Light", "Temperature"],
      timer: { rounds: 1, secondsPerRound: 1200 },
      referenceTitle: "Temperature split",
      referenceText: "The built-in swatches show one possible warm/cool relationship. Choose your own hues if you prefer.",
      referenceUrl: "https://www.ctrlpaint.com/library",
      guide: drawWarmCoolGuide
    },
    {
      id: "limited-palette",
      track: "rendering",
      icon: "◍",
      type: "COLOR THEORY",
      title: "Limited Palette",
      summary: "Finish a small study using only four or five chosen colors.",
      goal: "Practice harmony and deliberate color relationships instead of solving every local color separately.",
      remember: "A limited palette should still have value contrast. Fewer hues does not mean flatter lighting.",
      steps: [
        "Choose 4–5 colors with at least one light, one dark and one accent.",
        "Make a tiny palette strip before painting.",
        "Block the whole image using only those colors.",
        "Mix or blend between them rather than introducing new colors."
      ],
      minutes: 20,
      difficulty: "Intermediate",
      rewardClass: "medium",
      tags: ["Color", "Palette", "Harmony"],
      timer: { rounds: 1, secondsPerRound: 1200 },
      referenceTitle: "Palette planning",
      referenceText: "The guide gives five empty swatch slots and a study frame. Fill the swatches before starting the image.",
      referenceUrl: "https://www.ctrlpaint.com/library",
      guide: drawPaletteGuide
    },
    {
      id: "same-sketch-three-moods",
      track: "rendering",
      icon: "☼",
      type: "MOOD STUDY",
      title: "Same Sketch, 3 Moods",
      summary: "Use one composition three times: cozy, tense and melancholic.",
      goal: "Practice changing story mood through value, temperature and accent placement without redesigning the drawing.",
      remember: "If the mood changes only because you changed one hue slider, push the lighting and value pattern further.",
      steps: [
        "Make or reuse one very simple composition.",
        "Duplicate it into three small frames.",
        "Assign each frame a different dominant value pattern and temperature bias.",
        "Add one accent color per mood and compare which version reads fastest."
      ],
      minutes: 30,
      difficulty: "Intermediate",
      rewardClass: "large",
      tags: ["Color", "Mood", "Lighting"],
      timer: { rounds: 1, secondsPerRound: 1800 },
      referenceTitle: "Three mood frames",
      referenceText: "The guide provides three identical frames for cozy, tense and melancholic passes.",
      referenceUrl: "https://www.ctrlpaint.com/library",
      guide: drawMoodGuide
    },
    {
      id: "composition-thumbnails",
      track: "story",
      icon: "▦",
      type: "COMPOSITION",
      title: "Tiny Composition Thumbnails",
      summary: "Explore six versions of the same scene before committing to one.",
      goal: "Practice camera choice, focal point and value grouping before details lock you into a weak composition.",
      remember: "Thumbnail decisions should be readable at a glance. Tiny drawings are a feature, not a limitation.",
      steps: [
        "Write one simple scene sentence.",
        "Create six tiny frames with different camera distance, angle or character placement.",
        "Use only large dark, mid and light masses.",
        "Circle the strongest thumbnail and write one sentence about why it reads best."
      ],
      minutes: 15,
      difficulty: "Intermediate",
      rewardClass: "medium",
      tags: ["Composition", "Story", "Thumbnails"],
      timer: { rounds: 1, secondsPerRound: 900 },
      referenceTitle: "Thumbnail grid",
      referenceText: "The guide gives six small frames. Keep them rough enough to make decisions quickly.",
      referenceUrl: "https://www.ctrlpaint.com/library",
      guide: drawThumbnailGridGuide
    },
    {
      id: "moment-after",
      track: "story",
      icon: "↘",
      type: "MINI ILLUSTRATION",
      title: "Moment After",
      summary: "Show the immediate aftermath of an event through reaction and environmental clues.",
      goal: "Tell the viewer what just happened without needing a caption or flashback.",
      remember: "Aftermath is strongest when the environment carries evidence: an open door, spilled drink, dropped bag, broken object or changed body language.",
      steps: [
        "Write one sentence describing what just happened.",
        "List three visual clues the viewer could notice.",
        "Thumbnail the scene with the character reaction as the focal point.",
        "Add the environmental clues and one clear lighting choice."
      ],
      minutes: 30,
      difficulty: "Intermediate",
      rewardClass: "large",
      tags: ["Story", "Reaction", "Scene"],
      timer: { rounds: 1, secondsPerRound: 1800 },
      referenceTitle: "Aftermath staging",
      referenceText: "The guide gives a final frame plus three clue slots to plan before you draw.",
      guide: drawMomentAfterGuide
    },
    {
      id: "two-characters-one-action",
      track: "story",
      icon: "∞",
      type: "STORY POSE",
      title: "Two Characters, One Action",
      summary: "Stage a pull, catch, embrace, argument or shared task so both figures belong to one action.",
      goal: "Combine gesture, contact, perspective and staging into a readable two-character beat.",
      remember: "If you hide the faces, the bodies should still tell you what is happening.",
      steps: [
        "Choose one clear shared action.",
        "Draw both lines of action and the contact point first.",
        "Construct ribcage/pelvis and limbs with simple forms.",
        "Add expressions only after the body interaction reads.",
        "Place one prop or background cue that explains the context."
      ],
      minutes: 30,
      difficulty: "Intermediate",
      rewardClass: "large",
      tags: ["Story", "Interaction", "Pose"],
      timer: { rounds: 1, secondsPerRound: 1800 },
      referenceTitle: "Shared action",
      referenceText: "Use two-person references if helpful, but change the staging enough to make the story your own.",
      referenceUrl: "https://line-of-action.com/practice-tools",
      guide: drawTwoCharacterStoryGuide
    },
    {
      id: "mini-story-illustration",
      track: "story",
      icon: "✦",
      type: "FINAL STUDY",
      title: "Mini Story Illustration",
      summary: "Combine character, environment, composition and light into one small finished scene.",
      goal: "Practice the whole pipeline from idea to readable illustration without aiming for a giant polished piece.",
      remember: "This is a synthesis challenge. A clear story with simple rendering is better than a polished image with no focus.",
      steps: [
        "Write the one-sentence story beat.",
        "Make three thumbnails and choose one.",
        "Construct perspective and character action with simple forms.",
        "Block three main value groups and one lighting direction.",
        "Add color and only enough rendering to support the focal point."
      ],
      minutes: 50,
      difficulty: "Intermediate",
      rewardClass: "epic",
      tags: ["Story", "Composition", "Color"],
      timer: { rounds: 1, secondsPerRound: 3000 },
      referenceTitle: "Illustration pipeline",
      referenceText: "The guide gives thumbnail slots, a value-plan strip and a large final frame. Build the scene from your own idea or a favorite story beat.",
      referenceUrl: "https://www.ctrlpaint.com/library",
      guide: drawMiniIllustrationGuide
    }
  ];



  const commonsImage = fileName => `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(fileName)}`;
  const commonsPage = fileName => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName).replace(/%20/g, "_")}`;

  // V0.31.4cl · curated multi-image pose packs.
  // AdorkaStock public pose photos are displayed directly from their site and remain attributed in-app.
  const REFERENCE_PACKS = {
    "adorka-action": {
      title: "AdorkaStock · Dynamic Action",
      sourceLabel: "AdorkaStock",
      assets: [
        { src: "https://www.adorkastock.com/wp-content/uploads/2024/06/DSC_0393.jpg", title: "Leap & Reach", note: "Read the long reach, bent support leg and airborne rhythm before anatomy.", sourceUrl: "https://www.adorkastock.com/pose/jumping-leaping-action-pose-with-arm-flung-out-to-the-side/", sourceLabel: "AdorkaStock", credit: "AdorkaStock", license: "CC BY 3.0", web: true },
        { src: "https://www.adorkastock.com/wp-content/uploads/2024/11/DSC_0076.jpg", title: "Dynamic Turn", note: "Track the torso twist and counter-swing of the arms. Great for gesture and hair-motion studies.", sourceUrl: "https://www.adorkastock.com/pose/dynamic-turning-action-pose/", sourceLabel: "AdorkaStock", credit: "AdorkaStock", license: "CC BY 3.0", web: true },
        { src: "https://www.adorkastock.com/wp-content/uploads/2024/11/DSC_0208.jpg", title: "High-Angle Turn", note: "Use the staircase and body overlap to understand a figure seen from above.", sourceUrl: "https://www.adorkastock.com/pose/turned-away-high-angle-foreshortening-pose-reference/", sourceLabel: "AdorkaStock", credit: "AdorkaStock", license: "CC BY 3.0", web: true },
        { src: "https://www.adorkastock.com/wp-content/uploads/2023/12/twitter-2022-08-1.jpg", title: "Low-Angle Reach", note: "The near hand becomes large while the torso and legs compress in depth—perfect for foreshortening practice.", sourceUrl: "https://www.adorkastock.com/pose/low-angle-sitting-pose-reference-with-foreshortened-arm-reaching-forward/", sourceLabel: "AdorkaStock", credit: "AdorkaStock", license: "CC BY 3.0", web: true },
        { src: "https://www.adorkastock.com/wp-content/uploads/2018/06/bring_it___male_pose_reference_forshortening_by_adorkastock_dc9rgrt-scaled.jpg", title: "Bring It", note: "Study the forward hand, torso lean and size changes created by camera depth.", sourceUrl: "https://www.adorkastock.com/pose/bring-it-male-pose-reference-foreshortening/", sourceLabel: "AdorkaStock", credit: "AdorkaStock", license: "CC BY 3.0", web: true }
      ]
    },
    "adorka-foreshortening": {
      title: "AdorkaStock · Foreshortening",
      sourceLabel: "AdorkaStock",
      assets: [
        { src: "https://www.adorkastock.com/wp-content/uploads/2023/12/twitter-2022-08-1.jpg", title: "Low-Angle Reach", note: "Compare the large near hand with the compressed forearm and torso behind it.", sourceUrl: "https://www.adorkastock.com/pose/low-angle-sitting-pose-reference-with-foreshortened-arm-reaching-forward/", sourceLabel: "AdorkaStock", credit: "AdorkaStock", license: "CC BY 3.0", web: true },
        { src: "https://www.adorkastock.com/wp-content/uploads/2024/11/DSC_0208.jpg", title: "High-Angle Turn", note: "Notice how the shoulders, hips and legs stack vertically from the camera's high viewpoint.", sourceUrl: "https://www.adorkastock.com/pose/turned-away-high-angle-foreshortening-pose-reference/", sourceLabel: "AdorkaStock", credit: "AdorkaStock", license: "CC BY 3.0", web: true },
        { src: "https://www.adorkastock.com/wp-content/uploads/2018/06/bring_it___male_pose_reference_forshortening_by_adorkastock_dc9rgrt-scaled.jpg", title: "Forward Hand", note: "Use simple boxes/cylinders first so the close hand feels connected to the rest of the body.", sourceUrl: "https://www.adorkastock.com/pose/bring-it-male-pose-reference-foreshortening/", sourceLabel: "AdorkaStock", credit: "AdorkaStock", license: "CC BY 3.0", web: true }
      ]
    },
    "adorka-interaction": {
      title: "AdorkaStock · Interaction & Story",
      sourceLabel: "AdorkaStock",
      assets: [
        { src: "https://www.adorkastock.com/wp-content/uploads/2023/12/IMG_0615.jpg", title: "Pulling Against Each Other", note: "Three bodies create a clear push-pull story. Follow the force through arms, shoulders and planted feet.", sourceUrl: "https://www.adorkastock.com/pose/come-with-us/", sourceLabel: "AdorkaStock", credit: "AdorkaStock", license: "CC BY 3.0", web: true },
        { src: "https://www.adorkastock.com/wp-content/uploads/2021/05/topdown_standing-3.jpg", title: "Back-to-Back Pair", note: "Great for two figures sharing space while seen from a difficult high angle.", sourceUrl: "https://www.adorkastock.com/pose/were-in-this-together/", sourceLabel: "AdorkaStock", credit: "AdorkaStock", license: "CC BY 3.0", web: true },
        { src: "https://www.adorkastock.com/wp-content/uploads/2018/06/wake_up__couple_pose_reference__by_adorkastock_db4yh8z.jpg", title: "Supporting Another Person", note: "Study weight transfer, contact points and how one figure physically supports the other.", sourceUrl: "https://www.adorkastock.com/pose/wake-up-couple-pose-reference/", sourceLabel: "AdorkaStock", credit: "AdorkaStock", license: "CC BY 3.0", web: true }
      ]
    }
  };

  const CHALLENGE_REFERENCE_PACKS = {
    "gesture-30s-five": "adorka-action",
    "gesture-2m-three": "adorka-action",
    "push-the-pose": "adorka-action",
    "action-mannequin": "adorka-action",
    "body-proportion-debug": "adorka-foreshortening",
    "two-character-reaction": "adorka-interaction",
    "two-characters-one-action": "adorka-interaction",
    "moment-before": "adorka-interaction",
    "moment-after": "adorka-interaction"
  };

  const WEB_REFERENCES = {
    "gesture-30s-five": [
      { src: commonsImage("Paralympic Runner.jpg"), title: "Runner · full action", note: "Use the whole silhouette and weight shift first; ignore clothing detail.", sourceUrl: commonsPage("Paralympic Runner.jpg"), sourceLabel: "Wikimedia Commons", credit: "Pixabay via Wikimedia Commons", license: "CC0", web: true },
      { src: commonsImage("Ballet Dancer.jpg"), title: "Ballet balance", note: "Track the long gesture through torso, support leg and lifted limbs.", sourceUrl: commonsPage("Ballet Dancer.jpg"), sourceLabel: "Wikimedia Commons", credit: "Picture2025", license: "CC0", web: true },
      { src: commonsImage("Woman yoga pose.jpg"), title: "Standing yoga pose", note: "Use this for balance, line of action and counter-tilt rather than anatomy detail.", sourceUrl: commonsPage("Woman yoga pose.jpg"), sourceLabel: "Wikimedia Commons", credit: "BodyBendYoga / Nappy.co", license: "CC0", web: true }
    ],
    "gesture-2m-three": [
      { src: commonsImage("Paralympic Runner.jpg"), title: "Runner · structure pass", note: "After gesture, add ribcage, pelvis and limb cylinders without losing speed.", sourceUrl: commonsPage("Paralympic Runner.jpg"), sourceLabel: "Wikimedia Commons", credit: "Pixabay via Wikimedia Commons", license: "CC0", web: true },
      { src: commonsImage("Ballet Dancer.jpg"), title: "Ballet · balance & extension", note: "Keep the support leg believable while preserving the long directional flow.", sourceUrl: commonsPage("Ballet Dancer.jpg"), sourceLabel: "Wikimedia Commons", credit: "Picture2025", license: "CC0", web: true },
      { src: commonsImage("Woman yoga pose.jpg"), title: "Yoga · torso tilt", note: "Block the torso masses and compare their angle to the support leg.", sourceUrl: commonsPage("Woman yoga pose.jpg"), sourceLabel: "Wikimedia Commons", credit: "BodyBendYoga / Nappy.co", license: "CC0", web: true }
    ],
    "push-the-pose": [
      { src: commonsImage("Paralympic Runner.jpg"), title: "Push the run", note: "Redraw once accurately, then exaggerate stride, lean and arm swing while keeping balance.", sourceUrl: commonsPage("Paralympic Runner.jpg"), sourceLabel: "Wikimedia Commons", credit: "Pixabay via Wikimedia Commons", license: "CC0", web: true },
      { src: commonsImage("Ballet Dancer.jpg"), title: "Push the extension", note: "Amplify the long curve and negative spaces rather than adding detail.", sourceUrl: commonsPage("Ballet Dancer.jpg"), sourceLabel: "Wikimedia Commons", credit: "Picture2025", license: "CC0", web: true }
    ],
    "action-mannequin": [
      { src: commonsImage("Paralympic Runner.jpg"), title: "Runner mannequin", note: "Reduce the photo to head, ribcage, pelvis and limb cylinders before contour.", sourceUrl: commonsPage("Paralympic Runner.jpg"), sourceLabel: "Wikimedia Commons", credit: "Pixabay via Wikimedia Commons", license: "CC0", web: true },
      { src: commonsImage("Ballet Dancer.jpg"), title: "Ballet mannequin", note: "Build the orientation of every major mass in 3D before anatomy.", sourceUrl: commonsPage("Ballet Dancer.jpg"), sourceLabel: "Wikimedia Commons", credit: "Picture2025", license: "CC0", web: true }
    ],
    "balance-check-pose": [
      { src: commonsImage("Woman yoga pose.jpg"), title: "Single-leg balance", note: "Drop an imaginary plumb line and identify the actual support area under the body.", sourceUrl: commonsPage("Woman yoga pose.jpg"), sourceLabel: "Wikimedia Commons", credit: "BodyBendYoga / Nappy.co", license: "CC0", web: true },
      { src: commonsImage("Ballet Dancer.jpg"), title: "Dance balance", note: "Compare center of mass, support foot and counterweight of arms/torso.", sourceUrl: commonsPage("Ballet Dancer.jpg"), sourceLabel: "Wikimedia Commons", credit: "Picture2025", license: "CC0", web: true }
    ],
    "hand-open-fist-point": [
      { src: commonsImage("Pointing Hand.png"), title: "Pointing hand", note: "Study palm direction first, then the extended finger and grouped remaining digits.", sourceUrl: commonsPage("Pointing Hand.png"), sourceLabel: "Wikimedia Commons", credit: "Kserkez", license: "CC BY-SA 4.0", web: true },
      { src: commonsImage("Hand photography.jpg"), title: "Hand + sphere", note: "Notice how the fingers wrap around a rounded object and overlap each other.", sourceUrl: commonsPage("Hand photography.jpg"), sourceLabel: "Wikimedia Commons", credit: "WP IN PrinceVikrant01", license: "CC0", web: true },
      { src: commonsImage("SZ Shenzhen man in white shirt long sleeve May 2024 R12S human hand holding smartphone.jpg"), title: "Phone grip", note: "Use the phone as a rigid box and study how thumb and fingers oppose each other.", sourceUrl: commonsPage("SZ Shenzhen man in white shirt long sleeve May 2024 R12S human hand holding smartphone.jpg"), sourceLabel: "Wikimedia Commons", credit: "TANNMY NAISZE Wanguo", license: "CC0", web: true }
    ],
    "hands-doing-something": [
      { src: commonsImage("SZ Shenzhen man in white shirt long sleeve May 2024 R12S human hand holding smartphone.jpg"), title: "Holding a phone", note: "Draw the phone first, then wrap the hand around the object rather than inventing fingers independently.", sourceUrl: commonsPage("SZ Shenzhen man in white shirt long sleeve May 2024 R12S human hand holding smartphone.jpg"), sourceLabel: "Wikimedia Commons", credit: "TANNMY NAISZE Wanguo", license: "CC0", web: true },
      { src: commonsImage("Cuphand.jpg"), title: "Holding a cup", note: "Study contact, finger pressure and the way the hand changes around a cylindrical object.", sourceUrl: commonsPage("Cuphand.jpg"), sourceLabel: "Wikimedia Commons", credit: "Rsander81", license: "CC BY-SA 4.0", web: true },
      { src: commonsImage("Hand photography.jpg"), title: "Holding a sphere", note: "Look for overlap and finger curvature around volume.", sourceUrl: commonsPage("Hand photography.jpg"), sourceLabel: "Wikimedia Commons", credit: "WP IN PrinceVikrant01", license: "CC0", web: true }
    ],
    "one-point-room": [
      { src: commonsImage("Long hallway.jpg"), title: "Long hallway", note: "Find the horizon and convergence first; simplify doors, floor and ceiling into big directional lines.", sourceUrl: commonsPage("Long hallway.jpg"), sourceLabel: "Wikimedia Commons", credit: "Kris De Graaf", license: "CC0", web: true },
      { src: commonsImage("Apartment hallway.jpg"), title: "Apartment hallway", note: "Use repeated door frames and floor edges to judge depth spacing.", sourceUrl: commonsPage("Apartment hallway.jpg"), sourceLabel: "Wikimedia Commons", credit: "Kurtkaiser", license: "CC0", web: true },
      { src: commonsImage("Cafe Interior with Coffee.jpg"), title: "Café interior", note: "Ignore décor at first and reduce the scene to room box, floor plane and large furniture masses.", sourceUrl: commonsPage("Cafe Interior with Coffee.jpg"), sourceLabel: "Wikimedia Commons", credit: "Kavig624", license: "CC0", web: true }
    ],
    "two-point-street": [
      { src: commonsImage("City Street.jpg"), title: "City side street", note: "Pick a building corner and follow left/right edge families toward their vanishing directions.", sourceUrl: commonsPage("City Street.jpg"), sourceLabel: "Wikimedia Commons", credit: "Teacher McKinley", license: "CC0", web: true },
      { src: commonsImage("Street city.jpg"), title: "Urban street", note: "Study verticals, building planes and how scale shrinks into distance.", sourceUrl: commonsPage("Street city.jpg"), sourceLabel: "Wikimedia Commons", credit: "Omina006", license: "CC0", web: true }
    ],
    "cafe-corner": [
      { src: commonsImage("Cafe Interior with Coffee.jpg"), title: "Café interior", note: "Block the shell of the room and furniture boxes before lamps, cups or décor.", sourceUrl: commonsPage("Cafe Interior with Coffee.jpg"), sourceLabel: "Wikimedia Commons", credit: "Kavig624", license: "CC0", web: true },
      { src: commonsImage("Image of a bedroom at golden tower.jpg"), title: "Bedroom interior", note: "Use it as a second interior study: same perspective logic, different furniture arrangement.", sourceUrl: commonsPage("Image of a bedroom at golden tower.jpg"), sourceLabel: "Wikimedia Commons", credit: "Deishini Mariam", license: "CC0", web: true }
    ],
    "character-in-space": [
      { src: commonsImage("Long hallway.jpg"), title: "People in hallway", note: "Use the visible people to compare scale, floor contact and eye level in depth.", sourceUrl: commonsPage("Long hallway.jpg"), sourceLabel: "Wikimedia Commons", credit: "Kris De Graaf", license: "CC0", web: true },
      { src: commonsImage("Cafe Interior with Coffee.jpg"), title: "Café placement", note: "Choose one chair or table as a scale anchor before placing your character.", sourceUrl: commonsPage("Cafe Interior with Coffee.jpg"), sourceLabel: "Wikimedia Commons", credit: "Kavig624", license: "CC0", web: true }
    ],
    "depth-layering": [
      { src: commonsImage("City Street.jpg"), title: "Street depth", note: "Separate foreground, midground and distance with overlap, scale and contrast.", sourceUrl: commonsPage("City Street.jpg"), sourceLabel: "Wikimedia Commons", credit: "Teacher McKinley", license: "CC0", web: true },
      { src: commonsImage("Long hallway.jpg"), title: "Hallway depth", note: "Use repetition and shrinking intervals to make depth readable before detail.", sourceUrl: commonsPage("Long hallway.jpg"), sourceLabel: "Wikimedia Commons", credit: "Kris De Graaf", license: "CC0", web: true }
    ]
  };

  const PROBLEM_TAGS = ["Proportions", "Pose", "Hands", "Hair", "Perspective", "Composition", "Color", "Rendering"];
  const QUICK_COLORS = ["#352e33", "#6c5f68", "#a85f7f", "#d8759e", "#f3b7ca", "#ead7c7", "#d7a14f", "#8b5148", "#4e6d61", "#7896b4", "#75658f", "#ffffff"];

  const els = {};
  let dbPromise = null;
  let activeTrack = "all";
  let activeChallenge = null;
  const LOCAL_REFERENCES = {
    "gesture-30s-five": [
      { src: "assets/drawing/references/dynamic-running-reach.svg", title: "Running Reach", note: "Find the long action curve before thinking about anatomy." },
      { src: "assets/drawing/references/dynamic-crouch-launch.svg", title: "Crouch Launch", note: "Compress the pose, then follow the forward burst." },
      { src: "assets/drawing/references/dynamic-jump-landing.svg", title: "Jump Landing", note: "Use bent joints and a low center of gravity to show impact." },
      { src: "assets/drawing/references/dynamic-turn-back.svg", title: "Sudden Turn", note: "Track the main curve through the torso before limbs." },
      { src: "assets/drawing/references/dynamic-pull-reach.svg", title: "Pull & Reach", note: "One side anchors while the other side extends." }
    ],
    "gesture-2m-three": [
      { src: "assets/drawing/references/dynamic-running-reach.svg", title: "Running Reach", note: "Build ribcage and pelvis on top of the gesture." },
      { src: "assets/drawing/references/dynamic-twist-turn.svg", title: "Twist & Turn", note: "Use simple masses to preserve the action." },
      { src: "assets/drawing/references/dynamic-crouch-launch.svg", title: "Crouch Launch", note: "Keep the loaded leg and forward intent clear." },
      { src: "assets/drawing/references/dynamic-jump-landing.svg", title: "Jump Landing", note: "Show weight before you refine anatomy." }
    ],
    "push-the-pose": [
      { src: "assets/drawing/references/dynamic-running-reach.svg", title: "Push the Reach", note: "Exaggerate the curve and counterbalance without breaking the pose." },
      { src: "assets/drawing/references/dynamic-turn-back.svg", title: "Push the Turn", note: "Increase shoulder/hip opposition to make the action clearer." },
      { src: "assets/drawing/references/dynamic-pull-reach.svg", title: "Push the Pull", note: "Stretch the reaching side and compress the anchoring side." }
    ],
    "ribcage-pelvis-twist": [
      { src: "assets/drawing/references/dynamic-twist-turn.svg", title: "Torso Twist", note: "Study the relationship between ribcage and pelvis rather than the outline." },
      { src: "assets/drawing/references/dynamic-turn-back.svg", title: "Opposing Axes", note: "Shoulders and hips can point in different directions." },
      { src: "assets/drawing/references/dynamic-crouch-launch.svg", title: "Compressed Torso", note: "Notice how one side compresses while the other opens." }
    ],
    "action-mannequin": [
      { src: "assets/drawing/references/dynamic-running-reach.svg", title: "Running Mannequin", note: "Reduce the pose to spheres, boxes and cylinders." },
      { src: "assets/drawing/references/dynamic-jump-landing.svg", title: "Landing Mannequin", note: "Keep each major mass readable in 3D." },
      { src: "assets/drawing/references/dynamic-pull-reach.svg", title: "Reach Mannequin", note: "Construct first; contour comes later." }
    ],
    "hand-open-fist-point": [
      { src: "assets/drawing/references/hand-open-construction.svg", title: "Open Palm", note: "Palm wedge first, then knuckle arc, then grouped fingers." },
      { src: "assets/drawing/references/hand-fist-construction.svg", title: "Fist", note: "Treat folded fingers as one block before separating them." },
      { src: "assets/drawing/references/hand-pointing-construction.svg", title: "Pointing", note: "The pointing finger extends the hand's overall direction." },
      { src: "assets/drawing/references/hand-foreshortened-palm.svg", title: "Foreshortened Palm", note: "Near forms grow larger and overlap the finger groups behind them." }
    ],
    "hands-doing-something": [
      { src: "assets/drawing/references/hand-mug-grip.svg", title: "Mug Grip", note: "Construct the object first and wrap the hand around it." },
      { src: "assets/drawing/references/hand-phone-grip.svg", title: "Phone Grip", note: "Let the prop determine finger placement and pressure." },
      { src: "assets/drawing/references/hand-sleeve-pinch.svg", title: "Pinching Fabric", note: "Use opposing thumb/index shapes and show the fabric reaction." },
      { src: "assets/drawing/references/hand-pointing-construction.svg", title: "Pointing Gesture", note: "Use the hand to direct attention inside a scene." }
    ],
    "balance-check-pose": [
      { src: "assets/drawing/references/dynamic-twist-turn.svg", title: "Balance + Counter-Tilt", note: "Look for the support leg and counterweight of the torso." },
      { src: "assets/drawing/references/dynamic-crouch-launch.svg", title: "Loaded Balance", note: "The body can be dynamic while the support still feels believable." },
      { src: "assets/drawing/references/dynamic-jump-landing.svg", title: "Landing Balance", note: "Place the center of gravity inside the support area." }
    ],
    "two-character-reaction": [
      { src: "assets/drawing/references/story-shared-action.svg", title: "Shared Action", note: "One figure initiates; the other must visibly react." },
      { src: "assets/drawing/references/story-catch-fall.svg", title: "Catch Reaction", note: "The reaction should travel through both poses, not just the hands." },
      { src: "assets/drawing/references/story-argument-aisle.svg", title: "Argument Reaction", note: "Opposing torso angles can communicate tension before facial detail." }
    ],
    "body-proportion-debug": [
      { src: "assets/drawing/references/dynamic-running-reach.svg", title: "Proportion Check in Motion", note: "Compare major lengths before polishing the contour." },
      { src: "assets/drawing/references/dynamic-turn-back.svg", title: "Twisted Proportion Check", note: "Measure landmarks through the twist rather than against the page edge." },
      { src: "assets/drawing/references/perspective-character-scale.svg", title: "Scale in Space", note: "Use eye level and floor contact to catch size inconsistencies." }
    ],
    "head-turn-sheet": [
      { src: "assets/drawing/references/head-front-construction.svg", title: "Front", note: "Keep the skull volume stable and centerline straight around the form." },
      { src: "assets/drawing/references/head-turn-three-quarter.svg", title: "Three-Quarter", note: "Wrap feature guides around the skull volume." },
      { src: "assets/drawing/references/head-profile-construction.svg", title: "Profile", note: "Remember the skull mass behind the face plane." },
      { src: "assets/drawing/references/head-looking-up.svg", title: "Looking Up", note: "Feature lines curve upward and the underside becomes visible." },
      { src: "assets/drawing/references/head-looking-down.svg", title: "Looking Down", note: "The brow dominates and lower-face spacing compresses." }
    ],
    "expression-quartet": [
      { src: "assets/drawing/references/head-front-construction.svg", title: "Stable Front Base", note: "Keep the same construction while changing brows, lids and mouth." },
      { src: "assets/drawing/references/head-turn-three-quarter.svg", title: "Stable 3/4 Base", note: "Preserve identity and head angle while pushing expression." },
      { src: "assets/drawing/references/head-profile-construction.svg", title: "Profile Expression Base", note: "Expression still changes the silhouette of brow, lips and jaw." }
    ],
    "hair-big-shapes": [
      { src: "assets/drawing/references/head-front-construction.svg", title: "Skull First", note: "Place the skull before adding hair volume." },
      { src: "assets/drawing/references/head-turn-three-quarter.svg", title: "Hair on 3/4 Head", note: "Treat hair as masses that sit over the skull, not a flat sticker." },
      { src: "assets/drawing/references/hair-fall-forward.svg", title: "Falling Masses", note: "Separate a few large directional groups before strands." }
    ],
    "hair-flow-study": [
      { src: "assets/drawing/references/hair-flow-turn.svg", title: "Turning Flow", note: "Start with big directional ribbons; strands come later." },
      { src: "assets/drawing/references/hair-wind-side.svg", title: "Side Wind", note: "Let the wind direction affect every major mass consistently." },
      { src: "assets/drawing/references/hair-fall-forward.svg", title: "Falling Forward", note: "Gravity can dominate even when the head is tilted." },
      { src: "assets/drawing/references/hair-spin-back.svg", title: "Spin Back", note: "Hair can lag behind the head and create a delayed arc." }
    ],
    "hair-in-action": [
      { src: "assets/drawing/references/hair-spin-back.svg", title: "Spin Back", note: "Use lag to make the turn feel faster." },
      { src: "assets/drawing/references/hair-wind-side.svg", title: "Wind + Motion", note: "Combine body movement with a consistent secondary flow." },
      { src: "assets/drawing/references/hair-fall-forward.svg", title: "Forward Drop", note: "Let gravity and momentum compete instead of drawing random strands." }
    ],
    "one-point-room": [
      { src: "assets/drawing/references/perspective-one-point-room.svg", title: "One-Point Room", note: "Horizon first, then one vanishing point, then furniture volumes." },
      { src: "assets/drawing/references/perspective-hallway.svg", title: "Hallway", note: "Use repeated frames to check consistent depth spacing." },
      { src: "assets/drawing/references/perspective-cafe-booth.svg", title: "Café Booth", note: "Furniture still obeys the same room space." }
    ],
    "two-point-street": [
      { src: "assets/drawing/references/perspective-two-point-street.svg", title: "Two-Point Corner", note: "Verticals stay vertical; left and right edges travel to different vanishing points." },
      { src: "assets/drawing/references/perspective-bedroom-corner.svg", title: "Interior Corner", note: "Two-point perspective is useful indoors too." },
      { src: "assets/drawing/references/perspective-low-angle-room.svg", title: "Low Camera Angle", note: "Changing horizon height changes the feeling of the whole scene." }
    ],
    "cafe-corner": [
      { src: "assets/drawing/references/perspective-cafe-booth.svg", title: "Café Booth", note: "Build the room shell first, then furniture as boxes." },
      { src: "assets/drawing/references/perspective-one-point-room.svg", title: "Interior Box", note: "Use the room box as scaffolding before design details." },
      { src: "assets/drawing/references/perspective-bedroom-corner.svg", title: "Corner Variation", note: "Reuse the same perspective logic with a different interior layout." }
    ],
    "character-in-space": [
      { src: "assets/drawing/references/perspective-character-scale.svg", title: "Character Scale", note: "Anchor feet to the floor grid and compare eye level." },
      { src: "assets/drawing/references/perspective-one-point-room.svg", title: "Room Scale", note: "Use floor contact and horizon to keep the figure inside the scene." },
      { src: "assets/drawing/references/perspective-low-angle-room.svg", title: "Low-Angle Placement", note: "Camera height changes how much of the character you see from below." }
    ],
    "depth-layering": [
      { src: "assets/drawing/references/perspective-hallway.svg", title: "Depth Through Repetition", note: "Repetition and scale change reinforce distance." },
      { src: "assets/drawing/references/perspective-cafe-booth.svg", title: "Interior Depth", note: "Overlap furniture to create clear foreground, middle and background." },
      { src: "assets/drawing/references/story-door-surprise.svg", title: "Story Depth", note: "Use a doorway or frame element to separate planes and direct attention." }
    ],
    "three-value-study": [
      { src: "assets/drawing/references/rendering-three-value-head.svg", title: "Three-Value Head", note: "Compress the image into light, midtone and dark families before rendering." },
      { src: "assets/drawing/references/rendering-side-light-bust.svg", title: "Side-Light Grouping", note: "Keep all shadow planes related instead of chasing tiny gradients." },
      { src: "assets/drawing/references/rendering-backlight-bust.svg", title: "Backlight Grouping", note: "Protect the silhouette and simplify the interior values." }
    ],
    "single-light-source": [
      { src: "assets/drawing/references/rendering-side-light-bust.svg", title: "Side Light", note: "One clear source creates a readable light/shadow split." },
      { src: "assets/drawing/references/rendering-three-value-head.svg", title: "Value Plan", note: "Group the shadow family before blending edges." },
      { src: "assets/drawing/references/rendering-backlight-bust.svg", title: "Backlight", note: "Rim light works best when the rest stays controlled." }
    ],
    "warm-light-cool-shadow": [
      { src: "assets/drawing/references/rendering-warm-cool-bust.svg", title: "Warm / Cool Split", note: "Value readability comes first; temperature creates mood on top." },
      { src: "assets/drawing/references/mood-cozy.svg", title: "Cozy Temperature", note: "Use warm light with quieter cool counter-colors." },
      { src: "assets/drawing/references/mood-tense.svg", title: "Tense Temperature", note: "A narrow warm accent can feel stronger against a cooler/darker field." }
    ],
    "limited-palette": [
      { src: "assets/drawing/references/rendering-limited-palette.svg", title: "Five-Color Palette", note: "Give each color a job instead of picking hues randomly." },
      { src: "assets/drawing/references/rendering-warm-cool-bust.svg", title: "Temperature-Led Palette", note: "Reuse a small family of hues intentionally." },
      { src: "assets/drawing/references/mood-melancholic.svg", title: "Quiet Palette", note: "Limited saturation can be part of the storytelling choice." }
    ],
    "same-sketch-three-moods": [
      { src: "assets/drawing/references/mood-cozy.svg", title: "Cozy", note: "Warm light and softer contrast." },
      { src: "assets/drawing/references/mood-tense.svg", title: "Tense", note: "Focused contrast and sharper accents." },
      { src: "assets/drawing/references/mood-melancholic.svg", title: "Melancholic", note: "Cooler relationships and quieter contrast." }
    ],
    "moment-before": [
      { src: "assets/drawing/references/story-moment-before.svg", title: "Moment Before", note: "Use body language, props and exits to imply what is about to happen." },
      { src: "assets/drawing/references/story-door-surprise.svg", title: "Door Surprise", note: "A doorway can frame both the reveal and the reaction." },
      { src: "assets/drawing/references/story-letter-discovery.svg", title: "Letter Discovery", note: "Let gaze and hand placement tell the viewer what matters." }
    ],
    "composition-thumbnails": [
      { src: "assets/drawing/references/story-door-surprise.svg", title: "Door Reveal Seed", note: "Try changing camera distance and figure placement in thumbnails." },
      { src: "assets/drawing/references/story-argument-aisle.svg", title: "Conflict Seed", note: "Use negative space and opposing poses to control tension." },
      { src: "assets/drawing/references/story-letter-discovery.svg", title: "Quiet Discovery Seed", note: "A small prop can still become the focal point through staging." }
    ],
    "moment-after": [
      { src: "assets/drawing/references/story-moment-before.svg", title: "Environmental Clue", note: "Let the environment carry evidence of what just happened." },
      { src: "assets/drawing/references/story-letter-discovery.svg", title: "Discovery Aftermath", note: "The character's posture should show the emotional consequence." },
      { src: "assets/drawing/references/story-door-surprise.svg", title: "Reveal Aftermath", note: "Use open doors, dropped objects or disrupted staging as clues." }
    ],
    "two-characters-one-action": [
      { src: "assets/drawing/references/story-shared-action.svg", title: "Shared Contact Point", note: "The shared object/contact point should anchor both poses." },
      { src: "assets/drawing/references/story-catch-fall.svg", title: "Catch", note: "Both figures need to respond physically to the same force." },
      { src: "assets/drawing/references/story-shared-carry.svg", title: "Shared Weight", note: "Both bodies should react to the object's weight." },
      { src: "assets/drawing/references/story-argument-aisle.svg", title: "Argument", note: "Interaction can be carried by gesture and spacing without touch." }
    ],
    "mini-story-illustration": [
      { src: "assets/drawing/references/story-door-surprise.svg", title: "Reveal Scene", note: "Stage room, focal point and reaction before rendering." },
      { src: "assets/drawing/references/story-letter-discovery.svg", title: "Quiet Story Beat", note: "Use a prop and gaze to carry the narrative." },
      { src: "assets/drawing/references/story-catch-fall.svg", title: "Action Story Beat", note: "Make the shared action readable before costume details." },
      { src: "assets/drawing/references/story-shared-carry.svg", title: "Cooperative Story Beat", note: "Shared weight can create natural body interaction." },
      { src: "assets/drawing/references/story-argument-aisle.svg", title: "Conflict Story Beat", note: "Use environment and spacing to amplify character tension." }
    ]
  };

  let referenceIndex = 0;
  let referenceUnderlayVisible = false;
  let referenceUnderlayOpacity = .28;
  let floatingReferenceVisible = false;
  let floatingDrag = null;
  let ctx = null;
  let guideCtx = null;
  let actions = [];
  let redoStack = [];
  let currentAction = null;
  let pointerId = null;
  let tool = "graphite";
  let lastDrawTool = "graphite";
  let brushSize = 7;
  let opacity = .72;
  let softness = .62;
  let color = "#4b3f47";
  let guideOpacity = .34;
  let guideVisible = true;
  let flipped = false;
  let dirty = false;
  let saveTimer = null;
  let selectedFeel = "okay";
  let selectedProblems = new Set();
  let selectedSaveAs = "practice";
  let timerHandle = null;
  let timerRunning = false;
  let timerRound = 1;
  let timerSeconds = 0;
  let stageZoom = 1;
  let stagePanX = 0;
  let stagePanY = 0;
  let panning = false;
  let panStart = null;
  const touchPointers = new Map();
  let touchGesture = null;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    bindElements();
    ctx = els.drawCanvas.getContext("2d", { alpha: true, willReadFrequently: true });
    guideCtx = els.guideCanvas.getContext("2d", { alpha: true });
    migrateLegacyMeta();
    renderTracks();
    renderChallenges();
    renderQuickColors();
    renderProblemTags();
    bind();
    updateStats();
    updateContinueCard();
    updateTools();
    updateRightPanelForNoChallenge();
  }

  function bindElements() {
    Object.assign(els, {
      back: document.getElementById("backToLifeRpg"),
      todayProgress: document.getElementById("todayProgress"),
      totalProgress: document.getElementById("totalProgress"),
      continueCard: document.getElementById("continueCard"),
      continueTitle: document.getElementById("continueTitle"),
      continueMeta: document.getElementById("continueMeta"),
      trackList: document.getElementById("trackList"),
      browserKicker: document.getElementById("browserKicker"),
      browserTitle: document.getElementById("browserTitle"),
      showAll: document.getElementById("showAllChallenges"),
      recommended: document.getElementById("recommendedButton"),
      challengeGrid: document.getElementById("challengeGrid"),
      briefingView: document.getElementById("briefingView"),
      backToChallenges: document.getElementById("backToChallenges"),
      briefingTags: document.getElementById("briefingTags"),
      briefingTitle: document.getElementById("briefingTitle"),
      briefingSummary: document.getElementById("briefingSummary"),
      briefingReward: document.getElementById("briefingReward"),
      briefingGoal: document.getElementById("briefingGoal"),
      briefingRemember: document.getElementById("briefingRemember"),
      briefingSteps: document.getElementById("briefingSteps"),
      referenceBrief: document.getElementById("referenceBrief"),
      startChallenge: document.getElementById("startChallenge"),
      workspaceView: document.getElementById("workspaceView"),
      workspaceBack: document.getElementById("workspaceBack"),
      workspaceKicker: document.getElementById("workspaceKicker"),
      workspaceTitle: document.getElementById("workspaceTitle"),
      workspaceRound: document.getElementById("workspaceRound"),
      workspaceTimer: document.getElementById("workspaceTimer"),
      canvasViewport: document.getElementById("canvasViewport"),
      canvasStage: document.getElementById("canvasStage"),
      canvasZoomPill: document.getElementById("canvasZoomPill"),
      canvasStack: document.getElementById("canvasStack"),
      guideCanvas: document.getElementById("guideCanvas"),
      drawCanvas: document.getElementById("drawCanvas"),
      mobileTools: document.getElementById("mobileToolsButton"),
      toolsPanel: document.getElementById("toolsPanel"),
      referenceTitle: document.getElementById("referenceTitle"),
      referenceText: document.getElementById("referenceText"),
      referenceLink: document.getElementById("referenceLink"),
      referenceAssetViewer: document.getElementById("referenceAssetViewer"),
      referenceImage: document.getElementById("referenceImage"),
      referenceAssetTitle: document.getElementById("referenceAssetTitle"),
      referenceAssetNote: document.getElementById("referenceAssetNote"),
      referenceSourceLine: document.getElementById("referenceSourceLine"),
      referenceThumbs: document.getElementById("referenceThumbs"),
      referencePackLabel: document.getElementById("referencePackLabel"),
      referenceRandom: document.getElementById("referenceRandom"),
      referencePrev: document.getElementById("referencePrev"),
      referenceNext: document.getElementById("referenceNext"),
      referenceOpen: document.getElementById("referenceOpen"),
      referenceCounter: document.getElementById("referenceCounter"),
      referenceFloatToggle: document.getElementById("referenceFloatToggle"),
      referenceUnderlayToggle: document.getElementById("referenceUnderlayToggle"),
      referenceUnderlay: document.getElementById("referenceUnderlay"),
      referenceUnderlayOpacityRow: document.getElementById("referenceUnderlayOpacityRow"),
      referenceUnderlayOpacity: document.getElementById("referenceUnderlayOpacity"),
      referenceUnderlayOpacityLabel: document.getElementById("referenceUnderlayOpacityLabel"),
      floatingReference: document.getElementById("floatingReference"),
      floatingReferenceHandle: document.getElementById("floatingReferenceHandle"),
      floatingReferenceClose: document.getElementById("floatingReferenceClose"),
      floatingReferenceImage: document.getElementById("floatingReferenceImage"),
      floatingReferenceTitle: document.getElementById("floatingReferenceTitle"),
      floatingReferenceNote: document.getElementById("floatingReferenceNote"),
      floatingReferencePrev: document.getElementById("floatingReferencePrev"),
      floatingReferenceNext: document.getElementById("floatingReferenceNext"),
      floatingReferenceCounter: document.getElementById("floatingReferenceCounter"),
      referenceDialog: document.getElementById("referenceDialog"),
      referenceDialogImage: document.getElementById("referenceDialogImage"),
      closeReferenceDialog: document.getElementById("closeReferenceDialog"),
      guideToggle: document.getElementById("guideToggle"),
      flipCanvas: document.getElementById("flipCanvas"),
      guideOpacity: document.getElementById("guideOpacity"),
      guideOpacityLabel: document.getElementById("guideOpacityLabel"),
      graphite: document.getElementById("graphiteButton"),
      clean: document.getElementById("cleanButton"),
      soft: document.getElementById("softButton"),
      smudge: document.getElementById("smudgeButton"),
      eyedropper: document.getElementById("eyedropperButton"),
      pan: document.getElementById("panButton"),
      eraser: document.getElementById("eraserButton"),
      colorPicker: document.getElementById("colorPicker"),
      hexInput: document.getElementById("hexInput"),
      quickColors: document.getElementById("quickColors"),
      brushSize: document.getElementById("brushSize"),
      brushSizeLabel: document.getElementById("brushSizeLabel"),
      opacity: document.getElementById("opacity"),
      opacityLabel: document.getElementById("opacityLabel"),
      softness: document.getElementById("softness"),
      softnessLabel: document.getElementById("softnessLabel"),
      undo: document.getElementById("undoButton"),
      redo: document.getElementById("redoButton"),
      clear: document.getElementById("clearButton"),
      timerModeLabel: document.getElementById("timerModeLabel"),
      timerDisplay: document.getElementById("timerDisplay"),
      timerToggle: document.getElementById("timerToggle"),
      timerReset: document.getElementById("timerReset"),
      export: document.getElementById("exportButton"),
      complete: document.getElementById("completeButton"),
      saveStatus: document.getElementById("saveStatus"),
      dialog: document.getElementById("completeDialog"),
      completeForm: document.getElementById("completeForm"),
      completeTitle: document.getElementById("completeTitle"),
      feelGrid: document.getElementById("feelGrid"),
      problemTags: document.getElementById("problemTags"),
      reflectionNote: document.getElementById("reflectionNote"),
      cancelComplete: document.getElementById("cancelComplete")
    });
  }

  function bind() {
    els.back.addEventListener("click", async () => {
      if (dirty) await persistNow();
      location.href = "index.html";
    });
    els.showAll.addEventListener("click", () => selectTrack("all"));
    els.recommended.addEventListener("click", showRecommended);
    els.backToChallenges.addEventListener("click", showBrowser);
    els.workspaceBack.addEventListener("click", async () => {
      if (dirty) await persistNow();
      stopTimer();
      showBriefing(activeChallenge);
    });
    els.startChallenge.addEventListener("click", () => startActiveChallenge(false));
    els.continueCard.addEventListener("click", () => {
      const meta = readMeta();
      const id = meta.continueChallengeId;
      const challenge = CHALLENGES.find(c => c.id === id);
      if (challenge) openChallenge(challenge.id, true);
    });
    els.mobileTools.addEventListener("click", () => els.toolsPanel.scrollIntoView({ behavior: "smooth", block: "start" }));
    els.referencePrev.addEventListener("click", () => stepReference(-1));
    els.referenceNext.addEventListener("click", () => stepReference(1));
    els.referenceRandom.addEventListener("click", () => randomReference());
    els.referenceOpen.addEventListener("click", openReferenceDialog);
    els.referenceImage.addEventListener("click", openReferenceDialog);
    els.referenceFloatToggle.addEventListener("click", toggleFloatingReference);
    els.referenceUnderlayToggle.addEventListener("click", toggleReferenceUnderlay);
    els.referenceUnderlayOpacity.addEventListener("input", () => {
      referenceUnderlayOpacity = clamp(Number(els.referenceUnderlayOpacity.value) / 100, .05, .8);
      syncReferenceDisplays();
    });
    els.floatingReferenceClose.addEventListener("click", () => setFloatingReference(false));
    els.floatingReferencePrev.addEventListener("click", () => stepReference(-1));
    els.floatingReferenceNext.addEventListener("click", () => stepReference(1));
    els.floatingReferenceImage.addEventListener("click", openReferenceDialog);
    els.floatingReferenceHandle.addEventListener("pointerdown", startFloatingDrag);
    window.addEventListener("pointermove", moveFloatingDrag);
    window.addEventListener("pointerup", endFloatingDrag);
    els.closeReferenceDialog.addEventListener("click", () => els.referenceDialog.close());
    els.referenceDialog.addEventListener("click", event => { if (event.target === els.referenceDialog) els.referenceDialog.close(); });

    els.graphite.addEventListener("click", () => setTool("graphite"));
    els.clean.addEventListener("click", () => setTool("clean"));
    els.soft.addEventListener("click", () => setTool("soft"));
    els.smudge.addEventListener("click", () => setTool("smudge"));
    els.eyedropper.addEventListener("click", () => setTool("eyedropper"));
    els.pan.addEventListener("click", () => setTool("pan"));
    els.eraser.addEventListener("click", () => setTool("eraser"));

    els.colorPicker.addEventListener("input", () => setColor(els.colorPicker.value));
    els.hexInput.addEventListener("change", () => {
      const normalized = normalizeHex(els.hexInput.value);
      if (normalized) setColor(normalized); else els.hexInput.value = color.toUpperCase();
    });
    els.brushSize.addEventListener("input", () => {
      brushSize = Number(els.brushSize.value) || 7;
      els.brushSizeLabel.textContent = `${brushSize}px`;
    });
    els.opacity.addEventListener("input", () => {
      opacity = clamp(Number(els.opacity.value) / 100, .05, 1);
      els.opacityLabel.textContent = `${Math.round(opacity * 100)}%`;
    });
    els.softness.addEventListener("input", () => {
      softness = clamp(Number(els.softness.value) / 100, 0, 1);
      els.softnessLabel.textContent = `${Math.round(softness * 100)}%`;
    });
    els.guideOpacity.addEventListener("input", () => {
      guideOpacity = clamp(Number(els.guideOpacity.value) / 100, 0, 1);
      els.guideOpacityLabel.textContent = `${Math.round(guideOpacity * 100)}%`;
      updateGuideVisibility();
    });
    els.guideToggle.addEventListener("click", () => {
      guideVisible = !guideVisible;
      updateGuideVisibility();
    });
    els.flipCanvas.addEventListener("click", toggleFlip);
    els.undo.addEventListener("click", undo);
    els.redo.addEventListener("click", redo);
    els.clear.addEventListener("click", clearAll);
    els.export.addEventListener("click", exportPng);
    els.complete.addEventListener("click", openCompleteDialog);
    els.timerToggle.addEventListener("click", toggleTimer);
    els.timerReset.addEventListener("click", resetTimer);

    els.drawCanvas.addEventListener("pointerdown", pointerDown);
    els.drawCanvas.addEventListener("pointermove", pointerMove);
    els.drawCanvas.addEventListener("pointerup", pointerUp);
    els.drawCanvas.addEventListener("pointercancel", pointerUp);
    els.drawCanvas.style.touchAction = "none";
    els.canvasViewport.addEventListener("wheel", zoomWheel, { passive: false });
    els.canvasViewport.addEventListener("pointerdown", viewportPanStart);
    els.canvasViewport.addEventListener("pointermove", viewportPanMove);
    els.canvasViewport.addEventListener("pointerup", viewportPanEnd);
    els.canvasViewport.addEventListener("pointercancel", viewportPanEnd);

    els.feelGrid.addEventListener("click", event => {
      const button = event.target.closest("[data-feel]");
      if (!button) return;
      selectedFeel = button.dataset.feel;
      els.feelGrid.querySelectorAll("[data-feel]").forEach(b => b.classList.toggle("is-selected", b === button));
    });
    els.problemTags.addEventListener("click", event => {
      const button = event.target.closest("[data-problem]");
      if (!button) return;
      const value = button.dataset.problem;
      if (selectedProblems.has(value)) selectedProblems.delete(value); else selectedProblems.add(value);
      button.classList.toggle("is-selected", selectedProblems.has(value));
    });
    document.querySelector(".saveas-grid").addEventListener("click", event => {
      const button = event.target.closest("[data-saveas]");
      if (!button) return;
      selectedSaveAs = button.dataset.saveas;
      document.querySelectorAll("[data-saveas]").forEach(b => b.classList.toggle("is-selected", b === button));
    });
    els.cancelComplete.addEventListener("click", () => els.dialog.close());
    els.completeForm.addEventListener("submit", event => {
      event.preventDefault();
      completeChallenge();
    });

    window.addEventListener("keydown", event => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      } else if (event.key === " ") {
        if (document.activeElement?.tagName === "TEXTAREA" || document.activeElement?.tagName === "INPUT") return;
        event.preventDefault();
        setTool("pan", false);
      }
    });
    window.addEventListener("keyup", event => {
      if (event.key === " " && tool === "pan") setTool(lastDrawTool, false);
    });
    window.addEventListener("resize", () => { if (!els.workspaceView.classList.contains("is-hidden")) fitStage(); });
    window.addEventListener("pagehide", () => { if (dirty) persistNow(); });
  }

  function renderTracks() {
    const meta = readMeta();
    const completedIds = new Set((meta.history || []).map(item => item.challengeId));
    els.trackList.innerHTML = TRACKS.map(track => {
      const trackChallenges = track.id === "all" ? CHALLENGES : CHALLENGES.filter(c => c.track === track.id);
      const done = trackChallenges.filter(c => completedIds.has(c.id)).length;
      const total = trackChallenges.length;
      return `
      <button class="track-button${track.id === activeTrack ? " is-active" : ""}" type="button" data-track="${track.id}">
        <span class="track-icon">${track.icon}</span>
        <span><strong>${esc(track.title)}</strong><small>${esc(track.blurb)}</small></span>
        <span class="track-count">${done}/${total}</span>
      </button>`;
    }).join("");
    els.trackList.querySelectorAll("[data-track]").forEach(button => button.addEventListener("click", () => selectTrack(button.dataset.track)));
  }

  function selectTrack(trackId) {
    activeTrack = TRACKS.some(t => t.id === trackId) ? trackId : "all";
    showBrowser();
    renderTracks();
    renderChallenges();
    const track = TRACKS.find(t => t.id === activeTrack);
    els.browserKicker.textContent = activeTrack === "all" ? "ALL CHALLENGES" : "PRACTICE TRACK";
    els.browserTitle.textContent = track?.title || "Drawing Challenges";
  }

  function renderChallenges(list = null) {
    const meta = readMeta();
    const completedIds = new Set((meta.history || []).map(item => item.challengeId));
    const source = list || (activeTrack === "all" ? CHALLENGES : CHALLENGES.filter(c => c.track === activeTrack));
    const nextByTrack = new Map(TRACKS.filter(t => t.id !== "all").map(track => {
      const next = CHALLENGES.filter(c => c.track === track.id).find(c => !completedIds.has(c.id));
      return [track.id, next?.id || null];
    }));
    els.challengeGrid.innerHTML = source.map(challenge => {
      const siblings = CHALLENGES.filter(c => c.track === challenge.track);
      const pathIndex = siblings.findIndex(c => c.id === challenge.id) + 1;
      const next = nextByTrack.get(challenge.track) === challenge.id;
      return `
      <button class="challenge-card${next ? " is-next" : ""}" type="button" data-challenge="${challenge.id}">
        <div class="challenge-card-top"><span class="challenge-icon">${challenge.icon}</span><span class="path-step">${pathIndex}/${siblings.length}${next ? " · NEXT" : ""}</span></div>
        <small>${esc(challenge.type)}${getReferenceAssets(challenge).length ? ` · REF PACK ${getReferenceAssets(challenge).length}` : ''}</small>
        <strong>${esc(challenge.title)}</strong>
        <p>${esc(challenge.summary)}</p>
        <footer><span>${challenge.minutes} min · ${esc(challenge.difficulty)}</span><span>${completedIds.has(challenge.id) ? '<b class="done-badge">✓ practiced</b>' : rewardLabel(challenge.rewardClass)}</span></footer>
      </button>`;
    }).join("");
    els.challengeGrid.querySelectorAll("[data-challenge]").forEach(button => button.addEventListener("click", () => openChallenge(button.dataset.challenge)));
  }

  function showRecommended() {
    const meta = readMeta();
    const completedIds = new Set((meta.history || []).map(item => item.challengeId));
    const troubleCounts = {};
    (meta.history || []).slice(-20).forEach(item => (item.problemTags || []).forEach(tag => troubleCounts[tag] = (troubleCounts[tag] || 0) + 1));
    const map = { Proportions: "anatomy", Pose: "dynamic", Hands: "anatomy", Hair: "hair", Perspective: "perspective", Composition: "story", Color: "rendering", Rendering: "rendering" };
    const top = Object.entries(troubleCounts).sort((a,b) => b[1] - a[1])[0]?.[0];
    const preferredTrack = map[top] || null;
    const orderedTracks = preferredTrack
      ? [preferredTrack, ...TRACKS.filter(t => t.id !== "all" && t.id !== preferredTrack).map(t => t.id)]
      : TRACKS.filter(t => t.id !== "all").map(t => t.id);
    const list = [];
    orderedTracks.forEach(trackId => {
      const challenges = CHALLENGES.filter(c => c.track === trackId);
      const next = challenges.find(c => !completedIds.has(c.id)) || challenges[0];
      if (next && !list.some(c => c.id === next.id)) list.push(next);
    });
    activeTrack = preferredTrack || "all";
    renderTracks();
    els.browserKicker.textContent = top ? `RECOMMENDED · ${top.toUpperCase()}` : "RECOMMENDED PATH";
    els.browserTitle.textContent = top ? `Practice ${top}` : "Your next six studies";
    renderChallenges(list.slice(0,6));
    showBrowser(false);
  }

  function openChallenge(id, resume = false) {
    const challenge = CHALLENGES.find(c => c.id === id);
    if (!challenge) return;
    activeChallenge = challenge;
    if (resume) startActiveChallenge(true); else showBriefing(challenge);
    updateRightPanel(challenge);
  }

  function showBriefing(challenge) {
    if (!challenge) return;
    document.body.classList.remove("drawing-workspace-mode");
    stopTimer();
    els.challengeGrid.classList.add("is-hidden");
    els.briefingView.classList.remove("is-hidden");
    els.workspaceView.classList.add("is-hidden");
    els.briefingTags.innerHTML = [challenge.difficulty, `${challenge.minutes} min`, ...challenge.tags].map(tag => `<span>${esc(tag)}</span>`).join("");
    els.briefingTitle.textContent = challenge.title;
    els.briefingSummary.textContent = challenge.summary;
    els.briefingReward.textContent = `${rewardLabel(challenge.rewardClass)} reward`;
    els.briefingGoal.textContent = challenge.goal;
    els.briefingRemember.textContent = challenge.remember;
    els.briefingSteps.innerHTML = challenge.steps.map(step => `<li>${esc(step)}</li>`).join("");
    const resources = TRACK_RESOURCES[challenge.track] || [];
    const links = [
      ...(challenge.referenceUrl ? [{ label: "Open practice reference", url: challenge.referenceUrl }] : []),
      ...resources
    ].filter((item, index, all) => all.findIndex(other => other.url === item.url) === index);
    const siblings = CHALLENGES.filter(c => c.track === challenge.track);
    const pathIndex = siblings.findIndex(c => c.id === challenge.id) + 1;
    const builtIns = getReferenceAssets(challenge);
    const curatedPack = getReferencePack(challenge);
    const packName = curatedPack?.title || "Practice pack";
    const preview = builtIns.length ? `<div class="brief-reference-preview"><img src="${builtIns[0].src}" alt="${esc(builtIns[0].title)}"><div><small>${esc(packName.toUpperCase())} · ${builtIns.length} REFERENCES</small><strong>${esc(builtIns[0].title)}</strong><p>${esc(builtIns[0].note || "")}</p></div></div>` : "";
    els.referenceBrief.innerHTML = `<strong>${esc(challenge.referenceTitle || "Reference")}</strong><p>${esc(challenge.referenceText || "Use a reference that supports the exercise goal.")}</p>${preview}<div class="path-note">Practice path · ${pathIndex}/${siblings.length} in ${esc(TRACKS.find(t => t.id === challenge.track)?.title || challenge.track)}</div>${links.length ? `<div class="learning-links">${links.map(link => `<a href="${link.url}" target="_blank" rel="noopener">${esc(link.label)} ↗</a>`).join("")}</div>` : ""}`;
    updateRightPanel(challenge);
  }

  function showBrowser(resetTitles = true) {
    document.body.classList.remove("drawing-workspace-mode");
    stopTimer();
    els.challengeGrid.classList.remove("is-hidden");
    els.briefingView.classList.add("is-hidden");
    els.workspaceView.classList.add("is-hidden");
    if (resetTitles) {
      const track = TRACKS.find(t => t.id === activeTrack);
      els.browserKicker.textContent = activeTrack === "all" ? "ALL CHALLENGES" : "PRACTICE TRACK";
      els.browserTitle.textContent = track?.title || "Drawing Challenges";
      renderChallenges();
    }
  }

  async function startActiveChallenge(resume) {
    if (!activeChallenge) return;
    document.body.classList.add("drawing-workspace-mode");
    els.challengeGrid.classList.add("is-hidden");
    els.briefingView.classList.add("is-hidden");
    els.workspaceView.classList.remove("is-hidden");
    els.workspaceKicker.textContent = `${activeChallenge.type} · ${activeChallenge.difficulty}`;
    els.workspaceTitle.textContent = activeChallenge.title;
    drawActiveGuide();
    await loadActiveRecord();
    resetTimer();
    updateRightPanel(activeChallenge);
    const meta = readMeta();
    meta.continueChallengeId = activeChallenge.id;
    meta.lastOpenedAt = new Date().toISOString();
    writeMeta(meta);
    updateContinueCard();
    requestAnimationFrame(fitStage);
    setStatus(resume && actions.length ? `Resumed · ${actions.length} actions` : "Practice ready · autosaves locally.");
  }

  function updateRightPanelForNoChallenge() {
    els.referenceTitle.textContent = "Select a challenge";
    els.referenceText.textContent = "Open a challenge to see its built-in guide and practice reference.";
    els.referenceLink.classList.add("is-hidden");
    els.referenceAssetViewer.classList.add("is-hidden");
    setFloatingReference(false);
    setReferenceUnderlay(false);
  }

  function updateRightPanel(challenge) {
    els.referenceTitle.textContent = challenge.referenceTitle || "Practice guide";
    els.referenceText.textContent = challenge.referenceText || "Use the guide as structure, not a finished image to trace.";
    if (challenge.referenceUrl) {
      els.referenceLink.href = challenge.referenceUrl;
      els.referenceLink.classList.remove("is-hidden");
    } else {
      els.referenceLink.classList.add("is-hidden");
    }
    referenceIndex = 0;
    renderReferenceAsset(challenge);
  }

  function getReferencePack(challenge = activeChallenge) {
    if (!challenge) return null;
    const packId = CHALLENGE_REFERENCE_PACKS[challenge.id];
    return packId ? REFERENCE_PACKS[packId] || null : null;
  }

  function getReferenceAssets(challenge = activeChallenge) {
    if (!challenge) return [];
    const curatedPack = getReferencePack(challenge);
    if (curatedPack?.assets?.length) return curatedPack.assets;
    return WEB_REFERENCES[challenge.id] || LOCAL_REFERENCES[challenge.id] || [];
  }

  function renderReferenceAsset(challenge = activeChallenge) {
    const assets = getReferenceAssets(challenge);
    if (!assets.length) {
      els.referenceAssetViewer.classList.add("is-hidden");
      return;
    }
    referenceIndex = Math.max(0, Math.min(referenceIndex, assets.length - 1));
    const item = assets[referenceIndex];
    els.referenceImage.src = item.src;
    els.referenceImage.alt = item.title || "Practice reference";
    els.referenceAssetTitle.textContent = item.title || "Practice reference";
    els.referenceAssetNote.textContent = item.note || "Use this as a study reference, not as a tracing requirement.";
    els.referenceSourceLine.innerHTML = item.web ? `<span>${esc(item.credit || item.sourceLabel || "Internet reference")}</span><span class="license-pill">${esc(item.license || "Source")}</span>${item.sourceUrl ? `<a href="${item.sourceUrl}" target="_blank" rel="noopener">source ↗</a>` : ""}` : "";
    els.referenceAssetViewer.classList.toggle("is-web-reference", !!item.web);
    els.referenceCounter.textContent = `${referenceIndex + 1}/${assets.length}`;
    const curatedPack = getReferencePack(challenge);
    els.referencePackLabel.textContent = curatedPack?.title
      ? `${curatedPack.title} · ${assets.length} refs`
      : (assets.length > 1 ? `Practice pack · ${assets.length} refs` : "Practice reference");
    els.referencePrev.disabled = assets.length <= 1;
    els.referenceNext.disabled = assets.length <= 1;
    els.referenceThumbs.innerHTML = assets.map((asset, index) => {
      const activeClass = index === referenceIndex ? " is-active" : "";
      const thumbTitle = esc(asset.title || ("Reference " + (index + 1)));
      return `<button type="button" class="reference-thumb${activeClass}" data-reference-index="${index}" title="${thumbTitle}"><img src="${asset.src}" alt=""></button>`;
    }).join("");
    els.referenceThumbs.querySelectorAll("[data-reference-index]").forEach(button => button.addEventListener("click", () => {
      referenceIndex = Number(button.dataset.referenceIndex) || 0;
      renderReferenceAsset();
    }));
    els.referenceAssetViewer.classList.remove("is-hidden");
    syncReferenceDisplays();
  }

  function stepReference(delta) {
    const assets = getReferenceAssets();
    if (!assets.length) return;
    referenceIndex = (referenceIndex + delta + assets.length) % assets.length;
    renderReferenceAsset();
  }

  function randomReference() {
    const assets = getReferenceAssets();
    if (assets.length <= 1) return;
    let next = referenceIndex;
    while (next === referenceIndex) next = Math.floor(Math.random() * assets.length);
    referenceIndex = next;
    renderReferenceAsset();
  }

  function openReferenceDialog() {
    const assets = getReferenceAssets();
    if (!assets.length) return;
    const item = assets[referenceIndex];
    els.referenceDialogImage.src = item.src;
    els.referenceDialogImage.alt = item.title || "Practice reference";
    els.referenceDialog.showModal();
  }


  function syncReferenceDisplays() {
    const assets = getReferenceAssets();
    const item = assets[referenceIndex];
    const hasRef = !!item;
    els.referenceFloatToggle.disabled = !hasRef;
    els.referenceUnderlayToggle.disabled = !hasRef;
    els.referenceFloatToggle.classList.toggle("is-active", floatingReferenceVisible && hasRef);
    els.referenceUnderlayToggle.classList.toggle("is-active", referenceUnderlayVisible && hasRef);
    els.referenceUnderlayOpacityRow.classList.toggle("is-hidden", !referenceUnderlayVisible || !hasRef);
    els.referenceUnderlayOpacityLabel.textContent = `${Math.round(referenceUnderlayOpacity * 100)}%`;
    els.referenceUnderlay.style.opacity = String(referenceUnderlayOpacity);
    if (!hasRef) {
      els.referenceUnderlay.classList.add("is-hidden");
      els.floatingReference.classList.add("is-hidden");
      return;
    }
    els.referenceUnderlay.src = item.src;
    els.referenceUnderlay.alt = item.title || "Practice reference underlay";
    els.referenceUnderlay.classList.toggle("is-hidden", !referenceUnderlayVisible);
    els.floatingReferenceImage.src = item.src;
    els.floatingReferenceImage.alt = item.title || "Practice reference";
    els.floatingReferenceTitle.textContent = item.title || "Practice reference";
    els.floatingReferenceNote.textContent = item.note || "";
    els.floatingReferenceCounter.textContent = `${referenceIndex + 1}/${assets.length}`;
    els.floatingReferencePrev.disabled = assets.length <= 1;
    els.floatingReferenceNext.disabled = assets.length <= 1;
    els.floatingReference.classList.toggle("is-hidden", !floatingReferenceVisible);
  }

  function setFloatingReference(visible) {
    floatingReferenceVisible = !!visible && !!getReferenceAssets().length;
    syncReferenceDisplays();
  }

  function toggleFloatingReference() {
    setFloatingReference(!floatingReferenceVisible);
  }

  function setReferenceUnderlay(visible) {
    referenceUnderlayVisible = !!visible && !!getReferenceAssets().length;
    syncReferenceDisplays();
  }

  function toggleReferenceUnderlay() {
    setReferenceUnderlay(!referenceUnderlayVisible);
  }

  function startFloatingDrag(event) {
    if (event.target.closest("button")) return;
    const rect = els.floatingReference.getBoundingClientRect();
    floatingDrag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
    els.floatingReferenceHandle.setPointerCapture?.(event.pointerId);
  }

  function moveFloatingDrag(event) {
    if (!floatingDrag) return;
    const left = clamp(floatingDrag.left + event.clientX - floatingDrag.x, 8, Math.max(8, window.innerWidth - els.floatingReference.offsetWidth - 8));
    const top = clamp(floatingDrag.top + event.clientY - floatingDrag.y, 82, Math.max(82, window.innerHeight - 110));
    els.floatingReference.style.left = `${left}px`;
    els.floatingReference.style.top = `${top}px`;
    els.floatingReference.style.right = "auto";
  }

  function endFloatingDrag() {
    floatingDrag = null;
  }

  function drawActiveGuide() {
    guideCtx.clearRect(0, 0, WIDTH, HEIGHT);
    if (activeChallenge?.guide) activeChallenge.guide(guideCtx);
    updateGuideVisibility();
  }

  function updateGuideVisibility() {
    els.guideCanvas.style.opacity = guideVisible ? String(guideOpacity) : "0";
    els.guideToggle.textContent = `Guide: ${guideVisible ? "On" : "Off"}`;
    els.guideToggle.classList.toggle("is-active", guideVisible);
    els.guideOpacityLabel.textContent = `${Math.round(guideOpacity * 100)}%`;
  }

  function renderQuickColors() {
    els.quickColors.innerHTML = QUICK_COLORS.map(c => `<button type="button" style="--swatch:${c}" data-color="${c}" aria-label="${c}"></button>`).join("");
    els.quickColors.addEventListener("click", event => {
      const button = event.target.closest("[data-color]");
      if (button) setColor(button.dataset.color);
    });
  }

  function setColor(hex) {
    const normalized = normalizeHex(hex);
    if (!normalized) return;
    color = normalized;
    els.colorPicker.value = color;
    els.hexInput.value = color.toUpperCase();
    if (tool === "eraser") setTool(lastDrawTool === "eraser" ? "clean" : lastDrawTool);
  }

  function setTool(next, remember = true) {
    tool = next;
    if (remember && !["pan","eyedropper"].includes(next)) lastDrawTool = next;
    updateTools();
  }

  function updateTools() {
    const mapping = { graphite: els.graphite, clean: els.clean, soft: els.soft, smudge: els.smudge, eyedropper: els.eyedropper, pan: els.pan, eraser: els.eraser };
    Object.entries(mapping).forEach(([name, button]) => button.classList.toggle("is-active", tool === name));
    els.undo.disabled = !actions.length;
    els.redo.disabled = !redoStack.length;
    els.drawCanvas.style.cursor = tool === "eyedropper" ? "copy" : tool === "pan" ? "grab" : "crosshair";
  }

  function pointFromEvent(event) {
    const rect = els.canvasStage.getBoundingClientRect();
    let x = (event.clientX - rect.left) / stageZoom;
    const y = (event.clientY - rect.top) / stageZoom;
    if (flipped) x = WIDTH - x;
    const pressure = event.pointerType === "pen" && event.pressure > 0 ? event.pressure : .58;
    return [clamp(x, 0, WIDTH), clamp(y, 0, HEIGHT), pressure];
  }

  function pointerDown(event) {
    // Finger input is navigation-only. Pencil/pen and mouse are drawing inputs.
    if (event.pointerType === "touch") return;
    if (!activeChallenge || pointerId !== null || tool === "pan" || event.button === 1 || event.altKey) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    if (tool === "eyedropper") {
      pickColorAt(point[0], point[1]);
      setTool(lastDrawTool, false);
      return;
    }
    pointerId = event.pointerId;
    try { els.drawCanvas.setPointerCapture(pointerId); } catch {}
    currentAction = { kind: "stroke", tool, size: brushSize, opacity, softness, color, points: [point] };
    drawAction(currentAction);
  }

  function pointerMove(event) {
    if (event.pointerType === "touch") return;
    if (event.pointerId !== pointerId || !currentAction) return;
    event.preventDefault();
    const p = pointFromEvent(event);
    const prev = currentAction.points.at(-1);
    const dx = p[0] - prev[0], dy = p[1] - prev[1];
    if (dx * dx + dy * dy < 3) return;
    currentAction.points.push(p);
    drawSegment(currentAction, prev, p);
  }

  function pointerUp(event) {
    if (event.pointerType === "touch") return;
    if (event.pointerId !== pointerId || !currentAction) return;
    event.preventDefault();
    try { els.drawCanvas.releasePointerCapture(pointerId); } catch {}
    if (currentAction.points.length === 1) {
      const p = currentAction.points[0];
      currentAction.points.push([p[0] + .15, p[1] + .15, p[2]]);
    }
    actions.push(currentAction);
    if (actions.length > MAX_ACTIONS) actions.shift();
    currentAction = null;
    pointerId = null;
    redoStack = [];
    dirty = true;
    scheduleSave();
    updateTools();
  }

  function drawAction(action) {
    if (!action?.points?.length) return;
    if (action.points.length === 1) {
      const p = action.points[0];
      drawSegment(action, p, [p[0] + .15, p[1] + .15, p[2]]);
      return;
    }
    for (let i = 1; i < action.points.length; i++) drawSegment(action, action.points[i - 1], action.points[i]);
  }

  function drawSegment(action, a, b) {
    const pressure = (Number(a[2] || .58) + Number(b[2] || .58)) / 2;
    const width = Number(action.size || 7) * (.56 + pressure * .72);
    if (action.tool === "eraser") return drawEraser(a, b, width, action.opacity);
    if (action.tool === "soft") return drawSoftSegment(a, b, width, action.color, action.opacity, action.softness);
    if (action.tool === "smudge") return drawSmudgeSegment(a, b, width, action.opacity, action.softness);
    if (action.tool === "graphite") return drawGraphiteSegment(a, b, width, action.opacity);
    drawCleanSegment(a, b, width, action.color, action.opacity);
  }

  function drawCleanSegment(a, b, width, hex, alpha) {
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = rgba(hex, alpha);
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.restore();
  }

  function drawGraphiteSegment(a, b, width, alpha) {
    const graphite = "#463f44";
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const layers = Math.max(2, Math.min(5, Math.round(width / 2.5)));
    for (let i = 0; i < layers; i++) {
      const seed = Math.sin((a[0] + b[1] + i * 17.31) * .021) * 43758.5453;
      const frac = seed - Math.floor(seed);
      const off = (frac - .5) * Math.max(.7, width * .22);
      ctx.strokeStyle = rgba(graphite, alpha * (.20 + .14 * (i + 1) / layers));
      ctx.lineWidth = Math.max(.65, width * (.28 + .06 * i));
      ctx.beginPath();
      ctx.moveTo(a[0] + off, a[1] - off * .45);
      ctx.lineTo(b[0] + off, b[1] - off * .45);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawEraser(a, b, width, alpha) {
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = `rgba(0,0,0,${alpha})`;
    ctx.lineWidth = width * 1.2;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.restore();
  }

  function drawSoftSegment(a, b, width, hex, alpha, soft) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const distance = Math.hypot(dx, dy);
    const step = Math.max(2, width * .2);
    const steps = Math.max(1, Math.ceil(distance / step));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      softStamp(a[0] + dx * t, a[1] + dy * t, width * .7, hex, alpha, soft);
    }
  }

  function softStamp(x, y, radius, hex, alpha, soft) {
    const rgb = hexToRgb(hex);
    const inner = radius * clamp(1 - soft, .03, .92);
    const gradient = ctx.createRadialGradient(x, y, inner, x, y, radius);
    gradient.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha * .38})`);
    gradient.addColorStop(.5, `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha * .18})`);
    gradient.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
    ctx.save(); ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  function drawSmudgeSegment(a, b, width, alpha, soft) {
    const sample = sampleColor(a[0], a[1], Math.max(2, Math.round(width * .18)));
    if (!sample) return;
    const hex = rgbToHex(sample.r, sample.g, sample.b);
    drawSoftSegment(a, b, width * 1.05, hex, Math.min(.7, alpha * sample.a * .52), Math.max(.45, soft));
  }

  function sampleColor(x, y, radius = 2) {
    const sx = Math.max(0, Math.floor(x - radius));
    const sy = Math.max(0, Math.floor(y - radius));
    const sw = Math.min(WIDTH - sx, radius * 2 + 1);
    const sh = Math.min(HEIGHT - sy, radius * 2 + 1);
    if (sw <= 0 || sh <= 0) return null;
    const data = ctx.getImageData(sx, sy, sw, sh).data;
    let r = 0, g = 0, b = 0, weight = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3] / 255;
      if (a < .02) continue;
      r += data[i] * a; g += data[i + 1] * a; b += data[i + 2] * a; weight += a; count++;
    }
    if (!count || !weight) return null;
    return { r: Math.round(r / weight), g: Math.round(g / weight), b: Math.round(b / weight), a: Math.min(1, weight / count) };
  }

  function pickColorAt(x, y) {
    const sample = sampleColor(x, y, 3);
    if (!sample) { setStatus("No paint color at that point."); return; }
    setColor(rgbToHex(sample.r, sample.g, sample.b));
    setStatus(`Picked ${color.toUpperCase()}`);
  }

  function redraw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    actions.forEach(drawAction);
  }

  function undo() {
    if (!actions.length) return;
    redoStack.push(actions.pop());
    dirty = true; redraw(); scheduleSave(); updateTools();
  }

  function redo() {
    if (!redoStack.length) return;
    actions.push(redoStack.pop());
    dirty = true; redraw(); scheduleSave(); updateTools();
  }

  function clearAll() {
    if (!actions.length) return;
    if (!confirm("Clear this practice canvas? You can undo immediately afterwards.")) return;
    redoStack.push(...actions.splice(0));
    dirty = true; redraw(); scheduleSave(); updateTools();
  }

  function toggleFlip() {
    flipped = !flipped;
    els.canvasStack.style.transform = flipped ? "scaleX(-1)" : "scaleX(1)";
    els.flipCanvas.classList.toggle("is-active", flipped);
    els.flipCanvas.textContent = flipped ? "⇄ Flipped" : "⇄ Flip canvas";
  }

  function fitStage() {
    const rect = els.canvasViewport.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    stageZoom = Math.min((rect.width - 24) / WIDTH, (rect.height - 24) / HEIGHT);
    stageZoom = clamp(stageZoom, .2, 2);
    stagePanX = (rect.width - WIDTH * stageZoom) / 2;
    stagePanY = (rect.height - HEIGHT * stageZoom) / 2;
    applyStageTransform();
  }

  function applyStageTransform() {
    els.canvasStage.style.transform = `translate(${stagePanX}px, ${stagePanY}px) scale(${stageZoom})`;
    if (els.canvasZoomPill) els.canvasZoomPill.textContent = `${Math.round(stageZoom * 100)}%`;
  }

  function zoomWheel(event) {
    if (els.workspaceView.classList.contains("is-hidden")) return;
    event.preventDefault();
    const rect = els.canvasViewport.getBoundingClientRect();
    const oldZoom = stageZoom;
    const nextZoom = clamp(oldZoom * (event.deltaY < 0 ? 1.1 : .9), .18, 4);
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const worldX = (cursorX - stagePanX) / oldZoom;
    const worldY = (cursorY - stagePanY) / oldZoom;
    stageZoom = nextZoom;
    stagePanX = cursorX - worldX * nextZoom;
    stagePanY = cursorY - worldY * nextZoom;
    applyStageTransform();
  }

  function viewportPanStart(event) {
    if (event.pointerType === "touch") {
      event.preventDefault();
      touchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      try { els.canvasViewport.setPointerCapture(event.pointerId); } catch {}
      if (touchPointers.size === 2) beginTouchGesture();
      return;
    }
    if (!(event.button === 1 || event.altKey || tool === "pan")) return;
    event.preventDefault();
    panning = true;
    panStart = { x: event.clientX, y: event.clientY, panX: stagePanX, panY: stagePanY };
    try { els.canvasViewport.setPointerCapture(event.pointerId); } catch {}
  }

  function viewportPanMove(event) {
    if (event.pointerType === "touch") {
      if (!touchPointers.has(event.pointerId)) return;
      event.preventDefault();
      touchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touchPointers.size === 2) {
        if (!touchGesture) beginTouchGesture();
        updateTouchGesture();
      }
      return;
    }
    if (!panning || !panStart) return;
    stagePanX = panStart.panX + (event.clientX - panStart.x);
    stagePanY = panStart.panY + (event.clientY - panStart.y);
    applyStageTransform();
  }

  function viewportPanEnd(event) {
    if (event?.pointerType === "touch") {
      touchPointers.delete(event.pointerId);
      if (touchPointers.size < 2) touchGesture = null;
      return;
    }
    panning = false;
    panStart = null;
  }

  function touchMetrics() {
    const points = [...touchPointers.values()];
    if (points.length < 2) return null;
    const a = points[0], b = points[1];
    return {
      cx: (a.x + b.x) / 2,
      cy: (a.y + b.y) / 2,
      distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y))
    };
  }

  function beginTouchGesture() {
    const metrics = touchMetrics();
    if (!metrics) return;
    const rect = els.canvasViewport.getBoundingClientRect();
    touchGesture = {
      startDistance: metrics.distance,
      startZoom: stageZoom,
      worldX: (metrics.cx - rect.left - stagePanX) / stageZoom,
      worldY: (metrics.cy - rect.top - stagePanY) / stageZoom
    };
  }

  function updateTouchGesture() {
    const metrics = touchMetrics();
    if (!metrics || !touchGesture) return;
    const rect = els.canvasViewport.getBoundingClientRect();
    const nextZoom = clamp(touchGesture.startZoom * (metrics.distance / touchGesture.startDistance), .18, 4);
    stageZoom = nextZoom;
    stagePanX = metrics.cx - rect.left - touchGesture.worldX * nextZoom;
    stagePanY = metrics.cy - rect.top - touchGesture.worldY * nextZoom;
    applyStageTransform();
  }

  function resetTimer() {
    stopTimer();
    timerRound = 1;
    timerSeconds = activeChallenge?.timer?.secondsPerRound || 0;
    updateTimerUi();
  }

  function toggleTimer() { timerRunning ? stopTimer() : startTimer(); }
  function startTimer() {
    if (!activeChallenge) return;
    if (timerSeconds <= 0) resetTimer();
    timerRunning = true;
    els.timerToggle.textContent = "Pause";
    timerHandle = setInterval(() => {
      timerSeconds = Math.max(0, timerSeconds - 1);
      updateTimerUi();
      if (timerSeconds <= 0) handleTimerRoundEnd();
    }, 1000);
  }
  function stopTimer() {
    timerRunning = false;
    clearInterval(timerHandle);
    timerHandle = null;
    if (els.timerToggle) els.timerToggle.textContent = "Start";
  }
  function handleTimerRoundEnd() {
    const totalRounds = activeChallenge?.timer?.rounds || 1;
    if (timerRound < totalRounds) {
      timerRound += 1;
      timerSeconds = activeChallenge.timer.secondsPerRound;
      setStatus(`Round ${timerRound - 1} complete ✦ start the next study.`);
      updateTimerUi();
      return;
    }
    stopTimer();
    setStatus("Challenge timer complete ✦ finish whenever your study feels done.");
  }
  function updateTimerUi() {
    const rounds = activeChallenge?.timer?.rounds || 1;
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    const time = `${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
    els.timerDisplay.textContent = time;
    els.workspaceTimer.textContent = time;
    els.workspaceRound.textContent = rounds > 1 ? `Round ${timerRound}/${rounds}` : `${activeChallenge?.minutes || 0} min`;
    els.timerModeLabel.textContent = rounds > 1 ? `ROUND ${timerRound} OF ${rounds}` : "CHALLENGE TIMER";
  }

  async function loadActiveRecord() {
    actions = [];
    redoStack = [];
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    const record = await loadRecord(activeChallenge.id).catch(() => null);
    if (record?.actions && Array.isArray(record.actions)) {
      actions = record.actions;
      redraw();
    }
    dirty = false;
    updateTools();
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    setStatus("Saving…");
    saveTimer = setTimeout(persistNow, 350);
  }

  async function persistNow() {
    if (!activeChallenge) return;
    clearTimeout(saveTimer);
    const record = { challengeId: activeChallenge.id, actions, width: WIDTH, height: HEIGHT, updatedAt: Date.now(), version: VERSION };
    try {
      await saveRecord(record);
      dirty = false;
      setStatus(`Saved · ${actions.length} actions`);
      updateContinueCard();
    } catch (error) {
      console.warn("Drawing Studio save failed", error);
      setStatus("Save failed · export if you want a backup.");
    }
  }

  function setStatus(text) { els.saveStatus.textContent = text; }

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "challengeId" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return dbPromise;
  }
  async function loadRecord(challengeId) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(challengeId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }
  async function saveRecord(record) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  function renderProblemTags() {
    els.problemTags.innerHTML = PROBLEM_TAGS.map(tag => `<button type="button" data-problem="${tag}">${tag}</button>`).join("");
  }

  function openCompleteDialog() {
    if (!activeChallenge) return;
    selectedFeel = "okay";
    selectedProblems = new Set();
    selectedSaveAs = "practice";
    els.reflectionNote.value = "";
    els.completeTitle.textContent = `${activeChallenge.title} complete?`;
    els.feelGrid.querySelectorAll("[data-feel]").forEach(button => button.classList.toggle("is-selected", button.dataset.feel === "okay"));
    els.problemTags.querySelectorAll("[data-problem]").forEach(button => button.classList.remove("is-selected"));
    document.querySelectorAll("[data-saveas]").forEach(button => button.classList.toggle("is-selected", button.dataset.saveas === "practice"));
    els.dialog.showModal?.();
  }

  async function completeChallenge() {
    await persistNow();
    const meta = readMeta();
    const today = dayKey();
    meta.daily ||= {};
    meta.daily[today] ||= [];
    meta.history ||= [];
    meta.trackStats ||= {};
    const alreadyToday = meta.daily[today].includes(activeChallenge.id);
    if (!alreadyToday) meta.daily[today].push(activeChallenge.id);
    const completion = {
      challengeId: activeChallenge.id,
      title: activeChallenge.title,
      track: activeChallenge.track,
      difficulty: activeChallenge.difficulty,
      durationMinutes: activeChallenge.minutes,
      feel: selectedFeel,
      problemTags: [...selectedProblems],
      note: String(els.reflectionNote.value || "").trim().slice(0, 280),
      saveAs: selectedSaveAs,
      at: new Date().toISOString()
    };
    meta.history.push(completion);
    if (meta.history.length > 400) meta.history = meta.history.slice(-400);
    const stat = meta.trackStats[activeChallenge.track] ||= { completions: 0, minutes: 0, lastPracticedAt: null };
    stat.completions += 1;
    stat.minutes += activeChallenge.minutes;
    stat.lastPracticedAt = completion.at;
    meta.continueChallengeId = activeChallenge.id;
    writeMeta(meta);
    if (!alreadyToday) queueReward(activeChallenge, today, completion);
    els.dialog.close();
    updateStats();
    renderTracks();
    renderChallenges();
    updateContinueCard();
    setStatus(alreadyToday ? "Practice saved · today's reward for this challenge was already claimed." : "Practice complete ✦ reward queued for Life RPG.");
  }

  function queueReward(challenge, today, completion) {
    let queue = [];
    try { queue = JSON.parse(localStorage.getItem(REWARD_QUEUE_KEY) || "[]"); } catch {}
    if (!Array.isArray(queue)) queue = [];
    const sourceId = `drawing:${challenge.id}:${today}`;
    if (queue.some(item => item?.sourceId === sourceId)) return;
    queue.push({
      id: `drawing-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      sourceId,
      challengeId: challenge.id,
      title: challenge.title,
      at: completion.at,
      reward: { ...REWARDS[challenge.rewardClass] },
      reflection: { feel: completion.feel, note: completion.note, problemTags: completion.problemTags, saveAs: completion.saveAs },
      version: VERSION
    });
    localStorage.setItem(REWARD_QUEUE_KEY, JSON.stringify(queue));
  }

  function updateStats() {
    const meta = readMeta();
    const todayDone = new Set(meta.daily?.[dayKey()] || []).size;
    const total = (meta.history || []).length;
    els.todayProgress.textContent = `${todayDone} today`;
    els.totalProgress.textContent = `${total} ${total === 1 ? "practice" : "practices"}`;
  }

  function updateContinueCard() {
    const meta = readMeta();
    const challenge = CHALLENGES.find(c => c.id === meta.continueChallengeId);
    if (!challenge) { els.continueCard.classList.add("is-hidden"); return; }
    els.continueCard.classList.remove("is-hidden");
    els.continueTitle.textContent = challenge.title;
    els.continueMeta.textContent = `${challenge.minutes} min · ${challenge.difficulty}`;
  }

  function readMeta() {
    try {
      const parsed = JSON.parse(localStorage.getItem(META_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch { return {}; }
  }
  function writeMeta(meta) { localStorage.setItem(META_KEY, JSON.stringify(meta)); }

  function migrateLegacyMeta() {
    if (localStorage.getItem(META_KEY)) return;
    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_META_KEY) || "null");
      if (!legacy || typeof legacy !== "object") return;
      writeMeta({ legacyHistory: legacy.history || [], history: [], daily: {}, trackStats: {} });
    } catch {}
  }

  function exportPng() {
    if (!activeChallenge) return;
    const out = document.createElement("canvas");
    out.width = WIDTH; out.height = HEIGHT;
    const octx = out.getContext("2d");
    octx.fillStyle = "#fff"; octx.fillRect(0,0,WIDTH,HEIGHT);
    octx.drawImage(els.drawCanvas,0,0);
    out.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `life-rpg-${activeChallenge.id}.png`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }, "image/png");
  }

  function rewardLabel(level) { return ({small:"Small",medium:"Medium",large:"Large",epic:"Epic"})[level] || "Medium"; }
  function dayKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
  function clamp(n,min,max){ return Math.min(max,Math.max(min,Number(n)||0)); }
  function esc(v){ return String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch])); }
  function normalizeHex(v){ const m=String(v||"").trim().match(/^#?([0-9a-f]{6})$/i); return m?`#${m[1].toLowerCase()}`:null; }
  function hexToRgb(hex){ const h=normalizeHex(hex)||"#000000"; const n=parseInt(h.slice(1),16); return {r:(n>>16)&255,g:(n>>8)&255,b:n&255}; }
  function rgbToHex(r,g,b){ const p=n=>clamp(Math.round(n),0,255).toString(16).padStart(2,"0"); return `#${p(r)}${p(g)}${p(b)}`; }
  function rgba(hex,a){ const c=hexToRgb(hex); return `rgba(${c.r},${c.g},${c.b},${clamp(a,0,1)})`; }

  function baseGuide(g, label) {
    g.save();
    g.clearRect(0,0,WIDTH,HEIGHT);
    g.strokeStyle="#8d6a7c"; g.fillStyle="#8d6a7c"; g.lineWidth=3; g.lineCap="round"; g.lineJoin="round";
    g.font="700 24px system-ui"; g.textAlign="left"; g.fillText(label,42,54);
    g.restore();
  }
  function arrow(g,x1,y1,x2,y2){ g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();const a=Math.atan2(y2-y1,x2-x1);const s=14;g.beginPath();g.moveTo(x2,y2);g.lineTo(x2-Math.cos(a-.5)*s,y2-Math.sin(a-.5)*s);g.moveTo(x2,y2);g.lineTo(x2-Math.cos(a+.5)*s,y2-Math.sin(a+.5)*s);g.stroke(); }
  function ellipse(g,x,y,rx,ry,rot=0){g.beginPath();g.ellipse(x,y,rx,ry,rot,0,Math.PI*2);g.stroke();}

  function drawGestureGuide(g){
    baseGuide(g,"Gesture: find one dominant action line, then support it");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=5;g.setLineDash([12,12]);
    const lines=[[[160,700],[240,560],[300,400],[380,220]],[[390,220],[500,360],[540,560],[650,710]],[[690,710],[750,570],[860,410],[980,230]]];
    lines.forEach(points=>{g.beginPath();g.moveTo(...points[0]);for(let i=1;i<points.length;i++)g.quadraticCurveTo(...points[i-1],...points[i]);g.stroke();});
    g.setLineDash([]);g.font="600 20px system-ui";g.fillStyle="#9f7d8e";g.fillText("Do not trace these — they are examples of different rhythms.",42,842);g.restore();
  }
  function drawGestureStructureGuide(g){
    baseGuide(g,"Gesture + structure: preserve the curve while adding masses");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=3;g.setLineDash([9,9]);
    [260,600,940].forEach((x,i)=>{g.beginPath();g.moveTo(x-80,720);g.quadraticCurveTo(x+30,480,x-20,180);g.stroke();ellipse(g,x-5,315,70,105,i*.12);g.strokeRect(x-65,455,125,105);});
    g.setLineDash([]);g.restore();
  }
  function drawPushPoseGuide(g){
    baseGuide(g,"Left: observed pose · Right: pushed pose");
    g.save();g.strokeStyle="#a88a99";g.lineWidth=2;g.setLineDash([8,8]);g.beginPath();g.moveTo(600,90);g.lineTo(600,840);g.stroke();g.setLineDash([]);g.font="700 22px system-ui";g.fillStyle="#9b7b8b";g.textAlign="center";g.fillText("OBSERVE",300,110);g.fillText("PUSH",900,110);g.restore();
  }
  function drawTorsoTwistGuide(g){
    baseGuide(g,"Six torso orientations — invent the twist, do not copy the examples literally");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=3;const xs=[210,600,990],ys=[310,650];
    ys.forEach((y,row)=>xs.forEach((x,col)=>{ellipse(g,x,y-55,70,95,(col-row)*.12);g.strokeRect(x-62+(col-1)*8,y+55,124,80);g.beginPath();g.moveTo(x,y-145);g.quadraticCurveTo(x+(col-1)*28,y,x+(row?18:-18),y+135);g.stroke();}));g.restore();
  }
  function drawMannequinGuide(g){
    baseGuide(g,"Build from simple forms: head → ribcage/pelvis → limbs");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=3;g.setLineDash([8,8]);ellipse(g,600,190,48,62);ellipse(g,570,340,92,120,-.15);g.strokeRect(560,455,150,95);arrow(g,510,320,360,220);arrow(g,640,330,790,250);arrow(g,585,545,470,760);arrow(g,655,545,760,755);g.setLineDash([]);g.restore();
  }
  function drawHandSlotsGuide(g){
    baseGuide(g,"Three studies: OPEN · FIST · POINT");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=2;g.setLineDash([8,8]);[210,600,990].forEach((x,i)=>{g.roundRect(x-155,170,310,560,22);g.stroke();g.strokeRect(x-75,400,150,125);g.beginPath();g.moveTo(x-105,400);g.quadraticCurveTo(x,340,x+105,400);g.stroke();g.fillStyle="#9f7d8e";g.font="700 20px system-ui";g.textAlign="center";g.fillText(["OPEN","FIST","POINT"][i],x,770);});g.setLineDash([]);g.restore();
  }
  function drawHandObjectGuide(g){
    baseGuide(g,"Object first → contact → palm mass → fingers wrap around form");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=3;g.setLineDash([8,8]);g.strokeRect(450,300,300,280);ellipse(g,750,390,55,95);arrow(g,360,430,445,430);g.fillStyle="#9f7d8e";g.font="600 20px system-ui";g.fillText("Object volume",490,620);g.fillText("Grip/contact",770,440);g.setLineDash([]);g.restore();
  }
  function drawHairMassGuide(g){
    baseGuide(g,"Skull first · hair volume sits outside it · group large clumps");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=2;g.setLineDash([8,8]);[240,600,960].forEach((x,i)=>{ellipse(g,x,395,105,135);ellipse(g,x,380,135+(i*8),160+(i*6));arrow(g,x,280,x+[80,-70,100][i],230+[30,80,20][i]);});g.setLineDash([]);g.restore();
  }
  function drawHairFlowGuide(g){
    baseGuide(g,"Five flow directions — let big hair ribbons support the head movement");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=3;const pts=[[170,300,320,230],[410,330,540,430],[650,300,800,220],[880,320,1050,420],[510,650,760,690]];pts.forEach(([x1,y1,x2,y2])=>{ellipse(g,x1,y1,52,68);arrow(g,x1+20,y1-25,x2,y2);});g.restore();
  }
  function drawOnePointRoomGuide(g){
    baseGuide(g,"One-point room guide");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=2;g.setLineDash([7,8]);const vx=600,vy=360;g.beginPath();g.moveTo(40,vy);g.lineTo(1160,vy);g.stroke();[[40,100],[40,820],[1160,100],[1160,820],[300,820],[900,820],[300,100],[900,100]].forEach(([x,y])=>{g.beginPath();g.moveTo(vx,vy);g.lineTo(x,y);g.stroke();});g.setLineDash([]);g.fillStyle="#9f7d8e";g.beginPath();g.arc(vx,vy,7,0,Math.PI*2);g.fill();g.font="700 18px system-ui";g.fillText("VP",615,350);g.restore();
  }
  function drawValueGuide(g){
    baseGuide(g,"Three value families: LIGHT · MID · DARK");
    g.save();const values=["#ece7e9","#9d9097","#433a3f"];values.forEach((c,i)=>{g.fillStyle=c;g.fillRect(120+i*320,150,280,120);g.fillStyle="#8d6a7c";g.font="700 20px system-ui";g.textAlign="center";g.fillText(["LIGHT","MID","DARK"][i],260+i*320,305);});g.strokeStyle="#9f7d8e";g.lineWidth=2;g.setLineDash([8,8]);g.roundRect(170,390,860,360,20);g.stroke();g.setLineDash([]);g.fillStyle="#9f7d8e";g.textAlign="center";g.fillText("Use this area for the actual 3-value study",600,785);g.restore();
  }
  function drawStoryGuide(g){
    baseGuide(g,"Thumbnail first — final scene second");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=2;g.setLineDash([8,8]);[170,430,690].forEach(x=>{g.roundRect(x,130,220,150,14);g.stroke();});g.roundRect(170,350,780,440,18);g.stroke();g.setLineDash([]);g.fillStyle="#9f7d8e";g.font="700 18px system-ui";g.textAlign="center";g.fillText("THUMBNAILS",500,315);g.fillText("FINAL SCENE",560,830);g.restore();
  }
  function drawBalanceGuide(g){
    baseGuide(g,"Balance: center of mass must land over a believable support zone");
    g.save();g.strokeStyle="#9f7d8e";g.fillStyle="#9f7d8e";g.lineWidth=3;g.setLineDash([8,8]);
    g.beginPath();g.moveTo(600,120);g.lineTo(600,760);g.stroke();g.setLineDash([]);
    g.fillRect(430,760,340,10);g.font="600 18px system-ui";g.fillText("support zone",505,800);
    ellipse(g,570,250,58,76,-.12);ellipse(g,625,420,70,62,.18);arrow(g,590,485,470,720);arrow(g,645,480,735,720);g.restore();
  }
  function drawInteractionGuide(g){
    baseGuide(g,"Two figures: connect the forces before adding anatomy");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=4;g.setLineDash([10,10]);
    g.beginPath();g.moveTo(240,700);g.quadraticCurveTo(360,420,500,250);g.stroke();
    g.beginPath();g.moveTo(960,700);g.quadraticCurveTo(820,430,690,270);g.stroke();
    g.setLineDash([]);g.beginPath();g.arc(600,430,18,0,Math.PI*2);g.stroke();arrow(g,500,390,585,430);arrow(g,700,390,615,430);g.font="600 18px system-ui";g.fillText("shared contact / focal point",485,475);g.restore();
  }
  function drawProportionGuide(g){
    baseGuide(g,"Debug proportions: sketch first, measure second, redraw third");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=2;g.setLineDash([8,8]);
    [140,300,460,620,780].forEach(y=>{g.beginPath();g.moveTo(170,y);g.lineTo(520,y);g.stroke();g.beginPath();g.moveTo(680,y);g.lineTo(1030,y);g.stroke();});
    g.setLineDash([]);g.font="700 18px system-ui";g.textAlign="center";g.fillText("FIRST SKETCH",345,835);g.fillText("CORRECTED",855,835);g.restore();
  }
  function drawHeadTurnGuide(g){
    baseGuide(g,"Head turn sheet: wrap construction lines around the skull");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=2;const xs=[180,460,740,1020];
    xs.forEach((x,i)=>{ellipse(g,x,420,95,125);g.beginPath();g.ellipse(x,420,82,30,i*.18,0,Math.PI*2);g.stroke();g.beginPath();g.moveTo(x+(i-1.5)*14,300);g.quadraticCurveTo(x+(i-1.5)*28,420,x+(i-1.5)*12,540);g.stroke();});g.restore();
  }
  function drawExpressionGuide(g){
    baseGuide(g,"Same identity · four expression changes");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=2;const xs=[180,460,740,1020];const labels=["NEUTRAL","ANNOYED","SMUG","HURT"];
    xs.forEach((x,i)=>{ellipse(g,x,400,95,120);g.font="700 17px system-ui";g.fillStyle="#9f7d8e";g.textAlign="center";g.fillText(labels[i],x,565);});g.restore();
  }
  function drawHairActionGuide(g){
    baseGuide(g,"Hair follows the skull, then lags behind the motion");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=3;ellipse(g,430,390,85,105);arrow(g,430,390,620,330);arrow(g,455,290,760,220);arrow(g,470,340,820,360);arrow(g,470,430,760,500);g.font="600 18px system-ui";g.fillStyle="#9f7d8e";g.fillText("head moves →",560,320);g.fillText("hair lag / flow",760,535);g.restore();
  }
  function drawTwoPointGuide(g){
    baseGuide(g,"Two-point street: one corner, two vanishing directions");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=2;g.setLineDash([7,8]);const y=390,l=70,r=1130;g.beginPath();g.moveTo(40,y);g.lineTo(1160,y);g.stroke();
    const corner=[[600,170],[600,760]];corner.forEach(([x,yy])=>{g.beginPath();g.moveTo(x,yy);g.lineTo(l,y);g.moveTo(x,yy);g.lineTo(r,y);g.stroke();});
    g.setLineDash([]);g.beginPath();g.moveTo(600,170);g.lineTo(600,760);g.stroke();g.fillStyle="#9f7d8e";g.fillText("VP",55,380);g.fillText("VP",1135,380);g.restore();
  }
  function drawCafeGuide(g){
    drawOnePointRoomGuide(g);g.save();g.strokeStyle="#9f7d8e";g.lineWidth=3;g.strokeRect(180,520,250,120);g.strokeRect(730,510,260,130);g.strokeRect(500,460,180,110);g.fillStyle="#9f7d8e";g.font="600 18px system-ui";g.fillText("booth",250,675);g.fillText("counter",805,675);g.restore();
  }
  function drawCharacterSpaceGuide(g){
    drawOnePointRoomGuide(g);g.save();g.strokeStyle="#9f7d8e";g.lineWidth=3;g.setLineDash([7,7]);
    [[390,560,105],[800,500,145]].forEach(([x,y,h])=>{ellipse(g,x,y-h,20,25);g.beginPath();g.moveTo(x,y-h+25);g.lineTo(x,y-35);g.moveTo(x,y-75);g.lineTo(x-35,y-30);g.moveTo(x,y-75);g.lineTo(x+35,y-30);g.moveTo(x,y-35);g.lineTo(x-28,y+25);g.moveTo(x,y-35);g.lineTo(x+28,y+25);g.stroke();});g.setLineDash([]);g.restore();
  }
  function drawDepthGuide(g){
    baseGuide(g,"Depth layers: foreground · midground · background");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=2;g.setLineDash([8,8]);g.roundRect(80,120,1040,680,18);g.stroke();g.setLineDash([]);g.globalAlpha=.12;g.fillStyle="#8d6a7c";g.fillRect(80,120,220,680);g.globalAlpha=.08;g.fillRect(300,120,470,680);g.globalAlpha=.04;g.fillRect(770,120,350,680);g.globalAlpha=1;g.font="700 18px system-ui";g.fillText("FG",150,160);g.fillText("MG",500,160);g.fillText("BG",900,160);g.restore();
  }
  function drawSingleLightGuide(g){
    baseGuide(g,"Single light: one direction, one shadow family");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=3;ellipse(g,610,450,150,190);arrow(g,210,170,440,320);g.fillStyle="#9f7d8e";g.font="600 18px system-ui";g.fillText("LIGHT",190,145);g.setLineDash([8,8]);g.beginPath();g.moveTo(610,260);g.quadraticCurveTo(690,450,610,640);g.stroke();g.setLineDash([]);g.restore();
  }
  function drawWarmCoolGuide(g){
    baseGuide(g,"Warm light / cool shadow: separate the families first");
    g.save();g.fillStyle="#e7a165";g.fillRect(170,160,340,150);g.fillStyle="#7186b5";g.fillRect(690,160,340,150);g.fillStyle="#9f7d8e";g.font="700 18px system-ui";g.textAlign="center";g.fillText("WARM LIGHT FAMILY",340,345);g.fillText("COOL SHADOW FAMILY",860,345);g.strokeStyle="#9f7d8e";g.setLineDash([8,8]);g.roundRect(210,420,780,330,18);g.stroke();g.restore();
  }
  function drawPaletteGuide(g){
    baseGuide(g,"Limited palette: choose before you paint");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=2;for(let i=0;i<5;i++){g.strokeRect(190+i*165,150,130,90);}g.setLineDash([8,8]);g.roundRect(160,320,880,430,18);g.stroke();g.setLineDash([]);g.fillStyle="#9f7d8e";g.font="700 18px system-ui";g.textAlign="center";g.fillText("STUDY FRAME",600,790);g.restore();
  }
  function drawMoodGuide(g){
    baseGuide(g,"Same sketch · three lighting moods");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=2;const xs=[80,420,760];const labels=["COZY","TENSE","MELANCHOLIC"];xs.forEach((x,i)=>{g.roundRect(x,200,300,470,16);g.stroke();g.fillStyle="#9f7d8e";g.font="700 18px system-ui";g.textAlign="center";g.fillText(labels[i],x+150,710);});g.restore();
  }
  function drawThumbnailGridGuide(g){
    baseGuide(g,"Six tiny compositions: change camera, scale and focal placement");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=2;g.setLineDash([7,7]);const xs=[120,420,720],ys=[180,500];ys.forEach(y=>xs.forEach(x=>{g.roundRect(x,y,240,170,12);g.stroke();}));g.setLineDash([]);g.restore();
  }
  function drawMomentAfterGuide(g){
    baseGuide(g,"Plan the aftermath clues before the final scene");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=2;[120,380,640].forEach((x,i)=>{g.roundRect(x,140,220,130,12);g.stroke();g.fillStyle="#9f7d8e";g.font="700 16px system-ui";g.fillText(`CLUE ${i+1}`,x+78,300);});g.roundRect(150,360,900,390,18);g.stroke();g.restore();
  }
  function drawTwoCharacterStoryGuide(g){
    baseGuide(g,"Shared action: bodies first, faces later");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=4;g.setLineDash([9,9]);g.beginPath();g.moveTo(240,730);g.quadraticCurveTo(380,450,510,260);g.stroke();g.beginPath();g.moveTo(960,730);g.quadraticCurveTo(820,470,700,280);g.stroke();g.setLineDash([]);g.beginPath();g.arc(605,445,22,0,Math.PI*2);g.stroke();g.font="600 18px system-ui";g.fillText("contact / shared object",515,490);g.restore();
  }
  function drawMiniIllustrationGuide(g){
    baseGuide(g,"Thumbnail → value plan → final mini illustration");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=2;g.setLineDash([7,7]);[100,330,560].forEach(x=>{g.roundRect(x,120,190,120,10);g.stroke();});for(let i=0;i<3;i++){g.strokeRect(820+i*85,140,65,65);}g.roundRect(120,330,960,430,18);g.stroke();g.setLineDash([]);g.fillStyle="#9f7d8e";g.font="700 16px system-ui";g.fillText("3 THUMBNAILS",100,275);g.fillText("3 VALUE FAMILIES",820,235);g.fillText("FINAL SCENE",530,800);g.restore();
  }

})();
