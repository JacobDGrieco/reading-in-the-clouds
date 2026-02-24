import Router from "./router/Router";
import Navbar from "./components/Navbar";

function App() {
	return (
		<div className="app-container">
			<Navbar />
			<Router />
		</div>
	);
}

export default App;