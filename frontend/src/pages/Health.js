import React, { useState, useEffect } from 'react';
import { healthAPI } from '../services/api';
import MonthCalendar from '../components/health/MonthCalendar';
import DailySummary from '../components/health/DailySummary';
import FoodEntryForm from '../components/health/FoodEntryForm';
import AddFoodChoiceModal from '../components/health/AddFoodChoiceModal';
import RecipeFoodEntry from '../components/health/RecipeFoodEntry';
import FridgeFoodEntry from '../components/health/FridgeFoodEntry';
import BarcodeScanner from '../components/health/BarcodeScanner';
import '../styles/Health.css';

const Health = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailySummary, setDailySummary] = useState(null);
  const [monthlyData, setMonthlyData] = useState({});
  // addMode: null | 'manual' | 'recipe' | 'fridge' | 'scan'
  const [addMode, setAddMode] = useState(null);
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Format date to YYYY-MM-DD using local time (not UTC)
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fetch daily summary for selected date
  const fetchDailySummary = async (date) => {
    try {
      setLoading(true);
      setError(null);
      const dateString = formatDate(date);
      const response = await healthAPI.getDailySummary(dateString);
      setDailySummary(response.data);
    } catch (err) {
      console.error('Error fetching daily summary:', err);
      setError('Failed to load daily summary');
    } finally {
      setLoading(false);
    }
  };

  // Fetch monthly data for calendar
  const fetchMonthlyData = async (date) => {
    try {
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const response = await healthAPI.getMonthlySummary(month, year);

      // Transform data to object with date keys
      const dataByDate = {};
      if (response.data.daily_summaries) {
        response.data.daily_summaries.forEach(summary => {
          dataByDate[summary.date] = summary;
        });
      }
      setMonthlyData(dataByDate);
    } catch (err) {
      console.error('Error fetching monthly data:', err);
    }
  };

  // Load data when component mounts or date changes
  useEffect(() => {
    fetchDailySummary(selectedDate);
    fetchMonthlyData(selectedDate);
  }, [selectedDate]);

  // Handle date selection from calendar
  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setAddMode(null);
    setShowChoiceModal(false);
  };

  const handleCancelAdd = () => {
    setAddMode(null);
    setShowChoiceModal(false);
  };

  // Handle adding new food entry (used by manual form and recipe picker)
  const handleAddEntry = async (entryData) => {
    try {
      setLoading(true);
      setError(null);
      await healthAPI.createLog(entryData);

      // Refresh data
      await fetchDailySummary(selectedDate);
      await fetchMonthlyData(selectedDate);

      setAddMode(null);
      alert('Food entry added successfully!');
    } catch (err) {
      console.error('Error adding entry:', err);
      setError(err.response?.data?.error || 'Failed to add entry');
      alert(err.response?.data?.error || 'Failed to add entry');
    } finally {
      setLoading(false);
    }
  };

  // Called by FridgeFoodEntry after successful consume (it handles the API call itself)
  const handleFridgeEntry = async () => {
    await fetchDailySummary(selectedDate);
    await fetchMonthlyData(selectedDate);
    setAddMode(null);
    alert('Fridge entry logged successfully!');
  };

  // Handle deleting an entry
  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await healthAPI.deleteLog(entryId);

      // Refresh data
      await fetchDailySummary(selectedDate);
      await fetchMonthlyData(selectedDate);

      alert('Entry deleted successfully!');
    } catch (err) {
      console.error('Error deleting entry:', err);
      setError('Failed to delete entry');
      alert('Failed to delete entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="health-page">
      <div className="health-container">
        <header className="health-header">
          <h1>Daily Nutrition Tracker</h1>
          <p>Track your daily food intake and monitor your nutritional goals</p>
        </header>

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        <div className="health-content">
          <div className="calendar-section">
            <MonthCalendar
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              logsData={monthlyData}
            />

            <div className="action-buttons">
              {addMode === null ? (
                <button
                  onClick={() => setShowChoiceModal(true)}
                  className="btn-add-entry"
                  disabled={loading}
                >
                  + Add Food Entry
                </button>
              ) : (
                <button
                  onClick={handleCancelAdd}
                  className="btn-cancel-add"
                >
                  Cancel
                </button>
              )}
            </div>

            {addMode === 'manual' && (
              <FoodEntryForm
                onSubmit={handleAddEntry}
                onCancel={handleCancelAdd}
                selectedDate={selectedDate}
              />
            )}

            {addMode === 'recipe' && (
              <RecipeFoodEntry
                onSubmit={handleAddEntry}
                onCancel={handleCancelAdd}
                selectedDate={selectedDate}
              />
            )}

            {addMode === 'fridge' && (
              <FridgeFoodEntry
                onSubmit={handleFridgeEntry}
                onCancel={handleCancelAdd}
                selectedDate={selectedDate}
              />
            )}

            {addMode === 'scan' && (
              <BarcodeScanner
                onSubmit={async () => {
                  await fetchDailySummary(selectedDate);
                  await fetchMonthlyData(selectedDate);
                  setAddMode(null);
                  alert('Item logged successfully!');
                }}
                onCancel={handleCancelAdd}
                selectedDate={selectedDate}
              />
            )}

            {showChoiceModal && (
              <AddFoodChoiceModal
                onChooseManual={() => { setShowChoiceModal(false); setAddMode('manual'); }}
                onChooseRecipe={() => { setShowChoiceModal(false); setAddMode('recipe'); }}
                onChooseFridge={() => { setShowChoiceModal(false); setAddMode('fridge'); }}
                onChooseScan={() => { setShowChoiceModal(false); setAddMode('scan'); }}
                onCancel={() => setShowChoiceModal(false)}
              />
            )}
          </div>

          <div className="summary-section">
            {loading && !dailySummary ? (
              <div className="loading-spinner">Loading...</div>
            ) : (
              <DailySummary
                summary={dailySummary}
                onDeleteEntry={handleDeleteEntry}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Health;
