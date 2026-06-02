"use client";

import { useCallback, useRef, useState } from "react";

export type Role = "user" | "assistant";

export interface Message {
  id: string;
  role: Role;
  content: string;
}

interface UseChatStreamOptions {
  /** Endpoint that returns a streamed text/event response. Defaults to /api/chat. */
  endpoint?: string;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Minimal streaming chat hook in Vercel's chunked-response style.
 *
 * It POSTs the running message history to `endpoint`, then reads the response
 * body as a ReadableStream, decoding each chunk and appending it to the
 * in-progress assistant message so the UI updates token-by-token.
 */
/**
 * Minimal streaming chat hook in Vercel's chunked-response style.
 *
 * It POSTs the running message history to `endpoint`, then reads the response
 * body as a ReadableStream, decoding each chunk and appending it to the
 * in-progress assistant message so the UI updates token-by-token.
 */
export function useChatStream({ endpoint = "/api/chat" }: UseChatStreamOptions = {}) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const stop = useCallback(() => {
        abortRef.current?.abort();
        abortRef.current = null;
        setIsStreaming(false);
    }, []);

    const send = useCallback(
        async (text: string) => {
            const trimmed = text.trim();
            if (!trimmed || isStreaming) return;

            setError(null);

            const userMsg: Message = {id: uid(), role: "user", content: trimmed};
            const assistantId = uid();

            // Use functional update to avoid stale closure
            setMessages((prev) => {
                const history = [...prev, userMsg];
                return [...history, {id: assistantId, role: "assistant", content: ""}];
            });

            setIsStreaming(true);

            const controller = new AbortController();
            abortRef.current = controller;

            // Add timeout
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

            let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
            let hasError = false;

            try {
                const res = await fetch(endpoint, {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({
                        messages: messages.concat(userMsg).map(({role, content}) => ({role, content})),
                    }),
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (!res.ok) {
                    const errorText = await res.text().catch(() => res.statusText);
                    const errorMessage = `Request failed: ${res.status} ${res.statusText}${errorText ? ` - ${errorText}` : ""}`;
                    setError(errorMessage);
                    hasError = true;
                }

                if (!res.body) {
                    const errorMessage = "Response body is empty";
                    setError(errorMessage);
                    hasError = true;

                } else {
                    reader = res.body.getReader();
                    const decoder = new TextDecoder();
                    let hasContent = false;

                    // Read the stream chunk-by-chunk and append as it arrives.
                    while (true) {
                        const {done, value} = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value, {stream: true});
                        if (!chunk) continue;

                        hasContent = true;

                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === assistantId ? {...m, content: m.content + chunk} : m
                            )
                        );
                    }

                    // Decode any remaining bytes
                    const finalChunk = decoder.decode();
                    if (finalChunk) {
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === assistantId ? {...m, content: m.content + finalChunk} : m
                            )
                        );
                    }
                }

            } catch (err) {
                clearTimeout(timeoutId);

                const isAborted = (err as Error).name === "AbortError";

                if (isAborted) {
                    // Remove empty assistant message if aborted before content arrived
                    setMessages((prev) => {
                        const lastMsg = prev[prev.length - 1];
                        if (lastMsg?.id === assistantId && lastMsg.content === "") {
                            return prev.slice(0, -1);
                        }
                        return prev;
                    });
                } else {
                    const errorMessage = (err as Error).message;
                    setError(errorMessage);
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === assistantId && m.content === ""
                                ? {...m, content: "⚠️ Something went wrong. Try again."}
                                : m
                        )
                    );
                }
            } finally {
                // Ensure reader is released
                if (reader) {
                    try {
                        reader.releaseLock();
                    } catch {
                        // Reader might already be released
                    }
                }

                // Update error message if there was an error thrown in res.ok or res.body was empty
                if (hasError) {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === assistantId && m.content === ""
                                ? {...m, content: "⚠️ Something went wrong. Try again."}
                                : m
                        )
                    );
                }

                abortRef.current = null;
                setIsStreaming(false);
            }
        },
        [endpoint, isStreaming, messages]
    );

    const clear = useCallback(() => {
        stop();
        setMessages([]);
        setError(null);
    }, [stop]);

    return { messages, isStreaming, error, send, stop, clear };
}