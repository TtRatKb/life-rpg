# Life RPG V0.31.4cm — Reference Image Loading Hotfix

- Fixes broken AdorkaStock reference images in Drawing Studio.
- Remote reference images now request with `no-referrer` to avoid hotlink/referrer blocking.
- If a direct image still fails, Drawing Studio automatically retries through an image-delivery fallback.
- Replaced two stale Interaction & Story image URLs with currently verified public AdorkaStock references.
- Updated service-worker cache version so the browser does not keep the broken CL reference code.
- Attribution/source labels remain visible in the reference dock.
