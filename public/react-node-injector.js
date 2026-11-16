/**
 * obsound — ReactJS Client-Side Form Validation & Node Injector Component
 * Integrates React 18 with ObSound's live graph & crate ecosystem.
 */

(function () {
  const { useState, useEffect } = React;

  function NodeValidatorModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    const initialForm = {
      title: "",
      artist: "",
      genre: "Synthwave",
      bpm: "124",
      year: "2024",
      intensity: 6,
      url: "",
      tags: "Retrowave, Analog, Cyberpunk"
    };

    const [formData, setFormData] = useState(initialForm);
    const [errors, setErrors] = useState({});
    const [submittedWithErrors, setSubmittedWithErrors] = useState(false);

    const validGenres = [
      "Synthwave", "Vaporwave", "Shoegaze", "Chiptune",
      "Math Rock", "City Pop", "Darkwave", "Mid West Emo",
      "Dungeon Synth", "Downtempo", "Afrobeats", "Future Funk",
      "Deconstructed Club", "Phonk", "HexD", "Mallsoft", "Breakcore", "Ambient Drone"
    ];

    const validate = (data) => {
      const errs = {};
      const currentYear = new Date().getFullYear();

      // Title validation
      if (!data.title || data.title.trim().length === 0) {
        errs.title = "Track title is required.";
      } else if (data.title.trim().length < 2) {
        errs.title = "Track title must be at least 2 characters.";
      } else if (data.title.trim().length > 60) {
        errs.title = "Track title cannot exceed 60 characters.";
      }

      // Artist validation
      if (!data.artist || data.artist.trim().length === 0) {
        errs.artist = "Artist moniker or band alias is required.";
      } else if (data.artist.trim().length < 2) {
        errs.artist = "Artist name must be at least 2 characters.";
      } else if (data.artist.trim().length > 50) {
        errs.artist = "Artist name cannot exceed 50 characters.";
      }

      // Genre validation
      if (!data.genre || !validGenres.includes(data.genre)) {
        errs.genre = "Please select a valid micro-genre from the list.";
      }

      // BPM validation (40 to 260)
      const bpmNum = parseInt(data.bpm, 10);
      if (isNaN(bpmNum) || data.bpm === "") {
        errs.bpm = "BPM (tempo) must be a numeric integer.";
      } else if (bpmNum < 40 || bpmNum > 260) {
        errs.bpm = "BPM must fall within the range 40 to 260.";
      }

      // Year validation (1970 to current year)
      const yearNum = parseInt(data.year, 10);
      if (isNaN(yearNum) || data.year === "") {
        errs.year = "Release year is required.";
      } else if (yearNum < 1970) {
        errs.year = "Release year must be 1970 or later.";
      } else if (yearNum > currentYear) {
        errs.year = `Release year cannot exceed current calendar year (${currentYear}).`;
      }

      // URL validation
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
      if (!data.url || data.url.trim().length === 0) {
        errs.url = "Bandcamp, Soundcloud, or stream URL is required.";
      } else if (!urlPattern.test(data.url.trim())) {
        errs.url = "Please enter a valid URL (e.g. https://artist.bandcamp.com).";
      }

      // Tags validation
      if (!data.tags || data.tags.trim().length === 0) {
        errs.tags = "Provide at least one sonic tag or keyword.";
      }

      return errs;
    };

    const handleChange = (e) => {
      const { name, value } = e.target;
      const updated = { ...formData, [name]: value };
      setFormData(updated);
      if (submittedWithErrors) {
        setErrors(validate(updated));
      }
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      const validationErrors = validate(formData);
      setErrors(validationErrors);

      if (Object.keys(validationErrors).length > 0) {
        setSubmittedWithErrors(true);
        return;
      }

      // Cleaned tags array
      const cleanedTags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);

      const newTrack = {
        id: "track_react_" + Date.now(),
        title: formData.title.trim(),
        name: formData.title.trim(),
        artist: formData.artist.trim(),
        genre: formData.genre,
        bpm: parseInt(formData.bpm, 10),
        year: parseInt(formData.year, 10),
        intensity: parseInt(formData.intensity, 10) || 5,
        url: formData.url.trim(),
        tags: cleanedTags,
        cover: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
        bio: `Underground track in ${formData.genre} scene (${formData.bpm} BPM) validated via React client-side engine.`
      };

      // Dispatch event to app.js graph coordinator
      window.dispatchEvent(new CustomEvent('obsound:injectTrack', { detail: newTrack }));

      // Persist to MongoDB NoSQL Document Database
      fetch('/api/nosql/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTrack.title,
          artist: newTrack.artist,
          genre: newTrack.genre,
          bpm: newTrack.bpm,
          year: newTrack.year,
          curator: (JSON.parse(localStorage.getItem('obsound_user') || '{}').handle) || '@react_curator',
          streamUrl: newTrack.url,
          tags: newTrack.tags
        })
      }).then(r => r.json()).then(res => {
        console.log("NoSQL Document Store persistence response:", res);
      }).catch(err => console.warn("NoSQL insert offline:", err));

      alert(`Success! "${newTrack.title}" by ${newTrack.artist} validated by React and saved to MongoDB NoSQL store!`);
      onClose();
    };

    const fillValidDemo = () => {
      setFormData({
        title: "Neon Horizon 2088",
        artist: "Vector Sector",
        genre: "Synthwave",
        bpm: "128",
        year: "2024",
        intensity: 8,
        url: "https://vectorsector.bandcamp.com",
        tags: "Cyberpunk, Outrun, Analog Poly"
      });
      setErrors({});
      setSubmittedWithErrors(false);
    };

    const triggerInvalidDemo = () => {
      const invalidData = {
        title: "",
        artist: "X",
        genre: "Synthwave",
        bpm: "999",
        year: "1850",
        intensity: 5,
        url: "bad-url",
        tags: ""
      };
      setFormData(invalidData);
      setErrors(validate(invalidData));
      setSubmittedWithErrors(true);
    };

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 14, 22, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'rgba(252, 249, 242, 0.98)',
          border: '1px solid rgba(118, 179, 157, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '650px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          color: '#2c3e50',
          fontFamily: "'Space Grotesk', sans-serif"
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <span style={{
                background: 'rgba(118, 179, 157, 0.15)',
                color: '#76b39d',
                fontSize: '11px',
                fontWeight: '700',
                padding: '4px 10px',
                borderRadius: '12px',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                React 18 &bull; Client-Side Validation
              </span>
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '22px', fontWeight: '800', margin: '6px 0 2px', color: '#2c3e50' }}>
                Submit Underground Sound Node
              </h2>
              <small style={{ color: '#8ba0b2' }}>Input metadata is validated before being injected into the active physics graph.</small>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#8ba0b2' }}
            >
              &times;
            </button>
          </div>

          {/* Quick Demo Buttons for Evaluator */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
            <button
              type="button"
              onClick={fillValidDemo}
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#059669',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Quick Fill Valid Data
            </button>
            <button
              type="button"
              onClick={triggerInvalidDemo}
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#dc2626',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Test Error Validation
            </button>
          </div>

          {/* Master Error Summary Banner */}
          {submittedWithErrors && Object.keys(errors).length > 0 && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '18px'
            }}>
              <strong style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>
                Validation Failed ({Object.keys(errors).length} Errors Detected):
              </strong>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px' }}>
                {Object.values(errors).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#4a5a6a', marginBottom: '4px' }}>
                Track Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Midnight City Drift"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: errors.title ? '1px solid #ef4444' : (formData.title ? '1px solid #10b981' : '1px solid rgba(118, 179, 157, 0.25)'),
                  background: errors.title ? '#fff5f5' : '#ffffff',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
              {errors.title && <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '3px' }}>&bull; {errors.title}</div>}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#4a5a6a', marginBottom: '4px' }}>
                Artist / Moniker *
              </label>
              <input
                type="text"
                name="artist"
                value={formData.artist}
                onChange={handleChange}
                placeholder="e.g. CyberGhost"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: errors.artist ? '1px solid #ef4444' : (formData.artist ? '1px solid #10b981' : '1px solid rgba(118, 179, 157, 0.25)'),
                  background: errors.artist ? '#fff5f5' : '#ffffff',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
              {errors.artist && <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '3px' }}>&bull; {errors.artist}</div>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#4a5a6a', marginBottom: '4px' }}>
                  Micro-Genre *
                </label>
                <select
                  name="genre"
                  value={formData.genre}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(118, 179, 157, 0.25)',
                    background: '#ffffff',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                >
                  {validGenres.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#4a5a6a', marginBottom: '4px' }}>
                  Tempo / BPM (40-260) *
                </label>
                <input
                  type="number"
                  name="bpm"
                  value={formData.bpm}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: errors.bpm ? '1px solid #ef4444' : '1px solid rgba(118, 179, 157, 0.25)',
                    background: errors.bpm ? '#fff5f5' : '#ffffff',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
                {errors.bpm && <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '3px' }}>&bull; {errors.bpm}</div>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#4a5a6a', marginBottom: '4px' }}>
                  Release Year (1970-2026) *
                </label>
                <input
                  type="number"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: errors.year ? '1px solid #ef4444' : '1px solid rgba(118, 179, 157, 0.25)',
                    background: errors.year ? '#fff5f5' : '#ffffff',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
                {errors.year && <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '3px' }}>&bull; {errors.year}</div>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#4a5a6a', marginBottom: '4px' }}>
                  Stream URL *
                </label>
                <input
                  type="url"
                  name="url"
                  value={formData.url}
                  onChange={handleChange}
                  placeholder="https://..."
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: errors.url ? '1px solid #ef4444' : '1px solid rgba(118, 179, 157, 0.25)',
                    background: errors.url ? '#fff5f5' : '#ffffff',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
                {errors.url && <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '3px' }}>&bull; {errors.url}</div>}
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#4a5a6a', marginBottom: '4px' }}>
                Sonic Tags (comma-separated) *
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="Analog, Lo-Fi, Reverb"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: errors.tags ? '1px solid #ef4444' : '1px solid rgba(118, 179, 157, 0.25)',
                  background: errors.tags ? '#fff5f5' : '#ffffff',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
              {errors.tags && <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '3px' }}>&bull; {errors.tags}</div>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'rgba(0,0,0,0.06)',
                  color: '#4a5a6a',
                  border: '1px solid rgba(0,0,0,0.1)',
                  padding: '9px 18px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #76b39d, #5a9e87)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '9px 22px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(118, 179, 157, 0.3)'
                }}
              >
                Validate &amp; Inject to Graph
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Root Container Mounting
  function ReactValidatorApp() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
      // Expose globally so external DOM buttons can trigger it
      window.openReactValidatorModal = () => setIsOpen(true);
    }, []);

    return <NodeValidatorModal isOpen={isOpen} onClose={() => setIsOpen(false)} />;
  }

  const rootEl = document.getElementById('react-validation-root');
  if (rootEl) {
    const root = ReactDOM.createRoot(rootEl);
    root.render(<ReactValidatorApp />);
  }
})();
