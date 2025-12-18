// Read and display in list format all available pdfs for reader to view

const express = require('express');
const validateRouter = require('./validate-pdf');
const router = express.Router();

// GET /pdfs/ - render pdf.hbs with all JSON data from /pdfs
const fs = require('fs');
const path = require('path');

// Find all pdfs in /pdfs along with json data
router.get('/', (req, res) => {
    const pdfsDir = path.join(__dirname, '..', 'pdfs');
    fs.readdir(pdfsDir, (err, files) => {
        if (err) {
            return res.status(500).send('Folder or files do not exist');
        }

        // Filter out JSON files
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        const pdfs = [];
        let readCount = 0;

        // Render page if list is empty
        if (jsonFiles.length === 0) {
            return res.render('pdf', { pdfs: [] , user: req.session });
        }

        // For each JSON file, read its data then after all data is stored, render page
        jsonFiles.forEach(file => {
            fs.readFile(path.join(pdfsDir, file), 'utf8', (err, data) => {
                readCount++;
                if (!err) {
                    // Build object from JSON data
                    try {
                        const obj = JSON.parse(data);
                        obj.jsonName = file;
                        obj.pdfName = file.replace('.json', '.pdf');
                        pdfs.push(obj);
                    } catch {}
                }
                // Render after all files processed
                if (readCount === jsonFiles.length) {
                    res.render('pdf', { pdfs: pdfs, user: req.session });
                }
            });
        });
    });
});

// Route to validate-pdf when file is chosen
router.use('/', validateRouter);

module.exports = router;
