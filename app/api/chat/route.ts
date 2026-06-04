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

  // Get endpoint type from query parameter
  const searchParams = req.nextUrl.searchParams;
  const endpointType = searchParams.get("type") || "default";
  const role = searchParams.get("role") || "user";

  // Choose backend route based on type and role
  let backendRoute: string;

  if (endpointType === "semantic") {
    // Semantic routes differentiate by role
    backendRoute = role === "analyst"
        ? "/api/chat/semantic/analyst/stream"
        : "/api/chat/semantic/user/stream";
  } else {
    // Default DDL route
    backendRoute = "/api/chat/ddl/stream";
  }

  // Get the latest user message as the customer query
  const latestUserMessage = messages.filter(m => m.role === "user").pop();

  // Format request body for backend
  const requestBody = {
    cust_id: 1,
    customer_query: latestUserMessage?.content || ""
  };

  // Add timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

  try {
    const response = await fetch(`${backendUrl}${backendRoute}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
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