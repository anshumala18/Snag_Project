def analyze(predictions):

    count = len(predictions)

    if count == 0:
        return {
            "damage_count": 0,
            "severity": "No Damage",
            "avg_confidence": 0
        }

    total_area = 0
    total_conf = 0

    for p in predictions:
        area = p["width"] * p["height"]
        total_area += area
        total_conf += p.get("confidence", 0)

    avg_area = total_area / count
    avg_confidence = total_conf / count

    # ---------------------------
    # SMART SEVERITY & CRACK TYPE LOGIC 🔥
    # ---------------------------
    if count >= 4 or avg_area > 50000:
        severity = "High"
        crack_type = "Structural"
    elif count >= 2 or avg_area > 20000:
        severity = "Medium"
        crack_type = "Surface"
    else:
        severity = "Low"
        crack_type = "Hairline"

    return {
        "damage_count": count,
        "severity": severity,
        "crack_type": crack_type,
        "avg_confidence": round(avg_confidence, 2)
    }