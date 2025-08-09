"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Compass,
  Users,
  Calendar,
  Settings,
  Activity,
  Map,
  Menu,
  X,
} from "lucide-react";

export default function HostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  const compassItems = [
    {
      name: "World",
      path: "/user",
      icon: <Compass className="h-5 w-5" />,
      color: "#3b82f6",
    },
    {
      name: "Connect",
      path: "/user/connect",
      icon: <Users className="h-5 w-5" />,
      color: "#0ea5e9",
    },
    {
      name: "Calendar",
      path: "/user/calendar",
      icon: <Calendar className="h-5 w-5" />,
      color: "#06b6d4",
    },
    {
      name: "Settings",
      path: "/user/settings",
      icon: <Settings className="h-5 w-5" />,
      color: "#6366f1",
    },
    {
      name: "Mood",
      path: "/user/mood",
      icon: <Map className="h-5 w-5" />,
      color: "#ec4899",
    },
    {
      name: "Game",
      path: "/user/game",
      icon: <Activity className="h-5 w-5" />,
      color: "#f59e0b",
    },
  ];

  const isItemActive = (itemPath: string) => {
    if (pathname === itemPath) return true;

    if (
      itemPath === "/user" &&
      pathname !== "/user" &&
      pathname?.startsWith("/user/")
    ) {
      return false;
    }

    return pathname?.startsWith(`${itemPath}/`);
  };

  const navigateTo = (path: string) => {
    setNavOpen(false);
    router.push(path);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setNavOpen(true);
      } else {
        setNavOpen(false);
      }
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const sidebar = document.getElementById("sidebar");
      const menuButton = document.getElementById("menu-button");

      if (
        window.innerWidth < 1024 &&
        sidebar &&
        !sidebar.contains(e.target as Node) &&
        menuButton &&
        !menuButton.contains(e.target as Node)
      ) {
        setNavOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="fixed inset-0 z-0"
        style={{
          background: `
            linear-gradient(135deg, #f0f9ff 0%, rgba(224, 242, 254, 0.8) 50%, rgba(186, 230, 253, 0.6) 100%),
            radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.1), transparent 25%),
            radial-gradient(circle at 80% 20%, rgba(6, 182, 212, 0.1), transparent 25%)
          `,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at center, rgba(59, 130, 246, 0.15) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />

        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-gradient-to-br from-blue-100/50 to-transparent rounded-full blur-3xl transform translate-x-1/4 -translate-y-1/4"></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-1/3 bg-gradient-to-tr from-sky-100/50 to-transparent rounded-full blur-3xl transform -translate-x-1/4 translate-y-1/4"></div>
      </div>

      <div className="fixed inset-4 md:inset-8 border border-white/20 rounded-3xl z-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] backdrop-blur-[1px]"></div>

      {!navOpen && (
        <button
          id="menu-button"
          onClick={() => setNavOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-50 bg-white/90 hover:bg-white text-blue-600 p-2.5 rounded-xl shadow-lg backdrop-blur-md transition-all"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      <aside
        id="sidebar"
        className={`
          fixed top-0 left-0 h-full z-40
          w-[280px] bg-white/95 backdrop-blur-md shadow-lg
          transform transition-all duration-300 ease-in-out
          ${navOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          border-r border-slate-100 flex flex-col
        `}
      >
        <button
          onClick={() => setNavOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex justify-center items-center h-20 min-h-[5rem] border-b border-slate-100">
          <div className="text-2xl font-bold text-blue-600">Connect</div>
        </div>

        <nav className="py-4 flex-1 overflow-y-auto">
          {compassItems.map((item) => {
            const isActive = isItemActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigateTo(item.path)}
                className={`
                  relative flex items-center w-full px-6 py-3.5 
                  ${
                    isActive
                      ? "text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }
                  transition-all duration-200
                `}
                style={{
                  color: isActive ? item.color : undefined,
                }}
              >
                {isActive && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
                    style={{ backgroundColor: item.color }}
                  ></div>
                )}

                <div className="flex items-center justify-center w-10 h-10">
                  {item.icon}
                </div>

                <span className="font-medium ml-3">{item.name}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {navOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      <div className="lg:ml-[280px] transition-all duration-300">
        <main className="p-4 md:p-6 lg:p-8 min-h-screen">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/40 overflow-hidden">
              <div className="p-6 md:p-8">{children}</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
