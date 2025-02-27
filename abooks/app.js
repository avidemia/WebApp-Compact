import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import morgan from 'morgan';
import passport from 'passport';
import path from 'path';
import swaggerUI from 'swagger-ui-express';
import docs from './docs/settings.js';
import routes from './routes/index.routes.js';
// import './passportSetup.js';

const app = express();
const dirname = path.resolve();

// PUBLIC PATHS
app.use(express.static(path.join(dirname, 'uploads')));
app.use(express.static(path.join(dirname, 'public')));
// app.use([uploadCK.array('files')]);

// MIDDLEWARE
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    optionsSuccessStatus: 200,
  }),
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(morgan('dev'));
app.use(compression());

app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(
  session({
    resave: true,
    saveUninitialized: true,
    secret: 'process.env.SESSION_SECRET',
    cookie: { maxAge: 60000 },
  }),
);

// Passport set up for Google and Facebook auth

app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
  res.render('pages/index.ejs');
});

routes(app);
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(docs));

// ALL INVALID ROUTES
app.get('*', (req, res) => {
  res.status(404).json({
    code: 404,
    info: 'Not Found.',
    status: true,
    message: 'The resource you looking for needs an valid end point.',
  });
});

export default app;
