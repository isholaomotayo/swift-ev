"use client";

import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MailListItemProps {
  email: {
    _id: string;
    from: string;
    fromName?: string;
    to: string[];
    subject: string;
    snippet?: string;
    isRead: boolean;
    isStarred: boolean;
    labels?: string[];
    createdAt: number;
    folder: string;
  };
  isSelected: boolean;
  onClick: () => void;
}

function getInitials(name: string, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email.charAt(0).toUpperCase();
}

function getSenderDisplay(email: MailListItemProps["email"]): string {
  if (email.folder === "sent" || email.folder === "drafts") {
    return `To: ${email.to[0]}`;
  }
  return email.fromName || email.from;
}

export function MailListItem({ email, isSelected, onClick }: MailListItemProps) {
  const senderDisplay = getSenderDisplay(email);
  const initials = email.folder === "sent" || email.folder === "drafts"
    ? email.to[0]?.charAt(0).toUpperCase() || "?"
    : getInitials(email.fromName || "", email.from);

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full flex-col gap-1 border-b border-border p-4 text-left transition-colors hover:bg-muted/50",
        isSelected && "bg-muted",
        !email.isRead && "bg-muted/30"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
            email.isRead
              ? "bg-muted text-muted-foreground"
              : "bg-electric-blue/10 text-electric-blue"
          )}
        >
          {initials}
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "truncate text-sm",
                !email.isRead ? "font-bold text-foreground" : "text-foreground"
              )}
            >
              {senderDisplay}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(email.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
      </div>

      <div className="pl-11">
        <p
          className={cn(
            "truncate text-sm",
            !email.isRead ? "font-semibold text-foreground" : "text-foreground"
          )}
        >
          {email.subject || "(no subject)"}
        </p>
        {email.snippet && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {email.snippet}
          </p>
        )}
        {email.labels && email.labels.length > 0 && (
          <div className="mt-1.5 flex gap-1">
            {email.labels.map((label) => (
              <Badge key={label} variant="secondary" className="text-xs px-1.5 py-0">
                {label}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
