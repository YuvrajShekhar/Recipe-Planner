import { useState, useEffect } from 'react';
import {
    ResponsiveContainer, LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell, Legend,
} from 'recharts';
import { analyticsAPI } from '../../services/api';

// ── Chart config ──────────────────────────────────────────────────────────────

const CHARTS = [
    { key: 'weight_kg',        label: 'Weight',           unit: 'kg',    type: 'line',  color: '#e74c3c' },
    { key: 'calorie_balance',  label: 'Calorie Balance',  unit: 'kcal',  type: 'balance' },
    { key: 'calories_in',      label: 'Calories In',      unit: 'kcal',  type: 'bar',   color: '#f39c12' },
    { key: 'calories_burned',  label: 'Calories Burned',  unit: 'kcal',  type: 'bar',   color: '#e67e22' },
    { key: 'steps',            label: 'Steps',            unit: 'steps', type: 'bar',   color: '#3498db' },
    { key: 'water_ml',         label: 'Water Intake',     unit: 'ml',    type: 'bar',   color: '#5dade2' },
    { key: 'protein',          label: 'Protein',          unit: 'g',     type: 'line',  color: '#2ecc71' },
    { key: 'carbs',            label: 'Carbohydrates',    unit: 'g',     type: 'line',  color: '#f1c40f' },
    { key: 'fat',              label: 'Fat',              unit: 'g',     type: 'line',  color: '#e74c3c' },
    { key: 'fiber',            label: 'Fiber',            unit: 'g',     type: 'line',  color: '#1abc9c' },
];

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

// ── Custom tooltip ─────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label, unit }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="analytics-tooltip">
            <p className="analytics-tooltip-date">Day {label}</p>
            {payload.map((p, i) => (
                p.value != null && (
                    <p key={i} style={{ color: p.color || p.fill }}>
                        {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(1).replace(/\.0$/, '') : p.value} {unit}</strong>
                    </p>
                )
            ))}
        </div>
    );
};

// ── Individual charts ─────────────────────────────────────────────────────────

const BalanceChart = ({ data, unit }) => {
    const filled = data.map(d => ({
        ...d,
        surplus: d.calorie_balance != null && d.calorie_balance > 0 ? d.calorie_balance : null,
        deficit: d.calorie_balance != null && d.calorie_balance < 0 ? d.calorie_balance : null,
        zero:    d.calorie_balance != null && d.calorie_balance === 0 ? 0 : null,
    }));
    return (
        <ResponsiveContainer width="100%" height={280}>
            <BarChart data={filled} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip unit={unit} />} />
                <ReferenceLine y={0} stroke="#999" strokeWidth={1.5} />
                <Bar dataKey="surplus" name="Surplus" stackId="a" fill="#e74c3c" radius={[3,3,0,0]} />
                <Bar dataKey="deficit" name="Deficit" stackId="a" fill="#27ae60" radius={[0,0,3,3]} />
            </BarChart>
        </ResponsiveContainer>
    );
};

const GenericLineChart = ({ data, dataKey, color, unit }) => (
    <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip unit={unit} />} />
            <Line
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2.5}
                dot={{ r: 3, fill: color }}
                connectNulls
                activeDot={{ r: 5 }}
            />
        </LineChart>
    </ResponsiveContainer>
);

const GenericBarChart = ({ data, dataKey, color, unit }) => (
    <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip unit={unit} />} />
            <Bar dataKey={dataKey} fill={color} radius={[4,4,0,0]}>
                {data.map((_, i) => <Cell key={i} fill={color} fillOpacity={0.85} />)}
            </Bar>
        </BarChart>
    </ResponsiveContainer>
);

// ── Stats summary ─────────────────────────────────────────────────────────────

const StatsSummary = ({ data, chartCfg }) => {
    const values = data.map(d => d[chartCfg.key]).filter(v => v != null);
    if (!values.length) return null;

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    const fmt = v => Number.isInteger(v) ? v.toLocaleString() : v.toFixed(1);

    return (
        <div className="analytics-stats-row">
            <div className="analytics-stat">
                <span className="analytics-stat-val">{fmt(avg)}</span>
                <span className="analytics-stat-lbl">avg {chartCfg.unit}</span>
            </div>
            <div className="analytics-stat">
                <span className="analytics-stat-val">{fmt(max)}</span>
                <span className="analytics-stat-lbl">max {chartCfg.unit}</span>
            </div>
            <div className="analytics-stat">
                <span className="analytics-stat-val">{fmt(min)}</span>
                <span className="analytics-stat-lbl">min {chartCfg.unit}</span>
            </div>
            <div className="analytics-stat">
                <span className="analytics-stat-val">{values.length}</span>
                <span className="analytics-stat-lbl">days tracked</span>
            </div>
        </div>
    );
};

// ── Main modal ────────────────────────────────────────────────────────────────

const MonthlyAnalyticsModal = ({ month, year, onClose }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedKey, setSelectedKey] = useState('weight_kg');

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const res = await analyticsAPI.getMonthly(month, year);
                setData(res.data.days);
            } catch {
                setError('Failed to load analytics data.');
            } finally {
                setLoading(false);
            }
        })();
    }, [month, year]);

    const chartCfg = CHARTS.find(c => c.key === selectedKey);
    const hasData = data && data.some(d => d[selectedKey] != null);

    const renderChart = () => {
        if (!hasData) return (
            <div className="analytics-no-data">
                No {chartCfg.label.toLowerCase()} data recorded for this month.
            </div>
        );
        if (chartCfg.type === 'balance') return <BalanceChart data={data} unit={chartCfg.unit} />;
        if (chartCfg.type === 'line')    return <GenericLineChart data={data} dataKey={selectedKey} color={chartCfg.color} unit={chartCfg.unit} />;
        return <GenericBarChart data={data} dataKey={selectedKey} color={chartCfg.color} unit={chartCfg.unit} />;
    };

    return (
        <div className="analytics-overlay" onClick={onClose}>
            <div className="analytics-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="analytics-modal-header">
                    <div>
                        <h2 className="analytics-title">Monthly Analysis</h2>
                        <p className="analytics-subtitle">{MONTH_NAMES[month - 1]} {year}</p>
                    </div>
                    <button className="analytics-close" onClick={onClose}>✕</button>
                </div>

                {/* Metric selector */}
                <div className="analytics-controls">
                    <label className="analytics-select-label">Metric</label>
                    <select
                        className="analytics-select"
                        value={selectedKey}
                        onChange={e => setSelectedKey(e.target.value)}
                    >
                        <optgroup label="Body">
                            <option value="weight_kg">Weight (kg)</option>
                        </optgroup>
                        <optgroup label="Calories">
                            <option value="calorie_balance">Calorie Balance (surplus / deficit)</option>
                            <option value="calories_in">Calories In</option>
                            <option value="calories_burned">Calories Burned</option>
                        </optgroup>
                        <optgroup label="Activity">
                            <option value="steps">Steps Walked</option>
                        </optgroup>
                        <optgroup label="Hydration">
                            <option value="water_ml">Water Intake (ml)</option>
                        </optgroup>
                        <optgroup label="Macros">
                            <option value="protein">Protein (g)</option>
                            <option value="carbs">Carbohydrates (g)</option>
                            <option value="fat">Fat (g)</option>
                            <option value="fiber">Fiber (g)</option>
                        </optgroup>
                    </select>
                </div>

                {/* Chart area */}
                <div className="analytics-chart-area">
                    {loading ? (
                        <div className="analytics-loading">Loading data…</div>
                    ) : error ? (
                        <div className="analytics-error">{error}</div>
                    ) : (
                        <>
                            <div className="analytics-chart-header">
                                <span className="analytics-chart-title">{chartCfg.label}</span>
                                {chartCfg.key === 'calorie_balance' && (
                                    <span className="analytics-chart-hint">
                                        <span style={{color:'#27ae60'}}>■</span> Deficit &nbsp;
                                        <span style={{color:'#e74c3c'}}>■</span> Surplus
                                    </span>
                                )}
                            </div>
                            {renderChart()}
                            {data && <StatsSummary data={data} chartCfg={chartCfg} />}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MonthlyAnalyticsModal;
