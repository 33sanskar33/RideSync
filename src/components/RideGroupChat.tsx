import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  Coffee,
  Fuel,
  MapPin,
  MessageCircle,
  Send,
  Wifi,
  Wrench,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface RideChatMessage {
  id: string;
  room_id: string;
  member_id: string;
  user_id: string;
  rider_name: string;
  body: string;
  message_type: 'text' | 'quick';
  created_at: string;
}

interface RideGroupChatProps {
  roomId: string;
  memberId: string | null;
  userId: string | null;
  riderName: string | null;
  currentLocation: { latitude: number; longitude: number } | null;
  rideEnded: boolean;
}

const QUICK_MESSAGES = [
  {
    label: 'Need a break',
    body: '☕ I need a short break. Let’s stop at a safe place.',
    icon: Coffee,
  },
  {
    label: 'Low fuel',
    body: '⛽ My fuel is low. Can we stop at the next petrol pump?',
    icon: Fuel,
  },
  {
    label: 'Bike issue',
    body: '🔧 I’m having a bike issue. I need help.',
    icon: Wrench,
  },
  {
    label: 'Please wait',
    body: '🛑 Please wait for me at a safe spot.',
    icon: MapPin,
  },
];

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function RideGroupChat({
  roomId,
  memberId,
  userId,
  riderName,
  currentLocation,
  rideEnded,
}: RideGroupChatProps) {
  const [messages, setMessages] = useState<RideChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('Connecting…');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!roomId || !userId) {
      setMessages([]);
      setConnectionStatus('Sign in to use chat');
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      const { data, error: loadError } = await supabase
        .from('ride_messages')
        .select('id, room_id, member_id, user_id, rider_name, body, message_type, created_at')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (cancelled) return;

      if (loadError) {
        console.error('Load ride chat failed:', loadError.message);
        setError('Could not load chat messages. Please refresh the room.');
        return;
      }

      const ordered = ((data ?? []) as RideChatMessage[]).reverse();
      setMessages((current) => {
        const merged = new Map(current.map((message) => [message.id, message]));
        ordered.forEach((message) => merged.set(message.id, message));
        return [...merged.values()].sort(
          (a, b) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()
        );
      });
      setError(null);
    };

    void loadMessages();

    const channel = supabase
      .channel(`ride-chat-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ride_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (cancelled) return;
          const incoming = payload.new as RideChatMessage;
          if (!incoming?.id) return;

          setMessages((current) => {
            if (current.some((message) => message.id === incoming.id)) {
              return current;
            }
            return [...current, incoming].sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            );
          });
        }
      )
      .subscribe((status) => {
        if (cancelled) return;

        if (status === 'SUBSCRIBED') {
          setConnectionStatus('Live');
          void loadMessages();
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          setConnectionStatus('Reconnecting…');
        } else {
          setConnectionStatus('Connecting…');
        }
      });

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [roomId, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const sendMessage = async (rawMessage: string, messageType: 'text' | 'quick') => {
    const body = rawMessage.trim();

    if (!body || sending) return;

    if (!roomId || !memberId || !userId || !riderName) {
      setError('Join this ride with your rider profile before sending messages.');
      return;
    }

    if (rideEnded) {
      setError('This ride has ended. Chat is now read-only.');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const { data, error: sendError } = await supabase
        .from('ride_messages')
        .insert({
          room_id: roomId,
          member_id: memberId,
          user_id: userId,
          rider_name: riderName,
          body,
          message_type: messageType,
        })
        .select('id, room_id, member_id, user_id, rider_name, body, message_type, created_at')
        .single();

      if (sendError) throw sendError;

      const savedMessage = data as RideChatMessage;
      setMessages((current) => {
        if (current.some((message) => message.id === savedMessage.id)) {
          return current;
        }
        return [...current, savedMessage].sort(
          (a, b) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()
        );
      });

      if (messageType === 'text') setDraft('');
    } catch (sendFailure) {
      console.error('Send ride chat message failed:', sendFailure);
      setError(
        sendFailure instanceof Error
          ? sendFailure.message
          : 'Message could not be sent. Please try again.'
      );
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(draft, 'text');
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(draft, 'text');
    }
  };

  const canSend = Boolean(memberId && userId && riderName) && !rideEnded;

  return (
    <section
      className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card"
      aria-labelledby="ride-chat-heading"
    >
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ridesync-50 text-ridesync-700">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 id="ride-chat-heading" className="font-semibold text-charcoal">
              Ride group chat
            </h2>
            <p className="text-xs text-charcoal-muted">
              Messages are shared with everyone in this ride.
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">
          <Wifi className="h-3.5 w-3.5" />
          {connectionStatus}
        </span>
      </div>

      <div
        className="h-[320px] space-y-3 overflow-y-auto bg-gray-50/70 px-3 py-4 sm:h-[380px] sm:px-5"
        aria-live="polite"
        aria-relevant="additions"
        role="log"
        aria-label="Ride group messages"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <MessageCircle className="mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm font-semibold text-charcoal">No messages yet</p>
            <p className="mt-1 max-w-xs text-xs text-charcoal-muted">
              Send a message to coordinate fuel stops, breaks or bike issues with your group.
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isMine = message.user_id === userId;
            return (
              <div
                key={message.id}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-sm sm:max-w-[75%] ${
                    isMine
                      ? 'rounded-br-md bg-ridesync-700 text-white'
                      : 'rounded-bl-md border border-gray-200 bg-white text-charcoal'
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className={`text-[11px] font-bold ${
                        isMine ? 'text-white/90' : 'text-ridesync-700'
                      }`}
                    >
                      {isMine ? 'You' : message.rider_name}
                    </span>
                    {message.message_type === 'quick' && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                          isMine ? 'bg-white/15 text-white/80' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        Quick update
                      </span>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {message.body}
                  </p>
                  <p
                    className={`mt-1 text-right text-[10px] ${
                      isMine ? 'text-white/65' : 'text-gray-400'
                    }`}
                  >
                    {formatMessageTime(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-100 p-3 sm:p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-charcoal-muted">
          Quick updates
        </p>
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {QUICK_MESSAGES.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => void sendMessage(item.body, 'quick')}
                disabled={!canSend || sending}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-charcoal-soft transition-colors hover:border-ridesync-300 hover:bg-ridesync-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon className="h-3.5 w-3.5 text-ridesync-700" />
                {item.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              if (!currentLocation) return;
              const mapsLink = `https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`;
              void sendMessage(`📍 My current location: ${mapsLink}`, 'quick');
            }}
            disabled={!canSend || sending || !currentLocation}
            title={currentLocation ? 'Share your current GPS position with the group' : 'Waiting for a current GPS fix'}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MapPin className="h-3.5 w-3.5" />
            Share my location
          </button>
        </div>

        {rideEnded ? (
          <p className="rounded-lg bg-gray-100 px-3 py-3 text-xs text-charcoal-muted">
            This ride has ended. Chat history is available in read-only mode.
          </p>
        ) : !canSend ? (
          <p className="rounded-lg bg-amber-50 px-3 py-3 text-xs text-amber-800">
            Join this room with a rider profile to participate in the chat.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <label className="sr-only" htmlFor="ride-chat-composer">
              Write a group message
            </label>
            <textarea
              id="ride-chat-composer"
              value={draft}
              onChange={(event) => setDraft(event.target.value.slice(0, 500))}
              onKeyDown={handleComposerKeyDown}
              placeholder="Message your ride group…"
              rows={1}
              maxLength={500}
              disabled={sending}
              className="max-h-28 min-h-11 flex-1 resize-y rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-charcoal outline-none transition focus:border-ridesync-500 focus:ring-2 focus:ring-ridesync-100 disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              aria-label="Send message"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ridesync-700 text-white transition hover:bg-ridesync-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        )}

        {error && (
          <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-charcoal-muted">
          For safety, send and read messages only when you are stopped in a safe place.
        </p>
      </div>
    </section>
  );
}
