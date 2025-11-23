

const express = require('express');
const validateRouter = require('./validate-pdf');

const router = express.Router();

// GET /pdfs/ - render pdf.hbs with all JSON data from /pdfs
const fs = require('fs');
const path = require('path');

router.get('/', (req, res) => {
    const pdfsDir = path.join(__dirname, '..', 'pdfs');
    fs.readdir(pdfsDir, (err, files) => {
        if (err) {
            return res.status(500).send('Error reading PDF directory');
        }
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        const pdfs = [];
        let readCount = 0;
        if (jsonFiles.length === 0) {
            return res.render('pdf', { pdfs: [] });
        }
        jsonFiles.forEach(file => {
            fs.readFile(path.join(pdfsDir, file), 'utf8', (err, data) => {
                readCount++;
                if (!err) {
                    try {
                        const obj = JSON.parse(data);
                        obj.filename = file;
                        obj.pdfFile = file.replace('.json', '.pdf');
                        pdfs.push(obj);
                    } catch {}
                }
                if (readCount === jsonFiles.length) {
                    res.render('pdf', { pdfs });
                }
            });
        });
    });
});

// Delegate /pdfs/:name.pdf to validate-pdf.js
router.use('/', validateRouter);

module.exports = router;
