(() => {
  "use strict";

  if (window.__lifeRpgDreamscapeV314ax) return;
  window.__lifeRpgDreamscapeV314ax = true;

  const app = window.LifeRPGApp;
  const graph = window.LifeRPGTalentTreeGraph;
  const relationships = window.LifeRPGRelationshipEngine;
  if (!app?.getState || !app?.saveState || !graph?.getTotalDreamThreads) {
    console.error("Dreamscape could not initialize because Talent Tree progression is unavailable.");
    return;
  }

  const VERSION = "0.31.4ax";
  const SCHEMA = 1;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const REALMS = ["Work","Knowledge","Japanese","Health","Recovery","Home","Hobbies"];
  const BASE_DREAMS = [
  {
    "id": "work-bakugo-t1",
    "realm": "Work",
    "tier": 1,
    "focus": "bakugo",
    "title": "After Hours · Bakugo",
    "body": [
      "The workday has somehow followed Luca home. Papers, notes and a half-finished plan cover the table, but the dream keeps making the room quieter than it should be.",
      "Bakugo is the one who breaks first. He reaches across the space between them and takes whatever Luca is holding straight out of her hands. \"Enough.\" The word is rough, but his fingers linger against hers long enough to ruin the effect.",
      "He acts as if the closeness is purely practical. A chair pulled nearer. A hand at her elbow. His knee pressed against hers because apparently there is nowhere else in the entire dream to put it.",
      "When Luca looks at him, he is already watching her. He clicks his tongue like she has caught him doing something embarrassing, but he does not move away.",
      "Somewhere in the dream, the unfinished work quietly disappears. Luca only notices when she wakes and reaches for a warmth that is not actually there."
    ]
  },
  {
    "id": "work-kirishima-t1",
    "realm": "Work",
    "tier": 1,
    "focus": "kirishima",
    "title": "After Hours · Kirishima",
    "body": [
      "The workday has somehow followed Luca home. Papers, notes and a half-finished plan cover the table, but the dream keeps making the room quieter than it should be.",
      "Kirishima asks first, even in a dream. \"You okay?\" His hand hovers near Luca's shoulder until she leans the last centimetre herself; then his whole face softens as if she has handed him something precious.",
      "He is warm in the impossible, exaggerated way dreams make warmth feel. Luca finds herself tucked against his side, his arm loose around her, his thumb making absent little movements where it rests.",
      "Kirishima laughs quietly when she points out how close they are. \"Yeah,\" he says, not embarrassed in the slightest. \"I noticed.\"",
      "Somewhere in the dream, the unfinished work quietly disappears. Luca only notices when she wakes and reaches for a warmth that is not actually there."
    ]
  },
  {
    "id": "work-both-t1",
    "realm": "Work",
    "tier": 1,
    "focus": "both",
    "title": "After Hours · Both",
    "body": [
      "The workday has somehow followed Luca home. Papers, notes and a half-finished plan cover the table, but the dream keeps making the room quieter than it should be.",
      "Somehow Luca ends up in the middle. Kirishima makes room for her without thinking; Bakugo complains about everyone taking up too much space while simultaneously shifting closer.",
      "The dream turns their bickering into background noise. Kirishima's arm rests behind Luca; Bakugo's leg is pressed against hers. Every time she notices one point of contact, another seems to appear.",
      "At some point Kirishima catches Luca smiling and smiles back. Bakugo notices both of them and mutters something about idiots, but his hand closes loosely around Luca's fingers under the edge of the blanket.",
      "Somewhere in the dream, the unfinished work quietly disappears. Luca only notices when she wakes and reaches for a warmth that is not actually there."
    ]
  },
  {
    "id": "work-bakugo-t2",
    "realm": "Work",
    "tier": 2,
    "focus": "bakugo",
    "title": "After Hours · Bakugo II",
    "body": [
      "It is far too late. The apartment is dark except for one lamp and the blue-grey city beyond the windows; Luca is still pretending she has one more useful thought left in her.",
      "Bakugo's patience in the dream is different from his patience awake: thinner in words, deeper in action. He catches Luca by the waist when she shifts away and simply keeps her there, expression daring her to make something of it.",
      "The argument they were having dissolves because he is too close. His thumb brushes once along her side; when Luca looks up, his eyes drop to her mouth with absolutely no attempt to hide it.",
      "The kiss is brief and almost annoyed, as if he has finally lost an argument with himself. The second one is slower. The dream makes no effort to explain why Luca's hands end up gripping the front of his shirt.",
      "Somewhere in the dream, the unfinished work quietly disappears. Luca only notices when she wakes and reaches for a warmth that is not actually there."
    ]
  },
  {
    "id": "work-kirishima-t2",
    "realm": "Work",
    "tier": 2,
    "focus": "kirishima",
    "title": "After Hours · Kirishima II",
    "body": [
      "It is far too late. The apartment is dark except for one lamp and the blue-grey city beyond the windows; Luca is still pretending she has one more useful thought left in her.",
      "Kirishima's closeness feels gentle right up until Luca realizes he is not moving back. One hand settles at her waist, careful but certain, and his smile turns smaller when her breath catches.",
      "\"Tell me if you want space,\" he murmurs. Luca does not. The answer seems to change the air between them more than any confession could have.",
      "When he kisses her, it is warm and unhurried. He pauses just far enough away to search her face, then smiles against her mouth when she closes the distance again.",
      "Somewhere in the dream, the unfinished work quietly disappears. Luca only notices when she wakes and reaches for a warmth that is not actually there."
    ]
  },
  {
    "id": "work-both-t2",
    "realm": "Work",
    "tier": 2,
    "focus": "both",
    "title": "After Hours · Both II",
    "body": [
      "It is far too late. The apartment is dark except for one lamp and the blue-grey city beyond the windows; Luca is still pretending she has one more useful thought left in her.",
      "The dream is unfair enough to put Luca between them and then remove every reasonable escape route. Kirishima is warm at her back; Bakugo is close in front, eyes narrowed as if the situation is somehow her fault.",
      "Kirishima's hand settles at her hip. Bakugo watches the movement, then looks at Luca instead of telling him to move it. The silence becomes charged enough that Luca can hear her own heartbeat.",
      "Bakugo kisses her first, quick and challenging. Kirishima's forehead rests against her temple when she turns toward him, his smile almost disbelieving before he kisses her too. The dream blurs at the edges around the three of them.",
      "Somewhere in the dream, the unfinished work quietly disappears. Luca only notices when she wakes and reaches for a warmth that is not actually there."
    ]
  },
  {
    "id": "knowledge-bakugo-t1",
    "realm": "Knowledge",
    "tier": 1,
    "focus": "bakugo",
    "title": "Quiet Minds · Bakugo",
    "body": [
      "The dream puts Luca somewhere impossible and familiar at once: a quiet room, too many books, a puzzle left open between three cups, and the feeling that nobody is in a hurry.",
      "Bakugo is the one who breaks first. He reaches across the space between them and takes whatever Luca is holding straight out of her hands. \"Enough.\" The word is rough, but his fingers linger against hers long enough to ruin the effect.",
      "He acts as if the closeness is purely practical. A chair pulled nearer. A hand at her elbow. His knee pressed against hers because apparently there is nowhere else in the entire dream to put it.",
      "When Luca looks at him, he is already watching her. He clicks his tongue like she has caught him doing something embarrassing, but he does not move away.",
      "The page stays unanswered. The dream seems satisfied with that. Luca wakes with the uncomfortable sense that she had learned something anyway."
    ]
  },
  {
    "id": "knowledge-kirishima-t1",
    "realm": "Knowledge",
    "tier": 1,
    "focus": "kirishima",
    "title": "Quiet Minds · Kirishima",
    "body": [
      "The dream puts Luca somewhere impossible and familiar at once: a quiet room, too many books, a puzzle left open between three cups, and the feeling that nobody is in a hurry.",
      "Kirishima asks first, even in a dream. \"You okay?\" His hand hovers near Luca's shoulder until she leans the last centimetre herself; then his whole face softens as if she has handed him something precious.",
      "He is warm in the impossible, exaggerated way dreams make warmth feel. Luca finds herself tucked against his side, his arm loose around her, his thumb making absent little movements where it rests.",
      "Kirishima laughs quietly when she points out how close they are. \"Yeah,\" he says, not embarrassed in the slightest. \"I noticed.\"",
      "The page stays unanswered. The dream seems satisfied with that. Luca wakes with the uncomfortable sense that she had learned something anyway."
    ]
  },
  {
    "id": "knowledge-both-t1",
    "realm": "Knowledge",
    "tier": 1,
    "focus": "both",
    "title": "Quiet Minds · Both",
    "body": [
      "The dream puts Luca somewhere impossible and familiar at once: a quiet room, too many books, a puzzle left open between three cups, and the feeling that nobody is in a hurry.",
      "Somehow Luca ends up in the middle. Kirishima makes room for her without thinking; Bakugo complains about everyone taking up too much space while simultaneously shifting closer.",
      "The dream turns their bickering into background noise. Kirishima's arm rests behind Luca; Bakugo's leg is pressed against hers. Every time she notices one point of contact, another seems to appear.",
      "At some point Kirishima catches Luca smiling and smiles back. Bakugo notices both of them and mutters something about idiots, but his hand closes loosely around Luca's fingers under the edge of the blanket.",
      "The page stays unanswered. The dream seems satisfied with that. Luca wakes with the uncomfortable sense that she had learned something anyway."
    ]
  },
  {
    "id": "knowledge-bakugo-t2",
    "realm": "Knowledge",
    "tier": 2,
    "focus": "bakugo",
    "title": "Quiet Minds · Bakugo II",
    "body": [
      "There is a question on the page that none of them are really reading anymore. The answer has stopped mattering; distance has become the more interesting problem.",
      "Bakugo's patience in the dream is different from his patience awake: thinner in words, deeper in action. He catches Luca by the waist when she shifts away and simply keeps her there, expression daring her to make something of it.",
      "The argument they were having dissolves because he is too close. His thumb brushes once along her side; when Luca looks up, his eyes drop to her mouth with absolutely no attempt to hide it.",
      "The kiss is brief and almost annoyed, as if he has finally lost an argument with himself. The second one is slower. The dream makes no effort to explain why Luca's hands end up gripping the front of his shirt.",
      "The page stays unanswered. The dream seems satisfied with that. Luca wakes with the uncomfortable sense that she had learned something anyway."
    ]
  },
  {
    "id": "knowledge-kirishima-t2",
    "realm": "Knowledge",
    "tier": 2,
    "focus": "kirishima",
    "title": "Quiet Minds · Kirishima II",
    "body": [
      "There is a question on the page that none of them are really reading anymore. The answer has stopped mattering; distance has become the more interesting problem.",
      "Kirishima's closeness feels gentle right up until Luca realizes he is not moving back. One hand settles at her waist, careful but certain, and his smile turns smaller when her breath catches.",
      "\"Tell me if you want space,\" he murmurs. Luca does not. The answer seems to change the air between them more than any confession could have.",
      "When he kisses her, it is warm and unhurried. He pauses just far enough away to search her face, then smiles against her mouth when she closes the distance again.",
      "The page stays unanswered. The dream seems satisfied with that. Luca wakes with the uncomfortable sense that she had learned something anyway."
    ]
  },
  {
    "id": "knowledge-both-t2",
    "realm": "Knowledge",
    "tier": 2,
    "focus": "both",
    "title": "Quiet Minds · Both II",
    "body": [
      "There is a question on the page that none of them are really reading anymore. The answer has stopped mattering; distance has become the more interesting problem.",
      "The dream is unfair enough to put Luca between them and then remove every reasonable escape route. Kirishima is warm at her back; Bakugo is close in front, eyes narrowed as if the situation is somehow her fault.",
      "Kirishima's hand settles at her hip. Bakugo watches the movement, then looks at Luca instead of telling him to move it. The silence becomes charged enough that Luca can hear her own heartbeat.",
      "Bakugo kisses her first, quick and challenging. Kirishima's forehead rests against her temple when she turns toward him, his smile almost disbelieving before he kisses her too. The dream blurs at the edges around the three of them.",
      "The page stays unanswered. The dream seems satisfied with that. Luca wakes with the uncomfortable sense that she had learned something anyway."
    ]
  },
  {
    "id": "japanese-bakugo-t1",
    "realm": "Japanese",
    "tier": 1,
    "focus": "bakugo",
    "title": "Between Words · Bakugo",
    "body": [
      "A single Japanese phrase keeps repeating in the dream, changing meaning every time someone says it. Luca knows the words, but somehow the tone is doing all the dangerous work.",
      "Bakugo is the one who breaks first. He reaches across the space between them and takes whatever Luca is holding straight out of her hands. \"Enough.\" The word is rough, but his fingers linger against hers long enough to ruin the effect.",
      "He acts as if the closeness is purely practical. A chair pulled nearer. A hand at her elbow. His knee pressed against hers because apparently there is nowhere else in the entire dream to put it.",
      "When Luca looks at him, he is already watching her. He clicks his tongue like she has caught him doing something embarrassing, but he does not move away.",
      "The last phrase follows Luca out of sleep. She remembers the tone perfectly and, annoyingly, cannot remember the exact words."
    ]
  },
  {
    "id": "japanese-kirishima-t1",
    "realm": "Japanese",
    "tier": 1,
    "focus": "kirishima",
    "title": "Between Words · Kirishima",
    "body": [
      "A single Japanese phrase keeps repeating in the dream, changing meaning every time someone says it. Luca knows the words, but somehow the tone is doing all the dangerous work.",
      "Kirishima asks first, even in a dream. \"You okay?\" His hand hovers near Luca's shoulder until she leans the last centimetre herself; then his whole face softens as if she has handed him something precious.",
      "He is warm in the impossible, exaggerated way dreams make warmth feel. Luca finds herself tucked against his side, his arm loose around her, his thumb making absent little movements where it rests.",
      "Kirishima laughs quietly when she points out how close they are. \"Yeah,\" he says, not embarrassed in the slightest. \"I noticed.\"",
      "The last phrase follows Luca out of sleep. She remembers the tone perfectly and, annoyingly, cannot remember the exact words."
    ]
  },
  {
    "id": "japanese-both-t1",
    "realm": "Japanese",
    "tier": 1,
    "focus": "both",
    "title": "Between Words · Both",
    "body": [
      "A single Japanese phrase keeps repeating in the dream, changing meaning every time someone says it. Luca knows the words, but somehow the tone is doing all the dangerous work.",
      "Somehow Luca ends up in the middle. Kirishima makes room for her without thinking; Bakugo complains about everyone taking up too much space while simultaneously shifting closer.",
      "The dream turns their bickering into background noise. Kirishima's arm rests behind Luca; Bakugo's leg is pressed against hers. Every time she notices one point of contact, another seems to appear.",
      "At some point Kirishima catches Luca smiling and smiles back. Bakugo notices both of them and mutters something about idiots, but his hand closes loosely around Luca's fingers under the edge of the blanket.",
      "The last phrase follows Luca out of sleep. She remembers the tone perfectly and, annoyingly, cannot remember the exact words."
    ]
  },
  {
    "id": "japanese-bakugo-t2",
    "realm": "Japanese",
    "tier": 2,
    "focus": "bakugo",
    "title": "Between Words · Bakugo II",
    "body": [
      "The dream has stripped language down to whispers. Luca understands every word and none of them, because what matters is how close the voice is when it reaches her.",
      "Bakugo's patience in the dream is different from his patience awake: thinner in words, deeper in action. He catches Luca by the waist when she shifts away and simply keeps her there, expression daring her to make something of it.",
      "The argument they were having dissolves because he is too close. His thumb brushes once along her side; when Luca looks up, his eyes drop to her mouth with absolutely no attempt to hide it.",
      "The kiss is brief and almost annoyed, as if he has finally lost an argument with himself. The second one is slower. The dream makes no effort to explain why Luca's hands end up gripping the front of his shirt.",
      "The last phrase follows Luca out of sleep. She remembers the tone perfectly and, annoyingly, cannot remember the exact words."
    ]
  },
  {
    "id": "japanese-kirishima-t2",
    "realm": "Japanese",
    "tier": 2,
    "focus": "kirishima",
    "title": "Between Words · Kirishima II",
    "body": [
      "The dream has stripped language down to whispers. Luca understands every word and none of them, because what matters is how close the voice is when it reaches her.",
      "Kirishima's closeness feels gentle right up until Luca realizes he is not moving back. One hand settles at her waist, careful but certain, and his smile turns smaller when her breath catches.",
      "\"Tell me if you want space,\" he murmurs. Luca does not. The answer seems to change the air between them more than any confession could have.",
      "When he kisses her, it is warm and unhurried. He pauses just far enough away to search her face, then smiles against her mouth when she closes the distance again.",
      "The last phrase follows Luca out of sleep. She remembers the tone perfectly and, annoyingly, cannot remember the exact words."
    ]
  },
  {
    "id": "japanese-both-t2",
    "realm": "Japanese",
    "tier": 2,
    "focus": "both",
    "title": "Between Words · Both II",
    "body": [
      "The dream has stripped language down to whispers. Luca understands every word and none of them, because what matters is how close the voice is when it reaches her.",
      "The dream is unfair enough to put Luca between them and then remove every reasonable escape route. Kirishima is warm at her back; Bakugo is close in front, eyes narrowed as if the situation is somehow her fault.",
      "Kirishima's hand settles at her hip. Bakugo watches the movement, then looks at Luca instead of telling him to move it. The silence becomes charged enough that Luca can hear her own heartbeat.",
      "Bakugo kisses her first, quick and challenging. Kirishima's forehead rests against her temple when she turns toward him, his smile almost disbelieving before he kisses her too. The dream blurs at the edges around the three of them.",
      "The last phrase follows Luca out of sleep. She remembers the tone perfectly and, annoyingly, cannot remember the exact words."
    ]
  },
  {
    "id": "health-bakugo-t1",
    "realm": "Health",
    "tier": 1,
    "focus": "bakugo",
    "title": "Close Enough to Notice · Bakugo",
    "body": [
      "The dream begins with something ordinary: tired shoulders, cold hands, the small evidence of a long day. Someone notices before Luca has decided whether she wants to be noticed.",
      "Bakugo is the one who breaks first. He reaches across the space between them and takes whatever Luca is holding straight out of her hands. \"Enough.\" The word is rough, but his fingers linger against hers long enough to ruin the effect.",
      "He acts as if the closeness is purely practical. A chair pulled nearer. A hand at her elbow. His knee pressed against hers because apparently there is nowhere else in the entire dream to put it.",
      "When Luca looks at him, he is already watching her. He clicks his tongue like she has caught him doing something embarrassing, but he does not move away.",
      "Luca wakes with her own pulse under her fingertips and the ghost of someone else's hand still imagined over it."
    ]
  },
  {
    "id": "health-kirishima-t1",
    "realm": "Health",
    "tier": 1,
    "focus": "kirishima",
    "title": "Close Enough to Notice · Kirishima",
    "body": [
      "The dream begins with something ordinary: tired shoulders, cold hands, the small evidence of a long day. Someone notices before Luca has decided whether she wants to be noticed.",
      "Kirishima asks first, even in a dream. \"You okay?\" His hand hovers near Luca's shoulder until she leans the last centimetre herself; then his whole face softens as if she has handed him something precious.",
      "He is warm in the impossible, exaggerated way dreams make warmth feel. Luca finds herself tucked against his side, his arm loose around her, his thumb making absent little movements where it rests.",
      "Kirishima laughs quietly when she points out how close they are. \"Yeah,\" he says, not embarrassed in the slightest. \"I noticed.\"",
      "Luca wakes with her own pulse under her fingertips and the ghost of someone else's hand still imagined over it."
    ]
  },
  {
    "id": "health-both-t1",
    "realm": "Health",
    "tier": 1,
    "focus": "both",
    "title": "Close Enough to Notice · Both",
    "body": [
      "The dream begins with something ordinary: tired shoulders, cold hands, the small evidence of a long day. Someone notices before Luca has decided whether she wants to be noticed.",
      "Somehow Luca ends up in the middle. Kirishima makes room for her without thinking; Bakugo complains about everyone taking up too much space while simultaneously shifting closer.",
      "The dream turns their bickering into background noise. Kirishima's arm rests behind Luca; Bakugo's leg is pressed against hers. Every time she notices one point of contact, another seems to appear.",
      "At some point Kirishima catches Luca smiling and smiles back. Bakugo notices both of them and mutters something about idiots, but his hand closes loosely around Luca's fingers under the edge of the blanket.",
      "Luca wakes with her own pulse under her fingertips and the ghost of someone else's hand still imagined over it."
    ]
  },
  {
    "id": "health-bakugo-t2",
    "realm": "Health",
    "tier": 2,
    "focus": "bakugo",
    "title": "Close Enough to Notice · Bakugo II",
    "body": [
      "There is no emergency and nothing to fix. That is what makes the attention feel so intimate: a hand at her wrist, a thumb over her pulse, someone close enough to feel her breathe.",
      "Bakugo's patience in the dream is different from his patience awake: thinner in words, deeper in action. He catches Luca by the waist when she shifts away and simply keeps her there, expression daring her to make something of it.",
      "The argument they were having dissolves because he is too close. His thumb brushes once along her side; when Luca looks up, his eyes drop to her mouth with absolutely no attempt to hide it.",
      "The kiss is brief and almost annoyed, as if he has finally lost an argument with himself. The second one is slower. The dream makes no effort to explain why Luca's hands end up gripping the front of his shirt.",
      "Luca wakes with her own pulse under her fingertips and the ghost of someone else's hand still imagined over it."
    ]
  },
  {
    "id": "health-kirishima-t2",
    "realm": "Health",
    "tier": 2,
    "focus": "kirishima",
    "title": "Close Enough to Notice · Kirishima II",
    "body": [
      "There is no emergency and nothing to fix. That is what makes the attention feel so intimate: a hand at her wrist, a thumb over her pulse, someone close enough to feel her breathe.",
      "Kirishima's closeness feels gentle right up until Luca realizes he is not moving back. One hand settles at her waist, careful but certain, and his smile turns smaller when her breath catches.",
      "\"Tell me if you want space,\" he murmurs. Luca does not. The answer seems to change the air between them more than any confession could have.",
      "When he kisses her, it is warm and unhurried. He pauses just far enough away to search her face, then smiles against her mouth when she closes the distance again.",
      "Luca wakes with her own pulse under her fingertips and the ghost of someone else's hand still imagined over it."
    ]
  },
  {
    "id": "health-both-t2",
    "realm": "Health",
    "tier": 2,
    "focus": "both",
    "title": "Close Enough to Notice · Both II",
    "body": [
      "There is no emergency and nothing to fix. That is what makes the attention feel so intimate: a hand at her wrist, a thumb over her pulse, someone close enough to feel her breathe.",
      "The dream is unfair enough to put Luca between them and then remove every reasonable escape route. Kirishima is warm at her back; Bakugo is close in front, eyes narrowed as if the situation is somehow her fault.",
      "Kirishima's hand settles at her hip. Bakugo watches the movement, then looks at Luca instead of telling him to move it. The silence becomes charged enough that Luca can hear her own heartbeat.",
      "Bakugo kisses her first, quick and challenging. Kirishima's forehead rests against her temple when she turns toward him, his smile almost disbelieving before he kisses her too. The dream blurs at the edges around the three of them.",
      "Luca wakes with her own pulse under her fingertips and the ghost of someone else's hand still imagined over it."
    ]
  },
  {
    "id": "recovery-bakugo-t1",
    "realm": "Recovery",
    "tier": 1,
    "focus": "bakugo",
    "title": "Soft Landing · Bakugo",
    "body": [
      "The couch is too small in the dream, although it has never been too small before. Blankets keep appearing, the room is warm, and Luca is much sleepier than she remembers being.",
      "Bakugo is the one who breaks first. He reaches across the space between them and takes whatever Luca is holding straight out of her hands. \"Enough.\" The word is rough, but his fingers linger against hers long enough to ruin the effect.",
      "He acts as if the closeness is purely practical. A chair pulled nearer. A hand at her elbow. His knee pressed against hers because apparently there is nowhere else in the entire dream to put it.",
      "When Luca looks at him, he is already watching her. He clicks his tongue like she has caught him doing something embarrassing, but he does not move away.",
      "The hardest part of waking is the sudden absence of weight beside her. For several seconds Luca lies still, bargaining uselessly with reality."
    ]
  },
  {
    "id": "recovery-kirishima-t1",
    "realm": "Recovery",
    "tier": 1,
    "focus": "kirishima",
    "title": "Soft Landing · Kirishima",
    "body": [
      "The couch is too small in the dream, although it has never been too small before. Blankets keep appearing, the room is warm, and Luca is much sleepier than she remembers being.",
      "Kirishima asks first, even in a dream. \"You okay?\" His hand hovers near Luca's shoulder until she leans the last centimetre herself; then his whole face softens as if she has handed him something precious.",
      "He is warm in the impossible, exaggerated way dreams make warmth feel. Luca finds herself tucked against his side, his arm loose around her, his thumb making absent little movements where it rests.",
      "Kirishima laughs quietly when she points out how close they are. \"Yeah,\" he says, not embarrassed in the slightest. \"I noticed.\"",
      "The hardest part of waking is the sudden absence of weight beside her. For several seconds Luca lies still, bargaining uselessly with reality."
    ]
  },
  {
    "id": "recovery-both-t1",
    "realm": "Recovery",
    "tier": 1,
    "focus": "both",
    "title": "Soft Landing · Both",
    "body": [
      "The couch is too small in the dream, although it has never been too small before. Blankets keep appearing, the room is warm, and Luca is much sleepier than she remembers being.",
      "Somehow Luca ends up in the middle. Kirishima makes room for her without thinking; Bakugo complains about everyone taking up too much space while simultaneously shifting closer.",
      "The dream turns their bickering into background noise. Kirishima's arm rests behind Luca; Bakugo's leg is pressed against hers. Every time she notices one point of contact, another seems to appear.",
      "At some point Kirishima catches Luca smiling and smiles back. Bakugo notices both of them and mutters something about idiots, but his hand closes loosely around Luca's fingers under the edge of the blanket.",
      "The hardest part of waking is the sudden absence of weight beside her. For several seconds Luca lies still, bargaining uselessly with reality."
    ]
  },
  {
    "id": "recovery-bakugo-t2",
    "realm": "Recovery",
    "tier": 2,
    "focus": "bakugo",
    "title": "Soft Landing · Bakugo II",
    "body": [
      "The dream has already decided that nobody is getting up. Rain taps softly against the windows; the apartment feels sealed away from the rest of the world.",
      "Bakugo's patience in the dream is different from his patience awake: thinner in words, deeper in action. He catches Luca by the waist when she shifts away and simply keeps her there, expression daring her to make something of it.",
      "The argument they were having dissolves because he is too close. His thumb brushes once along her side; when Luca looks up, his eyes drop to her mouth with absolutely no attempt to hide it.",
      "The kiss is brief and almost annoyed, as if he has finally lost an argument with himself. The second one is slower. The dream makes no effort to explain why Luca's hands end up gripping the front of his shirt.",
      "The hardest part of waking is the sudden absence of weight beside her. For several seconds Luca lies still, bargaining uselessly with reality."
    ]
  },
  {
    "id": "recovery-kirishima-t2",
    "realm": "Recovery",
    "tier": 2,
    "focus": "kirishima",
    "title": "Soft Landing · Kirishima II",
    "body": [
      "The dream has already decided that nobody is getting up. Rain taps softly against the windows; the apartment feels sealed away from the rest of the world.",
      "Kirishima's closeness feels gentle right up until Luca realizes he is not moving back. One hand settles at her waist, careful but certain, and his smile turns smaller when her breath catches.",
      "\"Tell me if you want space,\" he murmurs. Luca does not. The answer seems to change the air between them more than any confession could have.",
      "When he kisses her, it is warm and unhurried. He pauses just far enough away to search her face, then smiles against her mouth when she closes the distance again.",
      "The hardest part of waking is the sudden absence of weight beside her. For several seconds Luca lies still, bargaining uselessly with reality."
    ]
  },
  {
    "id": "recovery-both-t2",
    "realm": "Recovery",
    "tier": 2,
    "focus": "both",
    "title": "Soft Landing · Both II",
    "body": [
      "The dream has already decided that nobody is getting up. Rain taps softly against the windows; the apartment feels sealed away from the rest of the world.",
      "The dream is unfair enough to put Luca between them and then remove every reasonable escape route. Kirishima is warm at her back; Bakugo is close in front, eyes narrowed as if the situation is somehow her fault.",
      "Kirishima's hand settles at her hip. Bakugo watches the movement, then looks at Luca instead of telling him to move it. The silence becomes charged enough that Luca can hear her own heartbeat.",
      "Bakugo kisses her first, quick and challenging. Kirishima's forehead rests against her temple when she turns toward him, his smile almost disbelieving before he kisses her too. The dream blurs at the edges around the three of them.",
      "The hardest part of waking is the sudden absence of weight beside her. For several seconds Luca lies still, bargaining uselessly with reality."
    ]
  },
  {
    "id": "home-bakugo-t1",
    "realm": "Home",
    "tier": 1,
    "focus": "bakugo",
    "title": "Domestic Gravity · Bakugo",
    "body": [
      "Nothing dramatic happens. That is the problem. Morning light, a kettle, bare feet on the kitchen floor — the kind of ordinary scene that becomes far too intimate when it belongs to the same home.",
      "Bakugo is the one who breaks first. He reaches across the space between them and takes whatever Luca is holding straight out of her hands. \"Enough.\" The word is rough, but his fingers linger against hers long enough to ruin the effect.",
      "He acts as if the closeness is purely practical. A chair pulled nearer. A hand at her elbow. His knee pressed against hers because apparently there is nowhere else in the entire dream to put it.",
      "When Luca looks at him, he is already watching her. He clicks his tongue like she has caught him doing something embarrassing, but he does not move away.",
      "Morning reality is almost identical to the dream for one disorienting second — same apartment, same quiet — until Luca remembers which parts definitely did not happen."
    ]
  },
  {
    "id": "home-kirishima-t1",
    "realm": "Home",
    "tier": 1,
    "focus": "kirishima",
    "title": "Domestic Gravity · Kirishima",
    "body": [
      "Nothing dramatic happens. That is the problem. Morning light, a kettle, bare feet on the kitchen floor — the kind of ordinary scene that becomes far too intimate when it belongs to the same home.",
      "Kirishima asks first, even in a dream. \"You okay?\" His hand hovers near Luca's shoulder until she leans the last centimetre herself; then his whole face softens as if she has handed him something precious.",
      "He is warm in the impossible, exaggerated way dreams make warmth feel. Luca finds herself tucked against his side, his arm loose around her, his thumb making absent little movements where it rests.",
      "Kirishima laughs quietly when she points out how close they are. \"Yeah,\" he says, not embarrassed in the slightest. \"I noticed.\"",
      "Morning reality is almost identical to the dream for one disorienting second — same apartment, same quiet — until Luca remembers which parts definitely did not happen."
    ]
  },
  {
    "id": "home-both-t1",
    "realm": "Home",
    "tier": 1,
    "focus": "both",
    "title": "Domestic Gravity · Both",
    "body": [
      "Nothing dramatic happens. That is the problem. Morning light, a kettle, bare feet on the kitchen floor — the kind of ordinary scene that becomes far too intimate when it belongs to the same home.",
      "Somehow Luca ends up in the middle. Kirishima makes room for her without thinking; Bakugo complains about everyone taking up too much space while simultaneously shifting closer.",
      "The dream turns their bickering into background noise. Kirishima's arm rests behind Luca; Bakugo's leg is pressed against hers. Every time she notices one point of contact, another seems to appear.",
      "At some point Kirishima catches Luca smiling and smiles back. Bakugo notices both of them and mutters something about idiots, but his hand closes loosely around Luca's fingers under the edge of the blanket.",
      "Morning reality is almost identical to the dream for one disorienting second — same apartment, same quiet — until Luca remembers which parts definitely did not happen."
    ]
  },
  {
    "id": "home-bakugo-t2",
    "realm": "Home",
    "tier": 2,
    "focus": "bakugo",
    "title": "Domestic Gravity · Bakugo II",
    "body": [
      "The dream starts in the middle of a night-time kitchen visit. Nobody is fully awake. Familiarity has softened every boundary until Luca cannot remember which ones were supposed to be there.",
      "Bakugo's patience in the dream is different from his patience awake: thinner in words, deeper in action. He catches Luca by the waist when she shifts away and simply keeps her there, expression daring her to make something of it.",
      "The argument they were having dissolves because he is too close. His thumb brushes once along her side; when Luca looks up, his eyes drop to her mouth with absolutely no attempt to hide it.",
      "The kiss is brief and almost annoyed, as if he has finally lost an argument with himself. The second one is slower. The dream makes no effort to explain why Luca's hands end up gripping the front of his shirt.",
      "Morning reality is almost identical to the dream for one disorienting second — same apartment, same quiet — until Luca remembers which parts definitely did not happen."
    ]
  },
  {
    "id": "home-kirishima-t2",
    "realm": "Home",
    "tier": 2,
    "focus": "kirishima",
    "title": "Domestic Gravity · Kirishima II",
    "body": [
      "The dream starts in the middle of a night-time kitchen visit. Nobody is fully awake. Familiarity has softened every boundary until Luca cannot remember which ones were supposed to be there.",
      "Kirishima's closeness feels gentle right up until Luca realizes he is not moving back. One hand settles at her waist, careful but certain, and his smile turns smaller when her breath catches.",
      "\"Tell me if you want space,\" he murmurs. Luca does not. The answer seems to change the air between them more than any confession could have.",
      "When he kisses her, it is warm and unhurried. He pauses just far enough away to search her face, then smiles against her mouth when she closes the distance again.",
      "Morning reality is almost identical to the dream for one disorienting second — same apartment, same quiet — until Luca remembers which parts definitely did not happen."
    ]
  },
  {
    "id": "home-both-t2",
    "realm": "Home",
    "tier": 2,
    "focus": "both",
    "title": "Domestic Gravity · Both II",
    "body": [
      "The dream starts in the middle of a night-time kitchen visit. Nobody is fully awake. Familiarity has softened every boundary until Luca cannot remember which ones were supposed to be there.",
      "The dream is unfair enough to put Luca between them and then remove every reasonable escape route. Kirishima is warm at her back; Bakugo is close in front, eyes narrowed as if the situation is somehow her fault.",
      "Kirishima's hand settles at her hip. Bakugo watches the movement, then looks at Luca instead of telling him to move it. The silence becomes charged enough that Luca can hear her own heartbeat.",
      "Bakugo kisses her first, quick and challenging. Kirishima's forehead rests against her temple when she turns toward him, his smile almost disbelieving before he kisses her too. The dream blurs at the edges around the three of them.",
      "Morning reality is almost identical to the dream for one disorienting second — same apartment, same quiet — until Luca remembers which parts definitely did not happen."
    ]
  },
  {
    "id": "hobbies-bakugo-t1",
    "realm": "Hobbies",
    "tier": 1,
    "focus": "bakugo",
    "title": "Play After Dark · Bakugo",
    "body": [
      "The dream begins as a game. It might be a controller, cards, an arcade machine or music turned too loud; the rules keep changing whenever Luca starts to win.",
      "Bakugo is the one who breaks first. He reaches across the space between them and takes whatever Luca is holding straight out of her hands. \"Enough.\" The word is rough, but his fingers linger against hers long enough to ruin the effect.",
      "He acts as if the closeness is purely practical. A chair pulled nearer. A hand at her elbow. His knee pressed against hers because apparently there is nowhere else in the entire dream to put it.",
      "When Luca looks at him, he is already watching her. He clicks his tongue like she has caught him doing something embarrassing, but he does not move away.",
      "The dream ends on laughter and too much eye contact. Luca wakes before she can decide whether she is relieved or furious about the interruption."
    ]
  },
  {
    "id": "hobbies-kirishima-t1",
    "realm": "Hobbies",
    "tier": 1,
    "focus": "kirishima",
    "title": "Play After Dark · Kirishima",
    "body": [
      "The dream begins as a game. It might be a controller, cards, an arcade machine or music turned too loud; the rules keep changing whenever Luca starts to win.",
      "Kirishima asks first, even in a dream. \"You okay?\" His hand hovers near Luca's shoulder until she leans the last centimetre herself; then his whole face softens as if she has handed him something precious.",
      "He is warm in the impossible, exaggerated way dreams make warmth feel. Luca finds herself tucked against his side, his arm loose around her, his thumb making absent little movements where it rests.",
      "Kirishima laughs quietly when she points out how close they are. \"Yeah,\" he says, not embarrassed in the slightest. \"I noticed.\"",
      "The dream ends on laughter and too much eye contact. Luca wakes before she can decide whether she is relieved or furious about the interruption."
    ]
  },
  {
    "id": "hobbies-both-t1",
    "realm": "Hobbies",
    "tier": 1,
    "focus": "both",
    "title": "Play After Dark · Both",
    "body": [
      "The dream begins as a game. It might be a controller, cards, an arcade machine or music turned too loud; the rules keep changing whenever Luca starts to win.",
      "Somehow Luca ends up in the middle. Kirishima makes room for her without thinking; Bakugo complains about everyone taking up too much space while simultaneously shifting closer.",
      "The dream turns their bickering into background noise. Kirishima's arm rests behind Luca; Bakugo's leg is pressed against hers. Every time she notices one point of contact, another seems to appear.",
      "At some point Kirishima catches Luca smiling and smiles back. Bakugo notices both of them and mutters something about idiots, but his hand closes loosely around Luca's fingers under the edge of the blanket.",
      "The dream ends on laughter and too much eye contact. Luca wakes before she can decide whether she is relieved or furious about the interruption."
    ]
  },
  {
    "id": "hobbies-bakugo-t2",
    "realm": "Hobbies",
    "tier": 2,
    "focus": "bakugo",
    "title": "Play After Dark · Bakugo II",
    "body": [
      "Whatever they were doing for fun has become an excuse not to leave. The room is full of late-night energy, teasing, and the strange suspension that comes just before someone does something irreversible.",
      "Bakugo's patience in the dream is different from his patience awake: thinner in words, deeper in action. He catches Luca by the waist when she shifts away and simply keeps her there, expression daring her to make something of it.",
      "The argument they were having dissolves because he is too close. His thumb brushes once along her side; when Luca looks up, his eyes drop to her mouth with absolutely no attempt to hide it.",
      "The kiss is brief and almost annoyed, as if he has finally lost an argument with himself. The second one is slower. The dream makes no effort to explain why Luca's hands end up gripping the front of his shirt.",
      "The dream ends on laughter and too much eye contact. Luca wakes before she can decide whether she is relieved or furious about the interruption."
    ]
  },
  {
    "id": "hobbies-kirishima-t2",
    "realm": "Hobbies",
    "tier": 2,
    "focus": "kirishima",
    "title": "Play After Dark · Kirishima II",
    "body": [
      "Whatever they were doing for fun has become an excuse not to leave. The room is full of late-night energy, teasing, and the strange suspension that comes just before someone does something irreversible.",
      "Kirishima's closeness feels gentle right up until Luca realizes he is not moving back. One hand settles at her waist, careful but certain, and his smile turns smaller when her breath catches.",
      "\"Tell me if you want space,\" he murmurs. Luca does not. The answer seems to change the air between them more than any confession could have.",
      "When he kisses her, it is warm and unhurried. He pauses just far enough away to search her face, then smiles against her mouth when she closes the distance again.",
      "The dream ends on laughter and too much eye contact. Luca wakes before she can decide whether she is relieved or furious about the interruption."
    ]
  },
  {
    "id": "hobbies-both-t2",
    "realm": "Hobbies",
    "tier": 2,
    "focus": "both",
    "title": "Play After Dark · Both II",
    "body": [
      "Whatever they were doing for fun has become an excuse not to leave. The room is full of late-night energy, teasing, and the strange suspension that comes just before someone does something irreversible.",
      "The dream is unfair enough to put Luca between them and then remove every reasonable escape route. Kirishima is warm at her back; Bakugo is close in front, eyes narrowed as if the situation is somehow her fault.",
      "Kirishima's hand settles at her hip. Bakugo watches the movement, then looks at Luca instead of telling him to move it. The silence becomes charged enough that Luca can hear her own heartbeat.",
      "Bakugo kisses her first, quick and challenging. Kirishima's forehead rests against her temple when she turns toward him, his smile almost disbelieving before he kisses her too. The dream blurs at the edges around the three of them.",
      "The dream ends on laughter and too much eye contact. Luca wakes before she can decide whether she is relieved or furious about the interruption."
    ]
  }
];

  const EXPANDED_DREAMS = [
  {
    "id": "work-bakugo-t1-x1",
    "realm": "Work",
    "tier": 1,
    "focus": "bakugo",
    "title": "After Hours · Last Train · Bakugo",
    "body": [
      "In the dream, I am still at a desk long after the building should be empty. My bag is packed, the last train is becoming a real concern, and I am pretending one more line of work will make the day feel finished.",
      "Bakugo appears in the doorway with two canned coffees and the expression of someone who has already decided my plan is stupid. He sets the sweeter one beside my hand without asking.",
      "“Pack it.” He taps the edge of the desk. When I tell him I need five minutes, he sits on the corner of it and says, “Then I’m counting.”",
      "The fifth minute ends with his fingers closing around my wrist before I can reach for another page. It is not forceful. It is worse: patient, warm, and completely certain I am coming with him.",
      "I wake with the absurd certainty that somebody had been waiting for me to stop working, not for me to finish."
    ]
  },
  {
    "id": "work-kirishima-t1-x1",
    "realm": "Work",
    "tier": 1,
    "focus": "kirishima",
    "title": "After Hours · Last Train · Kirishima",
    "body": [
      "In the dream, I am still at a desk long after the building should be empty. My bag is packed, the last train is becoming a real concern, and I am pretending one more line of work will make the day feel finished.",
      "Kirishima leans into the doorway and asks whether I am actually leaving or just moving papers into different piles. The accuracy is offensive.",
      "He gathers the books I have already finished with and stacks them neatly while I complain. “You don’t have to help.” “I know.” He smiles like that is the point.",
      "At the elevator, he takes my bag before I can object. Our shoulders bump as the doors close, and neither of us bothers to correct the distance.",
      "I wake with the absurd certainty that somebody had been waiting for me to stop working, not for me to finish."
    ]
  },
  {
    "id": "work-both-t1-x1",
    "realm": "Work",
    "tier": 1,
    "focus": "both",
    "title": "After Hours · Last Train · Both",
    "body": [
      "In the dream, I am still at a desk long after the building should be empty. My bag is packed, the last train is becoming a real concern, and I am pretending one more line of work will make the day feel finished.",
      "Kirishima arrives first with snacks. Bakugo arrives two minutes later, calls both of us idiots, and somehow still has my coat over one arm.",
      "They bracket the desk while I try to defend the concept of finishing one last thing. Kirishima negotiates. Bakugo simply shuts my laptop. The betrayal is coordinated enough to be suspicious.",
      "On the walk out, I end up between them. Kirishima is laughing at something I said; Bakugo is grumbling about the train schedule while keeping pace exactly with mine.",
      "I wake with the absurd certainty that somebody had been waiting for me to stop working, not for me to finish."
    ]
  },
  {
    "id": "work-bakugo-t2-x1",
    "realm": "Work",
    "tier": 2,
    "focus": "bakugo",
    "title": "After Hours · Lights Out · Bakugo",
    "body": [
      "The dream gives me an empty staff room, rain against the windows, and a power-saving system that turns half the lights off while I am still pretending to work.",
      "Bakugo crosses the darkened room without hesitation and stops close enough that the desk presses into the backs of my thighs. “You done running yourself into the ground?”",
      "I tell him that is dramatic. His hand settles at my waist as if he needs somewhere to put it while he argues. “You’re dramatic.” His eyes drop to my mouth and stay there.",
      "The kiss is slow only after the first one proves neither of us is backing away. When the motion sensor lights flicker back on, he swears under his breath and kisses me again anyway.",
      "I wake before the lights come back on, with my pulse far too awake for the hour."
    ]
  },
  {
    "id": "work-kirishima-t2-x1",
    "realm": "Work",
    "tier": 2,
    "focus": "kirishima",
    "title": "After Hours · Lights Out · Kirishima",
    "body": [
      "The dream gives me an empty staff room, rain against the windows, and a power-saving system that turns half the lights off while I am still pretending to work.",
      "Kirishima finds me by the light of my laptop and laughs softly. “This feels like the opening of a very specific kind of bad decision.”",
      "He braces one hand on the desk beside me and asks if I want him to move. I should. Instead I catch the front of his shirt and watch the answer register across his face.",
      "His kiss is warm and careful until I lean into it. Then his other hand finds my waist, and the dark staff room stops feeling empty at all.",
      "I wake before the lights come back on, with my pulse far too awake for the hour."
    ]
  },
  {
    "id": "work-both-t2-x1",
    "realm": "Work",
    "tier": 2,
    "focus": "both",
    "title": "After Hours · Lights Out · Both",
    "body": [
      "The dream gives me an empty staff room, rain against the windows, and a power-saving system that turns half the lights off while I am still pretending to work.",
      "The lights go out with all three of us still in the room. Kirishima laughs. Bakugo mutters something vicious about public buildings. I can barely make out either of them.",
      "A hand finds mine—Kirishima’s, from the warmth and the careful squeeze. Bakugo is closer on my other side, close enough that I feel his breath when he says my name.",
      "The dark makes everything easier and more impossible. Kirishima kisses my temple; Bakugo catches my mouth when I turn. For one suspended moment, nobody treats the arrangement like a mistake.",
      "I wake before the lights come back on, with my pulse far too awake for the hour."
    ]
  },
  {
    "id": "knowledge-bakugo-t1-x1",
    "realm": "Knowledge",
    "tier": 1,
    "focus": "bakugo",
    "title": "Quiet Minds · One More Clue · Bakugo",
    "body": [
      "The dream puts us in a tiny puzzle café with rain fogging the windows and a logic problem spread across the table between half-finished drinks.",
      "Bakugo solves one of the constraints before I do and looks unbearable about it. “Don’t gloat.” “Wasn’t.” He absolutely was.",
      "We argue over the next deduction until both of us reach for the same pencil. His fingers stay over mine for a beat too long, smugness disappearing into something quieter.",
      "He lets go of the pencil but not my gaze. “You had it,” he says, voice lower now. The compliment lands harder than it has any right to.",
      "I wake still wanting the answer, though I am no longer sure I mean the puzzle."
    ]
  },
  {
    "id": "knowledge-kirishima-t1-x1",
    "realm": "Knowledge",
    "tier": 1,
    "focus": "kirishima",
    "title": "Quiet Minds · One More Clue · Kirishima",
    "body": [
      "The dream puts us in a tiny puzzle café with rain fogging the windows and a logic problem spread across the table between half-finished drinks.",
      "Kirishima does not pretend to be better at the puzzle than he is. He asks good questions instead, and every time I explain something his attention stays completely on me.",
      "“Wait, say that part again.” I do. He gets it this time and lights up like the deduction belongs to both of us.",
      "When we finally fill the last square, he throws an arm around my shoulders on instinct. Neither of us moves when the celebration should logically be over.",
      "I wake still wanting the answer, though I am no longer sure I mean the puzzle."
    ]
  },
  {
    "id": "knowledge-both-t1-x1",
    "realm": "Knowledge",
    "tier": 1,
    "focus": "both",
    "title": "Quiet Minds · One More Clue · Both",
    "body": [
      "The dream puts us in a tiny puzzle café with rain fogging the windows and a logic problem spread across the table between half-finished drinks.",
      "Bakugo wants to solve the puzzle properly. Kirishima wants to test every ridiculous possibility. I am caught in the middle as appointed judge.",
      "The three of us lean over the same small table until personal space becomes theoretical. Every explanation starts with someone pointing at the page and ends with shoulders pressed together.",
      "We solve it at exactly the same time. Kirishima cheers. Bakugo says he knew two minutes ago. Under the table, his knee stays against mine while Kirishima’s arm remains around my chair.",
      "I wake still wanting the answer, though I am no longer sure I mean the puzzle."
    ]
  },
  {
    "id": "knowledge-bakugo-t2-x1",
    "realm": "Knowledge",
    "tier": 2,
    "focus": "bakugo",
    "title": "Quiet Minds · Too Close to Think · Bakugo",
    "body": [
      "In the dream, a library alcove has exactly one lamp, exactly one open book, and nowhere near enough space for the number of people occupying it.",
      "Bakugo leans over my shoulder to read the same paragraph instead of taking the empty chair across from me. I can feel the heat of him along my back.",
      "“You’re on the wrong line,” he murmurs. His finger traces the page. Mine is still there, trapped under his hand. I stop understanding written language entirely.",
      "When I turn to tell him to move, there is nowhere for my face to go. He looks at my mouth, then at me, and closes the remaining distance like solving the obvious final step.",
      "I wake without remembering a single sentence from the book."
    ]
  },
  {
    "id": "knowledge-kirishima-t2-x1",
    "realm": "Knowledge",
    "tier": 2,
    "focus": "kirishima",
    "title": "Quiet Minds · Too Close to Think · Kirishima",
    "body": [
      "In the dream, a library alcove has exactly one lamp, exactly one open book, and nowhere near enough space for the number of people occupying it.",
      "Kirishima squeezes into the alcove beside me with an apologetic grin. “I can go.” “You could.” Neither of us moves.",
      "We read from the same page until his hand settles behind me on the seat, not touching, just surrounding. I become painfully aware of every breath.",
      "He asks what I am thinking about. I look at the book, then at him. His smile turns soft and knowing before he kisses me, slow enough to make the answer unnecessary.",
      "I wake without remembering a single sentence from the book."
    ]
  },
  {
    "id": "knowledge-both-t2-x1",
    "realm": "Knowledge",
    "tier": 2,
    "focus": "both",
    "title": "Quiet Minds · Too Close to Think · Both",
    "body": [
      "In the dream, a library alcove has exactly one lamp, exactly one open book, and nowhere near enough space for the number of people occupying it.",
      "There is technically enough seating for three. The dream simply refuses to arrange it sensibly. I end up between them on a narrow bench.",
      "Kirishima reads over my shoulder from one side. Bakugo makes a correction from the other. Their voices are low enough that the words blur into warmth and proximity.",
      "I turn toward Kirishima first and find his face close. Bakugo’s hand settles on my knee as if to anchor me. By the time anyone remembers the book, nobody is pretending to read.",
      "I wake without remembering a single sentence from the book."
    ]
  },
  {
    "id": "japanese-bakugo-t1-x1",
    "realm": "Japanese",
    "tier": 1,
    "focus": "bakugo",
    "title": "Between Words · Say It Again · Bakugo",
    "body": [
      "The dream catches on one ordinary Japanese phrase and refuses to let it stay ordinary. I know exactly what it means. The problem is how they keep saying it.",
      "Bakugo says the phrase once from across the room and again when he is standing beside me. The second version is quieter, stripped of all the irritation he usually uses as camouflage.",
      "I repeat it back with deliberately exaggerated politeness. His mouth twitches. “That’s not how I said it.” “No?” “No.”",
      "He leans closer and says it a third time, right beside my ear, as if proximity is a grammar point he intends to teach personally.",
      "I wake translating the tone instead of the words."
    ]
  },
  {
    "id": "japanese-kirishima-t1-x1",
    "realm": "Japanese",
    "tier": 1,
    "focus": "kirishima",
    "title": "Between Words · Say It Again · Kirishima",
    "body": [
      "The dream catches on one ordinary Japanese phrase and refuses to let it stay ordinary. I know exactly what it means. The problem is how they keep saying it.",
      "Kirishima uses the phrase casually, then notices the way I look at him. “What?” “Nothing. Your tone changed.”",
      "He tries it again, more careful this time, and somehow makes it worse. Warmer. More personal. His eyebrows lift when my face gives me away.",
      "“Oh,” he says, finally hearing himself. Then he laughs, blushes, and repeats it one more time anyway.",
      "I wake translating the tone instead of the words."
    ]
  },
  {
    "id": "japanese-both-t1-x1",
    "realm": "Japanese",
    "tier": 1,
    "focus": "both",
    "title": "Between Words · Say It Again · Both",
    "body": [
      "The dream catches on one ordinary Japanese phrase and refuses to let it stay ordinary. I know exactly what it means. The problem is how they keep saying it.",
      "They say the same phrase in completely different ways. Kirishima makes it sound warm. Bakugo makes it sound like an argument he expects me to understand.",
      "I point this out. They both object at once, which proves nothing except that the dream enjoys me suffering.",
      "When they repeat it again—one from each side—the literal translation becomes useless. Whatever it means now exists entirely in the space between the three of us.",
      "I wake translating the tone instead of the words."
    ]
  },
  {
    "id": "japanese-bakugo-t2-x1",
    "realm": "Japanese",
    "tier": 2,
    "focus": "bakugo",
    "title": "Between Words · No Translation Needed · Bakugo",
    "body": [
      "The dream gives me a phrase I understand perfectly and still cannot translate without admitting what it sounds like in this context.",
      "Bakugo says it while looking directly at me, then has the nerve to ask why I went quiet. “You know what that sounds like.” “Yeah.”",
      "The answer knocks the air out of me more effectively than denial would have. His hand slides to the back of my neck, thumb resting just below my ear.",
      "He repeats the phrase against my mouth before kissing me, as if the language was only ever an excuse to make sure I understood.",
      "I wake with the sentence intact and no safe translation for it."
    ]
  },
  {
    "id": "japanese-kirishima-t2-x1",
    "realm": "Japanese",
    "tier": 2,
    "focus": "kirishima",
    "title": "Between Words · No Translation Needed · Kirishima",
    "body": [
      "The dream gives me a phrase I understand perfectly and still cannot translate without admitting what it sounds like in this context.",
      "Kirishima says it softly and then freezes, apparently realizing one second too late what the sentence can imply. “I mean—”",
      "I ask whether he wants to take it back. He looks at me for a long moment and shakes his head. “No. I just want to say it right.”",
      "The second attempt is quieter. So is the kiss that follows it. This time there is nothing left to translate.",
      "I wake with the sentence intact and no safe translation for it."
    ]
  },
  {
    "id": "japanese-both-t2-x1",
    "realm": "Japanese",
    "tier": 2,
    "focus": "both",
    "title": "Between Words · No Translation Needed · Both",
    "body": [
      "The dream gives me a phrase I understand perfectly and still cannot translate without admitting what it sounds like in this context.",
      "Kirishima says the phrase first. Bakugo goes still. I understand the words; Bakugo understands the implication; Kirishima understands both of our faces.",
      "“Well,” Kirishima says, red to the ears. Bakugo tells him to stop talking, which would work better if his hand were not already at my waist.",
      "The dream resolves the linguistic problem by removing language entirely. One kiss becomes two, and the phrase hangs in the air after nobody is speaking.",
      "I wake with the sentence intact and no safe translation for it."
    ]
  },
  {
    "id": "health-bakugo-t1-x1",
    "realm": "Health",
    "tier": 1,
    "focus": "bakugo",
    "title": "Close Enough to Notice · Cool Down · Bakugo",
    "body": [
      "The dream begins after movement: warm skin, tired muscles, cold water bottles, and the strange clarity that comes when my body has been doing something instead of being evaluated.",
      "Bakugo catches me rolling one shoulder and immediately asks what hurts. “Nothing.” He gives me a look that makes the lie feel childish.",
      "He steps behind me and presses two fingers lightly beside the tense muscle. “Here?” I inhale too sharply. His hand stills.",
      "The touch becomes gentler, not less certain. “Tell me if it’s too much.” The fact that he asks at all is what makes me lean back into his hand.",
      "I wake remembering the feeling of being noticed without being inspected."
    ]
  },
  {
    "id": "health-kirishima-t1-x1",
    "realm": "Health",
    "tier": 1,
    "focus": "kirishima",
    "title": "Close Enough to Notice · Cool Down · Kirishima",
    "body": [
      "The dream begins after movement: warm skin, tired muscles, cold water bottles, and the strange clarity that comes when my body has been doing something instead of being evaluated.",
      "Kirishima offers me his water without thinking, then realizes I already have one and laughs at himself. “Habit.”",
      "He notices the way I stretch my wrist and asks before taking my hand. His thumb works a slow circle into the tight spot while he keeps talking about something completely ordinary.",
      "It should make the touch less intimate. It does not. I catch him looking at my face to make sure I am okay, and the care lands warm and uncomplicated.",
      "I wake remembering the feeling of being noticed without being inspected."
    ]
  },
  {
    "id": "health-both-t1-x1",
    "realm": "Health",
    "tier": 1,
    "focus": "both",
    "title": "Close Enough to Notice · Cool Down · Both",
    "body": [
      "The dream begins after movement: warm skin, tired muscles, cold water bottles, and the strange clarity that comes when my body has been doing something instead of being evaluated.",
      "We are all cooling down in the same room, sprawled across whatever surfaces the dream provides. Kirishima is talking. Bakugo is pretending not to listen.",
      "I flex a sore hand. Kirishima notices first; Bakugo is the one who reaches for it. The coordination happens without discussion and makes all three of us pause.",
      "Kirishima’s shoulder presses against mine while Bakugo checks my palm. Nobody makes a joke. The quiet attention feels more intimate than one would have.",
      "I wake remembering the feeling of being noticed without being inspected."
    ]
  },
  {
    "id": "health-bakugo-t2-x1",
    "realm": "Health",
    "tier": 2,
    "focus": "bakugo",
    "title": "Close Enough to Notice · Heartbeat · Bakugo",
    "body": [
      "The dream has reduced the world to warmth, breathing and the undeniable fact that I can feel my own pulse everywhere someone touches me.",
      "Bakugo has one hand at my waist and the other around my wrist, thumb resting directly over my pulse. He notices the speed of it before I can hide anything.",
      "“That from the workout?” he asks. The smirk says he already knows the answer. I tell him he is insufferable. He steps closer.",
      "“Still fast.” His thumb presses once against my pulse before he kisses me. The measurement becomes completely useless after that.",
      "I wake with my hand over my own heartbeat, annoyed that it still feels borrowed."
    ]
  },
  {
    "id": "health-kirishima-t2-x1",
    "realm": "Health",
    "tier": 2,
    "focus": "kirishima",
    "title": "Close Enough to Notice · Heartbeat · Kirishima",
    "body": [
      "The dream has reduced the world to warmth, breathing and the undeniable fact that I can feel my own pulse everywhere someone touches me.",
      "Kirishima’s palm rests flat against my upper back while I catch my breath. His own breathing is not much steadier, which helps until I notice how close we are.",
      "“You okay?” he asks. I nod. He does not move his hand. I do not ask him to.",
      "When he kisses me, I feel his smile first. My pulse jumps hard enough that he laughs softly against my mouth, delighted and a little wrecked.",
      "I wake with my hand over my own heartbeat, annoyed that it still feels borrowed."
    ]
  },
  {
    "id": "health-both-t2-x1",
    "realm": "Health",
    "tier": 2,
    "focus": "both",
    "title": "Close Enough to Notice · Heartbeat · Both",
    "body": [
      "The dream has reduced the world to warmth, breathing and the undeniable fact that I can feel my own pulse everywhere someone touches me.",
      "I end up sitting between them after whatever impossible dream exercise we were doing. My pulse is already high before either of them touches me.",
      "Kirishima’s hand settles between my shoulder blades. Bakugo takes my wrist with a muttered complaint about checking whether I am overdoing it. They both notice the reaction.",
      "The look they exchange is brief and devastating. Kirishima leans in at my shoulder; Bakugo lifts my hand and kisses the inside of my wrist like the dream has abandoned subtlety entirely.",
      "I wake with my hand over my own heartbeat, annoyed that it still feels borrowed."
    ]
  },
  {
    "id": "recovery-bakugo-t1-x1",
    "realm": "Recovery",
    "tier": 1,
    "focus": "bakugo",
    "title": "Soft Landing · Rain Against Glass · Bakugo",
    "body": [
      "Rain turns the apartment windows grey and soft. In the dream, nothing is urgent enough to justify leaving the couch.",
      "Bakugo drops a blanket over my legs with the aggression of somebody refusing to admit this is caretaking. “You looked cold.”",
      "I tell him I was fine. He sits at the other end of the couch and says, “Didn’t ask.” Ten minutes later my feet are tucked under his thigh for warmth.",
      "Neither of us acknowledges how it happened. When I drift sideways, my head finds his shoulder and he only adjusts the blanket higher.",
      "I wake to a quiet room and miss the impossible permission to stay still."
    ]
  },
  {
    "id": "recovery-kirishima-t1-x1",
    "realm": "Recovery",
    "tier": 1,
    "focus": "kirishima",
    "title": "Soft Landing · Rain Against Glass · Kirishima",
    "body": [
      "Rain turns the apartment windows grey and soft. In the dream, nothing is urgent enough to justify leaving the couch.",
      "Kirishima asks whether I want a movie or quiet. I choose quiet. He nods like that is a complete activity.",
      "We end up under the same blanket because the dream has opinions about personal space. His arm rests along the back of the couch until I lean into it.",
      "“Comfy?” he whispers. I nod against his shoulder. His cheek settles briefly against my hair, and the rain keeps talking for us.",
      "I wake to a quiet room and miss the impossible permission to stay still."
    ]
  },
  {
    "id": "recovery-both-t1-x1",
    "realm": "Recovery",
    "tier": 1,
    "focus": "both",
    "title": "Soft Landing · Rain Against Glass · Both",
    "body": [
      "Rain turns the apartment windows grey and soft. In the dream, nothing is urgent enough to justify leaving the couch.",
      "The couch is objectively not designed for three people plus blankets. The dream does not care.",
      "Kirishima is warm on one side of me. Bakugo is pretending the contact on the other is an unavoidable engineering problem. Nobody fixes it.",
      "Rain traces the glass while conversation thins into silence. I fall asleep inside the dream with one hand loosely held and someone’s breathing steady near my ear.",
      "I wake to a quiet room and miss the impossible permission to stay still."
    ]
  },
  {
    "id": "recovery-bakugo-t2-x1",
    "realm": "Recovery",
    "tier": 2,
    "focus": "bakugo",
    "title": "Soft Landing · Half Awake · Bakugo",
    "body": [
      "The dream begins in the hazy space after falling asleep somewhere I did not mean to. Everything is warm, dark and close enough to make waking feel optional.",
      "Bakugo is sitting beside me, one hand still resting at my waist as if he caught me before I slid off the couch. “Go back to sleep.”",
      "I mumble that he is uncomfortable. “Then move.” I do not. His thumb makes one slow pass over my side.",
      "When I look up, he kisses me like he has been waiting for me to be awake enough to choose it. Then he pulls the blanket back over us both.",
      "I wake for real with the cruel awareness that the room is much emptier."
    ]
  },
  {
    "id": "recovery-kirishima-t2-x1",
    "realm": "Recovery",
    "tier": 2,
    "focus": "kirishima",
    "title": "Soft Landing · Half Awake · Kirishima",
    "body": [
      "The dream begins in the hazy space after falling asleep somewhere I did not mean to. Everything is warm, dark and close enough to make waking feel optional.",
      "I wake in the dream with my cheek against Kirishima’s chest and his arm around me. He notices the exact second I become conscious.",
      "“Sorry,” he whispers. “I can move.” I catch his shirt before he can. The smile that spreads across his face is sleepy and almost unbearably tender.",
      "The kiss is soft, barely there, followed by another when neither of us moves away. I fall asleep again with his hand threaded through mine.",
      "I wake for real with the cruel awareness that the room is much emptier."
    ]
  },
  {
    "id": "recovery-both-t2-x1",
    "realm": "Recovery",
    "tier": 2,
    "focus": "both",
    "title": "Soft Landing · Half Awake · Both",
    "body": [
      "The dream begins in the hazy space after falling asleep somewhere I did not mean to. Everything is warm, dark and close enough to make waking feel optional.",
      "I surface from sleep wedged into an arrangement that should be impossible: Kirishima behind me, Bakugo close enough in front that our knees overlap under the blanket.",
      "Bakugo is awake. Kirishima might be. Nobody moves. I whisper that this is ridiculous. “Sleep,” Bakugo whispers back.",
      "Kirishima’s arm tightens gently around my waist. Bakugo’s fingers find mine between us. The dream lets me stay there long enough to stop questioning it.",
      "I wake for real with the cruel awareness that the room is much emptier."
    ]
  },
  {
    "id": "home-bakugo-t1-x1",
    "realm": "Home",
    "tier": 1,
    "focus": "bakugo",
    "title": "Domestic Gravity · Sunday Morning · Bakugo",
    "body": [
      "The dream gives us a slow morning with no alarms, no missions, no school schedule and no reason to be anywhere else.",
      "Bakugo is already in the kitchen, hair worse than usual and expression deeply offended by consciousness. He slides a mug toward me before I speak.",
      "“You remembered.” “You drink the same thing every time.” He says it like memory is not a form of attention.",
      "I lean against the counter beside him. Our shoulders touch. He leaves them that way while the kettle clicks off and the apartment stays quiet.",
      "I wake missing a morning that never existed."
    ]
  },
  {
    "id": "home-kirishima-t1-x1",
    "realm": "Home",
    "tier": 1,
    "focus": "kirishima",
    "title": "Domestic Gravity · Sunday Morning · Kirishima",
    "body": [
      "The dream gives us a slow morning with no alarms, no missions, no school schedule and no reason to be anywhere else.",
      "Kirishima wanders in wearing a shirt that looks slept in and asks whether breakfast has rules today. “No rules.” “Excellent.”",
      "We make something badly organized together, bumping hips at the counter and stealing ingredients from each other’s side.",
      "When he tastes something from the spoon I am holding, his eyes meet mine over it. The moment is absurdly domestic and suddenly not innocent at all.",
      "I wake missing a morning that never existed."
    ]
  },
  {
    "id": "home-both-t1-x1",
    "realm": "Home",
    "tier": 1,
    "focus": "both",
    "title": "Domestic Gravity · Sunday Morning · Both",
    "body": [
      "The dream gives us a slow morning with no alarms, no missions, no school schedule and no reason to be anywhere else.",
      "Nobody has plans. This appears to confuse all three of us enough that breakfast becomes an event.",
      "Bakugo cooks. Kirishima keeps stealing pieces before they are finished. I am assigned coffee and quality control, which mostly means being in the way with official status.",
      "At some point I realize I am barefoot in their kitchen—our kitchen—laughing while both of them argue around me. The dream makes the word ours feel dangerously easy.",
      "I wake missing a morning that never existed."
    ]
  },
  {
    "id": "home-bakugo-t2-x1",
    "realm": "Home",
    "tier": 2,
    "focus": "bakugo",
    "title": "Domestic Gravity · Stay · Bakugo",
    "body": [
      "It is late in the dream, the apartment dim and settled. I say I should go to my room. Nobody reacts like that is obviously the correct answer.",
      "Bakugo looks up from the couch. “Why?” It is such a simple question that I forget every practical answer.",
      "“Because it’s late.” “So?” He reaches out, catches two fingers in the hem of my sleeve, and looks irritated with himself for doing it.",
      "I sit back down. His hand shifts from my sleeve to mine. When he kisses me, it feels less like a beginning than admitting I was already staying.",
      "I wake in my own bed with the word stay still warm in my chest."
    ]
  },
  {
    "id": "home-kirishima-t2-x1",
    "realm": "Home",
    "tier": 2,
    "focus": "kirishima",
    "title": "Domestic Gravity · Stay · Kirishima",
    "body": [
      "It is late in the dream, the apartment dim and settled. I say I should go to my room. Nobody reacts like that is obviously the correct answer.",
      "Kirishima pats the space beside him before I finish saying goodnight. “You can stay, you know.”",
      "The words are casual. His expression is not. I sit, and he lets out a breath like he had been preparing not to look disappointed.",
      "We talk until talking stops. His forehead rests against mine. “Still okay?” he asks. I answer by kissing him.",
      "I wake in my own bed with the word stay still warm in my chest."
    ]
  },
  {
    "id": "home-both-t2-x1",
    "realm": "Home",
    "tier": 2,
    "focus": "both",
    "title": "Domestic Gravity · Stay · Both",
    "body": [
      "It is late in the dream, the apartment dim and settled. I say I should go to my room. Nobody reacts like that is obviously the correct answer.",
      "I make it two steps toward the hallway before Kirishima says my name and Bakugo says, at the same time, “Where’re you going?”",
      "I turn around. They are both looking at me like leaving the room is a decision they had not considered. The realization is almost comical.",
      "I return to the couch. Kirishima makes space on one side; Bakugo catches my hand on the other. The dream settles us together as if this was always the obvious shape of the evening.",
      "I wake in my own bed with the word stay still warm in my chest."
    ]
  },
  {
    "id": "hobbies-bakugo-t1-x1",
    "realm": "Hobbies",
    "tier": 1,
    "focus": "bakugo",
    "title": "Play After Dark · High Score · Bakugo",
    "body": [
      "The dream builds an arcade out of neon, impossible machines and exactly enough competitiveness to turn a harmless evening into a problem.",
      "Bakugo discovers a game he is good at and becomes intolerable within thirty seconds. “Beginner’s luck.” “Scoreboard says otherwise.”",
      "I demand a rematch. He steps behind me to demonstrate the timing, reaching around far enough that I forget to press the button.",
      "“Distracted?” he asks, smug as hell. I elbow him without conviction and lose the round by an embarrassing margin.",
      "I wake wanting a rematch with people who were never actually there."
    ]
  },
  {
    "id": "hobbies-kirishima-t1-x1",
    "realm": "Hobbies",
    "tier": 1,
    "focus": "kirishima",
    "title": "Play After Dark · High Score · Kirishima",
    "body": [
      "The dream builds an arcade out of neon, impossible machines and exactly enough competitiveness to turn a harmless evening into a problem.",
      "Kirishima celebrates every point like we are at a championship, including mine. Especially mine.",
      "We end up at a co-op machine, shoulders touching while both of us shout contradictory instructions and laugh too hard to play well.",
      "When the victory screen flashes, he grabs me around the waist in celebration. We freeze one beat after the hug should end, faces suddenly much closer than the scoreboard.",
      "I wake wanting a rematch with people who were never actually there."
    ]
  },
  {
    "id": "hobbies-both-t1-x1",
    "realm": "Hobbies",
    "tier": 1,
    "focus": "both",
    "title": "Play After Dark · High Score · Both",
    "body": [
      "The dream builds an arcade out of neon, impossible machines and exactly enough competitiveness to turn a harmless evening into a problem.",
      "The three of us turn one rhythm game into a matter of personal honor. This is a mistake.",
      "Kirishima is laughing too hard to breathe. Bakugo is furious that I beat him by a fraction. I am being gracious about victory, meaning not gracious at all.",
      "The rematch ends with all three of us crowded around the machine, hands colliding over controls and faces bright from neon. I cannot tell whether the heat in my cheeks is competition anymore.",
      "I wake wanting a rematch with people who were never actually there."
    ]
  },
  {
    "id": "hobbies-bakugo-t2-x1",
    "realm": "Hobbies",
    "tier": 2,
    "focus": "bakugo",
    "title": "Play After Dark · Photo Booth · Bakugo",
    "body": [
      "The dream traps us in a photo booth with a countdown timer, too many ridiculous filters and absolutely no respect for personal space.",
      "Bakugo refuses every cute frame until the timer starts without permission. “Move.” There is nowhere to move. His arm ends up around my waist to fit us both in frame.",
      "The first photo catches me laughing at his expression. The second catches him looking at me instead of the camera.",
      "On the final countdown, I turn to say something. He kisses me before the flash. The dream prints the evidence in a tiny glossy strip he immediately tries to steal.",
      "I wake without the photos, which feels unfair enough to count as a personal loss."
    ]
  },
  {
    "id": "hobbies-kirishima-t2-x1",
    "realm": "Hobbies",
    "tier": 2,
    "focus": "kirishima",
    "title": "Play After Dark · Photo Booth · Kirishima",
    "body": [
      "The dream traps us in a photo booth with a countdown timer, too many ridiculous filters and absolutely no respect for personal space.",
      "Kirishima commits to every stupid sticker option available. By the second photo we both have digital animal ears and no dignity.",
      "He pulls me closer for the frame, cheek pressed to mine. The countdown keeps going while we are still laughing.",
      "For the last photo, his smile changes. “Can I?” I nod. The flash goes off exactly as he kisses me, turning the moment into something we could theoretically keep.",
      "I wake without the photos, which feels unfair enough to count as a personal loss."
    ]
  },
  {
    "id": "hobbies-both-t2-x1",
    "realm": "Hobbies",
    "tier": 2,
    "focus": "both",
    "title": "Play After Dark · Photo Booth · Both",
    "body": [
      "The dream traps us in a photo booth with a countdown timer, too many ridiculous filters and absolutely no respect for personal space.",
      "Fitting three adults into the booth requires negotiation, knees overlapping and Kirishima laughing directly into my ear. Bakugo says the machine is garbage while refusing to leave.",
      "The first photos are chaos. The last countdown starts after we have gone strangely still, my shoulder against Kirishima and Bakugo’s hand at my waist.",
      "Nobody plans the final picture. Kirishima kisses my cheek at the same moment I turn toward Bakugo, who closes the remaining distance. The flash catches all three of us mid-disaster.",
      "I wake without the photos, which feels unfair enough to count as a personal loss."
    ]
  }
];
  const DREAMS = [...BASE_DREAMS, ...EXPANDED_DREAMS];

  const FOCUS_LABEL = { surprise: "Surprise me", bakugo: "Bakugo", kirishima: "Kirishima", both: "Both" };

  let renderTimer = null;
  let archiveFilter = "all";
  let archiveRealm = "all";

  init();

  function init() {
    ensureState();
    ensureDialog();
    bind();
    renderCard();
    window.addEventListener("life-rpg:render", scheduleRender);
    window.addEventListener("life-rpg:state-saved", scheduleRender);
    window.addEventListener("life-rpg:dream-thread-change", event => {
      ensureState();
      renderCard();
      if (Number(event.detail?.total || 0) === 1 && !state().lastReadAt) {
        app.showToast?.("🌙 Dreamscape unlocked · a non-canon dream is waiting in Story.");
      }
    });
  }

  function defaults() {
    return {
      schemaVersion: SCHEMA,
      version: VERSION,
      preference: "surprise",
      lastReadAt: null,
      pendingDreamId: null,
      pendingFocus: null,
      archive: []
    };
  }

  function ensureState() {
    const root = app.getState();
    if (!root.dreamscape || typeof root.dreamscape !== "object" || Array.isArray(root.dreamscape)) {
      root.dreamscape = defaults();
    }
    const s = root.dreamscape;
    s.schemaVersion = SCHEMA;
    s.version = VERSION;
    if (!["surprise","bakugo","kirishima","both"].includes(s.preference)) s.preference = "surprise";
    s.archive = Array.isArray(s.archive) ? s.archive.filter(item => item?.dreamId) : [];
    return s;
  }

  function state() { return ensureState(); }
  function totalThreads() { return Number(graph.getTotalDreamThreads?.() || 0); }
  function cadenceDays() { return Number(graph.getDreamCadenceDays?.() || 0); }

  function unlockedDreams() {
    return DREAMS.filter(dream => Number(graph.getDreamThreadRank?.(dream.realm) || 0) >= dream.tier);
  }

  function readyAt() {
    if (!totalThreads()) return null;
    const last = Number(state().lastReadAt || 0);
    if (!last) return 0;
    return last + cadenceDays() * DAY_MS;
  }

  function isReady() {
    if (!totalThreads()) return false;
    if (state().pendingDreamId) return true;
    const when = readyAt();
    return when === 0 || Date.now() >= when;
  }

  function nextLabel() {
    if (!totalThreads()) return "Locked";
    if (isReady()) return "A dream is waiting";
    const ms = Math.max(0, readyAt() - Date.now());
    const days = Math.floor(ms / DAY_MS);
    const hours = Math.ceil((ms % DAY_MS) / 3600000);
    if (days > 0) return `${days}d ${hours}h`;
    return `${Math.max(1,hours)}h`;
  }

  function ensureCard() {
    const page = document.getElementById("view-story");
    if (!page) return null;
    let card = document.getElementById("dreamscapeStoryCard");
    if (card) return card;

    card = document.createElement("section");
    card.id = "dreamscapeStoryCard";
    card.className = "panel dreamscape-story-card-v314ap";
    const secondary = page.querySelector(".story-secondary-grid");
    if (secondary) page.insertBefore(card, secondary);
    else page.appendChild(card);
    return card;
  }

  function renderCard() {
    const card = ensureCard();
    if (!card) return;
    const total = totalThreads();
    const cadence = cadenceDays();
    const archive = state().archive.length;
    const uniqueArchive = new Set(state().archive.map(item => item.dreamId)).size;
    const unlockedCount = unlockedDreams().length;
    const pools = REALMS.filter(realm => Number(graph.getDreamThreadRank?.(realm) || 0) > 0).length;

    if (!total) {
      card.classList.add("is-locked");
      card.innerHTML = `
        <div class="dreamscape-card-icon-v314ap">🌙</div>
        <div class="dreamscape-card-copy-v314ap">
          <p class="eyebrow">DREAMSCAPE · NON-CANON</p>
          <h3>Something is still sleeping.</h3>
          <p>Deep Talent Tree branches can unlock romantic dream interludes without changing Luca's canon relationships, choices or Slow Burn.</p>
          <small>No Story Energy cost · no affinity · no story flags.</small>
        </div>
        <button class="secondary-button" type="button" data-dreamscape-tree>View Talent Trees</button>`;
      return;
    }

    card.classList.remove("is-locked");
    card.innerHTML = `
      <div class="dreamscape-card-icon-v314ap">${isReady() ? "🌙" : "☾"}</div>
      <div class="dreamscape-card-copy-v314ap">
        <p class="eyebrow">DREAMSCAPE · ${total}/14 THREADS</p>
        <h3>${isReady() ? "A dream is waiting…" : "The next dream is still forming."}</h3>
        <p>${pools} themed Realm pool${pools === 1 ? "" : "s"} unlocked · current cadence: every ${cadence} day${cadence === 1 ? "" : "s"}.</p>
        <small>${uniqueArchive} unique dream${uniqueArchive === 1 ? "" : "s"} discovered · ${unlockedCount} currently in your unlocked pool · ${archive} total reads.</small>
      </div>
      <div class="dreamscape-card-actions-v314ap">
        <button class="${isReady() ? "primary-button" : "secondary-button"}" type="button" data-dreamscape-open>${isReady() ? "Read Dream" : `Next in ${nextLabel()}`}</button>
        <button class="text-button" type="button" data-dreamscape-archive>Dream Archive</button>
      </div>`;
  }

  function ensureDialog() {
    if (document.getElementById("dreamscapeDialog")) return;
    const dialog = document.createElement("dialog");
    dialog.id = "dreamscapeDialog";
    dialog.className = "dreamscape-dialog-v314ap";
    dialog.innerHTML = `
      <div class="dreamscape-shell-v314ap">
        <button class="dreamscape-close-v314ap" type="button" data-dreamscape-close aria-label="Close">×</button>
        <div id="dreamscapeDialogBody"></div>
      </div>`;
    document.body.appendChild(dialog);
  }

  function bind() {
    document.addEventListener("click", event => {
      const open = event.target.closest?.("[data-dreamscape-open]");
      if (open) { event.preventDefault(); openDreamscape(); return; }

      const archive = event.target.closest?.("[data-dreamscape-archive]");
      if (archive) { event.preventDefault(); openArchive(); return; }

      const tree = event.target.closest?.("[data-dreamscape-tree]");
      if (tree) { event.preventDefault(); window.LifeRPGSkills?.open?.(); return; }

      const filter = event.target.closest?.("[data-dreamscape-filter]");
      if (filter) { event.preventDefault(); archiveFilter = filter.dataset.dreamscapeFilter || "all"; openArchive(); return; }

      const realmFilter = event.target.closest?.("[data-dreamscape-realm]");
      if (realmFilter) { event.preventDefault(); archiveRealm = realmFilter.dataset.dreamscapeRealm || "all"; openArchive(); return; }

      const close = event.target.closest?.("[data-dreamscape-close]");
      if (close) { event.preventDefault(); document.getElementById("dreamscapeDialog")?.close?.(); return; }


      const wake = event.target.closest?.("[data-dreamscape-wake]");
      if (wake) { event.preventDefault(); finishDream(); return; }

      const replay = event.target.closest?.("[data-dreamscape-replay]");
      if (replay) { event.preventDefault(); showDream(replay.dataset.dreamscapeReplay, true); return; }

      const back = event.target.closest?.("[data-dreamscape-back]");
      if (back) { event.preventDefault(); openArchive(); return; }
    });
  }

  function openDreamscape() {
    if (!totalThreads()) {
      window.LifeRPGSkills?.open?.();
      return false;
    }
    if (!isReady()) renderStatusDialog();
    else if (state().pendingDreamId) showDream(state().pendingDreamId, false);
    else chooseDreamAutomatically();
    const dialog = document.getElementById("dreamscapeDialog");
    if (dialog && !dialog.open) dialog.showModal?.();
    return true;
  }

  function chooseDreamAutomatically() {
    if (!isReady() || state().pendingDreamId) return false;
    const eligible = unlockedDreams();
    if (!eligible.length) return false;

    // Character focus is never chosen by the player. Hidden romantic affection
    // shifts this roll: Bakugo/Kirishima each stay within roughly 30–50%, while
    // Both lives between 5–20% and rises when both relationships are similarly
    // developed. If the relationship module is unavailable, use the balanced
    // mature fallback (40 / 40 / 20).
    let focus = relationships?.pickDreamFocus?.() || null;
    if (!["bakugo", "kirishima", "both"].includes(focus)) {
      const roll = Math.random() * 100;
      focus = roll < 40 ? "bakugo" : roll < 80 ? "kirishima" : "both";
    }

    let candidates = eligible.filter(dream => dream.focus === focus);
    if (!candidates.length) candidates = eligible;

    const seen = new Set(state().archive.map(item => item.dreamId));
    const unseen = candidates.filter(dream => !seen.has(dream.id));
    if (unseen.length) candidates = unseen;

    const recentEntries = state().archive.slice(-8);
    const recentIds = new Set(recentEntries.map(item => item.dreamId));
    const recentRealms = recentEntries.slice(-3).map(item => dreamById(item.dreamId)?.realm).filter(Boolean);
    const freshRealm = candidates.filter(dream => !recentRealms.includes(dream.realm));
    if (freshRealm.length) candidates = freshRealm;
    if (!unseen.length) {
      const notRecent = candidates.filter(dream => !recentIds.has(dream.id));
      if (notRecent.length) candidates = notRecent;
    }

    const selected = weightedDreamPick(candidates, seen, recentIds) || eligible[0];
    state().pendingDreamId = selected.id;
    state().pendingFocus = focus;
    app.saveState({ source: "dreamscape-dream-chosen" });
    showDream(selected.id, false);
    renderCard();
    return true;
  }

  function weightedDreamPick(candidates, seen = new Set(), recentIds = new Set()) {
    if (!candidates.length) return null;
    const weighted = candidates.map(dream => {
      const rank = Number(graph.getDreamThreadRank?.(dream.realm) || 0);
      let weight = dream.tier === 2 && rank >= 2 ? 1.45 : 1;
      if (!seen.has(dream.id)) weight *= 2.2;
      if (recentIds.has(dream.id)) weight *= .16;
      return { dream, weight: Math.max(.02, weight) };
    });
    const total = weighted.reduce((sum,item) => sum + item.weight, 0);
    let cursor = Math.random() * total;
    for (const item of weighted) {
      cursor -= item.weight;
      if (cursor <= 0) return item.dream;
    }
    return weighted[weighted.length - 1]?.dream || null;
  }

  function showDream(id, replay = false) {
    const dream = dreamById(id);
    const body = document.getElementById("dreamscapeDialogBody");
    if (!dream || !body) return false;
    body.innerHTML = `
      <article class="dreamscape-reader-v314ap">
        <header>
          <p class="eyebrow">🌙 DREAMSCAPE · ${esc(dream.realm.toUpperCase())} · ${dream.tier === 2 ? "DEEPER DREAM" : "DREAM THREAD"}</p>
          <h2>${esc(dream.title)}</h2>
          <span>${esc(FOCUS_LABEL[dream.focus] || dream.focus)} · non-canon</span>
        </header>
        <div class="dreamscape-prose-v314ap">${dream.body.map(paragraph => `<p>${esc(paragraph)}</p>`).join("")}</div>
        <footer>
          <small>${replay ? "Archive replay · does not change the Dreamscape timer." : "Finishing this dream starts the next cooldown."}</small>
          <button class="primary-button" type="button" ${replay ? "data-dreamscape-back" : "data-dreamscape-wake"}>${replay ? "Back to Archive" : "Wake up"}</button>
        </footer>
      </article>`;
    return true;
  }

  function finishDream() {
    const id = state().pendingDreamId;
    const dream = dreamById(id);
    if (!dream) return false;

    const now = Date.now();
    state().archive.push({ dreamId: id, readAt: now, realm: dream.realm, focus: dream.focus, tier: dream.tier });
    state().archive = state().archive.slice(-200);
    state().lastReadAt = now;
    state().pendingDreamId = null;
    state().pendingFocus = null;
    app.saveState({ source: "dreamscape-dream-finished" });
    renderCard();
    renderStatusDialog(true);
    return true;
  }

  function renderStatusDialog(justFinished = false) {
    const body = document.getElementById("dreamscapeDialogBody");
    if (!body) return;
    body.innerHTML = `
      <div class="dreamscape-status-v314ap">
        <span>☾</span>
        <p class="eyebrow">${justFinished ? "DREAM ARCHIVED" : "DREAMSCAPE"}</p>
        <h2>${justFinished ? "The dream slips away." : "Nothing is waiting yet."}</h2>
        <p>${justFinished ? `It is saved in the Dream Archive. With ${totalThreads()}/14 Threads, another dream can form in ${cadenceDays()} day${cadenceDays() === 1 ? "" : "s"}.` : `Current cadence: every ${cadenceDays()} day${cadenceDays() === 1 ? "" : "s"} · next dream in ${nextLabel()}.`}</p>
        <button class="secondary-button" type="button" data-dreamscape-archive>Open Dream Archive</button>
      </div>`;
  }

  function openArchive() {
    const body = document.getElementById("dreamscapeDialogBody");
    if (!body) return;

    const grouped = new Map();
    for (const item of state().archive) {
      const current = grouped.get(item.dreamId) || { ...item, readCount: 0, firstReadAt: item.readAt, lastReadAt: item.readAt };
      current.readCount += 1;
      if (Number(item.readAt || 0) < Number(current.firstReadAt || Infinity)) current.firstReadAt = item.readAt;
      if (Number(item.readAt || 0) >= Number(current.lastReadAt || 0)) current.lastReadAt = item.readAt;
      grouped.set(item.dreamId, current);
    }

    const discovered = [...grouped.values()].filter(item => {
      const dream = dreamById(item.dreamId);
      if (!dream) return false;
      if (archiveFilter !== "all" && dream.focus !== archiveFilter) return false;
      if (archiveRealm !== "all" && dream.realm !== archiveRealm) return false;
      return true;
    }).sort((a,b) => Number(b.lastReadAt || 0) - Number(a.lastReadAt || 0));

    const uniqueTotal = grouped.size;
    const unlockedCount = unlockedDreams().length;
    body.innerHTML = `
      <p class="eyebrow">DREAM ARCHIVE · ${uniqueTotal} DISCOVERED</p>
      <h2>Things that never happened.</h2>
      <p class="dreamscape-lead-v314ap">Replay freely. The archive is a gallery now: repeat reads stay counted without filling the list with duplicates.</p>
      <div class="dreamscape-archive-stats-v314ax">
        <span><b>${uniqueTotal}</b><small>unique found</small></span>
        <span><b>${unlockedCount}</b><small>currently unlockable</small></span>
        <span><b>${DREAMS.length}</b><small>total dream library</small></span>
      </div>
      <div class="dreamscape-filter-row-v314ax" role="group" aria-label="Filter dream focus">
        ${["all","bakugo","kirishima","both"].map(value => `<button class="${archiveFilter === value ? "active" : ""}" type="button" data-dreamscape-filter="${value}">${value === "all" ? "All" : FOCUS_LABEL[value]}</button>`).join("")}
      </div>
      <div class="dreamscape-filter-row-v314ax realms" role="group" aria-label="Filter dream theme">
        <button class="${archiveRealm === "all" ? "active" : ""}" type="button" data-dreamscape-realm="all">All themes</button>
        ${REALMS.map(realm => `<button class="${archiveRealm === realm ? "active" : ""}" type="button" data-dreamscape-realm="${escAttr(realm)}">${esc(realm)}</button>`).join("")}
      </div>
      <div class="dreamscape-archive-list-v314ap">
        ${discovered.length ? discovered.map(item => {
          const dream = dreamById(item.dreamId);
          return `<button type="button" data-dreamscape-replay="${escAttr(dream.id)}"><span>🌙</span><div><small>${esc(dream.realm.toUpperCase())} · ${esc(FOCUS_LABEL[dream.focus] || dream.focus)} · ${dream.tier === 2 ? "DEEP" : "SOFT"}</small><strong>${esc(dream.title)}</strong><p>Last read ${new Date(item.lastReadAt).toLocaleDateString(undefined, { year:"numeric", month:"short", day:"numeric" })}${item.readCount > 1 ? ` · ${item.readCount}× read` : ""}</p></div><b>›</b></button>`;
        }).join("") : `<div class="dreamscape-empty-v314ap">No dreams match this filter yet.</div>`}
      </div>
      ${isReady() ? `<button class="primary-button" type="button" data-dreamscape-open>${state().pendingDreamId ? "Resume waiting dream" : "Let the dream begin"}</button>` : ""}`;
    const dialog = document.getElementById("dreamscapeDialog");
    if (dialog && !dialog.open) dialog.showModal?.();
  }

  function dreamById(id) {
    return DREAMS.find(dream => dream.id === id) || null;
  }

  function scheduleRender() {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(renderCard, 80);
  }

  function esc(value) {
    return app.escapeHtml ? app.escapeHtml(value) : String(value ?? "");
  }

  function escAttr(value) {
    return esc(value).replace(/`/g, "&#96;");
  }

  window.LifeRPGDreamscape = {
    version: VERSION,
    getStatus: () => ({
      unlocked: totalThreads() > 0,
      threads: totalThreads(),
      cadenceDays: cadenceDays(),
      ready: isReady(),
      readyAt: readyAt(),
      archiveCount: state().archive.length,
      pendingDreamId: state().pendingDreamId
    }),
    open: openDreamscape,
    openArchive,
    rollPendingDream: chooseDreamAutomatically,
    finishPending: finishDream,
    getArchive: () => state().archive.map(item => ({ ...item })),
    refresh: renderCard
  };
})();