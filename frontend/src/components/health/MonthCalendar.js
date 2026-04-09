import React from 'react';
import '../../styles/Health.css';

const MonthCalendar = ({ selectedDate, onDateSelect, logsData }) => {
  const today = new Date();
  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth();

  // Get first day of the month and number of days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Generate calendar days
  const calendarDays = [];

  // Add empty cells for days before the first day of month
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentYear, currentMonth, day);
    const dateString = date.toISOString().split('T')[0];
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
    const isSelected =
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear();
    const isFuture = date > today;
    const hasLogs = logsData && logsData[dateString] && logsData[dateString].entry_count > 0;

    calendarDays.push(
      <div
        key={day}
        className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isFuture ? 'future' : ''} ${hasLogs ? 'has-logs' : ''}`}
        onClick={() => !isFuture && onDateSelect(date)}
        style={{ cursor: isFuture ? 'not-allowed' : 'pointer' }}
      >
        <span className="day-number">{day}</span>
        {hasLogs && <span className="log-indicator">●</span>}
      </div>
    );
  }

  // Navigation handlers
  const goToPreviousMonth = () => {
    const newDate = new Date(currentYear, currentMonth - 1, 1);
    onDateSelect(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(currentYear, currentMonth + 1, 1);
    // Don't allow navigating beyond current month
    if (newDate <= today) {
      onDateSelect(newDate);
    }
  };

  const goToToday = () => {
    onDateSelect(new Date());
  };

  const canGoNext = new Date(currentYear, currentMonth + 1, 1) <= today;

  return (
    <div className="month-calendar">
      <div className="calendar-header">
        <button onClick={goToPreviousMonth} className="nav-button">
          &#8249;
        </button>
        <div className="calendar-title">
          <h3>{monthNames[currentMonth]} {currentYear}</h3>
          <button onClick={goToToday} className="today-button">
            Today
          </button>
        </div>
        <button
          onClick={goToNextMonth}
          className="nav-button"
          disabled={!canGoNext}
          style={{ opacity: canGoNext ? 1 : 0.3 }}
        >
          &#8250;
        </button>
      </div>

      <div className="calendar-weekdays">
        <div className="weekday">Sun</div>
        <div className="weekday">Mon</div>
        <div className="weekday">Tue</div>
        <div className="weekday">Wed</div>
        <div className="weekday">Thu</div>
        <div className="weekday">Fri</div>
        <div className="weekday">Sat</div>
      </div>

      <div className="calendar-grid">
        {calendarDays}
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-dot today-legend">●</span>
          <span>Today</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot has-logs-legend">●</span>
          <span>Has Entries</span>
        </div>
      </div>
    </div>
  );
};

export default MonthCalendar;
