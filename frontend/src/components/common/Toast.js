import React, { useEffect, useState } from 'react';

const Toast = ({ message, type = 'info', duration = 3000, onClose }) => {
    const [isVisible, setIsVisible] = useState(true);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => {
                setIsVisible(false);
                if (onClose) onClose();
            }, 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    if (!isVisible) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return '✓';
            case 'error': return '✕';
            case 'warning': return '⚠';
            default: return 'ℹ';
        }
    };

    return (
        <div className={`toast toast-${type} ${isExiting ? 'exiting' : ''}`}>
            <span className="toast-icon">{getIcon()}</span>
            <span className="toast-message">{message}</span>
            <button 
                className="toast-close"
                onClick={() => {
                    setIsExiting(true);
                    setTimeout(() => {
                        setIsVisible(false);
                        if (onClose) onClose();
                    }, 300);
                }}
            >
                ×
            </button>
        </div>
    );
};

export default Toast;