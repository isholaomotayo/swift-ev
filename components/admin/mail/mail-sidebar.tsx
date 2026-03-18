"use client";

import {
  Inbox,
  Send,
  FileText,
  Trash2,
  Archive,
  PenSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MailFolder = "inbox" | "sent" | "drafts" | "trash" | "archive";

interface MailStats {
  inbox: number;
  inboxUnread: number;
  sent: number;
  drafts: number;
  trash: number;
  archive: number;
}

interface MailSidebarProps {
  currentFolder: MailFolder;
  onFolderChange: (folder: MailFolder) => void;
  onCompose: () => void;
  stats: MailStats | null;
}

const folders: {
  name: string;
  value: MailFolder;
  icon: React.ComponentType<{ className?: string }>;
  countKey: keyof MailStats;
  showUnread?: boolean;
}[] = [
  { name: "Inbox", value: "inbox", icon: Inbox, countKey: "inbox", showUnread: true },
  { name: "Drafts", value: "drafts", icon: FileText, countKey: "drafts" },
  { name: "Sent", value: "sent", icon: Send, countKey: "sent" },
  { name: "Trash", value: "trash", icon: Trash2, countKey: "trash" },
  { name: "Archive", value: "archive", icon: Archive, countKey: "archive" },
];

export function MailSidebar({
  currentFolder,
  onFolderChange,
  onCompose,
  stats,
}: MailSidebarProps) {
  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <Button onClick={onCompose} className="w-full gap-2">
        <PenSquare className="h-4 w-4" />
        Compose
      </Button>

      <nav className="mt-4 flex flex-col gap-1">
        {folders.map((folder) => {
          const Icon = folder.icon;
          const isActive = currentFolder === folder.value;
          const count = stats ? stats[folder.countKey] : 0;
          const unreadCount = folder.showUnread && stats ? stats.inboxUnread : 0;

          return (
            <button
              key={folder.value}
              onClick={() => onFolderChange(folder.value)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-electric-blue/10 text-electric-blue"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{folder.name}</span>
              {folder.showUnread && unreadCount > 0 ? (
                <span className="rounded-full bg-electric-blue px-2 py-0.5 text-xs font-bold text-white">
                  {unreadCount}
                </span>
              ) : count > 0 ? (
                <span className="text-xs text-muted-foreground">{count}</span>
              ) : null}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
