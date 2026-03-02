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
            {/* Premium Sidebar */}
            <aside className="w-full md:w-72 bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl overflow-hidden relative group">
                {/* Decorative Elements */}
                <div className="absolute -top-10 -left-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all duration-700"></div>

                <div className="relative z-10 px-2 space-y-1">
                    <h2 className="text-2xl font-black tracking-tighter bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent">
                        교사 대시보드
                    </h2>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        {teacherName || user.email?.split('@')[0]} 선생님
                    </p>
                </div>

                <nav className="flex-1 space-y-3 relative z-10">
                    <Link href="/dashboard">
                        <Button variant="ghost" className="w-full justify-start gap-4 h-12 rounded-2xl hover:bg-amber-500/10 hover:text-amber-400 transition-all group/btn">
                            <Presentation className="h-5 w-5 text-slate-400 group-hover/btn:text-amber-400" />
                            <span className="font-bold">학급 관리</span>
                        </Button>
                    </Link>
                    <Link href="/dashboard/students">
                        <Button variant="ghost" className="w-full justify-start gap-4 h-12 rounded-2xl hover:bg-amber-500/10 hover:text-amber-400 transition-all group/btn">
                            <Users className="h-5 w-5 text-slate-400 group-hover/btn:text-amber-400" />
                            <span className="font-bold">학생 명렬표</span>
                        </Button>
                    </Link>
                    <Link href="/dashboard/status">
                        <Button variant="ghost" className="w-full justify-start gap-4 h-12 rounded-2xl hover:bg-amber-500/10 hover:text-amber-400 transition-all group/btn">
                            <FileText className="h-5 w-5 text-slate-400 group-hover/btn:text-amber-400" />
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

            {/* Premium Main Content */}
            <main className="flex-1 bg-slate-900/20 backdrop-blur-sm rounded-3xl border border-slate-800/40 p-8 shadow-inner relative overflow-hidden min-h-[600px]">
                {/* Subtle background glow */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="relative z-10">
                    {children}
                </div>
            </main>
        </div>
    );
}
