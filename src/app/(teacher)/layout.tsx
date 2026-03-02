"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { LogOut, Presentation, Users, FileText } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function TeacherLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<User | null>(null);
    const [teacherName, setTeacherName] = useState("");
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                // Firestore에서 교사 이름 가져오기
                const docRef = doc(db, "teachers", currentUser.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setTeacherName(docSnap.data().name);
                }
            } else {
                router.push("/login"); // 비로그인 시 로그인 페이지로
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [router]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            toast.success("로그아웃 되었습니다.");
            router.push("/");
        } catch (error) {
            toast.error("로그아웃에 실패했습니다.");
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-[50vh]">로딩 중...</div>;
    }

    if (!user) {
        return null; // router.push 리다이렉트 처리 대기
    }

    return (
        <div className="flex flex-col md:flex-row min-h-[85vh] gap-8">
            {/* Pokemon Theme Sidebar */}
            <aside className="w-full md:w-72 bg-[#001233]/80 backdrop-blur-xl border-2 border-[#3b4cca]/40 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl overflow-hidden relative group">
                {/* Pokeball Red Top Accent */}
                <div className="absolute top-0 left-0 w-full h-2 bg-[#ff0000] shadow-[0_2px_10px_rgba(255,0,0,0.3)]"></div>

                {/* Decorative Elements */}
                <div className="absolute -top-10 -left-10 w-32 h-32 bg-[#ffde00]/5 rounded-full blur-3xl group-hover:bg-[#ffde00]/10 transition-all duration-700"></div>

                <div className="relative z-10 px-2 space-y-1">
                    <h2 className="text-2xl font-black tracking-tighter pokemon-gradient-text">
                        교사 대시보드
                    </h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#ff0000] animate-pulse shadow-[0_0_5px_#ff0000]"></span>
                        {teacherName || user.email?.split('@')[0]} 선생님
                    </p>
                </div>

                <nav className="flex-1 space-y-3 relative z-10">
                    <Link href="/dashboard">
                        <Button variant="ghost" className="w-full justify-start gap-4 h-12 rounded-2xl hover:bg-[#ffde00]/10 hover:text-[#ffde00] transition-all group/btn border border-transparent hover:border-[#ffde00]/30">
                            <Presentation className="h-5 w-5 text-slate-400 group-hover/btn:text-[#ffde00]" />
                            <span className="font-bold">학급 관리</span>
                        </Button>
                    </Link>
                    <Link href="/dashboard/students">
                        <Button variant="ghost" className="w-full justify-start gap-4 h-12 rounded-2xl hover:bg-[#ffde00]/10 hover:text-[#ffde00] transition-all group/btn border border-transparent hover:border-[#ffde00]/30">
                            <Users className="h-5 w-5 text-slate-400 group-hover/btn:text-[#ffde00]" />
                            <span className="font-bold">학생 명렬표</span>
                        </Button>
                    </Link>
                    <Link href="/dashboard/status">
                        <Button variant="ghost" className="w-full justify-start gap-4 h-12 rounded-2xl hover:bg-[#ffde00]/10 hover:text-[#ffde00] transition-all group/btn border border-transparent hover:border-[#ffde00]/30">
                            <FileText className="h-5 w-5 text-slate-400 group-hover/btn:text-[#ffde00]" />
                            <span className="font-bold">성찰 현황판</span>
                        </Button>
                    </Link>
                </nav>

                <div className="mt-auto pt-6 border-t border-slate-800/60 relative z-10">
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-4 h-12 rounded-2xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
                        onClick={handleLogout}
                    >
                        <LogOut className="h-5 w-5" />
                        <span className="font-bold">시스템 로그아웃</span>
                    </Button>
                </div>
            </aside>

            {/* Pokemon Main Content Area */}
            <main className="flex-1 bg-[#001233]/30 backdrop-blur-sm rounded-3xl border-2 border-[#3b4cca]/20 p-8 shadow-inner relative overflow-hidden min-h-[600px]">
                {/* Pokemon background glow */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#ffde00]/5 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#3b4cca]/5 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="relative z-10">
                    {children}
                </div>
            </main>
        </div>
    );
}
