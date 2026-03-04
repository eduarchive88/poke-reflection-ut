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
import { motion, AnimatePresence } from "framer-motion";
import { PokemonImage } from "@/components/PokemonImage";
import { getSkillData, calculateDamage, selectBattleSkill } from "@/lib/pokemonData";

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
    skills?: string[];
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
    fire: { grass: 3, ice: 3, bug: 3, steel: 3, fire: 0.33, water: 0.33, rock: 0.33, dragon: 0.33 },
    water: { fire: 3, ground: 3, rock: 3, water: 0.33, grass: 0.33, dragon: 0.33 },
    grass: { water: 3, ground: 3, rock: 3, grass: 0.33, fire: 0.33, poison: 0.33, flying: 0.33, bug: 0.33, dragon: 0.33, steel: 0.33 },
    electric: { water: 3, flying: 3, electric: 0.33, grass: 0.33, dragon: 0.33, ground: 0 },
    normal: { rock: 0.33, steel: 0.33, ghost: 0 },
    bug: { grass: 3, psychic: 3, dark: 3, fire: 0.33, fighting: 0.33, poison: 0.33, flying: 0.33, ghost: 0.33, steel: 0.33, fairy: 0.33 },
    poison: { grass: 3, fairy: 3, poison: 0.33, ground: 0.33, rock: 0.33, ghost: 0.33, steel: 0 },
    ground: { fire: 3, electric: 3, poison: 3, rock: 3, steel: 3, grass: 0.33, bug: 0.33, flying: 0 },
    flying: { grass: 3, fighting: 3, bug: 3, electric: 0.33, rock: 0.33, steel: 0.33 },
    psychic: { fighting: 3, poison: 3, psychic: 0.33, steel: 0.33, dark: 0 },
    rock: { fire: 3, ice: 3, flying: 3, bug: 3, fighting: 0.33, ground: 0.33, steel: 0.33 },
    ice: { grass: 3, ground: 3, flying: 3, dragon: 3, fire: 0.33, water: 0.33, ice: 0.33, steel: 0.33 },
    ghost: { psychic: 3, ghost: 3, normal: 0, dark: 0.33 },
    dragon: { dragon: 3, steel: 0.33, fairy: 0 },
    steel: { ice: 3, rock: 3, fairy: 3, fire: 0.33, water: 0.33, electric: 0.33, steel: 0.33 },
    dark: { psychic: 3, ghost: 3, fighting: 0.33, dark: 0.33, fairy: 0.33 },
    fairy: { fighting: 3, dragon: 3, dark: 3, fire: 0.33, poison: 0.33, steel: 0.33 },
    fighting: { normal: 3, ice: 3, rock: 3, dark: 3, steel: 3, poison: 0.33, flying: 0.33, psychic: 0.33, bug: 0.33, fairy: 0.33, ghost: 0 }
};

const KO_TYPES: Record<string, string> = {
    normal: "노말", fire: "불꽃", water: "물", grass: "풀", electric: "전기",
    ice: "얼음", fighting: "격투", poison: "독", ground: "땅", flying: "비행",
    psychic: "에스퍼", bug: "벌레", rock: "바위", ghost: "고스트",
    dragon: "드래곤", dark: "악", steel: "강철", fairy: "페어리"
};

const TYPES_ORDER = ["normal", "fire", "water", "grass", "electric", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];

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

    // 모달 State
    const [showTypeChart, setShowTypeChart] = useState(false);

    // Battle State
    const [currentMyIdx, setCurrentMyIdx] = useState(0);
    const [currentOppIdx, setCurrentOppIdx] = useState(0);
    const [hitEffect, setHitEffect] = useState<"none" | "me" | "opponent">("none");

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
        setCurrentMyIdx(0);
        setCurrentOppIdx(0);
        setHitEffect("none");
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
    const run3v3Battle = async (myTeam: PokemonData[], oppTeam: PokemonData[]) => {
        setBattleLog(["▶ 3v3 친선 경기 시작!", "▶ 양쪽 포켓몬이 입장합니다!"]);

        let myIdx = 0;
        let oppIdx = 0;
        setCurrentMyIdx(0);
        setCurrentOppIdx(0);
        setHitEffect("none");
        const logs: string[] = ["▶ 배틀 시작!"];

        let currentMyHp = 0;
        let currentOppHp = 0;

        const wait = (ms: number) => new Promise(res => setTimeout(res, ms));
        await wait(2000);

        while (myIdx < myTeam.length && oppIdx < oppTeam.length) {
            const me = myTeam[myIdx];
            const opp = oppTeam[oppIdx];

            let nextLogMsg = false;
            if (currentMyHp <= 0) {
                currentMyHp = (me.stats?.hp || 100) + (me.level * 2);
                logs.push(`▶ [나] ${me.koName || me.name} 출전!`);
                nextLogMsg = true;
            }
            if (currentOppHp <= 0) {
                currentOppHp = (opp.stats?.hp || 100) + (opp.level * 2);
                logs.push(`▶ [상대] ${opp.koName || opp.name} 출전!`);
                nextLogMsg = true;
            }

            if (nextLogMsg) {
                setBattleLog([...logs.slice(-7)]);
                await wait(1000);
            }

            // 확률 기반 스킬 선택 (기본공격 60% + 보유스킬 40%)
            const mySkill = selectBattleSkill(me.skills);
            const oppSkill = selectBattleSkill(opp.skills);

            const myEff = getEffectiveness([mySkill.type], opp.types);
            const oppEff = getEffectiveness([oppSkill.type], me.types);

            const myDmg = calculateDamage(me.level, me.stats?.attack || 40, opp.stats?.defense || 40, mySkill.power, myEff);
            const oppDmg = calculateDamage(opp.level, opp.stats?.attack || 40, me.stats?.defense || 40, oppSkill.power, oppEff);

            // 내 턴 공격
            setHitEffect("opponent");
            currentOppHp -= myDmg;
            logs.push(`▶ ${me.koName || me.name}의 [${mySkill.name}]! ${myDmg} 데미지!`);
            if (myEff > 1) logs.push("▶ 앗! 효과가 굉장했다!");
            else if (myEff < 1) logs.push("▶ 효과가 별로인 듯하다...");
            setBattleLog([...logs.slice(-7)]);
            await wait(400); // 타격 이펙트 지속
            setHitEffect("none");
            await wait(600); // 턴 딜레이

            // 상대 반격 (상대가 쓰러지지 않았을 때만)
            if (currentOppHp > 0) {
                setHitEffect("me");
                currentMyHp -= oppDmg;
                logs.push(`▶ ${opp.koName || opp.name}의 [${oppSkill.name}]! ${oppDmg} 데미지!`);
                if (oppEff > 1) logs.push("▶ 앗! 효과가 굉장했다!");
                else if (oppEff < 1) logs.push("▶ 효과가 별로인 듯하다...");
                setBattleLog([...logs.slice(-7)]);
                await wait(400);
                setHitEffect("none");
                await wait(600);
            }

            // 기절 판정
            if (currentOppHp <= 0) {
                logs.push(`▶ 상대 ${opp.koName || opp.name} 쓰러짐!`);
                oppIdx++;
                setCurrentOppIdx(oppIdx);
                currentOppHp = 0;
            } else if (currentMyHp <= 0) {
                logs.push(`▶ 내 ${me.koName || me.name} 쓰러짐!`);
                myIdx++;
                setCurrentMyIdx(myIdx);
                currentMyHp = 0;
            }
            setBattleLog([...logs.slice(-7)]);
            await wait(1000);
        }

        const isWin = myIdx < myTeam.length;
        finish3v3Battle(isWin, myTeam, oppTeam);
    };

    // 3v3 배틀 결과 처리
    const finish3v3Battle = async (isWin: boolean, myTeam: PokemonData[], oppTeam: PokemonData[]) => {
        setWinner(isWin ? "me" : "opponent");
        setBattleLog(prev => [...prev, isWin ? "▶ 최종 승리!" : "▶ 최종 패배..."]);

        if (!isWin) {
            const retiredTime = new Date();
            retiredTime.setHours(retiredTime.getHours() + 12);
            try {
                for (const poke of myTeam) {
                    await updateDoc(doc(db, "pokemon_inventory", poke.id), { retiredUntil: retiredTime });
                }
                toast.info("패배한 포켓몬들이 12시간 동안 휴식합니다.");
            } catch (e) {
                console.error("리타이어 처리 실패:", e);
            }
        }

        setTimeout(() => setGameState("result"), 2000);

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
                <div className="w-16 h-16 border-4 border-black border-t-white rounded-full animate-spin" />
                <p className="text-lg font-bold pixel-text">데이터를 불러오는 중...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20 max-w-5xl mx-auto px-4 sm:px-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/student")}
                        className="rounded-none hover:bg-gray-200 border-2 border-transparent hover:border-black transition-none h-12 w-12"
                    >
                        <span className="text-2xl">◀</span>
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 border-2 border-black flex items-center justify-center w-12 h-12">
                            <span className="text-white text-2xl">🤝</span>
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black pixel-text tracking-tight">친선 경기 (3v3)</h2>
                            <p className="text-[10px] sm:text-xs text-gray-600 font-bold uppercase pixel-text mt-1">Friendly Match</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 들어오는 대결 신청 알림 */}
            <AnimatePresence>
                {incomingRequest && incomingRequest.status === 'pending' && gameState === "lobby" && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
                        <div className="pixel-box bg-yellow-300 p-4 sm:p-6 mb-6">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl sm:text-4xl animate-bounce">❗</span>
                                    <div>
                                        <p className="font-bold pixel-text text-sm sm:text-base">
                                            {incomingRequest.fromName}님의 도전입니다!
                                        </p>
                                        <p className="text-xs sm:text-sm text-gray-700 mt-1 pixel-text">대결을 수락하시겠습니까?</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <Button
                                        onClick={acceptRequest}
                                        className="pixel-button bg-blue-500 text-white flex-1 sm:flex-none"
                                    >
                                        수락
                                    </Button>
                                    <Button
                                        onClick={declineRequest}
                                        className="pixel-button bg-gray-300 text-black flex-1 sm:flex-none"
                                    >
                                        거절
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
                {/* === 로비 === */}
                {gameState === "lobby" && (
                    <motion.div key="lobby" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* 전투 규칙 & 대기 표시 */}
                            <div className="space-y-6">
                                <div className="pixel-box bg-white p-6 leading-relaxed">
                                    <h3 className="text-lg sm:text-xl font-black pixel-text mb-4 border-b-2 border-black pb-2">📋 전투 규칙</h3>
                                    <ul className="space-y-3 text-xs sm:text-sm pixel-text">
                                        <li>▶ 최대 3마리의 포켓몬을 출전시킬 수 있습니다.</li>
                                        <li>▶ 첫 번째 포켓몬부터 순서대로 배틀을 진행합니다.</li>
                                        <li>▶ 양쪽 플레이어가 모두 [준비 완료]를 누르면 시작됩니다.</li>
                                        <li>▶ 패배한 포켓몬은 일정 시간 동안 휴식해야 합니다.</li>
                                    </ul>
                                    <h3 className="text-lg sm:text-xl font-black pixel-text mt-6 mb-4 border-b-2 border-black pb-2">🔥 상성 규칙</h3>
                                    <ul className="space-y-3 text-xs sm:text-sm pixel-text text-gray-700">
                                        <li>▶ <span className="text-red-500 font-bold">효과 굉장 (데미지 2배)</span> : 물 ➔ 불꽃, 전기 ➔ 비행 등</li>
                                        <li>▶ <span className="text-blue-500 font-bold">효과 별로 (데미지 절반)</span> : 불꽃 ➔ 물, 풀 ➔ 비행 등</li>
                                        <li>▶ 상세한 상성은 <span className="font-bold border-b border-black text-blue-600 cursor-pointer hover:bg-blue-50 transition-colors" onClick={() => setShowTypeChart(true)}>상성표</span>를 확인하세요!</li>
                                    </ul>
                                </div>

                                {/* 대기 중 표시 */}
                                {activeRequest && activeRequest.status === 'pending' && (
                                    <div className="pixel-box bg-blue-100 p-6 text-center">
                                        <span className="text-4xl block mb-2 animate-spin">⏳</span>
                                        <p className="font-bold pixel-text mb-4">상대방의 수락 대기 중...</p>
                                        <Button
                                            onClick={cancelRequest}
                                            className="pixel-button bg-red-500 text-white"
                                        >
                                            신청 취소
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* 친구 목록 */}
                            <div className="pixel-box bg-white p-4 sm:p-6 h-fit">
                                <h3 className="text-lg sm:text-xl font-black pixel-text mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
                                    👥 같은 반 친구들 (도전 가능)
                                </h3>
                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {students.length === 0 ? (
                                        <div className="py-8 text-center bg-gray-100 border-2 border-dashed border-gray-300">
                                            <span className="text-2xl mb-2 block">🤷</span>
                                            <p className="text-sm font-bold pixel-text text-gray-500">같은 반 학생이 아직 없습니다.</p>
                                        </div>
                                    ) : (
                                        students.map(s => (
                                            <div key={s.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border-2 border-black bg-gray-50 hover:bg-yellow-50 transition-colors gap-3">
                                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                                    <div className="w-10 h-10 bg-blue-500 border-2 border-black flex items-center justify-center font-bold text-white text-sm shrink-0">
                                                        {s.name[0]}
                                                    </div>
                                                    <span className="font-bold pixel-text text-sm sm:text-base truncate flex-1">{s.name}</span>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    className="pixel-button bg-red-500 text-white w-full sm:w-auto h-10"
                                                    disabled={!!activeRequest}
                                                    onClick={() => sendRequest(s)}
                                                >
                                                    도전 신청!
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* === 포켓몬 선택 화면 === */}
                {gameState === "select" && (
                    <motion.div key="select" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                        {/* 상단 바 */}
                        <div className="pixel-box bg-white p-4 sm:p-6">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="text-center md:text-left">
                                    <h3 className="text-xl sm:text-2xl font-black pixel-text mb-2">🎒 출전 엔트리 선택</h3>
                                    <p className="text-xs sm:text-sm text-gray-600 font-bold pixel-text">
                                        (최대 3마리 선택 가능, 선택한 순서대로 배틀에 나갑니다)
                                    </p>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <Button onClick={quitBattle} className="pixel-button bg-gray-300 text-black flex-1 md:flex-none">
                                        도망치기
                                    </Button>
                                    <Button
                                        className={`pixel-button flex-1 md:flex-none ${isReady ? 'bg-green-500 text-white' : 'bg-red-500 text-white hover:bg-red-600'}`}
                                        onClick={isReady ? undefined : confirmReady}
                                        disabled={selectedTeam.length < 1 || isReady}
                                    >
                                        {isReady ? '준비 완료!' : `완료 (${selectedTeam.length}/3)`}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* 준비 상태 */}
                        {isReady && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="pixel-box bg-blue-100 p-4 border-2 border-black mb-4">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <span className="font-bold pixel-text text-sm sm:text-base">나: <span className="text-green-600">준비됨</span></span>
                                    {opponentReady ? (
                                        <span className="font-bold pixel-text text-sm sm:text-base">상대: <span className="text-green-600">준비됨</span></span>
                                    ) : (
                                        <span className="font-bold pixel-text text-sm sm:text-base animate-pulse">상대방 준비 기다리는 중...</span>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* 팀 선택 현황 바 */}
                        <div className="flex flex-wrap gap-2 px-2">
                            {[0, 1, 2].map((i) => (
                                <div key={i} className={`h-16 w-16 sm:h-20 sm:w-20 border-4 ${selectedTeam[i] ? 'border-red-500 bg-white' : 'border-gray-300 bg-gray-100'} border-dashed flex items-center justify-center shrink-0`}>
                                    {selectedTeam[i] ? (
                                        <img src={selectedTeam[i].image} alt="selected" className="w-full h-full object-contain p-1 pixelated" />
                                    ) : (
                                        <span className="text-gray-400 font-bold font-mono text-xl">{i + 1}</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* 포켓몬 목록 */}
                        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 px-2">
                            {myPokemon.length === 0 ? (
                                <div className="col-span-full pixel-box bg-white p-8 text-center text-red-500 font-bold pixel-text">
                                    출전 가능한 포켓몬이 없습니다.
                                </div>
                            ) : myPokemon.map(poke => {
                                const isSelected = selectedTeam.find(p => p.id === poke.id);
                                const order = selectedTeam.findIndex(p => p.id === poke.id) + 1;
                                return (
                                    <div
                                        key={poke.id}
                                        className={`pixel-box bg-white p-3 sm:p-4 text-center cursor-pointer transition-transform ${isReady ? 'opacity-50 pointer-events-none' : 'hover:-translate-y-1 hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)]'} ${isSelected ? 'ring-4 ring-inset ring-red-500 border-red-500' : ''}`}
                                        onClick={() => togglePokeSelection(poke)}
                                    >
                                        <div className="relative w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-2 bg-gray-50 border-2 border-gray-200">
                                            {isSelected && (
                                                <div className="absolute -top-3 -right-3 w-6 h-6 sm:w-8 sm:h-8 bg-black text-white rounded-full flex items-center justify-center font-bold text-sm sm:text-base border-2 border-white z-10 shadow-sm">
                                                    {order}
                                                </div>
                                            )}
                                            <PokemonImage
                                                id={poke.pokemonId}
                                                name={poke.koName || poke.name}
                                                className="w-full h-full object-contain p-1 pixelated"
                                            />
                                        </div>
                                        <p className="font-bold pixel-text text-xs sm:text-sm truncate w-full" title={poke.koName || poke.name}>{poke.koName || poke.name}</p>
                                        <div className="flex justify-center gap-1 mt-1 flex-wrap">
                                            <span className="text-[10px] bg-yellow-300 border border-black px-1 py-0.5">Lv.{poke.level}</span>
                                            {poke.types.slice(0, 1).map(t => (
                                                <span key={t} className="text-[10px] bg-gray-200 border border-black px-1 py-0.5 uppercase pixel-text shrink-0">{t}</span>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* === 배틀 화면 === */}
                {gameState === "battle" && (
                    <motion.div key="battle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-4 sm:py-8 space-y-8">
                        {/* 배틀 아레나 존 */}
                        <div className="w-full max-w-4xl relative pixel-box bg-white/50 border-4 border-black p-4 sm:p-8 overflow-hidden h-64 md:h-80 flex items-center justify-between shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
                            {/* 배경 장식 */}
                            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gray-200 border-t-4 border-black z-0" />

                            {/* 아군 영역 (왼쪽 아래) */}
                            <motion.div
                                className="z-10 absolute bottom-4 sm:bottom-8 left-4 sm:left-12 flex flex-col items-center"
                                animate={{ x: [0, 5, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                            >
                                <div className="mb-2 bg-white border-2 border-black px-2 py-1 flex items-center gap-2 drop-shadow-sm">
                                    <span className="font-bold pixel-text text-[10px] md:text-sm text-blue-600 truncate max-w-[100px]">{session?.name || "나"}</span>
                                    <div className="flex gap-0.5 mt-0.5">
                                        {[0, 1, 2].map(i => (
                                            <div key={i} className={`w-3 h-3 border-2 border-black ${i < selectedTeam.length ? 'bg-red-500 rounded-full' : 'bg-transparent rounded-full'}`} />
                                        ))}
                                    </div>
                                </div>
                                <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-48 md:h-48 relative drop-shadow-[0_8px_0_rgba(0,0,0,0.3)]">
                                    <PokemonImage
                                        id={selectedTeam[Math.min(currentMyIdx, selectedTeam.length - 1)]?.pokemonId || 0}
                                        name={selectedTeam[Math.min(currentMyIdx, selectedTeam.length - 1)]?.koName || selectedTeam[Math.min(currentMyIdx, selectedTeam.length - 1)]?.name}
                                        className={`w-full h-full object-contain pixelated [transform:scaleX(-1)] transition-all ${hitEffect === "me" ? "opacity-50 blur-[2px] sepia" : "opacity-100"}`} // 아군 포켓몬은 오른쪽(상대방쪽)을 보게 반전
                                    />
                                    {hitEffect === "me" && (
                                        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                                            <span className="text-6xl sm:text-7xl md:text-8xl animate-ping text-red-500 drop-shadow-[0_0_10px_rgba(255,0,0,1)]">💥</span>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-2 bg-white border-2 border-black px-3 py-1 text-center w-full drop-shadow-sm max-w-[120px] md:max-w-none">
                                    <p className="font-bold pixel-text text-[10px] md:text-sm truncate" title={selectedTeam[Math.min(currentMyIdx, selectedTeam.length - 1)]?.koName || selectedTeam[Math.min(currentMyIdx, selectedTeam.length - 1)]?.name}>{selectedTeam[Math.min(currentMyIdx, selectedTeam.length - 1)]?.koName || selectedTeam[Math.min(currentMyIdx, selectedTeam.length - 1)]?.name}</p>
                                </div>
                            </motion.div>

                            {/* 적군 영역 (오른쪽 위) */}
                            <motion.div
                                className="z-10 absolute top-4 sm:top-8 right-4 sm:right-12 flex flex-col items-center"
                                animate={{ x: [0, -5, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.2 }}
                            >
                                <div className="mb-2 bg-white border-2 border-black px-2 py-1 flex items-center gap-2 drop-shadow-sm flex-row-reverse">
                                    <span className="font-bold pixel-text text-[10px] md:text-sm text-red-600 truncate max-w-[100px]">{activeRequest?.toName || incomingRequest?.fromName || "상대방"}</span>
                                    <div className="flex gap-0.5 mt-0.5">
                                        {[0, 1, 2].map(i => (
                                            <div key={i} className={`w-3 h-3 border-2 border-black ${i < (opponentTeam?.length || 0) ? 'bg-red-500 rounded-full' : 'bg-transparent rounded-full'}`} />
                                        ))}
                                    </div>
                                </div>
                                <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-48 md:h-48 relative drop-shadow-[0_8px_0_rgba(0,0,0,0.3)]">
                                    <PokemonImage
                                        id={opponentTeam?.[Math.min(currentOppIdx, opponentTeam.length - 1)]?.pokemonId || 0}
                                        name={opponentTeam?.[Math.min(currentOppIdx, opponentTeam.length - 1)]?.koName || opponentTeam?.[Math.min(currentOppIdx, opponentTeam.length - 1)]?.name}
                                        className={`w-full h-full object-contain pixelated transition-all ${hitEffect === "opponent" ? "opacity-50 blur-[2px] sepia" : "opacity-100"}`}
                                    />
                                    {hitEffect === "opponent" && (
                                        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                                            <span className="text-6xl sm:text-7xl md:text-8xl animate-ping text-red-500 drop-shadow-[0_0_10px_rgba(255,0,0,1)]">💥</span>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-2 bg-white border-2 border-black px-3 py-1 text-center w-full drop-shadow-sm max-w-[120px] md:max-w-none">
                                    <p className="font-bold pixel-text text-[10px] md:text-sm truncate" title={opponentTeam?.[Math.min(currentOppIdx, opponentTeam.length - 1)]?.koName || opponentTeam?.[Math.min(currentOppIdx, opponentTeam.length - 1)]?.name}>{opponentTeam?.[Math.min(currentOppIdx, opponentTeam.length - 1)]?.koName || opponentTeam?.[Math.min(currentOppIdx, opponentTeam.length - 1)]?.name}</p>
                                </div>
                            </motion.div>
                        </div>

                        {/* 배틀 기록 텍스트 상자 */}
                        <div className="w-full max-w-2xl pixel-box bg-white p-4 sm:p-6 relative border-[6px]">
                            <div className="absolute top-0 right-0 p-1">
                                <span className="text-gray-300 text-xs pixel-text">LOG</span>
                            </div>
                            <div className="space-y-3 font-mono h-40 overflow-y-auto pr-2 custom-scrollbar flex flex-col justify-end pb-2">
                                {battleLog.map((log, i) => {
                                    const isWin = log.includes("승리") || log.includes("승자");
                                    const isLoss = log.includes("패배") || log.includes("쓰러짐");
                                    return (
                                        <motion.div
                                            key={`${i}-${log}`}
                                            initial={{ opacity: 0, x: -5 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className={`text-xs sm:text-sm md:text-base font-bold pixel-text leading-loose break-keep ${isWin ? "text-blue-600 shadow-[1px_1px_0_0_white]" :
                                                isLoss ? "text-red-600 shadow-[1px_1px_0_0_white]" : "text-black"
                                                }`}
                                        >
                                            {log}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* === 결과 화면 === */}
                {gameState === "result" && (
                    <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center space-y-8 py-8 w-full">

                        <div className="pixel-box bg-white p-6 sm:p-10 w-full max-w-3xl flex flex-col items-center">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                                className={`text-5xl sm:text-7xl font-black pixel-text mb-6 drop-shadow-[4px_4px_0_rgba(0,0,0,1)] ${winner === 'me' ? 'text-blue-400' : 'text-red-500'}`}
                            >
                                {winner === 'me' ? '승리!' : '패배...'}
                            </motion.div>

                            <p className="font-bold pixel-text mb-8 flex text-sm sm:text-base md:text-lg">
                                {winner === 'me' ? '대결에서 승리했습니다. 보상을 확인하세요!' : '아쉽습니다. 포켓몬들을 푹 쉬게 해주세요.'}
                            </p>

                            <h4 className="font-bold pixel-text mb-4 bg-gray-200 px-4 py-1 border-2 border-black inline-block">나의 출전 팀</h4>
                            <div className="flex gap-4 sm:gap-6 items-center flex-wrap justify-center w-full px-2">
                                {selectedTeam.map((p, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 + (i * 0.1) }}
                                        className={`flex flex-col items-center bg-gray-50 border-4 ${winner === 'me' ? 'border-blue-300' : 'border-gray-400'} p-2 sm:p-4 w-24 sm:w-32 bg-white relative`}
                                    >
                                        {!winner && <div className="absolute inset-0 bg-black/10 z-10 hidden" /> /* 패배 시 음영 지게 하려면 수정 */}
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 border-2 border-black mb-2 flex items-center justify-center relative">
                                            <PokemonImage
                                                id={p.pokemonId}
                                                name={p.koName || p.name}
                                                className={`w-full h-full object-contain p-1 pixelated hover:scale-110 transition-transform ${winner !== 'me' ? 'grayscale opacity-70' : ''}`}
                                            />
                                        </div>
                                        <p className="font-bold text-[10px] sm:text-xs pixel-text truncate w-full text-center" title={p.koName || p.name}>{p.koName || p.name}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        <Button
                            size="lg"
                            className="pixel-button h-14 w-full max-w-xs text-black bg-yellow-400 hover:bg-yellow-500 text-lg shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-1 hover:translate-x-1"
                            onClick={() => window.location.reload()}
                        >
                            로비로 돌아가기
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 상성표 모달 */}
            <AnimatePresence>
                {showTypeChart && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm"
                        onClick={() => setShowTypeChart(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="pixel-box bg-white p-2 sm:p-4 md:p-6 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4 border-b-2 border-black pb-2">
                                <h2 className="text-lg sm:text-xl md:text-2xl font-black pixel-text flex items-center gap-2">
                                    ⚔️ 불꽃/물/풀... 상성표!
                                </h2>
                                <Button
                                    onClick={() => setShowTypeChart(false)}
                                    className="pixel-button bg-red-500 text-white w-8 h-8 p-0 flex items-center justify-center"
                                >
                                    X
                                </Button>
                            </div>

                            <div className="overflow-auto custom-scrollbar border-4 border-black p-1 sm:p-2 bg-gray-50 flex-grow">
                                <div className="min-w-[600px]">
                                    <table className="w-full text-[10px] md:text-xs text-center border-collapse">
                                        <thead>
                                            <tr>
                                                <th className="border-2 border-black p-1 bg-gray-200 pixel-text text-gray-700 whitespace-nowrap sticky top-0 left-0 z-20">공격 ➔<br />방어 ⬇</th>
                                                {TYPES_ORDER.map(t => (
                                                    <th key={t} className={`border border-black p-1 sm:p-2 ${TYPE_COLORS[t] || 'bg-gray-400'} text-white font-black pixel-text whitespace-nowrap sticky top-0 z-10 w-10 sm:w-16 shadow-sm`}>
                                                        {KO_TYPES[t]}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {TYPES_ORDER.map(atk => (
                                                <tr key={atk}>
                                                    <th className={`border-2 border-black p-1 sm:p-2 font-black pixel-text ${TYPE_COLORS[atk] || 'bg-gray-400'} text-white whitespace-nowrap sticky left-0 z-10 w-16 sm:w-20 shadow-[2px_0_0_0_rgba(0,0,0,0.1)]`}>
                                                        {KO_TYPES[atk]}
                                                    </th>
                                                    {TYPES_ORDER.map(def => {
                                                        const val = TYPE_CHART[atk]?.[def];
                                                        let content = "";
                                                        let bg = "bg-white";
                                                        if (val === 3) { content = "O"; bg = "bg-green-100 font-black text-green-700 text-sm sm:text-base"; }
                                                        else if (val === 0.33) { content = "△"; bg = "bg-red-50 font-bold text-red-700"; }
                                                        else if (val === 0) { content = "X"; bg = "bg-gray-300 font-bold text-gray-500"; }

                                                        return (
                                                            <td key={def} className={`border border-gray-400 p-1 sm:p-2 ${bg} hover:bg-yellow-200 transition-colors cursor-crosshair`}>
                                                                {content}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="mt-4 pb-2 text-[10px] sm:text-sm font-bold pixel-text text-gray-800 flex flex-col sm:flex-row gap-2 sm:gap-6 justify-center bg-gray-100 p-2 sm:p-3 border-2 border-black border-dashed">
                                <span className="flex items-center gap-2"><span className="text-green-700 font-black text-lg bg-green-100 px-1 border border-green-700">O</span> 효과가 굉장했다! (데미지 증가)</span>
                                <span className="flex items-center gap-2"><span className="text-red-700 font-bold text-base bg-red-50 px-1 border border-red-700">△</span> 효과가 별로인 듯하다... (데미지 감소)</span>
                                <span className="flex items-center gap-2"><span className="text-gray-500 font-bold text-base bg-gray-300 px-1 border border-gray-500">X</span> 효과가 없는 것 같다... (공격 무효)</span>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
