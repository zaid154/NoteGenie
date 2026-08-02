// FLOW: Public shared document view page (ShareView, /share/:token).
// Rendered within a clean, pixel-perfect layout with Notes, Mind Map, Flashcards, and signup CTA.

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import MarkdownContent from "../components/MarkdownContent.jsx";
import MindMap from "../components/MindMap.jsx";
import Flashcards from "../components/Flashcards.jsx";
import { api, apiError } from "../api/client.js";
import { PageLoader, Alert, Badge } from "../components/ui.jsx";
import { sourceMeta } from "../utils/sourceMeta.jsx";
import Logo from "../components/Logo.jsx";
import { IconDoc, IconMap, IconCards, IconSparkles } from "../components/icons.jsx";

const tabs = [
  { id: "notes", label: "Notes & Summary", icon: IconDoc },
  { id: "map", label: "Mind Map", icon: IconMap },
  { id: "flashcards", label: "Flashcards", icon: IconCards },
];

export default function ShareView() {
  const { token } = useParams();
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("notes");

  useEffect(() => {
    api
      .get(`/share/${token}`)
      .then((r) => setDoc(r.data.document))
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <PageLoader />;

  if (error) {
    return (
      <div className="min-h-[70vh] grid place-items-center px-4 py-16">
        <div className="mx-auto max-w-md space-y-4 text-center">
          <Logo />
          <Alert>{error}</Alert>
          <Link to="/" className="btn-primary inline-flex">
            Go to NoteGenie
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 py-10 px-4 sm:px-6 lg:px-8 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <Logo />
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-outline text-xs font-medium px-3.5 py-2">
              Sign in
            </Link>
            <Link to="/register" className="btn-primary text-xs font-semibold px-4 py-2">
              Create free account ✨
            </Link>
          </div>
        </div>

        {/* Document Title Panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-2">
            <Badge color={sourceMeta(doc.sourceType).badge}>{sourceMeta(doc.sourceType).label}</Badge>
            <Badge color="gray">Shared Material</Badge>
            {doc.outputLanguage && <Badge color="gray">{doc.outputLanguage}</Badge>}
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            {doc.title}
          </h1>

          {doc.summary && (
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{doc.summary}</p>
          )}
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-slate-200 bg-white px-4 rounded-t-2xl shadow-xs dark:border-slate-800 dark:bg-slate-900">
          {tabs.map(({ id: tid, label, icon: Icon }) => (
            <button
              key={tid}
              type="button"
              onClick={() => setTab(tid)}
              className={`relative flex items-center gap-2 py-3.5 px-4 text-xs font-semibold transition-colors ${
                tab === tid
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {tab === tid && (
                <motion.span
                  layoutId="shareTabLine"
                  className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-emerald-600 dark:bg-emerald-400"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon width={16} height={16} />
              <span>{label}</span>
              {tid === "flashcards" && doc.flashcards?.length > 0 && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
                  {doc.flashcards.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Main Tab Panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {tab === "notes" && (
              <div className="rounded-b-2xl border-x border-b border-slate-200 bg-white p-6 sm:p-8 space-y-8 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                {doc.keyTakeaways?.length > 0 && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                    <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      <IconSparkles width={16} height={16} /> Key Takeaways
                    </p>
                    <ul className="list-disc space-y-2 pl-5 text-sm text-slate-800 dark:text-slate-200 marker:text-emerald-500">
                      {doc.keyTakeaways.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="prose prose-slate max-w-none dark:prose-invert">
                  <MarkdownContent>{doc.notes}</MarkdownContent>
                </div>

                {doc.glossary?.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950/50">
                    <p className="mb-4 text-sm font-bold text-slate-900 dark:text-white">Glossary &amp; Key Definitions</p>
                    <dl className="grid gap-4 sm:grid-cols-2">
                      {doc.glossary.map((g, i) => (
                        <div key={g.term || i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                          <dt className="text-xs font-bold text-slate-900 dark:text-white">{g.term}</dt>
                          <dd className="mt-1.5 text-xs text-slate-600 leading-relaxed dark:text-slate-400">{g.definition}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>
            )}

            {tab === "map" && (
              <div className="rounded-b-2xl border-x border-b border-slate-200 bg-white p-6 shadow-xs space-y-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <IconMap width={18} height={18} className="text-emerald-600 dark:text-emerald-400" />
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Interactive Concept Map</p>
                </div>
                <MindMap title={doc.title} notes={doc.notes} />
              </div>
            )}

            {tab === "flashcards" && (
              <div className="rounded-b-2xl border-x border-b border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                {doc.flashcards?.length > 0 ? (
                  <Flashcards cards={doc.flashcards} />
                ) : (
                  <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
                    No flashcards available for this shared material.
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Signup CTA Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-slate-50 p-6 shadow-xs dark:border-emerald-900 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900">
          <div>
            <p className="font-display text-base font-bold text-slate-900 dark:text-white">
              Want to generate your own AI Study Notes?
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Upload PDFs, generate mind maps, flashcards, and solve assignments for free.
            </p>
          </div>
          <Link to="/register" className="btn-primary text-xs font-semibold px-5 py-2.5">
            Sign up free
          </Link>
        </div>
      </div>
    </div>
  );
}
