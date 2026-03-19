import json
import os
import shutil
import time
from datetime import datetime

FEEDBACK_FILE = "feedback.json"
IMAGE_FOLDER = "feedback_images"


def store_feedback(image, predictions,
                   predicted_damage, corrected_damage,
                   predicted_severity, corrected_severity,
                   corrected_bbox=None):

    # ---------------------------
    # CREATE FOLDER IF NOT EXISTS
    # ---------------------------
    if not os.path.exists(IMAGE_FOLDER):
        os.makedirs(IMAGE_FOLDER)

    # ---------------------------
    # SAVE IMAGE COPY (UNIQUE NAME)
    # ---------------------------
    image_name = str(int(time.time())) + "_" + os.path.basename(image)
    saved_path = os.path.join(IMAGE_FOLDER, image_name)

    try:
        shutil.copy(image, saved_path)
    except:
        saved_path = image

    # ---------------------------
    # REWARD LOGIC
    # ---------------------------
    reward = 1 if (
        predicted_damage == corrected_damage and
        predicted_severity == corrected_severity
    ) else -1

    # ---------------------------
    # FEEDBACK OBJECT
    # ---------------------------
    feedback = {
        "image": saved_path,
        "predicted_damage": predicted_damage,
        "corrected_damage": corrected_damage,
        "predicted_severity": predicted_severity,
        "corrected_severity": corrected_severity,
        "bbox": corrected_bbox if corrected_bbox else None,
        "reward": reward,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    # ---------------------------
    # LOAD EXISTING DATA
    # ---------------------------
    if os.path.exists(FEEDBACK_FILE):
        try:
            with open(FEEDBACK_FILE, "r") as f:
                data = json.load(f)
        except:
            data = []
    else:
        data = []

    # ---------------------------
    # APPEND & SAVE
    # ---------------------------
    data.append(feedback)

    with open(FEEDBACK_FILE, "w") as f:
        json.dump(data, f, indent=4)

    print("Feedback stored successfully!")