import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { 
  setupProductionSecurity, 
  validateProductionEnvironment, 
  logSecurityRecommendations 
} from "./security";

const app = express();

// Production Environment Validation
try {
  validateProductionEnvironment();
} catch (error) {
  console.error('Environment validation failed:', error.message);
  // Continue in development mode but warn about missing production configs
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

// Security Configuration for Production
if (process.env.NODE_ENV === 'production') {
  setupProductionSecurity(app);
  logSecurityRecommendations();
}

// Increase the JSON request body size limit to 10MB (for image uploads)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

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

  // Production-Grade Error Handling
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Log error details for monitoring
    console.error(`Error ${status} on ${req.method} ${req.path}:`, {
      message: err.message,
      stack: isProduction ? undefined : err.stack,
      user: req.user?.userId || 'anonymous',
      timestamp: new Date().toISOString()
    });

    // Send appropriate error response
    if (isProduction) {
      // Production: Don't expose internal error details
      const message = status < 500 ? err.message : 'Internal Server Error';
      res.status(status).json({ 
        error: true,
        message,
        timestamp: new Date().toISOString()
      });
    } else {
      // Development: Include detailed error information
      res.status(status).json({
        error: true,
        message: err.message || "Internal Server Error",
        stack: err.stack,
        timestamp: new Date().toISOString()
      });
    }

    // Don't throw the error again in production
    if (!isProduction) {
      throw err;
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

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
