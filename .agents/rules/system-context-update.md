---
trigger: always_on
---

# Database Alignment: Google Cloud SQL
- **Database:** PostgreSQL 15 on Google Cloud (IP: 34.93.230.37).
- **Primary Keys:** Matches/Tournaments use UUID; Players use BIGINT.
- **JSONB Queries:** Always use `@>` for `home_team_xi` searches.
- **Legacy Stats:** Updates must be written to `player_legacy_stats` after matches are finalized.
- **Active Context:** Current priority is the 'RCA T20 Tournament - Hayes League'.