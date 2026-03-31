"""
Quick API test — sends sample_data.csv to /analyze and prints the result.
Run from the project root: py test_api.py
"""
import urllib.request, json, mimetypes, uuid, os

URL      = "http://127.0.0.1:5000/analyze"
CSV_PATH = os.path.join(os.path.dirname(__file__), "sample_data.csv")

# Build multipart/form-data manually
boundary = uuid.uuid4().hex
with open(CSV_PATH, "rb") as f:
    csv_bytes = f.read()

body = (
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="file"; filename="sample_data.csv"\r\n'
    f"Content-Type: text/csv\r\n\r\n"
).encode() + csv_bytes + f"\r\n--{boundary}--\r\n".encode()

req = urllib.request.Request(
    URL,
    data=body,
    headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    method="POST",
)

try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read())
        print("=" * 54)
        print("  DLP Chart Analyzer -- API Test PASSED")
        print("=" * 54)
        print(f"  Rows            : {data['row_count']}")
        print(f"  Columns         : {data['col_count']}")
        print(f"  Numeric columns : {data['columns']}")
        print()
        print("  Mean values:")
        for col, val in data["mean"].items():
            print(f"    {col:20s} = {val:,.4f}")
        print()
        print("  Trends:")
        for col, trend in data["trends"].items():
            arrow = {"increasing": "UP", "decreasing": "DOWN", "flat": "FLAT"}[trend]
            print(f"    {col:20s} = {arrow}")
        print()
        print("  Predictions (next row):")
        for col, val in data["predictions"].items():
            print(f"    {col:20s} = {val:,.4f}")
        print()
        print("  Insights:")
        print(f"    {data['insights'][:200]}...")
        print("=" * 54)
except Exception as e:
    print(f"FAILED: {e}")
