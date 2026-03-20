import cv2
import time


# ---------------------------
# GRID OVERLAY
# ---------------------------
def draw_grid(image):

    h, w = image.shape[:2]
    step = 50

    for x in range(0, w, step):
        cv2.line(image, (x, 0), (x, h), (200, 200, 200), 1)
        cv2.putText(image, str(x), (x, 15),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)

    for y in range(0, h, step):
        cv2.line(image, (0, y), (w, y), (200, 200, 200), 1)
        cv2.putText(image, str(y), (5, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)

    return image


# ---------------------------
# FILTER PREDICTIONS
# ---------------------------
def filter_predictions(predictions, img_width, img_height, threshold=0.15):

    filtered = []

    for p in predictions:

        if p.get("confidence", 0) < threshold:
            continue

        if p.get("width", 0) > img_width * 0.9 and p.get("height", 0) > img_height * 0.9:
            continue

        filtered.append(p)

    return filtered


# ---------------------------
# MERGE BOXES
# ---------------------------
def merge_boxes(predictions):

    if len(predictions) == 0:
        return None

    xs, ys, xe, ye = [], [], [], []

    for p in predictions:

        x = p["x"]
        y = p["y"]
        w = p["width"]
        h = p["height"]

        x1 = x - w / 2
        y1 = y - h / 2
        x2 = x + w / 2
        y2 = y + h / 2

        xs.append(x1)
        ys.append(y1)
        xe.append(x2)
        ye.append(y2)

    return {
        "x1": int(max(0, min(xs))),
        "y1": int(max(0, min(ys))),
        "x2": int(max(xe)),
        "y2": int(max(ye))
    }


# ---------------------------
# DRAW OUTPUT IMAGE
# ---------------------------
def draw_merged_box(image_path, box, severity, damage_type):

    image = cv2.imread(image_path)

    if image is None:
        #print("Error loading image")
        return

    # GRID
    image = draw_grid(image)

    # UNIQUE OUTPUT FILE
    #output_file = f"output_{int(time.time())}.jpg"
    output_file = f"snag-detection-system/output_{int(time.time())}.jpg"
   
    h, w = image.shape[:2]

    # --------------------------- 
    # NO DAMAGE CASE
    # ---------------------------
    if box is None:

        label = "No Damage Detected"

        font_scale = 1.0
        thickness = 2
  
        (text_w, text_h), _ = cv2.getTextSize(
            label,
            cv2.FONT_HERSHEY_SIMPLEX,
            font_scale,
            thickness
        )

        # AUTO RESIZE
        while text_w > w * 0.9:
            font_scale -= 0.1

            if font_scale < 0.3:
                break

            (text_w, text_h), _ = cv2.getTextSize(
                label,
                cv2.FONT_HERSHEY_SIMPLEX,
                font_scale,
                thickness
            )

        # CENTER TEXT
        text_x = (w - text_w) // 2
        text_y = (h // 2)

        # BACKGROUND
        cv2.rectangle(
            image,
            (text_x - 10, text_y - text_h - 10),
            (text_x + text_w + 10, text_y + 10),
            (0, 255, 0),
            -1
        )

        # TEXT
        cv2.putText(
            image,
            label,
            (text_x, text_y),
            cv2.FONT_HERSHEY_SIMPLEX,
            font_scale,
            (0, 0, 0),
            thickness
        )

        cv2.imwrite(output_file, image)
        print("Output image saved as", output_file)
        return

    # ---------------------------
    # SAFE BOX
    # ---------------------------
    x1 = max(0, box["x1"])
    y1 = max(0, box["y1"])
    x2 = min(w, box["x2"])
    y2 = min(h, box["y2"])

    cv2.rectangle(image, (x1, y1), (x2, y2), (0, 255, 0), 3)

    # ---------------------------
    # LABEL
    # ---------------------------
    label = f"Damage: {damage_type} | Severity: {severity}"

    font_scale = 0.6
    thickness = 2

    (text_w, text_h), _ = cv2.getTextSize(
        label,
        cv2.FONT_HERSHEY_SIMPLEX,
        font_scale,
        thickness
    )

    # AUTO RESIZE LABEL
    while text_w > w * 0.9:
        font_scale -= 0.05

        if font_scale < 0.3:
            break

        (text_w, text_h), _ = cv2.getTextSize(
            label,
            cv2.FONT_HERSHEY_SIMPLEX,
            font_scale,
            thickness
        )

    # ---------------------------
    # SMART POSITION
    # ---------------------------
    text_x = x1
    text_y = y1 - 10

    # TOP FIX
    if text_y < text_h + 10:
        text_y = y1 + text_h + 10

    # RIGHT FIX
    if text_x + text_w > w:
        text_x = w - text_w - 10

    # LEFT FIX
    if text_x < 0:
        text_x = 10

    # ---------------------------
    # BACKGROUND
    # ---------------------------
    x_start = max(0, text_x - 5)
    y_start = max(0, text_y - text_h - 5)
    x_end = min(w, text_x + text_w + 5)
    y_end = min(h, text_y + 5)

    cv2.rectangle(image, (x_start, y_start), (x_end, y_end), (0, 255, 0), -1)

    # ---------------------------
    # TEXT
    # ---------------------------
    cv2.putText(
        image,
        label,
        (int(text_x), int(text_y)),
        cv2.FONT_HERSHEY_SIMPLEX,
        font_scale,
        (0, 0, 0),
        thickness
    )

    # ---------------------------
    # SAVE
    # ---------------------------
    cv2.imwrite(output_file, image)
    return output_file.split("/")[-1]   
    #print("Output image saved as", output_file)