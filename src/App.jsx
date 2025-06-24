// src/App.jsx
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth'; // Added signOut for clarity
import { auth, initializeAuth } from './firebase/config';
import HomePage from './components/HomePage';
import AdminPage from './components/AdminPage';
import './styles/App.css'; // Import the CSS file

// Helper function to get the current user ID
const getUserId = (currentUser) => {
    // If no user is logged in, there's no auth.currentUser, so userId will be null
    return currentUser?.uid || null; // Changed from crypto.randomUUID()
};

function App() {
    const [currentPage, setCurrentPage] = useState(window.location.pathname);
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        // Perform initial authentication if not already done
        const init = async () => {
            // Only try to initialize if there's no current user and we're still loading auth state
            if (!auth.currentUser && loadingAuth) {
                await initializeAuth();
            }
        };
        init();

        // Listen for auth state changes
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setUserId(getUserId(currentUser));
            // Set loadingAuth to false only after the initial auth state is determined
            if (loadingAuth) setLoadingAuth(false);
        });

        return () => unsubscribe(); // Cleanup auth listener on component unmount
    }, []); // Empty dependency array means this effect runs once after the initial render

    const navigate = (path) => {
        window.history.pushState({}, '', path);
        setCurrentPage(path);
    };

    if (loadingAuth) {
        return (
            <div className="container loading-screen">
                <p>Loading application...</p>
            </div>
        );
    }

    return (
        <div className="app-container">
            <header className="header">
                <h1>Car Retail Shop</h1>
                <div className="nav-buttons">
                    <button onClick={() => navigate('/')}>Home</button>
                    {user ? (
                        <>
                            <button onClick={() => navigate('/admin')}>Admin</button>
                            <button onClick={() => signOut(auth)}>Logout</button>
                        </>
                    ) : (
                        <button onClick={() => navigate('/admin')}>Admin Login</button>
                    )}
                </div>
            </header>

            {/* Display the current userId only if a user is logged in */}
            {userId && (
                <div style={{ padding: '10px 20px', background: '#333', color: '#fff', fontSize: '0.9em', textAlign: 'center', borderBottom: '1px solid #555' }}>
                    Current User ID: <span style={{ fontFamily: 'monospace', color: '#ccc' }}>{userId}</span>
                </div>
            )}

            {currentPage === '/' && <HomePage />}
            {currentPage === '/admin' && <AdminPage user={user} />}
        </div>
    );
}

export default App;
