// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: App.jsx route renders this page (ShareView). Values usually come from AuthContext, route params, local state, and api/client.js calls; processed state is shown through components and user actions are sent back to backend APIs.

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import MarkdownContent from "../components/MarkdownContent.jsx";
import { api, apiError } from "../api/client.js";
import { PageLoader, Alert, Badge, EmptyState } from "../components/ui.jsx";
import Logo from "../components/Logo.jsx";
import { StaggerContainer, StaggerItem } from "../components/motion.jsx";
import { IconCards } from "../components/icons.jsx";

function FlashcardPreview({ card }) {
  return (
    <div className="group relative min-h-[120px] rounded-xl border border-line bg-gradient-to-br from-surface to-indigo-50/30 p-4 shadow-sm transition hover:border-indigo-200 dark:from-surface dark:to-indigo-950/20">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">Question</p>
      <p className="mt-2 text-sm font-medium leading-relaxed text-ink">{card.front}</p>
      <div className="mt-4 border-t border-line pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Answer</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{card.back}</p>
      </div>
    </div>
  );
}

export default function ShareView() {
  const { token } = useParams();
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCards, setShowCards] = useState(false);

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
      <div className="min-h-screen bg-canvas px-4 py-12">
        <div className="mx-auto max-w-lg space-y-4 text-center">
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
    <div className="min-h-screen bg-canvas px-4 py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <StaggerContainer>
          <StaggerItem>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Logo />
              <Link to="/register" className="btn-primary text-sm">
                Create free account
              </Link>
            </div>
          </StaggerItem>

          <StaggerItem>
            <article className="panel p-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge color={doc.sourceType === "pdf" ? "brand" : "blue"}>
                  {doc.sourceType === "pdf" ? "PDF" : "Link"}
                </Badge>
                <span className="text-xs text-muted">Shared material</span>
              </div>
              <h1 className="mt-3 text-2xl font-semibold text-ink">{doc.title}</h1>
              {doc.summary && <p className="mt-2 text-muted">{doc.summary}</p>}
              <MarkdownContent className="mt-8">{doc.notes}</MarkdownContent>
            </article>
          </StaggerItem>

          {doc.flashcards?.length > 0 && (
            <StaggerItem>
              <div className="panel p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <IconCards width={18} height={18} className="text-indigo-600" />
                    <h2 className="font-semibold text-ink">{doc.flashcards.length} flashcards</h2>
                  </div>
                  <button type="button" className="btn-outline text-sm" onClick={() => setShowCards((s) => !s)}>
                    {showCards ? "Hide" : "Preview"}
                  </button>
                </div>
                {showCards && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {doc.flashcards.map((c, i) => (
                      <FlashcardPreview key={i} card={c} />
                    ))}
                  </div>
                )}
              </div>
            </StaggerItem>
          )}

          <StaggerItem>
            <div className="cta-glow rounded-xl border border-indigo-100 bg-indigo-50/50 px-6 py-8 text-center dark:border-indigo-900 dark:bg-indigo-950/30">
              <p className="text-sm text-muted">Want your own study kits?</p>
              <Link to="/register" className="btn-primary mt-4 inline-flex">
                Sign up free
              </Link>
            </div>
          </StaggerItem>
        </StaggerContainer>
      </div>
    </div>
  );
}

