//let socket = null;
        console.log('Crash Test');
        // Connect to the Socket.IO server
        const socket = io({
            withCredentials: true
        });

        console.log('Crash Test 2');
        // Update status when connected
        socket.on('connect', () => {
            console.log('Connected to server!');
            document.getElementById('status').textContent = 'Status: Connected (ID: ' + socket.id + ')';
        });

        console.log('Crash Test 3');

        // Update status when disconnected
        socket.on('disconnect', () => {
            console.log('Disconnected from server');
            document.getElementById('status').textContent = 'Status: Disconnected';
        });
        console.log('Crash Test 4');
        // Listen for 'response' event from server
        socket.on('response', (data) => {
            console.log('Received JSON response:', data);
            
            // Display the JSON response in a readable format
            const responseDiv = document.getElementById('response');
            responseDiv.textContent = JSON.stringify(data, null, 2);
        });
        console.log('Crash Test 5');
        // Listen for errors
        socket.on('error', (error) => {
            console.error('Socket error:', error);
            document.getElementById('response').textContent = 'Error: ' + error.message;
        });
        console.log('Crash Test 6');

        socket.on('newChatMessage', (data) => {
            console.log('New chat message received:', data);
            const chatLogEntry = document.getElementById('chat-log-entry');
            const newEntry = document.createElement('ul');
            newEntry.textContent = data.message;
            chatLogEntry.appendChild(newEntry);
        });

        /* Handle button click
        const button = document.getElementById('requestData');
        button.addEventListener('click', () => {
            console.log('Requesting data from server...');
            
            // Emit 'requestData' event to server with some data
            socket.emit('requestData', {
                message: 'Hello from client!',
                timestamp: new Date().toISOString(),
                clientId: socket.id
            });
        });*/

        document.getElementById('send-chat-message').addEventListener('click', () => {
            console.log('Sending chat message...');
            const message = document.querySelector('input[name="chat_message"]').value;
            socket.emit('newChatMessage', {
                message: message
            });
            console.log('Chat message sent:', message);
        });