// imports
const dotenv = require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')

const app = express()
const jwtKey = process.env.SECRET_KEY


app.set('view engine', 'ejs')

// model
mongoose.connect(process.env.MONGO_URL, { 
    useNewUrlParser: true,
    useUnifiedTopology: true,
})

const db = mongoose.connection

db.on('error', console.error.bind(console, 'connection error:'))

db.once('open', function () {
    console.log('connect to db successfully')
})

const itemSchema = new mongoose.Schema({
    username: { type: String, required: true },
    name: { type: String, required: true, unique: true },
    quantity: { type: Number }
})

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
})

const itemModel = mongoose.model('Item', itemSchema)

const userModel = mongoose.model('User', userSchema)


// middlewares
app.use(bodyParser.urlencoded({ extended: true })) // parsing form


app.listen(3000, function () {
    console.log('listening on 3000')    
})


// endpoints
app.get('/users/login', function (req, res) {
    res.sendFile(__dirname + '/login.html')
})
app.post('/users/login', async function (req, res) {
    // verify username and password 
    const { username, password } = req.body
    const user= await userModel.findOne({ username, password })
    if (!user) {
        res.status(400).json({ 
            message: 'incorrect username or password'
        })
    }

    // create payload and token
    const payload = { username }
    const token = jwt.sign(payload, jwtKey, {
        algorithm: 'HS256',
        expiresIn: '1d' 
    })

    // send token
    res.status(200).json({ token })
    // res.redirect('/items/create')
})


app.get('/users/create', function (req, res) {
    res.sendFile(__dirname + '/signup.html')
})
app.post('/users/create', async function (req, res) {
    // verify username is valid
    const { username, password } = req.body
    const user = await userModel.findOne({ username })
    if (user) {
        res.status(400).json({ 
            message: 'username already exists'
        })
    }

    // create user in db
    await userModel.create({ username, password })
    
    // create payload and token
    const payload = { username }
    const token = jwt.sign(payload, jwtKey, {
        algorithm: 'HS256',
        expiresIn: '1d'
    })
    
    // send token
    res.status(200).json({ token })
})


app.get('/items/create', function (req, res) {
    res.sendFile(__dirname + '/addItem.html')
})
app.post('/items/create', async function(req, res) {
    // verify token
    const { token, name, quantity } = req.body
    if (!token) {
        res.status(400).json({
            message: 'authentication token required'
        })
    }
    
    // get payload
    var payload
    try {
        payload = jwt.verify(token, jwtKey)
        username = payload.username
    } catch (err) {
        res.status(400).end()
    }
    
    // check token expiration
    // Date.now() returns unix timestamp in milliseconds
    if (Date.now()/1000 > payload.exp) {
        res.status(400).json({ 
            message: 'authentication token expired'
        })
    }

    // create or update item
    const item = await itemModel.findOne({ username, name })
    if (item) {
        item.quantity += parseInt(quantity)
        await item.save()
    } else {
        await itemModel.create({ username, name, quantity })
    }

    // send item
    const itm = await itemModel.findOne({username, name})
    res.status(200).json({
        item: itm
    })
})


app.get('/items/get/:token', async function (req, res) {
    // verify token
    const token = req.params.token
    if (!token) {
        res.status(400).json({
            message: 'authentication token required'
        })
    }
    
    // get payload
    var payload
    try {
        payload = jwt.verify(token, jwtKey)
        username = payload.username
    } catch (err) {
        res.status(400).end()
    }
    
    // check token expiration
    if (Date.now()/1000 > payload.exp) {
        res.status(400).json({ 
            message: 'authentication token expired'
        })
    }

    // find user
    const user = userModel.findOne({ username })
    if (!user) {
        res.status(400).json({
            message: 'couldn\'t find user'
        })
    }

    const items = await itemModel.find({ username })
    console.log(items)
    // render their cart
    res.render('cart.ejs', { items: items })
})
app.post('items/remove', async function (req, res) {
    // verify token
    const { token, _id } = req.body
    if (!token) {
        res.status(400).json({
            message: 'authentication token required'
        })
    }

    // get payload
    var payload
    try {
        payload = jwt.verify(token, jwtKey)
        username = payload.username
    } catch (err) {
        res.status(400).end()
    }

    // check token expiration
    if (Date.now()/1000 > payload.exp) {
        res.status(400).json({
            message: 'authentication token expired'
        })
    }
    
    const item = await itemModel.findOne({ _id: _id, username: username })
    await itemModel.delete(item)
    res.status(200).json({
        item
    }) 
})

