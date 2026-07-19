"use client";

import { useState } from "react";
import { X, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ComposeData {
  sendAs: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  draftId?: string;
}

interface MailComposeProps {
  initialData?: Partial<ComposeData>;
  sendAsOptions: readonly string[];
  defaultSendAs: string;
  onUpdateSendAsOptions: (aliases: string[]) => void;
  isUpdatingSendAs?: boolean;
  onSend: (data: ComposeData) => void;
  onSaveDraft: (data: ComposeData) => void;
  onClose: () => void;
  isSending?: boolean;
  isUserMode?: boolean;
}

export function MailCompose({
  initialData,
  sendAsOptions,
  defaultSendAs,
  onUpdateSendAsOptions,
  isUpdatingSendAs,
  onSend,
  onSaveDraft,
  onClose,
  isSending,
  isUserMode,
}: MailComposeProps) {
  const [sendAs, setSendAs] = useState(initialData?.sendAs || defaultSendAs);
  const [newAlias, setNewAlias] = useState("");
  const [to, setTo] = useState(isUserMode ? "admin@autoexports.live" : initialData?.to || "");
  const [cc, setCc] = useState(isUserMode ? "" : initialData?.cc || "");
  const [bcc, setBcc] = useState(isUserMode ? "" : initialData?.bcc || "");
  const [subject, setSubject] = useState(initialData?.subject || "");
  const [body, setBody] = useState(initialData?.body || "");
  const [showCcBcc, setShowCcBcc] = useState(
    !isUserMode && !!(initialData?.cc || initialData?.bcc)
  );
  const [isEditingAliases, setIsEditingAliases] = useState(false);

  const handleAddAlias = () => {
    const normalized = newAlias.trim().toLowerCase();
    if (!normalized || sendAsOptions.includes(normalized)) return;
    onUpdateSendAsOptions([...sendAsOptions, normalized]);
    setNewAlias("");
  };

  const handleRemoveAlias = (alias: string) => {
    onUpdateSendAsOptions(sendAsOptions.filter((entry) => entry !== alias));
    if (sendAs === alias) {
      setSendAs(defaultSendAs);
    }
  };

  const handleSend = () => {
    if (!to.trim()) return;
    onSend({
      sendAs,
      to: isUserMode ? "admin@autoexports.live" : to,
      cc: isUserMode ? "" : cc,
      bcc: isUserMode ? "" : bcc,
      subject,
      body,
      inReplyTo: initialData?.inReplyTo,
      draftId: initialData?.draftId,
    });
  };

  const handleSaveDraft = () => {
    onSaveDraft({
      sendAs,
      to: isUserMode ? "admin@autoexports.live" : to,
      cc: isUserMode ? "" : cc,
      bcc: isUserMode ? "" : bcc,
      subject,
      body,
      inReplyTo: initialData?.inReplyTo,
      draftId: initialData?.draftId,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-semibold text-sm">
            {initialData?.inReplyTo
              ? "Reply"
              : initialData?.draftId
                ? "Edit Draft"
                : "New Message"}
          </h3>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-0">
          {/* Send As */}
          <div className="flex items-center border-b border-border px-4 py-2">
            <Label className="w-12 text-xs text-muted-foreground">From</Label>
            <select
              value={sendAs}
              onChange={(e) => setSendAs(e.target.value)}
              className="h-8 flex-1 rounded-md border-0 bg-transparent px-2 text-sm focus-visible:outline-none"
            >
              {sendAsOptions.map((address) => (
                <option key={address} value={address}>
                  {address}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setIsEditingAliases((value) => !value)}
            >
              {isEditingAliases ? "Done" : "Edit"}
            </Button>
          </div>
          {isEditingAliases && (
            <div className="border-b border-border px-4 py-2">
              <div className="flex gap-2">
                <Input
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  placeholder="new@autoexports.live"
                  className="h-8 text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddAlias}
                  disabled={isUpdatingSendAs || !newAlias.trim()}
                >
                  Add
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {sendAsOptions.map((alias) => (
                  <Button
                    key={alias}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleRemoveAlias(alias)}
                    disabled={isUpdatingSendAs || alias === defaultSendAs}
                  >
                    {alias} {alias === defaultSendAs ? "(default)" : "x"}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* To */}
          <div className="flex items-center border-b border-border px-4 py-2">
            <Label className="w-12 text-xs text-muted-foreground">To</Label>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="border-0 shadow-none focus-visible:ring-0 h-8 text-sm"
              disabled={isUserMode}
            />
            {!isUserMode && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => setShowCcBcc(!showCcBcc)}
              >
                {showCcBcc ? <ChevronUp className="h-3 w-3" /> : "Cc/Bcc"}
              </Button>
            )}
          </div>

          {/* Cc / Bcc */}
          {showCcBcc && (
            <>
              <div className="flex items-center border-b border-border px-4 py-2">
                <Label className="w-12 text-xs text-muted-foreground">Cc</Label>
                <Input
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc@example.com"
                  className="border-0 shadow-none focus-visible:ring-0 h-8 text-sm"
                />
              </div>
              <div className="flex items-center border-b border-border px-4 py-2">
                <Label className="w-12 text-xs text-muted-foreground">Bcc</Label>
                <Input
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="bcc@example.com"
                  className="border-0 shadow-none focus-visible:ring-0 h-8 text-sm"
                />
              </div>
            </>
          )}

          {/* Subject */}
          <div className="flex items-center border-b border-border px-4 py-2">
            <Label className="w-12 text-xs text-muted-foreground">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="border-0 shadow-none focus-visible:ring-0 h-8 text-sm"
            />
          </div>

          {/* Body */}
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
            className="min-h-[280px] resize-none border-0 shadow-none focus-visible:ring-0 rounded-none px-4 py-3 text-sm"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <div className="flex gap-2">
            <Button onClick={handleSend} disabled={!to.trim() || isSending} size="sm">
              {isSending ? "Sending..." : "Send"}
            </Button>
            <Button variant="outline" onClick={handleSaveDraft} size="sm">
              Save Draft
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onClose}>
            Discard
          </Button>
        </div>
      </div>
    </div>
  );
}
