/**
 * Winziger Event-Bus für das Debug-Log.
 *
 * Wichtig für die Reproduktion: Das Log darf KEINEN React-State in der
 * Komponente ändern, die die Tabelle rendert. Sonst löst jeder Log-Eintrag
 * selbst ein Rerender aus – und der Bug feuert schon beim Sortier-Klick statt
 * erst beim Scrollen.
 */

export type LogKind = 'render' | 'scroll' | 'state' | 'info';

export type LogEntry = {
	id: number;
	time: string;
	kind: LogKind;
	text: string;
};

type Listener = (entry: LogEntry) => void;

const listeners = new Set<Listener>();
let nextId = 1;

export function subscribeToLog(listener: Listener): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function emitLog(kind: LogKind, text: string): void {
	const now = new Date();
	const entry: LogEntry = {
		id: nextId++,
		time: `${now.toLocaleTimeString('de-DE', { hour12: false })}.${String(now.getMilliseconds()).padStart(3, '0')}`,
		kind,
		text,
	};
	listeners.forEach((listener) => listener(entry));
}
