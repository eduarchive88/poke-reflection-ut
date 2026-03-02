"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronLeft, Download, FileSpreadsheet, History, Swords, MessageSquare } from "lucide-react";
import * as XLSX from "xlsx";

function LogsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const classId = searchParams.get("classId");

    const [className, setClassName] = useState("");
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({
        reflections: 0,
        battles: 0
    });

    useEffect(() => {
        if (!classId) {
            router.push("/dashboard");
            return;
        }
        fetchClassInfo();
    }, [classId]);

    const fetchClassInfo = async () => {
        if (!classId) return;
        try {
            const classDoc = await getDoc(doc(db, "classes", classId));
            if (classDoc.exists()) {
                setClassName(classDoc.data().className);
            }

            // 대략적인 데이터 개수 파악
            const refQ = query(collection(db, "reflections"), where("classId", "==", classId));
            const battleQ = query(collection(db, "battle_logs"), where("classId", "==", classId));

            const [refSnap, battleSnap] = await Promise.all([getDocs(refQ), getDocs(battleQ)]);
            setStats({
                reflections: refSnap.size,
                battles: battleSnap.size
            });
        } catch (error) {
            console.error(error);
        }
    };

    const downloadAllLogs = async () => {
        if (!classId) return;
        setLoading(true);
        try {
            toast.loading("데이터를 추출하는 중입니다...");

            // 1. 성찰 일지 가져오기
            const refQ = query(
                collection(db, "reflections"),
                where("classId", "==", classId),
                orderBy("createdAt", "desc")
            );
            const refSnap = await getDocs(refQ);
            const refData = refSnap.docs.map(doc => {
                const data = doc.data();
                return {
                    "작성일시": data.createdAt?.toDate().toLocaleString() || "",
                    "학생ID": data.studentId,
                    "오늘의 성찰": data.content,
                    "번호": data.studentNumber || "",
                    "이름": data.studentName || ""
                };
            });

            // 2. 배틀 로그 가져오기
            const battleQ = query(
                collection(db, "battle_logs"),
                where("classId", "==", classId),
                orderBy("createdAt", "desc")
            );
            const battleSnap = await getDocs(battleQ);
            const battleData = battleSnap.docs.map(doc => {
                const data = doc.data();
                return {
                    "경기일시": data.createdAt?.toDate().toLocaleString() || "",
                    "승자(학생)": data.winnerName,
                    "승자 포켓몬": data.winnerPoke,
                    "패자": data.loserName,
                    "패자 포켓몬": data.loserPoke
                };
            });

            // 3. 엑셀 생성
            const wb = XLSX.utils.book_new();

            const refWs = XLSX.utils.json_to_sheet(refData);
            XLSX.utils.book_append_sheet(wb, refWs, "성찰일지_기록");

            const battleWs = XLSX.utils.json_to_sheet(battleData);
            XLSX.utils.book_append_sheet(wb, battleWs, "배틀_결과_기록");

            XLSX.writeFile(wb, `${className}_통합로그_${new Date().toISOString().split('T')[0]}.xlsx`);

            toast.dismiss();
            toast.success("통합 로그 다운로드가 완료되었습니다.");
        } catch (error) {
            console.error(error);
            toast.dismiss();
            toast.error("데이터 추출 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10 pb-12">
            <div className="flex items-center gap-6">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push("/dashboard")}
                    className="h-12 w-12 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-700/60 text-slate-300 transition-all hover:-translate-x-1"
                >
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <div className="space-y-1">
                    <h2 className="text-4xl font-black tracking-tighter gold-gradient-text">데이터 매트릭스 로그</h2>
                    <p className="text-slate-400 font-medium tracking-tight">{className} 학급의 모든 성찰 및 전투 기록을 아카이브합니다.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="premium-card overflow-hidden border-slate-800/80 rounded-3xl group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <CardTitle className="text-xs font-black text-slate-500 uppercase tracking-widest">누적 성찰 기록</CardTitle>
                        <MessageSquare className="h-5 w-5 text-amber-500 group-hover:scale-110 transition-transform" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black gold-gradient-text">{stats.reflections.toLocaleString()} <span className="text-sm font-medium text-slate-500 ml-1">LOGS</span></div>
                        <p className="text-[11px] font-bold text-slate-600 uppercase tracking-tighter mt-2">DATA ARCHIVE COMPLETED</p>
                    </CardContent>
                </Card>
                <Card className="premium-card overflow-hidden border-slate-800/80 rounded-3xl group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <CardTitle className="text-xs font-black text-slate-500 uppercase tracking-widest">누적 배틀 데이터</CardTitle>
                        <Swords className="h-5 w-5 text-red-500 group-hover:scale-110 transition-transform" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-slate-100">{stats.battles.toLocaleString()} <span className="text-sm font-medium text-slate-500 ml-1">MATCHES</span></div>
                        <p className="text-[11px] font-bold text-slate-600 uppercase tracking-tighter mt-2">REAL-TIME BATTLE SYNC ACTIVE</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="premium-card overflow-hidden border-slate-800/80 rounded-[2.5rem] bg-gradient-to-br from-slate-900/60 to-slate-950/80">
                <CardHeader className="p-10 pb-0">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                            <FileSpreadsheet className="h-6 w-6 text-emerald-500" />
                        </div>
                        <CardTitle className="text-2xl font-black text-slate-100">엑셀 통합 리포트 추출</CardTitle>
                    </div>
                    <CardDescription className="text-slate-400 font-medium text-base">
                        모든 성찰 일지와 배틀 결과를 시트별로 구분하여 하나의 프리미엄 데이터 파일로 생성합니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center py-16 text-center">
                    <div className="relative mb-10">
                        <div className="absolute inset-0 bg-amber-500/20 blur-[60px] rounded-full animate-pulse" />
                        <div className="relative bg-slate-900/80 p-10 rounded-[2rem] border border-slate-700/50 shadow-2xl backdrop-blur-xl group hover:border-amber-500/50 transition-colors">
                            <History className="h-20 w-20 text-amber-500 group-hover:rotate-12 transition-transform duration-500" />
                        </div>
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-[10px] font-black px-3 py-1 rounded-full shadow-lg border-2 border-slate-950">
                            SYSTEM READY
                        </div>
                    </div>
                    <div className="max-w-md space-y-6">
                        <p className="text-slate-400 font-medium leading-relaxed">
                            학생들의 소중한 성장 기록과 대전 데이터를 안전하게 백업하세요. <br />
                            상담용 근거 자료 및 학기말 생활기록부 작성에 최적화된 포맷입니다.
                        </p>
                        <Button
                            className="w-full h-16 rounded-[1.25rem] text-xl font-black bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xl shadow-amber-500/20 transition-all active:scale-95 gap-3"
                            disabled={loading}
                            onClick={downloadAllLogs}
                        >
                            {loading ? "데이터 암호화 및 추출 중..." : (
                                <>
                                    <Download className="h-6 w-6" /> 통합 로그 리포트 다운로드
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function LogsPage() {
    return (
        <Suspense fallback={<div className="p-12 text-center text-slate-500 font-bold animate-pulse">로딩 중...</div>}>
            <LogsContent />
        </Suspense>
    );
}
