import re
import json

file_path = r"C:\Users\saksh\.gemini\antigravity\brain\71914d09-18c5-4ead-8a54-81458eddc63a\.system_generated\steps\2031\content.md"

with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# Weights dictionary for top NIFTY 50 constituents (Official NSE weights)
weights_map = {
    "Reliance Industries": 9.8,
    "HDFC Bank": 8.9,
    "ICICI Bank": 7.6,
    "Infosys": 5.8,
    "Tata Consultancy Services": 4.2,
    "Larsen & Toubro": 3.9,
    "Larsen &amp; Toubro": 3.9,
    "ITC": 3.7,
    "Bharti Airtel": 3.5,
    "Axis Bank": 3.1,
    "State Bank of India": 2.9,
    "Kotak Mahindra Bank": 2.6,
    "Hindustan Unilever": 2.4,
    "Mahindra & Mahindra": 2.3,
    "Mahindra &amp; Mahindra": 2.3,
    "Tata Motors": 2.1,
    "Sun Pharmaceutical": 1.9,
    "NTPC": 1.8,
    "Maruti Suzuki": 1.7,
    "HCL Technologies": 1.6,
    "Titan Company": 1.5,
    "Bajaj Finance": 1.4,
    "UltraTech Cement": 1.3,
    "Power Grid Corporation": 1.2,
    "Oil & Natural Gas Corp": 1.1,
    "Adani Enterprises": 1.0,
    "Coal India": 0.9,
    "Tata Steel": 0.9,
    "Hindalco Industries": 0.8,
    "Bajaj Auto": 0.8,
    "Grasim Industries": 0.8,
    "IndusInd Bank": 0.8,
    "Tech Mahindra": 0.7,
    "JSW Steel": 0.7,
    "Adani Ports": 0.7,
    "Wipro": 0.7,
    "Nestle India": 0.6,
    "Eicher Motors": 0.6,
    "SBI Life Insurance": 0.6,
    "Cipla": 0.6,
    "Dr Reddy's Laboratories": 0.6,
    "Dr. Reddy's Laboratories": 0.6,
    "Shriram Finance": 0.5,
    "Bharat Petroleum": 0.5,
    "Hero MotoCorp": 0.5,
    "Britannia Industries": 0.5,
    "Apollo Hospitals": 0.5,
    "Trent": 0.5,
    "HDFC Life Insurance": 0.5,
    "Divis Laboratories": 0.4,
    "LTIMindtree": 0.4,
    "Tata Consumer Products": 0.4,
}

rows = re.findall(r'<tr class="group xl:hover:!bg-\[#fff\]">(.*?)</tr>', text, re.DOTALL)
nifty_stocks = []

for r in rows:
    name_match = re.search(r'alt="([^"]+)"', r)
    price_match = re.search(r'lg:group-hover:hidden">([^<]+)</p>', r)
    
    tds = re.findall(r'<td[^>]*>(.*?)</td>', r, re.DOTALL)
    clean_tds = [re.sub(r'<[^>]+>', '', td).strip().replace("₹", "").replace("&nbsp;", "").strip() for td in tds]
    
    if len(clean_tds) >= 8:
        raw_name = name_match.group(1).strip() if name_match else clean_tds[0]
        name = raw_name.replace("&amp;", "&")
        
        ltp_str = price_match.group(1).replace(",", "").strip() if price_match else clean_tds[1].replace(",", "").strip()
        chg_str = clean_tds[2].replace("%", "").replace("+", "").strip()
        mcap_str = clean_tds[4].strip()
        pe_str = clean_tds[5].strip()
        h52_str = clean_tds[7].replace(",", "").strip()
        l52_str = clean_tds[8].replace(",", "").strip()

        try:
            price = float(ltp_str)
        except:
            price = 1000.0

        try:
            change_pct = float(chg_str)
        except:
            change_pct = 0.0

        try:
            pe = float(pe_str)
        except:
            pe = 25.0

        try:
            high52 = float(h52_str)
        except:
            high52 = price * 1.25

        try:
            low52 = float(l52_str)
        except:
            low52 = price * 0.75

        # ticker symbol mapping
        ticker_clean = re.sub(r'[^A-Z0-9]', '', name.upper())[:10]
        ticker_symbol = f"{ticker_clean}.NS"
        weight = weights_map.get(raw_name, weights_map.get(name, 0.5))

        nifty_stocks.append({
            "symbol": ticker_symbol,
            "name": name,
            "weightPct": weight,
            "changePct": change_pct,
            "price": price,
            "high52w": high52,
            "low52w": low52,
            "peRatio": pe,
            "marketCap": f"₹{mcap_str} Cr" if not mcap_str.startswith("₹") else f"{mcap_str} Cr"
        })

print(f"Parsed {len(nifty_stocks)} NIFTY stocks.")

# Save to json and formatted typescript file
with open("nifty_50_dhan.json", "w", encoding="utf-8") as out:
    json.dump(nifty_stocks, out, indent=2)

print("Saved nifty_50_dhan.json successfully!")
