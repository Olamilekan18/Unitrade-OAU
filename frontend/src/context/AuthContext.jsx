import { createContext, useContext, useState, useEffect } from 'react';
import { getSession, login as apiLogin, logout as apiLogout } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check for existing session on mount
    useEffect(() => {
        async function checkSession() {
            try {
                const payload = await getSession();
                setUser(payload.data?.user || null);
            } catch {
                setUser(null);
            } finally {
                setLoading(false);
            }
        }
        checkSession();
    }, []);

    async function login(email, password) {
        const payload = await apiLogin(email, password);
        setUser(payload.data?.user || null);
        return payload;
    }

    async function logout() {
        await apiLogout();
        setUser(null);
    }

    function refreshUser(updatedUser) {
        setUser((prev) => ({ ...prev, ...updatedUser }));
    }

    const value = { user, loading, login, logout, refreshUser, isAuthenticated: !!user };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
