'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Wallet,
  FileText,
  BarChart3,
  Settings,
  ClipboardList,
  LogOut,
  Upload,
  Calendar,
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard size={20} />,
  },
  {
    label: 'Employees',
    href: '/dashboard/employees',
    icon: <Users size={20} />,
  },
  {
    label: 'Attendance',
    href: '/dashboard/attendance',
    icon: <CalendarClock size={20} />,
    children: [
      { label: 'Daily View', href: '/dashboard/attendance' },
      { label: 'Import Data', href: '/dashboard/attendance/import' },
      { label: 'Leave Management', href: '/dashboard/attendance/leaves' },
    ],
  },
  {
    label: 'Payroll',
    href: '/dashboard/payroll',
    icon: <Wallet size={20} />,
  },
  {
    label: 'Salary Slips',
    href: '/dashboard/salary-slips',
    icon: <FileText size={20} />,
  },
  {
    label: 'Reports',
    href: '/dashboard/reports',
    icon: <BarChart3 size={20} />,
  },
  {
    label: 'Audit Log',
    href: '/dashboard/audit-log',
    icon: <ClipboardList size={20} />,
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: <Settings size={20} />,
    children: [
      { label: 'Payroll Settings', href: '/dashboard/settings' },
      { label: 'Salary Slip Template', href: '/dashboard/settings/salary-slip-layout' },
      { label: 'WhatsApp Notifications', href: '/dashboard/settings/whatsapp' },
      { label: 'Email / SMTP Settings', href: '/dashboard/settings/email' },
      { label: 'Holidays', href: '/dashboard/settings/holidays' },
      { label: 'Users', href: '/dashboard/settings/users' },
    ],
  },
];

export default function Sidebar({ userName, userRole }: { userName: string; userRole: string }) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Attendance', 'Settings']);

  const toggleExpand = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('mpcg_theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('mpcg_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  return (
    <aside style={sidebarStyles.sidebar}>
      {/* Brand */}
      <div style={sidebarStyles.brand}>
        <img
          src="/logo.png"
          alt="MPC Logo"
          style={{ width: '42px', height: '42px', objectFit: 'contain' }}
        />
        <div>
          <div style={sidebarStyles.brandName}>MPCG Payroll</div>
          <div style={sidebarStyles.brandSub}>Management System</div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={sidebarStyles.nav}>
        {navItems.map((item) => {
          const active = isActive(item.href);
          const expanded = expandedItems.includes(item.label);
          const hasChildren = item.children && item.children.length > 0;

          return (
            <div key={item.label}>
              {hasChildren ? (
                <button
                  onClick={() => toggleExpand(item.label)}
                  style={{
                    ...sidebarStyles.navItem,
                    ...(active ? sidebarStyles.navItemActive : {}),
                    width: '100%',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={sidebarStyles.navItemLeft}>
                    <span style={{
                      ...sidebarStyles.navIcon,
                      ...(active ? sidebarStyles.navIconActive : {}),
                    }}>
                      {item.icon}
                    </span>
                    {item.label}
                  </span>
                  {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              ) : (
                <Link href={item.href} style={{
                  ...sidebarStyles.navItem,
                  ...(active ? sidebarStyles.navItemActive : {}),
                  textDecoration: 'none',
                }}>
                  <span style={sidebarStyles.navItemLeft}>
                    <span style={{
                      ...sidebarStyles.navIcon,
                      ...(active ? sidebarStyles.navIconActive : {}),
                    }}>
                      {item.icon}
                    </span>
                    {item.label}
                  </span>
                </Link>
              )}

              {/* Children */}
              {hasChildren && expanded && (
                <div style={sidebarStyles.subNav}>
                  {item.children!.map((child) => {
                    const childActive = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        style={{
                          ...sidebarStyles.subNavItem,
                          ...(childActive ? sidebarStyles.subNavItemActive : {}),
                          textDecoration: 'none',
                        }}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User & Actions */}
      <div style={sidebarStyles.footer}>
        <div style={sidebarStyles.userInfo}>
          <div style={sidebarStyles.avatar}>
            {userName?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div>
            <div style={sidebarStyles.userName}>{userName}</div>
            <div style={sidebarStyles.userRole}>{userRole.replace('_', ' ')}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button
            onClick={toggleTheme}
            style={sidebarStyles.logoutBtn}
            title={`Switch to ${theme === 'dark' ? 'White / Light' : 'Dark'} Theme`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            style={sidebarStyles.logoutBtn}
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}

const sidebarStyles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '260px',
    minWidth: '260px',
    height: '100vh',
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border-primary)',
    display: 'flex',
    flexDirection: 'column',
    position: 'sticky',
    top: 0,
    backdropFilter: 'blur(20px)',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1.25rem 1.25rem',
    borderBottom: '1px solid var(--border-primary)',
  },
  logoCircle: {
    width: '36px',
    height: '36px',
    minWidth: '36px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#ffffff',
    fontWeight: 800,
    fontSize: '0.625rem',
    letterSpacing: '0.05em',
  },
  brandName: {
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  brandSub: {
    fontSize: '0.6875rem',
    color: 'var(--text-tertiary)',
  },
  nav: {
    flex: 1,
    padding: '0.75rem 0.75rem',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.625rem 0.75rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    border: 'none',
    background: 'transparent',
    fontFamily: 'inherit',
  },
  navItemActive: {
    background: 'rgba(6, 182, 212, 0.1)',
    color: '#06b6d4',
  },
  navItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  navIcon: {
    display: 'flex',
    alignItems: 'center',
    color: 'var(--text-secondary)',
  },
  navIconActive: {
    color: '#06b6d4',
  },
  subNav: {
    paddingLeft: '2.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  subNavItem: {
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    transition: 'all 150ms ease',
  },
  subNavItemActive: {
    color: '#06b6d4',
    background: 'rgba(6, 182, 212, 0.08)',
  },
  footer: {
    padding: '1rem 1.25rem',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '0.8125rem',
    fontWeight: 700,
  },
  userName: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  userRole: {
    fontSize: '0.6875rem',
    color: '#64748b',
    textTransform: 'capitalize',
  },
  logoutBtn: {
    padding: '0.5rem',
    borderRadius: '8px',
    background: 'transparent',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 150ms ease',
  },
};
