const express = require('express')
const http = require('http')
const socket = require('socket.io')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const path = require('path')
const crypto = require('crypto');
const cors = require('cors');

class ChatApp {
    constructor(port) {
        this.port = port
        this.app = express()
        this.server = http.createServer(this.app)
        this.io = socket(this.server, {
            cors : {
                origin: "http://127.0.0.1:5500", 
                methods: ["GET", "POST"],
                allowedHeaders: ["Content-Type"],
                credentials: true
            }
        })
        this.usermgmt = new UserManagement()
        this.msgmgmt = new MessageManagement()

        this.setupMiddleware()
        this.setupDatabase()
        this.handleSocketConnection()
        this.configureRoutes()
    }

    startServer() {
        this.server.listen(this.port, () => {
            console.log(`Server is running on port ${this.port}`);
        });
    }

    setupMiddleware() {
        this.app.use(express.json())
        this.app.use(express.urlencoded({ extended: true }))
        this.app.use(cors());
        this.app.use(express.static(path.join(__dirname, 'public')));
    }

    setupDatabase() {
        const url = 'mongodb://localhost:27017/chatApp';

        mongoose.connect(url, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        })
            .then(() => {
                console.log('Connected to MongoDB');
            })
            .catch(err => {
                console.error('Failed to connect to MongoDB', err);
            });
    }

    configureRoutes() {
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'pages', 'login.html'));
        });

        this.app.post('/login', async (req, res) => {
            try {
                const username = req.body.username
                const password = req.body.password
                const { success, token } = await this.usermgmt.authenticateUser(username, password)
                if (success) {
                    res.status(200).json({
                        token: token,
                        redirect: 'ChatRoom.html'
                    });
                }
                else {
                    console.log('Invalid Creds : ' + username + ' ' + password)
                    res.status(400).json({message : 'Login Failed : ' + 'Invalid Credentials'})
                }
            }
            catch (err) {
                res.status(500).json({message : 'Login Failed : ' + err})
            }
        });

        this.app.post('/register', async (req, res) => {
            try {
                const username = req.body.username
                const password = req.body.password
                const { success, message } = await this.usermgmt.registerUser(username, password)
                res.status(success ? 200 : 400).send(message)
            }
            catch (err) {
                res.status(500).send('Registration Failed : ' + err)
            }
        });

        this.app.post('/logout', (req, res) => {
            res.status(200).send({ message: 'Logged out successfully' });
        })
    }

    handleSocketConnection() {
        this.io.on('connection', async (socket) => {
            this.io.emit('userConnected', {
                message: 'A new user has joined the chat',
                timestamp: Date.now()
            });

            socket.on('fetchMessages', async () => {    
                const messages = await this.msgmgmt.fetchMessages()
                console.log('messages : ' + messages)
                socket.emit('PopulateChat', messages)
            })

            socket.on('postMessage', async (data) => {
                try {
                    const user = await this.usermgmt.User.findOne({username: data.username})
                    console.log('user : ' + user)
                    console.log('token : ' + data.token)
                    if (!user) {
                        socket.emit('UserNotFound', { alert: 'User Not Found' });
                        return;
                    }
    
                    if (!this.usermgmt.validToken(data.token)) {
                        socket.emit('InvalidToken', { alert: 'Invalid Token' });
                        return;
                    }

                    this.msgmgmt.saveNewMessage(data)
    
                    this.io.emit('newMessage', {
                        username: data.username,
                        content: data.message,
                        timestamp: data.timestamp
                    });
                } catch (err) {
                    console.error('Error handling postMessage:', err);
                }
            })
          })
    }

}

class UserManagement {
    constructor() {
        const userSchema = new mongoose.Schema({
            username: { type: String, required: true, unique: true },
            password: { type: String, required: true }
        });
        this.User = mongoose.model('User', userSchema)
        this.secretKey = "IhateJavaScript";
    }

    async authenticateUser(username, password) {
        const user = await this.User.findOne({ username });
        console.log('user : ' + user)
        if (!user) {
            return { success: false, token: '' }
        }
        const isMatch = await bcrypt.compare(password, user.password)
        console.log('isMatch : ' + isMatch)
        return isMatch ? { success: true, token: this.generateToken(username) } :
            { success: false, token: '' }
    }

    async registerUser(username, password) {
        try {
            const user = await this.User.findOne({ username });
            console.log('user : ' + user)
            if (user) {
                return { success: false, message: 'User already exists.' }
            }
            const hashedPass = await bcrypt.hash(password, 10)
            const newUser = new this.User({ username: username, password: hashedPass })
            console.log('new User : ' + newUser)
            await newUser.save()
            return { success: true, message: 'Registration Successful' }
        }
        catch (err) {
            return { success: false, message: err}
        }

    }

    generateToken(username) {
        const timestamp = Date.now();
        const data = `${username}:${timestamp}`;
        const hmac = crypto.createHmac('sha256', this.secretKey);
        hmac.update(data);
        const signature = hmac.digest('hex');
        return `${data}:${signature}`;
    }

    validToken(token) {
        const [username, timestamp, signature] = token.split(':');
        const data = `${username}:${timestamp}`;
        const hmac = crypto.createHmac('sha256', this.secretKey);
        hmac.update(data);
        const validSignature = hmac.digest('hex');
        return signature === validSignature;
    }

}

class MessageManagement {
    constructor() {
        const messageSchema = new mongoose.Schema({
            username: { type: String, required: true },
            message: { type: String, required: true },
            timestamp: { type: Date, default: Date.now }
        });
        this.message = mongoose.model('Message', messageSchema)
    }

    saveNewMessage(data) {
        const message = new this.message({
            username: data.username,
            message: data.message,
            timestamp: Date.now()
        });
        message.save();
    }

    async fetchMessages() {
        try {
            return await this.message.find({})
        } catch (err) {
            console.error('Error fetching messages:', err);
        }
    }
}

const app = new ChatApp(3001); 
app.startServer();