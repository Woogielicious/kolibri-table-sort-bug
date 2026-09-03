import { useEffect, useState } from 'react';

import { readTableSnapshot, type TableSnapshot } from './inspect';
import { emitLog } from './logBus';

/**
 * Liest den tatsächlichen Sortierzustand direkt aus dem Shadow DOM der Tabelle
 * und zeigt ihn im Klartext an – unabhängig davon, ob die Icon-Font geladen ist.
 *
 * Eigener State, damit ein Update hier KEIN Rerender der Tabelle auslöst.
 * Polling statt MutationObserver, weil ein Observer keine Shadow Roots durchdringt.
 */
export function SortStatus() {
	const [snapshot, setSnapshot] = useState<TableSnapshot | null>(null);

	useEffect(() => {
		let previous: TableSnapshot | null = null;

		const check = () => {
			const next = readTableSnapshot(document.body);
			if (!next) {
				return;
			}
			if (previous && previous.sort === next.sort && previous.firstRow === next.firstRow) {
				return;
			}
			const wasSorted = previous !== null && previous.sort !== '– keine –';
			previous = next;
			setSnapshot(next);
			emitLog(
				next.sort === '– keine –' && wasSorted ? 'state' : 'info',
				`Tabelle → Sortierung: ${next.sort} | erste Zeile: ${next.firstRow}`,
			);
		};

		check();
		const timer = window.setInterval(check, 200);
		return () => window.clearInterval(timer);
	}, []);

	const sorted = snapshot !== null && snapshot.sort !== '– keine –';

	return (
		<p className={sorted ? 'sortstatus sortstatus--sorted' : 'sortstatus'}>
			<strong>Sortierung laut DOM:</strong> {snapshot?.sort ?? '…'}
			<br />
			<strong>Erste Zeile:</strong> {snapshot?.firstRow ?? '…'}
		</p>
	);
}
