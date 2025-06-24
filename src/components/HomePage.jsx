// src/components/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../firebase/config';
import ImageModal from './ImageModal'; // Import the ImageModal component

function HomePage() {
    const [allCars, setAllCars] = useState([]);
    const [filteredCars, setFilteredCars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [modalImages, setModalImages] = useState(null); // Array of images for the modal
    const [initialModalImageIndex, setInitialModalImageIndex] = useState(0); // Index of image to show first

    useEffect(() => {
        if (!db) {
            console.warn("Firestore database not initialized yet.");
            setLoading(false);
            return;
        }

        const carsCollectionRef = collection(db, `artifacts/${appId}/public/data/cars`);
        const unsubscribe = onSnapshot(carsCollectionRef, (snapshot) => {
            const carsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Ensure imagesData is an array, default to empty array if not present
            carsData.forEach(car => {
                if (!Array.isArray(car.imagesData)) {
                    car.imagesData = [];
                }
            });
            carsData.sort((a, b) => b.year - a.year);
            setAllCars(carsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching cars:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const lowercasedSearchTerm = searchTerm.toLowerCase();
        const results = allCars.filter(car =>
            car.make.toLowerCase().includes(lowercasedSearchTerm) ||
            car.model.toLowerCase().includes(lowercasedSearchTerm) ||
            car.description.toLowerCase().includes(lowercasedSearchTerm) ||
            String(car.year).includes(lowercasedSearchTerm)
        );
        setFilteredCars(results);
    }, [searchTerm, allCars]);

    const openImageModal = (imagesArray, initialIndex = 0) => {
        setModalImages(imagesArray);
        setInitialModalImageIndex(initialIndex);
    };

    const closeImageModal = () => {
        setModalImages(null);
        setInitialModalImageIndex(0);
    };

    if (loading) {
        return <div className="container"><p>Loading cars...</p></div>;
    }

    return (
        <div className="container">
            <h2>Available Used Cars</h2>
            <div className="search-bar">
                <input
                    type="text"
                    placeholder="Search by make, model, year, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {filteredCars.length === 0 && !loading ? (
                <p>No cars found matching your search criteria.</p>
            ) : (
                <div className="car-list">
                    {filteredCars.map((car) => (
                        <div key={car.id} className="car-card">
                            <div className="image-gallery-container">
                                {car.imagesData && car.imagesData.length > 0 ? (
                                    car.imagesData.map((imageData, index) => (
                                        <img
                                            key={index}
                                            src={imageData}
                                            alt={`${car.make} ${car.model} Image ${index + 1}`}
                                            className="gallery-image"
                                            onClick={() => openImageModal(car.imagesData, index)}
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = 'https://placehold.co/400x200/555/FFF?text=Image+Error';
                                            }}
                                        />
                                    ))
                                ) : (
                                    <img
                                        src={'https://placehold.co/400x200/555/FFF?text=No+Images'}
                                        alt="No images available"
                                        className="gallery-image"
                                        onClick={() => openImageModal(['https://placehold.co/800x600/555/FFF?text=No+Images'], 0)}
                                    />
                                )}
                            </div>
                            <h3>{car.year} {car.make} {car.model}</h3>
                            <p>{car.description}</p>
                            <p className="price">Rs.{car.price ? car.price.toLocaleString() : 'N/A'}</p>
                        </div>
                    ))}
                </div>
            )}

            {modalImages && (
                <ImageModal
                    images={modalImages}
                    initialImageIndex={initialModalImageIndex}
                    onClose={closeImageModal}
                />
            )}
        </div>
    );
}

export default HomePage;
