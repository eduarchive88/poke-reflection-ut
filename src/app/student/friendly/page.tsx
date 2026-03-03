"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
    collection, query, where, getDocs, doc, getDoc,
    addDoc, updateDoc, onSnapshot, serverTimestamp,
    deleteDoc, increment
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, Swords, User, Shield, Zap, Heart, RefreshCcw, Send, Check, X, ChevronLeft, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PokemonImage } from "@/components/PokemonImage";

interface Student {
    id: string;
    name: string;
}

interface PokemonData {
    id: string;
    studentId: string;
    pokemonId: number;
    name: string;
    koName?: string;
    image: string;
    level: number;
    types: string[];
    stats?: {
        hp: number;
        attack: number;
        defense: number;
    };
    retiredUntil?: any;
}

interface BattleRequest {
    id: string;
    fromId: string;
    fromName: string;
    toId: string;
    toName: string;
    status: 'pending' | 'accepted' | 'declined' | 'battling' | 'finished';
    fromPokes?: PokemonData[];
    toPokes?: PokemonData[];
    fromReady?: boolean;
    toReady?: boolean;
    winnerId?: string;
    createdAt: any;
}

// 타입별 색상 매핑
const TYPE_COLORS: Record<string, string> = {
    fire: "bg-orange-500", water: "bg-blue-500", grass: "bg-green-500",
    electric: "bg-yellow-400", normal: "bg-gray-400", bug: "bg-lime-500",
    poison: "bg-purple-500", ground: "bg-amber-600", flying: "bg-indigo-300",
    psychic: "bg-pink-500", rock: "bg-amber-700", ice: "bg-cyan-300",
    ghost: "bg-purple-700", dragon: "bg-violet-600", steel: "bg-slate-400",
    dark: "bg-gray-700", fairy: "bg-pink-300", fighting: "bg-red-700"
};

// 상성 데이터
const TYPE_CHART: Record<string, Record<string, number>> = {
    fire: { grass: 2, ice: 2, bug: 2, steel: 2, fire: 0.5, water: 0.5, rock: 0.5, dragon: 0.5 },
    water: { fire: 2, ground: 2, rock: 2, water: 0.5, grass: 0.5, dragon: 0.5 },
    grass: { water: 2, ground: 2, rock: 2, grass: 0.5, fire: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5 },
    electric: { water: 2, flying: 2, electric: 0.5, grass: 0.5, dragon: 0.5, ground: 0 },
    normal: { rock: 0.5, steel: 0.5, ghost: 0 },
    bug: { grass: 2, psychic: 2, dark: 2, fire: 0.5, fighting: 0.5, poison: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5 },
    poison: { grass: 2, fairy: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
    ground: { fire: 2, electric: 2, poison: 2, rock: 2, steel: 2, grass: 0.5, bug: 0.5, flying: 0 },
    flying: { grass: 2, fighting: 2, bug: 2, electric: 0.5, rock: 0.5, steel: 0.5 },
    psychic: { fighting: 2, poison: 2, psychic: 0.5, steel: 0.5, dark: 0 },
    rock: { fire: 2, ice: 2, flying: 2, bug: 2, fighting: 0.5, ground: 0.5, steel: 0.5 },
    ice: { grass: 2, ground: 2, flying: 2, dragon: 2, fire: 0.5, water: 0.5, ice: 0.5, steel: 0.5 },
    ghost: { psychic: 2, ghost: 2, normal: 0, dark: 0.5 },
    dragon: { dragon: 2, steel: 0.5, fairy: 0 },
    steel: { ice: 2, rock: 2, fairy: 2, fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5 },
    dark: { psychic: 2, ghost: 2, fighting: 0.5, dark: 0.5, fairy: 0.5 },
    fairy: { fighting: 2, dragon: 2, dark: 2, fire: 0.5, poison: 0.5, steel: 0.5 },
    fighting: { normal: 2, ice: 2, rock: 2, dark: 2, steel: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, fairy: 0.5, ghost: 0 }
};

export default function FriendlyMatchPage() {
    const router = useRouter();
    const [session, setSession] = useState<any>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [myPokemon, setMyPokemon] = useState<PokemonData[]>([]);
    const [loading, setLoading] = useState(true);

    const [activeRequest, setActiveRequest] = useState<BattleRequest | null>(null);
    const [incomingRequest, setIncomingRequest] = useState<BattleRequest | null>(null);

    // UI State
    const [gameState, setGameState] = useState<"lobby" | "select" | "waiting" | "battle" | "result">("lobby");
    const [selectedTeam, setSelectedTeam] = useState<PokemonData[]>([]);
    const [opponentTeam, setOpponentTeam] = useState<PokemonData[]>([]);
    const [battleLog, setBattleLog] = useState<string[]>([]);
    const [winner, setWinner] = useState<"me" | "opponent" | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [opponentReady, setOpponentReady] = useState(false);

    // 배틀 시작 중복 방지 ref
    const battleStartedRef = useRef(false);
    // 리스너 해제 ref
    const readyListenerRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        const sessionStr = localStorage.getItem("poke_student_session");
        if (!sessionStr) {
            router.push("/login");
            return;
        }
        const sessionData = JSON.parse(sessionStr);
        setSession(sessionData);

        fetchInitialData(sessionData.studentId, sessionData.classId);
        const unsubscribe = listenForRequests(sessionData.studentId);

        return () => {
            if (unsubscribe) unsubscribe();
            if (readyListenerRef.current) readyListenerRef.current();
        };
    }, [router]);

    // 초기 데이터 로드
    const fetchInitialData = async (studentId: string, classId: string) => {
        setLoading(true);
        try {
            // 같은 반 학생 목록 (나 제외)
            const sQ = query(collection(db, "students"), where("classId", "==", classId));
            const sSnap = await getDocs(sQ);
            const sList: Student[] = [];
            sSnap.forEach(d => {
                if (d.id !== studentId) {
                    sList.push({ id: d.id, name: d.data().name });
                }
            });
            setStudents(sList);

            // 내 포켓몬 (리타이어 안 된 것)
            const now = new Date();
            const pQ = query(collection(db, "pokemon_inventory"), where("studentId", "==", studentId));
            const pSnap = await getDocs(pQ);
            const pList: PokemonData[] = [];
            pSnap.forEach(d => {
                const data = d.data();
                let retiredUntilDate = null;
                if (data.retiredUntil) {
                    try {
                        if (typeof data.retiredUntil.toDate === 'function') retiredUntilDate = data.retiredUntil.toDate();
                        else if (data.retiredUntil instanceof Date) retiredUntilDate = data.retiredUntil;
                        else if (data.retiredUntil.seconds) retiredUntilDate = new Date(data.retiredUntil.seconds * 1000);
                    } catch (e) { /* ignore */ }
                }
                if (!retiredUntilDate || retiredUntilDate < now) {
                    pList.push({ id: d.id, ...data } as PokemonData);
                }
            });
            setMyPokemon(pList);
        } catch (error) {
            console.error("fetchInitialData Error:", error);
            toast.error("데이터를 불러오는 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    // 실시간 대결 요청 리스너
    const listenForRequests = (studentId: string) => {
        // 들어오는 요청 감지
        const qTo = query(
            collection(db, "battle_requests"),
            where("toId", "==", studentId),
            where("status", "in", ["pending", "accepted", "battling"])
        );
        const unsubscribeTo = onSnapshot(qTo, (snapshot) => {
            if (!snapshot.empty) {
                const req = snapshot.docs[0];
                const data = { id: req.id, ...req.data() } as BattleRequest;
                setIncomingRequest(data);

                // 수락된 상태면 선택 화면으로
                if (data.status === "accepted" || data.status === "battling") {
                    setGameState(prev => prev === "lobby" ? "select" : prev);
                }
            } else {
                setIncomingRequest(null);
            }
        });

        // 내가 보낸 요청 상태 감지
        const qFrom = query(
            collection(db, "battle_requests"),
            where("fromId", "==", studentId),
            where("status", "in", ["pending", "accepted", "battling"])
        );
        const unsubscribeFrom = onSnapshot(qFrom, (snapshot) => {
            if (!snapshot.empty) {
                const req = snapshot.docs[0];
                const data = { id: req.id, ...req.data() } as BattleRequest;
                setActiveRequest(data);

                if (data.status === "accepted") {
                    toast.success("상대방이 대결을 수락했습니다! 포켓몬을 선택하세요!");
                    setGameState(prev => prev === "lobby" ? "select" : prev);
                } else if (data.status === "declined") {
                    toast.error("상대방이 대결을 거절했습니다.");
                    deleteDoc(doc(db, "battle_requests", data.id)).catch(() => { });
                    setActiveRequest(null);
                }
            } else {
                // snapshot empty인 경우 (요청이 삭제됨)
                setActiveRequest(null);
            }
        });

        return () => {
            unsubscribeTo();
            unsubscribeFrom();
        };
    };

    // 대결 신청 보내기
    const sendRequest = async (target: Student) => {
        if (activeRequest) {
            toast.error("이미 진행 중인 대결 신청이 있습니다.");
            return;
        }
        if (!session?.studentId) {
            toast.error("세션 정보가 올바르지 않습니다.");
            return;
        }
        try {
            const fromName = session.studentInfo?.name || session.name || "익명 학생";
            await addDoc(collection(db, "battle_requests"), {
                fromId: session.studentId,
                fromName: fromName,
                toId: target.id,
                toName: target.name,  // ← 중요: 상대방 이름도 저장
                status: 'pending',
                fromReady: false,
                toReady: false,
                createdAt: serverTimestamp()
            });
            toast.success(`${target.name}님에게 대결을 신청했습니다! ⚔️`);
        } catch (e) {
            console.error("sendRequest Error:", e);
            toast.error("대결 신청 실패");
        }
    };

    // 신청 취소
    const cancelRequest = async () => {
        if (!activeRequest) return;
        try {
            await deleteDoc(doc(db, "battle_requests", activeRequest.id));
            setActiveRequest(null);
            toast.info("대결 신청을 취소했습니다.");
        } catch (e) {
            toast.error("취소 실패");
        }
    };

    // 대결 수락
    const acceptRequest = async () => {
        if (!incomingRequest) return;
        try {
            await updateDoc(doc(db, "battle_requests", incomingRequest.id), {
                status: 'accepted',
                toName: session?.studentInfo?.name || session?.name || "익명 학생"
            });
            setGameState("select");
            toast.success("대결을 수락했습니다! 포켓몬을 선택하세요!");
        } catch (e) {
            toast.error("수락 실패");
        }
    };

    // 대결 거절
    const declineRequest = async () => {
        if (!incomingRequest) return;
        try {
            await updateDoc(doc(db, "battle_requests", incomingRequest.id), {
                status: 'declined'
            });
            setIncomingRequest(null);
        } catch (e) {
            toast.error("거절 실패");
        }
    };

    // 포켓몬 선택 토글
    const togglePokeSelection = (poke: PokemonData) => {
        if (isReady) return; // 준비 완료 후에는 선택 변경 불가
        if (selectedTeam.find(p => p.id === poke.id)) {
            setSelectedTeam(prev => prev.filter(p => p.id !== poke.id));
        } else {
            if (selectedTeam.length >= 3) {
                toast.error("최대 3마리까지만 선택 가능합니다.");
                return;
            }
            setSelectedTeam(prev => [...prev, poke]);
        }
    };

    // 준비 완료 버튼 클릭
    const confirmReady = async () => {
        if (selectedTeam.length === 0) {
            toast.error("최소 1마리 이상의 포켓몬을 선택해주세요.");
            return;
        }

        const reqId = activeRequest?.id || incomingRequest?.id;
        if (!reqId) {
            toast.error("대결 요청 정보를 찾을 수 없습니다.");
            return;
        }

        const isFrom = !!activeRequest; // 내가 신청자인지 여부

        try {
            // 내 포켓몬 팀 + 준비 상태를 Firestore에 저장
            const updateData: any = {};
            if (isFrom) {
                updateData.fromPokes = selectedTeam;
                updateData.fromReady = true;
            } else {
                updateData.toPokes = selectedTeam;
                updateData.toReady = true;
            }
            await updateDoc(doc(db, "battle_requests", reqId), updateData);
            setIsReady(true);
            toast.success("준비 완료! 상대방을 기다리는 중... ⏳");

            // 상대방의 준비 상태를 실시간으로 감지
            if (readyListenerRef.current) readyListenerRef.current();

            const unsub = onSnapshot(doc(db, "battle_requests", reqId), (snapshot) => {
                const data = snapshot.data();
                if (!data) return;

                const bothReady = data.fromReady && data.toReady && data.fromPokes && data.toPokes;

                // 상대방 준비 상태 업데이트
                if (isFrom) {
                    setOpponentReady(!!data.toReady);
                } else {
                    setOpponentReady(!!data.fromReady);
                }

                // 양쪽 모두 준비 완료 → 배틀 시작!
                if (bothReady && !battleStartedRef.current) {
                    battleStartedRef.current = true;

                    // 상태를 battling으로 변경
                    updateDoc(doc(db, "battle_requests", reqId), { status: 'battling' }).catch(() => { });

                    const myTeamData = isFrom ? data.fromPokes : data.toPokes;
                    const oppTeamData = isFrom ? data.toPokes : data.fromPokes;

                    setSelectedTeam(myTeamData);
                    setOpponentTeam(oppTeamData);
                    setGameState("battle");
                    unsub();
                    readyListenerRef.current = null;

                    // 약간의 딜레이 후 배틀 시작
                    setTimeout(() => run3v3Battle(myTeamData, oppTeamData), 500);
                }
            });

            readyListenerRef.current = unsub;
        } catch (e) {
            console.error("confirmReady Error:", e);
            toast.error("준비 완료 처리 실패");
        }
    };

    // 대결 종료/나가기
    const quitBattle = async () => {
        const reqId = activeRequest?.id || incomingRequest?.id;
        if (reqId) {
            try {
                await deleteDoc(doc(db, "battle_requests", reqId));
            } catch (e) { /* ignore */ }
        }
        // 모든 상태 초기화
        setActiveRequest(null);
        setIncomingRequest(null);
        setGameState("lobby");
        setSelectedTeam([]);
        setOpponentTeam([]);
        setIsReady(false);
        setOpponentReady(false);
        battleStartedRef.current = false;
        if (readyListenerRef.current) {
            readyListenerRef.current();
            readyListenerRef.current = null;
        }
        toast.info("대결을 종료했습니다.");
    };

    // 상성 배율 계산
    const getEffectiveness = (moveTypes: string[], targetTypes: string[]) => {
        let multiplier = 1.0;
        for (const m of moveTypes) {
            const chart = TYPE_CHART[m] || {};
            for (const t of targetTypes) {
                multiplier *= (chart[t] !== undefined ? chart[t] : 1.0);
            }
        }
        return multiplier;
    };

    // 3v3 배틀 실행
    const run3v3Battle = (myTeam: PokemonData[], oppTeam: PokemonData[]) => {
        setBattleLog(["⚔️ 3v3 친선 경기 시작!", "양쪽 포켓몬이 입장합니다!"]);

        let myIdx = 0;
        let oppIdx = 0;
        const logs: string[] = ["🏟️ 배틀 시작!"];

        let currentMyHp = 0;
        let currentOppHp = 0;

        const nextTurn = () => {
            if (myIdx >= myTeam.length || oppIdx >= oppTeam.length) {
                const isWin = myIdx < myTeam.length;
                finish3v3Battle(isWin, myTeam, oppTeam);
                return;
            }

            const me = myTeam[myIdx];
            const opp = oppTeam[oppIdx];

            if (currentMyHp <= 0) {
                currentMyHp = (me.stats?.hp || 100) + (me.level * 2);
                logs.push(`🔵 ${me.koName || me.name} 출전!`);
            }
            if (currentOppHp <= 0) {
                currentOppHp = (opp.stats?.hp || 100) + (opp.level * 2);
                logs.push(`🔴 ${opp.koName || opp.name} 출전!`);
            }

            const myEff = getEffectiveness(me.types, opp.types);
            const oppEff = getEffectiveness(opp.types, me.types);

            const myDmg = Math.max(10, Math.floor(((me.level * 2 + (me.stats?.attack || 40) * myEff) / ((opp.stats?.defense || 40) * 0.5)) * 0.8));
            const oppDmg = Math.max(10, Math.floor(((opp.level * 2 + (opp.stats?.attack || 40) * oppEff) / ((me.stats?.defense || 40) * 0.5)) * 0.8));

            currentOppHp -= myDmg;
            logs.push(`💥 ${me.koName || me.name}의 공격! ${myDmg} 데미지!`);
            if (myEff > 1) logs.push("✨ 효과가 굉장했다!");

            if (currentOppHp > 0) {
                currentMyHp -= oppDmg;
                logs.push(`🔥 ${opp.koName || opp.name}의 반격! ${oppDmg} 데미지!`);
                if (oppEff > 1) logs.push("✨ 효과가 굉장했다!");
            }

            if (currentOppHp <= 0) {
                logs.push(`❌ ${opp.koName || opp.name} 기절!`);
                oppIdx++;
                currentOppHp = 0;
            } else if (currentMyHp <= 0) {
                logs.push(`❌ ${me.koName || me.name} 기절!`);
                myIdx++;
                currentMyHp = 0;
            }

            setBattleLog([...logs.slice(-7)]);
            setTimeout(nextTurn, 1200);
        };

        setTimeout(nextTurn, 2000);
    };

    // 3v3 배틀 결과 처리
    const finish3v3Battle = async (isWin: boolean, myTeam: PokemonData[], oppTeam: PokemonData[]) => {
        setWinner(isWin ? "me" : "opponent");
        setBattleLog(prev => [...prev, isWin ? "🏆 최종 승리!" : "😢 최종 패배..."]);

        if (!isWin) {
            const retiredTime = new Date();
            retiredTime.setHours(retiredTime.getHours() + 12);
            try {
                for (const poke of myTeam) {
                    await updateDoc(doc(db, "pokemon_inventory", poke.id), { retiredUntil: retiredTime });
                }
                toast.info("💤 패배한 포켓몬들이 12시간 동안 휴식합니다.");
            } catch (e) {
                console.error("리타이어 처리 실패:", e);
            }
        }

        setGameState("result");

        // 요청 데이터 정리
        const reqId = activeRequest?.id || incomingRequest?.id;
        if (reqId) {
            setTimeout(() => {
                deleteDoc(doc(db, "battle_requests", reqId)).catch(() => { });
            }, 10000);
        }
    };

    // 로딩 화면
    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full"
                />
                <p className="text-lg font-bold text-violet-600">친구 목록 로딩 중...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-8">
            {/* 헤더 */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push("/student")}
                    className="rounded-full hover:bg-violet-500/20"
                >
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg">
                        <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight">🤝 친선 경기</h2>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Friendly Match 3v3</p>
                    </div>
                </div>
            </div>

            {/* 들어오는 대결 신청 알림 */}
            <AnimatePresence>
                {incomingRequest && incomingRequest.status === 'pending' && gameState === "lobby" && (
                    <motion.div initial={{ opacity: 0, scale: 0.9, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }}>
                        <Card className="bg-gradient-to-r from-violet-600 to-indigo-700 text-white rounded-2xl p-5 shadow-xl border-none">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="bg-white/20 p-3 rounded-full animate-pulse">
                                        <Swords className="h-7 w-7 text-yellow-300" />
                                    </div>
                                    <div>
                                        <p className="font-black text-lg">⚔️ {incomingRequest.fromName}님의 도전!</p>
                                        <p className="text-sm text-violet-200">친선 대결을 수락하시겠습니까?</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={acceptRequest}
                                        className="bg-white text-violet-700 hover:bg-violet-50 rounded-2xl px-6 font-bold"
                                    >
                                        ✅ 수락
                                    </Button>
                                    <Button
                                        onClick={declineRequest}
                                        variant="ghost"
                                        className="text-white hover:bg-white/10 rounded-2xl font-bold"
                                    >
                                        ❌ 거절
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
                {/* === 로비 === */}
                {gameState === "lobby" && (
                    <motion.div key="lobby" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* 친구 목록 */}
                            <Card className="rounded-3xl p-6 border-2">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <User className="h-5 w-5 text-violet-500" /> 같은 반 친구 목록
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {students.length === 0 ? (
                                        <div className="py-10 text-center">
                                            <div className="text-4xl mb-3">😅</div>
                                            <p className="text-muted-foreground font-bold">같은 반 학생이 없습니다.</p>
                                        </div>
                                    ) : (
                                        students.map(s => (
                                            <div key={s.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-2xl hover:bg-secondary/50 transition-all group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-purple-500 rounded-full flex items-center justify-center font-bold text-white text-sm">
                                                        {s.name[0]}
                                                    </div>
                                                    <span className="font-black">{s.name}</span>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    className="rounded-2xl gap-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold"
                                                    disabled={!!activeRequest}
                                                    onClick={() => sendRequest(s)}
                                                >
                                                    <Send className="h-3 w-3" /> 신청
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>

                            {/* 규칙 & 대기 */}
                            <div className="space-y-4">
                                <Card className="rounded-3xl p-6 bg-slate-900 text-white border-2 border-slate-700">
                                    <h3 className="text-xl font-black mb-4">📋 전투 규칙 (3v3)</h3>
                                    <div className="space-y-3 text-sm text-slate-300">
                                        <p className="flex items-center gap-2">
                                            <Check className="h-4 w-4 text-green-400 shrink-0" />
                                            <span>최대 3마리의 포켓몬을 엔트리에 등록합니다.</span>
                                        </p>
                                        <p className="flex items-center gap-2">
                                            <Check className="h-4 w-4 text-green-400 shrink-0" />
                                            <span>첫 번째 포켓몬부터 순서대로 출전합니다.</span>
                                        </p>
                                        <p className="flex items-center gap-2">
                                            <Check className="h-4 w-4 text-green-400 shrink-0" />
                                            <span>패배 시 포켓몬 12시간 휴식이 필요합니다.</span>
                                        </p>
                                        <p className="flex items-center gap-2">
                                            <Check className="h-4 w-4 text-green-400 shrink-0" />
                                            <span>양쪽 모두 &quot;준비 완료&quot;를 누르면 배틀이 시작됩니다.</span>
                                        </p>
                                    </div>
                                </Card>

                                {/* 대기 중 표시 */}
                                {activeRequest && activeRequest.status === 'pending' && (
                                    <Card className="rounded-3xl p-6 border-2 border-violet-500/30 bg-violet-500/5">
                                        <div className="flex flex-col items-center gap-3 text-center">
                                            <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
                                            <p className="font-bold text-violet-400">상대방의 수락을 기다리는 중...</p>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={cancelRequest}
                                                className="rounded-2xl mt-2"
                                            >
                                                신청 취소
                                            </Button>
                                        </div>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* === 포켓몬 선택 화면 === */}
                {gameState === "select" && (
                    <motion.div key="select" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                        {/* 상단 바 */}
                        <Card className="rounded-2xl p-4 border-2 bg-secondary/10">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-black">⚔️ 포켓몬 선택 (3v3)</h3>
                                    <p className="text-sm text-muted-foreground font-bold mt-1">
                                        대결에 나갈 포켓몬 3마리를 순서대로 선택하세요.
                                    </p>
                                </div>
                                <div className="flex gap-3 flex-wrap">
                                    <Button variant="outline" className="rounded-2xl" onClick={quitBattle}>
                                        대결 그만두기
                                    </Button>
                                    <Button
                                        className={`rounded-2xl px-6 font-bold shadow-lg ${isReady
                                                ? 'bg-green-500 hover:bg-green-500 cursor-default'
                                                : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white'
                                            }`}
                                        onClick={isReady ? undefined : confirmReady}
                                        disabled={selectedTeam.length < 1 || isReady}
                                    >
                                        {isReady ? '✅ 준비 완료!' : `준비 완료 (${selectedTeam.length}/3)`}
                                    </Button>
                                </div>
                            </div>
                        </Card>

                        {/* 준비 상태 표시 */}
                        {isReady && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Card className="rounded-2xl p-4 border-2 border-violet-500/30 bg-violet-500/5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                            <span className="font-bold">나: 준비 완료 ✅</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {opponentReady ? (
                                                <>
                                                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                                    <span className="font-bold text-green-500">상대: 준비 완료 ✅</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Loader2 className="h-4 w-4 text-violet-500 animate-spin" />
                                                    <span className="font-bold text-muted-foreground">상대: 준비 중... ⏳</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {!opponentReady && (
                                        <p className="text-xs text-muted-foreground mt-3 text-center">
                                            양쪽 모두 준비 완료되면 자동으로 배틀이 시작됩니다!
                                        </p>
                                    )}
                                </Card>
                            </motion.div>
                        )}

                        {/* 포켓몬 그리드 */}
                        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                            {myPokemon.map(poke => {
                                const isSelected = selectedTeam.find(p => p.id === poke.id);
                                const order = selectedTeam.findIndex(p => p.id === poke.id) + 1;
                                return (
                                    <motion.div key={poke.id} whileHover={!isReady ? { scale: 1.03 } : {}} whileTap={!isReady ? { scale: 0.97 } : {}}>
                                        <Card
                                            className={`rounded-2xl p-3 relative overflow-hidden transition-all border-3 ${isReady ? 'cursor-default' : 'cursor-pointer'
                                                } ${isSelected
                                                    ? 'border-violet-500 ring-4 ring-violet-500/20 scale-[1.02]'
                                                    : 'border-transparent opacity-70 hover:opacity-100'
                                                }`}
                                            onClick={() => togglePokeSelection(poke)}
                                        >
                                            {isSelected && (
                                                <div className="absolute top-2 right-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white w-7 h-7 rounded-full flex items-center justify-center font-black text-sm shadow-lg z-20">
                                                    {order}
                                                </div>
                                            )}
                                            <div className="flex flex-col items-center">
                                                <PokemonImage
                                                    id={poke.pokemonId}
                                                    name={poke.koName || poke.name}
                                                    className="w-24 h-24"
                                                />
                                                <p className="font-bold mt-1 text-sm truncate w-full text-center">{poke.koName || poke.name}</p>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <span className="text-xs text-muted-foreground">Lv.{poke.level}</span>
                                                    {poke.types.slice(0, 2).map(t => (
                                                        <span key={t} className={`${TYPE_COLORS[t] || 'bg-gray-500'} text-white px-1.5 py-0.5 rounded-full text-[9px] font-bold`}>
                                                            {t}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* === 배틀 화면 === */}
                {gameState === "battle" && (
                    <motion.div key="battle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center space-y-10 py-6">
                        <div className="flex justify-between items-center w-full max-w-3xl px-4">
                            {/* 내 팀 */}
                            <div className="flex flex-col items-center gap-4">
                                <div className="flex gap-1 h-2.5">
                                    {[0, 1, 2].map(i => (
                                        <div key={i} className={`w-8 rounded-full ${i < selectedTeam.length ? 'bg-blue-500' : 'bg-slate-300/30'}`} />
                                    ))}
                                </div>
                                <motion.div
                                    animate={{ y: [0, -8, 0] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                >
                                    <PokemonImage
                                        id={selectedTeam[0]?.pokemonId || 0}
                                        name={selectedTeam[0]?.koName || selectedTeam[0]?.name}
                                        className="w-36 h-36 md:w-52 md:h-52"
                                    />
                                </motion.div>
                                <div className="text-center">
                                    <p className="text-lg font-black">🔵 {session?.name || "나"}</p>
                                    <p className="text-sm font-bold text-blue-400">{selectedTeam[0]?.koName || selectedTeam[0]?.name}</p>
                                </div>
                            </div>

                            <div className="text-4xl font-black text-muted-foreground/20 animate-pulse">VS</div>

                            {/* 상대방 팀 */}
                            <div className="flex flex-col items-center gap-4">
                                <div className="flex gap-1 h-2.5">
                                    {[0, 1, 2].map(i => (
                                        <div key={i} className={`w-8 rounded-full ${i < (opponentTeam?.length || 0) ? 'bg-red-500' : 'bg-slate-300/30'}`} />
                                    ))}
                                </div>
                                <motion.div
                                    animate={{ y: [0, -8, 0] }}
                                    transition={{ repeat: Infinity, duration: 1.8 }}
                                >
                                    <PokemonImage
                                        id={opponentTeam?.[0]?.pokemonId || 0}
                                        name={opponentTeam?.[0]?.koName || opponentTeam?.[0]?.name}
                                        className="w-36 h-36 md:w-52 md:h-52"
                                    />
                                </motion.div>
                                <div className="text-center">
                                    <p className="text-lg font-black">🔴 {activeRequest?.toName || incomingRequest?.fromName || "상대"}</p>
                                    <p className="text-sm font-bold text-red-400">{opponentTeam?.[0]?.koName || opponentTeam?.[0]?.name || "???"}</p>
                                </div>
                            </div>
                        </div>

                        {/* 배틀 로그 */}
                        <Card className="w-full max-w-2xl bg-slate-900 p-6 rounded-2xl border-4 border-slate-700 min-h-[180px]">
                            <div className="space-y-2 font-mono">
                                {battleLog.map((log, i) => (
                                    <motion.div
                                        key={`${i}-${log}`}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className={`text-sm ${log.includes("승리") || log.includes("WINNER") ? "text-yellow-400 font-bold" :
                                                log.includes("공격") ? "text-green-400" :
                                                    log.includes("반격") ? "text-red-400" :
                                                        log.includes("기절") ? "text-orange-400" :
                                                            "text-slate-300"
                                            }`}
                                    >
                                        {`> ${log}`}
                                    </motion.div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* === 결과 화면 === */}
                {gameState === "result" && (
                    <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center space-y-8 py-8">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", bounce: 0.5 }}
                            className={`text-6xl font-black italic ${winner === 'me' ? 'text-blue-500' : 'text-red-500'}`}
                        >
                            {winner === 'me' ? '🏆 WINNER!' : '😢 DEFEATED'}
                        </motion.div>

                        <div className="flex gap-6 items-center flex-wrap justify-center">
                            {selectedTeam.map((p, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.2 }}
                                    className="flex flex-col items-center bg-secondary/10 p-4 rounded-2xl border-2"
                                >
                                    <PokemonImage
                                        id={p.pokemonId}
                                        name={p.koName || p.name}
                                        className="w-24 h-24"
                                    />
                                    <p className="font-black mt-2 text-sm">{p.koName || p.name}</p>
                                </motion.div>
                            ))}
                        </div>

                        <Button
                            size="lg"
                            className="rounded-2xl h-14 px-10 font-black text-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white"
                            onClick={() => window.location.reload()}
                        >
                            <RefreshCcw className="h-5 w-5 mr-2" /> 로비로 돌아가기
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
