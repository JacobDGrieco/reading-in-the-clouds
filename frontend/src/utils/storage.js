const COLLECTION_KEY = "ritc_collections";

export function getCollections() {
	const data = localStorage.getItem(COLLECTION_KEY);
	return data ? JSON.parse(data) : [];
}

export function saveCollections(collections) {
	localStorage.setItem(COLLECTION_KEY, JSON.stringify(collections));
}