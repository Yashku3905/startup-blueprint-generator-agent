import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import html2pdf from 'html2pdf.js';

// Example startup ideas
const IDEAS_EXAMPLES = [
  "An AI-powered agricultural drone that detects crop diseases early using thermal imaging and multispectral cameras.",
  "A D2C brand selling organic, custom-formulated skincare using traditional Indian herbs and cold-pressed oils.",
  "A carbon footprint tracking SaaS for medium-sized logistics companies in India to optimize route emissions.",
  "A modular, affordable water purification device for rural communities operated on solar power."
];

function App() {
  const [idea, setIdea] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [blueprint, setBlueprint] = useState('');
  const [activeTab, setActiveTab] = useState('full');
  const [error, setError] = useState('');

  // Loading steps animation
  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < 4 ? prev + 1 : prev));
      }, 2000);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!idea.trim()) return;

    setLoading(true);
    setError('');
    setBlueprint('');
    setActiveTab('full');

    try {
      // Use configured backend URL, defaulting to relative path in production (Vercel rewrites) and localhost in development
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '' : 'http://localhost:8000');
      const response = await axios.post(`${apiBaseUrl}/api/generate`, {
        idea: idea
      });

      if (response.data && response.data.blueprint) {
        setBlueprint(response.data.blueprint);
        setActiveTab('summary'); // Switch to first parsed tab on success
      } else if (response.data && response.data.error) {
        setError(response.data.error);
      } else {
        setError('Failed to generate blueprint. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        err.message || 
        'Could not connect to the backend server. Please verify it is running on port 8000.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (exampleText) => {
    setIdea(exampleText);
  };

  const handleReset = () => {
    setIdea('');
    setBlueprint('');
    setError('');
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('pdf-report-template');
    if (!element) return;

    const opt = {
      margin:       [0.6, 0.6, 0.6, 0.6],
      filename:     `Startup_Blueprint_${idea.replace(/[^a-z0-9]/gi, '_').substring(0, 20)}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0
      },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' },
      pagebreak:    { mode: ['css', 'legacy'] }
    };

    html2pdf()
      .from(element)
      .set(opt)
      .save()
      .catch((err) => {
        console.error('PDF Generation Error:', err);
      });
  };


  // Helper to extract sections from the Markdown text
  const getSectionContent = (sectionName) => {
    if (!blueprint) return '';

    const sectionsPatterns = {
      summary: {
        headers: ['Executive Summary'],
        next: ['Business Model Canvas', 'Estimated Budget', 'Go-to-Market', 'Suggested Indian Government', 'Recommended Investors', 'Potential Investor']
      },
      canvas: {
        headers: ['Business Model Canvas'],
        next: ['Estimated Budget', 'Go-to-Market', 'Suggested Indian Government', 'Recommended Investors', 'Potential Investor', 'Executive Summary']
      },
      budget: {
        headers: ['Estimated Budget', 'Budget Execution', 'Budget Plan'],
        next: ['Go-to-Market', 'Suggested Indian Government', 'Recommended Investors', 'Potential Investor', 'Executive Summary', 'Business Model Canvas']
      },
      gtm: {
        headers: ['Go-to-Market', 'GTM Strategy', 'Go-to-market Strategy'],
        next: ['Suggested Indian Government', 'Recommended Investors', 'Potential Investor', 'Executive Summary', 'Business Model Canvas', 'Estimated Budget']
      },
      schemes: {
        headers: ['Suggested Indian Government Schemes', 'Government Schemes', 'Indian Government Schemes', 'Suggested Government Schemes'],
        next: ['Recommended Investors', 'Potential Investor', 'Executive Summary', 'Business Model Canvas', 'Estimated Budget', 'Go-to-Market']
      },
      investors: {
        headers: ['Recommended Investors', 'Investors & Incubators', 'Potential Investor Connections', 'Recommended Investor'],
        next: ['Executive Summary', 'Business Model Canvas', 'Estimated Budget', 'Go-to-Market', 'Suggested Indian Government']
      }
    };

    const config = sectionsPatterns[sectionName];
    if (!config) return '';

    for (const header of config.headers) {
      const escapedHeader = header.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      
      // Look for Markdown headers (e.g., #, ##, ###) followed by the section name
      const nextPatterns = config.next.map(n => {
        const escapedNext = n.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        return `\\n#+\\s+\\d*\\.?\\s*${escapedNext}`;
      }).join('|');

      const regexStr = `(?:^|\\n)#+\\s+\\d*\\.?\\s*${escapedHeader}[\\s\\S]*?(?=${nextPatterns}|$)`;
      const regex = new RegExp(regexStr, 'i');
      const match = blueprint.match(regex);
      if (match) {
        return match[0].trim();
      }
    }

    // Fallback search for plain text headers
    for (const header of config.headers) {
      const escapedHeader = header.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(?:^|\\n)\\d*\\.?\\s*\\*?\\*?${escapedHeader}\\*?\\*?[\\s\\S]*?(?=\\n\\d*\\.?\\s*\\*?\\*?(?:${config.next.join('|')})\\*?\\*?|$)`, 'i');
      const match = blueprint.match(regex);
      if (match) {
        return match[0].trim();
      }
    }

    return '';
  };

  const activeContent = activeTab === 'full' ? blueprint : getSectionContent(activeTab);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="logo-section">
          <span className="logo-icon">⚡</span>
          <h1 className="logo-text">Startup Blueprint Generator</h1>
        </div>
        <div className="tech-tag">Powered by IBM Granite RAG</div>
      </header>

      {/* Main Content Area */}
      {!blueprint && !loading && (
        <div className="hero-section">
          <h2 className="hero-title">From Idea to Venture in Seconds</h2>
          <p className="hero-subtitle">
            Describe your startup concept in simple terms. Our RAG-powered AI agent will query 
            the latest Indian government schemes, compliance frameworks, funding guides, 
            and incubator portals to generate a complete business blueprint.
          </p>

          <div className="form-panel">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="idea-input">
                  Describe your startup idea
                </label>
                <textarea
                  id="idea-input"
                  className="idea-textarea"
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="e.g., An IoT device that tracks soil health and automates micro-irrigation for medium-sized Indian farms..."
                  required
                />
              </div>

              <div className="form-group examples-container">
                <span className="examples-title">Need inspiration? Try these examples:</span>
                <div className="examples-list">
                  {IDEAS_EXAMPLES.map((ex, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="example-btn"
                      onClick={() => handleExampleClick(ex)}
                    >
                      {ex.length > 50 ? `${ex.substring(0, 50)}...` : ex}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="submit-btn" disabled={!idea.trim()}>
                Generate Startup Blueprint
              </button>
            </form>

            {error && (
              <div style={{ marginTop: '1.5rem', color: '#ff007f', background: 'rgba(255, 0, 127, 0.1)', border: '1px solid rgba(255, 0, 127, 0.2)', padding: '1rem', borderRadius: '12px', textAlign: 'left', fontSize: '0.9rem' }}>
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading Screen */}
      {loading && (
        <div className="form-panel" style={{ maxWidth: '650px', margin: '4rem auto' }}>
          <div className="loading-container">
            <div className="spinner"></div>
            <h2 className="hero-title" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
              Crafting Your Blueprint
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Analyzing details and conducting market research mapping...
            </p>
            
            <div className="loading-steps">
              <div className={`loading-step ${loadingStep === 0 ? 'active' : loadingStep > 0 ? 'completed' : ''}`}>
                <span className="step-bullet">{loadingStep > 0 ? '✓' : '1'}</span>
                <span>Analyzing startup concept & industry</span>
              </div>
              <div className={`loading-step ${loadingStep === 1 ? 'active' : loadingStep > 1 ? 'completed' : ''}`}>
                <span className="step-bullet">{loadingStep > 1 ? '✓' : '2'}</span>
                <span>Querying government policies & seed funds (RAG)</span>
              </div>
              <div className={`loading-step ${loadingStep === 2 ? 'active' : loadingStep > 2 ? 'completed' : ''}`}>
                <span className="step-bullet">{loadingStep > 2 ? '✓' : '3'}</span>
                <span>Structuring Business Model Canvas</span>
              </div>
              <div className={`loading-step ${loadingStep === 3 ? 'active' : loadingStep > 3 ? 'completed' : ''}`}>
                <span className="step-bullet">{loadingStep > 3 ? '✓' : '4'}</span>
                <span>Calculating estimated budget & roadmap</span>
              </div>
              <div className={`loading-step ${loadingStep === 4 ? 'active' : ''}`}>
                <span className="step-bullet">5</span>
                <span>Synthesizing final strategist report</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Blueprint Viewer Dashboard */}
      {blueprint && !loading && (
        <div className="blueprint-layout">
          {/* Sidebar Navigation */}
          <aside className="sidebar-navigation">
            <button 
              className={`nav-tab ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => setActiveTab('summary')}
            >
              <span className="tab-icon">📋</span> Executive Summary
            </button>
            <button 
              className={`nav-tab ${activeTab === 'canvas' ? 'active' : ''}`}
              onClick={() => setActiveTab('canvas')}
            >
              <span className="tab-icon">📐</span> Business Canvas
            </button>
            <button 
              className={`nav-tab ${activeTab === 'gtm' ? 'active' : ''}`}
              onClick={() => setActiveTab('gtm')}
            >
              <span className="tab-icon">🚀</span> GTM Strategy
            </button>
            <button 
              className={`nav-tab ${activeTab === 'schemes' ? 'active' : ''}`}
              onClick={() => setActiveTab('schemes')}
            >
              <span className="tab-icon">🏛️</span> Funding & Schemes
            </button>
            <button 
              className={`nav-tab ${activeTab === 'investors' ? 'active' : ''}`}
              onClick={() => setActiveTab('investors')}
            >
              <span className="tab-icon">🤝</span> Investor Directory
            </button>
            <button 
              className={`nav-tab ${activeTab === 'budget' ? 'active' : ''}`}
              onClick={() => setActiveTab('budget')}
            >
              <span className="tab-icon">💰</span> Budget Allocation
            </button>
            <button 
              className={`nav-tab ${activeTab === 'full' ? 'active' : ''}`}
              onClick={() => setActiveTab('full')}
            >
              <span className="tab-icon">📖</span> Full Strategist Report
            </button>

            <button className="download-pdf-btn" onClick={handleDownloadPDF}>
              <span className="tab-icon">📥</span> Download PDF Report
            </button>

            <button className="reset-btn" onClick={handleReset}>
              <span>↺</span> Create Another Blueprint
            </button>
          </aside>

          {/* Document Content Display */}
          <main className="content-display">
            {activeContent ? (
              <ReactMarkdown>{activeContent}</ReactMarkdown>
            ) : (
              <div>
                <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Section</h2>
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '1rem' }}>
                  This specific section could not be isolated due to formatting variation in the response. 
                  Please review the complete plan in the <strong>Full Strategist Report</strong> tab.
                </p>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Off-screen PDF Template Wrapper */}
      {blueprint && (
        <div 
          style={{ 
            position: 'absolute', 
            left: '-9999px',
            top: '0px',
            width: '800px',
            pointerEvents: 'none'
          }}
        >
          <div 
            id="pdf-report-template" 
            style={{ 
              backgroundColor: '#ffffff',
              width: '800px'
            }}
          >
            <div className="pdf-print-container">
              <div className="pdf-header-block">
                <h1>Startup Business Blueprint</h1>
                <p className="subtitle">Custom Strategist Report & Roadmap</p>
                <div style={{ marginTop: '12px', fontSize: '14px', color: '#475569' }}>
                  <strong>Startup Idea:</strong> "{idea}"
                </div>
                <div style={{ marginTop: '5px', fontSize: '12px', color: '#64748b' }}>
                  Generated on {new Date().toLocaleDateString()}
                </div>
              </div>
              <div className="pdf-body">
                <ReactMarkdown>{blueprint}</ReactMarkdown>
              </div>
              <div className="pdf-footer-block">
                Generated by Startup Blueprint Generator • Powered by IBM Watsonx Llama-3.3-70b
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
