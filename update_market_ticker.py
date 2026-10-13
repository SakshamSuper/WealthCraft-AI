import json
import re

with open("nifty_50_dhan.json", "r", encoding="utf-8") as f:
    nifty_stocks = json.load(f)

# Format into TypeScript array code
ts_items = []
for s in nifty_stocks:
    mcap_clean = s['marketCap'].replace('\u20b9', '₹')
    item_str = f"      {{ symbol: \"{s['symbol']}\", name: \"{s['name']}\", weightPct: {s['weightPct']}, changePct: {s['changePct']}, price: {s['price']}, high52w: {s['high52w']}, low52w: {s['low52w']}, peRatio: {s['peRatio']}, marketCap: \"{mcap_clean}\" }}"
    ts_items.append(item_str)

nifty_ts_code = ",\n".join(ts_items)

ticker_file = r"c:\Users\saksh\OneDrive\Desktop\mf\frontend\components\MarketTicker.tsx"
with open(ticker_file, "r", encoding="utf-8") as f:
    code = f.read()

# Replace the NIFTY array content in indexConstituentsMaster
new_nifty_block = f"    NIFTY: [\n{nifty_ts_code}\n    ],"

code_updated = re.sub(
    r'NIFTY:\s*\[\s*\{.*?\}\s*\],',
    new_nifty_block,
    code,
    flags=re.DOTALL
)

with open(ticker_file, "w", encoding="utf-8") as f:
    f.write(code_updated)

print("Updated MarketTicker.tsx with all 50 Dhan NIFTY stocks successfully!")
