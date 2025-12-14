const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const JWT_SECRET = 'super-secret-key-change-this-in-prod';

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// --- MONGODB SCHEMA ---
const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    passwordHash: { type: String, required: true },
    data: { type: Object, default: {} }
});
const UserModel = mongoose.model('User', UserSchema);

// --- HELPER: FILE SYSTEM (Local Mode) ---
function loadLocalUsers() {
    if (!fs.existsSync(USERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}
function saveLocalUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// --- MIDDLEWARE: AUTH CHECK ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- AUTH ROUTES ---
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Initial Data Template
    const initialData = {
        mode: 'personal',
        users: [{ id: 'u1', name: username, photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}` }],
        currentUser: 'u1',
        transactions: [],
        budgets: [],
        goals: [],
        clients: [],
        categories: ['Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Salary'],
        rates: { USD: 135.50, EUR: 145.80, DZD: 1 }
    };

    if (process.env.MONGODB_URI) {
        try {
            const existing = await UserModel.findOne({ username });
            if (existing) return res.status(400).json({ error: 'Username taken' });

            const newUser = new UserModel({ username, passwordHash: hashedPassword, data: initialData });
            await newUser.save();
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    } else {
        const users = loadLocalUsers();
        if (users.find(u => u.username === username)) return res.status(400).json({ error: 'Username taken' });
        users.push({ username, passwordHash: hashedPassword, data: initialData });
        saveLocalUsers(users);
        res.json({ success: true });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    let user;

    if (process.env.MONGODB_URI) {
        user = await UserModel.findOne({ username });
    } else {
        user = loadLocalUsers().find(u => u.username === username);
    }

    if (!user || !await bcrypt.compare(password, user.passwordHash)) {
        return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ username: user.username }, JWT_SECRET);
    res.json({ token, username: user.username });
});

// --- DATA ROUTES (PROTECTED) ---
app.get('/api/data', authenticateToken, async (req, res) => {
    try {
        if (process.env.MONGODB_URI) {
            const user = await UserModel.findOne({ username: req.user.username });
            if (!user) return res.sendStatus(401); // User deleted or DB reset
            res.json(user.data);
        } else {
            const user = loadLocalUsers().find(u => u.username === req.user.username);
            if (!user) return res.sendStatus(401); // User deleted or DB reset
            res.json(user.data);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/data', authenticateToken, async (req, res) => {
    try {
        if (process.env.MONGODB_URI) {
            const result = await UserModel.findOneAndUpdate({ username: req.user.username }, { data: req.body });
            if (!result) return res.sendStatus(401);
        } else {
            const users = loadLocalUsers();
            const idx = users.findIndex(u => u.username === req.user.username);
            if (idx !== -1) {
                users[idx].data = req.body;
                saveLocalUsers(users);
            } else {
                return res.sendStatus(401); // User not found
            }
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CONNECT DB ---
if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => console.log('🍃 Connected to MongoDB'))
        .catch(err => console.error('MongoDB Error:', err));
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
