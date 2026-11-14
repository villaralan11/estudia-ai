import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { api } from '../../lib/api.js';
import ChatBubble from '../molecules/ChatBubble.jsx';
import Spinner from '../atoms/Spinner.jsx';
import Button from '../atoms/Button.jsx';

const storageKey = (docId) => `estudia-ai:chat:${docId}`;

export default function ChatPanel({ documentId }) {
  const { session } = useAuth();
  const token = session?.access_token;

  const [chatId, setChatId] = useState(() => {
    try {
      return localStorage.getItem(storageKey(documentId)) || null;
    } catch {
      return null;
    }
  });
  const [messages, setMessages] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [pregunta, setPregunta] = useState('');

  // Carga historial si hay chat guardado; si ya no existe, arranca uno nuevo.
  useEffect(() => {
    let viva = true;
    async function cargar() {
      setCargando(true);
      setError(null);
      if (!chatId) {
        setMessages([]);
        setCargando(false);
        return;
      }
      try {
        const data = await api(`/api/chats/${chatId}/messages`, { token });
        if (viva) setMessages(data.messages);
      } catch {
        if (viva) {
          setChatId(null);
          setMessages([]);
          try {
            localStorage.removeItem(storageKey(documentId));
          } catch {
            /* noop */
          }
        }
      } finally {
        if (viva) setCargando(false);
      }
    }
    cargar();
    return () => {
      viva = false;
    };
  }, [chatId, token, documentId]);

  async function enviar(e) {
    e.preventDefault();
    const texto = pregunta.trim();
    if (!texto || enviando) return;

    setEnviando(true);
    setError(null);
    setPregunta('');
    setMessages((m) => [...m, { rol: 'user', contenido: texto }]);

    try {
      const data = await api('/api/chat', {
        method: 'POST',
        body: { chat_id: chatId || undefined, document_id: documentId, pregunta: texto },
        token,
      });
      if (!chatId) {
        setChatId(data.chat_id);
        try {
          localStorage.setItem(storageKey(documentId), data.chat_id);
        } catch {
          /* noop */
        }
      }
      setMessages((m) => [...m, { rol: 'ai', contenido: data.respuesta, fuentes: data.fuentes }]);
    } catch (err) {
      setError(err.message || 'No se pudo enviar la pregunta.');
      setMessages((m) => m.slice(0, -1));
      setPregunta(texto);
    } finally {
      setEnviando(false);
    }
  }

  function nuevaConversacion() {
    try {
      if (chatId) localStorage.removeItem(storageKey(documentId));
    } catch {
      /* noop */
    }
    setChatId(null);
    setMessages([]);
  }

  return (
    <section className="chat" aria-label="Chat con tu documento">
      <div className="chat__log" aria-live="polite" aria-atomic="false">
        {cargando ? (
          <Spinner />
        ) : messages.length === 0 ? (
          <p className="field__hint">
            Pregúntale algo a tu documento, por ejemplo: <em>«¿Cuáles son las ideas principales?»</em>
          </p>
        ) : (
          messages.map((m, i) => <ChatBubble key={m.id ?? i} rol={m.rol} content={m.contenido} fuentes={m.fuentes} />)
        )}
        {enviando ? <Spinner label="Pensando la respuesta…" /> : null}
      </div>

      {error ? (
        <p className="alert" role="alert">
          {error}
        </p>
      ) : null}

      <form className="chat__form" onSubmit={enviar}>
        <textarea
          className="textarea"
          aria-label="Escribe tu pregunta"
          placeholder="Escribe tu pregunta sobre el documento…"
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              enviar(e);
            }
          }}
          maxLength={2000}
        />
        <Button type="submit" variant="primary" loading={enviando} disabled={!pregunta.trim()}>
          Enviar
        </Button>
      </form>
      {chatId ? (
        <Button size="sm" variant="ghost" onClick={nuevaConversacion}>
          Iniciar conversación nueva
        </Button>
      ) : null}
    </section>
  );
}
