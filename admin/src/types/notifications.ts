// Response types for /api/notifications (docs/api/operations.md §2).

export interface NotificationRow {
  id: number;
  title: string;
  body: string | null;
  icon: string;
  color: string;
  read: boolean;
  broadcast: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  items: NotificationRow[];
  total: number;
  unread: number;
}
