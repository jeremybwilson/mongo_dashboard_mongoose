const express = require('express');
const session = require('express-session');
const flash = require('express-flash');
const parser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const {Schema} = mongoose;

const port = process.env.PORT || 8000;
// invoke express and store the result in the variable app
const app = express();

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'static')));
app.set('views', path.join(__dirname, 'views'));

app.use(parser.urlencoded({ extended: true }));
app.use(parser.json());
app.use(flash());
app.use(session({
    secret:'superSekretKitteh',
    resave: false,
    saveUninitialized: false,
    cookie: {secure: false, maxAge: 60000}
}));

app.listen(port, () => console.log(`Express server listening on port ${port}`));

let count = 0;
let name = '';
// mongodb connection
mongoose.connect('mongodb://localhost:27017/hops_db', { useNewUrlParser: true });
mongoose.connection.on('connected', () => console.log('MongoDB connected'));

const varieties = ['aroma', 'bittering', 'dual purpose'];

// schema
const HopsSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'A name is required'],
        minlength: 3,
        trim: true
    },
    origin: {
        type: String,
        required: [true, 'An origin is required'],
        minlength: 2,
        trim: true
    },
    type: {
        type: String,
        enum: varieties,
        required: [true, 'A type is required'],
        minlength: 3,
        trim: true
    },
    description: {
        type: String,
        maxlength: 500
    },
    alpha: {
        low: {
            type: Number
        },
        high: {
            type: Number
        }
    }
}, {timestamps: true})

// Example:
mongoose.model('Hop', HopsSchema); // We are setting this Schema in our Models as 'User'
const Hop = mongoose.model('Hop', HopsSchema) // We are retrieving this Schema from our Models, named 'User'

//routing
    //root route - display all
app.get('/', (request, response) => {
    console.log('getting to index');
    // This is where we will retrieve the hops from the database 
    // and include them in the view page we will be rendering.
    Hop.find({})
        .then((hops) => {
            console.log('successfully retrieved all hops');
            response.render('index', {hops, title: 'Hops Dashboard' })
        })
        // if there is an error console.log that something went wrong!
        .catch(error => {
            console.log('something went wrong in the index route');
            for (let key in error.errors) {
                request.flash('get_error', error.errors[key].message)
                console.log(error.errors[key].message);
            }
        });
});

// create new hops form page route
app.get('/hops/new', (request, response) => {
    console.log('getting to add new hops route');
    response.render('new', { varieties, title: 'Add a New Hop Variety' })
});

// Add Hop Request 
// When the user presses the submit button on index.ejs it should send a post request to '/hops'.
// In this route we should add the hop to the database and then redirect to the root route (index view)
// create new hop post action
app.post('/hops', (request, response) => {
    console.log("POST DATA", request.body);
    // This is where we would add the hop plant entry from request.body to the db.
    // Create a new Hop with the hop name, origin, type, and description, and alpha values corresponding to those from request.body
    Hop.create(request.body)
        .then(hop => {  // hope represents everything being passed to the form by request.body
            console.log(`successfully added a hop!`);
            response.redirect('/');
        })
        .catch(error => {
            console.log(`something went wrong`);
            for (let key in error.errors) {
                request.flash('create_error', error.errors[key].message);
            }
            response.redirect('/hops/new');
        });
})

// get individual hops info route
app.get('/hops/:_id', (request, response) => {
    const which = request.params._id;
    console.log(`viewing an individual hop route`);
    Hop.findById(which)
        .then((hop) => {
            response.render('show', {hop, title: 'View Hop Variety page'});
        })
        .catch(error => {
            console.log('something went wrong in the individual hops view route');
            for (let key in error.errors) {
                request.flash('get_error', error.errors[key].message)
                console.log(error.errors[key].message);
            }
            response.redirect('/');
        });
});

// post edits/updates to individual hop 
app.post('/hops/:_id', (request, response) => {
    const which = request.params._id;
    // console.log(`posting to an individual hop route`);
    // which represents id value, request.body represents all information passed from the form, 
    // {new: true} object represents a brand new value
    Hop.findByIdAndUpdate(which, request.body, {new: true}) 
        .then((hops) => {
            console.log(`successfully updated hops info!`);
            response.redirect(`/hops/${hops._id}`);
        })
        .catch(error => {
            for (let key in error.errors) {
                request.flash('create_error', error.errors[key].message);
            }
            console.log(`something went wrong in the hops update/post route, ${error.errors[key].message}`);
            response.redirect(`/hops/edit/${which}`);
        });
});

// edit hop form route
app.get('/hops/edit/:_id', (request, response) => {
    const which = request.params._id;
    console.log(`editing a individual hop route`);
    Hop.findById(which)
        .then((hop) => {
            response.render('edit', {hop, varieties, title: 'Edit Hops page'});
        })
        // if there is an error console.log that something went wrong!
        .catch(error => {
            console.log('something went wrong in the hops edit route');
            for (let key in error.errors) {
                request.flash('get_error', error.errors[key].message)
            }
            console.log(error);
            response.redirect('/');
        });
});

app.get('/hops/destroy/:_id', (request,response) => {
    const which = request.params._id;
    Hop.remove({_id:which})
        .then(() => {
            console.log('deleted successfully')
            response.redirect('/');
        })
        .catch((error) => console.log(error));
            response.redirect('/');

});

// catch 404 and forward to error handler
app.use((request, response, next) => {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use((err, request, response, next) => {
    // set locals, only providing error in development
    response.locals.message = err.message;
    response.locals.error = request.app.get('env') === 'development' ? err : {};
    response.status(err.status || 500);
    // render the error page
    response.render('error', {title: 'Error page'});
  });

// app.listen(port, () => console.log(`Express server listening on port ${port}`));    // ES6 way