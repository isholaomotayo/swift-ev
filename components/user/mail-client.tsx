"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { MailSidebar, type MailFolder } from "@/components/admin/mail/mail-sidebar";
import { MailList, type Email } from "@/components/admin/mail/mail-list";
import { MailDetail } from "@/components/admin/mail/mail-detail";
import { MailCompose } from "@/components/admin/mail/mail-compose";

interface MailClientProps {
  initialEmails: { emails?: Email[] } | null;
  initialStats: {
    inbox: number;
    inboxUnread: number;
    sent: number;
    drafts: number;
    trash: number;
    archive: number;
  } | null;
  token: string;
}

export function UserMailClient({ initialEmails, initialStats, token }: MailClientProps) {
  const sendAsOptions = ["buy@autoexports.live"] as const;
  const defaultSendAs = "buy@autoexports.live";
  const [currentFolder, setCurrentFolder] = useState<MailFolder>("inbox");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState<{
    sendAs?: string;
    to?: string;
    cc?: string;
    bcc?: string;
    subject?: string;
    body?: string;
    inReplyTo?: string;
    draftId?: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "unread">("all");
  const [isSending, setIsSending] = useState(false);

  // Real-time queries
  const emailsData = useQuery(api.userMail.listEmails, {
    token,
    folder: currentFolder,
    unreadOnly: filterTab === "unread" ? true : undefined,
    limit: 50,
  });

  const mailStats = useQuery(api.userMail.getMailStats, { token });

  const selectedEmail = useQuery(
    api.userMail.getEmail,
    selectedEmailId
      ? { token, emailId: selectedEmailId as Id<"adminEmails"> }
      : "skip"
  );

  const searchResults = useQuery(
    api.userMail.searchEmails,
    searchQuery.trim().length > 1
      ? { token, query: searchQuery, folder: currentFolder }
      : "skip"
  );

  // Mutations
  const markAsReadMutation = useMutation(api.userMail.markAsRead);
  const moveToFolderMutation = useMutation(api.userMail.moveToFolder);
  const starEmailMutation = useMutation(api.userMail.starEmail);
  const sendEmailMutation = useMutation(api.userMail.sendEmail);
  const saveDraftMutation = useMutation(api.userMail.saveDraft);
  const deleteEmailMutation = useMutation(api.userMail.deleteEmail);
  const retryFetchBodyMutation = useMutation(
    api.userMail.retryFetchEmailBody
  );

  // Use real-time data, fallback to initial data
  const emails =
    searchQuery.trim().length > 1
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

  // Retry fetching body if empty and has resendEmailId
  useEffect(() => {
    if (
      selectedEmail &&
      !selectedEmail.bodyHtml &&
      selectedEmail.resendEmailId
    ) {
      retryFetchBodyMutation({
        token,
        emailId: selectedEmail._id,
      }).catch(console.error);
    }
  }, [selectedEmail?._id, selectedEmail?.bodyHtml]);

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
    setComposeData({ sendAs: defaultSendAs });
    setComposeOpen(true);
  }, [defaultSendAs]);

  const handleReply = useCallback(() => {
    if (!selectedEmail) return;
    setComposeData({
      sendAs: defaultSendAs,
      to: selectedEmail.from,
      subject: selectedEmail.subject.startsWith("Re:")
        ? selectedEmail.subject
        : `Re: ${selectedEmail.subject}`,
      body: `\n\n---\nOn ${new Date(selectedEmail.createdAt).toLocaleString()}, ${
        selectedEmail.fromName || selectedEmail.from
      } wrote:\n> ${selectedEmail.bodyText || ""}`,
      inReplyTo: selectedEmail._id,
    });
    setComposeOpen(true);
  }, [defaultSendAs, selectedEmail]);

  const handleReplyAll = useCallback(() => {
    if (!selectedEmail) return;
    const allRecipients = [
      selectedEmail.from,
      ...(selectedEmail.cc || []),
    ].filter(
      (addr) =>
        addr !== "buy@autoexport.live" &&
        addr !== "noreply@autoexports.live"
    );

    setComposeData({
      sendAs: defaultSendAs,
      to: selectedEmail.from,
      cc: allRecipients
        .filter((a) => a !== selectedEmail.from)
        .join(", "),
      subject: selectedEmail.subject.startsWith("Re:")
        ? selectedEmail.subject
        : `Re: ${selectedEmail.subject}`,
      body: `\n\n---\nOn ${new Date(selectedEmail.createdAt).toLocaleString()}, ${
        selectedEmail.fromName || selectedEmail.from
      } wrote:\n> ${selectedEmail.bodyText || ""}`,
      inReplyTo: selectedEmail._id,
    });
    setComposeOpen(true);
  }, [defaultSendAs, selectedEmail]);

  const handleForward = useCallback(() => {
    if (!selectedEmail) return;
    setComposeData({
      sendAs: defaultSendAs,
      to: "",
      subject: selectedEmail.subject.startsWith("Fwd:")
        ? selectedEmail.subject
        : `Fwd: ${selectedEmail.subject}`,
      body: `\n\n---\nForwarded message:\nFrom: ${
        selectedEmail.fromName || selectedEmail.from
      }\nDate: ${new Date(selectedEmail.createdAt).toLocaleString()}\nSubject: ${
        selectedEmail.subject
      }\n\n${selectedEmail.bodyText || ""}`,
      inReplyTo: selectedEmail._id,
    });
    setComposeOpen(true);
  }, [defaultSendAs, selectedEmail]);

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

  const handleDelete = useCallback(async () => {
    if (!selectedEmailId) return;
    await deleteEmailMutation({
      token,
      emailId: selectedEmailId as Id<"adminEmails">,
    });
    setSelectedEmailId(null);
  }, [selectedEmailId, token, deleteEmailMutation]);

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
      sendAs: string;
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
          bodyHtml: `<div style="font-family:Arial,sans-serif;">${data.body.replace(
            /\n/g,
            "<br>"
          )}</div>`,
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
      sendAs: string;
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
          bodyHtml: `<div style="font-family:Arial,sans-serif;">${data.body.replace(
            /\n/g,
            "<br>"
          )}</div>`,
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

  const handleNoopUpdateSendAsOptions = useCallback(() => {
    // User mailbox doesn't manage global send-as aliases.
  }, []);

  return (
    <div className="h-[calc(100vh-6rem)] rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex h-full">
        <div className="w-56 shrink-0 border-r border-border overflow-y-auto">
          <MailSidebar
            currentFolder={currentFolder}
            onFolderChange={handleFolderChange}
            onCompose={handleCompose}
            stats={stats}
          />
        </div>

        <div className="w-[340px] shrink-0 border-r border-border overflow-hidden">
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
        </div>

        <div className="flex-1 min-w-0 overflow-hidden">
          <MailDetail
            email={selectedEmail || null}
            currentFolder={currentFolder}
            onArchive={handleArchive}
            onTrash={handleTrash}
            onDelete={handleDelete}
            onReply={handleReply}
            onReplyAll={handleReplyAll}
            onForward={handleForward}
            onStar={handleStar}
            onToggleRead={handleToggleRead}
          />
        </div>
      </div>

      {composeOpen && (
        <MailCompose
          initialData={composeData || undefined}
          sendAsOptions={sendAsOptions}
          defaultSendAs={defaultSendAs}
          onUpdateSendAsOptions={handleNoopUpdateSendAsOptions}
          isUpdatingSendAs={false}
          onSend={handleSend}
          onSaveDraft={handleSaveDraft}
          onClose={() => {
            setComposeOpen(false);
            setComposeData(null);
          }}
          isSending={isSending}
          isUserMode={true}
        />
      )}
    </div>
  );
}

