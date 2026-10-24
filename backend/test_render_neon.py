import urllib.request, json, time

print("Waiting 2.5 minutes for Render to deploy debug endpoint...")
time.sleep(150)

print("Hitting /debug/db on Render...")
try:
    req = urllib.request.Request('https://prompthub-backend-ifv8.onrender.com/debug/db')
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read())
        print("\n=== RENDER DB DEBUG ===")
        for k, v in data.items():
            print(f"  {k}: {v}")
        print()
        if data.get('using_postgresql'):
            print("SUCCESS! Render IS using PostgreSQL!")
        else:
            print("FAIL: Render is still using SQLite.")
            print("DATABASE_URL set on Render:", data.get('database_url_set'))
            print("DATABASE_URL preview:", data.get('database_url_preview'))
except Exception as e:
    print("Error hitting debug endpoint:", e)
    print("Endpoint may not be live yet - try manually: https://prompthub-backend-ifv8.onrender.com/debug/db")
