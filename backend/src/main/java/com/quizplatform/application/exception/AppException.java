package com.quizplatform.application.exception;

// Base for service-layer exceptions that the GlobalExceptionHandler translates
// into HTTP responses. Status codes match the original Next.js routes' semantics.
public class AppException extends RuntimeException {
    private final int status;
    public AppException(int status, String message) { super(message); this.status = status; }
    public int getStatus() { return status; }

    public static class NotFound extends AppException {
        public NotFound(String m) { super(404, m); }
        public NotFound() { this("Not found"); }
    }
    public static class Conflict extends AppException {
        public Conflict(String m) { super(409, m); }
    }
    public static class Forbidden extends AppException {
        public Forbidden(String m) { super(403, m); }
        public Forbidden() { this("Forbidden"); }
    }
    public static class Unauthorized extends AppException {
        public Unauthorized() { super(401, "Unauthorized"); }
    }
    public static class BadRequest extends AppException {
        public BadRequest(String m) { super(400, m); }
    }
    public static class ServiceUnavailable extends AppException {
        public ServiceUnavailable(String m) { super(503, m); }
    }
}
