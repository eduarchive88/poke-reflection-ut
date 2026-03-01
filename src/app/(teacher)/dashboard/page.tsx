"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { nanoid } from "nanoid";

export const dynamic = 'force-dynamic';

interface ClassData {
    id: string;
    className: string;
    sessionCode: string;
}

export default function DashboardPage() {
    const router = useRouter();
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newClassName, setNewClassName] = useState("");
    const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);

    const fetchClasses = async (uid: string) => {
        try {
            const q = query(collection(db, "classes"), where("teacherId", "==", uid));
            const querySnapshot = await getDocs(q);
            const classList: ClassData[] = [];
            querySnapshot.forEach((doc) => {
                classList.push({ id: doc.id, ...(doc.data() as Omit<ClassData, "id">) });
            });
            setClasses(classList);
        } catch (error) {
            toast.error("학급 정보를 불러오는데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUserUid(user.uid);
                fetchClasses(user.uid);
            }
        });

        return () => unsubscribe();
    }, []);

    const handleCreateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClassName.trim() || !currentUserUid) return;

        // 8자리 영숫자 랜덤 세션 코드 생성 (충돌 방지를 위해 좀 더 정밀하게 할 수 있으나 일단 고유 생성)
        const newSessionCode = nanoid(8).toUpperCase();

        try {
            const docRef = await addDoc(collection(db, "classes"), {
                teacherId: currentUserUid,
                className: newClassName.trim(),
                sessionCode: newSessionCode,
                createdAt: serverTimestamp()
            });

            setClasses([...classes, { id: docRef.id, className: newClassName.trim(), sessionCode: newSessionCode }]);
            setNewClassName("");
            setIsDialogOpen(false);
            toast.success("학급이 성공적으로 생성되었습니다.");
        } catch (error) {
            toast.error("학급 생성에 실패했습니다.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">학급 관리</h2>
                    <p className="text-muted-foreground mt-2">
                        선생님의 학급 및 접속 세션 코드를 관리하세요.
                    </p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>새 학급 생성</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>새 학급 생성</DialogTitle>
                            <DialogDescription>
                                학급 이름(예: 1학년 1반)을 입력하세요. 접속용 세션 코드가 자동으로 발급됩니다.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateClass}>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">
                                        학급 이름
                                    </Label>
                                    <Input
                                        id="name"
                                        value={newClassName}
                                        onChange={(e) => setNewClassName(e.target.value)}
                                        className="col-span-3"
                                        placeholder="예: 3학년 2반"
                                        autoComplete="off"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit">생성하기</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="py-12 text-center text-muted-foreground">로딩 중...</div>
            ) : classes.length === 0 ? (
                <Card className="border-dashed bg-secondary/30">
                    <CardContent className="flex flex-col items-center justify-center h-48 text-center px-4">
                        <p className="text-muted-foreground">아직 등록된 학급이 없습니다.</p>
                        <p className="text-sm text-muted-foreground mt-1">상단의 &apos;새 학급 생성&apos; 버튼을 눌러 시작해보세요.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {classes.map((cls) => (
                        <Card key={cls.id}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xl">{cls.className}</CardTitle>
                                <CardDescription>학생 수: 0명 (임시)</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-secondary/50 rounded-md p-3 mb-4 mt-2">
                                    <p className="text-xs text-muted-foreground mb-1">학생 접속 세션 코드 (복사 및 공유)</p>
                                    <p className="text-lg font-mono font-bold tracking-widest text-primary text-center my-1 select-all">
                                        {cls.sessionCode}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant="outline" className="text-xs" onClick={() => router.push(`/dashboard/students?classId=${cls.id}`)}>
                                        학생 명렬표
                                    </Button>
                                    <Button variant="default" className="text-xs" onClick={() => router.push(`/dashboard/status?classId=${cls.id}`)}>
                                        성찰 현황판
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
