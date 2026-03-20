from vision_agent import detect_snag
from analysis_agent import analyze
from report_agent import generate_report
from draw_boxes import filter_predictions, merge_boxes, draw_merged_box
from learning_agent import store_feedback

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
    predicted_crack_type = analysis.get("crack_type", "Hairline")
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
    # AGENTIC DECISION (Contractor Matching)
    # ---------------------------
    # Mapping Roboflow classes & Refined Crack Types to Contractor Categories
    SPEC_MAPPING = {
        # Raw Roboflow Tags
        "crack": "Structural",
        "spalling": "Civil",
        "efflorescence": "Civil",
        "corrosion": "General",
        "stains": "General",
        "leak": "Plumbing",
        "wire": "Electrical",
        
        # Refined Crack Types (from analysis_agent)
        "Hairline": "Civil",
        "Surface": "Civil",
        "Structural": "Structural"
    }
    
    # Try mapping by crack type first, then by raw damage label
    recommended_spec = SPEC_MAPPING.get(predicted_crack_type, 
                        SPEC_MAPPING.get(predicted_damage.lower(), "General"))

    # ---------------------------
    # FINAL OUTPUT (IMPORTANT)
    # ---------------------------
    return {
        "damage_type": predicted_damage,
        "crack_type": predicted_crack_type, # ✨ REFINED TYPE
        "severity": predicted_severity,
        "confidence": avg_confidence,
        "total_detections": len(predictions),
        "predictions": predictions,
        "output_image": output_image,
        "recommended_specialization": recommended_spec
    }


# ---------------------------
# ENTRY POINT (FOR NODE)
# ---------------------------
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python pipeline.py <image_path>")
        sys.exit(1)

    image_path = sys.argv[1]
    result = run_pipeline(image_path)

    # ---------------------------
    # INTERACTIVE FEEDBACK SECTION (New Feature)
    # ---------------------------
    if sys.stdin.isatty():
        print("\nFeedback Section")
        is_correct = input("Is prediction correct? (yes/no): ").strip().lower()

        if is_correct == "no":
            correct_damage = input("Enter correct damage type: ").strip()
            correct_severity = input("Enter correct severity (Minor/Moderate/Severe): ").strip()
            
            give_bbox = input("Do you want to give bounding box? (yes/no): ").strip().lower()
            corrected_bbox = None
            
            if give_bbox == "yes":
                try:
                    print("Enter bounding box coordinates:")
                    x1 = int(input("  Top-left X: "))
                    y1 = int(input("  Top-left Y: "))
                    x2 = int(input("  Bottom-right X: "))
                    y2 = int(input("  Bottom-right Y: "))
                    corrected_bbox = [x1, y1, x2, y2]
                except ValueError:
                    print("Invalid coordinates. Skipping bbox.")

            # Store feedback for learning
            store_feedback(
                image_path, result.get("predictions", []),
                result["damage_type"], correct_damage,
                result["severity"], correct_severity,
                corrected_bbox
            )

            # Re-generate visuals/reports with feedback
            # from draw_boxes import draw_merged_box # Already imported
            # from report_agent import generate_report # Already imported

            # Use corrected bbox or the merged one
            final_bbox = corrected_bbox if corrected_bbox else []
            
            # Update output image
            updated_image = draw_merged_box(
                image_path, final_bbox, correct_severity, correct_damage
            )
            print(f"Output image saved as {updated_image}")
            
            # Update report and email
            generate_report(correct_damage, correct_severity, image_path)
            print("Updated report saved")
            print("Updated email saved")
            
            print("Feedback applied!")
            
            # Update result object for final print
            result.update({
                "damage_type": correct_damage,
                "severity": correct_severity,
                "output_image": updated_image
            })

            print("\nPipeline completed successfully!")
        else:
             print("\nPipeline completed successfully!")
    else:
        # If not interactive, just print the JSON for Node.js
        print(json.dumps(result))