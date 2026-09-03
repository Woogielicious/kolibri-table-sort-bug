export type Vorgang = {
	id: number;
	aktenzeichen: string;
	name: string;
	referat: string;
	ort: string;
	betrag: number;
	eingang: string;
};

const NACHNAMEN = [
	'Abt',
	'Baumann',
	'Christ',
	'Drescher',
	'Engel',
	'Fischer',
	'Groß',
	'Hoffmann',
	'Ilgner',
	'Jung',
	'Kessler',
	'Lehmann',
	'Möller',
	'Neumann',
	'Ostermann',
	'Peters',
	'Quandt',
	'Richter',
	'Schulz',
	'Thiel',
	'Ulrich',
	'Vogel',
	'Wagner',
	'Xander',
	'Zimmermann',
];

const VORNAMEN = ['Anna', 'Bernd', 'Clara', 'David', 'Elke', 'Frank', 'Greta', 'Hendrik', 'Ines', 'Jonas'];

const REFERATE = ['Referat I A 1', 'Referat I B 3', 'Referat II A 2', 'Referat II C 4', 'Referat III B 1'];

const ORTE = ['Berlin', 'Bonn', 'Dresden', 'Frankfurt', 'Hamburg', 'Köln', 'München', 'Nürnberg', 'Stuttgart'];

/**
 * Deterministischer Pseudo-Zufall, damit der Datensatz bei jedem Start identisch ist.
 * Ohne feste Reihenfolge lässt sich schlecht beurteilen, ob eine Sortierung verloren ging.
 */
function pseudoRandom(seed: number): () => number {
	let state = seed;
	return () => {
		state = (state * 1664525 + 1013904223) % 4294967296;
		return state / 4294967296;
	};
}

export const ROW_COUNT = 100;

export function createDummyData(count: number = ROW_COUNT): Vorgang[] {
	const rnd = pseudoRandom(42);
	const rows: Vorgang[] = [];

	for (let i = 0; i < count; i++) {
		const nachname = NACHNAMEN[Math.floor(rnd() * NACHNAMEN.length)];
		const vorname = VORNAMEN[Math.floor(rnd() * VORNAMEN.length)];
		const tag = 1 + Math.floor(rnd() * 28);
		const monat = 1 + Math.floor(rnd() * 12);

		rows.push({
			id: i + 1,
			aktenzeichen: `AZ-2026-${String(1000 + Math.floor(rnd() * 9000))}`,
			name: `${nachname}, ${vorname}`,
			referat: REFERATE[Math.floor(rnd() * REFERATE.length)],
			ort: ORTE[Math.floor(rnd() * ORTE.length)],
			betrag: Math.round(rnd() * 950000) / 100,
			eingang: `2026-${String(monat).padStart(2, '0')}-${String(tag).padStart(2, '0')}`,
		});
	}

	return rows;
}

/** Basis-Datensatz: 100 Einträge, stabile Referenz. */
export const VORGAENGE: Vorgang[] = createDummyData();
