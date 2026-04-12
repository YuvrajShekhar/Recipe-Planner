import { useState, useEffect, useCallback } from 'react';
import { fitnessAPI, healthAPI, activityAPI, authAPI } from '../services/api';
import MonthCalendar from '../components/health/MonthCalendar';
import StepsPanel from '../components/fitness/StepsPanel';
import ActivityPanel from '../components/fitness/ActivityPanel';
import '../styles/Fitness.css';

const GOAL         = 10000;
const FALLBACK_BMR = 1600;   // used when profile is incomplete

// Local-timezone date string YYYY-MM-DD
const toLocalDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Harris-Benedict BMR — mirrors backend + ActivityPanel logic
const calcBMR = (profile) => {
  if (!profile) return null;
  const w = parseFloat(profile.weight_kg);
  const h = parseFloat(profile.height_cm);
  const a = parseInt(profile.age, 10);
  const g = profile.gender;
  if (!w || !h || !a || !g) return null;
  return g === 'male'
    ? 88.362 + 13.397 * w + 4.799 * h - 5.677 * a
    : 447.593 + 9.247 * w + 3.098 * h - 4.330 * a;
};

const Fitness = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyLog, setDailyLog] = useState(null);            // { id, date, steps, notes, source } | null
  const [monthlyData, setMonthlyData] = useState({});        // { 'YYYY-MM-DD': steps }
  const [healthSummary, setHealthSummary] = useState(null);  // today's nutrition totals
  const [fitbitConnected, setFitbitConnected] = useState(null);
  const [userProfile, setUserProfile] = useState(null);      // { age, height_cm, weight_kg, gender }
  const [activities, setActivities] = useState([]);          // ActivityLog entries for selectedDate
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingActivity, setSavingActivity] = useState(false);
  const [error, setError] = useState(null);

  // Fitbit setup form state
  const [showFitbitForm, setShowFitbitForm] = useState(false);
  const [fitbitTokens, setFitbitTokens] = useState({ access_token: '', refresh_token: '' });
  const [savingTokens, setSavingTokens] = useState(false);
  const [tokenError, setTokenError] = useState(null);

  // ── Fetchers ────────────────────────────────────────────────────────────────

  const fetchDaily = useCallback(async (date) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fitnessAPI.syncSteps(toLocalDate(date));
      setDailyLog(res.data);
      if (res.data.fitbit_connected !== undefined) {
        setFitbitConnected(res.data.fitbit_connected);
      }
    } catch (err) {
      setError('Failed to load fitness data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMonthly = useCallback(async (date) => {
    try {
      const res = await fitnessAPI.getMonthlySummary(date.getMonth() + 1, date.getFullYear());
      const byDate = {};
      (res.data.logs || []).forEach(log => {
        byDate[log.date] = log.steps;
      });
      setMonthlyData(byDate);
    } catch {
      // non-critical — calendar dots just won't show
    }
  }, []);

  const fetchHealthSummary = useCallback(async (date) => {
    try {
      const res = await healthAPI.getDailySummary(toLocalDate(date));
      setHealthSummary(res.data);
    } catch {
      setHealthSummary(null);
    }
  }, []);

  const fetchActivities = useCallback(async (date) => {
    try {
      const res = await activityAPI.getByDate(toLocalDate(date));
      setActivities(res.data || []);
    } catch {
      setActivities([]);
    }
  }, []);

  // Fetch profile once on mount
  useEffect(() => {
    authAPI.getProfile().then(res => {
      setUserProfile(res.data?.user?.profile ?? null);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchDaily(selectedDate);
    fetchMonthly(selectedDate);
    fetchHealthSummary(selectedDate);
    fetchActivities(selectedDate);
  }, [selectedDate, fetchDaily, fetchMonthly, fetchHealthSummary, fetchActivities]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };

  const handleSave = async (steps, notes, weightKg) => {
    try {
      setSaving(true);
      setError(null);
      const res = await fitnessAPI.saveLog({
        date: toLocalDate(selectedDate),
        steps,
        notes,
        weight_kg: weightKg,
      });
      setDailyLog(prev => ({ ...res.data, source: 'manual', fitbit_connected: prev?.fitbit_connected }));
      // Refresh calendar dots
      await fetchMonthly(selectedDate);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save steps');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!dailyLog?.id) return;
    if (!window.confirm('Remove steps entry for this day?')) return;
    try {
      setSaving(true);
      await fitnessAPI.deleteLog(dailyLog.id);
      setDailyLog({ id: null, date: toLocalDate(selectedDate), steps: 0, notes: '', source: 'manual' });
      await fetchMonthly(selectedDate);
    } catch {
      setError('Failed to delete entry');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTokens = async (e) => {
    e.preventDefault();
    if (!fitbitTokens.access_token.trim() || !fitbitTokens.refresh_token.trim()) {
      setTokenError('Both tokens are required');
      return;
    }
    try {
      setSavingTokens(true);
      setTokenError(null);
      await fitnessAPI.setupFitbit(fitbitTokens);
      setFitbitConnected(true);
      setShowFitbitForm(false);
      setFitbitTokens({ access_token: '', refresh_token: '' });
      // Re-sync to pull steps from Fitbit immediately
      await fetchDaily(selectedDate);
      await fetchMonthly(selectedDate);
    } catch (err) {
      setTokenError(err.response?.data?.error || 'Failed to save Fitbit credentials');
    } finally {
      setSavingTokens(false);
    }
  };

  const handleAddActivity = async (data) => {
    try {
      setSavingActivity(true);
      setError(null);
      await activityAPI.create({ ...data, date: toLocalDate(selectedDate) });
      await fetchActivities(selectedDate);
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.error;
      setError(detail || 'Failed to save activity');
    } finally {
      setSavingActivity(false);
    }
  };

  const handleDeleteActivity = async (id) => {
    if (!window.confirm('Remove this activity?')) return;
    try {
      setSavingActivity(true);
      await activityAPI.delete(id);
      await fetchActivities(selectedDate);
    } catch {
      setError('Failed to delete activity');
    } finally {
      setSavingActivity(false);
    }
  };

  // ── Calendar logsData adapter (MonthCalendar expects { date: { entry_count } }) ──
  const calendarLogsData = {};
  Object.entries(monthlyData).forEach(([date, steps]) => {
    calendarLogsData[date] = { entry_count: steps > 0 ? 1 : 0 };
  });

  const steps = dailyLog?.steps ?? 0;
  const progressPct = Math.min(100, (steps / GOAL) * 100);
  const caloriesFromSteps = Math.round(steps * 0.04);  // 100 steps ≈ 4 kcal

  const bmrValue = calcBMR(userProfile) ?? FALLBACK_BMR;
  const profileComplete = calcBMR(userProfile) !== null;

  const activityCalories = activities.reduce(
    (sum, a) => sum + parseFloat(a.calories_burned || 0), 0
  );

  const totalBurnt   = Math.round(bmrValue + caloriesFromSteps + activityCalories);
  const caloriesConsumed = Math.round(parseFloat(healthSummary?.total_calories ?? 0));
  const netBalance   = caloriesConsumed - totalBurnt;
  const source       = dailyLog?.source ?? 'manual';
  const weightKg     = dailyLog?.weight_kg != null ? parseFloat(dailyLog.weight_kg) : null;

  return (
    <div className="fitness-page">
      <div className="fitness-container">
        <header className="fitness-header">
          <h1>Fitness Tracker</h1>
          <p>Track your daily steps and stay active</p>
        </header>

        {error && <div className="error-banner">{error}</div>}

        <div className="fitness-content">
          {/* ── Left: Calendar + Steps Input ─────────────────────── */}
          <div className="fitness-left">
            <div className="fitness-card">
              <MonthCalendar
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                logsData={calendarLogsData}
              />
            </div>

            <div className="fitness-card">
              <StepsPanel
                date={selectedDate}
                dailyLog={dailyLog}
                onSave={handleSave}
                onDelete={handleDelete}
                saving={saving}
                loading={loading}
              />
            </div>

            {/* ── Fitbit Connect Card ─────────────────────── */}
            <div className="fitness-card fitbit-card">
              {fitbitConnected ? (
                <div className="fitbit-connected-row">
                  <span className="fitbit-dot connected" />
                  <div className="fitbit-status-text">
                    <span>Fitbit connected</span>
                    {dailyLog?.token_expires_at && (
                      <span className="fitbit-expiry">
                        token expires {new Date(dailyLog.token_expires_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <button
                    className="btn-fitbit-update"
                    onClick={() => setShowFitbitForm(f => !f)}
                  >
                    Update tokens
                  </button>
                </div>
              ) : (
                <div className="fitbit-disconnected-row">
                  <span className="fitbit-dot disconnected" />
                  <span className="fitbit-status-text">Fitbit not connected</span>
                  <button
                    className="btn-fitbit-connect"
                    onClick={() => setShowFitbitForm(f => !f)}
                  >
                    Connect Fitbit
                  </button>
                </div>
              )}

              {showFitbitForm && (
                <form className="fitbit-token-form" onSubmit={handleSaveTokens}>
                  <p className="fitbit-form-hint">
                    Paste your Fitbit OAuth tokens below. These are stored securely on the server.
                  </p>
                  {tokenError && <p className="fitbit-token-error">{tokenError}</p>}
                  <label className="fitbit-label">Access Token</label>
                  <textarea
                    className="fitbit-token-input"
                    rows={3}
                    placeholder="eyJhbGci..."
                    value={fitbitTokens.access_token}
                    onChange={e => setFitbitTokens(t => ({ ...t, access_token: e.target.value }))}
                  />
                  <label className="fitbit-label">Refresh Token</label>
                  <textarea
                    className="fitbit-token-input"
                    rows={2}
                    placeholder="Refresh token..."
                    value={fitbitTokens.refresh_token}
                    onChange={e => setFitbitTokens(t => ({ ...t, refresh_token: e.target.value }))}
                  />
                  <div className="fitbit-form-actions">
                    <button type="submit" className="btn-fitbit-save" disabled={savingTokens}>
                      {savingTokens ? 'Saving...' : 'Save & Sync'}
                    </button>
                    <button
                      type="button"
                      className="btn-fitbit-cancel"
                      onClick={() => { setShowFitbitForm(false); setTokenError(null); }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* ── Right: Stats ─────────────────────────────────────── */}
          <div className="fitness-right">
            {/* Progress ring card */}
            <div className="fitness-card steps-overview-card">
              <div className="steps-overview-header">
                <h3>
                  {new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric'
                  })}
                </h3>
                {!loading && (
                  <span className={`source-badge source-${source}`}>
                    {source === 'fitbit' ? 'Fitbit' : source === 'stored' ? 'Stored' : 'Manual'}
                  </span>
                )}
              </div>

              {loading ? (
                <p className="fitness-loading">Loading...</p>
              ) : (
                <>
                  <div className="steps-ring-wrap">
                    <svg viewBox="0 0 120 120" className="steps-ring">
                      <circle cx="60" cy="60" r="52" className="ring-bg" />
                      <circle
                        cx="60" cy="60" r="52"
                        className="ring-fill"
                        strokeDasharray={`${2 * Math.PI * 52}`}
                        strokeDashoffset={`${2 * Math.PI * 52 * (1 - progressPct / 100)}`}
                      />
                    </svg>
                    <div className="steps-ring-label">
                      <span className="steps-big">{steps.toLocaleString()}</span>
                      <span className="steps-unit">steps</span>
                      <span className="steps-goal">/ {GOAL.toLocaleString()} goal</span>
                    </div>
                  </div>

                  <div className="steps-pct-bar">
                    <div className="steps-pct-fill" style={{ width: `${progressPct}%` }} />
                  </div>
                  <p className="steps-pct-label">
                    {progressPct >= 100
                      ? '🎉 Goal reached!'
                      : `${progressPct.toFixed(0)}% of daily goal`}
                  </p>
                </>
              )}
            </div>

            {/* Calories card */}
            <div className="fitness-card calories-card">
              <h3>Calories</h3>
              <div className="cal-row">
                <div className="cal-item burnt">
                  <span className="cal-icon">🔥</span>
                  <span className="cal-val">{totalBurnt.toLocaleString()}</span>
                  <span className="cal-lbl">kcal Burnt</span>
                  <div className="cal-breakdown">
                    <span>BMR {Math.round(bmrValue).toLocaleString()}{!profileComplete && ' (est.)'}</span>
                    <span>+ Steps {caloriesFromSteps.toLocaleString()}</span>
                    {activityCalories > 0 && (
                      <span>+ Activity {Math.round(activityCalories).toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <div className="cal-divider" />
                <div className="cal-item consumed">
                  <span className="cal-icon">🍽️</span>
                  <span className="cal-val">{caloriesConsumed.toLocaleString()}</span>
                  <span className="cal-lbl">kcal Consumed</span>
                  <span className="cal-note">
                    {healthSummary?.entry_count > 0
                      ? `${healthSummary.entry_count} food entr${healthSummary.entry_count === 1 ? 'y' : 'ies'}`
                      : 'no food logged yet'}
                  </span>
                </div>
              </div>
              <div className="cal-balance">
                <span className="cal-balance-label">Net Balance</span>
                <span className={`cal-balance-val ${netBalance >= 0 ? 'surplus' : 'deficit'}`}>
                  {netBalance >= 0 ? '+' : ''}{netBalance.toLocaleString()} kcal
                </span>
              </div>
              {!profileComplete && (
                <p className="cal-profile-hint">
                  Update your <a href="/profile">body metrics</a> for a personalised BMR.
                </p>
              )}
            </div>

            {/* Weight card */}
            <div className="fitness-card weight-card">
              <h3>Body Weight</h3>
              {weightKg != null ? (
                <div className="weight-display">
                  <span className="weight-display-val">{weightKg.toFixed(1)}</span>
                  <span className="weight-display-unit">kg</span>
                </div>
              ) : (
                <p className="weight-display-empty">No weight logged for this day</p>
              )}
            </div>

            {/* Activities card */}
            <div className="fitness-card">
              <ActivityPanel
                activities={activities}
                profile={userProfile}
                onAdd={handleAddActivity}
                onDelete={handleDeleteActivity}
                saving={savingActivity}
                selectedDate={selectedDate}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Fitness;
