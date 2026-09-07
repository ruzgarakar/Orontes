import os
import json
import re
from datetime import datetime
import requests
from bs4 import BeautifulSoup
import firebase_admin
from firebase_admin import credentials, db

# 1. Firebase Yetkilendirmesi
service_account_env = os.environ.get("FIREBASE_SERVICE_ACCOUNT")

if service_account_env:
    cred_dict = json.loads(service_account_env)
    cred = credentials.Certificate(cred_dict)
else:
    cred = credentials.Certificate("service-account.json")

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred, {
        'databaseURL': 'https://orontes-886a3-default-rtdb.europe-west1.firebasedatabase.app'
    })

def clean_price(text):
    """Metin içerisindeki TL, boşluk gibi fazlalıkları temizleyip float döndürür."""
    clean = re.sub(r"[^\d,\.]", "", text).replace(",", ".")
    try:
        return float(clean)
    except (ValueError, TypeError):
        return 0.0

def scrape_market_prices():
    target_url = "https://hatay.bel.tr/hal-fiyatlari/"
    items = []
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    try:
        response = requests.get(target_url, headers=headers, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, "html.parser")
        
        rows = soup.select("table.hal-tablosu tbody tr")
        
        for row in rows:
            cols = row.find_all("td")
            if len(cols) >= 4:
                name = cols[0].get_text(strip=True)
                unit = cols[1].get_text(strip=True) or "KG"
                min_p = clean_price(cols[2].get_text(strip=True))
                max_p = clean_price(cols[3].get_text(strip=True))
                
                if min_p > 0 and max_p > 0:
                    avg_p = round((min_p + max_p) / 2, 2)
                    items.append({
                        "name": name,
                        "unit": unit,
                        "min": min_p,
                        "max": max_p,
                        "avg": avg_p,
                        "change": "stable"
                    })
    except Exception as e:
        print(f"Web kazıma uyarısı: {e}. Yedek piyasa bülteni devreye alınıyor.")

    # Kazıma yapılamazsa devreye girecek varsayılan referans listesi
    if not items:
        items = [
            { "name": "Samandağ Biberi", "unit": "KG", "min": 35.0, "max": 50.0, "avg": 42.5, "change": "up" },
            { "name": "Limon (Mayer)", "unit": "KG", "min": 18.0, "max": 26.0, "avg": 22.0, "change": "stable" },
            { "name": "Zeytin (Sofralık Yağlık)", "unit": "KG", "min": 60.0, "max": 95.0, "avg": 77.5, "change": "up" },
            { "name": "Domates (Sera)", "unit": "KG", "min": 20.0, "max": 32.0, "avg": 26.0, "change": "down" },
            { "name": "Hassa Üzümü", "unit": "KG", "min": 40.0, "max": 55.0, "avg": 47.5, "change": "stable" },
            { "name": "Havuç (Kırıkhan)", "unit": "KG", "min": 12.0, "max": 18.0, "avg": 15.0, "change": "down" },
            { "name": "Mandalina (Satsuma)", "unit": "KG", "min": 16.0, "max": 24.0, "avg": 20.0, "change": "up" }
        ]

    # Önceki günün verilerini güvenli okuma ve trend kıyaslaması
    ref = db.reference("marketPrices")
    raw_old_data = ref.get()
    old_data = raw_old_data if isinstance(raw_old_data, dict) else {}
    
    old_items_list = old_data.get("items", [])
    old_items = {}
    if isinstance(old_items_list, list):
        for it in old_items_list:
            if isinstance(it, dict) and "name" in it and "avg" in it:
                old_items[it["name"]] = it["avg"]
    elif isinstance(old_items_list, dict):
        for it in old_items_list.values():
            if isinstance(it, dict) and "name" in it and "avg" in it:
                old_items[it["name"]] = it["avg"]

    for item in items:
        if item["name"] in old_items:
            diff = item["avg"] - old_items[item["name"]]
            if diff > 0.5:
                item["change"] = "up"
            elif diff < -0.5:
                item["change"] = "down"
            else:
                item["change"] = "stable"

    # Firebase'e yazma
    payload = {
        "date": datetime.today().strftime('%d %B %Y'),
        "updatedAt": int(datetime.now().timestamp() * 1000),
        "market": "İskenderun & Antakya Toptancı Hali",
        "items": items
    }

    ref.set(payload)
    print("Market verileri Firebase'e başarıyla aktarıldı.")

if __name__ == "__main__":
    scrape_market_prices()
