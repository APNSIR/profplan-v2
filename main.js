const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

let server;
let mainWindow;

/*
 * =========================================================
 * PROFPLAN LOCAL SERVER
 * =========================================================
 */

const PROFPLAN_HOST = '127.0.0.1';
const PROFPLAN_PORT = 3157;

console.log('========================================');
console.log('PROFPLAN ELECTRON STARTING');
console.log('Electron version:', process.versions.electron);
console.log('Node version:', process.versions.node);
console.log('App path:', __dirname);
console.log('========================================');


/* =========================================================
   START LOCAL STATIC SERVER
========================================================= */

function startServer() {
    const outDir = path.join(__dirname, 'out');

    console.log('ProfPlan out directory:', outDir);

    if (!fs.existsSync(outDir)) {
        throw new Error(
            `ProfPlan "out" directory was not found: ${outDir}`
        );
    }

    server = http.createServer((req, res) => {
        let urlPath;

        try {
            urlPath = decodeURIComponent(
                req.url.split('?')[0]
            );
        } catch (error) {
            res.writeHead(400, {
                'Content-Type':
                    'text/plain; charset=utf-8',
            });

            res.end('Bad request');
            return;
        }

        /*
         * Root opens Today.
         */

        if (urlPath === '/') {
            urlPath = '/today/';
        }

        /*
         * Prevent path traversal.
         */

        const normalisedPath = path.normalize(urlPath);

        if (
            normalisedPath.startsWith('..') ||
            normalisedPath.includes(`..${path.sep}`)
        ) {
            res.writeHead(403, {
                'Content-Type':
                    'text/plain; charset=utf-8',
            });

            res.end('Forbidden');
            return;
        }

        /*
         * -----------------------------------------------------
         * NEXT.JS STATIC EXPORT
         * -----------------------------------------------------
         *
         * Because next.config.mjs contains:
         *
         * output: 'export'
         * trailingSlash: true
         *
         * routes are exported as:
         *
         * out/today/index.html
         * out/timetable/index.html
         * out/syllabus/index.html
         *
         */

        let filePath;

        if (
            urlPath.endsWith('/') ||
            !path.extname(urlPath)
        ) {
            const routePath =
                urlPath.endsWith('/')
                    ? urlPath
                    : `${urlPath}/`;

            filePath = path.join(
                outDir,
                routePath,
                'index.html'
            );
        } else {
            filePath = path.join(
                outDir,
                urlPath
            );
        }

        /*
         * Make sure the resolved file remains inside outDir.
         */

        const resolvedOutDir =
            path.resolve(outDir);

        const resolvedFilePath =
            path.resolve(filePath);

        if (
            !resolvedFilePath.startsWith(
                resolvedOutDir
            )
        ) {
            res.writeHead(403, {
                'Content-Type':
                    'text/plain; charset=utf-8',
            });

            res.end('Forbidden');
            return;
        }

        /*
         * Serve requested file.
         */

        fs.readFile(
            resolvedFilePath,
            (err, data) => {
                if (err) {
                    console.error(
                        'FILE NOT FOUND:',
                        resolvedFilePath
                    );

                    res.writeHead(404, {
                        'Content-Type':
                            'text/plain; charset=utf-8',
                    });

                    res.end('Page not found');
                    return;
                }

                const ext =
                    path.extname(
                        resolvedFilePath
                    ).toLowerCase();

                const contentTypes = {
                    '.html':
                        'text/html; charset=utf-8',

                    '.js':
                        'application/javascript; charset=utf-8',

                    '.mjs':
                        'application/javascript; charset=utf-8',

                    '.css':
                        'text/css; charset=utf-8',

                    '.json':
                        'application/json; charset=utf-8',

                    '.png':
                        'image/png',

                    '.jpg':
                        'image/jpeg',

                    '.jpeg':
                        'image/jpeg',

                    '.gif':
                        'image/gif',

                    '.webp':
                        'image/webp',

                    '.svg':
                        'image/svg+xml',

                    '.ico':
                        'image/x-icon',

                    '.webmanifest':
                        'application/manifest+json',

                    '.txt':
                        'text/plain; charset=utf-8',

                    '.woff':
                        'font/woff',

                    '.woff2':
                        'font/woff2',

                    '.ttf':
                        'font/ttf',

                    '.otf':
                        'font/otf',
                };

                res.writeHead(200, {
                    'Content-Type':
                        contentTypes[ext] ||
                        'application/octet-stream',
                });

                res.end(data);
            }
        );
    });

    server.on(
        'error',
        (error) => {
            console.error(
                'PROFPLAN SERVER ERROR:',
                error
            );
        }
    );

    server.listen(
        PROFPLAN_PORT,
        PROFPLAN_HOST,
        () => {
            console.log(
                `ProfPlan server running at http://${PROFPLAN_HOST}:${PROFPLAN_PORT}`
            );

            createWindow();
        }
    );
}


/* =========================================================
   CREATE ELECTRON WINDOW
========================================================= */

function createWindow() {
    console.log('Creating ProfPlan BrowserWindow...');

    mainWindow =
        new BrowserWindow({
            width: 1280,
            height: 860,

            minWidth: 900,
            minHeight: 600,

            title:
                'ProfPlan - E-Lesson Plan-cum-Progress Register',

            autoHideMenuBar: true,

            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,

                /*
                 * Persistent browser session.
                 *
                 * Keeps ProfPlan localStorage persistent.
                 */
                partition:
                    'persist:profplan',
            },
        });

    const startURL =
        `http://${PROFPLAN_HOST}:${PROFPLAN_PORT}/today/`;

    console.log(
        'Loading ProfPlan:',
        startURL
    );

    mainWindow.loadURL(startURL);


    /*
     * Page load success.
     */

    mainWindow.webContents.on(
        'did-finish-load',
        () => {
            console.log(
                'ProfPlan page loaded successfully.'
            );
        }
    );


    /*
     * Page load failure.
     */

    mainWindow.webContents.on(
        'did-fail-load',
        (
            event,
            errorCode,
            errorDescription,
            validatedURL
        ) => {
            console.error(
                'PROFPLAN PAGE LOAD FAILED:',
                {
                    errorCode,
                    errorDescription,
                    validatedURL,
                }
            );
        }
    );


    /*
     * Renderer crash / termination.
     */

    mainWindow.webContents.on(
        'render-process-gone',
        (event, details) => {
            console.error(
                'PROFPLAN RENDERER TERMINATED:',
                details
            );
        }
    );


    /*
     * Window closed.
     */

    mainWindow.on(
        'closed',
        () => {
            console.log(
                'ProfPlan window closed.'
            );

            mainWindow = null;
        }
    );
}


/* =========================================================
   ELECTRON READY
========================================================= */

app.whenReady()
    .then(() => {
        console.log(
            'Electron app.whenReady() fired.'
        );

        startServer();

        app.on(
            'activate',
            () => {
                if (
                    BrowserWindow
                        .getAllWindows()
                        .length === 0
                ) {
                    createWindow();
                }
            }
        );
    })
    .catch(
        (error) => {
            console.error(
                'PROFPLAN ELECTRON STARTUP ERROR:',
                error
            );
        }
    );


/* =========================================================
   ALL WINDOWS CLOSED
========================================================= */

app.on(
    'window-all-closed',
    () => {
        console.log(
            'All ProfPlan windows closed.'
        );

        if (server) {
            server.close(
                () => {
                    console.log(
                        'ProfPlan local server closed.'
                    );
                }
            );

            server = null;
        }

        if (
            process.platform !== 'darwin'
        ) {
            app.quit();
        }
    }
);


/* =========================================================
   UNCAUGHT ERRORS
========================================================= */

process.on(
    'uncaughtException',
    (error) => {
        console.error(
            'PROFPLAN UNCAUGHT EXCEPTION:',
            error
        );
    }
);

process.on(
    'unhandledRejection',
    (reason) => {
        console.error(
            'PROFPLAN UNHANDLED REJECTION:',
            reason
        );
    }
);