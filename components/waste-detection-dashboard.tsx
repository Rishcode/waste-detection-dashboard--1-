"use client"

import { useState } from "react"
import { Upload, Trash2, RefreshCw, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import ImageUploader from "./image-uploader"
import DetectionResults from "./detection-results"
import DetectionHistory from "./detection-history"
import type { DetectionResult } from "@/types/detection"

// Mock data for testing without a backend
const MOCK_RESULT: DetectionResult = {
  detections: [
    {
      box: [50, 50, 200, 150],
      class_name: "plastic",
      confidence: 0.92,
    },
    {
      box: [300, 100, 150, 200],
      class_name: "paper",
      confidence: 0.87,
    },
    {
      box: [150, 300, 100, 100],
      class_name: "glass",
      confidence: 0.76,
    },
  ],
  processing_time: 0.45,
  class_counts: {
    plastic: 1,
    paper: 1,
    glass: 1,
  },
}

export default function WasteDetectionDashboard() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentImage, setCurrentImage] = useState<string | null>(null)
  const [results, setResults] = useState<DetectionResult | null>(null)
  const [history, setHistory] = useState<
    Array<{
      id: string
      image: string
      timestamp: Date
      results: DetectionResult
    }>
  >([])
  const [error, setError] = useState<string | null>(null)
  const [useMockData, setUseMockData] = useState(false)
  const [apiUrl, setApiUrl] = useState("http://localhost:5000/detect")

  const handleImageUpload = (imageDataUrl: string) => {
    setCurrentImage(imageDataUrl)
    setResults(null)
    setError(null)
  }

  const processImage = async () => {
    if (!currentImage) return

    setIsProcessing(true)
    setError(null)

    try {
      let data: DetectionResult

      if (useMockData) {
        // Use mock data for testing UI without backend
        await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate API delay
        data = MOCK_RESULT
      } else {
        // Convert base64 image to blob for sending to API
        const base64Data = currentImage.split(",")[1]
        const blob = await fetch(`data:image/jpeg;base64,${base64Data}`).then((res) => res.blob())

        // Create form data to send to API
        const formData = new FormData()
        formData.append("image", blob, "image.jpg")

        console.log(`Sending request to: ${apiUrl}`)

        // Send to backend API
        const response = await fetch(apiUrl, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Server responded with status ${response.status}: ${errorText}`)
        }

        data = await response.json()
        console.log("API Response:", data)
      }

      setResults(data)

      // Add to history
      const newHistoryItem = {
        id: Date.now().toString(),
        image: currentImage,
        timestamp: new Date(),
        results: data,
      }

      setHistory((prev) => [newHistoryItem, ...prev])
    } catch (error) {
      console.error("Error processing image:", error)
      setError(error instanceof Error ? error.message : "Failed to process image. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const clearCurrent = () => {
    setCurrentImage(null)
    setResults(null)
    setError(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Waste Detection Dashboard</h1>
        <p className="text-muted-foreground">
          Upload images of waste for detection and classification using our YOLO model
        </p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList>
          <TabsTrigger value="upload">Upload & Detect</TabsTrigger>
          <TabsTrigger value="history">Detection History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Image</CardTitle>
                <CardDescription>Upload an image of waste for detection</CardDescription>
              </CardHeader>
              <CardContent>
                <ImageUploader onImageSelected={handleImageUpload} currentImage={currentImage} />

                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={clearCurrent} disabled={!currentImage || isProcessing}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear
                </Button>
                <Button onClick={processImage} disabled={!currentImage || isProcessing}>
                  {isProcessing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Detect Waste
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detection Results</CardTitle>
                <CardDescription>View the detection results from the YOLO model</CardDescription>
              </CardHeader>
              <CardContent className="min-h-[300px]">
                <DetectionResults results={results} image={currentImage} isProcessing={isProcessing} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Detection History</CardTitle>
              <CardDescription>View your previous waste detection results</CardDescription>
            </CardHeader>
            <CardContent>
              <DetectionHistory history={history} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>Configure the waste detection dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="mock-mode">Use Mock Data</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable this to test the UI without a backend connection
                  </p>
                </div>
                <Switch id="mock-mode" checked={useMockData} onCheckedChange={setUseMockData} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-url">API Endpoint URL</Label>
                <div className="flex gap-2">
                  <input
                    id="api-url"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="http://localhost:5000/detect"
                  />
                  <Button variant="outline" onClick={() => setApiUrl("http://localhost:5000/detect")}>
                    Reset
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">The URL where your Flask/FastAPI backend is running</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

