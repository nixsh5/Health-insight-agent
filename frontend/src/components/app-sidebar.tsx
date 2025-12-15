    import * as React from "react"

    import { SearchForm } from "@/components/search-form"
    import { VersionSwitcher } from "@/components/version-switcher"
    import {
        Sidebar,
        SidebarContent,
        SidebarGroup,
        SidebarGroupContent,
        SidebarGroupLabel,
        SidebarHeader,
        SidebarMenu,
        SidebarMenuButton,
        SidebarMenuItem,
        SidebarRail,
        SidebarSeparator,
    } from "@/components/ui/sidebar"

    import { HealthAgentCard } from "@/components/health-agent-card"

    // This is sample data.
    const data = {
        versions: ["1.0.1", "1.1.0-alpha"],
        navMain: [
            {
                title: "Getting Started",
                url: "#",
                items: [
                    {
                        title: "Logout",
                        url: "",
                    },
                    {
                        title: "Project Structure",
                        url: "#",
                    },
                ],
            },
        ],
    }

    export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
        return (
            <Sidebar {...props}>
                <SidebarHeader>
                    <VersionSwitcher
                        versions={data.versions}
                        defaultVersion={data.versions[0]}
                    />
                    <SearchForm />
                </SidebarHeader>

                <SidebarContent>
                    {/* Health Agent Widget Section */}
                    <SidebarGroup>
                        <SidebarGroupLabel>Health Insight Agent</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <HealthAgentCard />
                        </SidebarGroupContent>
                    </SidebarGroup>

                    <SidebarSeparator />

                    {/* We create a SidebarGroup for each parent. */}
                    {data.navMain.map((item) => (
                        <SidebarGroup key={item.title}>
                            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {item.items.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton asChild>
                                                <a href={item.url}>{item.title}</a>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    ))}
                </SidebarContent>
                <SidebarRail />
            </Sidebar>
        )
    }
