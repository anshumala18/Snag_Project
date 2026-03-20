import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

let socket = null;

export const useSocket = () => {
    const { user } = useAuth();
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (!user) return;

        const socketURL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
        socket = io(socketURL, { withCredentials: true });

        socket.on('connect', () => {
            setConnected(true);
            socket.emit('join_room', { userId: user.user_id, role: user.role });
        });

        socket.on('disconnect', () => setConnected(false));

        // Contractor: new snag assigned
        socket.on('new_snag_report', (data) => {
            toast.success(`🚨 New Snag: ${data.snag_code} — ${data.severity?.toUpperCase()} severity`, {
                duration: 6000,
                icon: '🏗️',
            });
        });

        // Engineer: status update from contractor
        socket.on('snag_status_updated', (data) => {
            toast(`📋 ${data.snag_code} → ${data.new_status.replace('_', ' ').toUpperCase()}`, {
                duration: 5000,
                icon: '🔧',
            });
        });

        return () => { socket?.disconnect(); socket = null; };
    }, [user]);

    return { connected };
};

// ── Offline detection hook ─────────────────────────────────────
export const useOnlineStatus = () => {
    const [online, setOnline] = useState(navigator.onLine);

    useEffect(() => {
        const onOnline = () => setOnline(true);
        const onOffline = () => setOnline(false);
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, []);

    return online;
};
