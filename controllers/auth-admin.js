const bcrypt = require('bcryptjs');
const mysql = require('mysql');

const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE,
});

exports.registerAdmin = (req, res) => {
    const { name, email, password, passwordConfirm } = req.body;

    if (password !== passwordConfirm) {
        return res.status(400).json({ message: 'passwornya beda bro' });
    }

    db.query('SELECT email FROM user WHERE email = ?', [email], (err, results) => {
        if (err) {
            return res.status(500).send('Internal Server Error');
        }
        if (results.length > 0) {
            return res.status(400).json({ message: 'Email ini sudah terdaftar' });

        } else if (password !== passwordConfirm) {
            return res.status(400).json({ message: 'passwornya beda bro' }); // Prioritaskan validasi password
        }

        const hashedPassword = bcrypt.hashSync(password, 10);
        
        db.query('INSERT INTO user SET ?', { name, email, password: hashedPassword }, (err, results) => {
            if (err) {
                return res.status(500).send('Internal Server Error');
            }
            return res.status(200).json({ message: 'User terdaftar' });
        });
    });
};

exports.loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).send('Harap isi email dan password');
        }

        db.query('SELECT * FROM user WHERE email = ?', [email], async (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).send('Internal Server Error');
            }

            if (!results.length || !(await bcrypt.compare(password, results[0].password))) {
                return res.status(401).send('Email atau password salah');
            }

            res.status(200).redirect('/index');
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error saat logout:", err);  // Tambahkan log untuk memeriksa error
            return res.status(500).send("Logout failed");  // Gunakan status 500 jika ada error
        }
        res.redirect("/login");
    });
};
