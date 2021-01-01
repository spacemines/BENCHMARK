const dotenv = require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const app = express()


const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String
})

const UserModel = mongoose.model('User', userSchema)


mongoose.connect(process.env.MONGO_URL, { 
    useCreateIndex: true,
    useNewUrlParser: true, 
    useUnifiedTopology: true
})
const db = mongoose.connection


app.use(bodyParser.urlencoded({ extended: true })) // parsing form

app.listen(3000, function () {
    console.log('listening on 3000')
})

app.get('/users/login', function (req, res) {
    res.sendFile(__dirname + '/login.html')
})
app.post('/users/login', function (req, res) {
    console.log(req.body)
    res.send('screen 1')
})

app.get('/users/create', function (req, res) {
    res.sendFile(__dirname + '/signup.html')
})
app.post('/users/create', function (req, res) {
    console.log(req.body)
    const user = new User (req.body)
    user.save(function (err, doc) {
        if (err) console.error(err)
        console.log(doc)
    })
})

app.post('/items/create', function(req, res) {
    res.send('screen 3')
})
