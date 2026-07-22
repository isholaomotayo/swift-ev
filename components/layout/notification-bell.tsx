"use client";

import { useState } from "react";
import { Bell, Check } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDate } from "@/lib/utils";

export function NotificationBell() {
  const { token, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  // Queries and mutations will safely skip if token is missing
  const notifications = useQuery(
    api.notifications.getUserNotifications,
    token && isAuthenticated ? { token, limit: 10 } : "skip"
  );
  
  const unreadCount = useQuery(
    api.notifications.getUnreadCount,
    token && isAuthenticated ? { token } : "skip"
  );

  const markAsRead = useMutation(api.notifications.markAsRead);

  if (!isAuthenticated) return null;

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) return;
    try {
      await markAsRead({ token, notificationId: id as any });
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token || unreadCount === 0) return;
    try {
      await markAsRead({ token, markAll: true });
    } catch (error) {
      console.error("Failed to mark all as read", error);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-white/10"
        >
          <Bell className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          {unreadCount ? (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent
        align="end"
        className="w-80 p-0 overflow-hidden shadow-xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50/50 dark:bg-white/5">
          <span className="font-semibold text-sm">Notifications</span>
          {unreadCount ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-auto p-0 text-xs text-brand-primary hover:text-brand-primary/80 dark:text-brand-gold hover:bg-transparent"
            >
              Mark all read
            </Button>
          ) : null}
        </div>

        <ScrollArea className="max-h-[300px] overflow-y-auto">
          {!notifications ? (
            <div className="p-4 text-center text-sm text-slate-500">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">
              No notifications yet.
            </div>
          ) : (
            <div className="flex flex-col relative">
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification._id}
                  className={`flex flex-col group items-start p-4 cursor-pointer focus:bg-slate-50 dark:focus:bg-white/5 border-b last:border-0 ${
                    !notification.read ? "bg-brand-primary/5 dark:bg-brand-gold/5" : ""
                  }`}
                  onClick={() => {
                    if (!notification.read && token) {
                      markAsRead({ token, notificationId: notification._id });
                    }
                  }}
                >
                  <div className="flex w-full items-start justify-between gap-2">
                    <span className="font-semibold text-sm">{notification.title}</span>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap mt-0.5">
                      {formatDate(notification.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                    {notification.message}
                  </p>
                  
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleMarkAsRead(notification._id, e)}
                      className="absolute right-2 opacity-0 group-hover:opacity-100 h-6 w-6"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
