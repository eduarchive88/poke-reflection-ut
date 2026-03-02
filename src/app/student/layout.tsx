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
        <div className="min-h-screen bg-[#001233] text-slate-100 flex flex-col font-sans">
            {/* Elegant Glass Header */}
            <header className="sticky top-0 z-50 px-6 py-4 bg-[#001233]/80 backdrop-blur-xl border-b border-white/10 shadow-2xl">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <Link href="/student" className="flex items-center gap-3 group transition-transform hover:scale-105">
                        <div className="w-10 h-10 bg-gradient-to-tr from-[#ffde00] to-[#ff9500] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,222,0,0.3)] group-hover:rotate-12 transition-transform">
                            <div className="w-5 h-5 border-[3px] border-slate-900 rounded-full bg-white/20"></div>
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-xl font-black pokemon-gradient-text tracking-tighter italic leading-none">POCKETMON</h1>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Reflection Ultimate</p>
                        </div>
                    </Link>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Trainer</span>
                            <span className="text-sm font-black text-white leading-none">{studentName}</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleLogout}
                            className="h-9 px-4 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 font-bold hover:bg-red-500/20 hover:text-red-400 flex items-center gap-2 transition-all"
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="hidden sm:inline">로그아웃</span>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                {/* Visual enhancements */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
                    <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px]"></div>
                    <div className="h-full w-full opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
                </div>

                <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-8 relative z-10">
                    {children}
                </div>

                {/* Global Footer */}
                <footer className="w-full py-10 border-t border-white/5 bg-slate-950/20 backdrop-blur-sm relative z-10">
                    <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
                        <div className="text-center space-y-2">
                            <p className="text-sm font-bold text-slate-400">
                                만든 사람: <span className="text-slate-200">경기도 지구과학 교사 뀨짱</span>
                            </p>
                            <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-500">
                                <a
                                    href="https://open.kakao.com/o/s7hVU65h"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-[#3b4cca]/20 hover:text-white hover:border-[#3b4cca]/30 transition-all flex items-center gap-2"
                                >
                                    <span>문의: 카카오톡 오픈채팅</span>
                                </a>
                                <a
                                    href="https://eduarchive.tistory.com/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-[#3b4cca]/20 hover:text-white hover:border-[#3b4cca]/30 transition-all flex items-center gap-2"
                                >
                                    <span>블로그: 뀨짱쌤의 교육자료 아카이브</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
}
