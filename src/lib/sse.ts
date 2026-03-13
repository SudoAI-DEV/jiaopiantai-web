// SSE Connection Manager
// This module manages Server-Sent Events connections for real-time product status updates

type SSEController = ReadableStreamDefaultController<Uint8Array>;

// Store active connections per product
const connections = new Map<string, Set<SSEController>>();

export interface StatusUpdateEvent {
  type: "connected" | "status_update" | "ping" | "error";
  productId: string;
  status?: string;
  message?: string;
}

export function addConnection(productId: string, controller: SSEController): void {
  if (!connections.has(productId)) {
    connections.set(productId, new Set());
  }
  connections.get(productId)!.add(controller);
}

export function removeConnection(productId: string, controller: SSEController): void {
  const productConnections = connections.get(productId);
  if (productConnections) {
    productConnections.delete(controller);
    if (productConnections.size === 0) {
      connections.delete(productId);
    }
  }
}

export function broadcastStatusUpdate(productId: string, status: string): void {
  const productConnections = connections.get(productId);
  if (!productConnections || productConnections.size === 0) {
    return;
  }

  const event: StatusUpdateEvent = {
    type: "status_update",
    productId,
    status,
  };

  const message = `data: ${JSON.stringify(event)}\n\n`;

  for (const controller of productConnections) {
    try {
      controller.enqueue(new TextEncoder().encode(message));
    } catch (error) {
      // Connection might be closed, remove it
      productConnections.delete(controller);
    }
  }
}

export function broadcastError(productId: string, message: string): void {
  const productConnections = connections.get(productId);
  if (!productConnections || productConnections.size === 0) {
    return;
  }

  const event: StatusUpdateEvent = {
    type: "error",
    productId,
    message,
  };

  const data = `data: ${JSON.stringify(event)}\n\n`;

  for (const controller of productConnections) {
    try {
      controller.enqueue(new TextEncoder().encode(data));
    } catch (error) {
      productConnections.delete(controller);
    }
  }
}

export function getConnectionCount(productId: string): number {
  return connections.get(productId)?.size || 0;
}
