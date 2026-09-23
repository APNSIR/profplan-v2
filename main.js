const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

let server;

/*
 * =========================================================
 * PROFPLAN LOCAL SERVER
 * =========================================================
 *
 * IMPORTANT:
 *
 * ProfPlan uses localStorage for local data.
 *
 * localStorage is tied to the browser origin, including
 * the port number.
 *
 * Therefore we MUST use a fixed port.
 *
 * DO NOT change this back to:
 *
 *     server.listen(0, ...)
 *
 * because that creates a different origin every time
 * ProfPlan starts.
 *
 * Stable ProfPlan origin:
 *
 *     http://127.0.0.1:3157
 *
 * This allows the saved teacher profile and academic data
 * to remain available between application launches.
 * =========================================================
 */

const PROFPLAN_HOST = '127.0.0.1';
const PROFPLAN_PORT = 3157;


/* =========================================================
   START LOCAL STATIC SERVER
========================================================= */

function startServer() {
    const outDir = path.join(__dirname, 'out');

    server = http.createServer((req, res) => {
        let urlPath = decodeURIComponent(
            req.url.split('?')[0]
        );

        /*
         * Root of ProfPlan opens Today.
         */
        if (urlPath === '/') {
            urlPath = '/today.html';
        }

        /*
         * Convert clean Next.js routes such as:
         *
         * /today
         * /timetable
         * /syllabus
         *
         * into their static HTML files.
         */
        else if (!path.extname(urlPath)) {
            urlPath = `${urlPath}.html`;
        }

        const filePath = path.join(
            outDir,
            urlPath
        );

        fs.readFile(
            filePath,
            (err, data) => {
                if (err) {
                    res.writeHead(404, {
                        'Content-Type':
                            'text/plain; charset=utf-8',
                    });

                    res.end(
                        'Page not found'
                    );

                    return;
                }

                const ext =
                    path.extname(
                        filePath
                    ).toLowerCase();

                const contentTypes = {
                    '.html':
                        'text/html; charset=utf-8',

                    '.js':
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

                    '.svg':
                        'image/svg+xml',

                    '.ico':
                        'image/x-icon',

                    '.webmanifest':
                        'application/manifest+json',

                    '.txt':
                        'text/plain; charset=utf-8',
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


    /* =====================================================
       FIXED PORT — CRITICAL PROFILE PERSISTENCE FIX
    ===================================================== */

    server.listen(
        PROFPLAN_PORT,
        PROFPLAN_HOST,
        () => {
            console.log(
                `ProfPlan running at http://${PROFPLAN_HOST}:${PROFPLAN_PORT}`
            );

            createWindow();
        }
    );


    /* =====================================================
       SERVER ERROR HANDLING
    ===================================================== */

    server.on(
        'error',
        (error) => {
            console.error(
                'ProfPlan server error:',
                error
            );

            if (
                error.code === 'EADDRINUSE'
            ) {
                console.error(
                    `Port ${PROFPLAN_PORT} is already in use.`
                );
            }
        }
    );
}


/* =========================================================
   CREATE ELECTRON WINDOW
========================================================= */

function createWindow() {
    const win =
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
                 * Keep this exactly as it is.
                 */
                partition:
                    'persist:profplan',
            },
        });


    /* =====================================================
       OPEN TODAY AS PROFPLAN HOME PAGE
    ===================================================== */

    win.loadURL(
        `http://${PROFPLAN_HOST}:${PROFPLAN_PORT}/today`
    );
}


/* =========================================================
   ELECTRON READY
========================================================= */

app.whenReady().then(() => {
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
});


/* =========================================================
   ALL WINDOWS CLOSED
========================================================= */

app.on(
    'window-all-closed',
    () => {
        if (server) {
            server.close();
            server = null;
        }

        if (
            process.platform !== 'darwin'
        ) {
            app.quit();
        }
    }
);