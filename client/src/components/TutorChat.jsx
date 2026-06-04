import { useState, useRef, useEffect } from "react";
import { api, getToken } from "../api/client.js";
import { IconSend, IconChat } from "./icons.jsx";
import { Spinner } from "./ui.jsx";

export default function TutorChat({ documentId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        const { data } = await api.get(`/tutor/${documentId}/history`);
        setMessages(data.messages || []);
      } catch {
        setMessages([]);
      } finally {
        setLoadingHistory(false);
      }
    }
    loadHistory();
  }, [documentId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(e) {
    e.preventDefault();
    const question = input.trim();
    if (!question || streaming) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: "user", content: question }, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    try {
      // Streaming ke liye fetch use karte hain (axios stream handle nahi karta easily).
      const res = await fetch(`/api/tutor/${documentId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ question, history }),
      });

      if (!res.ok) {
        const text = await res.text();
        let msg = "No response from tutor";
        try {
          const j = JSON.parse(text);
          msg = j.message || msg;
        } catch {
          if (text) msg = text.slice(0, 200);
        }
        throw new Error(msg);
      }
      if (!res.body) throw new Error("No response from tutor");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // Aakhri (assistant) message me chunk add karte jao.
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: "assistant",
            content: copy[copy.length - 1].content + chunk,
          };
          return copy;
        });
      }
    } catch (err) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "assistant",
          content: "Sorry, I couldn't generate a response. Please try again.",
        };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex h-[28rem] flex-col">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-1">
        {loadingHistory ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size={24} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted">
            <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/10 text-brand-600">
              <IconChat />
            </span>
            <p className="font-500 text-ink">Ask the AI tutor</p>
            <p className="mt-1 max-w-xs text-sm">
              Ask anything about this material — for example, "explain this
              concept in simple words".
            </p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-brand-600 text-white"
                    : "border border-line bg-canvas text-ink"
                }`}
              >
                {m.content || <Spinner size={14} />}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={send} className="mt-3 flex items-center gap-2 border-t border-line pt-3">
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question..."
          disabled={streaming}
        />
        <button className="btn-primary px-3" disabled={streaming || !input.trim()}>
          <IconSend />
        </button>
      </form>
    </div>
  );
}
