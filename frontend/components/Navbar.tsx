"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Search, BarChart3, Briefcase, Target, MessageSquare, LogOut, User, Sun, Moon, Newspaper, Bell } from "lucide-react";
import Logo from "@/components/Logo";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("wealthcraft_token") || localStorage.getItem("stockify_token");
    setIsLoggedIn(!!token);
    
    const savedTheme = localStorage.getItem("wealthcraft_theme") || "dark";
    setTheme(savedTheme);
    if (savedTheme === "light") {
      document.documentElement.classList.add("light");
      document.body.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
      document.body.classList.remove("light");
    }
  }, [pathname]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("wealthcraft_theme", nextTheme);
    if (nextTheme === "light") {
      document.documentElement.classList.add("light");
      document.body.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
      document.body.classList.remove("light");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("wealthcraft_token");
    localStorage.removeItem("stockify_token");
    setIsLoggedIn(false);
    router.push("/");
  };

  if (pathname === "/") return null; // Hide navbar on welcome/auth page

  const navLinks = [
    { href: "/dashboard", label: "Explore", icon: LayoutDashboard },
    { href: "/screener", label: "Screener", icon: Search },
    { href: "/portfolio", label: "Portfolio", icon: Briefcase },
    { href: "/compare", label: "Compare", icon: BarChart3 },
    { href: "/goals", label: "Goals", icon: Target },
    { href: "/news", label: "News", icon: Newspaper },
    { href: "/chat", label: "AI Advisor", icon: MessageSquare },
  ];

  return (
    <header className="w-full bg-[#0D0F12] border-b border-white/5 sticky top-0 z-50">
      {/* Primary Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        {/* Brand Logo & Core Segment Selector */}
        <div className="flex items-center gap-8">
          <Link href="/dashboard">
            <Logo size="md" />
          </Link>

          <div className="hidden lg:flex items-center gap-6 text-sm font-semibold">
            <Link href="/screener?assetType=STOCKS" className="text-white hover:text-[#00D09C] transition-colors">Stocks</Link>
            <Link href="/screener?assetType=MFS" className="text-slate-300 hover:text-[#00D09C] transition-colors">Mutual Funds</Link>
            <Link href="/screener?assetType=ETFS" className="text-slate-300 hover:text-[#00D09C] transition-colors">ETFs</Link>
          </div>
        </div>

        {/* Global Search Input Bar (Groww Ctrl+K Style) */}
        <div className="hidden md:flex items-center flex-1 max-w-md relative">
          <Search size={15} className="absolute left-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search WealthCraft stocks, funds, ETFs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery.trim()) {
                router.push(`/screener?search=${encodeURIComponent(searchQuery)}`);
              }
            }}
            className="w-full pl-9 pr-14 py-2 bg-[#181B20] border border-white/5 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#00D09C] transition-all"
          />
          <span className="absolute right-2.5 px-1.5 py-0.5 bg-[#20242B] text-[10px] font-semibold text-slate-400 rounded border border-white/5 select-none">
            Ctrl+K
          </span>
        </div>

        {/* User Utilities & Auth Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-400 hover:text-[#00D09C] hover:bg-[#181B20] transition-all cursor-pointer"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <div className="relative">
            <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#181B20] transition-all cursor-pointer relative">
              <Bell size={17} />
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#00D09C] text-slate-950 text-[9px] font-extrabold flex items-center justify-center">
                5
              </span>
            </button>
          </div>

          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-[#181B20] hover:bg-[#20242B] border border-white/5 transition-all cursor-pointer"
            >
              <LogOut size={14} />
              Logout
            </button>
          ) : (
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#00D09C] text-slate-950 hover:bg-[#00B386] transition-all"
            >
              <User size={14} />
              Login
            </Link>
          )}
        </div>
      </div>

      {/* Sub Navigation Bar (Groww Category Tabs) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-8 text-xs font-medium border-t border-white/5 overflow-x-auto no-scrollbar">
        {navLinks.map((link) => {
          const isActive = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`py-2.5 relative font-semibold transition-colors flex items-center gap-1.5 ${
                isActive ? "text-[#00D09C]" : "text-slate-400 hover:text-white"
              }`}
            >
              {link.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00D09C] rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
