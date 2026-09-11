(() => {
  "use strict";

  if (window.__lifeRpgDreamscapeV314ap) return;
  window.__lifeRpgDreamscapeV314ap = true;

  const app = window.LifeRPGApp;
  const graph = window.LifeRPGTalentTreeGraph;
  if (!app?.getState || !app?.saveState || !graph?.getTotalDreamThreads) {
    console.error("Dreamscape could not initialize because Talent Tree progression is unavailable.");
    return;
  }

  const VERSION = "0.31.4ap";
  const SCHEMA = 1;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const REALMS = ["Work","Knowledge","Japanese","Health","Recovery","Home","Hobbies"];
  const DREAMS = [
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
  const FOCUS_LABEL = { surprise: "Surprise me", bakugo: "Bakugo", kirishima: "Kirishima", both: "Both" };

  let renderTimer = null;

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
        <small>${archive} archived dream${archive === 1 ? "" : "s"} · replay is always free and does not affect the cooldown.</small>
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

      const close = event.target.closest?.("[data-dreamscape-close]");
      if (close) { event.preventDefault(); document.getElementById("dreamscapeDialog")?.close?.(); return; }

      const focus = event.target.closest?.("[data-dreamscape-focus]");
      if (focus) { event.preventDefault(); chooseDream(focus.dataset.dreamscapeFocus); return; }

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
    else renderChooser();
    const dialog = document.getElementById("dreamscapeDialog");
    if (dialog && !dialog.open) dialog.showModal?.();
    return true;
  }

  function renderChooser() {
    const body = document.getElementById("dreamscapeDialogBody");
    if (!body) return;
    const pools = REALMS.filter(realm => Number(graph.getDreamThreadRank?.(realm) || 0) > 0)
      .map(realm => `${realm} · ${graph.getDreamTheme?.(realm)?.title || "Dream pool"}`)
      .join(" · ");
    body.innerHTML = `
      <p class="eyebrow">A DREAM IS WAITING</p>
      <h2>Who drifts into it?</h2>
      <p class="dreamscape-lead-v314ap">Dreams are deliberately non-canon. They can be softer, closer or more romantic than the current Slow Burn without changing anything when Luca wakes up.</p>
      <div class="dreamscape-focus-grid-v314ap">
        ${["surprise","bakugo","kirishima","both"].map(key => `<button type="button" data-dreamscape-focus="${key}"><span>${key === "surprise" ? "✦" : key === "bakugo" ? "爆" : key === "kirishima" ? "♡" : "∞"}</span><strong>${FOCUS_LABEL[key]}</strong><small>${key === "surprise" ? "Let the dream choose." : key === "both" ? "A shared dream with both of them." : `A dream focused on ${FOCUS_LABEL[key]}.`}</small></button>`).join("")}
      </div>
      <div class="dreamscape-pools-v314ap"><small>UNLOCKED THEMES</small><p>${esc(pools)}</p></div>
      <p class="dreamscape-safety-v314ap">No Story Energy · no XP · no Coins · no affinity · no canon flags.</p>`;
  }

  function chooseDream(requestedFocus) {
    if (!isReady() || state().pendingDreamId) return false;
    let focus = ["bakugo","kirishima","both"].includes(requestedFocus) ? requestedFocus : null;
    const eligible = unlockedDreams();
    if (!eligible.length) return false;

    if (!focus) {
      const focusOptions = ["bakugo","kirishima","both"];
      focus = focusOptions[Math.floor(Math.random() * focusOptions.length)];
    }

    let candidates = eligible.filter(dream => dream.focus === focus);
    const seen = new Set(state().archive.map(item => item.dreamId));
    const unseen = candidates.filter(dream => !seen.has(dream.id));
    if (unseen.length) candidates = unseen;

    const recentRealms = state().archive.slice(-3).map(item => dreamById(item.dreamId)?.realm).filter(Boolean);
    const freshRealm = candidates.filter(dream => !recentRealms.includes(dream.realm));
    if (freshRealm.length) candidates = freshRealm;

    const dream = candidates[Math.floor(Math.random() * candidates.length)] || eligible[0];
    state().pendingDreamId = dream.id;
    state().pendingFocus = requestedFocus || "surprise";
    app.saveState({ source: "dreamscape-dream-chosen" });
    showDream(dream.id, false);
    renderCard();
    return true;
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
    const archive = state().archive.slice().reverse();
    body.innerHTML = `
      <p class="eyebrow">DREAM ARCHIVE</p>
      <h2>Things that never happened.</h2>
      <p class="dreamscape-lead-v314ap">Replay freely. Archived dreams remain non-canon and never restart the cooldown.</p>
      <div class="dreamscape-archive-list-v314ap">
        ${archive.length ? archive.map(item => {
          const dream = dreamById(item.dreamId);
          if (!dream) return "";
          return `<button type="button" data-dreamscape-replay="${escAttr(dream.id)}"><span>🌙</span><div><small>${esc(dream.realm.toUpperCase())} · ${esc(FOCUS_LABEL[dream.focus] || dream.focus)}</small><strong>${esc(dream.title)}</strong><p>${new Date(item.readAt).toLocaleDateString(undefined, { year:"numeric", month:"short", day:"numeric" })}</p></div><b>›</b></button>`;
        }).join("") : `<div class="dreamscape-empty-v314ap">No dreams archived yet.</div>`}
      </div>
      ${isReady() ? `<button class="primary-button" type="button" data-dreamscape-open>${state().pendingDreamId ? "Resume waiting dream" : "Read waiting dream"}</button>` : ""}`;
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
    chooseFocus: chooseDream,
    finishPending: finishDream,
    getArchive: () => state().archive.map(item => ({ ...item })),
    refresh: renderCard
  };
})();