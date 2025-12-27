import React from 'react';

const Alert = ({ type = 'info', message, onClose }) => {
    if (!message) return null;

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    return (
        <div className={`alert alert-${type}`}>
            <span className="alert-icon">{icons[type]}</span>
            <span className="alert-message">{message}</span>
            {onClose && (
                <button className="alert-close" onClick={onClose}>
                    &times;
                </button>
            )}
        </div>
    );
};

export default Alert;