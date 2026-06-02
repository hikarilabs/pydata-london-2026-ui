import { NextRequest } from "next/server";

// Edge runtime streams chunks to the client as they're produced.
export const runtime = "edge";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  // Parse and validate request body
  let messages: ChatMessage[];

  try {
    const body = await req.json();
    messages = body.messages;
  } catch (parseError) {
    console.error("Failed to parse request body:", parseError);
    return new Response("Invalid JSON in request body", { status: 400 });
  }

  // Validate message array
  if (!Array.isArray(messages)) {
    return new Response("Request body must contain a 'messages' array", { status: 400 });
  }

  if (messages.length === 0) {
    return new Response("Messages array cannot be empty", { status: 400 });
  }

  // Validate message structure
  const hasInvalidMessage = messages.some(
      (msg) => !msg.role || !msg.content || !["user", "assistant"].includes(msg.role)
  );

  if (hasInvalidMessage) {
    return new Response(
        "Each message must have 'role' (user|assistant) and 'content' fields",
        { status: 400 }
    );
  }

  // Get the FastAPI backend URL from environment variable
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  // Add timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

  try {
    // Forward the request to your FastAPI backend
    const response = await fetch(`${backendUrl}/api/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle backend errors
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      console.error(`Backend error ${response.status}:`, errorText);

      // Return the same status code from backend if it's a client error (4xx)
      // Otherwise return 502 Bad Gateway for server errors (5xx)
      const statusCode = response.status >= 400 && response.status < 500
          ? response.status
          : 502;

      return new Response(
          `Backend error: ${errorText || response.statusText}`,
          { status: statusCode }
      );
    }

    // Check if response body exists
    if (!response.body) {
      console.error("Backend returned empty response body");
      return new Response("Backend returned empty response", { status: 502 });
    }

    // Stream the response from FastAPI directly to the client
    return new Response(response.body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });

  } catch (error) {
    clearTimeout(timeoutId);

    // Handle timeout/abort
    if (error instanceof Error && error.name === "AbortError") {
      console.error("Backend request timeout");
      return new Response("Request timeout: Backend took too long to respond", {
        status: 504 // Gateway Timeout
      });
    }

    // Handle network errors
    console.error("Network error connecting to backend:", error);
    return new Response(
        "Failed to connect to backend service. Please try again later.",
        { status: 503 } // Service Unavailable
    );
  }
}