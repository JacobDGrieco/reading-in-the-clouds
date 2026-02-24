import { useState, useEffect } from "react";
import { getCollections, saveCollections } from "../utils/storage";
import { useNavigate } from "react-router-dom";

export default function Collections() {
	const [collections, setCollections] = useState([]);
	const [newName, setNewName] = useState("");
	const navigate = useNavigate();

	useEffect(() => {
		setCollections(getCollections());
	}, []);

	const addCollection = () => {
		if (!newName.trim()) return;

		const updated = [
			...collections,
			{ id: Date.now().toString(), name: newName, items: [] },
		];

		setCollections(updated);
		saveCollections(updated);
		setNewName("");
	};

	return (
		<div className="page">
			<h1>Your Collections</h1>

			<div className="create-collection">
				<input
					placeholder="New Collection Name"
					value={newName}
					onChange={(e) => setNewName(e.target.value)}
				/>
				<button onClick={addCollection}>Create</button>
			</div>

			<div className="collection-grid">
				{collections.map((col) => (
					<div
						key={col.id}
						className="collection-card"
						onClick={() => navigate(`/collection/${col.id}`)}
					>
						<h3>{col.name}</h3>
						<p>{col.items.length} items</p>
					</div>
				))}
			</div>
		</div>
	);
}