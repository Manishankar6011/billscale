import  { createContext, useState, useContext, useEffect, type ReactNode } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { User } from '../types';

interface AuthContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string, companyName: string, businessType: string, referralCode?: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const flattenUser = (data: any, token?: string): User => {
        const t = data.tenantId || {};
        return {
            ...data,
            tenantId: t._id || t,
            companyName: t.companyName || data.companyName,
            subscriptionStatus: t.subscriptionStatus || data.subscriptionStatus,
            planType: t.planType || data.planType,
            subscriptionExpiryDate: t.subscriptionExpiryDate || data.subscriptionExpiryDate,
            aiUsageCount: t.aiUsageCount !== undefined ? t.aiUsageCount : (data.aiUsageCount || 0),
            referralCode: t.referralCode || data.referralCode,
            logoUrl: t.logoUrl || data.logoUrl,
            billingEmail: t.billingEmail || data.billingEmail,
            billingAddress: t.billingAddress || data.billingAddress,
            phone: t.phone || data.phone,
            signature: t.signature || data.signature,
            upiId: t.upiId || data.upiId,
            gstin: t.gstin || data.gstin,
            pan: t.pan || data.pan,
            stateName: t.stateName || data.stateName,
            stateCode: t.stateCode || data.stateCode,
            invoiceFormat: t.invoiceFormat || data.invoiceFormat,
            businessType: t.businessType || data.businessType,
            token: token || data.token
        };
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const lastActiveAt = localStorage.getItem('last_active_at');
        
        const syncProfile = async (token: string) => {
            try {
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                const { data } = await axios.get('/api/auth/profile');
                const flattened = flattenUser(data, token);
                setUser(flattened);
                localStorage.setItem('user', JSON.stringify(flattened));
                localStorage.setItem('last_active_at', Date.now().toString());
            } catch (err) {
                console.error('Failed to sync profile:', err);
            }
        };

        if (storedUser) {
            const userData = JSON.parse(storedUser);
            
            // Inactivity Check: 30 Days
            const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
            const now = Date.now();
            
            if (lastActiveAt && (now - parseInt(lastActiveAt)) > THIRTY_DAYS_MS) {
                console.log('Session expired due to 5 days of inactivity.');
                logout();
            } else {
                setUser(userData);
                axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
                localStorage.setItem('last_active_at', now.toString());
                
                // Sync profile fresh from DB
                syncProfile(userData.token);
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

    const updateStateAndStorage = (userData: User | null) => {
        if (!userData) {
            setUser(null);
            localStorage.removeItem('user');
            return;
        }
        // Preserve existing token if not provided in new data
        const flattened = flattenUser(userData, userData.token || user?.token);
        setUser(flattened);
        localStorage.setItem('user', JSON.stringify(flattened));
    };

    const login = async (email: string, password: string) => {
        const { data } = await axios.post('/api/auth/login', { email, password });
        updateStateAndStorage(data);
        localStorage.setItem('last_active_at', Date.now().toString());
        axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        navigate('/dashboard');
    };

    const register = async (name: string, email: string, password: string, companyName: string, businessType: string, referralCode?: string) => {
        const { data } = await axios.post('/api/auth/register', { name, email, password, companyName, businessType, referralCode });
        updateStateAndStorage(data);
        localStorage.setItem('last_active_at', Date.now().toString());
        axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        navigate('/dashboard');
    };

    const logout = () => {
        updateStateAndStorage(null);
        delete axios.defaults.headers.common['Authorization'];
        queryClient.clear();
        navigate('/login');
    };

    return (
        <AuthContext.Provider value={{ user, setUser: updateStateAndStorage, loading, login, register, logout }}>
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
