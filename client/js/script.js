document.getElementById('login-btn').addEventListener('click', () => {
    // Simple login validation
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
  
    if (username && password) {
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('chat-room-screen').style.display = 'flex';
    } else {
      alert('Please enter a username and password.');
    }
  });
  
  document.getElementById('logout-btn').addEventListener('click', () => {
    document.getElementById('chat-room-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
  });
  
  document.getElementById('post-btn').addEventListener('click', () => {
    const messageInput = document.getElementById('message-input');
    const messageText = messageInput.value;
    
    if (messageText.trim() !== '') {
      const messages = document.getElementById('messages');
      const newMessage = document.createElement('div');
      newMessage.classList.add('message');
      newMessage.innerHTML = `<strong>Me</strong> <span class="time">${new Date().toLocaleString()}</span><p>${messageText}</p>`;
      messages.appendChild(newMessage);
      messageInput.value = '';
      messages.scrollTop = messages.scrollHeight; // Scroll to the bottom
    }
  });
  