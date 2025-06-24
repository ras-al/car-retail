// src/components/AdminPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import {
    collection,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    onSnapshot
} from 'firebase/firestore';
import { auth, db, appId } from '../firebase/config'; // Import auth, db, appId from config

function AdminPage({ user }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [cars, setCars] = useState([]);
    const [loadingCars, setLoadingCars] = useState(true);
    const [editingCar, setEditingCar] = useState(null);
    const [formMake, setFormMake] = useState('');
    const [formModel, setFormModel] = useState('');
    const [formYear, setFormYear] = useState('');
    const [formPrice, setFormPrice] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formImagesData, setFormImagesData] = useState([]); // Changed to array for multiple images
    const [isCompressingImage, setIsCompressingImage] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                fetchCars();
            } else {
                setCars([]);
                setLoadingCars(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchCars = async () => {
        setLoadingCars(true);
        try {
            const carsCollectionRef = collection(db, `artifacts/${appId}/public/data/cars`);
            const unsubscribe = onSnapshot(carsCollectionRef, (snapshot) => {
                const carsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                carsData.sort((a, b) => b.year - a.year);
                setCars(carsData);
                setLoadingCars(false);
            }, (error) => {
                console.error("Error fetching cars:", error);
                setLoadingCars(false);
            });
            return unsubscribe;
        } catch (error) {
            console.error("Error setting up cars listener:", error);
            setLoadingCars(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
            setEmail('');
            setPassword('');
        } catch (error) {
            console.error("Login error:", error.message);
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                setLoginError('Invalid email or password. Please try again.');
            } else {
                setLoginError('Login failed: ' + error.message);
            }
        }
    };

    const clearForm = () => {
        setFormMake('');
        setFormModel('');
        setFormYear('');
        setFormPrice('');
        setFormDescription('');
        setFormImagesData([]); // Clear image data array
        setEditingCar(null);
    };

    const compressImage = useCallback((file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;

                img.onload = () => {
                    const MAX_WIDTH = 800; // Max width for the compressed image
                    const MAX_HEIGHT = 600; // Max height for the compressed image
                    const QUALITY = 0.7; // JPEG compression quality (0.0 to 1.0)
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const compressedBase64 = canvas.toDataURL('image/jpeg', QUALITY);
                    resolve(compressedBase64);
                };

                img.onerror = (error) => {
                    reject(new Error("Failed to load image for compression."));
                };
            };
            reader.onerror = (error) => {
                reject(new Error("Failed to read file for compression."));
            };
            reader.readAsDataURL(file);
        });
    }, []);

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setIsCompressingImage(true);
        const newImages = [];
        for (const file of files) {
            try {
                const compressedData = await compressImage(file);
                newImages.push(compressedData);
            } catch (error) {
                console.error("Error compressing image:", file.name, error);
                showMessage(`Failed to process image: ${file.name}.`);
            }
        }
        // Append new images to existing ones (if any)
        setFormImagesData((prevImages) => [...prevImages, ...newImages]);
        setIsCompressingImage(false);
        // Clear the file input after processing
        e.target.value = '';
    };

    const handleRemoveImage = (indexToRemove) => {
        setFormImagesData((prevImages) => prevImages.filter((_, index) => index !== indexToRemove));
    };

    const handleAddOrUpdateCar = async (e) => {
        e.preventDefault();
        const carData = {
            make: formMake,
            model: formModel,
            year: parseInt(formYear),
            price: parseFloat(formPrice),
            description: formDescription,
            imagesData: formImagesData, // Now an array of Base64 strings
        };

        if (isNaN(carData.year) || isNaN(carData.price)) {
            showMessage("Please enter valid numbers for Year and Price.");
            return;
        }
        if (!carData.make || !carData.model || !carData.description) {
            showMessage("Please fill in all required text fields.");
            return;
        }
        if (carData.imagesData.length === 0) {
            showMessage("Please upload at least one image for the car.");
            return;
        }

        try {
            if (editingCar) {
                const carDocRef = doc(db, `artifacts/${appId}/public/data/cars`, editingCar.id);
                await updateDoc(carDocRef, carData);
                showMessage("Car updated successfully!");
            } else {
                const carsCollectionRef = collection(db, `artifacts/${appId}/public/data/cars`);
                await addDoc(carsCollectionRef, carData);
                showMessage("Car added successfully!");
            }
            clearForm();
        } catch (error) {
            console.error("Error adding/updating car:", error);
            showMessage(`Error: ${error.message}`);
        }
    };

    const handleEditCar = (car) => {
        setEditingCar(car);
        setFormMake(car.make);
        setFormModel(car.model);
        setFormYear(car.year);
        setFormPrice(car.price);
        setFormDescription(car.description);
        setFormImagesData(car.imagesData || []); // Populate with existing images, default to empty array
    };

    const handleDeleteCar = async (carId) => {
        showMessage(
            "Are you sure you want to delete this car?",
            true,
            async () => {
                try {
                    const carDocRef = doc(db, `artifacts/${appId}/public/data/cars`, carId);
                    await deleteDoc(carDocRef);
                    showMessage("Car deleted successfully!");
                } catch (error) {
                    console.error("Error deleting car:", error);
                    showMessage(`Error: ${error.message}`);
                }
            }
        );
    };

    const handleDownloadCars = () => {
        if (cars.length === 0) {
            showMessage("No car data to download.");
            return;
        }

        const headers = ["ID", "Make", "Model", "Year", "Price", "Description", "Image Count"];
        const rows = cars.map(car => [
            car.id,
            car.make,
            car.model,
            car.year,
            car.price,
            `"${car.description.replace(/"/g, '""')}"`,
            (car.imagesData && car.imagesData.length) || 0 // Report image count instead of truncated data
        ]);

        let csvContent = headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'car_data.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showMessage("Car data downloaded successfully as CSV!");
        } else {
            showMessage("Your browser does not support downloading files directly.");
        }
    };

    const showMessage = (msg, isConfirm = false, onConfirm = () => {}) => {
        setMessage({ text: msg, isConfirm, onConfirm });
    };

    const closeMessage = () => {
        setMessage(null);
    };

    if (!user) {
        return (
            <div className="container">
                <h2>Admin Login</h2>
                <form onSubmit={handleLogin}>
                    <label>
                        Email:
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </label>
                    <label>
                        Password:
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </label>
                    {loginError && <p style={{ color: '#ff5555', fontSize: '0.9em' }}>{loginError}</p>}
                    <button type="submit">Login</button>
                </form>
            </div>
        );
    }

    return (
        <div className="container">
            <h2>Admin Panel</h2>

            <h3>{editingCar ? 'Edit Car' : 'Add New Car'}</h3>
            <form onSubmit={handleAddOrUpdateCar}>
                <label>
                    Make:
                    <input
                        type="text"
                        value={formMake}
                        onChange={(e) => setFormMake(e.target.value)}
                        required
                    />
                </label>
                <label>
                    Model:
                    <input
                        type="text"
                        value={formModel}
                        onChange={(e) => setFormModel(e.target.value)}
                        required
                    />
                </label>
                <label>
                    Year:
                    <input
                        type="number"
                        value={formYear}
                        onChange={(e) => setFormYear(e.target.value)}
                        required
                    />
                </label>
                <label>
                    Price:
                    <input
                        type="number"
                        value={formPrice}
                        onChange={(e) => setFormPrice(e.target.value)}
                        step="0.01"
                        required
                    />
                </label>
                <label>
                    Description:
                    <textarea
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        rows="4"
                        required
                    ></textarea>
                </label>
                <label>
                    Upload Images (JPG/PNG):
                    <input
                        type="file"
                        accept="image/jpeg, image/png"
                        multiple // Allow multiple file selection
                        onChange={handleImageUpload}
                        disabled={isCompressingImage}
                    />
                    {isCompressingImage && (
                        <p className="image-upload-status compressing">Compressing image(s)...</p>
                    )}
                    {formImagesData.length > 0 && !isCompressingImage && (
                        <p className="image-upload-status">{formImagesData.length} image(s) ready.</p>
                    )}
                    {!formImagesData.length && !isCompressingImage && !editingCar && (
                         <p className="image-upload-status">Please upload at least one image.</p>
                    )}
                </label>
                {formImagesData.length > 0 && (
                    <div className="image-preview-grid">
                        {formImagesData.map((imageData, index) => (
                            <div key={index} className="image-preview-item">
                                <img
                                    src={imageData}
                                    alt={`Car Image Preview ${index + 1}`}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://placehold.co/100x100/555/FFF?text=Error';
                                    }}
                                />
                                <button
                                    type="button"
                                    className="remove-image"
                                    onClick={() => handleRemoveImage(index)}
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                <button type="submit" disabled={isCompressingImage || (formImagesData.length === 0 && !editingCar)}>
                    {editingCar ? 'Update Car' : 'Add Car'}
                </button>
                {editingCar && <button type="button" onClick={clearForm} disabled={isCompressingImage}>Cancel Edit</button>}
            </form>

            <h3 style={{ marginTop: '40px' }}>Current Car Listings</h3>
            {loadingCars ? (
                <p>Loading cars for admin...</p>
            ) : cars.length === 0 ? (
                <p>No cars added yet. Use the form above to add one!</p>
            ) : (
                <>
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Make</th>
                                    <th>Model</th>
                                    <th>Year</th>
                                    <th>Price</th>
                                    <th>Description</th>
                                    <th>Images</th> {/* Changed to "Images" */}
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cars.map((car) => (
                                    <tr key={car.id}>
                                        <td>{car.make}</td>
                                        <td>{car.model}</td>
                                        <td>{car.year}</td>
                                        <td>Rs.{car.price ? car.price.toLocaleString() : 'N/A'}</td>
                                        <td>{car.description.substring(0, 50)}{car.description.length > 50 ? '...' : ''}</td>
                                        <td>
                                            <div className="thumbnail-container">
                                                {(car.imagesData || []).map((imgData, index) => (
                                                    <img
                                                        key={index}
                                                        src={imgData || 'https://placehold.co/40x40/555/FFF?text=X'}
                                                        alt={`Thumbnail ${index + 1}`}
                                                        className="car-thumbnail"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = 'https://placehold.co/40x40/555/FFF?text=X';
                                                        }}
                                                    />
                                                ))}
                                                {(car.imagesData || []).length === 0 && 'No Images'}
                                            </div>
                                        </td>
                                        <td className="actions">
                                            <button className="edit" onClick={() => handleEditCar(car)}>Edit</button>
                                            <button className="delete" onClick={() => handleDeleteCar(car.id)}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button className="download-button" onClick={handleDownloadCars}>
                        Download All Cars (CSV)
                    </button>
                </>
            )}

            {/* Custom Message Box */}
            {message && (
                <div className="message-box">
                    <p>{message.text}</p>
                    {message.isConfirm ? (
                        <div>
                            <button onClick={() => { message.onConfirm(); closeMessage(); }} style={{ marginRight: '10px' }}>Yes</button>
                            <button onClick={closeMessage}>No</button>
                        </div>
                    ) : (
                        <button onClick={closeMessage}>OK</button>
                    )}
                </div>
            )}
        </div>
    );
}

export default AdminPage;
