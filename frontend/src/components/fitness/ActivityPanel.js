import React, { useState } from 'react';

const ACTIVITY_OPTIONS = [
  { value: 'bouldering',               label: 'Bouldering / Rock Climbing',      met: 7.5  },
  { value: 'weight_training_moderate', label: 'Gym – Weight Training (moderate)', met: 3.5  },
  { value: 'weight_training_vigorous', label: 'Gym – Weight Training (vigorous)', met: 6.0  },
  { value: 'cardio_moderate',          label: 'Cardio (moderate)',                met: 7.0  },
  { value: 'cardio_vigorous',          label: 'Cardio (vigorous)',                met: 10.0 },
  { value: 'circuit_training',         label: 'Circuit Training',                 met: 8.0  },
];

// Harris-Benedict BMR + MET formula — mirrors the backend calculation
function calcBMR(profile) {
  if (!profile) return null;
  const w = parseFloat(profile.weight_kg);
  const h = parseFloat(profile.height_cm);
  const a = parseInt(profile.age, 10);
  const g = profile.gender;
  if (!w || !h || !a || !g) return null;
  return g === 'male'
    ? 88.362 + 13.397 * w + 4.799 * h - 5.677 * a
    : 447.593 + 9.247 * w + 3.098 * h - 4.330 * a;
}

function previewCalories(profile, met, duration) {
  const bmr = calcBMR(profile);
  if (!bmr || !duration) return null;
  return Math.round(met * (bmr / 1440) * duration * 10) / 10;
}

function missingProfileFields(profile) {
  if (!profile) return ['age', 'height', 'weight', 'gender'];
  const missing = [];
  if (!profile.age)       missing.push('age');
  if (!profile.height_cm) missing.push('height');
  if (!profile.weight_kg) missing.push('weight');
  if (!profile.gender)    missing.push('gender');
  return missing;
}

const ActivityPanel = ({ activities, profile, onAdd, onDelete, saving, selectedDate }) => {
  const [showForm, setShowForm]     = useState(false);
  const [actType, setActType]       = useState(ACTIVITY_OPTIONS[0].value);
  const [duration, setDuration]     = useState('');
  const [notes, setNotes]           = useState('');

  const missing = missingProfileFields(profile);
  const selectedMET = ACTIVITY_OPTIONS.find(o => o.value === actType)?.met ?? 7.5;
  const preview = previewCalories(profile, selectedMET, parseInt(duration, 10));

  const isToday = (() => {
    const t = new Date();
    return (
      selectedDate.getFullYear() === t.getFullYear() &&
      selectedDate.getMonth()    === t.getMonth()    &&
      selectedDate.getDate()     === t.getDate()
    );
  })();

  const isFuture = selectedDate > new Date(new Date().setHours(23, 59, 59, 999));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const d = parseInt(duration, 10);
    if (!d || d <= 0) return;
    await onAdd({ activity_type: actType, duration_minutes: d, notes });
    setDuration('');
    setNotes('');
    setShowForm(false);
  };

  return (
    <div className="activity-panel">
      <div className="activity-panel-header">
        <h3 className="activity-panel-title">Activities</h3>
        {!isFuture && (
          <button
            className="btn-add-activity"
            onClick={() => setShowForm(f => !f)}
            disabled={saving}
          >
            {showForm ? 'Cancel' : '+ Log Activity'}
          </button>
        )}
      </div>

      {/* Profile warning */}
      {missing.length > 0 && (
        <p className="activity-profile-warning">
          Please update your <strong>{missing.join(', ')}</strong> in the{' '}
          <a href="/profile">Profile page</a> to enable activity calorie calculations.
        </p>
      )}

      {/* Add form */}
      {showForm && (
        <form className="activity-form" onSubmit={handleSubmit}>
          <div className="activity-form-row">
            <div className="activity-form-group">
              <label className="activity-label">Activity</label>
              <select
                className="activity-select"
                value={actType}
                onChange={e => setActType(e.target.value)}
              >
                {ACTIVITY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="activity-form-group activity-form-group--sm">
              <label className="activity-label">Duration (min)</label>
              <input
                type="number"
                className="activity-duration-input"
                min="1"
                max="600"
                placeholder="60"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                required
              />
            </div>
          </div>

          {preview !== null ? (
            <p className="activity-preview">
              Estimated: <strong>{preview} kcal</strong>
            </p>
          ) : missing.length > 0 ? (
            <p className="activity-preview activity-preview--warn">
              Update profile to see calorie estimate
            </p>
          ) : null}

          <input
            type="text"
            className="activity-notes-input"
            placeholder="Notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />

          <button
            type="submit"
            className="btn-save-activity"
            disabled={saving || missing.length > 0 || !duration}
          >
            {saving ? 'Saving...' : 'Save Activity'}
          </button>
        </form>
      )}

      {/* List */}
      {activities.length === 0 ? (
        <p className="activity-empty">No activities logged for this day.</p>
      ) : (
        <ul className="activity-list">
          {activities.map(a => (
            <li key={a.id} className="activity-item">
              <div className="activity-item-info">
                <span className="activity-item-name">{a.activity_label}</span>
                <span className="activity-item-meta">
                  {a.duration_minutes} min · {parseFloat(a.calories_burned).toLocaleString()} kcal
                </span>
                {a.notes && <span className="activity-item-notes">{a.notes}</span>}
              </div>
              <button
                className="btn-delete-activity"
                onClick={() => onDelete(a.id)}
                title="Delete activity"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ActivityPanel;
