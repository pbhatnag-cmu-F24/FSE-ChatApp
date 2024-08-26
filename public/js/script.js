const token = localStorage.getItem('token');

if (!token) {
    window.location.href = 'http://127.0.0.1:5500/public/pages/Login.html';
}

if (document.getElementById('login-screen')) {
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            try {
                const response = await fetch('http://localhost:3001/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password })
                });
                const data = await response.json();
                if (response.ok) {
                    localStorage.setItem('username', username)
                    localStorage.setItem('token', data.token)
                    window.location.href = data.redirect;
                } else {
                    alert(data.message);
                }
            } catch (error) {
                console.error('Login failed:', error.message);
            }
        });
    }

    if (registerBtn) {
        registerBtn.addEventListener('click', async () => {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            console.log('username : ' + username + ' password : ' + password)
            
            try {
                const response = await fetch('http://localhost:3001/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password })
                });
                const data = await response.text();
                if (response.ok) {
                    alert('Registration successful! Please log in.');
                } else {
                    console.log(response)
                    alert('Registration Failed : ' + data);
                }
            } catch (error) {
                console.error('Registration failed:', error);
            }
        });
    }
}

if (document.getElementById('chat-room-screen')) {
    const socket = io('http://localhost:3001');

    const logoutBtn = document.getElementById('logout-btn');
    const postBtn = document.getElementById('post-btn');
    const messageInput = document.getElementById('message-input');
    const messagesDiv = document.getElementById('messages');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('http://localhost:3001/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    localStorage.clear('username')
                    localStorage.clear('token')
                    window.location.href = '/public/pages/Login.html';
                } else {
                    alert('Could not logout gracefully');
                }
            } catch (error) {
                console.error('Logout failed');
            }
        });
    }

    if (postBtn) {
        postBtn.addEventListener('click', () => {
            console.log('messageInput : ' + messageInput.value)
            console.log('username : ' + localStorage.getItem('username'))
            const message = messageInput.value;
            const token = localStorage.getItem('token');
            
            socket.emit('postMessage', {
                username: localStorage.getItem('username'), 
                message: message,
                token: token,
                timestamp: Date.now()
            });

            messageInput.value = '';
        });
    }

    socket.on('newMessage', (data) => {
        const user = data.username == localStorage.getItem('username') ? 'Me' : data.username;
        const messageDate = new Date(data.timestamp);
        const formattedTimestamp = messageDate.toLocaleString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        });
        const messageHTML = `
            <div class="message">
                <span class="username"><strong>${user}</strong></span>
                <span class="time">${formattedTimestamp}</span>
                <div>${data.content}</div>
            </div>`;
    
        messagesDiv.insertAdjacentHTML('beforeend', messageHTML);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
    

    socket.on('PopulateChat', (messages) => {
        console.log('messages : ' + messages)
        if (Array.isArray(messages) && messages.length > 0) {
            console.log(messages)
            messages.forEach(message => {
                const messageElement = document.createElement('div');
                messageElement.className = "message"; 
                const user = message.username == localStorage.getItem('username') ? 'Me' : message.username;
                const messageDate = new Date(message.timestamp);
                const formattedTimestamp = messageDate.toLocaleString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true
                });
            
                messageElement.innerHTML = `<span class="username"><strong>${user}</strong></span>
                    <span class="time">${formattedTimestamp}</span>
                    <div>${message.message}</div>`;
                messagesDiv.appendChild(messageElement);
            });
            
        }
        else {
            console.log("No messages present in database")
        }
    });

    socket.on('InvalidToken', (message) => {
        console.log('err : Invalid Token : ', + message.alert)
    })

    socket.on('UserNotFound', (message) => {
        console.log('err : User Not Found : ', + message.alert)
    })

    socket.emit('fetchMessages');
}
