import { useState } from 'react';
import { recipeAPI } from '../../services/api';

const ShareRecipeModal = ({ recipe, isOwner, onClose, onVisibilityChange }) => {
  const [isPublic, setIsPublic]       = useState(recipe.is_public || false);
  const [toggling, setToggling]       = useState(false);
  const [linkCopied, setLinkCopied]   = useState(false);
  const [textCopied, setTextCopied]   = useState(false);

  const shareUrl = `${window.location.origin}/recipes/${recipe.id}`;

  // ── Toggle public/private ───────────────────────────────────────────────────
  const handleTogglePublic = async () => {
    setToggling(true);
    try {
      const res = await recipeAPI.togglePublic(recipe.id);
      const newState = res.data.is_public;
      setIsPublic(newState);
      onVisibilityChange(newState);
    } catch {
      // ignore
    } finally {
      setToggling(false);
    }
  };

  // ── Clipboard helper (works on HTTP too) ───────────────────────────────────
  const copyToClipboard = async (text) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
  };

  // ── Copy link ───────────────────────────────────────────────────────────────
  const handleCopyLink = async () => {
    await copyToClipboard(shareUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  // ── Copy as text ────────────────────────────────────────────────────────────
  const buildRecipeText = () => {
    const line = '─'.repeat(40);
    const ingredients = (recipe.recipe_ingredients || [])
      .map(ri => `  • ${ri.quantity} ${ri.unit} ${ri.ingredient?.name}`)
      .join('\n');

    const instructions = (recipe.instructions || '')
      .split('\n')
      .filter(l => l.trim())
      .map((l, i) => `${i + 1}. ${l.replace(/^\d+\.\s*/, '').trim()}`)
      .join('\n');

    return [
      `🍳 ${recipe.title.toUpperCase()}`,
      recipe.created_by?.username ? `by ${recipe.created_by.username}` : '',
      '',
      `⏱  Prep: ${recipe.prep_time} min  |  Cook: ${recipe.cook_time} min  |  Total: ${recipe.total_time} min`,
      `👥 Serves: ${recipe.servings}  |  Difficulty: ${recipe.difficulty}`,
      '',
      line,
      'INGREDIENTS',
      line,
      ingredients,
      '',
      line,
      'INSTRUCTIONS',
      line,
      instructions,
      '',
      `─ Shared via FreshPlate 🍳`,
    ].filter(l => l !== null).join('\n');
  };

  const handleCopyText = async () => {
    await copyToClipboard(buildRecipeText());
    setTextCopied(true);
    setTimeout(() => setTextCopied(false), 2500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box share-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Share Recipe</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="share-modal-body">

          {/* ── Share link section ── */}
          <div className="share-section">
            <div className="share-section-icon">🔗</div>
            <div className="share-section-content">
              <h3>Share Link</h3>

              {isOwner ? (
                <>
                  <p className="share-desc">
                    {isPublic
                      ? 'Your recipe is public — anyone with the link can view it.'
                      : 'Your recipe is private. Make it public to share the link.'}
                  </p>
                  <div className="share-toggle-row">
                    <button
                      className={`toggle-visibility-btn ${isPublic ? 'is-public' : 'is-private'}`}
                      onClick={handleTogglePublic}
                      disabled={toggling}
                    >
                      {toggling ? '...' : isPublic ? '🔓 Public' : '🔒 Private'}
                    </button>
                    <span className="share-toggle-hint">
                      {isPublic ? 'Click to make private' : 'Click to make public'}
                    </span>
                  </div>

                  {isPublic && (
                    <div className="share-url-row">
                      <input
                        className="share-url-input"
                        value={shareUrl}
                        readOnly
                        onClick={e => e.target.select()}
                      />
                      <button
                        className={`btn btn-primary btn-small share-copy-btn ${linkCopied ? 'copied' : ''}`}
                        onClick={handleCopyLink}
                      >
                        {linkCopied ? '✓ Copied!' : 'Copy'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {isPublic ? (
                    <>
                      <p className="share-desc">Copy the link and send it to anyone.</p>
                      <div className="share-url-row">
                        <input
                          className="share-url-input"
                          value={shareUrl}
                          readOnly
                          onClick={e => e.target.select()}
                        />
                        <button
                          className={`btn btn-primary btn-small share-copy-btn ${linkCopied ? 'copied' : ''}`}
                          onClick={handleCopyLink}
                        >
                          {linkCopied ? '✓ Copied!' : 'Copy'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="share-desc share-private-note">
                      This recipe is private and can't be shared via link.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="share-divider" />

          {/* ── Copy as text section ── */}
          <div className="share-section">
            <div className="share-section-icon">📋</div>
            <div className="share-section-content">
              <h3>Copy as Text</h3>
              <p className="share-desc">
                Copies the full recipe — ingredients and steps — as plain text.
                Great for WhatsApp, messages, or email.
              </p>
              <button
                className={`btn btn-outline share-text-btn ${textCopied ? 'copied' : ''}`}
                onClick={handleCopyText}
              >
                {textCopied ? '✓ Copied to clipboard!' : '📋 Copy Recipe as Text'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ShareRecipeModal;
