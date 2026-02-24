import { Link } from "react-router-dom";

export default function Navbar() {
	return (
		<nav className="navbar">
			<h2>ReadingInTheClouds</h2>
			<div>
				<Link to="/">Collections</Link>
				<Link to="/search">Search</Link>
			</div>
		</nav>
	);
}