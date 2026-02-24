import axios from "axios";

const OMDB_KEY = "YOUR_OMDB_KEY_HERE";

/* -------------------------------- */
/* MAIN SEARCH FUNCTION             */
/* -------------------------------- */
export async function searchMedia(query, page = 1, sortType = "DEFAULT") {
	const numeric = query.replace(/[^0-9X]/gi, "");

	if (numeric.length === 10 || numeric.length === 13) {
		const isbn = await searchOpenLibraryByISBN(numeric);
		if (isbn) return { results: [isbn], hasMore: false, totalResults: 1, pageSize: 20 };
	}

	const google = await searchGoogleBooks(query, page, sortType);
	if (google.results.length) return google;

	const omdb = await searchOMDb(query, page);
	if (omdb.results.length) return omdb;

	return { results: [], hasMore: false, totalResults: 0, pageSize: 20 };
}

/* -------------------------------- */
/* OPEN LIBRARY ISBN DIRECT         */
/* -------------------------------- */
async function searchOpenLibraryByISBN(isbn) {
	try {
		const res = await axios.get(
			`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
		);

		const data = res.data[`ISBN:${isbn}`];
		if (!data) return null;

		return normalizeBook({
			id: isbn,
			title: data.title,
			authors: data.authors?.map((a) => a.name),
			year: data.publish_date,
			cover: data.cover?.medium,
			source: "OpenLibrary",
			code: isbn,
		});
	} catch {
		return null;
	}
}

/* -------------------------------- */
/* GOOGLE BOOKS MULTI RESULT        */
/* -------------------------------- */
async function searchGoogleBooks(query, page, sortType) {
	try {
		const startIndex = (page - 1) * 20;

		// Optional: map your UI sort to Google’s orderBy (only "relevance" or "newest")
		const orderBy =
			sortType === "NEWEST" ? "newest" :
				"relevance";

		const res = await axios.get(
			`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20&startIndex=${startIndex}&orderBy=${orderBy}`
		);

		const items = res.data.items || [];
		const totalItems = Number.isFinite(res.data.totalItems) ? res.data.totalItems : null;

		const results = items.map((item) =>
			normalizeBook({
				id: item.id,
				title: item.volumeInfo.title,
				authors: item.volumeInfo.authors,
				year: item.volumeInfo.publishedDate,
				cover: item.volumeInfo.imageLinks?.thumbnail,
				source: "GoogleBooks",
				code: query,
			})
		);

		const hasMore =
			totalItems == null
				? items.length === 20
				: startIndex + items.length < totalItems;

		return { results, hasMore, totalResults: totalItems, pageSize: 20 };
	} catch {
		return { results: [], hasMore: false, totalResults: null, pageSize: 20 };
	}
}

/* -------------------------------- */
/* OMDb MULTI RESULT                */
/* -------------------------------- */
async function searchOMDb(query, page) {
	if (!OMDB_KEY || OMDB_KEY === "YOUR_OMDB_KEY_HERE")
		return { results: [], hasMore: false, totalResults: 0, pageSize: 20 };

	try {
		const res = await axios.get(
			`https://www.omdbapi.com/?s=${encodeURIComponent(query)}&page=${page}&apikey=${OMDB_KEY}`
		);

		if (res.data.Response === "False")
			return { results: [], hasMore: false, totalResults: 0, pageSize: 20 };

		const total = parseInt(res.data.totalResults, 10);
		const totalResults = Number.isFinite(total) ? total : null;

		const results = res.data.Search.map((item) => ({
			id: item.imdbID,
			title: item.Title,
			creators: [],
			year: item.Year,
			cover: item.Poster !== "N/A" ? item.Poster : "",
			mediaType: "MOVIE",
			source: "OMDb",
			code: query,
		}));

		// OMDb returns 10 per page; your UI wants 20/page.
		// Option A: keep 10/page for OMDb, or
		// Option B: fetch 2 pages and combine (more complex).
		// For now, keep it honest:
		return {
			results,
			hasMore: totalResults == null ? results.length === 10 : page < Math.ceil(totalResults / 10),
			totalResults,
			pageSize: 10,
		};
	} catch {
		return { results: [], hasMore: false, totalResults: null, pageSize: 10 };
	}
}

/* -------------------------------- */
/* NORMALIZER                       */
/* -------------------------------- */
function normalizeBook({
	id,
	title,
	authors,
	year,
	cover,
	source,
	code,
}) {
	return {
		id,
		title,
		creators: authors || [],
		year: year || "",
		cover: cover || "",
		mediaType: "BOOK",
		source,
		code,
	};
}