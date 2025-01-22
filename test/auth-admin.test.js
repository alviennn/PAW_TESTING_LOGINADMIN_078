const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const { registerAdmin, loginAdmin, logout } = require('../controllers/auth-admin');
const session = require('express-session');


// Mock database MySQL
jest.mock('mysql', () => ({
    createConnection: jest.fn().mockReturnValue({
        query: jest.fn()
    })
}));

// Membuat aplikasi Express untuk pengujian
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Menambahkan route untuk register dan login
app.post('/register', registerAdmin);
app.post('/login', loginAdmin);
app.post('/logout', logout);


describe('Auth Admin Controller', () => {
    let db;

    beforeAll(() => {
        db = require('mysql').createConnection();
    });

    afterEach(() => {
        jest.clearAllMocks(); // Reset mocks setelah setiap test
    });

    it('should render register admin page with error if email is already registered', async () => {
        db.query.mockImplementation((sql, params, callback) => {
            if (sql.includes('SELECT email')) {
                callback(null, [{ email: 'user@example.com' }]); // Simulasi email sudah terdaftar
            }
        });
    
        const response = await request(app)
            .post('/register')
            .send({ name: 'User', email: 'user@example.com', password: 'password123', passwordConfirm: 'password123' });
    
        expect(response.status).toBe(400); // Mengharapkan status 400 untuk error
        expect(response.text).toContain('Email ini sudah terdaftar');
    });

    it('should render register admin page with error if passwords do not match', async () => {
        const response = await request(app)
            .post('/register')
            .send({
                name: 'User',
                email: 'user@example.com',
                password: 'password123',
                passwordConfirm: 'password456', // Password tidak cocok
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('passwornya beda bro');
    });

    it('should successfully register user if email is not registered and passwords match', async () => {
        db.query.mockImplementation((sql, params, callback) => {
            if (sql.includes('SELECT email')) {
                callback(null, []); // Simulasi email belum terdaftar
            } else if (sql.includes('INSERT INTO user')) {
                callback(null, { insertId: 1 }); // Simulasi insert berhasil
            }
        });

        // Mock bcrypt hash untuk password
        jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed_password');

        const response = await request(app)
            .post('/register')
            .send({ name: 'User', email: 'user@example.com', password: 'password123', passwordConfirm: 'password123' });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('User terdaftar');
        }, 10000);

    it('should render login page with error if email or password is incorrect', async () => {
        db.query.mockImplementation((sql, params, callback) => {
            if (sql.includes('SELECT * FROM user')) {
                callback(null, []); // Simulasi email tidak ditemukan
            }
        });

        const response = await request(app)
            .post('/login')
            .send({ email: 'user@example.com', password: 'wrongpassword' });

        expect(response.status).toBe(401);
        expect(response.text).toContain('Email atau password salah');
    });

    it('should successfully login if email and password are correct', async () => {
        db.query.mockImplementation((sql, params, callback) => {
            if (sql.includes('SELECT * FROM user')) {
                callback(null, [{ email: 'user@example.com', password: 'hashed_password' }]);
            }
        });

        // Mock bcrypt compare untuk password
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

        const response = await request(app)
            .post('/login')
            .send({ email: 'user@example.com', password: 'password123' });

        expect(response.status).toBe(302); // Redirect setelah login sukses
        expect(response.headers.location).toBe('/index'); // Pastikan redirect ke halaman index
    });
});

describe('POST /logout', () => {
    let agent;

    beforeEach(() => {
        // Start a new session for each test
        agent = request.agent(app);
    });

    it('should log out and redirect to login page', async () => {
        // Simulate a user login (pastikan login berhasil)
        const loginResponse = await agent.post('/login').send({ username: 'user', password: 'password' });
        
        // Perform the logout request
        const response = await agent.post('/logout');
    
        // Assert the redirect to login page
    });

    it('should handle error during logout gracefully', async () => {
        // Mock req.session.destroy to simulate an error
        const sessionDestroyMock = jest.fn((callback) => {
            callback(new Error('Logout Error'));
        });

        // Mock express-session to use the mocked destroy function
        app.use((req, res, next) => {
            req.session = {
                destroy: sessionDestroyMock,
            };
            next();
        });

        const response = await agent.post('/logout');

        // Assert the error handling and the redirect
    });
});