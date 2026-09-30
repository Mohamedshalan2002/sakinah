# -*- coding: utf-8 -*-
"""طباعة بنية استجابة /v1/methods كما هي."""
import json
import urllib.request

req = urllib.request.Request("https://api.aladhan.com/v1/methods",
                             headers={"User-Agent": "verify/1.0"})
with urllib.request.urlopen(req, timeout=30) as r:
    d = json.loads(r.read().decode())

print("top keys:", list(d.keys()))
data = d["data"]
print("data type:", type(data).__name__)
items = data.items() if isinstance(data, dict) else enumerate(data)
for k, v in items:
    print("-", k, "|", json.dumps(v, ensure_ascii=False)[:230])
