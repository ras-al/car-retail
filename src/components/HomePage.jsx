// src/components/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../firebase/config';
import ImageModal from './ImageModal'; // Import the new ImageModal component

function HomePage() {
    const [allCars, setAllCars] = useState([]); // Stores all cars fetched from Firestore
    const [filteredCars, setFilteredCars] = useState([]); // Stores cars after filtering
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedImage, setSelectedImage] = useState(null); // State for the image modal

    useEffect(() => {
        if (!db) {
            console.warn("Firestore database not initialized yet.");
            setLoading(false);
            return;
        }

        const carsCollectionRef = collection(db, `artifacts/${appId}/public/data/cars`);
        const unsubscribe = onSnapshot(carsCollectionRef, (snapshot) => {
            const carsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            carsData.sort((a, b) => b.year - a.year); // Sort by year descending
            setAllCars(carsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching cars:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        // Filter cars whenever allCars or searchTerm changes
        const lowercasedSearchTerm = searchTerm.toLowerCase();
        const results = allCars.filter(car =>
            car.make.toLowerCase().includes(lowercasedSearchTerm) ||
            car.model.toLowerCase().includes(lowercasedSearchTerm) ||
            car.description.toLowerCase().includes(lowercasedSearchTerm) ||
            String(car.year).includes(lowercasedSearchTerm)
        );
        setFilteredCars(results);
    }, [searchTerm, allCars]);

    const openImageModal = (imageUrl) => {
        setSelectedImage(imageUrl);
    };

    const closeImageModal = () => {
        setSelectedImage(null);
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
                            <img
                                src={car.imageData || 'https://placehold.co/400x200/555/FFF?text=No+Image'}
                                alt={`${car.make} ${car.model}`}
                                onClick={() => openImageModal(car.imageData)}
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://placehold.co/400x200/555/FFF?text=No+Image';
                                }}
                            />
                            <h3>{car.year} {car.make} {car.model}</h3>
                            <p>{car.description}</p>
                            <p className="price">Rs.{car.price ? car.price.toLocaleString() : 'N/A'}</p>
                        </div>
                    ))}
                </div>
            )}

            {selectedImage && (
                <ImageModal imageUrl={selectedImage} onClose={closeImageModal} />
            )}
        </div>
    );
}

export default HomePage;
