import React, { useState, useEffect } from 'react';
import '../../styles/Fitness.css';

const StepsPanel = ({ date, dailyLog, onSave, onDelete, saving, loading }) => {
  const [steps, setSteps] = useState('');
  const [notes, setNotes] = useState('');
  const [edited, setEdited] = useState(false);

  // Sync form when date or log changes
  useEffect(() => {
    setSteps(dailyLog?.steps != null ? String(dailyLog.steps) : '');
    setNotes(dailyLog?.notes || '');
    setEdited(false);
  }, [dailyLog, date]);

  const handleStepsChange = (e) => {
    const val = e.target.value;
    // Allow empty string while typing, or non-negative integers only
    if (val === '' || /^\d+$/.test(val)) {
      setSteps(val);
      setEdited(true);
    }
  };

  const handleNotesChange = (e) => {
    setNotes(e.target.value);
    setEdited(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const numSteps = steps === '' ? 0 : parseInt(steps, 10);
    onSave(numSteps, notes);
    setEdited(false);
  };

  const dateLabel = date.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  });

  const hasEntry = dailyLog?.id != null;

  return (
    <div className="steps-panel">
      <div className="steps-panel-header">
        <h3>Steps — {dateLabel}</h3>
        {hasEntry && (
          <button
            type="button"
            className="btn-delete-steps"
            onClick={onDelete}
            disabled={saving}
            title="Remove entry"
          >
            🗑️
          </button>
        )}
      </div>

      {loading ? (
        <p className="fitness-loading">Loading...</p>
      ) : (
        <form onSubmit={handleSubmit} className="steps-form">
          <div className="steps-input-row">
            <input
              type="number"
              className="steps-number-input"
              value={steps}
              onChange={handleStepsChange}
              placeholder="0"
              min="0"
              step="1"
            />
            <span className="steps-input-label">steps</span>
          </div>

          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={handleNotesChange}
              placeholder="e.g. Morning jog + evening walk"
              rows="2"
            />
          </div>

          <button
            type="submit"
            className={`btn-save-steps ${edited ? 'unsaved' : ''}`}
            disabled={saving}
          >
            {saving ? 'Saving...' : hasEntry ? 'Update Steps' : 'Save Steps'}
          </button>
        </form>
      )}
    </div>
  );
};

export default StepsPanel;
