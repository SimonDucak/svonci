import React from 'react';

interface ToastProps {
    show: boolean;
    message: string;
    type: 'success' | 'error';
}

export const Toast: React.FC<ToastProps> = ({ show, message, type }) => {
    if (!show) return null;

    return (
        <div className={`toast ${type} ${!show ? 'hide' : ''}`}>
            {message}
        </div>
    );
};