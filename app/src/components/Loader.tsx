import React from 'react';

interface LoaderProps {
    message?: string;
}

export const Loader: React.FC<LoaderProps> = ({ message = 'Loading...' }) => {
    return (
        <div className="loader-container">
            <div className="loader">
                <div className="loader-spinner"></div>
                <div className="loader-text">{message}</div>
            </div>
        </div>
    );
};