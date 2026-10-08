"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { cleanSearch } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { ConfirmDialog } from "@/components/Modal";
import { ErrorState, Loading } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { useShell } from "@/stores/shell";
import { api, errorMessage } from "@/lib/api";
import { useUser } from "@/stores/auth";
import { ROLE_LABEL } from "@/lib/constants";
import { useToast } from "@/stores/toast";
import { NewChannelModal } from "@/components/modals/NewChannelModal";
import type { ChannelItem, ChatMessageItem, ChatState, DirectMessageItem } from "@/types/chat";

const POLL_MS = 5000;

const formatTimestamp = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Yesterday " + d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const mergeMessages = (prev: ChatMessageItem[], incoming: ChatMessageItem[]) => {
  if (!incoming.length) return prev;
  const ids = new Set(prev.map((m) => m.id));
  const next = [...prev, ...incoming.filter((m) => !ids.has(m.id))];
  next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id - b.id);
  return next;
};

export function ChatView() {
  const me = useUser();
  const { refreshCounters, publish } = useShell();
  const toast = useToast();

  const [chat, setChat] = useState<ChatState | null>(null);
  const [stateError, setStateError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Messages / errors are keyed by conversation so switching needs no synchronous reset.
  const [loaded, setLoaded] = useState<{ cid: string; list: ChatMessageItem[] } | null>(null);
  const [loadError, setLoadError] = useState<{ cid: string; key: number; msg: string } | null>(null);
  const [composerText, setComposerText] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [deleting, setDeleting] = useState<ChatMessageItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [showListMobile, setShowListMobile] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<string | null>(null);
  const loadedRef = useRef<{ cid: string; list: ChatMessageItem[] } | null>(null);
  const [msgKey, setMsgKey] = useState(0);
  const messages = useMemo(() => (loaded && loaded.cid === activeId ? loaded.list : []), [loaded, activeId]);
  const msgError = loadError && loadError.cid === activeId && loadError.key === msgKey ? loadError.msg : null;
  const msgLoading = !!activeId && !msgError && (!loaded || loaded.cid !== activeId);
  const setMessages = useCallback((fn: (prev: ChatMessageItem[]) => ChatMessageItem[]) => {
    const cid = activeRef.current;
    if (!cid) return;
    setLoaded((cur) => (cur && cur.cid === cid ? { cid, list: fn(cur.list) } : cur));
  }, []);
  useEffect(() => {
    loadedRef.current = loaded;
  }, [loaded]);

  const canCreateChannel = me.role === "platform_admin" || me.role === "org_admin" || me.role === "clerk";
  const isModerator = me.role === "platform_admin" || me.role === "org_admin";

  // ---- sidebar state (polled) ----
  const loadState = useCallback(async () => {
    try {
      const s = await api.get<ChatState>("/chat/state");
      setChat(s);
      setStateError(null);
      setActiveId((cur) => {
        if (cur) return cur;
        const general = s.channels.find((c) => c.name === "general") || s.channels[0];
        return general ? general.conversationId : null;
      });
    } catch (e) {
      setStateError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    // loadState only sets state after its await, so this is not a synchronous setState.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadState();
    const t = setInterval(loadState, POLL_MS);
    return () => clearInterval(t);
  }, [loadState]);

  const markRead = useCallback(
    async (cid: string) => {
      try {
        await api.put(`/chat/conversations/${cid}/read`);
        setChat((s) =>
          s && {
            ...s,
            channels: s.channels.map((c) => (c.conversationId === cid ? { ...c, unread: 0 } : c)),
            directMessages: s.directMessages.map((d) => (d.conversationId === cid ? { ...d, unread: 0 } : d)),
          }
        );
        refreshCounters();
      } catch {
        /* non-fatal */
      }
    },
    [refreshCounters]
  );

  // ---- active conversation: initial load + mark read + 5s poll with ?after= ----
  useEffect(() => {
    activeRef.current = activeId;
    if (!activeId) return;
    const cid = activeId;
    const key = msgKey;
    let cancelled = false;
    api
      .get<ChatMessageItem[]>(`/chat/conversations/${cid}/messages`)
      .then((list) => {
        if (cancelled) return;
        setLoaded({ cid, list });
        markRead(cid);
      })
      .catch((e) => !cancelled && setLoadError({ cid, key, msg: errorMessage(e) }));

    const t = setInterval(async () => {
      if (loadedRef.current?.cid !== cid) return; // wait for the initial load
      const cur = loadedRef.current.list;
      // poll by message id: ids always increase, timestamps can share a second
      const lastId = cur.reduce((mx, m) => Math.max(mx, m.id), 0);
      try {
        const list = await api.get<ChatMessageItem[]>(`/chat/conversations/${cid}/messages`, lastId ? { afterId: lastId } : undefined);
        if (cancelled || activeRef.current !== cid) return;
        const fresh = list.filter((m) => !cur.some((x) => x.id === m.id));
        if (fresh.length) {
          setMessages((prev) => mergeMessages(prev, fresh));
          if (fresh.some((m) => m.authorId !== me.id)) markRead(cid);
        }
      } catch {
        /* keep polling */
      }
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [activeId, msgKey, markRead, setMessages, me.id]);

  // Auto-scroll to bottom when messages change or conversation changes
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeId, messages.length]);

  const currentUserId = chat?.currentUserId ?? me.id;
  const isChannel = !!activeId && activeId.startsWith("ch_");
  const isDM = !!activeId && activeId.startsWith("dm_");
  const activeChannel: ChannelItem | null = isChannel ? chat?.channels.find((c) => c.conversationId === activeId) ?? null : null;
  const activeDMPartner: DirectMessageItem | null = isDM ? chat?.directMessages.find((d) => d.conversationId === activeId) ?? null : null;

  const send = async () => {
    const body = composerText.trim();
    if (!body || !activeId || sending) return;
    if (body.length > 4000) {
      toast("Message is too long (max 4000 characters)", "error");
      return;
    }
    const cid = activeId;
    setSending(true);
    try {
      const msg = await api.post<ChatMessageItem>(`/chat/conversations/${cid}/messages`, { body });
      if (activeRef.current === cid) setMessages((prev) => mergeMessages(prev, [msg]));
      setComposerText("");
      loadState();
      publish("chat");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const doDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.delete(`/chat/messages/${deleting.id}`);
      setMessages((prev) => prev.filter((m) => m.id !== deleting.id));
      setDeleting(null);
      loadState();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setDeleteBusy(false);
    }
  };

  const open = (cid: string) => {
    setActiveId(cid);
    setShowListMobile(false);
  };

  // Group messages: consecutive messages from same author within 5 min collapse
  const groupedMessages = useMemo(
    () =>
      messages.map((m, i) => {
        const prev = i > 0 ? messages[i - 1] : null;
        const sameAuthor = !!prev && prev.authorId === m.authorId;
        const closeInTime = !!prev && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000;
        return { ...m, hideHeader: sameAuthor && closeInTime };
      }),
    [messages]
  );

  const s = search.toLowerCase();
  const filteredChannels = (chat?.channels ?? []).filter((ch) => !search || ch.name.toLowerCase().includes(s));
  const filteredDMs = (chat?.directMessages ?? []).filter((u) => !search || (u.displayName || u.username).toLowerCase().includes(s) || u.username.toLowerCase().includes(s));

  if (!chat && stateError) return <ErrorState message={stateError} onRetry={loadState} />;
  if (!chat) return <Loading />;

  return (
    <div className="flex" style={{ height: "calc(100vh - 48px)", margin: -16, marginTop: -24 }}>
      {/* LEFT: Conversations sidebar */}
      <div className={(showListMobile ? "flex" : "hidden md:flex") + " w-full md:w-[280px] flex-shrink-0"} style={{ borderRight: "1px solid var(--line)", background: "var(--bg-soft)", flexDirection: "column" }}>
        <div className="p-3 border-b border-line" style={{ background: "var(--bg)" }}>
          <h2 className="font-display font-semibold text-ink flex items-center gap-2">
            <Icon name="MessageCircle" size={18} className="text-accent" />
            Chat
          </h2>
          <p className="text-xs text-ink-light mt-0.5">Team channels and direct messages</p>
        </div>

        <div className="p-2 border-b border-line">
          <div className="relative">
            <Icon name="Search" size={13} className="absolute" style={{ left: 8, top: 9, color: "var(--ink-faint)" }} />
            <input value={search} onChange={(e) => setSearch(cleanSearch(e.target.value))} placeholder="Search..." className="input text-xs" style={{ paddingLeft: 28, height: 32 }} />
          </div>
        </div>

        {stateError && (
          <div className="px-3 py-1.5 text-[10px]" style={{ background: "var(--warn-soft)", color: "#854d0e" }}>
            <Icon name="AlertTriangle" size={10} className="inline mr-1" /> Reconnecting… {stateError}
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Channels */}
          <div className="p-2">
            <div className="flex items-center justify-between px-2 pb-1">
              <div className="text-[10px] font-semibold text-ink-faint uppercase tracking-wider">Channels</div>
              {canCreateChannel && (
                <button onClick={() => setShowNewChannel(true)} className="btn-ghost p-1 rounded hover:bg-bg-soft-2" title="New channel" aria-label="New channel">
                  <Icon name="Plus" size={11} className="text-ink-light" />
                </button>
              )}
            </div>
            {filteredChannels.length === 0 && <div className="text-xs text-ink-faint px-2 py-1">{search ? "No matching channels" : "No channels yet"}</div>}
            {filteredChannels.map((ch) => {
              const unread = ch.unread;
              const last = ch.lastMessage;
              const isActive = ch.conversationId === activeId;
              return (
                <div key={ch.id} onClick={() => open(ch.conversationId)}
                     className="px-2 py-1.5 rounded cursor-pointer transition-colors"
                     style={{ background: isActive ? "var(--accent-soft)" : "transparent" }}>
                  <div className="flex items-center gap-2">
                    <Icon name={ch.icon || "Hash"} size={13} style={{ color: isActive ? "var(--accent)" : "var(--ink-light)" }} />
                    <span className="text-sm flex-1 truncate" style={{ color: isActive ? "var(--accent)" : "var(--ink)", fontWeight: isActive || unread > 0 ? 600 : 400 }}>{ch.name}</span>
                    {unread > 0 && !isActive && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "var(--accent)", color: "white", minWidth: 16, textAlign: "center" }}>{unread}</span>
                    )}
                  </div>
                  {last && (
                    <div className="text-[10px] text-ink-faint truncate ml-5 mt-0.5">
                      <span className="font-semibold">{last.authorId === currentUserId ? "You" : last.authorName.split(" ")[0]}:</span> {last.body}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Direct Messages */}
          <div className="p-2 border-t border-line">
            <div className="px-2 pb-1 text-[10px] font-semibold text-ink-faint uppercase tracking-wider">Direct Messages</div>
            {filteredDMs.length === 0 && (
              <div className="text-xs text-ink-faint px-2 py-1">No other users</div>
            )}
            {filteredDMs.map((u) => {
              const dId = u.conversationId;
              const unread = u.unread;
              const last = u.lastMessage;
              const isActive = dId === activeId;
              return (
                <div key={u.userId} onClick={() => open(dId)}
                     className="px-2 py-1.5 rounded cursor-pointer transition-colors flex items-center gap-2"
                     style={{ background: isActive ? "var(--accent-soft)" : "transparent" }}>
                  <Avatar name={u.displayName || u.username} size={24} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm truncate" style={{ color: isActive ? "var(--accent)" : "var(--ink)", fontWeight: isActive || unread > 0 ? 600 : 400 }}>{u.displayName || u.username}</span>
                      {unread > 0 && !isActive && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-auto" style={{ background: "var(--accent)", color: "white", minWidth: 16, textAlign: "center" }}>{unread}</span>
                      )}
                    </div>
                    {last ? (
                      <div className="text-[10px] text-ink-faint truncate">
                        {last.authorId === currentUserId ? "You: " : ""}{last.body}
                      </div>
                    ) : (
                      <div className="text-[10px] text-ink-faint">{u.title || ROLE_LABEL[u.role] || u.role}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current user card */}
        <div className="p-2 border-t border-line flex items-center gap-2" style={{ background: "var(--bg)" }}>
          <div className="relative">
            <Avatar name={me.displayName} size={28} />
            <div className="absolute" style={{ bottom: -1, right: -1, width: 9, height: 9, borderRadius: "50%", background: "#10b981", border: "2px solid var(--bg)" }}></div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{me.displayName}</div>
            <div className="text-[10px] text-ink-light">Online</div>
          </div>
        </div>
      </div>

      {/* RIGHT: Message thread */}
      <div className={showListMobile ? "hidden md:flex" : "flex"} style={{ flex: 1, flexDirection: "column", minWidth: 0, background: "var(--bg)" }}>
        {/* Thread header */}
        {activeChannel || activeDMPartner ? (
          <div className="px-5 py-3 border-b border-line flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setShowListMobile(true)} className="btn-ghost p-1 md:hidden" aria-label="Back to conversations">
                <Icon name="ChevronLeft" size={18} />
              </button>
              {activeChannel && <Icon name={activeChannel.icon || "Hash"} size={18} className="text-ink-light" />}
              {activeDMPartner && <Avatar name={activeDMPartner.displayName || activeDMPartner.username} size={28} />}
              <div>
                <div className="font-semibold text-ink">
                  {activeChannel ? activeChannel.name : activeDMPartner?.displayName || activeDMPartner?.username}
                </div>
                <div className="text-xs text-ink-light">
                  {activeChannel ? activeChannel.description || "No description" : activeDMPartner?.title || ROLE_LABEL[activeDMPartner?.role ?? ""] || activeDMPartner?.role}
                </div>
              </div>
            </div>
            <div className="text-xs text-ink-faint">
              {messages.length} message{messages.length !== 1 ? "s" : ""}
            </div>
          </div>
        ) : (
          <div className="px-5 py-3 border-b border-line">
            <div className="font-semibold text-ink">Chat</div>
            <div className="text-xs text-ink-light">Pick a channel or direct message to start</div>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {!activeId && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-ink-faint">
                <Icon name="MessageCircle" size={32} className="mx-auto mb-2" />
                <div className="text-sm">Select a conversation to start chatting</div>
              </div>
            </div>
          )}
          {activeId && msgLoading && <Loading label="Loading messages…" />}
          {activeId && msgError && !msgLoading && (
            <ErrorState message={msgError} onRetry={() => setMsgKey((k) => k + 1)} />
          )}
          {activeId && !msgLoading && !msgError && groupedMessages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-ink-faint">
                <Icon name="MessageCircle" size={32} className="mx-auto mb-2" />
                <div className="text-sm font-semibold mb-1">
                  {activeChannel ? "This is the start of #" + activeChannel.name : "No messages yet"}
                </div>
                <div className="text-xs">Say hello 👋</div>
              </div>
            </div>
          )}
          {!msgLoading && groupedMessages.map((m) => {
            const isMine = m.authorId === currentUserId;
            const canDelete = isMine || (isModerator && isChannel);
            return (
              <div key={m.id} className="flex items-start gap-2.5 group" style={{ marginTop: m.hideHeader ? 2 : 12, position: "relative" }}>
                <div style={{ width: 32, flexShrink: 0 }}>
                  {!m.hideHeader && <Avatar name={m.authorName} size={32} />}
                </div>
                <div className="flex-1 min-w-0">
                  {!m.hideHeader && (
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="font-semibold text-sm text-ink">{m.authorName}</span>
                      <span className="text-[10px] text-ink-faint" title={new Date(m.createdAt).toLocaleString()}>{formatTimestamp(m.createdAt)}</span>
                    </div>
                  )}
                  <div className="text-sm text-ink break-words" style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.body}</div>
                </div>
                {canDelete && (
                  <button onClick={() => setDeleting(m)}
                          className="btn-ghost p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ position: "absolute", right: 0, top: 0 }}
                          aria-label="Delete message">
                    <Icon name="Trash2" size={11} className="text-ink-faint hover:text-danger" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Composer */}
        {activeId && (
          <div className="px-5 py-3 border-t border-line">
            <div className="rounded-lg border border-line" style={{ background: "var(--bg)" }}>
              <textarea
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={activeChannel ? "Message #" + activeChannel.name : "Message " + (activeDMPartner?.displayName || "")}
                className="w-full px-3 py-2 bg-transparent focus:outline-none text-sm resize-none"
                style={{ minHeight: 40, maxHeight: 160, border: "none" }}
                rows={1}
                maxLength={4000}
                disabled={!!msgError}
              />
              <div className="flex items-center justify-between px-2 py-1.5 border-t border-line">
                <div className="text-[10px] text-ink-faint">
                  <Icon name="Info" size={9} className="inline mr-1" />
                  Press Enter to send, Shift+Enter for new line
                </div>
                <button onClick={send} disabled={!composerText.trim() || sending} className="btn btn-primary text-xs">
                  {sending ? <span className="loader" style={{ borderTopColor: "white", width: 11, height: 11 }} /> : <Icon name="Send" size={11} />} Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New channel modal */}
      {showNewChannel && (
        <NewChannelModal
          onCreated={(ch) => {
            setShowNewChannel(false);
            toast("Channel #" + ch.name + " created");
            setChat((st) => (st && !st.channels.some((c) => c.id === ch.id) ? { ...st, channels: [...st.channels, ch] } : st));
            open(ch.conversationId);
            loadState();
          }}
          onClose={() => setShowNewChannel(false)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete message?"
          message="Delete this message? This cannot be undone."
          busy={deleteBusy}
          onConfirm={doDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
