"use client"

import * as React from "react"
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp"
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface OTPVerifyFormProps {
    email: string
}

export function OTPVerifyForm({ email }: OTPVerifyFormProps) {
    const [otp, setOtp] = React.useState("")
    const [error, setError] = React.useState("")
    const [isLoading, setIsLoading] = React.useState(false)
    const router = useRouter()

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (otp.length !== 6) {
            setError("Please enter a 6-digit OTP")
            return
        }
        setError("")
        setIsLoading(true)
        try {
            const res = await fetch("/api/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.message || "Failed to verify OTP")

            localStorage.setItem("token", data.token)
            router.push("/dashboard")
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message)
            } else {
                setError("Unknown error")
            }
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={onSubmit} className="flex flex-col gap-4 max-w-md mx-auto p-6 bg-white rounded-md shadow-md">
            <h2 className="text-xl font-semibold text-center">Enter OTP</h2>
            <p className="text-center text-sm text-muted-foreground mb-4">
                Enter the OTP sent to <strong>{email}</strong>
            </p>

            <InputOTP maxLength={6} pattern={REGEXP_ONLY_DIGITS_AND_CHARS} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                </InputOTPGroup>
            </InputOTP>

            {error && <p className="text-red-600 text-sm text-center">{error}</p>}

            <Button type="submit" disabled={isLoading} className="mt-4">
                {isLoading ? "Verifying..." : "Verify OTP"}
            </Button>
        </form>
    )
}
