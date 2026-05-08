---
trigger: always_on
---

# Database Alignment: Google Cloud SQL
- **Database:** PostgreSQL 15 on Google Cloud (IP: 34.93.230.37).
- **Primary Keys:** Matches/Tournaments use UUID; Players use BIGINT.
- **JSONB Queries:** Always use `@>` for `home_team_xi` searches.
- **Legacy Stats:** Updates must be written to `player_legacy_stats` after matches are finalized.
- **Active Context:** Develop and maintain the entire Indian Strikers platform ecosystem. Consider all matches and tournaments (e.g., historical 'Hayer League' data) when performing data analysis or structural updates.