import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Disable ETag generation globally to prevent caching conflicts
app.set('etag', false);

// Add global no-cache middleware for API routes to override Vite caching
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Increase the JSON request body size limit to 10MB (for image uploads)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());

// CRITICAL FIX: Add experience-addons route with alternative pattern to bypass Vite
app.get('/api/experiences/:experienceId/addons', async (req: any, res) => {
  console.log('🔥 [DIRECT-ROUTE] Experience-addons route hit!', { experienceId: req.params.experienceId });
  
  try {
    res.setHeader('Content-Type', 'application/json');
    
    // Import auth dependencies
    const { verifyToken } = await import('./emailAuth');
    const { storage } = await import('./storage');
    
    // Extract token from cookies
    const token = req.cookies?.token;
    if (!token) {
      console.log('🚫 [AUTH-FAIL] No token found');
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Verify token directly
    const decoded = verifyToken(token);
    if (!decoded) {
      console.log('🚫 [AUTH-FAIL] Invalid token');
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      console.log('🚫 [AUTH-FAIL] User not found');
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const outfitterId = user.outfitterId;
    const experienceId = parseInt(req.params.experienceId);
    
    console.log('✅ [AUTH-SUCCESS]', { userId: user.id, outfitterId, experienceId });
    
    if (!outfitterId) {
      console.log('🚫 [AUTH-FAIL] No outfitterId');
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Tenant isolation check
    const experience = await storage.getExperience(experienceId);
    if (!experience || experience.outfitterId !== outfitterId) {
      console.log('🚫 [TENANT-BLOCK] Experience access denied', { 
        experienceId, 
        userOutfitterId: outfitterId, 
        experienceOutfitterId: experience?.outfitterId 
      });
      return res.status(404).json({ error: "Experience not found" });
    }
    
    console.log('✅ [TENANT-VERIFIED] Fetching addons', { experienceId, outfitterId });
    const addons = await storage.getExperienceAddons(experienceId);
    console.log('📋 [SUCCESS] Addons returned', { count: addons?.length });
    
    return res.json(addons || []);
  } catch (error) {
    console.error('❌ [ERROR] Direct route failed:', error);
    return res.status(500).json({ error: "Failed to fetch experience addons" });
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);



  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Add error handler AFTER Vite setup so React app can handle frontend routes
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
