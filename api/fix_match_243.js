require('dotenv').config();
const db = require('./db');

const sql = `
WITH updated_data AS (
  SELECT 
    id,
    live_data || jsonb_build_object(
      'innings1', (live_data->'innings1') || jsonb_build_object(
        'battingStats', (live_data->'innings1'->'battingStats') || jsonb_build_object(
          '1776413448736', (live_data->'innings1'->'battingStats'->'1776413448736') || '{"name": "Aftab Khan"}'::jsonb,
          '1776413487426', (live_data->'innings1'->'battingStats'->'1776413487426') || '{"name": "Mamoon Kiani"}'::jsonb
        )
      ),
      'innings2', (live_data->'innings2') || jsonb_build_object(
        'battingStats', (live_data->'innings2'->'battingStats') || jsonb_build_object(
          '8', (live_data->'innings2'->'battingStats'->'8') || '{"name": "Anas Ummer"}'::jsonb,
          '3', (live_data->'innings2'->'battingStats'->'3') || '{"name": "Shehin Shihabudeen"}'::jsonb
        ),
        'bowlingStats', (live_data->'innings2'->'bowlingStats') || jsonb_build_object(
          '1776413499950', (live_data->'innings2'->'bowlingStats'->'1776413499950') || '{"name": "Muzzammal Hussain"}'::jsonb
        )
      )
    ) as new_live_data
  FROM matches
  WHERE id = '353c1407-2bc8-470c-8054-706ca8f41b81'
)
UPDATE matches
SET 
  final_score_home = 214,
  final_score_away = 243,
  status = 'completed',
  is_home_batting_first = false,
  live_data = (SELECT new_live_data FROM updated_data)
WHERE id = '353c1407-2bc8-470c-8054-706ca8f41b81'
RETURNING id;
`;

async function run() {
  console.log("Starting match correction for 353c1407-2bc8-470c-8054-706ca8f41b81...");
  const { data, error } = await db.query(sql);
  if (error) {
    console.error("Correction failed:", error);
    process.exit(1);
  }
  console.log("Match correction successful:", data);
  process.exit(0);
}

run();
