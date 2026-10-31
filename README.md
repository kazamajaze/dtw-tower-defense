# Dominate The World — Tower Defense

Game: https://kazamajaze.github.io/dtw-tower-defense/

## Files
- `index.html`: game UI and player-state handling
- `cloud-auth.js`: Supabase Auth, player save sync, shared-content publish
- `supabase-*.sql`: database setup and RLS policies
- `HANDOFF_FOR_CLAUDE.md`: architecture, migration and operational notes
- `NOVEL_INTEGRATION.md`: safe iframe integration with the Novel page

## Data boundary
- Shared game content: `game_content` (characters, monsters, maps, campaign, roulette rewards)
- Per-account player state: `player_saves` (ownership, formation, shards, wins, inventory, progress, settings)
- Game backup import/export only handles shared content. It never imports or exports account state.
- Legacy localStorage `dtwtd_data` is read for migration and is not deleted or overwritten.

Read the handoff before changing Supabase policies or publishing game content.
