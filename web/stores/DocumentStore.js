import { Store } from 'pullstate';

export const DocumentStore = new Store({
	// Storing current page for each document
	state: {},
	// Index of text content for all documents
	index: {},
	// Search results
	results: {},
});
