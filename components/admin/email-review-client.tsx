"use client";

import { useState, useEffect, useTransition } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Edit3,
  Eye,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Code,
  Smartphone,
  Monitor,
  AlertTriangle,
  FileText,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getMutationErrorMessage } from "@/lib/auth-errors";

interface EmailReviewClientProps {
  token: string;
}

export function EmailReviewClient({ token }: EmailReviewClientProps) {
  const { toast } = useToast();
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>("pending_review");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [isPending, startTransition] = useTransition();

  // Content edit state
  const [editedSubject, setEditedSubject] = useState("");
  const [editedHtml, setEditedHtml] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // Queries
  const reviewSettingData = useQuery(api.emailAdmin.getEmailReviewSetting, { token });
  const requireReview = reviewSettingData?.requireReview ?? true;

  const emailsResult = useQuery(api.emailAdmin.listTransactionalEmails, {
    token,
    status: selectedStatusTab === "all" ? undefined : selectedStatusTab,
    searchQuery: searchQuery.trim().length > 0 ? searchQuery : undefined,
    limit: 100,
  });

  const selectedEmail = useQuery(
    api.emailAdmin.getTransactionalEmail,
    selectedEmailId
      ? { token, emailId: selectedEmailId as Id<"transactionalEmails"> }
      : "skip"
  );

  // Mutations & Actions
  const setReviewSetting = useMutation(api.emailAdmin.setEmailReviewSetting);
  const updateEmailContent = useMutation(api.emailAdmin.updateTransactionalEmail);
  const rejectEmail = useMutation(api.emailAdmin.rejectTransactionalEmail);
  const approveEmailAction = useAction(api.emails.approveTransactionalEmail);

  // Sync edit form when selected email changes
  useEffect(() => {
    if (selectedEmail) {
      setEditedSubject(selectedEmail.subject || "");
      setEditedHtml(selectedEmail.bodyHtml || "");
      setIsDirty(false);
    }
  }, [selectedEmail?._id, selectedEmail?.subject, selectedEmail?.bodyHtml]);

  // Auto select first email when list loads or changes
  useEffect(() => {
    if (emailsResult?.emails && emailsResult.emails.length > 0 && !selectedEmailId) {
      setSelectedEmailId(emailsResult.emails[0]._id);
    }
  }, [emailsResult?.emails, selectedEmailId]);

  // Handle Review Mode Toggle
  const handleToggleReviewMode = async () => {
    try {
      const nextValue = !requireReview;
      await setReviewSetting({ token, requireReview: nextValue });
      toast({
        title: nextValue ? "Email Review Enabled" : "Email Review Paused",
        description: nextValue
          ? "All event emails will be held for admin approval before dispatch."
          : "Event emails will now be sent immediately to recipients.",
      });
    } catch (err: any) {
      toast({
        title: "Failed to update review setting",
        description: getMutationErrorMessage(err, "An error occurred"),
        variant: "destructive",
      });
    }
  };

  // Save changes to email subject and HTML
  const handleSaveChanges = async () => {
    if (!selectedEmailId) return;
    try {
      await updateEmailContent({
        token,
        emailId: selectedEmailId as Id<"transactionalEmails">,
        subject: editedSubject,
        bodyHtml: editedHtml,
      });
      setIsDirty(false);
      toast({
        title: "Changes Saved",
        description: "Email subject and body have been updated.",
      });
    } catch (err: any) {
      toast({
        title: "Failed to save email edits",
        description: getMutationErrorMessage(err, "An error occurred"),
        variant: "destructive",
      });
    }
  };

  // Approve & Send email
  const handleApprove = async () => {
    if (!selectedEmailId) return;

    // Save unsaved edits first
    if (isDirty) {
      await handleSaveChanges();
    }

    startTransition(async () => {
      try {
        const res = await approveEmailAction({
          token,
          emailId: selectedEmailId as Id<"transactionalEmails">,
        });

        if (res.success) {
          toast({
            title: "Email Approved & Sent!",
            description: res.status === "skipped_dev"
              ? "Approved (Development stub mode: RESEND_API_KEY not set)."
              : "Email has been dispatched to recipient successfully.",
          });
        } else {
          toast({
            title: "Send Failed",
            description: res.error || "Could not dispatch email.",
            variant: "destructive",
          });
        }
      } catch (err: any) {
        toast({
          title: "Approval Error",
          description: getMutationErrorMessage(err, "Failed to approve email."),
          variant: "destructive",
        });
      }
    });
  };

  // Reject email
  const handleReject = async () => {
    if (!selectedEmailId) return;
    try {
      await rejectEmail({
        token,
        emailId: selectedEmailId as Id<"transactionalEmails">,
        reason: "Rejected by admin in review queue",
      });
      toast({
        title: "Email Rejected",
        description: "This email has been marked as rejected and will not be sent.",
      });
    } catch (err: any) {
      toast({
        title: "Failed to reject email",
        description: getMutationErrorMessage(err, "An error occurred"),
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_review":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 font-medium">
            <Clock className="w-3 h-3 mr-1" /> Pending Review
          </Badge>
        );
      case "sent":
      case "approved":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-medium">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Sent
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-rose-500/10 text-rose-500 border-rose-500/30 font-medium">
            <XCircle className="w-3 h-3 mr-1" /> Rejected
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30 font-medium">
            <AlertTriangle className="w-3 h-3 mr-1" /> Failed
          </Badge>
        );
      case "skipped_dev":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 font-medium">
            <Zap className="w-3 h-3 mr-1" /> Dev Mode
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = emailsResult?.pendingCount ?? 0;
  const emailsList = emailsResult?.emails ?? [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Settings Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Outgoing Email Review
            </h1>
            {pendingCount > 0 && (
              <Badge variant="default" className="bg-amber-500 text-white font-bold px-2.5 py-0.5 rounded-full">
                {pendingCount} Pending
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Review, edit, preview, and approve event-triggered transactional emails before delivery.
          </p>
        </div>

        {/* Master Toggle */}
        <div className="flex items-center gap-4 bg-muted/40 p-3 rounded-xl border border-border/60">
          <div className="text-right">
            <p className="text-xs font-semibold text-foreground">Review Mode</p>
            <p className="text-[11px] text-muted-foreground">
              {requireReview ? "Queueing all event emails" : "Direct sending active"}
            </p>
          </div>
          <Button
            size="sm"
            variant={requireReview ? "default" : "outline"}
            onClick={handleToggleReviewMode}
            className={cn(
              "font-semibold transition-all duration-200",
              requireReview
                ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md"
                : "border-border hover:bg-muted"
            )}
          >
            {requireReview ? "Review Required ON" : "Bypass Queue OFF"}
          </Button>
        </div>
      </div>

      {/* Main Review Dashboard Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Email List */}
        <Card className="lg:col-span-4 p-4 border-border/80 bg-card space-y-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedStatusTab("pending_review")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5",
                selectedStatusTab === "pending_review"
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold"
                  : "text-muted-foreground hover:bg-muted/60"
              )}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setSelectedStatusTab("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                selectedStatusTab === "all"
                  ? "bg-electric-blue/15 text-electric-blue font-bold"
                  : "text-muted-foreground hover:bg-muted/60"
              )}
            >
              All
            </button>
            <button
              onClick={() => setSelectedStatusTab("sent")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                selectedStatusTab === "sent"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold"
                  : "text-muted-foreground hover:bg-muted/60"
              )}
            >
              Sent
            </button>
            <button
              onClick={() => setSelectedStatusTab("rejected")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                selectedStatusTab === "rejected"
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold"
                  : "text-muted-foreground hover:bg-muted/60"
              )}
            >
              Rejected
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recipient, subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          {/* Email List Scrollable Container */}
          <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
            {emailsList.length === 0 ? (
              <div className="text-center py-12 px-4 border border-dashed border-border rounded-xl">
                <Mail className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No emails found</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Emails triggered by events will appear here when review mode is active.
                </p>
              </div>
            ) : (
              emailsList.map((item: any) => {
                const isSelected = selectedEmailId === item._id;
                return (
                  <div
                    key={item._id}
                    onClick={() => setSelectedEmailId(item._id)}
                    className={cn(
                      "p-3.5 rounded-xl border transition-all duration-200 cursor-pointer space-y-2",
                      isSelected
                        ? "bg-electric-blue/5 border-electric-blue/40 shadow-sm"
                        : "bg-card hover:bg-muted/40 border-border/60"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded bg-muted/60">
                        {item.emailType.replace(/_/g, " ")}
                      </span>
                      {getStatusBadge(item.status)}
                    </div>

                    <div>
                      <p className="text-xs font-bold text-foreground truncate">{item.subject}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{item.recipientEmail}</p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 pt-1 border-t border-border/40">
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                      {item.updatedAt && <span className="italic text-electric-blue">Edited</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Right Column: Detail & Review Studio */}
        <Card className="lg:col-span-8 p-6 border-border/80 bg-card space-y-6">
          {!selectedEmail ? (
            <div className="flex flex-col items-center justify-center h-[500px] text-center p-8">
              <Mail className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-bold text-foreground">Select an Email to Review</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                Choose an outgoing transactional email from the queue on the left to inspect, edit code, preview responsive design, and approve or reject it.
              </p>
            </div>
          ) : (
            <>
              {/* Header & Actions */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedEmail.status)}
                    <span className="text-xs text-muted-foreground font-mono">
                      Type: {selectedEmail.emailType}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-foreground tracking-tight">
                    {editedSubject || selectedEmail.subject}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    To: <span className="font-semibold text-foreground">{selectedEmail.recipientEmail}</span> • Created {new Date(selectedEmail.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* Actions Toolbar */}
                <div className="flex items-center gap-2 flex-wrap">
                  {isDirty && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSaveChanges}
                      className="border-electric-blue/40 text-electric-blue hover:bg-electric-blue/10"
                    >
                      <FileText className="w-4 h-4 mr-1.5" /> Save Edits
                    </Button>
                  )}

                  {selectedEmail.status === "pending_review" && (
                    <>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleReject}
                        className="bg-rose-600 hover:bg-rose-700 text-white"
                      >
                        <XCircle className="w-4 h-4 mr-1.5" /> Reject
                      </Button>

                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={handleApprove}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md"
                      >
                        {isPending ? (
                          <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-1.5" />
                        )}
                        Approve & Send
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Subject Line Live Editor */}
              <div className="space-y-1.5 bg-muted/30 p-3 rounded-xl border border-border/50">
                <label className="text-xs font-bold text-muted-foreground flex items-center justify-between">
                  <span>Subject Line</span>
                  {isDirty && <span className="text-[11px] text-amber-500 font-semibold">* Unsaved changes</span>}
                </label>
                <Input
                  value={editedSubject}
                  onChange={(e) => {
                    setEditedSubject(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Email Subject..."
                  className="bg-background text-sm font-medium"
                />
              </div>

              {/* Main Content Tabs: Visual Preview, HTML Code Editor, Logs */}
              <Tabs defaultValue="preview" className="w-full">
                <div className="flex items-center justify-between pb-2">
                  <TabsList className="bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="preview" className="text-xs font-semibold">
                      <Eye className="w-3.5 h-3.5 mr-1.5" /> Visual Preview
                    </TabsTrigger>
                    <TabsTrigger value="code" className="text-xs font-semibold">
                      <Code className="w-3.5 h-3.5 mr-1.5" /> Edit HTML Code
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="text-xs font-semibold">
                      <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" /> Event Logs
                    </TabsTrigger>
                  </TabsList>

                  {/* Device Viewport Toggle for Preview */}
                  <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/40">
                    <button
                      onClick={() => setPreviewDevice("desktop")}
                      className={cn(
                        "p-1.5 rounded-md transition-all",
                        previewDevice === "desktop" ? "bg-background shadow text-foreground" : "text-muted-foreground"
                      )}
                      title="Desktop View"
                    >
                      <Monitor className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPreviewDevice("mobile")}
                      className={cn(
                        "p-1.5 rounded-md transition-all",
                        previewDevice === "mobile" ? "bg-background shadow text-foreground" : "text-muted-foreground"
                      )}
                      title="Mobile View"
                    >
                      <Smartphone className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Visual Preview Tab */}
                <TabsContent value="preview" className="mt-2">
                  <div className="flex justify-center bg-slate-900 p-6 rounded-2xl border border-border/80 overflow-hidden min-h-[450px]">
                    <div
                      className={cn(
                        "bg-white rounded-xl shadow-2xl transition-all duration-300 overflow-hidden border border-slate-700 flex flex-col",
                        previewDevice === "mobile" ? "w-[375px] h-[600px]" : "w-full min-h-[480px]"
                      )}
                    >
                      {/* Fake Email Header Bar */}
                      <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-slate-600">
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-bold text-slate-800">From:</span> autoexports.live &lt;noreply@autoexports.live&gt;
                        </div>
                        <span className="text-[10px] font-mono uppercase bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                          HTML Render
                        </span>
                      </div>

                      {/* Sandboxed iframe Preview */}
                      <iframe
                        srcDoc={editedHtml || "<p style='color:#666;padding:20px;'>No HTML content</p>"}
                        className="w-full flex-1 border-0 bg-white"
                        title="Email Live Preview"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Edit HTML Code Tab */}
                <TabsContent value="code" className="mt-2 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    <span>Directly modify the HTML markup of this outgoing email:</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (selectedEmail) {
                          setEditedHtml(selectedEmail.bodyHtml || "");
                          setIsDirty(false);
                        }
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Reset to Original
                    </Button>
                  </div>
                  <Textarea
                    value={editedHtml}
                    onChange={(e) => {
                      setEditedHtml(e.target.value);
                      setIsDirty(true);
                    }}
                    rows={18}
                    className="font-mono text-xs leading-relaxed bg-slate-950 text-emerald-400 border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/20 rounded-xl"
                  />
                </TabsContent>

                {/* Logs & Audit Metadata Tab */}
                <TabsContent value="logs" className="mt-2">
                  <div className="bg-muted/30 p-4 rounded-xl border border-border/60 space-y-3 font-mono text-xs">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-muted-foreground">Record ID:</span>
                        <p className="font-bold text-foreground truncate">{selectedEmail._id}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email Event Type:</span>
                        <p className="font-bold text-foreground">{selectedEmail.emailType}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Recipient Email:</span>
                        <p className="font-bold text-foreground">{selectedEmail.recipientEmail}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Resend Email ID:</span>
                        <p className="font-bold text-foreground">{selectedEmail.resendEmailId || "None (Queued)"}</p>
                      </div>
                      {selectedEmail.relatedOrderId && (
                        <div>
                          <span className="text-muted-foreground">Related Order ID:</span>
                          <p className="font-bold text-electric-blue">{selectedEmail.relatedOrderId}</p>
                        </div>
                      )}
                      {selectedEmail.relatedVehicleId && (
                        <div>
                          <span className="text-muted-foreground">Related Vehicle ID:</span>
                          <p className="font-bold text-electric-blue">{selectedEmail.relatedVehicleId}</p>
                        </div>
                      )}
                    </div>

                    {selectedEmail.errorMessage && (
                      <div className="pt-3 border-t border-border/40 text-rose-500">
                        <span className="font-bold">Error / Rejection Log:</span>
                        <p className="mt-1 bg-rose-500/10 p-2 rounded border border-rose-500/20 text-xs">
                          {selectedEmail.errorMessage}
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
