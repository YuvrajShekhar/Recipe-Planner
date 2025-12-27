import React from 'react';
import { Link } from 'react-router-dom';

const EmptyState = ({ 
    icon = '📭', 
    title, 
    message, 
    actionText, 
    actionLink,
    onAction 
}) => {
    return (
        <div className="empty-state">
            <div className="empty-state-icon">{icon}</div>
            <h3>{title}</h3>
            <p>{message}</p>
            {actionText && actionLink && (
                <Link to={actionLink} className="btn btn-primary">
                    {actionText}
                </Link>
            )}
            {actionText && onAction && (
                <button onClick={onAction} className="btn btn-primary">
                    {actionText}
                </button>
            )}
        </div>
    );
};

export default EmptyState;