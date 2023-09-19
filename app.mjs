// Core imports
import path from 'path';
import { fileURLToPath } from 'url';

// Dependencies
import express from 'express';
import { engine } from 'express-handlebars';
import esMain from 'es-main';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import expressSession from 'express-session';

// App Local
import handlers from './src/lib/handlers.mjs';
import credentials from './config.mjs';
import utilMiddleware from './src/lib/middleware/util.mjs';

// Setup path handlers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Configure Handlebars view engine
app.engine('handlebars', engine({
    defaultLayout: 'main',
    helpers: {
        section: function(name, options) {
            if(!this._sections) this._sections = {};
            this._sections[name] = options.fn(this);
            return null;
        },
        ifeq: function(arg1, arg2, options) {
            return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
        },
        ifgt: function(arg1, arg2, options) {
            return (arg1 > arg2) ? options.fn(this) : options.inverse(this);
        }
    }
}));
app.set('view engine', 'handlebars');
app.set('views', 'src/views');

// Middleware
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser(credentials.cookieSecret));
app.use(expressSession({
    resave: false,
    saveUninitialized: false,
    secret: credentials.cookieSecret
}));
app.use(utilMiddleware);

// Routes
app.get('/', handlers.home);
app.get('/colormode/:mode', handlers.colorMode);
app.post('/login', handlers.login);
app.get('/logout', handlers.logout);
app.get('/admin/messages', handlers.messages);
app.get('/admin/lists', handlers.lists);
app.get('/send-mail', handlers.sendMail);

// List API
app.get('/list', handlers.listApi.getLists);
app.post('/list', handlers.listApi.addList);
app.get('/list/:listName', handlers.listApi.getList);
app.put('/list/:listName', handlers.listApi.addAddress);
app.put('/list/:listName/bulk', handlers.listApi.bulkAddAddress);

// Message API
app.get('/message', handlers.messageApi.getMessages);
app.post('/message', handlers.messageApi.addMessage);
app.get('/message/:messageName', handlers.messageApi.getMessage);
app.put('/message/:messageName', handlers.messageApi.addMessageContent);

// Send API
app.post('/send', handlers.sendApi.sendMessage);

// Error handling
app.use(handlers.notFound);
app.use(handlers.serverError); 

if (esMain(import.meta)) {
    app.listen(port, () =>
        console.log(
            `Express started on http://localhost:${port}; ` +
        'press Ctrl-C to terminate.'
        )
    );
}

export default app;