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
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
            {/* Elegant Teacher Header */}
            <header className="px-6 py-4 flex justify-between items-center bg-background/80 backdrop-blur-xl border-b border-border relative z-50 sticky top-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg border border-indigo-400/30">
                        <Presentation className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter italic leading-none">TEACHER</h1>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-indigo-400/70 uppercase tracking-widest leading-none mt-1">Management Console</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden sm:block text-right mr-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Logged in as</p>
                        <p className="text-sm font-black">{teacherName || user.email?.split("@")[0]} 선생님</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLogout}
                        className="rounded-full bg-red-500/10 text-red-500 border border-red-500/20 font-bold hover:bg-red-500/20 text-xs px-4"
                    >
                        <LogOut className="h-3 w-3 mr-2" />
                        로그아웃
                    </Button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 p-4 sm:p-8 relative">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-600/5 rounded-full blur-[120px]"></div>
                    <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-blue-600/5 rounded-full blur-[100px]"></div>
                </div>

                <div className="max-w-7xl mx-auto relative z-10 w-full pb-20">
                    {children}
                </div>

                {/* Footer */}
                <footer className="mt-auto py-10 text-center text-[10px] text-slate-500 relative z-10 border-t border-border bg-background/50">
                    <div className="max-w-7xl mx-auto px-6">
                        <p className="text-slate-500 dark:text-slate-400 font-medium">만든 사람: 경기도 지구과학 교사 뀨짱</p>
                        <div className="mt-2 flex items-center justify-center gap-3 text-slate-500">
                            <a href="https://open.kakao.com/o/s7hVU65h" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">카카오톡 오픈채팅</a>
                            <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></span>
                            <a href="https://eduarchive.tistory.com/" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">뀨짱쌤의 교육자료 아카이브</a>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
}
