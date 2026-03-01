"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Archive, Calendar, MessageSquare, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

export default function ArchivePage() {
    const router = useRouter();

    interface ReflectionItem {
        id: string;
        content: string;
        wordCount: number;
        createdAt: {
            toDate: () => Date;
        };
    }

    interface StudentSession {
        studentId: string;
        classId: string;
        name: string;
    }

    const [session, setSession] = useState<StudentSession | null>(null);
    const [reflections, setReflections] = useState<ReflectionItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const sessionStr = localStorage.getItem("poke_student_session");
        if (!sessionStr) {
            router.push("/login");
            return;
        }
        const sessionData = JSON.parse(sessionStr);
        setSession(sessionData);
        fetchReflections(sessionData.studentId);
    }, [router]);

    const fetchReflections = async (studentId: string) => {
        setLoading(true);
        try {
            const q = query(
                collection(db, "reflections"),
                where("studentId", "==", studentId),
                orderBy("createdAt", "desc")
            );
            const snapshots = await getDocs(q);
            const list: ReflectionItem[] = [];
            snapshots.forEach(doc => list.push({ id: doc.id, ...doc.data() } as ReflectionItem));
            setReflections(list);
        } catch (error) {
            console.error(error);
            toast.error("기록을 불러오는 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    if (!session) return null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/student")}>
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-black tracking-tight text-primary flex items-center gap-2">
                            <Archive className="h-8 w-8 text-blue-500" />
                            나의 기록 보관함
                        </h2>
                        <p className="text-muted-foreground mt-1">
                            지금까지 포켓몬과 함께 쌓아온 성장의 기록들입니다.
                        </p>
                    </div>
                </div>
                <div className="bg-secondary/50 px-4 py-2 rounded-full border border-border flex items-center gap-2 whitespace-nowrap">
                    <span className="text-sm font-bold">총 기록 수:</span>
                    <span className="text-primary font-black">{reflections.length}개</span>
                </div>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="animate-pulse h-32" />
                    ))}
                </div>
            ) : reflections.length === 0 ? (
                <div className="text-center py-20 bg-secondary/10 rounded-xl border-2 border-dashed border-border group">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4 group-hover:scale-110 transition-transform" />
                    <p className="text-xl font-bold">아직 기록된 이야기가 없습니다.</p>
                    <p className="text-muted-foreground mt-2">오늘의 첫 성찰 일기를 작성해보세요!</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {reflections.map((ref) => (
                        <Card key={ref.id} className="hover:border-primary/50 transition-colors shadow-sm overflow-hidden border-2">
                            <div className="bg-secondary/20 px-4 py-2 flex items-center justify-between border-b text-[10px] font-bold text-muted-foreground uppercase">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-3 w-3" />
                                    {ref.createdAt?.toDate ? ref.createdAt.toDate().toLocaleString('ko-KR') : "방금 전"}
                                </div>
                                <div className="flex items-center gap-1">
                                    글자 수: {ref.wordCount}
                                </div>
                            </div>
                            <CardContent className="pt-4">
                                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                    {ref.content}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
