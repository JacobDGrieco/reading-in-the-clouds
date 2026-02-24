import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react()],
	server: {
		watch: {
			usePolling: true,
			interval: 200, // try 100-500
		},
		host: true, // lets browser access from Windows
		port: 5173,
		strictPort: true,
	},
});