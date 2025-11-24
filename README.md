Run Instructions:
- In your browser, open https://bogobit.org/
- That's it!

If you wish to read the code:
- Clone https://github.com/JoshLopez26/498-Webserver.git into your server and pull
  If the pull was successful, there should be a new directory called '498-Webserver'

The server will remain running, if it is down, let me know

PDF details are stored as JSON files and the names MUST be the same!

All routing is handled through router.js in the modules directory.
The PDF's page has it's own handler called from router.js called discover-pdf.js.
When clicking on a PDF link, it gets validated through validate-pdf.js, then opens the link.

Used Squarespace to get domain name and nginx-proxy to integrate HTTPS certificate.