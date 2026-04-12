import React, { createContext, useState, useContext, useEffect, type ReactNode } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import type { User } from '../types';

interface AuthContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string, companyName: string, businessType: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const lastActiveAt = localStorage.getItem('last_active_at');
        
        if (storedUser) {
            const userData = JSON.parse(storedUser);
            
            // Inactivity Check: 5 Days (432,000,000 ms)
            const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
            const now = Date.now();
            
            if (lastActiveAt && (now - parseInt(lastActiveAt)) > FIVE_DAYS_MS) {
                console.log('Session expired due to 5 days of inactivity.');
                logout();
            } else {
                setUser(userData);
                axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
                // Update activity on successful session resumption
                localStorage.setItem('last_active_at', now.toString());
            }
        }
        setLoading(false);

        // Setup axios interceptor to automatically handle 401 responses 
        // (like when a token genuinely expires or JWT_SECRET changes preventing signature validation)
        const interceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    console.warn('Unauthorized request - Token likely invalid or expired. Logging out.');
                    setUser(null);
                    localStorage.removeItem('user');
                    localStorage.removeItem('last_active_at');
                    delete axios.defaults.headers.common['Authorization'];
                    navigate('/login');
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axios.interceptors.response.eject(interceptor);
        };
    }, []);

    const login = async (email: string, password: string) => {
        const { data } = await axios.post('/api/auth/login', { email, password });
        setUser(data);
        localStorage.setItem('user', JSON.stringify(data));
        localStorage.setItem('last_active_at', Date.now().toString());
        axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        navigate('/dashboard');
    };

    const register = async (name: string, email: string, password: string, companyName: string, businessType: string) => {
        const { data } = await axios.post('/api/auth/register', { name, email, password, companyName, businessType });
        setUser(data);
        localStorage.setItem('user', JSON.stringify(data));
        localStorage.setItem('last_active_at', Date.now().toString());
        axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        navigate('/dashboard');
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
        navigate('/login');
    };

    return (
        <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
