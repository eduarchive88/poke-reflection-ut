import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function Footer() {
    return (
        <footer className="w-full border-t border-border bg-background py-6 mt-12 bg-opacity-70 backdrop-blur-md">
            <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">

                <div className="flex flex-col items-center md:items-start space-y-1 text-center md:text-left">
                    <p className="font-medium text-foreground">만든 사람: 경기도 지구과학 교사 뀨짱</p>
                    <div className="flex items-center space-x-4">
                        <Link
                            href="https://open.kakao.com/o/s7hVU65h"
                            target="_blank"
                            rel="noreferrer noopener"
                            className="hover:text-primary transition-colors hover:underline"
                        >
                            문의: 카카오톡 오픈채팅
                        </Link>
                        <span>|</span>
                        <Link
                            href="https://eduarchive.tistory.com/"
                            target="_blank"
                            rel="noreferrer noopener"
                            className="hover:text-primary transition-colors hover:underline"
                        >
                            블로그: 뀨짱쌤의 교육자료 아카이브
                        </Link>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs">테마 설정</span>
                    <ThemeToggle />
                </div>
            </div>
        </footer>
    );
}
