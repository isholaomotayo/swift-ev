"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MailListItem } from "./mail-list-item";
import type { MailFolder } from "./mail-sidebar";

interface Email {
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
}

interface MailListProps {
  emails: Email[];
  selectedEmailId: string | null;
  onSelectEmail: (emailId: string) => void;
  currentFolder: MailFolder;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterTab: "all" | "unread";
  onFilterTabChange: (tab: "all" | "unread") => void;
}

const folderTitles: Record<MailFolder, string> = {
  inbox: "Inbox",
  sent: "Sent",
  drafts: "Drafts",
  trash: "Trash",
  archive: "Archive",
};

export function MailList({
  emails,
  selectedEmailId,
  onSelectEmail,
  currentFolder,
  searchQuery,
  onSearchChange,
  filterTab,
  onFilterTabChange,
}: MailListProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{folderTitles[currentFolder]}</h2>
          <Tabs
            value={filterTab}
            onValueChange={(v) => onFilterTabChange(v as "all" | "unread")}
          >
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs px-3 py-1">
                All mail
              </TabsTrigger>
              <TabsTrigger value="unread" className="text-xs px-3 py-1">
                Unread
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Email List */}
      <ScrollArea className="flex-1">
        {emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm">No emails in {folderTitles[currentFolder].toLowerCase()}</p>
          </div>
        ) : (
          emails.map((email) => (
            <MailListItem
              key={email._id}
              email={email}
              isSelected={selectedEmailId === email._id}
              onClick={() => onSelectEmail(email._id)}
            />
          ))
        )}
      </ScrollArea>
    </div>
  );
}
