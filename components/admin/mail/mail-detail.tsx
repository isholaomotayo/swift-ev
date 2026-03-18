"use client";

import { useMemo } from "react";
import { formatDistanceToNow, format } from "date-fns";
import DOMPurify from "dompurify";
import {
  Archive,
  Trash2,
  Reply,
  Forward,
  Star,
  MailOpen,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EmailDetail {
  _id: string;
  direction: "inbound" | "outbound";
  from: string;
  fromName?: string;
  to: string[];
  cc?: string[];
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  isRead: boolean;
  isStarred: boolean;
  labels?: string[];
  deliveryStatus?: string;
  createdAt: number;
  sentAt?: number;
  receivedAt?: number;
  folder: string;
}

interface MailDetailProps {
  email: EmailDetail | null;
  onArchive: () => void;
  onTrash: () => void;
  onReply: () => void;
  onForward: () => void;
  onStar: () => void;
  onToggleRead: () => void;
}

export function MailDetail({
  email,
  onArchive,
  onTrash,
  onReply,
  onForward,
  onStar,
  onToggleRead,
}: MailDetailProps) {
  const sanitizedHtml = useMemo(() => {
    if (!email?.bodyHtml) return "";
    return DOMPurify.sanitize(email.bodyHtml, {
      ALLOWED_TAGS: [
        "p", "br", "strong", "em", "u", "a", "ul", "ol", "li",
        "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre",
        "code", "span", "div", "img", "table", "thead", "tbody",
        "tr", "td", "th", "hr",
      ],
      ALLOWED_ATTR: [
        "href", "target", "rel", "src", "alt", "width", "height",
        "style", "class",
      ],
    });
  }, [email?.bodyHtml]);

  if (!email) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Mail className="mx-auto h-12 w-12 opacity-30" />
          <p className="mt-2 text-sm">Select an email to read</p>
        </div>
      </div>
    );
  }

  const displayDate = email.sentAt || email.receivedAt || email.createdAt;

  return (
    <div className="flex h-full flex-col">
      {/* Action Bar */}
      <div className="flex items-center gap-1 border-b border-border p-2">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onArchive}
              >
                <Archive className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Archive</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onTrash}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Move to trash</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="mx-1 h-5" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onToggleRead}
              >
                {email.isRead ? (
                  <MailOpen className="h-4 w-4" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {email.isRead ? "Mark as unread" : "Mark as read"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${email.isStarred ? "text-yellow-500" : ""}`}
                onClick={onStar}
              >
                <Star
                  className="h-4 w-4"
                  fill={email.isStarred ? "currentColor" : "none"}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {email.isStarred ? "Unstar" : "Star"}
            </TooltipContent>
          </Tooltip>

          <div className="flex-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onReply}
              >
                <Reply className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reply</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onForward}
              >
                <Forward className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Forward</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Email Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-electric-blue/10 text-sm font-bold text-electric-blue">
            {(email.fromName || email.from).charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-sm">
                  {email.fromName || email.from}
                </p>
                <p className="text-xs text-muted-foreground">{email.from}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {format(new Date(displayDate), "MMM d, yyyy h:mm a")}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-1 text-xs text-muted-foreground">
              <span>To: {email.to.join(", ")}</span>
              {email.cc && email.cc.length > 0 && (
                <span>| Cc: {email.cc.join(", ")}</span>
              )}
            </div>
            {email.deliveryStatus && email.direction === "outbound" && (
              <Badge
                variant="secondary"
                className="mt-1 text-xs capitalize"
              >
                {email.deliveryStatus}
              </Badge>
            )}
          </div>
        </div>
        <h2 className="mt-3 text-lg font-bold">{email.subject || "(no subject)"}</h2>
        {email.labels && email.labels.length > 0 && (
          <div className="mt-2 flex gap-1">
            {email.labels.map((label) => (
              <Badge key={label} variant="outline" className="text-xs">
                {label}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Email Body */}
      <ScrollArea className="flex-1 p-4">
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
        {!sanitizedHtml && email.bodyText && (
          <pre className="whitespace-pre-wrap text-sm text-foreground">
            {email.bodyText}
          </pre>
        )}
      </ScrollArea>
    </div>
  );
}
