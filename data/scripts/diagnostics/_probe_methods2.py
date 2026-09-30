# -*- coding: utf-8 -*-
"""معاملات طرق الحساب من AlAdhan (المسار الصحيح: /v1/methods)."""
import json
import urllib.request

req = urllib.request.Request("https://api.aladhan.com/v1/methods",
                             headers={"User-Agent": "verify/1.0"})
with urllib.request.urlopen(req, timeout=30) as r:
    d = json.loads(r.read().decode())

data = d["data"]
print("عدد الطرق:", len(data))
for key, v in sorted(data.items(), key=lambda x: int(x[0]) if x[0].isdigit() else 999):
    if not str(key).isdigit():
        continue
    params = v.get("params", {})
    print("%2s | %-42s | %s" % (key, str(v.get("name"))[:42],
                                json.dumps(params, ensure_ascii=False)))
