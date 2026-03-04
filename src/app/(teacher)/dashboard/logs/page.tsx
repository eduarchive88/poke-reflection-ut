"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, doc, getDoc, limit } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronLeft, Download, FileSpreadsheet, History, Swords, MessageSquare, Star, ArrowUp, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTeacherClass } from "@/contexts/TeacherClassContext";
import * as XLSX from "xlsx";

// 로그 항목 타입 정의
interface LogEntry {
    id: string;
    type: 'battle' | 'acquisition' | 'levelup' | 'reflection';
    date: Date;
    description: string;
    studentName: string;
    detail?: string;
}

function LogsContent() {
    const router = useRouter();
    const { classes, selectedClassId } = useTeacherClass();

    const [className, setClassName] = useState("");
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [filterType, setFilterType] = useState<string>("all");
    const [stats, setStats] = useState({
        reflections: 0,
        battles: 0,
        acquisitions: 0,
        levelups: 0
    });

    useEffect(() => {
        if (!selectedClassId) {
            router.push("/dashboard");
            return;
        }
        fetchAllLogs();
    }, [selectedClassId]);

    // 모든 로그를 통합 가져오기
    const fetchAllLogs = async () => {
        if (!selectedClassId) return;
        setLoading(true);
        try {
            // 학급명 가져오기
            const classDoc = await getDoc(doc(db, "classes", selectedClassId));
            if (classDoc.exists()) {
                setClassName(classDoc.data().className);
            }

            // 학생 맵 구성
            const studentQ = query(collection(db, "students"), where("classId", "==", selectedClassId));
            const studentSnap = await getDocs(studentQ);
            const studentMap: Record<string, string> = {};
            studentSnap.docs.forEach(d => {
                studentMap[d.id] = d.data().name;
            });

            const allLogs: LogEntry[] = [];

            // 1. 성찰 기록
            const refQ = query(collection(db, "reflections"), where("classId", "==", selectedClassId));
            const refSnap = await getDocs(refQ);
            refSnap.docs.forEach(d => {
                const data = d.data();
                const studentName = studentMap[data.studentId] || data.studentName || "알 수 없음";
                let date = new Date();
                try {
                    if (data.createdAt?.toDate) date = data.createdAt.toDate();
                    else if (data.createdAt?.seconds) date = new Date(data.createdAt.seconds * 1000);
                } catch (e) { /* ignore */ }
                allLogs.push({
                    id: d.id,
                    type: 'reflection',
                    date,
                    studentName,
                    description: `${studentName} 학생이 성찰 일기를 작성했습니다.`,
                    detail: data.content?.substring(0, 50) + (data.content?.length > 50 ? '...' : '')
                });
            });

            // 2. 배틀 로그
            const battleQ = query(collection(db, "battle_logs"), where("classId", "==", selectedClassId));
            const battleSnap = await getDocs(battleQ);
            battleSnap.docs.forEach(d => {
                const data = d.data();
                let date = new Date();
                try {
                    if (data.createdAt?.toDate) date = data.createdAt.toDate();
                    else if (data.createdAt?.seconds) date = new Date(data.createdAt.seconds * 1000);
                } catch (e) { /* ignore */ }
                allLogs.push({
                    id: d.id,
                    type: 'battle',
                    date,
                    studentName: data.winnerName || "알 수 없음",
                    description: `⚔️ ${data.winnerName}(${data.winnerPoke}) vs ${data.loserName}(${data.loserPoke})`,
                    detail: `승자: ${data.winnerName} | 타입: ${data.battleType || '친선경기'}`
                });
            });

            // 3. 포켓몬 획득 기록 (pokemon_inventory에서 추출)
            const invQ = query(collection(db, "pokemon_inventory"), where("studentId", "in",
                Object.keys(studentMap).length > 0 ? Object.keys(studentMap).slice(0, 10) : ["__none__"]
            ));
            let invSnap;
            try {
                invSnap = await getDocs(invQ);
                invSnap.docs.forEach(d => {
                    const data = d.data();
                    const studentName = studentMap[data.studentId] || "알 수 없음";
                    let date = new Date();
                    try {
                        if (data.createdAt?.toDate) date = data.createdAt.toDate();
                        else if (data.createdAt?.seconds) date = new Date(data.createdAt.seconds * 1000);
                    } catch (e) { /* ignore */ }

                    allLogs.push({
                        id: d.id + '_acq',
                        type: 'acquisition',
                        date,
                        studentName,
                        description: `${studentName} 학생이 ${data.koName || data.name}(을)를 획득했습니다.`,
                        detail: `Lv.${data.level} | 타입: ${(data.types || []).join(', ')}`
                    });

                    // 레벨이 1보다 높으면 레벨업 기록 추가
                    if (data.level > 1) {
                        allLogs.push({
                            id: d.id + '_lvl',
                            type: 'levelup',
                            date,
                            studentName,
                            description: `${studentName} 학생의 ${data.koName || data.name}(이)가 Lv.${data.level}로 성장했습니다.`,
                            detail: `HP: ${data.stats?.hp || '?'} | 공격: ${data.stats?.attack || '?'} | 방어: ${data.stats?.defense || '?'}`
                        });
                    }
                });
            } catch (e) {
                // 10개 이상인 경우 개별 쿼리
                for (const sid of Object.keys(studentMap)) {
                    try {
                        const singleQ = query(collection(db, "pokemon_inventory"), where("studentId", "==", sid));
                        const singleSnap = await getDocs(singleQ);
                        singleSnap.docs.forEach(d => {
                            const data = d.data();
                            const studentName = studentMap[data.studentId] || "알 수 없음";
                            let date = new Date();
                            try {
                                if (data.createdAt?.toDate) date = data.createdAt.toDate();
                                else if (data.createdAt?.seconds) date = new Date(data.createdAt.seconds * 1000);
                            } catch (e) { /* ignore */ }

                            allLogs.push({
                                id: d.id + '_acq',
                                type: 'acquisition',
                                date,
                                studentName,
                                description: `${studentName} 학생이 ${data.koName || data.name}(을)를 획득했습니다.`,
                                detail: `Lv.${data.level} | 타입: ${(data.types || []).join(', ')}`
                            });

                            if (data.level > 1) {
                                allLogs.push({
                                    id: d.id + '_lvl',
                                    type: 'levelup',
                                    date,
                                    studentName,
                                    description: `${studentName} 학생의 ${data.koName || data.name}(이)가 Lv.${data.level}로 성장했습니다.`,
                                    detail: `HP: ${data.stats?.hp || '?'} | 공격: ${data.stats?.attack || '?'} | 방어: ${data.stats?.defense || '?'}`
                                });
                            }
                        });
                    } catch (e2) { /* ignore */ }
                }
            }

            // 시간순 정렬 (최신 먼저)
            allLogs.sort((a, b) => b.date.getTime() - a.date.getTime());
            setLogs(allLogs);

            // 통계 집계
            setStats({
                reflections: allLogs.filter(l => l.type === 'reflection').length,
                battles: allLogs.filter(l => l.type === 'battle').length,
                acquisitions: allLogs.filter(l => l.type === 'acquisition').length,
                levelups: allLogs.filter(l => l.type === 'levelup').length
            });
        } catch (error) {
            console.error(error);
            toast.error("로그 데이터를 불러오는 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    // 필터링된 로그
    const filteredLogs = filterType === "all" ? logs : logs.filter(l => l.type === filterType);

    // 로그 타입별 아이콘/색상
    const getLogStyle = (type: string) => {
        switch (type) {
            case 'battle': return { icon: '⚔️', bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700', label: '배틀' };
            case 'acquisition': return { icon: '🎁', bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700', label: '획득' };
            case 'levelup': return { icon: '⬆️', bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-700', label: '레벨업' };
            case 'reflection': return { icon: '✏️', bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-700', label: '성찰' };
            default: return { icon: '📋', bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-700', label: '기타' };
        }
    };

    // 엑셀 다운로드
    const downloadAllLogs = () => {
        if (filteredLogs.length === 0) {
            toast.error("다운로드할 로그가 없습니다.");
            return;
        }
        const data = filteredLogs.map(l => ({
            "종류": getLogStyle(l.type).label,
            "일시": l.date.toLocaleString(),
            "학생": l.studentName,
            "내용": l.description,
            "상세": l.detail || ""
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "로그현황");
        XLSX.writeFile(wb, `${className}_로그현황_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("로그 데이터 다운로드 완료!");
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-12">
            {/* 헤더 */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push("/dashboard")}
                    className="retro-btn bg-slate-800 hover:bg-slate-700 p-2"
                >
                    <ChevronLeft className="h-6 w-6 text-white" />
                </Button>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <img src="https://play.pokemonshowdown.com/sprites/itemicons/journal.png" alt="Log" className="w-8 h-8 pixelated" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-3xl font-black tracking-tighter text-black uppercase" style={{ fontFamily: '"NeoDunggeunmo", sans-serif', textShadow: '2px 2px 0px white' }}>{className || "학급"} 로그 현황</h2>
                        <p className="text-slate-800 font-medium tracking-tight text-sm bg-white/50 px-2 py-1 rounded inline-block border-2 border-black border-dashed">학생들의 모든 활동 기록을 한눈에 확인합니다.</p>
                    </div>
                </div>
            </div>

            {/* 통계 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: '성찰', count: stats.reflections, icon: '✏️', color: 'bg-amber-100 border-amber-300' },
                    { label: '배틀', count: stats.battles, icon: '⚔️', color: 'bg-red-100 border-red-300' },
                    { label: '획득', count: stats.acquisitions, icon: '🎁', color: 'bg-blue-100 border-blue-300' },
                    { label: '레벨업', count: stats.levelups, icon: '⬆️', color: 'bg-green-100 border-green-300' },
                ].map(item => (
                    <Card key={item.label} className={`retro-box ${item.color} overflow-hidden`}>
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-black uppercase" style={{ fontFamily: '"NeoDunggeunmo", sans-serif' }}>{item.label}</p>
                                <p className="text-2xl font-black text-black">{item.count}건</p>
                            </div>
                            <span className="text-2xl">{item.icon}</span>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* 필터 + 다운로드 */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-black" />
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-40 retro-box bg-white font-bold h-10 text-black">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">전체 보기</SelectItem>
                            <SelectItem value="reflection">✏️ 성찰</SelectItem>
                            <SelectItem value="battle">⚔️ 배틀</SelectItem>
                            <SelectItem value="acquisition">🎁 획득</SelectItem>
                            <SelectItem value="levelup">⬆️ 레벨업</SelectItem>
                        </SelectContent>
                    </Select>
                    <span className="text-xs font-bold text-slate-600">{filteredLogs.length}건 표시</span>
                </div>
                <Button
                    onClick={downloadAllLogs}
                    className="retro-btn bg-emerald-400 hover:bg-emerald-300 text-black font-black flex items-center gap-2 px-6 h-10"
                >
                    <Download className="h-4 w-4" />
                    엑셀 다운로드
                </Button>
            </div>

            {/* 로그 목록 */}
            <Card className="retro-box overflow-hidden bg-white">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="py-20 text-center text-black font-black flex flex-col items-center justify-center gap-4">
                            <img src="https://play.pokemonshowdown.com/sprites/itemicons/town-map.png" alt="Loading" className="w-12 h-12 pixelated animate-bounce" />
                            <p style={{ fontFamily: '"NeoDunggeunmo", sans-serif' }}>로그를 불러오는 중...</p>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="py-20 text-center text-black font-bold border-4 border-dashed border-slate-300 rounded-xl bg-white m-6 flex flex-col items-center justify-center gap-4">
                            <img src="https://play.pokemonshowdown.com/sprites/itemicons/poke-ball.png" alt="Empty" className="w-10 h-10 pixelated opacity-50 grayscale" />
                            기록된 로그가 없습니다.
                        </div>
                    ) : (
                        <div className="divide-y-2 divide-slate-200">
                            {filteredLogs.slice(0, 100).map((log) => {
                                const style = getLogStyle(log.type);
                                return (
                                    <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                                        {/* 타입 뱃지 */}
                                        <div className={`min-w-[52px] text-center px-2 py-1 text-[10px] font-black border-2 border-black ${style.bg} ${style.text}`} style={{ fontFamily: '"NeoDunggeunmo", sans-serif' }}>
                                            {style.icon} {style.label}
                                        </div>
                                        {/* 내용 */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black text-black truncate">{log.description}</p>
                                            {log.detail && (
                                                <p className="text-xs text-slate-600 font-medium mt-0.5 truncate">{log.detail}</p>
                                            )}
                                        </div>
                                        {/* 날짜 */}
                                        <div className="text-[10px] font-bold text-slate-400 whitespace-nowrap text-right min-w-[80px]">
                                            {log.date.toLocaleDateString()}<br />
                                            {log.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredLogs.length > 100 && (
                                <div className="py-3 text-center text-xs font-bold text-slate-500 bg-slate-50">
                                    최근 100건만 표시됩니다. 전체 데이터는 엑셀로 다운로드하세요.
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function LogsPage() {
    return (
        <Suspense fallback={<div className="p-12 text-center text-black font-bold animate-pulse" style={{ fontFamily: '"NeoDunggeunmo", sans-serif' }}>로딩 중...</div>}>
            <LogsContent />
        </Suspense>
    );
}
