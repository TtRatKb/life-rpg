# Life RPG — V0.31.4ai

## Steam Auto Playtime

Steam playtime can now be logged automatically from the cumulative playtime returned by Steam Worker v3.

### Baseline rules
- The first verified Steam playtime total for a game is a reward-free historical baseline.
- If Life RPG already had a verified Steam library sync before this update, that previous total is reused as the baseline.
- Existing lifetime hours are never retroactively turned into Skill XP or Realm XP.
- A Steam total is never allowed to move the baseline backwards, preventing API corrections from becoming fake future playtime.

### Future syncs
Example:
- previous verified total: 42h 10m
- next Steam total: 43h 25m
- detected delta: +75m

Life RPG imports the new delta into the Game activity log as `Steam playtime`.

Because Steam supplies cumulative minutes rather than reliable session start/end intervals, the log is explicitly marked as a sync interval rather than pretending the play happened at the exact sync timestamp.

### Duplicate protection
For the interval since the previous Steam baseline, Life RPG subtracts time already represented by manual logs for that same game. It can also recognize a Gaming time entry when its label clearly identifies the same game.

If 75m were detected by Steam but 30m had already been logged locally, only the uncovered portion is imported. Skill XP uses an incremental override so splitting the same real activity between manual logging and Steam sync cannot exploit the square-root time formula.

### Rewards
New post-baseline Steam playtime is practice:
- For Fun / Social / Challenge game -> Recreation & Play Skill XP + Hobbies Realm XP
- Japanese game -> Language Learning Skill XP + Japanese Realm XP
- No Coins or Story Energy from ordinary Steam playtime
- Steam achievements continue to provide their separate rarity-based milestone rewards

The first-practice-per-day Hobbies/Japanese talent bonuses ignore Steam-imported intervals because Steam cannot reliably tell Life RPG which exact day(s) the whole delta belongs to.

### UI
The Steam status on each game now shows whether auto-log has a verified baseline and how much playtime has been imported since it.
Manual single-game and Sync All summaries report newly logged playtime, locally-covered time, Skill XP and Realm XP.
