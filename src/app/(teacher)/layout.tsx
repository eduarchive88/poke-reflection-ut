"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { TeacherClassProvider, useTeacherClass } from "@/contexts/TeacherClassContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function TeacherLayoutInner({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [teacherName, setTeacherName] = useState("");
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();
    const { classes, selectedClassId, setSelectedClassId, loadingClasses } = useTeacherClass();
    const [showNoClassModal, setShowNoClassModal] = useState(false);

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

    // 학급이 없을 때 모달 띄우기 로직
    useEffect(() => {
        if (!loading && !loadingClasses && user) {
            if (classes.length === 0 && pathname !== "/dashboard/classes") {
                setShowNoClassModal(true);
            } else {
                setShowNoClassModal(false);
            }
        }
    }, [loading, loadingClasses, user, classes, pathname]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            toast.success("로그아웃 되었습니다.");
            router.push("/");
        } catch (error) {
            toast.error("로그아웃에 실패했습니다.");
        }
    };

    if (loading || loadingClasses) {
        return <div className="flex justify-center flex-col items-center h-[100vh] bg-slate-50 gap-4">
            <div className="w-16 h-16 border-4 border-slate-900 border-t-white rounded-full animate-spin"></div>
            <p className="font-black text-xl pixel-text text-slate-800">SYSTEM LOADING...</p>
        </div>;
    }

    if (!user) {
        return null; // router.push 리다이렉트 처리 대기
    }

    // 학급이 있지만 아직 선택하지 않은 경우 → 학급 선택 화면 표시
    const showClassPicker = !loadingClasses && !loading && user && classes.length > 0 && !selectedClassId && pathname !== "/dashboard/classes";

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
            {/* Teacher Header */}
            <header className="px-6 py-4 flex justify-between items-center bg-background/80 backdrop-blur-xl border-b border-border relative z-50 sticky top-0">
                <div className="flex items-center gap-6">
                    <Link href="/dashboard" className="flex items-center gap-3 group transition-transform hover:scale-105">
                        <div className="w-10 h-10 border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_#000] bg-white group-hover:-translate-y-1 transition-transform relative">
                            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" alt="Pokeball" className="w-8 h-8" style={{ imageRendering: 'pixelated' }} />
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="text-2xl font-black text-white tracking-tighter italic leading-none" style={{ textShadow: '2px 2px 0px #ef4444, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000, 1px 1px 0px #000' }}>TEACHER</h1>
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest leading-none mt-1">Management Console</p>
                        </div>
                    </Link>
                </div>

                <div className="flex items-center gap-3">
                    {/* 학급 선택 드롭다운: 우측 로그인 정보 옆에 배치 */}
                    {selectedClassId && classes.length > 0 && pathname !== "/dashboard/classes" && (
                        <div className="flex items-center">
                            <Select value={selectedClassId || ""} onValueChange={setSelectedClassId}>
                                <SelectTrigger className="w-[120px] sm:w-[160px] bg-white border-[3px] border-black h-10 rounded-none shadow-[2px_2px_0_#000] font-black text-black hover:bg-slate-50 focus:ring-0 text-sm transition-transform hover:-translate-y-0.5">
                                    <SelectValue placeholder="학급 선택" />
                                </SelectTrigger>
                                <SelectContent className="border-[3px] border-black rounded-none shadow-[4px_4px_0_#000]">
                                    {classes.map(cls => (
                                        <SelectItem key={cls.id} value={cls.id} className="font-bold focus:bg-indigo-100 cursor-pointer text-sm">
                                            {cls.className}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="hidden sm:block text-right">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Logged in</p>
                        <p className="text-sm font-black">{teacherName || user.email?.split("@")[0]} 선생님</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLogout}
                        className="retro-btn bg-white border-2 border-slate-300 text-red-500 font-bold hover:bg-red-50 hover:border-red-500 text-xs px-3"
                    >
                        <LogOut className="h-3 w-3 sm:mr-2" />
                        <span className="hidden sm:inline">로그아웃</span>
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
                    {/* 학급 선택 화면: 학급은 있지만 아직 선택 안 한 상태 */}
                    {showClassPicker ? (
                        <div className="max-w-3xl mx-auto space-y-8 py-8">
                            {/* 학급 선택 헤더 */}
                            <div className="text-center space-y-4">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest border-[3px] border-black shadow-[2px_2px_0px_#000]">
                                    <img src="https://play.pokemonshowdown.com/sprites/itemicons/pc-box.png" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} alt="PC" />
                                    CLASS SELECT
                                </div>
                                <h2 className="text-3xl sm:text-4xl font-black text-black dark:text-white tracking-tighter italic" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.1)' }}>
                                    관리할 학급을 선택하세요
                                </h2>
                                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                                    선택한 학급의 대시보드로 이동합니다.
                                </p>
                            </div>

                            {/* 학급 카드 그리드 */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {classes.map((cls, index) => (
                                    <button
                                        key={cls.id}
                                        onClick={() => setSelectedClassId(cls.id)}
                                        className="retro-box hover-pixel-lift bg-white dark:bg-slate-800 p-6 flex items-center gap-4 text-left transition-all duration-200 cursor-pointer border-[3px] border-black hover:bg-indigo-50 dark:hover:bg-indigo-900/30 group"
                                    >
                                        {/* 포켓볼 아이콘 */}
                                        <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/50 border-[3px] border-black flex items-center justify-center shadow-[2px_2px_0px_#000] flex-shrink-0 group-hover:scale-110 transition-transform">
                                            <img
                                                src={`https://play.pokemonshowdown.com/sprites/itemicons/${['poke-ball', 'great-ball', 'ultra-ball', 'master-ball', 'premier-ball', 'luxury-ball'][index % 6]}.png`}
                                                className="w-10 h-10"
                                                style={{ imageRendering: 'pixelated' }}
                                                alt="Ball"
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-lg font-black text-black dark:text-white truncate tracking-tight">
                                                {cls.className}
                                            </p>
                                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono tracking-wider">
                                                CODE: {cls.sessionCode}
                                            </p>
                                        </div>
                                        <div className="text-indigo-500 font-black text-xl group-hover:translate-x-1 transition-transform">
                                            ▶
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* 새 학급 만들기 유도 */}
                            <div className="text-center">
                                <Button
                                    variant="outline"
                                    className="retro-btn bg-white border-2 border-black shadow-[2px_2px_0px_#000] font-black text-sm"
                                    onClick={() => router.push("/dashboard/classes")}
                                >
                                    + 새 학급 만들기
                                </Button>
                            </div>
                        </div>
                    ) : (
                        children
                    )}
                </div>

                {/* No Class Warning Modal */}
                <Dialog open={showNoClassModal} onOpenChange={(open) => {
                    if (!open) { /* Cannot be closed normally if no class exists */ }
                }}>
                    <DialogContent className="retro-box sm:max-w-[425px] bg-white dark:bg-slate-800 p-0 overflow-hidden [&>button]:hidden">
                        <div className="bg-red-500 p-4 border-b-[3px] border-black flex items-center gap-2">
                            <span className="text-2xl">⚠️</span>
                            <DialogTitle className="text-xl font-black text-white uppercase italic drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)]">시스템 경고</DialogTitle>
                        </div>
                        <div className="p-6 bg-slate-100 dark:bg-slate-700 text-center">
                            <DialogDescription asChild>
                                <div className="text-slate-800 font-bold mb-6 flex flex-col gap-2">
                                    <p className="text-lg">등록된 학급이 없습니다!</p>
                                    <p className="text-sm text-slate-600">성찰 일기 시스템을 사용하려면 최소 1개 이상의 학급을 생성해야 합니다.</p>
                                </div>
                            </DialogDescription>
                            <Button
                                className="retro-btn w-full h-12 bg-indigo-500 text-white font-black text-lg hover:bg-indigo-600"
                                onClick={() => {
                                    setShowNoClassModal(false);
                                    router.push("/dashboard/classes");
                                }}
                            >
                                학급 생성하러 가기
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

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

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
    return (
        <TeacherClassProvider>
            <TeacherLayoutInner>{children}</TeacherLayoutInner>
        </TeacherClassProvider>
    );
}
