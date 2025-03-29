"use client"

import { useEffect, useRef } from "react"
import { Loader2 } from "lucide-react"
import type { DetectionResult } from "@/types/detection"

interface DetectionResultsProps {
  results: DetectionResult | null
  image: string | null
  isProcessing: boolean
}

export default function DetectionResults({ results, image, isProcessing }: DetectionResultsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (results && image && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")

      if (!ctx) return

      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        // Set canvas dimensions to match image
        canvas.width = img.width
        canvas.height = img.height

        // Draw the original image
        ctx.drawImage(img, 0, 0)

        // Draw bounding boxes
        results.detections.forEach((detection) => {
          const { box, class_name, confidence } = detection
          const [x, y, width, height] = box

          // Draw rectangle
          ctx.strokeStyle = getColorForClass(class_name)
          ctx.lineWidth = 2
          ctx.strokeRect(x, y, width, height)

          // Draw label background
          const label = `${class_name} ${Math.round(confidence * 100)}%`
          const textMetrics = ctx.measureText(label)
          const textHeight = 20
          ctx.fillStyle = getColorForClass(class_name)
          ctx.fillRect(x, y - textHeight, textMetrics.width + 10, textHeight)

          // Draw label text
          ctx.fillStyle = "#ffffff"
          ctx.font = "14px Arial"
          ctx.fillText(label, x + 5, y - 5)
        })
      }
      img.src = image
    }
  }, [results, image])

  const getColorForClass = (className: string) => {
    // Map waste classes to colors
    const colorMap: Record<string, string> = {
      plastic: "#FF5733",
      paper: "#33A1FD",
      metal: "#B533FF",
      glass: "#33FF57",
      organic: "#FFD133",
      other: "#FF33A8",
    }

    return colorMap[className.toLowerCase()] || "#FF5733"
  }

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-sm text-muted-foreground">Processing image...</p>
      </div>
    )
  }

  if (!results && !image) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p>Upload and process an image to see detection results</p>
      </div>
    )
  }

  if (!results && image) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p>Click "Detect Waste" to process this image</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="relative border rounded-md overflow-hidden">
        <canvas ref={canvasRef} className="max-w-full h-auto" />
      </div>

      {results && (
        <div className="space-y-2">
          <h3 className="font-medium">Detection Summary</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-secondary/50 p-2 rounded-md">
              <p className="text-sm font-medium">Objects Detected</p>
              <p className="text-2xl font-bold">{results.detections.length}</p>
            </div>
            <div className="bg-secondary/50 p-2 rounded-md">
              <p className="text-sm font-medium">Processing Time</p>
              <p className="text-2xl font-bold">{results.processing_time.toFixed(2)}s</p>
            </div>
          </div>

          <h3 className="font-medium mt-2">Detected Classes</h3>
          <div className="space-y-1">
            {Object.entries(results.class_counts).map(([className, count]) => (
              <div key={className} className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: getColorForClass(className) }} />
                <span className="text-sm">
                  {className}: {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

