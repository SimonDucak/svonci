import React from 'react';

interface ConfettiProps {
    show: boolean;
    particleCount?: number;
}

export const Confetti: React.FC<ConfettiProps> = ({ show, particleCount = 50 }) => {
    if (!show) return null;

    const colors = ['#667eea', '#764ba2', '#00d2ff', '#3a7bd5', '#10b981'];

    return (
        <div className="completion-animation">
            {[...Array(particleCount)].map((_, i) => (
                <div
                    key={i}
                    className="confetti"
                    style={{
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 0.5}s`,
                        backgroundColor: colors[Math.floor(Math.random() * colors.length)]
                    }}
                />
            ))}
        </div>
    );
};