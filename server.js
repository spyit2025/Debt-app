const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
    // Get client IP
    const clientIP = req.headers['x-forwarded-for'] || 
                    req.connection.remoteAddress || 
                    req.socket.remoteAddress ||
                    (req.connection.socket ? req.connection.socket.remoteAddress : null);
    
    // Check rate limit
    if (!checkRateLimit(clientIP)) {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            error: 'Too Many Requests', 
            message: 'Rate limit exceeded. Please try again later.' 
        }));
        return;
    }
    
    // Parse URL
    const parsedUrl = url.parse(req.url);
    let pathname = parsedUrl.pathname;
    
    // Default to index.html for root
    if (pathname === '/') {
        pathname = '/index.html';
    }
    
    // Get file path
    const filePath = path.join(__dirname, pathname);
    
    // Get file extension
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = mimeTypes[ext] || 'text/plain';
    
    // Set security headers
    setSecurityHeaders(res);
    
    // Set CORS headers (restrictive in production)
    if (isProduction) {
        res.setHeader('Access-Control-Allow-Origin', 'https://yourdomain.com');
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Handle OPTIONS requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Check if file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(`
                <html>
                    <head><title>404 Not Found</title></head>
                    <body>
                        <h1>404 - File Not Found</h1>
                        <p>Requested file: ${pathname}</p>
                        <p>Full path: ${filePath}</p>
                    </body>
                </html>
            `);
            return;
        }
        
        // Read and serve file
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end(`
                    <html>
                        <head><title>500 Internal Server Error</title></head>
                        <body>
                            <h1>500 - Internal Server Error</h1>
                            <p>Error reading file: ${pathname}</p>
                        </body>
                    </html>
                `);
                return;
            }
            
            res.writeHead(200, { 'Content-Type': mimeType });
            res.end(data);
        });
    });
});

// Security headers function
function setSecurityHeaders(res) {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Strict Transport Security (HTTPS only)
    if (isProduction) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    
    // Content Security Policy
    const csp = "default-src 'self'; " +
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://www.gstatic.com https://cdn.datatables.net https://code.jquery.com; " +
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.datatables.net; " +
                "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; " +
                "img-src 'self' data: https:; " +
                "connect-src 'self' https://*.firebaseapp.com https://*.googleapis.com https://*.gstatic.com https://cdn.datatables.net https://code.jquery.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
                "frame-src 'none'; " +
                "object-src 'none'; " +
                "base-uri 'self';";
    
    res.setHeader('Content-Security-Policy', csp);
    
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions Policy
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
}

// Rate limiting (simple in-memory implementation)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = isProduction ? 15 * 60 * 1000 : 5 * 60 * 1000; // 15 minutes in production, 5 minutes in development
const RATE_LIMIT_MAX_REQUESTS = isProduction ? 100 : 2000; // Much more lenient in development

function checkRateLimit(ip) {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;
    
    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, []);
    }
    
    const requests = rateLimitMap.get(ip);
    const recentRequests = requests.filter(time => time > windowStart);
    
    if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
        return false;
    }
    
    recentRequests.push(now);
    rateLimitMap.set(ip, recentRequests);
    return true;
}

// Clean up old rate limit entries periodically
setInterval(() => {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;
    
    for (const [ip, requests] of rateLimitMap.entries()) {
        const recentRequests = requests.filter(time => time > windowStart);
        if (recentRequests.length === 0) {
            rateLimitMap.delete(ip);
        } else {
            rateLimitMap.set(ip, recentRequests);
        }
    }
}, 5 * 60 * 1000); // Clean up every 5 minutes

server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
    console.log(`Environment: ${isProduction ? 'Production' : 'Development'}`);
    console.log('Press Ctrl+C to stop the server');
});
