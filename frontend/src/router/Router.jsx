import { Routes, Route } from "react-router-dom";
import Collections from "../pages/Collections";
import CollectionDetails from "../pages/CollectionDetails";
import Search from "../pages/Search";

export default function Router() {
	return (
		<Routes>
			<Route path="/" element={<Collections />} />
			<Route path="/collection/:id" element={<CollectionDetails />} />
			<Route path="/search" element={<Search />} />
		</Routes>
	);
}