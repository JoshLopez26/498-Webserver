const express = require('express');
const path = require('path');
const router = express.Router();

// PDFs are stored in backend/pdfs (one level up from modules)
const pdfDir = path.join(__dirname, '..', 'pdfs');

// Serve requested PDF by name (e.g. GET /pdfs/pdf1.pdf)
router.get('/:name.pdf', (req, res) => {
	const pdfName = req.params.name;
	const pdfPath = path.join(pdfDir, `${pdfName}.pdf`);

	res.sendFile(pdfPath, err => {
		if (err) {
			return res.status(404).json({ error: 'PDF not found' });
		}
	});
});

module.exports = router;
