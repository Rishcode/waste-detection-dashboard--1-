import requests
import argparse
import os
import sys
from PIL import Image
import io

def test_health(url):
    """Test the health endpoint"""
    try:
        response = requests.get(f"{url}/health")
        response.raise_for_status()
        print("Health check response:")
        print(response.json())
        return True
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_detection(url, image_path):
    """Test the detection endpoint with an image"""
    if not os.path.exists(image_path):
        print(f"Image file not found: {image_path}")
        return False
    
    try:
        # Verify the image can be opened
        img = Image.open(image_path)
        print(f"Image loaded: {image_path}, size: {img.size}, mode: {img.mode}")
        
        # Send the image to the API
        with open(image_path, 'rb') as f:
            files = {'image': (os.path.basename(image_path), f, 'image/jpeg')}
            print(f"Sending request to {url}/detect")
            response = requests.post(f"{url}/detect", files=files)
        
        # Check the response
        if response.status_code == 200:
            result = response.json()
            print("\nDetection successful!")
            print(f"Processing time: {result.get('processing_time', 'N/A')}s")
            print(f"Detections: {len(result.get('detections', []))}")
            print(f"Class counts: {result.get('class_counts', {})}")
            return True
        else:
            print(f"Detection failed with status code {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"Detection test failed: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Test the waste detection API")
    parser.add_argument("--url", default="http://localhost:5000", help="API base URL")
    parser.add_argument("--image", help="Path to test image")
    args = parser.parse_args()
    
    print(f"Testing API at {args.url}")
    
    # Test health endpoint
    if not test_health(args.url):
        print("Health check failed, exiting")
        sys.exit(1)
    
    # Test detection endpoint if image provided
    if args.image:
        if not test_detection(args.url, args.image):
            print("Detection test failed")
            sys.exit(1)
    else:
        print("\nNo test image provided. To test detection, use --image argument.")
    
    print("\nAll tests passed!")

if __name__ == "__main__":
    main()

