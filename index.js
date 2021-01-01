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
    // we're connected!
    console.log('connect successfully')
})

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    items: { type: Map, of: Number, default: new Map() }
})

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
    console.log(username)
    const isUserExists = await userModel.countDocuments({ username, password })
    if (isUserExists <= 0) {
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
    const isUserExists = await userModel.countDocuments({ username })
    if (isUserExists > 0) {
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
app.post('/items/create', function(req, res) {
    // verify token
    const { token, item, quantity } = req.body
    console.log(token)
    console.log(item)
    console.log(quantity)
    if (!token) {
        res.status(400).json({
            message: 'authentication token required'
        })
    }
    
    // get payload
    var payload
    try {
        payload = jwt.verify(token, jwtKey)
    } catch (err) {
        res.status(400).end()
    }
    
    // check token expiration
    if (Date.now() > payload.exp) {
        res.status(400).json({ 
            message: 'authentication token expired'
        })
    }

    // get users cart
    const user = userModel.find({ username: payload.username })
    const cart = user.cart
    if (cart.has(item)) {
        cart[item] += quantity
    } else {
        cart[item] = quantity
    }
    
    // send item
    res.status(200).json({
        item: {
            username: payload.username,
            name: item,
            quantity: quantity
        }
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
    } catch (err) {
        res.status(400).end()
    }
    
    // check token expiration
    if (Date.now() > payload.exp) {
        res.status(400).json({ 
            message: 'authentication token expired'
        })
    }

    // find user
    const user = userModel.find({ username: payload.username })
    if (!user) {
        res.status(400).json({
            message: 'couldn\'t find user'
        })
    }

    // render their cart
    res.render('cart.ejs', { cart: payload.cart })
})
app.post('items/remove', function (req, res) {

})

