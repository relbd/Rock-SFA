"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Store, Clock, UserPlus, ShoppingCart } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  const links = [
    { name: "Home", href: "/", icon: Home },
    { name: "Attend", href: "/attendance", icon: Clock },
    { name: "Visit", href: "/visit", icon: Store },
    { name: "Order", href: "/order", icon: ShoppingCart },
    { name: "Customer", href: "/customers", icon: UserPlus },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="max-w-md mx-auto flex justify-around items-center h-16 px-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex flex-col items-center justify-center w-full h-full gap-0.5 transition-all duration-200 ${
                isActive
                  ? "text-blue-600"
                  : "text-gray-400 active:text-gray-600"
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all duration-200 ${isActive ? "bg-blue-50" : ""}`}>
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
              </div>
              <span className={`text-[10px] ${isActive ? "font-bold" : "font-medium"}`}>{link.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
