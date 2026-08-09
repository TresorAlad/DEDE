import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Send } from "lucide-react";
import AppShell from "../components/AppShell";
import PageHeader from "../components/PageHeader";
import ChatMessage from "../components/ChatMessage";
import { api } from "../api/client";

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
      <Link to={`/reports/${auditId}`} className="mb-3 inline-block text-sm text-accent hover:underline">
        &larr; Retour au rapport
      </Link>
      <PageHeader
        title="Assistant conversationnel"
        subtitle={`Posez vos questions sur l'audit #${auditId}. Les réponses s'appuient sur vos résultats.`}
      />

      <div className="card flex h-[calc(100vh-12rem)] min-h-[28rem] flex-col p-0 overflow-hidden">
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
          {!messages.length && !loading && (
            <div className="rounded-2xl bg-surface px-4 py-3 text-sm text-slate-500">
              Exemple : « Quel est le risque le plus urgent ? »
            </div>
          )}
          {messages.map((m, i) => (
            <ChatMessage key={i} role={m.role} content={m.content} />
          ))}
          {loading && (
            <div className="max-w-xs rounded-2xl bg-surface px-4 py-3 text-sm text-slate-500">
              Analyse en cours...
            </div>
          )}
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={handleSend}
          className="border-t border-slate-100 bg-white px-4 py-4"
        >
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-surface px-2 py-1.5 shadow-sm focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15">
            <input
              ref={inputRef}
              className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-slate-400"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Votre question..."
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              <Send size={16} />
              {loading ? "..." : "Envoyer"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
