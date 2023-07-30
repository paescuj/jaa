export function getTextItemWithNeighbors(textItems, itemIndex, span = 1) {
	let previousItem = itemIndex - span;
	if (
		itemIndex > 1 &&
		textItems[previousItem] &&
		/^\s+$/.test(textItems[previousItem].str)
	) {
		previousItem--;
	}
	let nextItem = itemIndex + 1 + span;
	if (
		nextItem < textItems.length &&
		/^\s+$/.test(textItems[nextItem - 1].str)
	) {
		nextItem++;
	}
	return textItems
		.slice(Math.max(0, previousItem), nextItem)
		.filter(Boolean)
		.map((item) => item.str)
		.join('');
}

export function getIndexRange(string, substring) {
	const indexStart = string.indexOf(substring);
	const indexEnd = indexStart + substring.length;

	return [indexStart, indexEnd];
}

export function highlight(string, matches, style = 'blue') {
	const substrings = [];
	let previousEnd = 0;

	for (let [i, v] of matches.entries()) {
		const [start, end] = v;
		const prefix = string.substring(previousEnd, start);
		const match = (
			<mark key={i} style={{ backgroundColor: style }}>
				{string.substring(start, end)}
			</mark>
		);

		substrings.push(prefix, match);
		previousEnd = end;
	}

	substrings.push(string.substring(previousEnd));

	return substrings;
}
