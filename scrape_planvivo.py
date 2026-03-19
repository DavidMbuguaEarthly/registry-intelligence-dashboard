import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
import json

BASE_URL = "https://mer.markit.com/br-reg/public/index.jsp"
PARAMS_BASE = {
    "entity": "retirement", "srd": "false", "name": "plan vivo",
    "standardId": "", "acronym": "", "additionalCertificationId": "",
    "unitClass": "", "sort": "account_name", "dir": "ASC", "categoryId": ""
}
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Referer": "https://mer.markit.com/br-reg/public/index.jsp",
}
records = []
TOTAL_PAGES = 323
print(f"Starting Plan Vivo scrape (~{TOTAL_PAGES} pages, ~8-10 mins)...\n")
for page_num, start in enumerate(range(0, TOTAL_PAGES * 15, 15), start=1):
    try:
        resp = requests.get(BASE_URL, params={**PARAMS_BASE, "start": start}, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        table = soup.find("table", {"class": "dataTable"}) or soup.find("table")
        if not table:
            print(f"Page {page_num}: No table — stopping."); break
        data_rows = [r for r in table.find_all("tr") if r.find("td")]
        if not data_rows:
            print(f"Page {page_num}: No rows — stopping."); break
        page_count = 0
        for row in data_rows:
            t = [c.get_text(strip=True) for c in row.find_all("td")]
            if len(t) < 7: continue
            records.append({
                "retirement_date": t[0], "vintage": t[1], "project": t[2],
                "account": t[3], "beneficial_owner": t[4], "standard": t[5],
                "project_type": t[6], "retirement_quantity": t[7] if len(t) > 7 else "",
                "measurement": t[8] if len(t) > 8 else "", "type": t[9] if len(t) > 9 else "",
            })
            page_count += 1
        print(f"  Page {page_num:>3}/{TOTAL_PAGES} | +{page_count} rows | total: {len(records)}")
        time.sleep(1.5)
    except Exception as e:
        print(f"  Page {page_num}: Error — {e}"); time.sleep(3)

print(f"\nDone! Total rows: {len(records)}")
with open("plan_vivo_retirements.json", "w") as f:
    json.dump({"retirements": records}, f, indent=2)
df = pd.DataFrame(records)
df.to_csv("plan_vivo_retirements.csv", index=False)
print("Saved: plan_vivo_retirements.json + plan_vivo_retirements.csv")
print(f"\nUnique accounts: {df['account'].nunique()}")
print(f"\nTop 10 accounts:\n{df['account'].value_counts().head(10).to_string()}")
