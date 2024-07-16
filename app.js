//app.js
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('./models/User');
const postModel = require('./models/post');
require('dotenv').config();
const upload = require('./utils/multerconfig');

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
app.get("/profile/upload", (req, res) => {
    res.render('profileupload');
});
app.post("/upload", islogin,upload.single("image"),async (req, res) => {
    let user =await userModel.findOne({ email: req.user.email });
    user.profilepic = req.file.filename;
    await user.save();
    res.redirect('/profile');

});

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
// app.get("/like/:id", islogin, async (req, res) => {
//     let post = await postModel.findOne({ _id: req.params.id }).populate("user");
//     if(post.likes.indexOf(req.user.userid) == -1) {
//         post.likes.push(req.user.userid);
//     }
//     else{
//         post.likes.splice(post.likes.indexOf(req.user.userid), 1);
//     }
//     await post.save();
//     res.redirect("/dashboard");
// });

app.get('/like/:id', islogin, async (req, res) => {
    try {
        let post = await postModel.findOne({ _id: req.params.id }).populate("user");
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        if (post.likes.indexOf(req.user.userid) === -1) {
            post.likes.push(req.user.userid);
        } else {
            post.likes.splice(post.likes.indexOf(req.user.userid), 1);
        }

        await post.save();

        // res.json({ success: true, likes: post.likes.length });
        res.redirect('/dashboard')
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});


app.get('/profile/:id', async (req, res) => {
    try {
        // Find user by ID and populate their posts
        let user = await userModel.findById(req.params.id).populate('post');

        if (!user) {
            return res.status(404).send('User not found');
        }

        res.render('profile', { user });
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
                let token = jwt.sign({ email: email, userid: user._id, name: user.name }, "shhhh");
                res.cookie('token', token);
                res.redirect('/dashboard');
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

app.get('/profile', islogin, async (req, res) => {
    try {
        let user = await userModel.findOne({ email: req.user.email }).populate("post");
        // console.log(user);  
        if (!user) {
            return res.status(404).send('User not found');
        }
        res.render('profile', { user: user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/comment/:postId', islogin, async (req, res) => {
    try {
        const { text } = req.body;
        const postId = req.params.postId;
        const userId = req.user.userid;

        const post = await postModel.findById(postId);
        if (!post) {
            return res.status(404).send('Post not found');
        }

        post.comments.push({ text, user: userId });
        await post.save();

        res.redirect(`/post/${postId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Route to fetch post details including comments
// app.get('/post/:id', async (req, res) => {
//     try {
//         let post = await postModel.findById(req.params.id)
//         .populate('user')
//         .populate({
//             path: 'comments',
//             populate: {
//                 path: 'user'
//             }
//         });

//         if (!post) {
//             return res.status(404).send('Post not found');
//         }
//         res.render('post', { post: post, user: req.user });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// });
app.get('/post/:id', islogin, async (req, res) => {
    try {
        let post = await postModel.findById(req.params.id)
            .populate('user')
            .populate({
                path: 'comments.user',
                select: 'name'
            });

        if (!post) {
            return res.status(404).send('Post not found');
        }

        console.log('Post:', post);
        console.log('Comments:', post.comments);

        res.render('post', { post: post, user: req.user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});


app.post('/post', islogin, upload.array('media', 5), async (req, res) => {
    try {
        let user = await userModel.findOne({ email: req.user.email });
        if (!user) {
            return res.status(404).send('User not found');
        }

        let mediaFiles = [];
        if (req.files && req.files.length > 0) {
            mediaFiles = req.files.map(file => ({
                filename: file.filename,
                mimetype: file.mimetype
            }));
        }

        let post = await postModel.create({
            user: user._id,
            content: req.body.content,
            media: mediaFiles
        });

        user.post.push(post._id);
        await user.save();
        res.redirect('/profile');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
app.get('/mediaupload' , (req, res) => {
    res.render('mediaupload');
})




app.get('/edit/:id', async (req, res)=>{
    let post = await postModel.findById(req.params.id);

    res.render('edit', { post });
})    
app.post('/update/:id', async (req, res) => {
    let { content } = req.body;
    await postModel.findOneAndUpdate(
        { _id: req.params.id },
        { content },
        { new: true }
    );
    res.redirect('/profile');
});

app.get('/dashboard', islogin, async (req, res) => {
    try {
        let posts = await postModel.find().populate("user");
        res.render('dashboard', { posts: posts, user: req.user });
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
            console.log('Decoded user data:', req.user);  // Add this line
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
    