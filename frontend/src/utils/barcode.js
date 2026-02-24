export function detectCodeType(input) {
	const cleaned = input.replace(/[^0-9X]/gi, "");

	if (cleaned.length === 10 || cleaned.length === 13) {
		return "ISBN";
	}

	if (cleaned.length === 12) {
		return "UPC";
	}

	return "UNKNOWN";
}