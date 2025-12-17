Run Instructions:
- In your browser, open https://bogobit.org/
- That's it!

The server will remain running until the end of 2025 (or when this gets graded).
If the server is down before then, let me know.

Database schema -----------------------------------------------------------------------------

- The database is handled using SQlite3 and there are tables for the following data:
  - Users: id, username, password, display_name, email, name_color, last_login
  - Sessions: id, user_id, session_data, created_at
  - comments: id, user_id, text, created_at
  - messages: id, user_id, text, created_at
  - login_attempts: id, ip_address, username, attempt_time, success
  - comment_votes: user_id, comment_id, vote
- votes are linked via comment_id and user_id
- passwords are hashed
- Data is NOT saved when docker is taken down
- Data is filtered through SQL and JS scripting


Security ------------------------------------------------------------------------------------

- For security, all passwords are hashed and features relating to your profile
  require authorization. All other info is not for time.
- All input fields were tested for XSS with %3cscript%3ealert(123)%3cscript%3e;
- SearchQuery also tested for XSS
- Database inserts are filtered
- No sacrifices were made in terms of security, BUT there may be some loopholes that
  slipped through the cracks I'm unaware of.


Sacrifices ----------------------------------------------------------------------------------

- Optimization (especially in the database) was sacrificed for 
    meeting the deadline on time. Some tinkering will be required for optimal results.
- Gmail integration was not working in time for the deadline, so no password recovery
  / change via email is possible.


If you wish to read or modify the code ------------------------------------------------------

- Clone https://github.com/JoshLopez26/498-Webserver.git into your server and pull
  If the pull was successful, there should be a new directory called '498-Webserver'
- PDF details are stored as JSON files and the names MUST be the same!
- All page routing is handled through router.js in the modules directory.
- Real-time chat messages are handled through server.js through socket.io and chat.hbs.
- The PDF's page has it's own handler called from router.js called discover-pdf.js.
- When clicking on a PDF link, it gets validated through validate-pdf.js, then opens link.
- If the server domain name were to change, https://bogobit.org must be updated to the
  correct domain name in chat.hbs and server.js for the functionality of socket.io.


---------------------------------------------------------------------------------------------

Used Squarespace to get domain name and nginx-proxy to integrate HTTPS certificate.