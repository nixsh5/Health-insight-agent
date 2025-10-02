// src/components/login-form.tsx
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Label } from "@/components/ui/label"

interface LoginData {
    email: string
    password: string
}

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setError,
    } = useForm<LoginData>()

    const router = useRouter()

    async function onSubmit(data: LoginData) {
        try {
            // Post to your Next.js API route so it can set an HttpOnly cookie (auth_token)
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })

            // Try parse JSON for error detail if any
            const json = await res.json().catch(() => ({} as any))

            if (!res.ok) {
                const message = json?.message || "Login failed"
                setError("root", { message })
                return
            }

            // No need to use localStorage; cookie is set by the API route.
            // Navigate to dashboard; middleware will now allow it.
            router.push("/dashboard")
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unexpected error"
            setError("root", { message })
        }
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card className="overflow-hidden bg-card/80 backdrop-blur p-0">
                <CardContent className="grid p-0 md:grid-cols-2">
                    <form className="p-6 md:p-8" onSubmit={handleSubmit(onSubmit)} noValidate>
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col items-center text-center">
                                <h1 className="text-2xl font-bold">Welcome back</h1>
                                <p className="text-muted-foreground text-balance">
                                    Login to your Pulselyx account
                                </p>
                            </div>

                            <div className="grid gap-3">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="m@example.com"
                                    {...register("email", { required: "Email is required" })}
                                />
                                {errors.email && (
                                    <p className="text-red-500 text-xs">{errors.email.message}</p>
                                )}
                            </div>

                            <div className="grid gap-3">
                                <div className="flex items-center">
                                    <Label htmlFor="password">Password</Label>
                                    <a
                                        href="#"
                                        className="ml-auto text-sm underline-offset-2 hover:underline"
                                    >
                                        Forgot your password?
                                    </a>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    {...register("password", { required: "Password is required" })}
                                />
                                {errors.password && (
                                    <p className="text-red-500 text-xs">{errors.password.message}</p>
                                )}
                            </div>

                            {/* Root-level form error (from server) */}
                            {"root" in errors && (errors as any).root?.message && (
                                <p className="text-red-500 text-xs">
                                    {(errors as any).root.message}
                                </p>
                            )}

                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? "Logging in..." : "Login"}
                            </Button>

                            <div className="after:border-border relative text-center text-sm">
                                <span className="bg-card/0 relative z-10 px-2">Or continue with</span>
                            </div>

                            <div>
                                <Button
                                    variant="outline"
                                    type="button"
                                    className="w-full"
                                    aria-label="Login with Google"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                        className="h-4 w-4"
                                    >
                                        <path
                                            d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                                            fill="currentColor"
                                        />
                                    </svg>
                                </Button>
                            </div>

                            <div className="text-center text-sm">
                                Don&apos;t have an account?{" "}
                                <a href="/signup" className="underline underline-offset-4">
                                    Sign up
                                </a>
                            </div>
                        </div>
                    </form>

                    <div className="bg-muted relative hidden md:block">
                        <Image
                            src="/2.jpg"
                            alt="Image"
                            layout="fill"
                            className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
