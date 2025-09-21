"use client"

import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import { OTPVerifyForm } from "@/components/OTPVerifyForm"
import * as React from "react"

export default function OtpVerifyPage() {
    const searchParams = useSearchParams()
    const email = searchParams.get("email") || ""

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted">
            <Card className="w-full max-w-md p-0 overflow-hidden bg-card/80 backdrop-blur">
                <CardContent className="grid grid-cols-1 md:grid-cols-2 p-0">
                    {/* Left side with OTP form */}
                    <div className="p-6 md:p-8 flex flex-col gap-6">
                        <div className="text-center mb-4">
                            <h1 className="text-2xl font-bold">Verify Your Email</h1>
                            <p className="text-sm text-muted-foreground">
                                Enter the OTP sent to <br /> <strong>{email}</strong>
                            </p>
                        </div>

                        <OTPVerifyForm email={email} />
                    </div>

                    {/* Right side image */}
                    <div className="hidden md:block relative">

                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
