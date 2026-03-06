-- 案件に勤務形態カラムを追加（フルリモート / 一部リモート / 常駐 / ミーティング出社）
ALTER TABLE cases ADD COLUMN IF NOT EXISTS work_style text;
