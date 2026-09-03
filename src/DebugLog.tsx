import { useEffect, useState } from 'react';
import { subscribeToLog, type LogEntry } from './logBus';

/**
 * Das Log hält seinen State bewusst lokal. Dadurch führt ein neuer Log-Eintrag
 * NICHT zu einem Rerender der Tabelle.
 */
export function DebugLog() {
	const [entries, setEntries] = useState<LogEntry[]>([]);

	useEffect(() => subscribeToLog((entry) => setEntries((prev) => [entry, ...prev].slice(0, 300))), []);

	return (
		<>
			<div className="actions">
				<button type="button" onClick={() => setEntries([])}>
					Log leeren
				</button>
			</div>
			<ul className="log">
				{entries.length === 0 && <li className="log__empty">Noch keine Ereignisse.</li>}
				{entries.map((entry) => (
					<li key={entry.id} className={`log__item log__item--${entry.kind}`}>
						<span className="log__time">{entry.time}</span>
						<span className="log__text">{entry.text}</span>
					</li>
				))}
			</ul>
		</>
	);
}
