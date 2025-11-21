const pdfDir = path.join(__dirname, "pdfs");

app.get("/pdfs/:name.pdf", (req, res) => {
    const pdfName = req.params.name;
    const pdfPath = path.join(pdfDir, `${pdfName}.pdf`);

    // Send pdf
    res.sendFile(pdfPath, err =>{
        if(err)
            return res.status(404).json({error:"PDF not found"});
    });
});
