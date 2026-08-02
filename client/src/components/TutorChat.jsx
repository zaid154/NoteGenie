// FLOW: Client source file (TutorChat.jsx).
// Handcrafted senior product designer AI Study Studio (Notion AI / Perplexity style).

import { useState, useRef, useEffect } from "react";
import { api, apiUrl, getToken, apiError } from "../api/client.js";
import {
  IconSend,
  IconChat,
  IconTrash,
  IconMic,
  IconHeadphones,
  IconSparkles,
  IconDoc,
  IconCheck,
} from "./icons.jsx";
import { Spinner } from "./ui.jsx";
import MarkdownContent from "./MarkdownContent.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";
import { useSpeech } from "../hooks/useSpeech.js";
import { markdownToPlainText } from "../utils/textClean.js";

const promptCategories = [
  {
    icon: "💡",
    title: "Concept Breakdown",
    prompt: "Explain the hardest topic from my notes in simple terms with a real-world example.",
  },
  {
    icon: "🎓",
    title: "Exam Readiness",
    prompt: "Create a 5-question practice quiz based on the key exam topics in my notes.",
  },
  {
    icon: "📊",
    title: "Cross-Note Synthesis",
    prompt: "Compare key differences and connections between my recent study materials.",
  },
  {
    icon: "📝",
    title: "Key Definitions & Formulas",
    prompt: "Extract all key definitions, terms, and formulas into a structured bullet list.",
  },
];

export default function TutorChat({
  documentId,
  basePath,
  outputLanguage = "English",
  emptyTitle = "What would you like to master today?",
  emptyHint = "Ask anything — NoteGenie searches across your study materials to deliver grounded answers.",
  placeholder = "Ask anything about your study notes, request a summary, or build a practice quiz...",
}) {
  const base = basePath || `/tutor/${documentId}`;
  const confirm = useConfirm();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [clearing, setClearing] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const scrollRef = useRef(null);
  const abortRef = useRef(null);
  const textareaRef = useRef(null);

  // Voice output TTS
  const { supported: ttsSupported, speaking, play: speak, stop: stopSpeak } = useSpeech();
  const [autoSpeak, setAutoSpeak] = useState(false);
  const autoSpeakRef = useRef(false);
  autoSpeakRef.current = autoSpeak;

  // Voice input STT
  const [sttSupported] = useState(
    () => typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
  );
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  function stopListening() {
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    recognitionRef.current = null;
    setListening(false);
  }

  function toggleListen() {
    if (!sttSupported || streaming) return;
    if (listening) { stopListening(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setInput(text);
    };
    rec.onend = () => { recognitionRef.current = null; setListening(false); };
    rec.onerror = () => { recognitionRef.current = null; setListening(false); };
    recognitionRef.current = rec;
    setListening(true);
    try { rec.start(); } catch { setListening(false); }
  }

  function toggleAutoSpeak() {
    setAutoSpeak((prev) => {
      const next = !prev;
      if (!next) stopSpeak();
      return next;
    });
  }

  function handleCopy(text, idx) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

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
      abortRef.current?.abort();
      stopListening();
      stopSpeak();
    };
  }, [base]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  async function sendQuestion(questionText) {
    const question = (questionText || input).trim();
    if (!question || streaming) return;

    setMessages((m) => [...m, { role: "user", content: question }, { role: "assistant", content: "" }]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setStreaming(true);
    stopListening();
    if (ttsSupported) stopSpeak();

    let acc = "";
    const controller = new AbortController();
    abortRef.current = controller;

    try {
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
        acc += chunk;
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: "assistant",
            content: copy[copy.length - 1].content + chunk,
          };
          return copy;
        });
      }
      if (autoSpeakRef.current && acc.trim()) speak(markdownToPlainText(acc));
    } catch (err) {
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

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendQuestion();
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
    <div className="flex h-full flex-1 flex-col rounded-3xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/90 overflow-hidden">
      {/* Studio Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3.5 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
            <IconSparkles width={15} height={15} />
          </span>
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">NoteGenie AI Tutor</p>
            <p className="text-[10px] text-slate-400">Searching all active study materials</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {ttsSupported && (
            <button
              type="button"
              onClick={toggleAutoSpeak}
              aria-pressed={autoSpeak}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                autoSpeak
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
              title="Read tutor answers aloud"
            >
              <IconHeadphones width={14} height={14} />
              <span>{autoSpeak ? (speaking ? "Speaking…" : "Voice On") : "Voice Off"}</span>
            </button>
          )}

          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearChat}
              disabled={streaming || clearing}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition"
            >
              {clearing ? <Spinner size={12} /> : <IconTrash width={14} height={14} />}
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages Canvas */}
      <div ref={scrollRef} className="chat-scroll flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {loadingHistory ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size={24} />
          </div>
        ) : messages.length === 0 ? (
          /* Handcrafted Landing Canvas (Empty State) */
          <div className="flex h-full flex-col items-center justify-center text-center max-w-xl mx-auto space-y-5 py-2">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                <IconSparkles width={12} height={12} /> Global Study Copilot
              </div>
              <h2 className="font-display text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">
                {emptyTitle}
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed dark:text-slate-400">
                {emptyHint}
              </p>
            </div>

            {/* 4 Prompt Cards Grid */}
            <div className="grid gap-2.5 sm:grid-cols-2 w-full text-left">
              {promptCategories.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => sendQuestion(item.prompt)}
                  className="group rounded-xl border border-slate-200 bg-slate-50/50 p-3 transition-all duration-200 hover:border-emerald-400 hover:bg-emerald-50/40 hover:shadow-2xs dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{item.icon}</span>
                    <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-400">
                      {item.title}
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal dark:text-slate-400 line-clamp-2">
                    "{item.prompt}"
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Active Chat Stream */
          messages.map((m, i) => (
            <div key={m.createdAt || `${m.role}-${i}`} className="space-y-2">
              {m.role === "user" ? (
                /* User Bubble */
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl bg-slate-900 px-4 py-3 text-xs font-medium leading-relaxed text-white shadow-xs dark:bg-emerald-600">
                    {m.content}
                  </div>
                </div>
              ) : (
                /* AI Assistant Bubble */
                <div className="flex items-start gap-3 max-w-[92%] lg:max-w-[85%]">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                    <IconSparkles width={14} height={14} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-950/60">
                      {m.content ? (
                        <MarkdownContent compact>{m.content}</MarkdownContent>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
                          <Spinner size={14} />
                          <span>Synthesizing answer from notes…</span>
                        </div>
                      )}
                    </div>

                    {/* Action Toolbar */}
                    {m.content && (
                      <div className="flex items-center gap-3 px-1 text-[11px] font-medium text-slate-400">
                        <button
                          type="button"
                          onClick={() => handleCopy(m.content, i)}
                          className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition"
                        >
                          {copiedIdx === i ? (
                            <><IconCheck width={12} height={12} className="text-emerald-600" /> Copied</>
                          ) : (
                            "Copy"
                          )}
                        </button>
                        {ttsSupported && (
                          <button
                            type="button"
                            onClick={() => speak(markdownToPlainText(m.content))}
                            className="hover:text-slate-700 dark:hover:text-slate-200 transition"
                          >
                            Listen
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {historyError && (
        <div className="px-6 py-1">
          <p className="text-xs text-rose-500">{historyError}</p>
        </div>
      )}

      {/* Floating Capsule Command Dock */}
      <div className="p-4 bg-slate-50/50 border-t border-slate-100 dark:bg-slate-950/30 dark:border-slate-800">
        <form onSubmit={(e) => { e.preventDefault(); sendQuestion(); }} className="relative flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-900">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={listening ? "Listening… speak now" : placeholder}
            disabled={streaming}
            className="flex-1 resize-none bg-transparent px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
          />

          <div className="flex items-center gap-1 shrink-0 pb-1">
            {sttSupported && (
              <button
                type="button"
                onClick={toggleListen}
                disabled={streaming}
                title={listening ? "Stop dictation" : "Dictate question"}
                className={`rounded-xl p-2 transition ${
                  listening ? "animate-pulse bg-rose-50 text-rose-600" : "text-slate-400 hover:text-slate-700 dark:hover:text-white"
                }`}
              >
                <IconMic width={16} height={16} />
              </button>
            )}

            <button
              type="submit"
              disabled={streaming || !input.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-500 disabled:opacity-40"
            >
              <IconSend width={14} height={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
