"use client"

import * as React from "react"
import { Moon, Sun, ArrowUpIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { IconPlus } from "@tabler/icons-react"

import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupTextarea,
    InputGroupText,
} from "@/components/ui/input-group"

export default function Page() {
    const { setTheme } = useTheme()
    const router = useRouter()

    const [text, setText] = React.useState("")
    const [file, setFile] = React.useState<File | null>(null)
    const [error, setError] = React.useState<string | null>(null)
    const [loading, setLoading] = React.useState(false)
    const [responseText, setResponseText] = React.useState<string>("")

    const fileInputRef = React.useRef<HTMLInputElement>(null)

    async function handleLogout() {
        await fetch("/api/logout", { method: "POST" })
        router.push("/")
    }

    function ModeToggle() {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                        <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                        <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        )
    }

    function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        setError(null)
        const selected = e.target.files?.[0] ?? null
        if (selected && selected.type !== "application/pdf") {
            setError("Only PDF files are allowed.")
            setFile(null)
            e.target.value = ""
            return
        }
        setFile(selected)
    }

    async function trySend() {
        if (!text.trim() && !file) {
            setError("Please enter text or attach a PDF file before sending.")
            return
        }
        setError(null)
        setLoading(true)
        setResponseText("")

        try {
            // Minimal prototype: send only the query text, no PDF parsing
            const resp = await fetch("/api/ai/chat-with-pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: text.trim(), text: "" }),
            })

            const data = await resp.json()
            if (!resp.ok) {
                setError(data.message || "Request failed")
                return
            }

            const answer =
                typeof data === "string"
                    ? data
                    : Array.isArray(data)
                        ? (data[0]?.generated_text || JSON.stringify(data))
                        : data.generated_text || data.answer || JSON.stringify(data)

            setResponseText(answer)

            // Reset inputs after send
            setText("")
            setFile(null)
            if (fileInputRef.current) fileInputRef.current.value = ""
        } catch (e: any) {
            setError(e.message || "Unexpected error")
        } finally {
            setLoading(false)
        }
    }

    function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            void trySend()
        }
    }

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 justify-between">
                    <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="#">Building Your Application</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Data Fetching</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                    <div className="flex items-center gap-2">
                        <ModeToggle />
                        <Button variant="destructive" onClick={handleLogout}>
                            Logout
                        </Button>
                    </div>
                </header>

                <div className="flex-1 flex flex-col gap-4 p-4 pb-32 relative">
                    {/* Optional: show the latest model reply */}
                    {loading && <p className="text-sm text-muted-foreground">Sending...</p>}
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    {responseText && (
                        <div className="rounded-md border p-3 whitespace-pre-wrap">
                            {responseText}
                        </div>
                    )}
                </div>

                <div className="absolute bottom-0 left-0 right-0 pb-4 flex justify-center pointer-events-none">
                    <div className="w-full max-w-2xl pointer-events-auto">
                        <InputGroup>
                            <InputGroupTextarea
                                placeholder="Ask, Search or Chat..."
                                className="w-full"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                onKeyDown={onKeyDown}
                                rows={2}
                            />
                            <InputGroupAddon align="block-end">
                                <InputGroupButton
                                    variant="outline"
                                    className="rounded-full"
                                    size="icon-xs"
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Attach PDF"
                                >
                                    <IconPlus />
                                </InputGroupButton>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="application/pdf"
                                    className="hidden"
                                    onChange={onFileChange}
                                />
                                {file && <InputGroupText className="ml-2 max-w-[10ch] truncate">{file.name}</InputGroupText>}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <InputGroupButton variant="ghost">Auto</InputGroupButton>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent side="top" align="start" className="[--radius:0.95rem]">
                                        <DropdownMenuItem>Auto</DropdownMenuItem>
                                        <DropdownMenuItem>Agent</DropdownMenuItem>
                                        <DropdownMenuItem>Manual</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <Separator orientation="vertical" className="!h-4" />
                                <InputGroupButton
                                    variant="default"
                                    className="rounded-full"
                                    size="icon-xs"
                                    onClick={trySend}
                                    title="Send"
                                    disabled={loading}
                                >
                                    <ArrowUpIcon />
                                    <span className="sr-only">Send</span>
                                </InputGroupButton>
                            </InputGroupAddon>
                        </InputGroup>
                        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
