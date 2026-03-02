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
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <div>
                    <h2 className="text-3xl font-black tracking-tight">통합 데이터 로그</h2>
                    <p className="text-muted-foreground mt-1">{className} 학급의 모든 활동 기록을 관리합니다.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">누적 성찰 기록</CardTitle>
                        <MessageSquare className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.reflections}건</div>
                        <p className="text-xs text-muted-foreground mt-1">학생들이 작성한 모든 성찰 일지</p>
                    </CardContent>
                </Card>
                <Card className="border-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">누적 배틀 결과</CardTitle>
                        <Swords className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.battles}건</div>
                        <p className="text-xs text-muted-foreground mt-1">스타디움에서 진행된 모든 경기 결과</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-2 border-primary/20 bg-primary/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-green-600" />
                        엑셀 추출 서비스
                    </CardTitle>
                    <CardDescription>
                        성찰 일지와 배틀 결과를 시트별로 구분하여 하나의 엑셀 파일로 생성합니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center py-12 text-center">
                    <div className="bg-white p-6 rounded-full shadow-sm border mb-6">
                        <History className="h-12 w-12 text-blue-500 animate-pulse" />
                    </div>
                    <div className="max-w-sm space-y-4">
                        <h3 className="text-xl font-bold">기록 요약 다운로드</h3>
                        <p className="text-sm text-muted-foreground">
                            모든 학생들의 소중한 기록을 안전하게 보관하세요. <br />
                            학기말 상담이나 평가 자료로 활용하기 좋습니다.
                        </p>
                        <Button
                            className="w-full h-12 text-lg font-bold gap-2"
                            disabled={loading}
                            onClick={downloadAllLogs}
                        >
                            {loading ? "데이터 추출 중..." : (
                                <>
                                    <Download className="h-5 w-5" /> 통합 로그 다운로드 (Excel)
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <footer className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground space-y-2">
                <p>만든 사람: 경기도 지구과학 교사 뀨짱</p>
                <div className="flex justify-center gap-4">
                    <a href="https://open.kakao.com/o/s7hVU65h" target="_blank" rel="noopener noreferrer" className="hover:text-primary underline transition-colors">
                        문의: 카카오톡 오픈채팅
                    </a>
                    <a href="https://eduarchive.tistory.com/" target="_blank" rel="noopener noreferrer" className="hover:text-primary underline transition-colors">
                        블로그: 뀨짱쌤의 교육자료 아카이브
                    </a>
                </div>
            </footer>
        </div>
    );
}

export default function LogsPage() {
    return (
        <Suspense fallback={<div className="p-12 text-center">로딩 중...</div>}>
            <LogsContent />
        </Suspense>
    );
}
