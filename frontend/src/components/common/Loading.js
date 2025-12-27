import React from 'react';

const Loading = ({ message = 'Loading...' }) => {
    return (
        <div className="loading">
            <div className="loading-content">
                <div className="spinner"></div>
                <p>{message}</p>
            </div>
        </div>
    );
};

export default Loading;