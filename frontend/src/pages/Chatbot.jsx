import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import ChatMessage from "../components/ChatMessage";
import Icon from "../components/Icon";
import PageHeader from "../components/PageHeader";
import { api } from "../api/client";

const SUGGESTIONS = [
  "Quel est le risque le plus urgent ?",
  "Comment corriger les en-têtes de sécurité manquants ?",
  "Résume l'audit en cinq points.",
];

export default function Chatbot() {
  const { auditId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const prefillHandled = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, error]);

  const sendQuestion = useCallback(
    async (text) => {
      const content = (text || "").trim();
      if (!content) return;
      const userMessage = { role: "user", content };
      setMessages((prev) => [...prev, userMessage]);
      setQuestion("");
      setLoading(true);
      setError("");
      try {
        const data = await api(`/chatbot/${auditId}`, {
          method: "POST",
          body: JSON.stringify({ question: content }),
        });
        setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
      } catch (err) {
        setError(err.message || "Impossible d'obtenir une réponse pour le moment.");
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    },
    [auditId]
  );

  useEffect(() => {
    if (prefillHandled.current) return;
    const prefill = searchParams.get("q");
    if (prefill) {
      prefillHandled.current = true;
      sendQuestion(prefill);
      // Nettoie l'URL pour éviter un renvoi au rafraîchissement.
      searchParams.delete("q");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, sendQuestion]);

  async function handleSend(event) {
    event.preventDefault();
    if (loading) return;
    await sendQuestion(question);
  }

  return (
    <AppShell>
      <div className="col-span-12">
        <Link
          to={`/reports/${auditId}`}
          className="inline-flex items-center gap-xs font-label-caps text-label-caps uppercase text-on-surface-variant transition-colors hover:text-primary"
        >
          <Icon name="arrow_back" size={16} />
          Retour au rapport
        </Link>
      </div>

      <PageHeader
        title="Assistant ƉeƉeFIA"
        subtitle={`Analyse conversationnelle de l'audit AUD-${String(auditId).padStart(4, "0")}.`}
        actions={
          <div className="chip border-primary-container/30 bg-primary-container/10 text-primary-container">
            <Icon name="neurology" size={16} />
            Contexte d'audit chargé
          </div>
        }
      />

      <div className="col-span-12">
        <div className="flex h-[calc(100vh-19rem)] min-h-[26rem] flex-col overflow-hidden rounded-lg border border-outline-variant/50 bg-surface-container-lowest">
          <div className="flex items-center justify-between border-b border-outline-variant/30 px-md py-sm">
            <h2 className="flex items-center gap-base font-label-caps text-label-caps uppercase text-primary">
              <Icon name="terminal" size={16} />
              Console d'analyse
            </h2>
            <div className="flex gap-base">
              <span className="h-2 w-2 rounded-pill bg-error" />
              <span className="h-2 w-2 rounded-pill bg-outline" />
              <span className="h-2 w-2 rounded-pill bg-primary-container" />
            </div>
          </div>

          <div className="flex-1 space-y-sm overflow-y-auto p-md">
            {!messages.length && !loading && (
              <div className="space-y-sm">
                <p className="font-data-mono text-data-mono text-on-surface-variant">
                  Posez une question sur cet audit. Les réponses s'appuient sur vos résultats réels.
                </p>
                <div className="flex flex-wrap gap-base">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => sendQuestion(suggestion)}
                      className="rounded border border-outline-variant/50 bg-surface-container px-sm py-base text-left font-data-mono text-[12px] text-on-surface-variant transition-colors hover:border-primary-container hover:text-primary-container"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <ChatMessage key={i} role={m.role} content={m.content} />
            ))}

            {loading && (
              <div className="flex max-w-xs items-center gap-base rounded border border-outline-variant/30 bg-surface-container-low px-md py-sm font-data-mono text-data-mono text-primary-container">
                <Icon name="progress_activity" size={16} className="animate-spin" />
                Analyse en cours...
              </div>
            )}

            {error && (
              <div className="flex items-start gap-base rounded border border-critical/30 bg-critical/10 px-md py-sm font-data-mono text-data-mono text-critical">
                <Icon name="error" size={16} />
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={handleSend}
            className="border-t border-outline-variant/30 bg-surface-container-low px-md py-sm"
          >
            <div className="flex items-center gap-sm">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-sm">
                  <Icon name="chevron_right" size={18} className="text-primary-container" />
                </span>
                <input
                  ref={inputRef}
                  className="input-field pl-xl"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Votre question..."
                  disabled={loading}
                />
              </div>
              <button type="submit" disabled={loading || !question.trim()} className="btn-primary">
                <Icon name="send" size={16} />
                {loading ? "..." : "Envoyer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
