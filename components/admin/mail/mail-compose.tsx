"use client";

import { useState } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

interface ComposeData {
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
  onSend: (data: ComposeData) => void;
  onSaveDraft: (data: ComposeData) => void;
  onClose: () => void;
  isSending?: boolean;
}

export function MailCompose({
  initialData,
  onSend,
  onSaveDraft,
  onClose,
  isSending,
}: MailComposeProps) {
  const [to, setTo] = useState(initialData?.to || "");
  const [cc, setCc] = useState(initialData?.cc || "");
  const [bcc, setBcc] = useState(initialData?.bcc || "");
  const [subject, setSubject] = useState(initialData?.subject || "");
  const [body, setBody] = useState(initialData?.body || "");
  const [showCcBcc, setShowCcBcc] = useState(
    !!(initialData?.cc || initialData?.bcc)
  );

  const handleSend = () => {
    if (!to.trim()) return;
    onSend({
      to,
      cc,
      bcc,
      subject,
      body,
      inReplyTo: initialData?.inReplyTo,
      draftId: initialData?.draftId,
    });
  };

  const handleSaveDraft = () => {
    onSaveDraft({
      to,
      cc,
      bcc,
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
          {/* To */}
          <div className="flex items-center border-b border-border px-4 py-2">
            <Label className="w-12 text-xs text-muted-foreground">To</Label>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="border-0 shadow-none focus-visible:ring-0 h-8 text-sm"
            />
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setShowCcBcc(!showCcBcc)}
            >
              {showCcBcc ? <ChevronUp className="h-3 w-3" /> : "Cc/Bcc"}
            </Button>
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
