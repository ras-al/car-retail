// src/components/AdminPage.jsx
import React, { useState, useEffect } from 'react';
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
    const [editingCar, setEditingCar] = useState(null); // null or car object for editing
    const [formMake, setFormMake] = useState('');
    const [formModel, setFormModel] = useState('');
    const [formYear, setFormYear] = useState('');
    const [formPrice, setFormPrice] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formImageData, setFormImageData] = useState(''); // Base64 image data
    const [isCompressingImage, setIsCompressingImage] = useState(false); // New state for compression
    const [message, setMessage] = useState(null); // For custom message box

    useEffect(() => {
        // Use onAuthStateChanged to ensure user state is updated correctly for this component
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                fetchCars();
            } else {
                setCars([]);
                setLoadingCars(false);
            }
        });
        return () => unsubscribe(); // Cleanup listener
    }, []); // Only run once on component mount

    const fetchCars = async () => {
        setLoadingCars(true);
        try {
            const carsCollectionRef = collection(db, `artifacts/${appId}/public/data/cars`);
            const unsubscribe = onSnapshot(carsCollectionRef, (snapshot) => {
                const carsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Sort cars by year descending (latest first)
                carsData.sort((a, b) => b.year - a.year);
                setCars(carsData);
                setLoadingCars(false);
            }, (error) => {
                console.error("Error fetching cars:", error);
                setLoadingCars(false);
            });
            // Return the unsubscribe function so it can be called if component unmounts
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
            // The onAuthStateChanged listener will update the 'user' prop in App.jsx
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
        setFormImageData('');
        setEditingCar(null);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) {
            setFormImageData('');
            return;
        }

        setIsCompressingImage(true);
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

                // Calculate new dimensions to fit within MAX_WIDTH/MAX_HEIGHT while maintaining aspect ratio
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

                // Convert canvas content to JPEG Base64 string
                const compressedBase64 = canvas.toDataURL('image/jpeg', QUALITY);
                setFormImageData(compressedBase64);
                setIsCompressingImage(false);
            };

            img.onerror = () => {
                setIsCompressingImage(false);
                showMessage("Failed to load image. Please try another file.");
                setFormImageData('');
            };
        };

        reader.onerror = () => {
            setIsCompressingImage(false);
            showMessage("Failed to read file. Please try again.");
            setFormImageData('');
        };

        reader.readAsDataURL(file); // Read the file as a data URL (base64) initially
    };

    const handleAddOrUpdateCar = async (e) => {
        e.preventDefault();
        const carData = {
            make: formMake,
            model: formModel,
            year: parseInt(formYear),
            price: parseFloat(formPrice),
            description: formDescription,
            imageData: formImageData, // This will now contain the compressed base64 string
        };

        if (isNaN(carData.year) || isNaN(carData.price)) {
            showMessage("Please enter valid numbers for Year and Price.");
            return;
        }
        if (!carData.make || !carData.model || !carData.description) {
            showMessage("Please fill in all required text fields.");
            return;
        }
        if (!carData.imageData) {
            showMessage("Please upload an image for the car.");
            return;
        }

        try {
            if (editingCar) {
                // Update existing car
                const carDocRef = doc(db, `artifacts/${appId}/public/data/cars`, editingCar.id);
                await updateDoc(carDocRef, carData);
                showMessage("Car updated successfully!");
            } else {
                // Add new car
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
        setFormImageData(car.imageData); // Set existing image data
    };

    const handleDeleteCar = async (carId) => {
        showMessage(
            "Are you sure you want to delete this car?",
            true, // isConfirm
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

        // Create CSV content
        const headers = ["ID", "Make", "Model", "Year", "Price", "Description", "ImageData (truncated)"];
        const rows = cars.map(car => [
            car.id,
            car.make,
            car.model,
            car.year,
            car.price,
            `"${car.description.replace(/"/g, '""')}"`, // Escape quotes for CSV
            `"${car.imageData ? car.imageData.substring(0, 50) + '...' : ''}"` // Truncate base64 for CSV
        ]);

        let csvContent = headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) { // Feature detection
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

    // If user prop is null, show login form
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
                    Upload Image (JPG/PNG):
                    <input
                        type="file"
                        accept="image/jpeg, image/png"
                        onChange={handleImageUpload}
                        disabled={isCompressingImage} // Disable input during compression
                    />
                    {isCompressingImage && (
                        <p className="image-upload-status compressing">Compressing image...</p>
                    )}
                    {formImageData && !isCompressingImage && (
                        <p className="image-upload-status">Image ready for upload.</p>
                    )}
                    {!formImageData && !isCompressingImage && !editingCar && (
                         <p className="image-upload-status">Please upload an image.</p>
                    )}
                </label>
                {formImageData && (
                    <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                        <p style={{marginBottom: '5px', color: '#ccc', fontSize: '0.9em'}}>Image Preview:</p>
                        <img
                            src={formImageData}
                            alt="Preview"
                            style={{ maxWidth: '150px', maxHeight: '150px', border: '1px solid #555', borderRadius: '4px' }}
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://placehold.co/150x150/555/FFF?text=Invalid+Image';
                            }}
                        />
                    </div>
                )}
                <button type="submit" disabled={isCompressingImage}>
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
                    <div className="admin-table-wrapper"> {/* Wrapper for horizontal scroll */}
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Make</th>
                                    <th>Model</th>
                                    <th>Year</th>
                                    <th>Price</th>
                                    <th>Description</th>
                                    <th>Image</th>
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
                                            <img
                                                src={car.imageData || 'https://placehold.co/80x40/555/FFF?text=No+Img'}
                                                alt="Car Thumbnail"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = 'https://placehold.co/80x40/555/FFF?text=No+Img';
                                                }}
                                            />
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
