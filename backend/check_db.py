import sqlite3
import os

db_path = r'c:\Users\FX517\OneDrive\Desktop\TFM\FASE 4\data\madrid_intelligence.db'

if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- Years and Months in Dim_Tiempo ---")
cursor.execute("SELECT anio, MIN(mes), MAX(mes), COUNT(DISTINCT mes) FROM Dim_Tiempo GROUP BY anio ORDER BY anio")
rows = cursor.fetchall()
for row in rows:
    print(f"Year {row[0]}: Months {row[1]} to {row[2]} (Total {row[3]} months)")

print("\n--- Row counts in Fact tables ---")
cursor.execute("SELECT COUNT(*) FROM Fact_Operacion")
print(f"Fact_Operacion: {cursor.fetchone()[0]} rows")

cursor.execute("SELECT COUNT(*) FROM Fact_Prediccion")
print(f"Fact_Prediccion: {cursor.fetchone()[0]} rows")

# Check specific months in 2026 for Fact_Operacion
print("\n--- Fact_Operacion in 2026 (Months) ---")
cursor.execute("""
    SELECT t.mes, COUNT(*) 
    FROM Fact_Operacion f
    JOIN Dim_Tiempo t ON f.id_tiempo = t.id_tiempo
    WHERE t.anio = 2026
    GROUP BY t.mes
    ORDER BY t.mes
""")
for row in cursor.fetchall():
    print(f"Month {row[0]}: {row[1]} rows")

# Check Fact_Prediccion months
print("\n--- Fact_Prediccion months ---")
cursor.execute("SELECT DISTINCT anio, mes FROM Fact_Prediccion ORDER BY anio, mes")
for row in cursor.fetchall():
    print(f"Year {row[0]}, Month {row[1]}")

conn.close()
