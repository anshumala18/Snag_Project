import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, FolderOpen, PlusCircle, AlertOctagon,
    FileText, Wrench, CheckSquare, LogOut, Wifi, WifiOff,
    HardHat, Building, Menu, X,
} from 'lucide-react';
import { useOnlineStatus } from '../hooks/useSocket';

const EngineerNav = [
    { to: '/engineer/dashboard', icon: <LayoutDashboard size={17} />, label: 'Dashboard' },
    { to: '/engineer/projects', icon: <FolderOpen size={17} />, label: 'Projects' },
    { to: '/engineer/snags', icon: <AlertOctagon size={17} />, label: 'Snag List' },
    { to: '/engineer/generate', icon: <PlusCircle size={17} />, label: 'Detect Snag' },
    { to: '/engineer/reports', icon: <FileText size={17} />, label: 'Reports' },
];
const ContractorNav = [
    { to: '/contractor/dashboard', icon: <LayoutDashboard size={17} />, label: 'Dashboard' },
    { to: '/contractor/snags', icon: <Wrench size={17} />, label: 'Assigned Snags' },
    { to: '/contractor/resolved', icon: <CheckSquare size={17} />, label: 'Completed' },
];

export default function Sidebar() {
    const { user, logout, isEngineer } = useAuth();
    const online = useOnlineStatus();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);

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

            {/* Logo */}
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">
                    <Building size={20} color="#fff" />
                </div>
                <div>
                    <div className="sidebar-logo-text">SnagDetect</div>
                    <div className="sidebar-logo-sub">Construction AI Platform</div>
                </div>
            </div>

            {/* Role badge */}
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

            {/* Navigation */}
            <nav className="sidebar-nav">
                <div className="nav-section-label">Navigation</div>
                {navItems.map(item => (
                    <NavLink
                        key={item.to} to={item.to}
                        onClick={closeMobile}
                        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                    >
                        {item.icon}
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div className="sidebar-footer">
                {/* Network status */}
                <div className="online-dot" style={{ color: online ? '#4ADE80' : '#FCD34D' }}>
                    {online
                        ? <><Wifi size={13} /><span style={{ fontSize: 11, fontWeight: 600 }}>Connected</span></>
                        : <><WifiOff size={13} /><span style={{ fontSize: 11, fontWeight: 600 }}>Offline — data queued</span></>
                    }
                </div>

                {/* User info */}
                <div className="user-card">
                    <div className="avatar">{initials}</div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
                        <div className="user-role">{roleLabel}</div>
                    </div>
                </div>

                {/* Logout */}
                <button className="btn btn-ghost btn-sm w-full"
                    onClick={handleLogout}>
                    <LogOut size={14} /> Sign Out
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
            <aside className={`sidebar${mobileOpen ? ' open' : ''}`} style={{ position: 'fixed' }}>
                <SidebarContent />
            </aside>
        </>
    );
}
