import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";

export async function registerRoutes(app: Express): Promise<Server> {
  // Firebase is handling all backend operations from the client
  // This server mainly provides WebSocket support for real-time features
  
  const httpServer = createServer(app);
  
  // WebSocket server for real-time chat - on distinct path to avoid conflicts with Vite HMR
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store connected clients with their user IDs
  const clients = new Map<string, WebSocket>();
  
  wss.on('connection', (ws: WebSocket) => {
    let userId: string | null = null;
    
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle different message types
        switch (data.type) {
          case 'auth':
            // Associate WebSocket with user ID
            userId = data.userId;
            if (userId) {
              clients.set(userId, ws);
            }
            break;
            
          case 'message':
            // Forward message to recipient if they're connected
            const recipientWs = clients.get(data.recipientId);
            if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
              recipientWs.send(JSON.stringify({
                type: 'message',
                senderId: data.senderId,
                content: data.content,
                timestamp: new Date().toISOString(),
              }));
            }
            break;
            
          case 'typing':
            // Forward typing indicator
            const typingRecipient = clients.get(data.recipientId);
            if (typingRecipient && typingRecipient.readyState === WebSocket.OPEN) {
              typingRecipient.send(JSON.stringify({
                type: 'typing',
                senderId: data.senderId,
                isTyping: data.isTyping,
              }));
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      // Remove client from map when they disconnect
      if (userId) {
        clients.delete(userId);
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return httpServer;
}
