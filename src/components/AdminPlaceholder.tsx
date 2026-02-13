import { Construction } from "lucide-react";

export default function AdminPlaceholder({ title }: { title: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4 animate-in fade-in duration-500">
            <div className="p-4 bg-muted rounded-full">
                <Construction className="h-12 w-12 text-muted-foreground" />
            </div>
            <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
                <p className="text-muted-foreground max-w-sm">
                    This module is currently under development. Check back soon for updates.
                </p>
            </div>
        </div>
    );
}
