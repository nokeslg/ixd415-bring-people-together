import { routePartykitRequest, Server, type Connection } from 'partyserver'

type Env = { Room: DurableObjectNamespace<Room>; ASSETS: Fetcher }

type User = { id: string; name: string; color: string; x: number; y: number }
type Sticker = { id: string; emoji: string; x: number; y: number; by: string }

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']
const EMOJI = ['⭐', '❤️', '😂', '🔥', '👋', '🎉', '👀', '🌮', '🐸', '💀']
const MAX_STICKERS = 400

const clamp01 = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5)
const cleanName = (s: unknown) =>
	(typeof s === 'string' ? s : '').replace(/[<>]/g, '').trim().slice(0, 20) || 'Guest'

// One instance of this class runs per room. Everyone in the room connects to the same one.
export class Room extends Server<Env> {
	users = new Map<string, User>()
	stickers: Sticker[] = []
	lastDrop = new Map<string, number>()

	onConnect(conn: Connection) {
		const user: User = {
			id: conn.id,
			name: 'Guest',
			color: COLORS[this.users.size % COLORS.length],
			x: 0.5,
			y: 0.5,
		}
		this.users.set(conn.id, user)
		conn.send(JSON.stringify({ type: 'init', you: conn.id, users: [...this.users.values()], stickers: this.stickers }))
		this.broadcast(JSON.stringify({ type: 'join', user }), [conn.id])
	}

	onMessage(conn: Connection, raw: string | ArrayBuffer) {
		if (typeof raw !== 'string' || raw.length > 500) return
		let msg: any
		try {
			msg = JSON.parse(raw)
		} catch {
			return
		}
		const user = this.users.get(conn.id)
		if (!user) return

		if (msg.type === 'name') {
			user.name = cleanName(msg.name)
			this.broadcast(JSON.stringify({ type: 'name', id: user.id, name: user.name }))
		} else if (msg.type === 'move') {
			user.x = clamp01(msg.x)
			user.y = clamp01(msg.y)
			this.broadcast(JSON.stringify({ type: 'move', id: user.id, x: user.x, y: user.y }), [conn.id])
		} else if (msg.type === 'drop') {
			// Guardrail: at most ~6 stickers a second per person, and only from the emoji list.
			const now = Date.now()
			if (now - (this.lastDrop.get(conn.id) ?? 0) < 150) return
			this.lastDrop.set(conn.id, now)
			if (!EMOJI.includes(msg.emoji)) return
			const sticker: Sticker = {
				id: crypto.randomUUID(),
				emoji: msg.emoji,
				x: clamp01(msg.x),
				y: clamp01(msg.y),
				by: user.name,
			}
			this.stickers.push(sticker)
			if (this.stickers.length > MAX_STICKERS) this.stickers.shift()
			this.broadcast(JSON.stringify({ type: 'drop', sticker }))
		} else if (msg.type === 'clear') {
			this.stickers = []
			this.broadcast(JSON.stringify({ type: 'clear', by: user.name }))
		}
	}

	onClose(conn: Connection) {
		this.users.delete(conn.id)
		this.lastDrop.delete(conn.id)
		this.broadcast(JSON.stringify({ type: 'leave', id: conn.id }))
	}
}

export default {
	async fetch(request: Request, env: Env) {
		// WebSocket connections go to /parties/room/<room-name>; everything else is the web page.
		return (await routePartykitRequest(request, env)) || env.ASSETS.fetch(request)
	},
} satisfies ExportedHandler<Env>
