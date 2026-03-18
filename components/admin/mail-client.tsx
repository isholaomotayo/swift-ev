"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { MailSidebar, type MailFolder } from "./mail/mail-sidebar";
import { MailList } from "./mail/mail-list";
import { MailDetail } from "./mail/mail-detail";
import { MailCompose } from "./mail/mail-compose";

interface MailClientProps {
  initialEmails: any;
  initialStats: any;
  token: string;
}

export function MailClient({ initialEmails, initialStats, token }: MailClientProps) {
  const [currentFolder, setCurrentFolder] = useState<MailFolder>("inbox");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "unread">("all");
  const [isSending, setIsSending] = useState(false);

  // Real-time queries
  const emailsData = useQuery(api.adminMail.listEmails, {
    token,
    folder: currentFolder,
    unreadOnly: filterTab === "unread" ? true : undefined,
    limit: 50,
  });

  const mailStats = useQuery(api.adminMail.getMailStats, { token });

  const selectedEmail = useQuery(
    api.adminMail.getEmail,
    selectedEmailId
      ? { token, emailId: selectedEmailId as Id<"adminEmails"> }
      : "skip"
  );

  const searchResults = useQuery(
    api.adminMail.searchEmails,
    searchQuery.trim().length > 1
      ? { token, query: searchQuery, folder: currentFolder }
      : "skip"
  );

  // Mutations
  const markAsReadMutation = useMutation(api.adminMail.markAsRead);
  const moveToFolderMutation = useMutation(api.adminMail.moveToFolder);
  const starEmailMutation = useMutation(api.adminMail.starEmail);
  const sendEmailMutation = useMutation(api.adminMail.sendEmail);
  const saveDraftMutation = useMutation(api.adminMail.saveDraft);

  // Use real-time data, fallback to initial data
  const emails = searchQuery.trim().length > 1
    ? searchResults || []
    : emailsData?.emails || initialEmails?.emails || [];
  const stats = mailStats || initialStats;

  // Auto-mark as read when selecting email
  useEffect(() => {
    if (selectedEmail && !selectedEmail.isRead) {
      markAsReadMutation({
        token,
        emailId: selectedEmail._id,
        isRead: true,
      }).catch(console.error);
    }
  }, [selectedEmail?._id, selectedEmail?.isRead]);

  // Clear selection when changing folders
  const handleFolderChange = useCallback((folder: MailFolder) => {
    setCurrentFolder(folder);
    setSelectedEmailId(null);
    setSearchQuery("");
    setFilterTab("all");
  }, []);

  const handleSelectEmail = useCallback((emailId: string) => {
    setSelectedEmailId(emailId);
  }, []);

  const handleCompose = useCallback(() => {
    setComposeData(null);
    setComposeOpen(true);
  }, []);

  const handleReply = useCallback(() => {
    if (!selectedEmail) return;
    setComposeData({
      to: selectedEmail.from,
      subject: selectedEmail.subject.startsWith("Re:")
        ? selectedEmail.subject
        : `Re: ${selectedEmail.subject}`,
      body: `\n\n---\nOn ${new Date(selectedEmail.createdAt).toLocaleString()}, ${selectedEmail.fromName || selectedEmail.from} wrote:\n> ${selectedEmail.bodyText || ""}`,
      inReplyTo: selectedEmail._id,
    });
    setComposeOpen(true);
  }, [selectedEmail]);

  const handleForward = useCallback(() => {
    if (!selectedEmail) return;
    setComposeData({
      to: "",
      subject: selectedEmail.subject.startsWith("Fwd:")
        ? selectedEmail.subject
        : `Fwd: ${selectedEmail.subject}`,
      body: `\n\n---\nForwarded message:\nFrom: ${selectedEmail.fromName || selectedEmail.from}\nDate: ${new Date(selectedEmail.createdAt).toLocaleString()}\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.bodyText || ""}`,
    });
    setComposeOpen(true);
  }, [selectedEmail]);

  const handleArchive = useCallback(async () => {
    if (!selectedEmailId) return;
    await moveToFolderMutation({
      token,
      emailId: selectedEmailId as Id<"adminEmails">,
      folder: "archive",
    });
    setSelectedEmailId(null);
  }, [selectedEmailId, token, moveToFolderMutation]);

  const handleTrash = useCallback(async () => {
    if (!selectedEmailId) return;
    await moveToFolderMutation({
      token,
      emailId: selectedEmailId as Id<"adminEmails">,
      folder: "trash",
    });
    setSelectedEmailId(null);
  }, [selectedEmailId, token, moveToFolderMutation]);

  const handleStar = useCallback(async () => {
    if (!selectedEmailId) return;
    await starEmailMutation({
      token,
      emailId: selectedEmailId as Id<"adminEmails">,
    });
  }, [selectedEmailId, token, starEmailMutation]);

  const handleToggleRead = useCallback(async () => {
    if (!selectedEmail) return;
    await markAsReadMutation({
      token,
      emailId: selectedEmail._id,
      isRead: !selectedEmail.isRead,
    });
  }, [selectedEmail, token, markAsReadMutation]);

  const handleSend = useCallback(
    async (data: {
      to: string;
      cc: string;
      bcc: string;
      subject: string;
      body: string;
      inReplyTo?: string;
      draftId?: string;
    }) => {
      setIsSending(true);
      try {
        const toAddresses = data.to
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean);
        const ccAddresses = data.cc
          ? data.cc
              .split(",")
              .map((e) => e.trim())
              .filter(Boolean)
          : undefined;
        const bccAddresses = data.bcc
          ? data.bcc
              .split(",")
              .map((e) => e.trim())
              .filter(Boolean)
          : undefined;

        await sendEmailMutation({
          token,
          to: toAddresses,
          cc: ccAddresses && ccAddresses.length > 0 ? ccAddresses : undefined,
          bcc: bccAddresses && bccAddresses.length > 0 ? bccAddresses : undefined,
          subject: data.subject,
          bodyHtml: `<div style="font-family:Arial,sans-serif;">${data.body.replace(/\n/g, "<br>")}</div>`,
          bodyText: data.body,
          inReplyTo: data.inReplyTo
            ? (data.inReplyTo as Id<"adminEmails">)
            : undefined,
          draftId: data.draftId
            ? (data.draftId as Id<"adminEmails">)
            : undefined,
        });
        setComposeOpen(false);
        setComposeData(null);
      } catch (error) {
        console.error("Failed to send email:", error);
      } finally {
        setIsSending(false);
      }
    },
    [token, sendEmailMutation]
  );

  const handleSaveDraft = useCallback(
    async (data: {
      to: string;
      cc: string;
      bcc: string;
      subject: string;
      body: string;
      inReplyTo?: string;
      draftId?: string;
    }) => {
      try {
        const toAddresses = data.to
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean);
        const ccAddresses = data.cc
          ? data.cc
              .split(",")
              .map((e) => e.trim())
              .filter(Boolean)
          : undefined;

        await saveDraftMutation({
          token,
          draftId: data.draftId
            ? (data.draftId as Id<"adminEmails">)
            : undefined,
          to: toAddresses,
          cc: ccAddresses && ccAddresses.length > 0 ? ccAddresses : undefined,
          subject: data.subject,
          bodyHtml: `<div style="font-family:Arial,sans-serif;">${data.body.replace(/\n/g, "<br>")}</div>`,
          bodyText: data.body,
          inReplyTo: data.inReplyTo
            ? (data.inReplyTo as Id<"adminEmails">)
            : undefined,
        });
        setComposeOpen(false);
        setComposeData(null);
      } catch (error) {
        console.error("Failed to save draft:", error);
      }
    },
    [token, saveDraftMutation]
  );

  return (
    <div className="h-[calc(100vh-6rem)] rounded-lg border border-border bg-card overflow-hidden">
      <ResizablePanelGroup orientation="horizontal">
        {/* Sidebar */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={25}>
          <MailSidebar
            currentFolder={currentFolder}
            onFolderChange={handleFolderChange}
            onCompose={handleCompose}
            stats={stats}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Email List */}
        <ResizablePanel defaultSize={35} minSize={25}>
          <MailList
            emails={emails}
            selectedEmailId={selectedEmailId}
            onSelectEmail={handleSelectEmail}
            currentFolder={currentFolder}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filterTab={filterTab}
            onFilterTabChange={setFilterTab}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Email Detail */}
        <ResizablePanel defaultSize={45} minSize={30}>
          <MailDetail
            email={selectedEmail || null}
            onArchive={handleArchive}
            onTrash={handleTrash}
            onReply={handleReply}
            onForward={handleForward}
            onStar={handleStar}
            onToggleRead={handleToggleRead}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Compose Modal */}
      {composeOpen && (
        <MailCompose
          initialData={composeData || undefined}
          onSend={handleSend}
          onSaveDraft={handleSaveDraft}
          onClose={() => {
            setComposeOpen(false);
            setComposeData(null);
          }}
          isSending={isSending}
        />
      )}
    </div>
  );
}
