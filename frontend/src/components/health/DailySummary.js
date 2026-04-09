import React from 'react';
import '../../styles/Health.css';

const DailySummary = ({ summary, onDeleteEntry, onEditEntry }) => {
  if (!summary) {
    return <div className="daily-summary">Loading...</div>;
  }

  const { entries, total_calories, total_protein, total_carbs, total_fat, total_fiber, entry_count } = summary;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="daily-summary">
      <div className="summary-header">
        <h2>Daily Summary</h2>
        <p className="summary-date">{formatDate(summary.date)}</p>
      </div>

      {entry_count === 0 ? (
        <div className="no-entries">
          <p>No food entries for this day yet.</p>
          <p>Click "Add Food Entry" to start tracking!</p>
        </div>
      ) : (
        <>
          <div className="totals-card">
            <h3>Daily Totals</h3>
            <div className="totals-grid">
              <div className="total-item calories">
                <div className="total-value">{parseFloat(total_calories).toFixed(0)}</div>
                <div className="total-label">Calories</div>
              </div>
              <div className="total-item protein">
                <div className="total-value">{parseFloat(total_protein).toFixed(1)}g</div>
                <div className="total-label">Protein</div>
              </div>
              <div className="total-item carbs">
                <div className="total-value">{parseFloat(total_carbs).toFixed(1)}g</div>
                <div className="total-label">Carbs</div>
              </div>
              <div className="total-item fat">
                <div className="total-value">{parseFloat(total_fat).toFixed(1)}g</div>
                <div className="total-label">Fat</div>
              </div>
              <div className="total-item fiber">
                <div className="total-value">{parseFloat(total_fiber).toFixed(1)}g</div>
                <div className="total-label">Fiber</div>
              </div>
            </div>
          </div>

          <div className="entries-list">
            <h3>Food Entries ({entry_count})</h3>
            {entries.map((entry) => (
              <div key={entry.id} className="entry-card">
                <div className="entry-header">
                  <h4>{entry.dish_name}</h4>
                  <div className="entry-actions">
                    <button
                      onClick={() => onDeleteEntry(entry.id)}
                      className="btn-delete-entry"
                      title="Delete entry"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="entry-nutrition">
                  <span className="nutrition-badge calories">
                    {parseFloat(entry.calories).toFixed(0)} cal
                  </span>
                  <span className="nutrition-badge protein">
                    P: {parseFloat(entry.protein).toFixed(1)}g
                  </span>
                  <span className="nutrition-badge carbs">
                    C: {parseFloat(entry.carbs).toFixed(1)}g
                  </span>
                  <span className="nutrition-badge fat">
                    F: {parseFloat(entry.fat).toFixed(1)}g
                  </span>
                  <span className="nutrition-badge fiber">
                    Fiber: {parseFloat(entry.fiber).toFixed(1)}g
                  </span>
                </div>
                {entry.notes && (
                  <div className="entry-notes">
                    <small>{entry.notes}</small>
                  </div>
                )}
                <div className="entry-time">
                  <small>Added: {new Date(entry.created_at).toLocaleTimeString()}</small>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default DailySummary;
