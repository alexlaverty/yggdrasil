import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('http://localhost:8001/api/chat', {
        messages: newMessages
      });

      setMessages([
        ...newMessages,
        { role: 'assistant', content: response.data.response }
      ]);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
      console.error('Chat error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '70vh' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <h2 style={{ margin: 0 }}>Family Tree Chat</h2>
        <button
          onClick={clearChat}
          style={{
            padding: '8px 16px',
            backgroundColor: '#95a5a6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Clear Chat
        </button>
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#fadbd8',
          borderLeft: '4px solid #c0392b',
          borderRadius: '4px',
          marginBottom: '1rem',
          color: '#c0392b'
        }}>
          Error: {error}
        </div>
      )}

      {/* Messages container */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        marginBottom: '1rem',
        border: '1px solid #ddd'
      }}>
        {messages.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#95a5a6',
            marginTop: '2rem'
          }}>
            <p style={{ fontSize: '18px', marginBottom: '1rem' }}>
              Welcome to your Family Tree Assistant!
            </p>
            <p style={{ fontSize: '14px' }}>
              Ask me questions about your family history, like:
            </p>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              fontSize: '14px',
              marginTop: '1rem'
            }}>
              <li>"Who was born in London?"</li>
              <li>"Tell me about John Smith"</li>
              <li>"Who are the siblings of person ID 5?"</li>
              <li>"List all people in the database"</li>
            </ul>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              <div
                style={{
                  maxWidth: '70%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: msg.role === 'user' ? '#1abc9c' : '#fff',
                  color: msg.role === 'user' ? '#fff' : '#333',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                <div style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  marginBottom: '4px',
                  opacity: 0.8
                }}>
                  {msg.role === 'user' ? 'You' : 'Assistant'}
                </div>
                {msg.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-start',
            marginBottom: '1rem'
          }}>
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: '#fff',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              color: '#95a5a6'
            }}>
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask about your family tree..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: '2px solid #bdc3c7',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.3s'
          }}
          onFocus={(e) => e.target.style.borderColor = '#1abc9c'}
          onBlur={(e) => e.target.style.borderColor = '#bdc3c7'}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{
            padding: '12px 24px',
            backgroundColor: loading || !input.trim() ? '#95a5a6' : '#1abc9c',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'background-color 0.3s'
          }}
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

export default Chat;
