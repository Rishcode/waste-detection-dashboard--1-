export interface Detection {
  box: [number, number, number, number] // [x, y, width, height]
  class_name: string
  confidence: number
}

export interface DetectionResult {
  detections: Detection[]
  processing_time: number
  class_counts: Record<string, number>
}

