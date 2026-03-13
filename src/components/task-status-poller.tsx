"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface TaskStatusPollerProps {
  productId: string;
  statuses: string[];
}

export function TaskStatusPoller({
  productId,
  statuses,
}: TaskStatusPollerProps) {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Only connect if product is in a status that needs real-time updates
    if (!statuses.includes("submitted") && !statuses.includes("queued") && !statuses.includes("processing")) {
      return;
    }

    // Clean up any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`/api/ai/events?productId=${productId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "connected") {
          console.log("SSE connected for product:", productId);
        } else if (data.type === "status_update") {
          // Check if status changed to a terminal state
          if (data.status === "completed" || data.status === "failed") {
            setIsConnected(false);
            router.refresh();
            return;
          }

          // If status changed from what we started with, refresh
          if (!statuses.includes(data.status)) {
            router.refresh();
          }
          setLastStatus(data.status);
        } else if (data.type === "ping") {
          // On ping, do a quick status check to see if anything changed
          checkStatus();
        }
      } catch (error) {
        console.error("SSE message parse error:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
      setIsConnected(false);
      eventSource.close();
    };

    // Fallback: also do periodic checks in case SSE fails
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/ai/tasks?productId=${productId}`);
        if (res.ok) {
          const data = await res.json();

          // If task is completed or failed, stop and refresh
          if (data.status === "completed" || data.status === "failed") {
            setIsConnected(false);
            router.refresh();
            return;
          }

          // If status changed from what we started with, refresh
          if (!statuses.includes(data.status)) {
            router.refresh();
          }
          setLastStatus(data.status);
        }
      } catch (error) {
        console.error("Status check error:", error);
      }
    };

    // Backup polling every 30 seconds in case SSE misses something
    const backupPoll = setInterval(checkStatus, 30000);

    return () => {
      eventSource.close();
      clearInterval(backupPoll);
      setIsConnected(false);
    };
  }, [productId, statuses, router]);

  if (!isConnected) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 z-50 border border-green-200">
      <div className="flex items-center gap-2 text-sm">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-gray-600">实时同步中...</span>
        {lastStatus && (
          <span className="text-xs text-gray-400 ml-1">({lastStatus})</span>
        )}
      </div>
    </div>
  );
}
