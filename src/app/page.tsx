'use client';

import Image from "next/image";
import { Card, CardContent, CardHeader, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import "@/app/globals.css";
import { useEffect,useState } from "react";
import { trpc } from "../../utils/providers/TrpcProviders";
import  Loading from "./loading";
import { redirect } from "next/navigation";
import FigmaBackground from "./_components/figmabg";


export default function Home() {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginForm, setLoginForm]= useState({
    email: '',
    password: ''
  })
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [ErrorMessage, setErrorMessage] = useState<string | null>(null);  

  const data = trpc.sampleProcedure.useQuery();
  const LoginData = trpc.auth.login.useMutation();
  const RegisterData = trpc.auth.register.useMutation();
  const CurrentUser = trpc.auth.getCurrentUser.useQuery({},{
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (prev) => prev,
    retry:false,
  });

  useEffect(() => {
  if (LoginData.isError) {
    setErrorMessage(LoginData.error.message);
  }
  if (LoginData.isSuccess) {
    CurrentUser.refetch();
  }
}, [LoginData.isError,LoginData.isSuccess, LoginData.error]);

  useEffect(() => {
    if (RegisterData.isError) {
      setErrorMessage(RegisterData.error.message);
    }
    if(RegisterData.isSuccess){
      CurrentUser.refetch();
    } 
  }, [RegisterData.isError,RegisterData.isSuccess, RegisterData.error]);

  useEffect(() => {
  let timeoutId: NodeJS.Timeout | null = null;
  if (ErrorMessage) {
    timeoutId = setTimeout(() => {
      setErrorMessage(null);
    }, 5000);
  }
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
}, [ErrorMessage]);

  useEffect(() => {
    if(CurrentUser.data){
      redirect(`/${CurrentUser.data.role}`);
    }
  }, [CurrentUser.data]);

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setLoginForm(prev => ({ ...prev, [id]: value }));
  };
  
  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setRegisterForm(prev => ({ ...prev, [id]: value }));
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login data:", loginForm);
    LoginData.mutate({ email: loginForm.email, password: loginForm.password });
  };
  
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Register data:", registerForm);
    RegisterData.mutate({
      username: registerForm.name,
      email: registerForm.email,
      password: registerForm.password,
      confirmPassword: registerForm.confirmPassword
    })
  };

  if(data.isLoading || CurrentUser.isLoading) {
    return (
      <Loading />
    )
  }


  return (
    <>
      <FigmaBackground />
      <div className="min-h-screen w-full flex items-center justify-center p-4">
        <div className="flex flex-col items-center">
          {ErrorMessage && (
            <div 
              className="bg-red-100 text-red-800 p-4 rounded-md mb-4 border-double border-2 border-red-200 transition-opacity duration-300 animate-fade-in"
              style={{
                animation: ErrorMessage ? 'fadeIn 0.3s, fadeOut 0.5s 4.5s' : undefined
              }}
            >
              <p>{ErrorMessage}</p>
            </div>
          )}
          <h1
            className="text-[clamp(2rem,5vw,4rem)] font-bold  mb-8 bg-gradient-to-r from-blue-500 to-blue-400 bg-clip-text text-transparent animate-fade-slide-up"
            style={{
              textShadow: "0 0 20px rgba(59, 130, 246, 0.3)",
              opacity: 0
            }}
          >
            Connect Friend
          </h1>
          <Card
            className="w-[clamp(320px,80vw,450px)] animate-scale-in"
            style={{
              opacity: 0,
              animationDelay: "0.5s"
            }}
          >
            <CardHeader>
              <div className="flex justify-between items-center mb-2">
                <CardTitle className="text-blue-500">
                  {authMode === "login" ? "Log In" : "Host Registration"}
                </CardTitle>
                <div className="bg-slate-100 rounded-full p-1">
                  <Button
                    variant={authMode === "login" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-full px-3 text-xs"
                    onClick={() => setAuthMode("login")}
                  >
                    Log In
                  </Button>
                  <Button
                    variant={authMode === "register" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-full px-3 text-xs "
                    onClick={() => setAuthMode("register")}
                  >
                    Register
                  </Button>
                </div>
              </div>
              <CardDescription>
                {authMode === "login"
                  ? "Enter your credentials to continue"
                  : "Create a host account to invite friends"}
              </CardDescription>
            </CardHeader>
            <CardContent className="relative overflow-hidden">
              {authMode === "login" ? (
                <form
                  onSubmit={handleLoginSubmit}
                  className={`space-y-4 transition-all duration-300 ${
                    authMode === "login"
                      ? "animate-slide-in-left"
                      : "absolute inset-0 opacity-0 pointer-events-none"
                  }`}
                >
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      placeholder="your@email.com"
                      value={loginForm.email}
                      onChange={handleLoginChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="password">Password</Label>
                      <Button
                        variant="link"
                        className="p-0 h-auto text-xs text-blue-500"
                        type="button"
                        onClick={() => {
                          /* Handle forgot password */
                        }}
                      >
                        Forgot password?
                      </Button>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      value={loginForm.password}
                      onChange={handleLoginChange}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-blue-500 hover:bg-blue-600"
                  >
                    Log In
                  </Button>

                  {/* Divider and Google OAuth remain the same */}
                </form>
              ) : (
                <form
                  onSubmit={handleRegisterSubmit}
                  className={`space-y-4 transition-all duration-300 ${
                    authMode === "register"
                      ? "animate-slide-in-right"
                      : "absolute inset-0 opacity-0 pointer-events-none"
                  }`}
                >
                  {/* Host badge remains the same */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Your Name</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={registerForm.name}
                      onChange={handleRegisterChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      placeholder="your@email.com"
                      value={registerForm.email}
                      onChange={handleRegisterChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={registerForm.password}
                      onChange={handleRegisterChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={registerForm.confirmPassword}
                      onChange={handleRegisterChange}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-blue-500 hover:bg-blue-600"
                  >
                    Create Host Account
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    After registration, you'll be able to invite friends
                  </p>
                </form>
              )}
            </CardContent>
            <CardFooter className="flex justify-center border-t pt-4">
              <p className="text-sm text-slate-500">
                {authMode === "login"
                  ? "New here? Switch to Register to become a host"
                  : "Friends will join through your invitation link"}
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}
