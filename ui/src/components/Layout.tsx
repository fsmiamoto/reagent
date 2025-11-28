import React from 'react';
import { cn } from '../lib/utils';

interface LayoutProps {
    sidebar?: React.ReactNode;
    rightSidebar?: React.ReactNode;
    header: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}

export function Layout({ sidebar, rightSidebar, header, children, className }: LayoutProps) {
    return (
        <div className={cn("flex h-screen w-full overflow-hidden bg-background text-foreground", className)}>
            {sidebar && (
                <aside className="w-64 flex-shrink-0 border-r border-border bg-card">
                    {sidebar}
                </aside>
            )}

            <div className="flex flex-1 flex-col min-w-0">
                {/* Header */}
                {header}

                <div className="flex flex-1 overflow-hidden">
                    <main className="flex-1 overflow-auto">
                        {children}
                    </main>

                    {rightSidebar && (
                        <aside className="w-80 flex-shrink-0 border-l border-border bg-card">
                            {rightSidebar}
                        </aside>
                    )}
                </div>
            </div>
        </div>
    );
}
