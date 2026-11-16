'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, FileText, Globe, Database, History, UserCheck, LogOut } from 'lucide-react';

interface NavbarProps {
  currentUser?: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

export function Navbar({ currentUser }: NavbarProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Incidents', href: '/incidents', icon: Shield },
    { label: 'Intelligence', href: '/intelligence', icon: Globe },
    { label: 'Memory & Templates', href: '/memory', icon: Database },
    { label: 'Audit Trail', href: '/audit', icon: History },
  ];

  return (
    <header className="bg-[#0b0f17] border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-6">
            <Link href="/incidents" className="flex items-center space-x-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 group-hover:border-blue-400 transition-colors">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-white flex items-center space-x-1.5">
                  <span>IncidentComms</span>
                  <span className="text-[10px] bg-blue-900/60 text-blue-300 border border-blue-500/30 px-1 py-0.2 rounded font-mono">
                    AI
                  </span>
                </span>
                <span className="text-[10px] text-muted-foreground block -mt-1 font-mono">
                  Sentinel Defense
                </span>
              </div>
            </Link>

            {/* Nav Links */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-card/50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Profile & Demo Switcher */}
          <div className="flex items-center space-x-3">
            {currentUser?.email ? (
              <div className="flex items-center space-x-2.5">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-medium text-slate-200">
                    {currentUser.name || currentUser.email}
                  </div>
                  <div className="text-[10px] text-blue-400 font-mono font-semibold">
                    {currentUser.role || 'COMMUNICATIONS_OFFICER'}
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-xs font-bold text-blue-300">
                  {(currentUser.name?.[0] || currentUser.email?.[0] || 'U').toUpperCase()}
                </div>
                <form action="/api/auth/signout" method="POST">
                  <button
                    type="submit"
                    className="p-1.5 text-muted-foreground hover:text-rose-400 rounded transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
