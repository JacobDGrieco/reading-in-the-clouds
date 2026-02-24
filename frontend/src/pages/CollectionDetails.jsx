import { useParams } from "react-router-dom";
import { getCollections, saveCollections } from "../utils/storage";
import { useState, useEffect } from "react";

export default function CollectionDetails() {
	const { id } = useParams();
	const [collection, setCollection] = useState(null);

	useEffect(() => {
		const collections = getCollections();
		const found = collections.find((c) => c.id === id);
		setCollection(found);
	}, [id]);

	if (!collection) return <div>Collection not found</div>;

	return (
		<div className="page">
			<h1>{collection.name}</h1>

			<div className="media-grid">
				{collection.items.map((item, idx) => (
					<div key={idx} className="media-card">
						<h4>{item.title}</h4>
						<p>{item.type}</p>
						<p>{item.code}</p>
					</div>
				))}
			</div>
		</div>
	);
}