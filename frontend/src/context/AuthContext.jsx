import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem('snag_user');
        const token = localStorage.getItem('snag_token');
        if (stored && token) {
            try { setUser(JSON.parse(stored)); }
            catch { logout(); }
        }
        setLoading(false);
    }, []);

    const login = useCallback(async (email, password) => {
        const res = await authAPI.login({ email, password });
        const { user: u, token } = res.data.data;
        localStorage.setItem('snag_token', token);
        localStorage.setItem('snag_user', JSON.stringify(u));
        setUser(u);
        return u;
    }, []);

    const register = useCallback(async (data) => {
        const res = await authAPI.register(data);
        const { user: u, token } = res.data.data;
        localStorage.setItem('snag_token', token);
        localStorage.setItem('snag_user', JSON.stringify(u));
        setUser(u);
        return u;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('snag_token');
        localStorage.removeItem('snag_user');
        setUser(null);
    }, []);

    const updateUser = useCallback((u) => {
        localStorage.setItem('snag_user', JSON.stringify(u));
        setUser(u);
    }, []);

    const isEngineer = user?.role === 'site_engineer';
    const isContractor = user?.role === 'contractor';

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, isEngineer, isContractor, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
};
