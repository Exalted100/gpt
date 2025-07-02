import React, { useState, useRef } from "react";
import "./App.css";

let openai = null; // Will be initialized after API key is provided

function App() {
  const [apiKey, setApiKey] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isClientReady, setIsClientReady] = useState(false);
  const [showModal, setShowModal] = useState(true);
  const [modalFade, setModalFade] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { role: "system", content: "You are a helpful assistant." },
  ]);
  const [chatResponse, setChatResponse] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const apiKeyInputRef = useRef(null);
  const chatHistoryRef = useRef(null);

  // API Key submission
  const handleApiKeySubmit = async (e) => {
    e.preventDefault();
    setError("");
    setAuthLoading(true);
    
    if (apiKey.trim()) {
      try {
        const { default: OpenAI } = await import("openai");
        openai = new OpenAI({
          apiKey: apiKey.trim(),
          dangerouslyAllowBrowser: true,
        });
        setIsAuthenticated(true);
        setIsClientReady(true);
        setModalFade(true);
        setTimeout(() => setShowModal(false), 400); // fade out duration
      } catch (err) {
        setError("Failed to initialize OpenAI client. Please check your API key.");
      }
    } else {
      setError("Please enter a valid OpenAI API key.");
      if (apiKeyInputRef.current) apiKeyInputRef.current.focus();
    }
    setAuthLoading(false);
  };

  // Chat handler
  const handleChat = async () => {
    setLoading(true);
    setError("");
    const newHistory = [
      ...chatHistory,
      { role: "user", content: chatInput },
    ];
    setChatHistory(newHistory);
    try {
      if (!openai) {
        setError("OpenAI client not initialized.");
        setLoading(false);
        return;
      }
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: newHistory,
      });
      const reply = completion.choices[0].message.content;
      setChatResponse(reply);
      setChatHistory([...newHistory, { role: "assistant", content: reply }]);
    } catch (err) {
      setChatResponse("");
      setError("Error: " + err.message);
    }
    setChatInput("");
    setLoading(false);
  };

  // Image handler
  const handleImage = async () => {
    setLoading(true);
    setError("");
    try {
      if (!openai) {
        setError("OpenAI client not initialized.");
        setLoading(false);
        return;
      }
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: "1024x1024",
      });
      setImageUrl(response.data[0].url);
    } catch (err) {
      setImageUrl("");
      setError("Image generation error: " + err.message);
    }
    setLoading(false);
  };

  // Scroll to bottom of chat history
  const scrollToBottom = () => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  };

  // Scroll to bottom when chat history updates
  React.useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // Modal overlay for API key
  const ApiKeyModal = React.useMemo(() => {
    return (
      <div className={`modal-overlay${modalFade ? " fade-out" : ""}`}>
        <div className="modal-card">
          <h2 className="modal-title">Enter OpenAI API Key</h2>
          <p className="modal-subtitle">
            Your API key is used locally and never stored on our servers.
          </p>
          <form onSubmit={handleApiKeySubmit} autoComplete="off">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="modal-input"
              disabled={authLoading}
              ref={apiKeyInputRef}
              autoFocus
            />
            <br />
            <button
              type="submit"
              className="modal-btn"
              disabled={authLoading || !apiKey}
            >
              {authLoading ? "Initializing..." : "Start Chatting"}
            </button>
          </form>
          {error && <div className="modal-error">{error}</div>}
        </div>
      </div>
    );
    // eslint-disable-next-line
  }, [modalFade, authLoading, apiKey, error]);

  if (!isAuthenticated) {
    return showModal ? ApiKeyModal : null;
  }

  if (!isClientReady) {
    return (
      <div className="App" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#282c34", color: "#fff" }}>
        <div>Initializing OpenAI client...</div>
      </div>
    );
  }

  return (
    <div className="App chat-app-bg">
      <div style={{ height: 40 }} /> {/* Padding above main container */}
      <div className="main-toggle-container">
        <div className="toggle-tabs">
          <button
            className={`toggle-tab${activeTab === "chat" ? " active" : ""}`}
            onClick={() => setActiveTab("chat")}
          >
            Chat
          </button>
          <button
            className={`toggle-tab${activeTab === "image" ? " active" : ""}`}
            onClick={() => setActiveTab("image")}
          >
            Image Generation
          </button>
        </div>
        <div className="main-content-box">
          {activeTab === "chat" ? (
            <div className="chat-section chat-box expanded-chat-box">
              <div className="chat-history" ref={chatHistoryRef}>
                {chatHistory.filter(m => m.role !== "system").map((msg, idx) => (
                  <div key={idx} className={`chat-message ${msg.role === "user" ? "user-msg" : "assistant-msg"}`}>
                    <div className="msg-header">
                      <span className="msg-role">{msg.role === "user" ? "You" : "Assistant"}</span>
                      <span className="msg-timestamp">{new Date().toLocaleTimeString()}</span>
                    </div>
                    <div className="msg-content">{msg.content}</div>
                  </div>
                ))}
              </div>
              <div className="chat-input-row">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type your message..."
                  className="chat-input"
                  disabled={loading}
                  rows={2}
                />
                <button className="chat-send-btn" onClick={handleChat} disabled={loading || !chatInput}>
                  Send
                </button>
              </div>
            </div>
          ) : (
            <div className="image-section image-box expanded-image-box">
              <div className="image-title">Image Generation</div>
              <div className="image-input-row">
                <input
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Describe an image to generate..."
                  className="image-input"
                  disabled={loading}
                />
                <button className="image-gen-btn" onClick={handleImage} disabled={loading || !imagePrompt}>
                  Generate
                </button>
              </div>
              {imageUrl && (
                <div className="image-preview-wrap">
                  <img
                    src={imageUrl}
                    alt="Generated"
                    className="image-preview"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {loading && <div className="loading-overlay">Loading...</div>}
      {error && <div className="chat-error-msg">{error}</div>}
    </div>
  );
}

export default App;
