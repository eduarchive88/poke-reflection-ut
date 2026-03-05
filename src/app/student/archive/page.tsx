"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Archive, Calendar, MessageSquare, ChevronLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const dynamic = 'force-dynamic';

export default function ArchivePage() {
    const router = useRouter();

    interface ReflectionItem {
        id: string;
        content: string;
        wordCount: number;
        participationRating?: number;
        rating?: number;
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
                where("studentId", "==", studentId)
            );
            const snapshots = await getDocs(q);
            const list: ReflectionItem[] = [];
            snapshots.forEach(doc => list.push({ id: doc.id, ...doc.data() } as ReflectionItem));

            // 인덱스 에러 방지를 위해 클라이언트에서 정렬
            list.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());

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
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/student")}
                        className="rounded-full hover:bg-slate-800"
                    >
                        <ChevronLeft className="h-6 w-6 text-slate-400 hover:text-white" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-500/30">
                            <Archive className="h-6 w-6 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black italic tracking-tighter pokemon-gradient-text">기록 보관함</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Reflection Archive</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-slate-900/50 px-4 py-1.5 rounded-full border border-slate-800 flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase">총 기록</span>
                        <span className="text-sm font-black text-white">{reflections.length}개</span>
                    </div>
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
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Sparkles
                                                key={star}
                                                className={`h-3 w-3 ${star <= (ref.participationRating || ref.rating || 0) ? 'text-amber-400 fill-amber-400 drop-shadow-[1px_1px_0px_black]' : 'text-slate-300 fill-slate-300'}`}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        글자 수: {ref.wordCount}
                                    </div>
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
            )
            }
        </div >
    );
}
