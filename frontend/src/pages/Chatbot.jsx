import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { api } from "../api/client";

export default function Chatbot() {
  const { auditId } = useParams();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSend(event) {
    event.preventDefault();
    if (!question.trim()) return;
    const userMessage = { role: "user", content: question.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);
    setError("");
    try {
      const data = await api(`/chatbot/${auditId}`, {
        method: "POST",
        body: JSON.stringify({ question: userMessage.content }),
      });
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 flex flex-col">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-primary">Assistant conversationnel</h1>
          <Link to={`/reports/${auditId}`} className="text-sm text-accent">
            Retour au rapport
          </Link>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Posez vos questions sur l'audit #{auditId}. Les réponses s'appuient sur vos résultats.
        </p>
        <div className="mt-6 flex-1 space-y-3 overflow-y-auto rounded-xl border bg-white p-4">
          {!messages.length && (
            <p className="text-sm text-slate-500">
              Exemple : « Quel est le risque le plus urgent ? »
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-2xl rounded-lg px-3 py-2 text-sm ${
                m.role === "user"
                  ? "ml-auto bg-accent text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {m.content}
            </div>
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        <form onSubmit={handleSend} className="mt-4 flex gap-2">
          <input
            className="flex-1 rounded border px-3 py-2"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Votre question..."
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-primary px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? "..." : "Envoyer"}
          </button>
        </form>
      </main>
    </div>
  );
}
