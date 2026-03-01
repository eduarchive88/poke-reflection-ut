import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TeacherDashboardPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">학급 관리</h2>
                    <p className="text-muted-foreground mt-2">
                        선생님의 학급 및 학생 세션 코드를 관리하세요.
                    </p>
                </div>
                <Button>새 학급 생성</Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Placeholder. 데이터 연동 전 정적 시안 */}
                <Card>
                    <CardHeader>
                        <CardTitle>1학년 2반</CardTitle>
                        <CardDescription>학생 수: 0명</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm font-medium text-muted-foreground mb-4">
                            접속 세션 코드: <span className="text-primary font-bold">POKE-A1B2</span>
                        </p>
                        <Button variant="outline" className="w-full">
                            학생 관리
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
