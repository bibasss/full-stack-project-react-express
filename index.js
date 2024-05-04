const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');

const app = express();
const secretKey = "Azamat-aqai-is-best-teacher";
const databaseFilePath = './database.json';

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// Функция для чтения данных из файла database.json
function readDatabase() {
    if (fs.existsSync(databaseFilePath)) {
        const data = fs.readFileSync(databaseFilePath);
        return JSON.parse(data);
    } else {
        return { users: [], categories: [], posts: [] };
    }
}

// Функция для записи данных в файл database.json
function writeDatabase(data) {
    fs.writeFileSync(databaseFilePath, JSON.stringify(data, null, 2));
}

// Прочитаем данные из файла при запуске сервера
let { users, categories, posts } = readDatabase();

app.get('/categories', (req, res) => {res.json(categories)});
app.get('/posts', (req, res) => {res.json(posts)});
app.get('/users', (req, res) => {res.json(users)});

app.post('/login', (req, res) => {
    const reqUser = req.body
    const user = users.find(u => u.email === reqUser.email && u.password === reqUser.password);
    
    if(user){
        const token = jwt.sign({userId: user.id, email: user.email, role: user.role}, secretKey, {expiresIn: 3600});
        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            token: token
        });
    }else{
        res.status(401).json({message: "Wrong username or password"});
    }
});

app.post('/register', (req, res) => {
    const {username, email, password} = req.body;
    const existingUser = users.find(user => user.email === email);
    
    if (existingUser) {
        return res.status(401).json({ message: "User with this email already exists" });
    };

    const newUser = { id: users.length > 0 ? users[users.length-1].id + 1 : 1, username, email, password, role: "user" };

    users.push(newUser);
    writeDatabase({ users, categories, posts });
    res.json({message: `User: ${username} was registered`});
});


const checkToken = async (req, res, next) => {
    const authValue = req.headers["authorization"];
    const token = authValue && authValue.split(" ")[1];

    if(!token){
        return res.status(401).json({ error: "Token is not found" });
    }

    jwt.verify(token, secretKey, (err, value) => {
        if(err){
            return res.status(401).json({ error: "Token is invalid" });
        }else{
            req.userId = value.userId;
            next();
        }
    })
};

app.get('/privatePosts', checkToken, (req, res) => {
    const userId = req.userId;
    const postsToSend = posts.filter(p => p.user_id == userId);
    res.json(postsToSend);
});


app.get("/post", (req, res) => {
    res.send("test");
});

app.post("/post", (req, res) => {
    res.send("testpost");
});

app.post('/posts/create', checkToken, (req, res) => {
    const { post_header, post_type, img_src, post_text, about, cost } = req.body;
    const userId = req.userId;
    const newPost = {
        id: posts.length > 0 ? Math.max(...posts.map(post => parseInt(post.id))) + 1 : 1,
        post_header,
        post_type,
        img_src,
        post_text,
        about,
        cost,
        user_id: userId
    };
    posts.push(newPost);
    writeDatabase({ users, categories, posts });
    res.status(201).json({ message: 'Post created successfully', post: newPost });
});



app.delete('/posts/:id', checkToken, (req, res) => {
    const postId = parseInt(req.params.id);
    const userId = req.userId;
    const index = posts.findIndex(post => post.id === postId);
    if (index !== -1) {
        if (posts[index].user_id === userId) {
            const deletedPost = posts.splice(index, 1);
            writeDatabase({ users, categories, posts });
            res.json({ message: 'Post deleted successfully', post: deletedPost });
        } else {
            res.status(403).json({ error: 'Unauthorized access: you can only delete your own posts' });
        }
    } else {
        res.status(404).json({ error: 'Post not found' });
    }
});

//edit
app.put('/posts/edit/:id', checkToken, (req, res) => {
    const postId = parseInt(req.params.id);
    const { post_header, post_type, img_src, post_text, about, cost } = req.body;
    const userId = parseInt(req.userId);
    const index = posts.findIndex(post => post.id === postId);
    if (index !== -1) {
        if (posts[index].user_id === userId) {
            posts[index] = {
                ...posts[index],
                post_header,
                post_type,
                img_src,
                post_text,
                about,
                cost
            };
            writeDatabase({ users, categories, posts });
            res.json({ message: 'Post updated successfully', post: posts[index] });
        } else {
            res.status(403).json({ error: 'Unauthorized access: you can only update your own posts' });
        }
    } else {
        res.status(404).json({ error: 'Post not found' });
    }
});



app.get('/posts/:id', (req, res) => {
    const postId = parseInt(req.params.id);
    const post = posts.find(post => post.id === postId);
    if (post) {
        res.json(post);
    } else {
        res.status(404).json({ error: 'Post not found' });
    }
});


app.get('/posts/category/:category', (req, res) => {
    const category = req.params.category;
    const postsByCategory = posts.filter(post => post.post_type === category);
    res.json(postsByCategory);
});



app.listen(4005, () =>{
    console.log("Server Started");
})