"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  LayoutDashboard,
  Search,
  BarChart3,
  Briefcase,
  Target,
  MessageSquare,
  LogOut,
  User,
  Newspaper,
  ChevronDown,
  X,
  TrendingUp,
} from "lucide-react";
import Logo from "@/components/Logo";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("wealthcraft_token") || localStorage.getItem("stockify_token");
    setIsLoggedIn(!!token);
  }, [pathname]);

  // Ctrl+K to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setShowSearch(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("wealthcraft_token");
    localStorage.removeItem("stockify_token");
    setIsLoggedIn(false);
    router.push("/");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/screener?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setShowSearch(false);
    }
  };

  if (pathname === "/") return null; // Hide navbar on welcome/auth page

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/screener", label: "Screener", icon: Search },
    { href: "/portfolio", label: "Portfolio", icon: Briefcase },
    { href: "/compare", label: "Compare", icon: BarChart3 },
    { href: "/goals", label: "Goals", icon: Target },
    { href: "/news", label: "News", icon: Newspaper },
    { href: "/chat", label: "AI Advisor", icon: MessageSquare },
  ];

  return (
    <header className="w-full bg-[#0D0F12]/95 backdrop-blur-md border-b border-white/5 sticky top-0 z-50">
      {/* Primary Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-6 shrink-0">
          <Link href="/dashboard" className="flex-shrink-0">
            <Logo size="md" />
          </Link>

          <div className="hidden lg:flex items-center gap-5 text-sm font-semibold">
            <Link href="/screener?assetType=STOCKS" className="text-slate-300 hover:text-[#00D09C] transition-colors flex items-center gap-1">
              <TrendingUp size={13} /> Stocks
            </Link>
            <Link href="/screener?assetType=MFS" className="text-slate-300 hover:text-[#00D09C] transition-colors">
              Mutual Funds
            </Link>
            <Link href="/screener?assetType=ETFS" className="text-slate-300 hover:text-[#00D09C] transition-colors">
              ETFs
            </Link>
          </div>
        </div>

        {/* Global Search */}
        <form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-md relative">
          <Search size={14} className="absolute left-3 text-slate-500 pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search stocks, funds, ETFs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSearch(true)}
            className="w-full pl-9 pr-14 py-2 bg-[#181B20] border border-white/5 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00D09C]/50 focus:bg-[#1a1e25] transition-all"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 text-slate-500 hover:text-white p-1"
            >
              <X size={12} />
            </button>
          ) : (
            <span className="absolute right-2.5 px-1.5 py-0.5 bg-[#20242B] text-[10px] font-semibold text-slate-500 rounded border border-white/5 select-none">
              ⌘K
            </span>
          )}
        </form>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Mobile search toggle */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <Search size={16} />
          </button>

          {/* Mobile menu */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={18} /> : (
              <div className="flex flex-col gap-1.5 w-4">
                <span className="h-px bg-current rounded" />
                <span className="h-px bg-current rounded w-3" />
                <span className="h-px bg-current rounded" />
              </div>
            )}
          </button>

          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-all cursor-pointer"
            >
              <LogOut size={13} />
              <span>Logout</span>
            </button>
          ) : (
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#00D09C] text-slate-950 hover:bg-[#00B386] transition-all shadow-lg shadow-emerald-500/20"
            >
              <User size={13} />
              Login
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Search Bar */}
      {showSearch && (
        <div className="md:hidden px-4 pb-3">
          <form onSubmit={handleSearch} className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              autoFocus
              type="text"
              placeholder="Search stocks, funds, ETFs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-[#181B20] border border-white/5 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00D09C]/50 transition-all"
            />
          </form>
        </div>
      )}

      {/* Sub Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 text-xs font-medium border-t border-white/5 overflow-x-auto no-scrollbar">
        {navLinks.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`py-2.5 px-3 relative font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap rounded-t-md ${
                isActive
                  ? "text-[#00D09C]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
              }`}
            >
              <Icon size={13} />
              {link.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00D09C] rounded-full" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Mobile Full Menu Overlay */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-white/5 bg-[#0D0F12] px-4 py-4 space-y-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-[#00D09C]/10 text-[#00D09C] border border-[#00D09C]/20"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon size={16} />
                {link.label}
              </Link>
            );
          })}
          {isLoggedIn && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-all mt-2 border border-red-500/20"
            >
              <LogOut size={16} />
              Logout
            </button>
          )}
        </div>
      )}
    </header>
  );
}
