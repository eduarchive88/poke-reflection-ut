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
        <div className="flex flex-col md:flex-row min-h-[80vh] gap-6">
            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-card rounded-xl border border-border p-4 flex flex-col gap-2">
                <div className="mb-6 px-2">
                    <h2 className="text-xl font-bold text-primary">교사 대시보드</h2>
                    <p className="text-sm text-muted-foreground mt-1 text-ellipsis overflow-hidden">
                        {teacherName || user.email} 선생님
                    </p>
                </div>

                <nav className="flex-1 space-y-2">
                    <Link href="/dashboard">
                        <Button variant="ghost" className="w-full justify-start gap-3">
                            <Presentation className="h-5 w-5" />
                            학급 관리
                        </Button>
                    </Link>
                    <Link href="/dashboard/students">
                        <Button variant="ghost" className="w-full justify-start gap-3">
                            <Users className="h-5 w-5" />
                            학생 명렬표
                        </Button>
                    </Link>
                    <Link href="/dashboard/reflections">
                        <Button variant="ghost" className="w-full justify-start gap-3">
                            <FileText className="h-5 w-5" />
                            성찰 일기 확인
                        </Button>
                    </Link>
                </nav>

                <div className="mt-auto pt-4 border-t border-border">
                    <Button
                        variant="destructive"
                        className="w-full justify-start gap-3"
                        onClick={handleLogout}
                    >
                        <LogOut className="h-5 w-5" />
                        로그아웃
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 bg-card rounded-xl border border-border p-6 shadow-sm">
                {children}
            </main>
        </div>
    );
}
