"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { PenTool, Archive, BookHeart, Swords, LogOut, Trophy, Users } from "lucide-react";
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
    const [studentName, setStudentName] = useState("");
    const [isLogged, setIsLogged] = useState(false);

    useEffect(() => {
        const sessionStr = localStorage.getItem("poke_student_session");
        if (!sessionStr) {
            toast.error("로그인이 필요합니다.");
            router.push("/login");
            return;
        }

        try {
            const session = JSON.parse(sessionStr);
            setStudentName(session.studentInfo.name);
            setIsLogged(true);
        } catch (e) {
            localStorage.removeItem("poke_student_session");
            router.push("/login");
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("poke_student_session");
        toast.success("로그아웃 되었습니다.");
        router.push("/login");
    };

    const navItems = [
        { name: "기록 (Write)", path: "/write", icon: <PenTool className="h-5 w-5" /> },
        { name: "보관함 (Archive)", path: "/archive", icon: <Archive className="h-5 w-5" /> },
        { name: "포켓몬 도감", path: "/pokedex", icon: <BookHeart className="h-5 w-5" /> },
        { name: "체육관 (Gym)", path: "/gym", icon: <Trophy className="h-5 w-5" /> },
        { name: "친선 경기", path: "/friendly", icon: <Users className="h-5 w-5" /> },
    ];

    if (!isLogged) return <div className="flex justify-center items-center h-[50vh]">인증 확인 중...</div>;

    return (
        <div className="flex flex-col min-h-[85vh] relative pb-24 md:pb-0 md:flex-row gap-8">
            {/* Pokemon Theme Student Navigation */}
            <nav className="fixed bottom-4 left-4 right-4 z-50 bg-[#001233]/90 backdrop-blur-2xl border-2 border-[#3b4cca]/40 flex justify-around p-3 rounded-[2.5rem] shadow-[0_10px_30px_rgba(0,0,0,0.5)] md:relative md:w-72 md:flex-col md:p-6 md:rounded-[3rem] md:justify-start gap-4 md:border-t-0 md:bg-[#001233]/80">
                {/* Pokeball Red Top Accent for Sidebar (Desktop) */}
                <div className="hidden md:block absolute top-0 left-0 w-full h-2 bg-[#ff0000] rounded-t-[3rem] shadow-[0_2px_10px_rgba(255,0,0,0.3)]"></div>

                <div className="hidden md:block mb-8 px-2 relative">
                    <h2 className="text-2xl font-black pokemon-gradient-text italic">학생용 공간</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Gamer Dashboard</p>
                </div>

                {navItems.map((item) => {
                    const isActive = pathname?.includes(item.path);
                    return (
                        <Link key={item.path} href={`/student${item.path}`} className="flex-1 md:flex-none">
                            <Button
                                variant="ghost"
                                className={`w-full flex-col md:flex-row gap-2 h-auto py-3 md:py-4 md:justify-start rounded-full md:rounded-2xl transition-all duration-300 border-2 ${isActive
                                    ? "bg-[#ffde00]/10 border-[#ffde00]/40 text-[#ffde00] shadow-[0_0_15px_rgba(255,222,0,0.2)]"
                                    : "border-transparent text-slate-400 hover:bg-[#3b4cca]/10 hover:border-[#3b4cca]/30 hover:text-slate-200"
                                    }`}
                            >
                                <div className={`${isActive ? "animate-bounce" : ""}`}>{item.icon}</div>
                                <span className="text-[10px] md:text-sm font-bold">{item.name}</span>
                            </Button>
                        </Link>
                    );
                })}

                <div className="hidden md:flex mt-auto pt-4 border-t border-border">
                    <Button variant="destructive" className="w-full justify-start gap-3" onClick={handleLogout}>
                        <LogOut className="h-5 w-5" />
                        <span className="text-sm">로그아웃</span>
                    </Button>
                </div>
            </nav>

            {/* Pokemon Theme Student Main Content Area */}
            <main className="flex-1 bg-[#001233]/30 backdrop-blur-sm rounded-[3rem] border-2 border-[#3b4cca]/20 p-6 sm:p-10 shadow-inner relative overflow-hidden mb-24 md:mb-0">
                <div className="cute-dots absolute inset-0"></div>

                <div className="md:hidden flex justify-end mb-6">
                    <Button variant="ghost" size="sm" onClick={handleLogout} className="rounded-full bg-[#ff0000]/10 text-[#ff0000] border border-[#ff0000]/20 font-bold">
                        로그아웃
                    </Button>
                </div>
                <div className="relative z-10">
                    {children}
                </div>
            </main>
        </div>
    );
}
