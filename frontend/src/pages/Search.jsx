import { useState, useEffect, useRef } from "react";
import { searchMedia } from "../services/mediaSearch";
import { getCollections, saveCollections } from "../utils/storage";

const searchCache = {};

export default function Search() {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState([]);
	const [filteredResults, setFilteredResults] = useState([]);

	// API paging state
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(false);
	const [loading, setLoading] = useState(false);

	// For page count UI (if available from API)
	const [totalResults, setTotalResults] = useState(null);
	const [pageSize, setPageSize] = useState(20);

	// UI mode toggle: default = infinite scroll
	const [usePagination, setUsePagination] = useState(false);

	// Filters (kept)
	const [mediaFilter, setMediaFilter] = useState("ALL");
	const [sourceFilter, setSourceFilter] = useState("ALL");

	// Only used in pagination mode (page number user is on)
	const [currentPage, setCurrentPage] = useState(1);

	const observerRef = useRef(null);
	const debounceRef = useRef(null);

	const ITEMS_PER_PAGE = 20; // your desired UI page size

	/* ----------------------------- */
	/* SEARCH FUNCTION               */
	/* ----------------------------- */
	const runSearch = async (newQuery, pageNumber = 1) => {
		if (!newQuery.trim()) return;

		// cache must include mode so toggling doesn't reuse wrong results
		const modeKey = usePagination ? "PAGED" : "INFINITE";
		const cacheKey = `${newQuery}_${modeKey}_${pageNumber}`;

		// In pagination mode, we want REPLACE per page.
		// In infinite mode, we want APPEND after page 1.
		const shouldAppend = !usePagination && pageNumber > 1;

		if (searchCache[cacheKey]) {
			const cached = searchCache[cacheKey];
			setResults((prev) => (shouldAppend ? [...prev, ...cached.results] : cached.results));
			setHasMore(!!cached.hasMore);
			setPage(pageNumber);
			setCurrentPage(pageNumber);

			// totals (if present)
			setTotalResults(
				typeof cached.totalResults === "number" ? cached.totalResults : null
			);
			setPageSize(typeof cached.pageSize === "number" ? cached.pageSize : ITEMS_PER_PAGE);

			return;
		}

		setLoading(true);

		// NOTE: your mediaSearch supports (query, page, sortType) but we are not sorting anymore
		const data = await searchMedia(newQuery, pageNumber, "DEFAULT");

		searchCache[cacheKey] = data;

		setResults((prev) => (shouldAppend ? [...prev, ...data.results] : data.results));
		setHasMore(!!data.hasMore);
		setPage(pageNumber);
		setCurrentPage(pageNumber);

		setTotalResults(typeof data.totalResults === "number" ? data.totalResults : null);
		setPageSize(typeof data.pageSize === "number" ? data.pageSize : ITEMS_PER_PAGE);

		setLoading(false);
	};

	/* ----------------------------- */
	/* DEBOUNCED SEARCH              */
	/* ----------------------------- */
	useEffect(() => {
		clearTimeout(debounceRef.current);

		debounceRef.current = setTimeout(() => {
			// reset when query changes
			setResults([]);
			setFilteredResults([]);
			setHasMore(false);
			setTotalResults(null);
			setPageSize(ITEMS_PER_PAGE);
			setPage(1);
			setCurrentPage(1);

			runSearch(query, 1);
		}, 500);

		return () => clearTimeout(debounceRef.current);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, usePagination]);

	/* ----------------------------- */
	/* INFINITE SCROLL               */
	/* ----------------------------- */
	useEffect(() => {
		if (usePagination) return; // only infinite scroll in infinite mode

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasMore && !loading) {
					runSearch(query, page + 1);
				}
			},
			{ threshold: 0.25 }
		);

		if (observerRef.current) observer.observe(observerRef.current);

		return () => observer.disconnect();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [usePagination, hasMore, loading, page, query]);

	/* ----------------------------- */
	/* FILTER PIPELINE               */
	/* ----------------------------- */
	useEffect(() => {
		let updated = [...results];

		if (mediaFilter !== "ALL") {
			updated = updated.filter((r) => r.mediaType === mediaFilter);
		}

		if (sourceFilter !== "ALL") {
			updated = updated.filter((r) => r.source === sourceFilter);
		}

		setFilteredResults(updated);

		// In pagination mode, if you change filters, keep you on page 1 (UI)
		// (We do NOT refetch because filters are client-side)
		if (usePagination) {
			setCurrentPage(1);
		}
	}, [results, mediaFilter, sourceFilter, usePagination]);

	/* ----------------------------- */
	/* PAGINATION STATE/DERIVED      */
	/* ----------------------------- */
	// Use API totals when available; otherwise fall back to "unknown pages"
	const computedTotalPages =
		typeof totalResults === "number" && totalResults >= 0
			? Math.max(1, Math.ceil(totalResults / (pageSize || ITEMS_PER_PAGE)))
			: null;

	const canGoPrev = usePagination && currentPage > 1;
	const canGoNext = usePagination && (computedTotalPages ? currentPage < computedTotalPages : hasMore);

	const goToPage = (nextPage) => {
		const safe = Math.max(1, nextPage);
		setCurrentPage(safe);

		// in pagination mode, each page is a fetch+replace
		setResults([]);
		setFilteredResults([]);
		setHasMore(false);

		runSearch(query, safe);
	};

	/* ----------------------------- */
	/* ADD TO COLLECTION             */
	/* ----------------------------- */
	const addToCollection = (collectionId, item) => {
		const collections = getCollections();

		const updated = collections.map((col) => {
			if (col.id === collectionId) {
				const exists = col.items.some((i) => i.id === item.id);
				if (exists) return col;
				return { ...col, items: [...col.items, item] };
			}
			return col;
		});

		saveCollections(updated);
		alert("Added!");
	};

	const collections = getCollections();

	const PaginationControls = () =>
		usePagination ? (
			<div className="pagination">
				<button disabled={!canGoPrev || loading} onClick={() => goToPage(currentPage - 1)}>
					Prev
				</button>

				<span>{currentPage}</span>

				<button disabled={!canGoNext || loading} onClick={() => goToPage(currentPage + 1)}>
					Next
				</button>
			</div>
		) : null;

	return (
		<div className="page">
			<h1>Search</h1>

			<input
				placeholder="Search by title, ISBN, UPC"
				value={query}
				onChange={(e) => setQuery(e.target.value)}
			/>

			{/* FILTER CONTROLS */}
			<div className="filter-bar">
				<select value={mediaFilter} onChange={(e) => setMediaFilter(e.target.value)}>
					<option value="ALL">All Types</option>
					<option value="BOOK">Books</option>
					<option value="MOVIE">Movies</option>
				</select>

				<select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
					<option value="ALL">All Sources</option>
					<option value="GoogleBooks">GoogleBooks</option>
					<option value="OpenLibrary">OpenLibrary</option>
					<option value="OMDb">OMDb</option>
				</select>

				{/* Mode toggle */}
				<label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
					<input
						type="checkbox"
						checked={usePagination}
						onChange={(e) => {
							const next = e.target.checked;

							// hard reset; the debounced effect will fetch once
							setUsePagination(next);
							setResults([]);
							setFilteredResults([]);
							setHasMore(false);
							setPage(1);
							setCurrentPage(1);
						}}
					/>
					Pages
				</label>

				<button
					onClick={() => {
						setMediaFilter("ALL");
						setSourceFilter("ALL");
					}}
				>
					Clear Filters
				</button>
			</div>

			<div className="results-list">
				<PaginationControls />
				{filteredResults.map((item) => (
					<div key={item.id} className="result-item">
						<img
							loading="lazy"
							src={item.cover || "/placeholder.png"}
							alt={item.title}
							onError={(e) => (e.target.src = "/placeholder.png")}
						/>

						<div className="result-info">
							<h3>{item.title}</h3>
							<p>{(item.creators || []).join(", ")}</p>
							<p>{item.year}</p>
							<p>
								{item.mediaType} • {item.source}
							</p>

							<select onChange={(e) => addToCollection(e.target.value, item)} defaultValue="">
								<option value="" disabled>
									Add to collection.
								</option>
								{collections.map((c) => (
									<option key={c.id} value={c.id}>
										{c.name}
									</option>
								))}
							</select>
						</div>
					</div>
				))}

				<PaginationControls />
				{/* Infinite scroll sentinel */}
				{!usePagination && hasMore && <div ref={observerRef} style={{ height: 20 }} />}
			</div>

			{loading && <p>Loading.</p>}
		</div>
	);
}