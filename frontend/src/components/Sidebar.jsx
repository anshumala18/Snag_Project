import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, FolderOpen, PlusCircle, AlertOctagon,
    FileText, Wrench, SquareCheck, LogOut, Wifi, WifiOff,
    HardHat, Building, Menu, X, UserCircle, TriangleAlert, Mail
} from 'lucide-react';
import { useOnlineStatus } from '../hooks/useSocket';
import { getPendingCount, clearOfflineSnags } from '../utils/offlineStorage';
import toast from 'react-hot-toast';

const EngineerNav = [
    { to: '/engineer/dashboard', icon: <LayoutDashboard size={17} />, label: 'Dashboard' },
    { to: '/engineer/projects', icon: <FolderOpen size={17} />, label: 'Projects' },
    { to: '/engineer/snags', icon: <AlertOctagon size={17} />, label: 'Snag List' },
    { to: '/engineer/generate', icon: <PlusCircle size={17} />, label: 'Detect Snag' },
    { to: '/engineer/offline', icon: <WifiOff size={17} />, label: 'Offline Sync' },
    { to: '/engineer/reports', icon: <FileText size={17} />, label: 'Reports' },
    { to: '/engineer/mail', icon: <Mail size={17} />, label: 'Mail' },
];
const ContractorNav = [
    { to: '/contractor/dashboard', icon: <LayoutDashboard size={17} />, label: 'Dashboard' },
    { to: '/contractor/snags', icon: <Wrench size={17} />, label: 'Assigned Snags' },
    { to: '/contractor/resolved', icon: <SquareCheck size={17} />, label: 'Completed' },
    { to: '/contractor/update-profile', icon: <UserCircle size={17} />, label: 'Update Profile' },
];

export default function Sidebar() {
    const { user, logout, isEngineer } = useAuth();
    const online = useOnlineStatus();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    const handleClearQueue = async () => {
        if (window.confirm("Are you sure you want to clear all pending offline snags?")) {
            await clearOfflineSnags();
            setPendingCount(0);
            toast.success("Offline queue cleared");
        }
    };

    useEffect(() => {
        const updateCount = async () => {
            const count = await getPendingCount();
            setPendingCount(count);
        };
        updateCount();
        
        const handleSync = () => updateCount();
        const handleStatus = (e) => setIsSyncing(e.detail);
        
        window.addEventListener('snag_synced', handleSync);
        window.addEventListener('sync_status', handleStatus);
        
        const interval = setInterval(updateCount, 5000);
        return () => {
            clearInterval(interval);
            window.removeEventListener('snag_synced', handleSync);
            window.removeEventListener('sync_status', handleStatus);
        };
    }, [online]);

    const navItems = isEngineer ? EngineerNav : ContractorNav;
    const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
    const roleLabel = isEngineer ? 'Site Engineer' : 'Contractor';

    const handleLogout = () => { logout(); navigate('/login'); };
    const closeMobile = () => setMobileOpen(false);

    const SidebarContent = () => (
        <>
            {/* Close button (mobile only) */}
            <button onClick={closeMobile} style={{
                display: 'none', position: 'absolute', top: 12, right: 12,
                background: 'rgba(255,248,240,0.08)', border: '1px solid rgba(255,248,240,0.12)',
                borderRadius: 'var(--r-md)', padding: '6px 8px', cursor: 'pointer',
                color: 'rgba(255,248,240,0.7)',
            }} className="mobile-close-btn">
                <X size={16} />
            </button>

            {/* Logo area with integrated Menu Toggle */}
            <div className="sidebar-logo">
                {!isCollapsed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                        <div className="sidebar-logo-icon">
                            <Building size={20} color="#fff" />
                        </div>
                        <div>
                            <div className="sidebar-logo-text">SnagDetect</div>
                            <div className="sidebar-logo-sub">Construction AI Platform</div>
                        </div>
                    </div>
                )}
                
                {/* Desktop Menu Toggle (3-lines) */}
                <button 
                    className="desktop-menu-toggle" 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    <Menu size={18} />
                </button>
            </div>

            {/* ─── Sync Status Card ─── */}
            {pendingCount > 0 && !isCollapsed && (
                <div style={{ padding: '0 16px', marginBottom: 12 }}>
                    <div style={{
                        background: online ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                        border: `1px solid ${online ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
                        borderRadius: '12px', padding: '12px', position: 'relative'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className={online && isSyncing ? 'sync-pulse' : ''} style={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: online ? (isSyncing ? '#10B98120' : '#F59E0B20') : '#F59E0B20',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: online ? (isSyncing ? '#10B981' : '#F59E0B') : '#F59E0B'
                            }}>
                                {online ? <Wifi size={16} /> : <WifiOff size={16} />}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: online ? (isSyncing ? '#10B981' : '#F59E0B') : '#F59E0B' }}>
                                    {online ? (isSyncing ? 'Syncing...' : 'Sync Paused') : 'Pending Sync'}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    {pendingCount} {pendingCount === 1 ? 'snag' : 'snags'} queued
                                </div>
                            </div>
                        </div>
                        
                        {/* Clear button */}
                        <button 
                            onClick={handleClearQueue}
                            style={{
                                position: 'absolute', top: 8, right: 8,
                                background: 'transparent', border: 'none',
                                color: 'rgba(234,88,12,0.6)', cursor: 'pointer',
                                padding: 4, display: 'flex'
                            }}
                            title="Clear Queue"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* ─── Profile Incomplete Warning ─── */}
            {!isEngineer && user && !user.profile_completed && !isCollapsed && (
                <div style={{ padding: '0 16px', marginBottom: 12 }}>
                    <div style={{
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: '12px', padding: '12px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: 'rgba(239,68,68,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444'
                            }}>
                                <TriangleAlert size={16} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#EF4444' }}>
                                    Incomplete Profile
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    Required for assignments
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Role badge */}
            {!isCollapsed && (
                <div style={{ padding: '8px 16px' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'rgba(234,88,12,0.12)', border: '1px solid rgba(234,88,12,0.2)',
                        borderRadius: 'var(--r-md)', padding: '7px 10px',
                    }}>
                        {isEngineer
                            ? <HardHat size={14} color="var(--orange-light)" />
                            : <Wrench size={14} color="var(--orange-light)" />
                        }
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--orange-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {roleLabel}
                        </span>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <nav className="sidebar-nav">
                {!isCollapsed && <div className="nav-section-label">Navigation</div>}
                {navItems.map(item => (
                    <NavLink 
                        key={item.to} 
                        to={item.to} 
                        onClick={closeMobile} 
                        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} 
                        title={isCollapsed ? item.label : ''}
                    >
                        {item.icon}
                        {!isCollapsed && (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span>{item.label}</span>
                                {item.label === 'Offline Sync' && pendingCount > 0 && (
                                    <span style={{ 
                                        background: 'var(--danger)', color: '#fff', fontSize: 10, fontWeight: 900, 
                                        minWidth: 18, height: 18, borderRadius: 9, display: 'flex', 
                                        alignItems: 'center', justifyContent: 'center', padding: '0 5px' 
                                    }}>{pendingCount}</span>
                                )}
                            </div>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div className="sidebar-footer">
                {/* Network status */}
                <div className="online-dot" style={{ color: online ? '#4ADE80' : '#FCD34D' }}>
                    {online
                        ? <><Wifi size={13} /><span style={{ fontSize: 11, fontWeight: 600 }}>Connected</span></>
                        : <><WifiOff size={13} /><span style={{ fontSize: 11, fontWeight: 600 }}>Offline</span></>
                    }
                </div>

                {/* User info */}
                <div className="user-card" style={{ padding: isCollapsed ? '10px 6px' : '10px' }}>
                    <div className="avatar">{initials}</div>
                    {!isCollapsed && (
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
                            <div className="user-role">{roleLabel}</div>
                        </div>
                    )}
                </div>

                {/* Logout */}
                <button className="btn btn-ghost btn-sm w-full"
                    onClick={handleLogout} style={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
                    <LogOut size={14} /> {!isCollapsed && "Sign Out"}
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* ── Mobile top bar ────────────────────────────── */}
            <div className="mobile-topbar">
                <div className="mobile-topbar-brand">
                    <div style={{ width: 30, height: 30, background: 'linear-gradient(135deg,var(--orange),var(--amber-light))', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Building size={16} color="#fff" />
                    </div>
                    <span>SnagDetect</span>
                </div>
                <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)}>
                    <Menu size={20} />
                </button>
            </div>

            {/* ── Overlay ───────────────────────────────────── */}
            <div className={`sidebar-overlay${mobileOpen ? ' active' : ''}`} onClick={closeMobile} />

            {/* ── Sidebar ───────────────────────────────────── */}
            <aside className={`sidebar ${mobileOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
                <SidebarContent />
            </aside>
        </>
    );
}
