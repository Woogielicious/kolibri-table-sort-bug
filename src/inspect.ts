/**
 * Kleine Hilfsfunktionen, um den *tatsächlichen* Zustand der KoliBri-Tabelle
 * aus dem (verschachtelten) Shadow DOM auszulesen.
 *
 * Nötig, weil `kol-table-stateful` keinen `onSort`-Callback nach außen gibt
 * (`TableStatefulCallbacksPropType` kennt nur `onSelectionChange`) – der
 * Sortierzustand ist also nur über das gerenderte Markup beobachtbar.
 */

export type TableSnapshot = {
	/** z. B. "Name ▲" oder "– keine –" */
	sort: string;
	/** Inhalt der ersten sichtbaren Datenzeile */
	firstRow: string;
};

function findTableElement(root: Document | ShadowRoot | Element, depth = 0): HTMLTableElement | null {
	if (depth > 6) {
		return null;
	}

	const direct = root.querySelector?.('table');
	if (direct) {
		return direct as HTMLTableElement;
	}

	const candidates = Array.from(root.querySelectorAll?.('*') ?? []);
	for (const element of candidates) {
		const shadow = (element as HTMLElement).shadowRoot;
		if (shadow) {
			const found = findTableElement(shadow, depth + 1);
			if (found) {
				return found;
			}
		}
	}

	return null;
}

export function readTableSnapshot(host: HTMLElement | null): TableSnapshot | null {
	if (!host) {
		return null;
	}

	const table = findTableElement(host);
	if (!table) {
		return null;
	}

	const sortedHeaders = Array.from(table.querySelectorAll('th[aria-sort]'))
		.filter((th) => th.getAttribute('aria-sort') !== 'none')
		.map((th) => {
			const direction = th.getAttribute('aria-sort') === 'ascending' ? '▲ ASC' : '▼ DESC';
			return `${(th.textContent ?? '').trim()} ${direction}`;
		});

	const firstRowCells = Array.from(table.querySelectorAll('tbody tr:first-child td')).map((td) =>
		(td.textContent ?? '').trim(),
	);

	return {
		sort: sortedHeaders.length > 0 ? sortedHeaders.join(', ') : '– keine –',
		firstRow: firstRowCells.length > 0 ? firstRowCells.slice(0, 3).join(' | ') : '– leer –',
	};
}
