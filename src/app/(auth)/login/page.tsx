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
import { motion, AnimatePresence } from "framer-motion";

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
            router.push("/student");
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
                <div className="text-center relative py-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-4"
                    >
                        <h1 className="flex flex-col items-center justify-center">
                            <span className="pocketmon-logo text-5xl md:text-6xl italic block transform -rotate-1 skew-x-[-10deg]">
                                POCKETMON
                            </span>
                            <span className="reflection-sub-logo text-sm md:text-base mt-2 block text-glow opacity-80">
                                REFLECTION ULTIMATE
                            </span>
                        </h1>
                    </motion.div>
                    <p className="mt-2 text-sm text-slate-800 dark:text-slate-200 font-bold drop-shadow-sm">
                        포켓몬과 함께 성장하는 성찰 일기 플랫폼
                    </p>
                </div>

                <Tabs defaultValue="student" className="w-full mt-8">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-200 dark:bg-slate-800 border-2 border-black p-1 h-12">
                        <TabsTrigger
                            value="student"
                            className="data-[state=active]:bg-red-600 data-[state=active]:text-white font-black data-[state=active]:border-2 data-[state=active]:border-black"
                        >
                            학생용 (STUDENT)
                        </TabsTrigger>
                        <TabsTrigger
                            value="teacher"
                            className="data-[state=active]:bg-blue-700 data-[state=active]:text-white font-black data-[state=active]:border-2 data-[state=active]:border-black"
                        >
                            교사용 (TEACHER)
                        </TabsTrigger>
                    </TabsList>

                    {/* 학생 로그인 패널 */}
                    <TabsContent value="student">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            <Card className="retro-box overflow-hidden">
                                <CardHeader className="border-b-2 border-black bg-slate-50 dark:bg-slate-900">
                                    <CardTitle className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse border border-black shadow-[1px_1px_0_0_#000]" />
                                        학생 입장 (ENTER)
                                    </CardTitle>
                                    <CardDescription className="text-slate-600 dark:text-slate-400 font-bold">
                                        선생님이 알려주신 세션 코드와 학번 정보를 입력하세요.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <form onSubmit={handleStudentSubmit} className="space-y-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="sessionCode" className="font-black">SESSION CODE</Label>
                                            <Input
                                                id="sessionCode"
                                                placeholder="예) POKE1234"
                                                className="border-2 border-black focus-visible:ring-0 focus-visible:border-red-500 h-12 text-lg font-bold"
                                                value={sessionCode}
                                                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                                                disabled={isLoading}
                                            />
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="space-y-1">
                                                <Label htmlFor="grade" className="text-xs font-black">GRADE</Label>
                                                <Input id="grade" type="number" className="border-2 border-black h-12 text-center font-bold" value={grade} onChange={(e) => setGrade(e.target.value)} disabled={isLoading} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="classNum" className="text-xs font-black">CLASS</Label>
                                                <Input id="classNum" type="number" className="border-2 border-black h-12 text-center font-bold" value={classNum} onChange={(e) => setClassNum(e.target.value)} disabled={isLoading} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="studentNum" className="text-xs font-black">NUMBER</Label>
                                                <Input id="studentNum" type="number" className="border-2 border-black h-12 text-center font-bold" value={studentNum} onChange={(e) => setStudentNum(e.target.value)} disabled={isLoading} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="studentName" className="font-black">NAME</Label>
                                            <Input
                                                id="studentName"
                                                placeholder="이름 입력"
                                                className="border-2 border-black h-12 font-bold"
                                                value={studentName}
                                                onChange={(e) => setStudentName(e.target.value)}
                                                disabled={isLoading}
                                            />
                                        </div>
                                        <Button type="submit" className="pokeball-button w-full h-14 text-xl" disabled={isLoading}>
                                            {isLoading ? "확인 중..." : "입장하기 (CONTINUE)"}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </TabsContent>

                    {/* 교사 로그인 패널 */}
                    <TabsContent value="teacher">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            <Card className="retro-box overflow-hidden">
                                <CardHeader className="border-b-2 border-black bg-slate-50 dark:bg-slate-900">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse border border-black shadow-[1px_1px_0_0_#000]" />
                                                교사 {isLoginView ? "로그인" : "회원가입"}
                                            </CardTitle>
                                            <CardDescription className="text-slate-600 dark:text-slate-400 font-bold">
                                                선생님 전용 관리 페이지에 접속합니다.
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <form onSubmit={handleTeacherSubmit} className="space-y-4">
                                        {!isLoginView && (
                                            <div className="space-y-2">
                                                <Label htmlFor="name" className="font-black">NAME</Label>
                                                <Input
                                                    id="name"
                                                    type="text"
                                                    className="border-2 border-black h-12 font-bold"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    disabled={isLoading}
                                                />
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="font-black">EMAIL</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="teacher@school.edu"
                                                className="border-2 border-black h-12 font-bold"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                disabled={isLoading}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="password" className="font-black">PASSWORD</Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                className="border-2 border-black h-12 font-bold"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                disabled={isLoading}
                                            />
                                        </div>
                                        <Button type="submit" className="retro-btn bg-blue-700 hover:bg-blue-600 text-white w-full h-14 text-xl" disabled={isLoading}>
                                            {isLoading ? "처리 중..." : isLoginView ? "LOGIN" : "SIGN UP"}
                                        </Button>

                                        <div className="mt-4 text-center">
                                            <button
                                                type="button"
                                                onClick={() => setIsLoginView(!isLoginView)}
                                                className="text-primary hover:underline font-bold text-sm"
                                                disabled={isLoading}
                                            >
                                                {isLoginView ? "계정이 없으신가요? 간편 가입하기" : "이미 계정이 있으신가요? 로그인하기"}
                                            </button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
