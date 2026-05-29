import pandas as pd
import json
import re
from datetime import datetime

def parse_date(val):
    if not val or str(val).strip() in ['—', '-', 'nan', '']:
        return None
    try:
        return pd.to_datetime(val, dayfirst=True).strftime('%Y-%m-%d')
    except:
        return None

def parse_value(val):
    if not val or str(val).strip() in ['—', '-', 'nan', '']:
        return None
    s = re.sub(r'[R$\s.]', '', str(val)).replace(',', '.')
    try:
        return round(float(s), 2)
    except:
        return None

df = pd.read_excel('data/chamados.xlsx', header=None)

rows = []
for i in range(3, 20):
    r = df.iloc[i]
    n_os = str(r[0]).strip() if pd.notna(r[0]) else None
    if not n_os or n_os in ['nan', 'Nº OS']:
        continue
    rows.append({
        "n_os":           n_os,
        "loja":           str(r[1]).strip() if pd.notna(r[1]) else None,
        "problema":       str(r[2]).strip() if pd.notna(r[2]) else None,
        "data_abertura":  parse_date(r[3]),
        "data_atend":     parse_date(r[4]),
        "acao":           str(r[5]).strip() if pd.notna(r[5]) else None,
        "responsavel":    str(r[6]).strip() if pd.notna(r[6]) else None,
        "status":         str(r[7]).strip() if pd.notna(r[7]) else None,
        "data_orc":       parse_date(r[8]),
        "itens_orc":      str(r[9]).strip() if pd.notna(r[9]) else None,
        "valor_orcado":   parse_value(r[11]),
        "data_exec":      parse_date(r[12]),
        "n_protocolo":    str(r[13]).strip() if pd.notna(r[13]) else None,
        "valor_aprovado": parse_value(r[14]),
        "observacoes":    str(r[15]).strip() if pd.notna(r[15]) else None,
    })

output = {
    "gerado_em": datetime.now().strftime('%Y-%m-%dT%H:%M:%S'),
    "total": len(rows),
    "chamados": rows
}

with open('data/chamados.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"OK — {len(rows)} chamados exportados para data/chamados.json")
