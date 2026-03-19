from vision_agent import detect_snag
from analysis_agent import analyze
from report_agent import generate_report
from draw_boxes import filter_predictions, merge_boxes, draw_merged_box

import sys
import json
import os
import cv2


def run_pipeline(image):

    #print("PIPELINE STARTED")
   
    base_dir = os.path.dirname(os.path.abspath(__file__))

    image = os.path.join(base_dir, "..", image)
    image = os.path.abspath(image)

    #print("FINAL PATH:", image)
    # print(" EXISTS:", os.path.exists(image))

    if not os.path.exists(image):
      return{"error": "Image not found"}

    # ---------------------------
    # VISION AGENT
    # ---------------------------
    result = detect_snag(image)

    if "predictions" not in result:
        return {"error": "Model error"}

    predictions = result["predictions"]

    # ---------------------------
    # ANALYSIS AGENT
    # ---------------------------
    analysis = analyze(predictions)

    predicted_severity = analysis["severity"]
    avg_confidence = analysis["avg_confidence"]
    #avg_confidence = analysis.get("avg_confidence", 0.9)

    if len(predictions) > 0:
         best_pred = max(predictions, key=lambda x: x.get("confidence", 0))
         predicted_damage = best_pred["class"]
    else:
        predicted_damage = "No Damage"

    # ---------------------------
    # IMAGE PROCESSING
    # ---------------------------
    img = cv2.imread(image)

    if img is None:
        return {"error": "Image read error"}

    h, w = img.shape[:2]

    preds = filter_predictions(predictions, w, h)
    merged_box = merge_boxes(preds)

    # ✅ IMPORTANT: GET OUTPUT IMAGE NAME
    output_image = draw_merged_box(
        image,
        merged_box,
        predicted_severity,
        predicted_damage
    )

    # ---------------------------
    # REPORT (optional)
    # ---------------------------
    report = generate_report(predicted_damage, predicted_severity, image)

    # ---------------------------
    # FINAL OUTPUT (IMPORTANT)
    # ---------------------------
    return {
        "damage_type": predicted_damage,
        "severity": predicted_severity,
        "confidence": avg_confidence,
        "total_detections": len(predictions),
        "predictions": predictions,
        "output_image": output_image   # ✅ ADDED
    }


# ---------------------------
# ENTRY POINT (FOR NODE)
# ---------------------------
if __name__ == "__main__":
    image_path = sys.argv[1]
    result = run_pipeline(image_path)

    print(json.dumps(result))