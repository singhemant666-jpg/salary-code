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
    icon: <LayoutDashboard size={18} />,
  },
  {
    label: 'Employees',
    href: '/dashboard/employees',
    icon: <Users size={18} />,
  },
  {
    label: 'Attendance',
    href: '/dashboard/attendance',
    icon: <CalendarClock size={18} />,
    children: [
      { label: 'Daily View', href: '/dashboard/attendance' },
      { label: 'Import Data', href: '/dashboard/attendance/import' },
      { label: 'Leave Management', href: '/dashboard/attendance/leaves' },
      { label: 'Shift Timing Overrides', href: '/dashboard/attendance/shifts' },
      { label: 'Apply Leave (Portal)', href: '/apply-leave' },
    ],
  },
  {
    label: 'Payroll',
    href: '/dashboard/payroll',
    icon: <Wallet size={18} />,
  },
  {
    label: 'Salary Slips',
    href: '/dashboard/salary-slips',
    icon: <FileText size={18} />,
  },
  {
    label: 'Reports',
    href: '/dashboard/reports',
    icon: <BarChart3 size={18} />,
  },
  {
    label: 'Audit Log',
    href: '/dashboard/audit-log',
    icon: <ClipboardList size={18} />,
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: <Settings size={18} />,
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

  const initials = userName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'A';

  return (
    <>
      <style>{`
        .sidebar-nav-item {
          display: flex;
          align-items: center;
          padding: 0.55rem 0.75rem;
          border-radius: 9px;
          font-size: 0.845rem;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 180ms cubic-bezier(0.4, 0, 0.2, 1);
          border: none;
          background: transparent;
          font-family: inherit;
          width: 100%;
          text-decoration: none;
          letter-spacing: -0.01em;
          position: relative;
        }
        .sidebar-nav-item:hover {
          background: rgba(255, 255, 255, 0.055);
          color: var(--text-primary);
        }
        .sidebar-nav-item.active {
          background: linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(8, 145, 178, 0.08) 100%);
          color: #22d3ee;
          font-weight: 600;
          box-shadow: inset 0 0 0 1px rgba(6, 182, 212, 0.18);
        }
        .sidebar-nav-item.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 20%;
          bottom: 20%;
          width: 3px;
          border-radius: 0 3px 3px 0;
          background: linear-gradient(180deg, #06b6d4, #0891b2);
          box-shadow: 0 0 8px rgba(6, 182, 212, 0.6);
        }
        .sidebar-subnav-item {
          display: flex;
          align-items: center;
          padding: 0.42rem 0.75rem;
          border-radius: 7px;
          font-size: 0.8rem;
          color: var(--text-tertiary);
          transition: all 150ms ease;
          text-decoration: none;
          letter-spacing: -0.01em;
          position: relative;
        }
        .sidebar-subnav-item::before {
          content: '';
          position: absolute;
          left: -12px;
          top: 50%;
          width: 6px;
          height: 1px;
          background: var(--text-tertiary);
          opacity: 0.4;
        }
        .sidebar-subnav-item:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.045);
        }
        .sidebar-subnav-item.active {
          color: #06b6d4;
          background: rgba(6, 182, 212, 0.09);
          font-weight: 600;
        }
        .sidebar-subnav-item.active::before {
          background: #06b6d4;
          opacity: 1;
        }
        .sidebar-action-btn {
          padding: 0.45rem;
          border-radius: 8px;
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-tertiary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 150ms ease;
        }
        .sidebar-action-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.07);
          border-color: rgba(255, 255, 255, 0.1);
        }
        .sidebar-action-btn.danger:hover {
          color: #f87171;
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.2);
        }
      `}</style>

      <aside
        style={{
          width: '264px',
          minWidth: '264px',
          height: '100vh',
          background: 'linear-gradient(180deg, #0a1628 0%, #07101e 100%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            padding: '1.35rem 1.25rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            background: 'rgba(6, 182, 212, 0.03)',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              minWidth: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(8,145,178,0.1) 100%)',
              border: '1px solid rgba(6, 182, 212, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: '0 0 12px rgba(6, 182, 212, 0.15)',
            }}
          >
            <img
              src="/logo.png"
              alt="MPC Logo"
              style={{ width: '28px', height: '28px', objectFit: 'contain' }}
            />
          </div>
          <div>
            <div
              style={{
                fontSize: '0.9375rem',
                fontWeight: 700,
                color: '#edf2f7',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}
            >
              MPCG Payroll
            </div>
            <div
              style={{
                fontSize: '0.6875rem',
                color: '#516480',
                marginTop: '1px',
                fontWeight: 500,
              }}
            >
              Management System
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav
          style={{
            flex: 1,
            padding: '0.875rem 0.75rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1px',
          }}
        >
          {navItems.map((item, idx) => {
            const active = isActive(item.href);
            const expanded = expandedItems.includes(item.label);
            const hasChildren = item.children && item.children.length > 0;

            return (
              <div key={item.label}>
                {hasChildren ? (
                  <button
                    onClick={() => toggleExpand(item.label)}
                    className={`sidebar-nav-item${active ? ' active' : ''}`}
                    style={{ justifyContent: 'space-between' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          color: active ? '#22d3ee' : 'inherit',
                          transition: 'color 180ms ease',
                        }}
                      >
                        {item.icon}
                      </span>
                      {item.label}
                    </span>
                    <span
                      style={{
                        color: active ? '#22d3ee' : 'var(--text-tertiary)',
                        transition: 'transform 200ms ease',
                        transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                        display: 'flex',
                      }}
                    >
                      <ChevronDown size={14} />
                    </span>
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={`sidebar-nav-item${active ? ' active' : ''}`}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          color: active ? '#22d3ee' : 'inherit',
                          transition: 'color 180ms ease',
                        }}
                      >
                        {item.icon}
                      </span>
                      {item.label}
                    </span>
                  </Link>
                )}

                {/* Children */}
                {hasChildren && expanded && (
                  <div
                    style={{
                      paddingLeft: '2.55rem',
                      paddingTop: '3px',
                      paddingBottom: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1px',
                      borderLeft: '1px solid rgba(255, 255, 255, 0.06)',
                      marginLeft: '1.4rem',
                      marginTop: '2px',
                    }}
                  >
                    {item.children!.map((child) => {
                      const childActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`sidebar-subnav-item${childActive ? ' active' : ''}`}
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

        {/* User & Actions Footer */}
        <div
          style={{
            padding: '1rem 1rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            background: 'rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                minWidth: '34px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.02em',
                boxShadow: '0 0 12px rgba(6, 182, 212, 0.25)',
              }}
            >
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#edf2f7',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '120px',
                }}
              >
                {userName}
              </div>
              <div
                style={{
                  fontSize: '0.6875rem',
                  color: '#516480',
                  textTransform: 'capitalize',
                  fontWeight: 500,
                }}
              >
                {userRole.replace(/_/g, ' ').toLowerCase()}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button
              onClick={toggleTheme}
              className="sidebar-action-btn"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="sidebar-action-btn danger"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
