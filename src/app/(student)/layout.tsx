"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { PenTool, Archive, BookHeart, Swords, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
// TODO: Custom Session 관리 로직 임포트 필요

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [isLogged, setIsLogged] = useState(false);

    useEffect(() => {
        // 1. 임시 세션 확인 (LocalStorage 또는 Cookie 기반)
        // const session = localStorage.getItem("studentSession");
        // if (!session) {
        //   router.push("/login");
        // } else {
        //   setIsLogged(true);
        // }

        // 개발 단계 임시 처리
        setIsLogged(true);
    }, [router]);

    const handleLogout = () => {
        // localStorage.removeItem("studentSession");
        toast.success("로그아웃 되었습니다.");
        router.push("/");
    };

    const navItems = [
        { name: "기록 (Write)", path: "/write", icon: <PenTool className="h-5 w-5" /> },
        { name: "보관함 (Archive)", path: "/archive", icon: <Archive className="h-5 w-5" /> },
        { name: "포켓몬 도감", path: "/pokedex", icon: <BookHeart className="h-5 w-5" /> },
        { name: "배틀 스타디움", path: "/stadium", icon: <Swords className="h-5 w-5" /> },
    ];

    if (!isLogged) return <div className="flex justify-center items-center h-[50vh]">인증 확인 중...</div>;

    return (
        <div className="flex flex-col min-h-[80vh] relative pb-20 md:pb-0 md:flex-row gap-6">
            {/* Mobile Bottom Navigation / Desktop Sidebar */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border flex justify-around p-2 md:relative md:w-64 md:border-t-0 md:border-r md:flex-col md:p-4 md:bg-card md:rounded-xl md:justify-start gap-2 shadow-sm">

                <div className="hidden md:block mb-6 px-2">
                    <h2 className="text-xl font-bold text-primary">학생용 공간</h2>
                </div>

                {navItems.map((item) => (
                    <Link key={item.path} href={`/student${item.path}`} className="flex-1 md:flex-none">
                        <Button
                            variant={pathname?.includes(item.path) ? "secondary" : "ghost"}
                            className={`w-full flex-col md:flex-row gap-1 h-auto py-3 md:py-2 md:justify-start ${pathname?.includes(item.path) ? "bg-secondary" : ""
                                }`}
                        >
                            {item.icon}
                            <span className="text-xs md:text-sm">{item.name}</span>
                        </Button>
                    </Link>
                ))}

                <div className="hidden md:flex mt-auto pt-4 border-t border-border">
                    <Button variant="destructive" className="w-full justify-start gap-3" onClick={handleLogout}>
                        <LogOut className="h-5 w-5" />
                        <span className="text-sm">로그아웃</span>
                    </Button>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 bg-card rounded-xl border border-border p-4 sm:p-6 shadow-sm mb-16 md:mb-0">
                <div className="md:hidden flex justify-end mb-4">
                    <Button variant="outline" size="sm" onClick={handleLogout}>
                        로그아웃
                    </Button>
                </div>
                {children}
            </main>
        </div>
    );
}
