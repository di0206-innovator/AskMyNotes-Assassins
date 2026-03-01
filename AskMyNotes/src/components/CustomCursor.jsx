import { useEffect, useRef } from 'react';

export default function CustomCursor({ isEnabled = true }) {
    const dotRef = useRef(null);
    const ringRef = useRef(null);
    const mouse = useRef({ x: 0, y: 0 });
    const ring = useRef({ x: 0, y: 0 });
    const raf = useRef(null);

    useEffect(() => {
        if (!isEnabled) {
            document.body.classList.remove('custom-cursor-active');
            return;
        }

        document.body.classList.add('custom-cursor-active');

        const onMove = (e) => {
            mouse.current.x = e.clientX;
            mouse.current.y = e.clientY;
            // Dot follows instantly via transform (no React re-render)
            if (dotRef.current) {
                dotRef.current.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 4}px)`;
            }
        };

        const onHover = (e) => {
            const hit = e.target.closest('a, button, input, textarea, [role="button"], .hoverable');
            if (ringRef.current) {
                if (hit) {
                    ringRef.current.style.width = '48px';
                    ringRef.current.style.height = '48px';
                    ringRef.current.style.borderColor = 'var(--accent-light)';
                    ringRef.current.style.background = 'var(--accent-glow)';
                    if (dotRef.current) dotRef.current.style.opacity = '0';
                } else {
                    ringRef.current.style.width = '32px';
                    ringRef.current.style.height = '32px';
                    ringRef.current.style.borderColor = 'var(--accent)';
                    ringRef.current.style.background = 'transparent';
                    if (dotRef.current) dotRef.current.style.opacity = '1';
                }
            }
        };

        // Smooth ring follow with lerp (linear interpolation) at 60fps
        const lerp = (a, b, t) => a + (b - a) * t;
        const animate = () => {
            ring.current.x = lerp(ring.current.x, mouse.current.x, 0.18);
            ring.current.y = lerp(ring.current.y, mouse.current.y, 0.18);
            if (ringRef.current) {
                ringRef.current.style.transform = `translate(${ring.current.x - 16}px, ${ring.current.y - 16}px)`;
            }
            raf.current = requestAnimationFrame(animate);
        };

        window.addEventListener('mousemove', onMove, { passive: true });
        window.addEventListener('mouseover', onHover, { passive: true });
        raf.current = requestAnimationFrame(animate);

        return () => {
            document.body.classList.remove('custom-cursor-active');
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseover', onHover);
            cancelAnimationFrame(raf.current);
        };
    }, [isEnabled]);

    if (!isEnabled) return null;

    return (
        <>
            <div ref={dotRef} style={{
                position: 'fixed', top: 0, left: 0, width: '8px', height: '8px',
                background: 'var(--accent)', borderRadius: '50%', pointerEvents: 'none',
                zIndex: 9999, willChange: 'transform', transition: 'opacity 0.2s',
            }} />
            <div ref={ringRef} style={{
                position: 'fixed', top: 0, left: 0, width: '32px', height: '32px',
                border: '2px solid var(--accent)', borderRadius: '50%', pointerEvents: 'none',
                zIndex: 9998, willChange: 'transform',
                boxShadow: '0 0 20px rgba(99, 102, 241, 0.15)',
                transition: 'width 0.2s, height 0.2s, border-color 0.2s, background 0.2s',
            }} />
        </>
    );
}
