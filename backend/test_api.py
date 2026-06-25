import requests
import json

url = "http://localhost:8001/api/series?year=2026&op=Venta&zona=Salamanca&tipo_zona=distrito"

try:
    response = requests.get(url)
    data = response.json()
    print(f"Status Code: {response.status_code}")
    print("Data for 2026:")
    for item in data:
        print(f"Month {item['mes']}: {item['precio_m2']:.0f}€ (Prediction: {item['is_prediction']})")
except Exception as e:
    print(f"Error: {e}")
