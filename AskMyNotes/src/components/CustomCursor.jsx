import React, { useEffect, useState } from 'react';

export default function CustomCursor({ isEnabled = true }) {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        if (!isEnabled) {
            document.body.classList.remove('custom-cursor-active');
            return;
        }

        document.body.classList.add('custom-cursor-active');

        const updatePosition = (e) => {
            setPosition({ x: e.clientX, y: e.clientY });
        };

        const updateHoverState = (e) => {
            const target = e.target;
            const isClickable = target.closest('a, button, input, textarea, .hoverable');
            setIsHovering(!!isClickable);
        };

        window.addEventListener('mousemove', updatePosition);
        window.addEventListener('mouseover', updateHoverState);

        return () => {
            document.body.classList.remove('custom-cursor-active');
            window.removeEventListener('mousemove', updatePosition);
            window.removeEventListener('mouseover', updateHoverState);
        };
    }, [isEnabled]);

    if (!isEnabled) return null;

    return (
        <div className={`custom-cursor-container ${isHovering ? 'hovering' : ''}`}>
            <div
                className="custom-cursor-dot"
                style={{ left: `${position.x}px`, top: `${position.y}px` }}
            />
            <div
                className="custom-cursor-ring"
                style={{
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    transition: 'width 0.2s, height 0.2s, left 0.1s ease-out, top 0.1s ease-out'
                }}
            />
        </div>
    );
}
