import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PenTool, Target } from "lucide-react";

export default function StudentDashboardPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-primary">나의 교실</h2>
                    <p className="text-muted-foreground mt-2">
                        오늘 배운 내용을 기록하고 포켓몬을 만나보세요!
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PenTool className="h-5 w-5 text-primary" />
                            오늘의 성찰
                        </CardTitle>
                        <CardDescription>
                            배운 점, 아쉬운 점 등을 글자수에 맞춰 작성하고 보상을 획득하세요.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/student/write">
                            <Button className="w-full">새 일기 쓰기</Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            주간 목표
                        </CardTitle>
                        <CardDescription>
                            포켓몬 마스터가 되기 위한 진행 상황
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span>작성 횟수</span>
                            <span className="font-bold">0 / 5 회</span>
                        </div>
                        {/* ProgressBar UI 추가 예정 */}
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary w-0"></div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
