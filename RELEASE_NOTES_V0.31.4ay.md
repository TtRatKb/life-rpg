# Life RPG V0.31.4ay — Gifts & Preferences

## Added
- Gift Shelf inside People. Gifts are found/earned rather than bought with Coins.
- Weekly outing find: choose one of three small items once per week.
- Up to two Activity Gift Finds per week, earned after meaningful rewarded Life RPG actions.
- Mina, Katsuki and Eijiro have hidden gift preferences. Giving a gift teaches Luca the observed reaction without exposing Affection numbers.
- Loved / liked / neutral / not-their-thing reactions feed the existing hidden Friendship/Romantic Affection layer; disliked gifts never subtract relationship progress.
- One relationship-counting gift per person per day prevents gift farming.
- Gift Notes remember discovered preferences.
- Non-consumable keepsakes can remain recorded as kept; Bakugo/Kirishima keepsakes can surface subtly in the Shared Apartment Home hub.
- Gift Finds are auditable in Activity & Reward Ledger as item rewards.
- Public `LifeRPGGifts.grantGift()` hook allows later Story, seasonal and Achievement systems to award specific gifts safely.

## Economy / save safety
- Gift items are not a new currency and never consume Coins.
- Gift state lives in the canonical Life RPG save under `giftSystem`.
- Existing saves need no manual migration; state is initialized lazily and preserves unknown future fields.
