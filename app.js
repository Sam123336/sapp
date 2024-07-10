const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('./models/User');
const postModel = require('./models/post');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.use(cookieParser());

// Routes
app.get('/', (req, res) => {
    res.render('register');
});

// app.post('/register', async (req, res) => {
//     let { username, name, age, email, password } = req.body;
//     let user = await userModel.findOne({ email: email });
//     if (user) {
//         return res.status(500).send('User already exists');
//     }
//     bcrypt.genSalt(10, function (err, salt) {
//         bcrypt.hash(password, salt, async function (err, hash) {
//             let user = await userModel.create({
//                 username,
//                 name,
//                 age,
//                 email,
//                 password: hash
//             });
//             let token = jwt.sign({ email: email, userid: user._id, name: user.name }, "shhhh"); // Ensure name is included
//             res.cookie('token', token);
//             res.redirect('/profile');
//         });
//     });
// });
app.post('/register', async (req, res) => {
    try {
        let { username, name, age, email, password } = req.body;

        // Check if user already exists
        let existingUser = await userModel.findOne({ email: email });
        if (existingUser) {
            return res.status(400).send('User already exists');
        }

        // Generate salt and hash the password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // Create new user
        let newUser = await userModel.create({
            username,
            name,
            age,
            email,
            password: hash
        });

        // Generate JWT token
        let token = jwt.sign({ email: email, userid: newUser._id, name: newUser.name }, "shhhh");

        // Set token in cookie and redirect to profile page
        res.cookie('token', token);
        res.redirect('/profile');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});


app.post('/login', async (req, res) => {
    try {
        let { email, password } = req.body;
        let user = await userModel.findOne({ email: email });
        if (!user) {
            return res.status(400).send('Invalid email or password');
        }
        bcrypt.compare(password, user.password, function (err, result) {
            if (err) {
                return res.status(500).send('Something went wrong');
            }
            if (result) {
                let token = jwt.sign({ email: email, userid: user._id, name: user.name }, "shhhh"); // Ensure name is included
                res.cookie('token', token);
                res.redirect('/profile');
            } else {
                res.status(400).send('Invalid email or password');
            }
        });
    } catch (err) {
        res.status(500).send('Something went wrong');
    }
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/logout', (req, res) => {
    res.cookie('token', "");
    res.redirect("/login");
});

// app.get('/profile', islogin, async (req, res) => {
//    // Ensure req.user contains the name
//    let user = await userModel.findOne({ email: req.user.email }).populate("post"); 
//    console.log(req.user)
//     res.render('profile', { user: req.user });
// });
app.get('/profile', islogin, async (req, res) => {
    try {
        let user = await userModel.findOne({ email: req.user.email }).populate("post");
        if (!user) {
            return res.status(404).send('User not found');
        }
        console.log(user); // Ensure you log the entire user object
        res.render('profile', { user: user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/post', islogin, async (req, res) => {
    try {
        let user = await userModel.findOne({ email: req.user.email }); // Use req.user.email to find the logged-in user
        if (!user) {
            return res.status(404).send('User not found'); // Handle case where user is not found
        }

        let post = await postModel.create({ 
            user: user._id,
            content: req.body.content
        });

        user.post.push(post._id);
        await user.save();
        res.redirect('/profile');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

 
function islogin(req, res, next) {
    if (!req.cookies.token) {
        return res.redirect("/login");
    } else {
        try {
            let data = jwt.verify(req.cookies.token, "shhhh");
            req.user = data;
            next();
        } catch (err) {
            res.clearCookie("token");
            return res.redirect("/login");
        }
    }
}

// Start server
mongoose.connect(process.env.MONGODB_URL)
    .then(() => {
        console.log('MongoDB connected');
        const port = process.env.PORT || 5000;
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    })
    .catch((err) => console.error('MongoDB connection error:', err));
