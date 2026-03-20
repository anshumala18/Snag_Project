import requests

API_KEY = "lbwkD7HDSp5nGaDFrl1C"
MODEL_ID = "building_damage_detection_v4/1"


def detect_snag(image_path):

    url = f"https://serverless.roboflow.com/{MODEL_ID}"

    params = {
        "api_key": API_KEY
    }

    try:
        with open(image_path, "rb") as f:
            response = requests.post(url, params=params, files={"file": f})

        result = response.json()
        # print("ROBOFLOW RAW:", result) # For debugging
        return result

    except Exception as e:
        print("Error in detection:", e)
        return {"predictions": []}


if __name__ == "__main__":
    result = detect_snag("test.jpg")
    print(result)