"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, ArrowUp, Square, Trash2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useChatStream, type Message } from "@/lib/use-chat-stream";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const [selectedRole, setSelectedRole] = useState<"user" | "analyst">("user");
  const [selectedEndpoint, setSelectedEndpoint] = useState<"semantic" | "ddl">("semantic");
  const { messages, isStreaming, error, send, stop, clear } = useChatStream({
    endpoint: `/api/chat?type=${selectedEndpoint}`,
    role: selectedRole
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the view pinned to the latest content as chunks stream in.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function submit() {
    if (!input.trim() || isStreaming) return;
    send(input).catch((err) => {
      console.error("Failed to send message:", err);
    });
    setInput("");
  }

  return (
      <div className="mx-auto flex h-dvh max-h-dvh container flex-col px-4 overflow-hidden">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="font-display text-xl tracking-tight">Streamline</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Endpoint Type Selector */}
            <div className="flex rounded-lg border bg-muted/40 p-1">
              <Button
                  variant={selectedEndpoint === "semantic" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedEndpoint("semantic")}
                  disabled={isStreaming}
                  className="h-8"
              >
                Semantic
              </Button>
              <Button
                  variant={selectedEndpoint === "ddl" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedEndpoint("ddl")}
                  disabled={isStreaming}
                  className="h-8"
              >
                DDL
              </Button>
            </div>

            {/* Role Selector - only show for semantic endpoint */}
            {selectedEndpoint === "semantic" && (
                <div className="flex rounded-lg border bg-muted/40 p-1">
                  <Button
                      variant={selectedRole === "user" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setSelectedRole("user")}
                      disabled={isStreaming}
                      className="h-8"
                  >
                    User
                  </Button>
                  <Button
                      variant={selectedRole === "analyst" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setSelectedRole("analyst")}
                      disabled={isStreaming}
                      className="h-8"
                  >
                    Analyst
                  </Button>
                </div>
            )}

            <Drawer direction="right">
              <DrawerTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="ml-auto h-full w-80 rounded-none">
                <DrawerHeader className="text-left">
                  <DrawerTitle className="font-display text-lg">Settings</DrawerTitle>
                  <DrawerDescription>
                    Session controls and connection details.
                  </DrawerDescription>
                </DrawerHeader>

                <div className="space-y-4 px-4 text-sm">
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-muted-foreground">Endpoint</p>
                    <p className="font-mono text-xs">POST /api/chat?type={selectedEndpoint}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-muted-foreground">Type</p>
                    <p className="font-mono text-xs">{selectedEndpoint}</p>
                  </div>
                  {selectedEndpoint === "semantic" && (
                      <div className="rounded-lg border bg-muted/40 p-3">
                        <p className="text-muted-foreground">Role</p>
                        <p className="font-mono text-xs">{selectedRole}</p>
                      </div>
                  )}
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-muted-foreground">Messages in context</p>
                    <p className="font-mono text-xs">{messages.length}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-muted-foreground">Transport</p>
                    <p className="font-mono text-xs">Chunked text stream</p>
                  </div>
                </div>

                <DrawerFooter>
                  <Button
                      variant="outline"
                      onClick={clear}
                      disabled={messages.length === 0}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear conversation
                  </Button>
                  <DrawerClose asChild>
                    <Button variant="ghost">Close</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>
        </header>

        {/* Scrolling output */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div ref={scrollRef} className="flex flex-col gap-4 py-6">
            {messages.length === 0 ? (
                <EmptyState />
            ) : (
                messages.map((m) => <Bubble key={m.id} message={m} />)
            )}
            {error && (
                <p className="text-center text-xs text-destructive">{error}</p>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="shrink-0 border-t py-4">
          <div className="flex items-end gap-2">
            <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder="Send a message…"
                className="h-11"
                disabled={isStreaming}
            />
            {isStreaming ? (
                <Button size="icon" className="h-11 w-11 shrink-0" onClick={stop}>
                  <Square className="h-4 w-4" />
                </Button>
            ) : (
                <Button
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    onClick={submit}
                    disabled={!input.trim()}
                >
                  <ArrowUp className="h-5 w-5" />
                </Button>
            )}
          </div>
          <p className="mt-2 text-center text-[12px] text-muted-foreground">
            Enter to send · Shift+Enter for a newline
          </p>
        </div>
      </div>
  );
}

function Bubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed",
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md bg-muted text-foreground"
        )}
      >
        {message.content || <Cursor />}
      </div>
    </div>
  );
}

function Cursor() {
  return (
    <span className="inline-block h-4 w-2 translate-y-0.5 animate-pulse rounded-sm bg-current opacity-60" />
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
      <Sparkles className="h-8 w-8 text-muted-foreground/50" />
      <p className="font-display text-lg">Start a conversation</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Responses stream in chunk-by-chunk from the backend.
      </p>
    </div>
  );
}
