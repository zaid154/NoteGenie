// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: Parent page/layout renders this component (TutorChat). Data comes through props/context, UI events call callbacks or api/client.js helpers, and the result is displayed back in the parent flow.

// TutorChat = AI tutor se chat karne wala box. Ek document ke baare me sawal poochho.
// Khaas baat: jawab "streaming" me aata hai (thoda-thoda kar ke, jaise typing).
import { useState, useRef, useEffect } from "react";
import { api, apiUrl, getToken, apiError } from "../api/client.js";
import { IconSend, IconChat, IconTrash } from "./icons.jsx";
import { Spinner } from "./ui.jsx";
import MarkdownContent from "./MarkdownContent.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";

export default function TutorChat({
  documentId,
  basePath,
  outputLanguage = "English",
  emptyTitle = "Ask the AI tutor",
  emptyHint = 'Ask anything about this material — for example, "explain this concept in simple words".',
  placeholder = "Type your question...",
}) {
  // basePath lets this component serve both document-scoped (/tutor/:id) and the
  // cross-document global tutor (/tutor/global).
  const base = basePath || `/tutor/${documentId}`;
  const confirm = useConfirm();
  const [messages, setMessages] = useState([]);  const [input, setInput] = useState("");          // text box me likha hua sawal
  const [streaming, setStreaming] = useState(false); // AI abhi jawab de raha hai?
  const [loadingHistory, setLoadingHistory] = useState(true); // purani chat load ho rahi hai?
  const [historyError, setHistoryError] = useState("");
  const [clearing, setClearing] = useState(false);  const scrollRef = useRef(null);   // chat ko apne aap neeche scroll karne ke liye
  const abortRef = useRef(null);    // chalu request ko beech me rokne ke liye

  useEffect(() => {
    let ignore = false;
    setLoadingHistory(true);
    setHistoryError("");
    setMessages([]);

    async function loadHistory() {
      try {
        const { data } = await api.get(`${base}/history`);
        if (!ignore) setMessages(data.messages || []);
      } catch (err) {
        // 404 = abhi tak koi chat nahi (normal); baaki errors dikhate hain.
        if (!ignore && err?.response?.status !== 404) {
          setHistoryError(apiError(err));
        }
        if (!ignore) setMessages([]);
      } finally {
        if (!ignore) setLoadingHistory(false);
      }
    }
    loadHistory();

    return () => {
      ignore = true;
      // Document change/unmount par chalu stream cancel.
      abortRef.current?.abort();
    };
  }, [base]);

  // Jab bhi naya message aaye, chat ko sabse neeche scroll kar do.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // send: user ka sawal backend ko bhejo aur jawab thoda-thoda dikhate jao.
  async function send(e) {
    e.preventDefault(); // form submit par page reload na ho
    const question = input.trim();
    if (!question || streaming) return; // khaali sawal ya pehle se chal raha hai to ruk jao

    setMessages((m) => [...m, { role: "user", content: question }, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Streaming ke liye fetch use karte hain (axios stream handle nahi karta easily).
      // History server DB se leta hai, isliye yahan bhejne ki zaroorat nahi.
      const res = await fetch(apiUrl(base), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ question, outputLanguage }),
        signal: controller.signal,
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
      // Abort (document change/unmount) par UI update mat karo.
      if (err.name === "AbortError") return;
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "assistant",
          content: "Sorry, I couldn't generate a response. Please try again.",
        };
        return copy;
      });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setStreaming(false);
    }
  }

  async function clearChat() {
    if (!messages.length || streaming || clearing) return;
    const ok = await confirm({
      title: "Clear tutor chat?",
      message: "All messages for this material will be permanently deleted.",
      confirmText: "Clear chat",
      danger: true,
    });
    if (!ok) return;
    setClearing(true);
    setHistoryError("");
    try {
      await api.delete(`${base}/history`);
      setMessages([]);
    } catch (err) {
      setHistoryError(apiError(err));
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="flex min-h-[32rem] flex-col lg:min-h-[calc(100vh-22rem)]">
      {messages.length > 0 && (
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={clearChat}
            disabled={streaming || clearing}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
          >
            {clearing ? <Spinner size={12} /> : <IconTrash width={14} height={14} />}
            Clear chat
          </button>
        </div>
      )}
      <div ref={scrollRef} className="chat-scroll flex-1 space-y-4 overflow-y-auto p-1">
        {loadingHistory ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size={24} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted">
            <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <IconChat />
            </span>
            <p className="font-500 text-ink">{emptyTitle}</p>
            <p className="mt-1 max-w-xs text-sm">{emptyHint}</p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={m.createdAt || `${m.role}-${i}`}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "max-w-[85%] whitespace-pre-wrap bg-indigo-600 text-white"
                    : "max-w-[92%] border border-line bg-white text-ink shadow-sm lg:max-w-[85%]"
                }`}
              >
                {m.role === "user" ? (
                  m.content
                ) : m.content ? (
                  <MarkdownContent compact>{m.content}</MarkdownContent>
                ) : (
                  <Spinner size={14} />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {historyError && (
        <div className="mt-2 flex items-center gap-2">
          <p className="text-xs text-red-500">{historyError}</p>
          <button
            type="button"
            className="text-xs font-500 text-indigo-600 hover:underline dark:text-indigo-400"
            onClick={() => {
              setHistoryError("");
              setLoadingHistory(true);
              api.get(`${base}/history`)
                .then(({ data }) => setMessages(data.messages || []))
                .catch((err) => {
                  if (err?.response?.status !== 404) setHistoryError(apiError(err));
                })
                .finally(() => setLoadingHistory(false));
            }}
          >
            Retry
          </button>
        </div>
      )}

      <form onSubmit={send} className="mt-3 flex items-center gap-2 border-t border-line pt-3">
        <label htmlFor="tutor-input" className="sr-only">
          Ask the tutor a question
        </label>
        <input
          id="tutor-input"
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question..."
          disabled={streaming}
        />
        <button
          className="btn-primary px-3"
          disabled={streaming || !input.trim()}
          aria-label="Send message"
        >
          <IconSend />
        </button>
      </form>
    </div>
  );
}

