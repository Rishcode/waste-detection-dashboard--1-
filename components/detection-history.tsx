"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { DetectionResult } from "@/types/detection"

interface HistoryItem {
  id: string
  image: string
  timestamp: Date
  results: DetectionResult
}

interface DetectionHistoryProps {
  history: HistoryItem[]
}

export default function DetectionHistory({ history }: DetectionHistoryProps) {
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null)

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <p>No detection history yet</p>
        <p className="text-sm">Process some images to see your history here</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {history.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <div className="aspect-video relative">
              <img
                src={item.image || "/placeholder.svg"}
                alt={`Detection from ${format(item.timestamp, "PPpp")}`}
                className="object-cover w-full h-full"
              />
            </div>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium">{format(item.timestamp, "PPp")}</p>
                  <p className="text-xs text-muted-foreground">{item.results.detections.length} objects detected</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedItem(item)}>
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        {selectedItem && (
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Detection Results - {format(selectedItem.timestamp, "PPpp")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="border rounded-md overflow-hidden">
                <img src={selectedItem.image || "/placeholder.svg"} alt="Detection result" className="w-full h-auto" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-secondary/50 p-3 rounded-md">
                  <p className="text-sm font-medium">Objects Detected</p>
                  <p className="text-2xl font-bold">{selectedItem.results.detections.length}</p>
                </div>
                <div className="bg-secondary/50 p-3 rounded-md">
                  <p className="text-sm font-medium">Processing Time</p>
                  <p className="text-2xl font-bold">{selectedItem.results.processing_time.toFixed(2)}s</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Detected Objects</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {selectedItem.results.detections.map((detection, index) => (
                    <div key={index} className="bg-secondary/30 p-2 rounded-md">
                      <div className="flex justify-between">
                        <span className="font-medium">{detection.class_name}</span>
                        <span>{Math.round(detection.confidence * 100)}%</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Box: [{detection.box.map((v) => Math.round(v)).join(", ")}]
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}

