import React from 'react';

const PageHeader = ({ title, subtitle, children }) => {
    return (
        <div className="page-header">
            <div className="page-header-content">
                <div>
                    <h1>{title}</h1>
                    {subtitle && <p>{subtitle}</p>}
                </div>
                {children && (
                    <div className="page-header-actions">
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PageHeader;