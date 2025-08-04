const express = require('express')
const app = express()
const port = 3000
const path = require('path')
const mongoose = require('mongoose')
const methodOverride = require('method-override')
const ejsMate = require('ejs-mate')
const session = require('express-session')
const flash = require('connect-flash')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const User = require('./models/user.js')
const cloudinary = require('cloudinary').v2
const mongoStore = require('connect-mongo')
const helmet = require('helmet')

const listingRouter = require('./routers/listing.js')
const reviewRouter = require('./routers/review.js')
const userRouter = require('./routers/user.js')

require('dotenv').config()

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
  });

// MongoDB connection
const atlasUrl = 'mongodb+srv://vishwarahul638:SVmtWr7yXDGLdPM4@cluster0.3f1mgkg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

const main = async () => {
    try {
        await mongoose.connect(atlasUrl)
    } catch (error) {
        console.error('MongoDB connection error:', error.message)
    }
};
main().then(res => {
    console.log('Connected to Atlas DB.')
}).catch(err => {
    console.log(err)
})


// middlewares
app.use(methodOverride('_method'))
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))
app.use(express.urlencoded({ extended: true }))
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')))
app.engine('ejs', ejsMate)
// Remove this line as it's causing MIME type issues
// app.use('/bootstrap', express.static(path.join(__dirname, 'node_modules/bootstrap/dist')));

// Configure helmet to allow external resources
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:", "https://res.cloudinary.com", "https://*.cloudinary.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
            connectSrc: ["'self'"],
            mediaSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameSrc: ["'self'"],
            upgradeInsecureRequests: []
        }
    }
}))

const store = mongoStore.create({
    mongoUrl : atlasUrl,
    crypto :{
        secret : process.env.SECRET, 
    },
    touchAfter: 24 * 60 * 60,
})

store.on('error',(err) =>{
    console.log('error in MONGO SESSION STORE', err)
})

const sessionOptions = {
    store,
    secret : process.env.SECRET,
    resave : false,
    saveUninitialized : true,
    cookie:{
        expires : Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge : 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    }
}

if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

app.use(session(sessionOptions))
app.use(flash())

app.use(passport.initialize())
app.use(passport.session())
passport.use(new LocalStrategy(User.authenticate()))

passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

app.use((req,res,next) =>{
    res.locals.success = req.flash('success')
    res.locals.error = req.flash('error')
    res.locals.currUser = req.user;
    next()
})

// Home page route
app.get('/', (req, res) => {
    res.render('listing/home.ejs')
})

app.use('/listing', listingRouter)
app.use('/listing/:id/review',reviewRouter)
app.use('/', userRouter)



// Error handling
app.use((err, req, res, next) => {
    let { status = 500, message = "Something went wrong" } = err
    console.log(err)
    res.status(status).render('error.ejs', { message });
})

// app.all(/.*/, (req, res, next) => {
//     const ExpressError = require('./utils/ExpressError.js')
//     next(new ExpressError(404, "Page not found"));
// });



// HTTP request listener
app.listen(port, () => {
    console.log("App is running on", port)
})