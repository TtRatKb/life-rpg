# Life RPG — V0.31.4aj

## Story cadence repair

Real-time story gating is now capped at **one calendar day**.

- An authored `minCalendarDays: 0` beat can still open later the same day, preserving useful morning/evening/night pacing.
- Any authored delay of 1 day stays a next-day beat.
- Any older authored delay above 1 day is now clamped to 1 day at runtime. Existing saves benefit immediately; no story reset is required.
- Daypart gates remain earliest-opening windows, not appointments. If the relevant daypart has already begun, the scene stays available.
- Story Energy and other progression requirements remain independent and can still be completed in parallel.
- User-facing copy now makes the limit explicit instead of implying an open-ended real-time wait.

This changes only story-time pacing. Story prose, choices, costs, progression state and completed scenes are untouched.
