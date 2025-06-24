// src/components/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../firebase/config'; // Import db and appId from config

function HomePage() {
    const [cars, setCars] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Ensure db is available before trying to fetch
        if (!db) {
            console.warn("Firestore database not initialized yet.");
            setLoading(false);
            return;
        }

        // Fetch cars from Firestore
        const carsCollectionRef = collection(db, `artifacts/${appId}/public/data/cars`);
        const unsubscribe = onSnapshot(carsCollectionRef, (snapshot) => {
            const carsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort cars by year descending (latest first)
            carsData.sort((a, b) => b.year - a.year);
            setCars(carsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching cars:", error);
            setLoading(false);
        });

        return () => unsubscribe(); // Cleanup listener on component unmount
    }, []); // Run once on component mount, re-run if db changes (unlikely)

    if (loading) {
        return <div className="container"><p>Loading cars...</p></div>;
    }

    if (cars.length === 0) {
        return <div className="container"><p>No cars available at the moment. Check back later!</p></div>;
    }

    return (
        <div className="container">
            <h2>Available Used Cars</h2>
            <div className="car-list">
                {cars.map((car) => (
                    <div key={car.id} className="car-card">
                        {/* Fallback image if imageData is missing or invalid */}
                        <img
                            src={car.imageData || 'https://placehold.co/400x200/555/FFF?text=No+Image'}
                            alt={`${car.make} ${car.model}`}
                            onError={(e) => {
                                e.target.onerror = null; // Prevent infinite loop
                                e.target.src = 'https://placehold.co/400x200/555/FFF?text=No+Image';
                            }}
                        />
                        <h3>{car.year} {car.make} {car.model}</h3>
                        <p>{car.description}</p>
                        <p className="price">${car.price ? car.price.toLocaleString() : 'N/A'}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default HomePage;
