"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export const dynamic = 'force-dynamic';

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    // Teacher Auth State
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [isLoginView, setIsLoginView] = useState(true);

    // Student Auth State
    const [sessionCode, setSessionCode] = useState("");
    const [grade, setGrade] = useState("");
    const [classNum, setClassNum] = useState("");
    const [studentNum, setStudentNum] = useState("");
    const [studentName, setStudentName] = useState("");

    const handleTeacherSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password || (!isLoginView && !name)) {
            toast.error("필수 정보를 모두 입력해주세요.");
            return;
        }

        setIsLoading(true);
        try {
            if (isLoginView) {
                // Teacher Login
                await signInWithEmailAndPassword(auth, email, password);
                toast.success("환영합니다!");
                router.push("/dashboard");
            } else {
                // Teacher Signup
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Save additional teacher info to Firestore
                await setDoc(doc(db, "teachers", user.uid), {
                    email: user.email,
                    name: name,
                    createdAt: new Date().toISOString()
                });

                toast.success("가입이 완료되었습니다!");
                router.push("/dashboard");
            }
        } catch (error: any) {
            toast.error(error.message || "오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleStudentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sessionCode || !grade || !classNum || !studentNum || !studentName) {
            toast.error("세션/학번 정보를 모두 입력해주세요.");
            return;
        }

        setIsLoading(true);
        try {
            // 1. 세션 코드로 학급 찾기
            const classesQuery = query(collection(db, "classes"), where("sessionCode", "==", sessionCode.trim().toUpperCase()));
            const classSnapshots = await getDocs(classesQuery);

            if (classSnapshots.empty) {
                toast.error("유효하지 않은 세션 코드입니다.");
                setIsLoading(false);
                return;
            }

            const classDoc = classSnapshots.docs[0];
            const classId = classDoc.id;

            // 2. 해당 학급 내 학생 정보 매칭 (Document ID 규칙: sessionCode_grade_classNum_number)
            const expectedDocId = `${sessionCode.trim().toUpperCase()}_${grade}_${classNum}_${studentNum}`;
            const studentDocRef = doc(db, "students", expectedDocId);
            const studentSnap = await getDocs(query(collection(db, "students"), where("classId", "==", classId), where("grade", "==", parseInt(grade)), where("classNum", "==", parseInt(classNum)), where("number", "==", parseInt(studentNum))));

            if (studentSnap.empty) {
                toast.error("등록된 학생 정보를 찾을 수 없습니다. (학년/반/번호 확인)");
                setIsLoading(false);
                return;
            }

            const studentDoc = studentSnap.docs[0];
            const studentData = studentDoc.data();

            if (studentData.name !== studentName.trim()) {
                toast.error("이름이 일치하지 않습니다.");
                setIsLoading(false);
                return;
            }

            // 3. 세션 저장 (Local Storage 활용)
            const sessionData = {
                studentId: studentDoc.id,
                classId: classId,
                className: classDoc.data().className,
                studentInfo: {
                    grade: parseInt(grade),
                    classNum: parseInt(classNum),
                    number: parseInt(studentNum),
                    name: studentName.trim()
                },
                loginAt: new Date().toISOString()
            };

            localStorage.setItem("poke_student_session", JSON.stringify(sessionData));

            toast.success(`${studentName}님, 환영합니다!`);
            router.push("/");
        } catch (error: any) {
            console.error(error);
            toast.error("로그인 중 오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-vh-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-extrabold tracking-tight text-primary">
                        Poke-Reflection
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        포켓몬과 함께 성장하는 성찰 일기 플랫폼
                    </p>
                </div>

                <Tabs defaultValue="student" className="w-full mt-8">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="student">학생용</TabsTrigger>
                        <TabsTrigger value="teacher">교사용</TabsTrigger>
                    </TabsList>

                    {/* 학생 로그인 패널 */}
                    <TabsContent value="student">
                        <Card>
                            <CardHeader>
                                <CardTitle>학생 입장</CardTitle>
                                <CardDescription>
                                    선생님이 알려주신 세션 코드와 학번 정보를 입력하세요.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleStudentSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="sessionCode">세션 코드</Label>
                                        <Input
                                            id="sessionCode"
                                            placeholder="예) POKE1234"
                                            value={sessionCode}
                                            onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="grade">학년</Label>
                                            <Input id="grade" type="number" value={grade} onChange={(e) => setGrade(e.target.value)} disabled={isLoading} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="classNum">반</Label>
                                            <Input id="classNum" type="number" value={classNum} onChange={(e) => setClassNum(e.target.value)} disabled={isLoading} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="studentNum">번호</Label>
                                            <Input id="studentNum" type="number" value={studentNum} onChange={(e) => setStudentNum(e.target.value)} disabled={isLoading} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="studentName">이름</Label>
                                        <Input
                                            id="studentName"
                                            placeholder="이름 입력"
                                            value={studentName}
                                            onChange={(e) => setStudentName(e.target.value)}
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? "확인 중..." : "입장하기"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* 교사 로그인 패널 */}
                    <TabsContent value="teacher">
                        <Card>
                            <CardHeader>
                                <CardTitle>교사 {isLoginView ? "로그인" : "회원가입"}</CardTitle>
                                <CardDescription>
                                    선생님 전용 관리 페이지에 접속합니다.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleTeacherSubmit} className="space-y-4">
                                    {!isLoginView && (
                                        <div className="space-y-2">
                                            <Label htmlFor="name">이름 (선생님 성함)</Label>
                                            <Input
                                                id="name"
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                disabled={isLoading}
                                            />
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label htmlFor="email">이메일</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="teacher@school.edu"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">비밀번호</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? "처리 중..." : isLoginView ? "로그인" : "가입하기"}
                                    </Button>

                                    <div className="mt-4 text-center text-sm">
                                        <button
                                            type="button"
                                            onClick={() => setIsLoginView(!isLoginView)}
                                            className="text-primary hover:underline"
                                            disabled={isLoading}
                                        >
                                            {isLoginView ? "계정이 없으신가요? 간편 가입하기" : "이미 계정이 있으신가요? 로그인하기"}
                                        </button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
