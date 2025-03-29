from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import time
import io
from PIL import Image
import traceback
import os

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Enable CORS for all routes and origins

# Check if model file exists
model_path = os.environ.get('backend/best.pt', 'best.pt')
model_exists = os.path.exists(model_path)

# Load the YOLO model
model = None
if model_exists:
    try:
        model = torch.hub.load('ultralytics/yolov5', 'custom', path=model_path)
        print(f"Model loaded successfully from {model_path}")
    except Exception as e:
        print(f"Error loading model: {e}")
        traceback.print_exc()
else:
    print(f"Model file not found at {model_path}")

@app.route('/detect', methods=['POST'])
def detect_waste():
    # Check if model is loaded
    if model is None:
        return jsonify({
            "error": f"Model not loaded. Check if the model file exists at {model_path} and the model can be loaded correctly."
        }), 500
    
    # Check if image is in request
    if 'image' not in request.files:
        return jsonify({"error": "No image provided in the request"}), 400
    
    try:
        # Get the image from the request
        image_file = request.files['image']
        print(f"Received image: {image_file.filename}, size: {image_file.content_length} bytes")
        
        # Open and validate the image
        try:
            img = Image.open(image_file.stream)
            img.verify()  # Verify that it's a valid image
            img = Image.open(image_file.stream)  # Reopen after verify
        except Exception as e:
            print(f"Invalid image: {e}")
            return jsonify({"error": f"Invalid image: {str(e)}"}), 400
        
        # Start timing
        start_time = time.time()
        
        # Run inference
        results = model(img)
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        # Process results
        detections = []
        class_counts = {}
        
        # Convert results to JSON-serializable format
        for pred in results[0]:  # Process first image predictions (batch[0])
            x1, y1, x2, y2, conf, cls = pred.tolist()
            class_name = results.names[int(cls)]
            
            # Update class counts
            if class_name in class_counts:
                class_counts[class_name] += 1
            else:
                class_counts[class_name] = 1
            
            detections.append({
                "box": [float(x1), float(y1), float(x2 - x1), float(y2 - y1)],
                "class_name": class_name,
                "confidence": float(conf)
            })
        
        response_data = {
            "detections": detections,
            "processing_time": processing_time,
            "class_counts": class_counts
        }
        
        print(f"Processed image with {len(detections)} detections in {processing_time:.2f}s")
        return jsonify(response_data)
        
    except Exception as e:
        print(f"Error processing image: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# Add a simple health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "ok",
        "model_loaded": model is not None,
        "model_path": model_path,
        "model_exists": model_exists
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    host = os.environ.get('HOST', '0.0.0.0')
    
    print(f"Starting Flask server on {host}:{port}, debug={debug}")
    app.run(host=host, port=port, debug=debug)

