"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// 전체 타입 목록
const ALL_TYPES = [
    "normal", "fire", "water", "grass", "electric", "ice",
    "fighting", "poison", "ground", "flying", "psychic",
    "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"
];

// 한글 타입명
const TYPE_KR: Record<string, string> = {
    normal: "노말", fire: "불꽃", water: "물", grass: "풀",
    electric: "전기", ice: "얼음", fighting: "격투", poison: "독",
    ground: "땅", flying: "비행", psychic: "에스퍼", bug: "벌레",
    rock: "바위", ghost: "고스트", dragon: "드래곤", dark: "악",
    steel: "강철", fairy: "페어리"
};

// 타입별 색상
const TYPE_BG: Record<string, string> = {
    normal: "#A8A878", fire: "#F08030", water: "#6890F0", grass: "#78C850",
    electric: "#F8D030", ice: "#98D8D8", fighting: "#C03028", poison: "#A040A0",
    ground: "#E0C068", flying: "#A890F0", psychic: "#F85888", bug: "#A8B820",
    rock: "#B8A038", ghost: "#705898", dragon: "#7038F8", dark: "#705848",
    steel: "#B8B8D0", fairy: "#EE99AC"
};

// 상성 데이터
const TYPE_CHART: Record<string, Record<string, number>> = {
    normal: { rock: 0.5, steel: 0.5, ghost: 0 },
    fire: { grass: 2, ice: 2, bug: 2, steel: 2, fire: 0.5, water: 0.5, rock: 0.5, dragon: 0.5 },
    water: { fire: 2, ground: 2, rock: 2, water: 0.5, grass: 0.5, dragon: 0.5 },
    grass: { water: 2, ground: 2, rock: 2, grass: 0.5, fire: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5 },
    electric: { water: 2, flying: 2, electric: 0.5, grass: 0.5, dragon: 0.5, ground: 0 },
    ice: { grass: 2, ground: 2, flying: 2, dragon: 2, fire: 0.5, water: 0.5, ice: 0.5, steel: 0.5 },
    fighting: { normal: 2, ice: 2, rock: 2, dark: 2, steel: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, fairy: 0.5, ghost: 0 },
    poison: { grass: 2, fairy: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
    ground: { fire: 2, electric: 2, poison: 2, rock: 2, steel: 2, grass: 0.5, bug: 0.5, flying: 0 },
    flying: { grass: 2, fighting: 2, bug: 2, electric: 0.5, rock: 0.5, steel: 0.5 },
    psychic: { fighting: 2, poison: 2, psychic: 0.5, steel: 0.5, dark: 0 },
    bug: { grass: 2, psychic: 2, dark: 2, fire: 0.5, fighting: 0.5, poison: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5 },
    rock: { fire: 2, ice: 2, flying: 2, bug: 2, fighting: 0.5, ground: 0.5, steel: 0.5 },
    ghost: { psychic: 2, ghost: 2, normal: 0, dark: 0.5 },
    dragon: { dragon: 2, steel: 0.5, fairy: 0 },
    dark: { psychic: 2, ghost: 2, fighting: 0.5, dark: 0.5, fairy: 0.5 },
    steel: { ice: 2, rock: 2, fairy: 2, fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5 },
    fairy: { fighting: 2, dragon: 2, dark: 2, fire: 0.5, poison: 0.5, steel: 0.5 }
};

// 배율 표시 함수
function getEffectivenessDisplay(atkType: string, defType: string) {
    const chart = TYPE_CHART[atkType] || {};
    const val = chart[defType];
    if (val === undefined) return { text: "1", className: "bg-white text-black border-slate-200" };
    if (val === 0) return { text: "✕", className: "bg-black text-white" };
    if (val === 0.5) return { text: "△", className: "bg-red-100 text-red-700 border-red-200" };
    if (val === 2) return { text: "◎", className: "bg-green-200 text-green-800 border-green-300 font-black" };
    return { text: String(val), className: "bg-white text-black" };
}

export default function TypeChartPage() {
    const router = useRouter();
    const [highlightAtk, setHighlightAtk] = useState<string | null>(null);
    const [highlightDef, setHighlightDef] = useState<string | null>(null);

    return (
        <div className="space-y-6 pb-20 max-w-7xl mx-auto px-2 sm:px-4">
            {/* 헤더 */}
            <div className="flex items-center gap-4 mt-6">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push("/student")}
                    className="rounded-none hover:bg-gray-200 border-2 border-transparent hover:border-black transition-none h-12 w-12"
                >
                    <span className="text-2xl">◀</span>
                </Button>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500 border-2 border-black flex items-center justify-center w-12 h-12">
                        <span className="text-white text-2xl">⚡</span>
                    </div>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black pixel-text uppercase">Type Chart</h2>
                        <p className="text-[10px] sm:text-xs text-gray-600 font-bold pixel-text uppercase mt-1">포켓몬 타입 상성표</p>
                    </div>
                </div>
            </div>

            {/* 범례 */}
            <div className="retro-box bg-white p-4 border-4 border-black">
                <h3 className="font-black text-black text-sm mb-3 pixel-text">📖 범례</h3>
                <div className="flex flex-wrap gap-3 text-xs font-bold">
                    <span className="inline-flex items-center gap-1"><span className="w-6 h-6 bg-green-200 text-green-800 border-2 border-green-300 flex items-center justify-center font-black text-xs">◎</span> 효과 굉장 (x2)</span>
                    <span className="inline-flex items-center gap-1"><span className="w-6 h-6 bg-white text-black border-2 border-slate-200 flex items-center justify-center text-xs">1</span> 보통 (x1)</span>
                    <span className="inline-flex items-center gap-1"><span className="w-6 h-6 bg-red-100 text-red-700 border-2 border-red-200 flex items-center justify-center text-xs">△</span> 효과 별로 (x0.5)</span>
                    <span className="inline-flex items-center gap-1"><span className="w-6 h-6 bg-black text-white border-2 border-black flex items-center justify-center text-xs">✕</span> 효과 없음 (x0)</span>
                </div>
            </div>

            {/* 상성표 */}
            <div className="retro-box bg-white overflow-x-auto border-4 border-black">
                <div className="min-w-[700px]">
                    {/* 컬럼 헤더: 방어 타입 */}
                    <div className="flex">
                        <div className="w-16 min-w-16 h-10 flex items-center justify-center text-[8px] font-black text-black border-b-2 border-r-2 border-black bg-slate-100 pixel-text">
                            공격↓ 방어→
                        </div>
                        {ALL_TYPES.map((defType) => (
                            <div
                                key={defType}
                                className={`flex-1 min-w-[36px] h-10 flex items-center justify-center text-[9px] font-black text-white border-b-2 border-r border-black/30 cursor-pointer transition-opacity ${highlightDef === defType ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                                style={{ backgroundColor: TYPE_BG[defType] }}
                                onClick={() => setHighlightDef(highlightDef === defType ? null : defType)}
                                title={TYPE_KR[defType]}
                            >
                                {TYPE_KR[defType]}
                            </div>
                        ))}
                    </div>

                    {/* 행: 공격 타입별 */}
                    {ALL_TYPES.map((atkType) => (
                        <div key={atkType} className="flex">
                            {/* 행 헤더: 공격 타입 */}
                            <div
                                className={`w-16 min-w-16 h-8 flex items-center justify-center text-[9px] font-black text-white border-b border-r-2 border-black/30 cursor-pointer transition-opacity ${highlightAtk === atkType ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                                style={{ backgroundColor: TYPE_BG[atkType] }}
                                onClick={() => setHighlightAtk(highlightAtk === atkType ? null : atkType)}
                                title={TYPE_KR[atkType]}
                            >
                                {TYPE_KR[atkType]}
                            </div>

                            {/* 셀: 상성 배율 */}
                            {ALL_TYPES.map((defType) => {
                                const { text, className } = getEffectivenessDisplay(atkType, defType);
                                const isHighlighted = highlightAtk === atkType || highlightDef === defType;
                                return (
                                    <div
                                        key={`${atkType}-${defType}`}
                                        className={`flex-1 min-w-[36px] h-8 flex items-center justify-center text-[10px] border-b border-r border-slate-200 transition-all ${className} ${isHighlighted ? 'ring-1 ring-yellow-400 ring-inset' : ''}`}
                                    >
                                        {text}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* 설명 */}
            <div className="retro-box bg-yellow-50 p-4 border-4 border-black">
                <h3 className="font-black text-black text-sm mb-2 pixel-text">💡 TIP</h3>
                <ul className="text-xs font-bold text-gray-700 space-y-1 list-disc list-inside">
                    <li>행은 <span className="font-black text-black">공격하는 타입</span>, 열은 <span className="font-black text-black">방어하는 타입</span>입니다.</li>
                    <li>예: 불꽃 타입으로 풀 타입을 공격하면 ◎ 효과 굉장! (데미지 2배)</li>
                    <li>타입 이름을 클릭하면 해당 행/열이 하이라이트됩니다.</li>
                    <li>포켓몬이 2개 타입을 가진 경우, 각 타입의 효과가 곱해집니다.</li>
                </ul>
            </div>
        </div>
    );
}
