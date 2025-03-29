from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import torch
import time
from PIL import Image
import io
import uvicorn
from pydantic import BaseModel
from typing import List, Dict, Optional
import os
import traceback
from ultralytics import YOLO
app = FastAPI(title="Waste Detection API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Check if model file exists
model_path = os.environ.get('backend/best.pt', 'best.pt')
model_exists = os.path.exists(model_path)

# Load the YOLO model
model = YOLO('best.pt')
if model_exists:
    try:
        model = torch.hub.load('ultralytics/yolov8', 'custom', path=model_path)
        print(f"Model loaded successfully from {model_path}")
    except Exception as e:
        print(f"Error loading model: {e}")
        traceback.print_exc()
else:
    print(f"Model file not found at {model_path}")

class Detection(BaseModel):
    box: List[float]
    class_name: str
    confidence: float

class DetectionResponse(BaseModel):
    detections: List[Detection]
    processing_time: float
    class_counts: Dict[str, int]

class ErrorResponse(BaseModel):
    error: str
    details: Optional[str] = None

@app.post("/detect", response_model=DetectionResponse, responses={500: {"model": ErrorResponse}})
async def detect_waste(image: UploadFile = File(...)):
    # Check if model is loaded
    if model is None:
        raise HTTPException(
            status_code=500, 
            detail=f"Model not loaded. Check if the model file exists at {model_path} and the model can be loaded correctly."
        )
    
    try:
        # Read image
        contents = await image.read()
        print(f"Received image: {image.filename}, size: {len(contents)} bytes")
        
        # Open and validate the image
        try:
            img = Image.open(io.BytesIO(contents))
            img.verify()  # Verify that it's a valid image
            img = Image.open(io.BytesIO(contents))  # Reopen after verify
        except Exception as e:
            print(f"Invalid image: {e}")
            raise HTTPException(status_code=400, detail=f"Invalid image: {str(e)}")
        
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
        for box in results[0].boxes:  # Access the first image's predictions
            x1, y1, x2, y2 = box.xyxy[0].tolist()  # Bounding box coordinates
            conf = box.conf[0].item()  # Confidence score
            cls = box.cls[0].item()  # Class index
            class_name = model.names[int(cls)]  # Class name

            # Update class counts
            if class_name in class_counts:
                class_counts[class_name] += 1
            else:
                class_counts[class_name] = 1

            detections.append(Detection(
                box=[float(x1), float(y1), float(x2 - x1), float(y2 - y1)],
                class_name=class_name,
                confidence=float(conf)
            ))
        
        response = DetectionResponse(
            detections=detections,
            processing_time=processing_time,
            class_counts=class_counts
        )
        
        print(f"Processed image with {len(detections)} detections in {processing_time:.2f}s")
        return response
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"Error processing image: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "model_path": model_path,
        "model_exists": model_exists
    }

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FASTAPI_DEBUG', 'True').lower() == 'true'
    host = os.environ.get('HOST', '0.0.0.0')
    
    print(f"Starting FastAPI server on {host}:{port}, debug={debug}")
    uvicorn.run("fastapi_app:app", host=host, port=port, reload=debug)

