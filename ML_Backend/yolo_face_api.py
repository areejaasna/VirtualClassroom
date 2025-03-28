from flask import Flask, request, jsonify
import cv2
import numpy as np
from tensorflow import keras
from ultralytics import YOLO  # For YOLOv8 face detection

# Load your pre-trained FER model
def load_model():
    model_path = "./model/model1.h5"  # Path to your FER model
    model = keras.models.load_model(model_path)
    return model

# Preprocess image for your FER model (48x48 grayscale)
def preprocess_image(image):
    image = image[:, :, 0]  # Convert to grayscale if it's RGB (use only one channel)
    resized_img = cv2.resize(image, (48, 48), interpolation=cv2.INTER_AREA)
    return resized_img

# Decode the model's prediction to an emotion label
def decode_prediction(prediction):
    expression_classes = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise']
    expression_index = np.argmax(prediction)
    return expression_classes[expression_index]

# Predict emotion using your FER model
def predict_expression(face_image):
    preprocessed_image = preprocess_image(face_image)
    prediction = model.predict(np.expand_dims(preprocessed_image, axis=0))
    return decode_prediction(prediction)

# Load YOLO model for face detection (e.g., YOLOv8n trained on face detection)
face_detector = YOLO("./model/yolov11n-face.pt")  # You can use any YOLOv8 model tuned for face detection

app = Flask(__name__)

@app.route("/predict", methods=["POST"])
def predict_facial_expression():
    if request.method == "POST":
        if request.files.get("image"):
            image_file = request.files["image"]
            image_bytes = image_file.read()
            image_array = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)

            # Detect faces using YOLO
            results = face_detector(image_array)
            emotions = []

            # Iterate through each detected face, crop, and predict emotion
            for result in results[0].boxes:
                x1, y1, x2, y2 = map(int, result.xyxy[0])  # Bounding box coordinates
                face_crop = image_array[y1:y2, x1:x2]  # Crop detected face

                # Predict emotion for each face
                emotion = predict_expression(face_crop)
                emotions.append({
                    "bounding_box": [x1, y1, x2, y2],
                    "emotion": emotion
                })

            return jsonify({"detected_faces": emotions})
        else:
            return jsonify({"error": "No image file provided"}), 400
    else:
        return jsonify({"error": "Unsupported request method"}), 405

if __name__ == "__main__":
    model = load_model()  # Load FER model once before starting the server
    app.run(host="0.0.0.0", debug=False)
