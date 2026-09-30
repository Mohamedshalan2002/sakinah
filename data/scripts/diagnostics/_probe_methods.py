# -*- coding: utf-8 -*-
"""معاملات طرق الحساب من AlAdhan (لمعرفة تعريف الفجر/العشاء الرسمي)."""
import json
import urllib.request

for m in (3, 4, 5, 13, 16, 1, 2):
    try:
        req = urllib.request.Request("https://api.aladhan.com/v1/methods/%d" % m,
                                     headers={"User-Agent": "verify/1.0"})
        with urllib.request.urlopen(req, timeout=25) as r:
            d = json.loads(r.read().decode())
        data = d["data"]
        params = data.get("params", {})
        print("%2d | %-45s | %s" % (m, data.get("name", "?")[:45],
                                    json.dumps(params, ensure_ascii=False)))
    except Exception as e:  # noqa: BLE001
        print(m, "ERR", e)
