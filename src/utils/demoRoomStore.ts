/**
 * In-memory demo room store.
 *
 * Rooms exist only for the current browser session — they are not persisted,
 * not sent to a server, and not visible to other devices. This is clearly
 * labelled as demo data throughout the UI.
 */

export interface DemoRoom {
  id: string;
  code: string;
  name: string;
  destination: string;
  createdAt: number;
}

const rooms = new Map<string, DemoRoom>();

function generateCode(): string {
  const segment = () =>
    Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, '0');
  return `RIDE-${segment()}`;
}

function generateId(): string {
  return `room_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createDemoRoom(name: string, destination: string): DemoRoom {
  const room: DemoRoom = {
    id: generateId(),
    code: generateCode(),
    name: name.trim(),
    destination: destination.trim(),
    createdAt: Date.now(),
  };
  rooms.set(room.id, room);
  return room;
}

export function getDemoRoom(id: string): DemoRoom | undefined {
  return rooms.get(id);
}

/** Normalize a user-entered room code: trim, uppercase, collapse spaces. */
export function normalizeRoomCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '-');
}
