import React from "react";
import Link from "next/link";

export default function Footer() {
    return (
        <footer className="w-full py-8 px-4 border-t-2 border-black/10 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-md mt-auto">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm font-bold text-slate-600 dark:text-slate-400">
                <div className="flex flex-col items-center md:items-start gap-1">
                    <p>만든 사람: <span className="text-red-500 font-black">경기도 지구과학 교사 뀨짱</span></p>
                    <p className="text-[10px] uppercase tracking-widest opacity-60">Poke-Reflection Ultimate Edition Project</p>
                </div>

                <div className="flex items-center gap-6">
                    <Link
                        href="https://open.kakao.com/o/s7hVU65h"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-red-600 transition-colors border-b-2 border-transparent hover:border-red-600 pb-0.5"
                    >
                        문의: 카카오톡 오픈채팅
                    </Link>
                    <Link
                        href="https://eduarchive.tistory.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-amber-600 transition-colors border-b-2 border-transparent hover:border-amber-600 pb-0.5"
                    >
                        블로그: 뀨짱쌤의 교육자료 아카이브
                    </Link>
                </div>

                <div className="text-[10px] text-center md:text-right opacity-40 leading-tight">
                    &copy; 2024 POCKETMON REFLECTION ULTIMATE<br />
                    ALL RIGHTS RESERVED.
                </div>
            </div>
        </footer>
    );
}
