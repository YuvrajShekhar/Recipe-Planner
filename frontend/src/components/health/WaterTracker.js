import { useState, useEffect, useCallback } from 'react';
import { waterAPI } from '../../services/api';

const INCREMENTS = [50, 100, 250, 500];

const WaterTracker = ({ selectedDate, formatDate }) => {
    const [data, setData] = useState(null); // { amount_ml, goal_ml, completed }
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const dateStr = formatDate(selectedDate);

    const fetchWater = useCallback(async () => {
        try {
            setLoading(true);
            const res = await waterAPI.get(dateStr);
            setData(res.data);
        } catch {
            setError('Failed to load water data');
        } finally {
            setLoading(false);
        }
    }, [dateStr]);

    useEffect(() => { fetchWater(); }, [fetchWater]);

    const handleAdd = async (ml) => {
        if (saving) return;
        setSaving(true);
        setError('');
        try {
            const res = await waterAPI.add(dateStr, ml);
            setData(res.data);
        } catch {
            setError('Failed to update water intake');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (saving || !window.confirm('Reset water intake for this day?')) return;
        setSaving(true);
        try {
            const res = await waterAPI.reset(dateStr);
            setData(res.data);
        } catch {
            setError('Failed to reset');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="water-tracker-card"><p className="water-loading">Loading...</p></div>;

    const amount = data?.amount_ml ?? 0;
    const goal   = data?.goal_ml ?? 2500;
    const pct    = Math.min(100, Math.round((amount / goal) * 100));
    const completed = data?.completed ?? false;
    const remaining = Math.max(0, goal - amount);

    const fmtMl = (ml) => ml >= 1000 ? `${(ml / 1000).toFixed(1).replace(/\.0$/, '')} L` : `${ml} ml`;

    return (
        <div className={`water-tracker-card ${completed ? 'water-completed' : ''}`}>
            <div className="water-header">
                <div className="water-title">
                    <span className="water-icon">💧</span>
                    <span>Water Intake</span>
                </div>
                {amount > 0 && (
                    <button className="water-reset-btn" onClick={handleReset} disabled={saving} title="Reset">
                        ↺
                    </button>
                )}
            </div>

            {error && <p className="water-error">{error}</p>}

            {/* Bottle progress */}
            <div className="water-bottle-wrap">
                <div className="water-bottle">
                    <div
                        className="water-bottle-fill"
                        style={{ height: `${pct}%` }}
                    />
                    <span className="water-bottle-label">{pct}%</span>
                </div>
                <div className="water-stats">
                    <div className="water-stat">
                        <span className="water-stat-val">{fmtMl(amount)}</span>
                        <span className="water-stat-lbl">consumed</span>
                    </div>
                    <div className="water-stat-divider" />
                    <div className="water-stat">
                        <span className="water-stat-val">{fmtMl(goal)}</span>
                        <span className="water-stat-lbl">daily goal</span>
                    </div>
                    <div className="water-stat-divider" />
                    <div className="water-stat">
                        <span className={`water-stat-val ${completed ? 'water-stat-done' : 'water-stat-left'}`}>
                            {completed ? '✓ Done' : fmtMl(remaining)}
                        </span>
                        <span className="water-stat-lbl">{completed ? 'goal reached!' : 'remaining'}</span>
                    </div>
                </div>
            </div>

            {/* Progress bar */}
            <div className="water-progress-bar">
                <div className="water-progress-fill" style={{ width: `${pct}%` }} />
            </div>

            {completed && (
                <div className="water-goal-banner">
                    Goal reached! Great job staying hydrated today.
                </div>
            )}

            {/* Add buttons */}
            <div className="water-btn-row">
                {INCREMENTS.map(ml => (
                    <button
                        key={ml}
                        className="water-add-btn"
                        onClick={() => handleAdd(ml)}
                        disabled={saving}
                    >
                        +{ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default WaterTracker;
