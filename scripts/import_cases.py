import pandas as pd

df = pd.read_excel('フリーコンサル案件登録.xlsx', sheet_name='IT')
df['category'] = 'IT'

# クローズ以外をアクティブとして扱う
df['is_active'] = df['ステータス'].apply(lambda x: x != 'クローズ')

df = df.rename(columns={
    'No': 'case_no',
    'PJ名': 'title',
    '背景': 'background',
    '作業内容・ポジション': 'description',
    '業界': 'industry',
    '参画日': 'start_date',
    '延長可能性': 'extendable',
    '稼働率': 'occupancy',
    '単価': 'fee',
    '出社頻度': 'office_days',
    '場所': 'location',
    '必須スキル': 'must_req',
    '尚可スキル': 'nice_to_have',
    '商流': 'flow',
    'ステータス': 'status',
    '掲載日': 'published_at',
})

cols = ['case_no','title','category','background','description','industry',
        'start_date','extendable','occupancy','fee','office_days','location',
        'must_req','nice_to_have','flow','status','published_at','is_active']

df[cols].to_csv('cases_import.csv', index=False, encoding='utf-8-sig')
print(f"完了: {len(df)}件")
