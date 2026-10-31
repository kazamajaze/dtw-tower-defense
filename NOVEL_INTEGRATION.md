# Novel + Tower Defense integration

## Novel file inspected
`Dominate_The_World_Kazama_Jaze.html` is a separate single-page app. Its backup system uses:
- `BACKUP_KEY = 'dtw_full_backup'`
- `collectAllData()` to serialize Novel story/world data
- `applyAllData()` to restore Novel data
- ZIP/JSON import-export with `backup.json`

Keep that backup contract unchanged. Do not add Tower Defense player saves to `collectAllData()` or `applyAllData()`, and do not reuse `dtw_full_backup` for game files.

## Recommended embed

Place this block in the Novel page where the game should appear. The exact section/position still needs the page owner's approval.

```html
<section id="tower-defense" class="novel-game-section">
  <h2>Dominate The World — Tower Defense</h2>
  <iframe
    src="https://kazamajaze.github.io/dtw-tower-defense/"
    title="Dominate The World: Tower Defense"
    style="display:block;width:100%;min-height:850px;border:0;border-radius:12px"
    loading="lazy"
    allow="fullscreen"
  ></iframe>
</section>
```

The iframe runs on the GitHub Pages origin and uses its own Supabase Auth session and localStorage keys. The Novel page must not read, write, or proxy the game session. No `postMessage` bridge is implemented or required for basic embedding.

If a future bridge is needed, use an exact allow-list for both `event.origin` and `targetOrigin`; never use `*` for private data, and never send passwords, access tokens, refresh tokens, or service-role keys.

## Game backup contract

New game backups use `format: "dtw-shared-content"` and contain only:
- `characters`
- `monsters`
- `maps`
- `campaign`
- `rouletteRewards`

The game importer also accepts an older full-game JSON file but extracts only those shared-content keys. It ignores all account fields. Novel `backup.json` is not a game backup and should be rejected by the game importer.

## Browser and deployment checks

- Ensure the Novel page's Content-Security-Policy permits frames from `https://kazamajaze.github.io` (for example, its `frame-src` directive).
- Test the iframe on desktop and mobile.
- Test Supabase sign-in inside the iframe. Browser third-party storage partitioning may affect embedded-session persistence; if sign-in does not persist, open the game standalone.
- GitHub Pages deployment must be verified after the recovery PR is merged. A branch/PR does not update the live site.
