# Life RPG V0.31.4br — Scalable Cloud Save Repair

## Cloud save
- Fixed the Firestore 1 MiB single-document limit that blocked the current ~1.4 MB Life RPG save.
- Cloud saves are now serialized, gzip-compressed where supported, and split into safe chunk documents instead of storing the complete state in `users/{uid}/saves/current`.
- Existing legacy inline cloud saves remain readable and migrate automatically on the next successful cloud write.
- Conflict detection, local rollback protection and periodic cloud backups remain intact. Backups use the same chunk-safe representation.
- If compression is unavailable, the app falls back to uncompressed chunked JSON rather than risking data loss.

## Asset refresh
- Bumped the runtime asset-cache namespace so the newly installed time-of-day background files are actually refreshed instead of an older cached image surviving under the same URL.
- Bumped app/story/cloud cache-busting versions to V0.31.4br.

## Data safety
- No local progress is deleted or trimmed to solve the cloud limit.
- Export/import format remains unchanged.
