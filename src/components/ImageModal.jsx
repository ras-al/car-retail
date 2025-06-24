// src/components/ImageModal.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';

function ImageModal({ imageUrl, onClose }) {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const lastMousePosition = useRef({ x: 0, y: 0 });
    const imageRef = useRef(null);
    const contentRef = useRef(null);

    // Reset position and scale when image changes or modal opens/closes
    useEffect(() => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
        // Prevent body scrolling when modal is open
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = ''; // Re-enable scrolling on unmount
        };
    }, [imageUrl]);

    const handleWheel = useCallback((e) => {
        e.preventDefault(); // Prevent page scrolling
        const scaleAmount = 0.1;
        const newScale = e.deltaY < 0 ? scale + scaleAmount : scale - scaleAmount;
        setScale(Math.max(1, Math.min(newScale, 5))); // Limit zoom from 1x to 5x

        // Adjust position to zoom towards mouse cursor
        if (imageRef.current && contentRef.current && scale !== newScale) {
            const imageRect = imageRef.current.getBoundingClientRect();
            const contentRect = contentRef.current.getBoundingClientRect();

            // Mouse position relative to image
            const mouseX = e.clientX - imageRect.left;
            const mouseY = e.clientY - imageRect.top;

            // Percentage of mouse position on image
            const mouseXPercentage = mouseX / imageRect.width;
            const mouseYPercentage = mouseY / imageRect.height;

            // Calculate new image dimensions
            const newImageWidth = imageRect.width * (newScale / scale);
            const newImageHeight = imageRect.height * (newScale / scale);

            // Calculate new position to keep mouse point fixed
            const newX = position.x - (mouseXPercentage * (newImageWidth - imageRect.width));
            const newY = position.y - (mouseYPercentage * (newImageHeight - imageRect.height));

            setPosition({ x: newX, y: newY });
        }
    }, [scale, position]);

    const handleMouseDown = useCallback((e) => {
        if (scale > 1) { // Only allow dragging if zoomed in
            setIsDragging(true);
            lastMousePosition.current = { x: e.clientX, y: e.clientY };
            imageRef.current.classList.add('grabbing');
        }
    }, [scale]);

    const handleMouseMove = useCallback((e) => {
        if (!isDragging || scale <= 1) return;

        const dx = e.clientX - lastMousePosition.current.x;
        const dy = e.clientY - lastMousePosition.current.y;

        setPosition((prev) => ({
            x: prev.x + dx,
            y: prev.y + dy,
        }));
        lastMousePosition.current = { x: e.clientX, y: e.clientY };
    }, [isDragging, scale]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        if (imageRef.current) {
            imageRef.current.classList.remove('grabbing');
        }
    }, []);

    const handleTouchStart = useCallback((e) => {
        if (scale > 1 && e.touches.length === 1) {
            setIsDragging(true);
            lastMousePosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            imageRef.current.classList.add('grabbing');
        }
    }, [scale]);

    const handleTouchMove = useCallback((e) => {
        if (!isDragging || scale <= 1 || e.touches.length !== 1) return;

        const dx = e.touches[0].clientX - lastMousePosition.current.x;
        const dy = e.touches[0].clientY - lastMousePosition.current.y;

        setPosition((prev) => ({
            x: prev.x + dx,
            y: prev.y + dy,
        }));
        lastMousePosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, [isDragging, scale]);

    const handleTouchEnd = useCallback(() => {
        setIsDragging(false);
        if (imageRef.current) {
            imageRef.current.classList.remove('grabbing');
        }
    }, []);

    // Attach/detach event listeners
    useEffect(() => {
        const imageElement = imageRef.current;
        if (imageElement) {
            imageElement.addEventListener('wheel', handleWheel, { passive: false });
            imageElement.addEventListener('mousedown', handleMouseDown);
            imageElement.addEventListener('mousemove', handleMouseMove);
            imageElement.addEventListener('mouseup', handleMouseUp);
            imageElement.addEventListener('mouseleave', handleMouseUp); // End drag if mouse leaves image

            // Touch events for mobile
            imageElement.addEventListener('touchstart', handleTouchStart, { passive: false });
            imageElement.addEventListener('touchmove', handleTouchMove, { passive: false });
            imageElement.addEventListener('touchend', handleTouchEnd);
            imageElement.addEventListener('touchcancel', handleTouchEnd); // For when touch is interrupted
        }

        return () => {
            if (imageElement) {
                imageElement.removeEventListener('wheel', handleWheel);
                imageElement.removeEventListener('mousedown', handleMouseDown);
                imageElement.removeEventListener('mousemove', handleMouseMove);
                imageElement.removeEventListener('mouseup', handleMouseUp);
                imageElement.removeEventListener('mouseleave', handleMouseUp);

                imageElement.removeEventListener('touchstart', handleTouchStart);
                imageElement.removeEventListener('touchmove', handleTouchMove);
                imageElement.removeEventListener('touchend', handleTouchEnd);
                imageElement.removeEventListener('touchcancel', handleTouchEnd);
            }
        };
    }, [handleWheel, handleMouseDown, handleMouseMove, handleMouseUp, handleTouchStart, handleTouchMove, handleTouchEnd]);


    return (
        <div className="image-modal-overlay" onClick={onClose}>
            <div className="image-modal-content" ref={contentRef} onClick={(e) => e.stopPropagation()}>
                <button className="image-modal-close" onClick={onClose}>&times;</button>
                <img
                    ref={imageRef}
                    src={imageUrl}
                    alt="Full View"
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        transformOrigin: '0 0', // Crucial for correct zoom point
                    }}
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://placehold.co/800x600/555/FFF?text=Image+Load+Error';
                    }}
                />
                <p className="image-modal-info">
                    {scale > 1 ? 'Drag to pan, scroll to zoom' : 'Scroll to zoom'}
                </p>
            </div>
        </div>
    );
}

export default ImageModal;
