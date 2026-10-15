package pl.mpospieszynski.site.shared.web;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * RFC 9457 errors with a `detail` in the request's language (the `lang` parameter, default Polish).
 * Field errors come as `errors: [{ field, message }]`.
 */
@RestControllerAdvice
class ProblemDetailAdvice extends ResponseEntityExceptionHandler {

    private final MessageSource messages;

    ProblemDetailAdvice(MessageSource messages) {
        this.messages = messages;
    }

    @ExceptionHandler(NotFoundException.class)
    ProblemDetail notFound(NotFoundException e) {
        return problem(HttpStatus.NOT_FOUND, e.messageKey(), e.messageArgs());
    }

    @ExceptionHandler(ConflictException.class)
    ProblemDetail conflict(ConflictException e) {
        return problem(HttpStatus.CONFLICT, e.messageKey(), e.messageArgs());
    }

    @ExceptionHandler(ForbiddenException.class)
    ProblemDetail forbidden(ForbiddenException e) {
        return problem(HttpStatus.FORBIDDEN, e.messageKey(), e.messageArgs());
    }

    @ExceptionHandler(TooManyRequestsException.class)
    ProblemDetail tooManyRequests(TooManyRequestsException e) {
        return problem(HttpStatus.TOO_MANY_REQUESTS, e.messageKey(), e.messageArgs());
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    ProblemDetail staleVersion(ObjectOptimisticLockingFailureException e) {
        return problem(HttpStatus.CONFLICT, "problem.staleVersion");
    }

    @ExceptionHandler(ValidationException.class)
    ProblemDetail validation(ValidationException e) {
        ProblemDetail problem = problem(HttpStatus.BAD_REQUEST, e.messageKey());
        problem.setProperty("errors", e.problems().stream()
                .map(p -> fieldError(p.field(), message(p.messageKey(), p.args())))
                .toList());
        return problem;
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ProblemDetail badParameter(MethodArgumentTypeMismatchException e) {
        ProblemDetail problem = problem(HttpStatus.BAD_REQUEST, "problem.badParameter", e.getName());
        problem.setProperty("errors", List.of(fieldError(e.getName(), message("problem.badParameter", e.getName()))));
        return problem;
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException e, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        ProblemDetail problem = problem(HttpStatus.BAD_REQUEST, "problem.validation");
        problem.setProperty("errors", e.getBindingResult().getFieldErrors().stream()
                .map(error -> fieldError(error.getField(), messages.getMessage(error, locale())))
                .toList());
        return ResponseEntity.badRequest().body(problem);
    }

    private ProblemDetail problem(HttpStatus status, String messageKey, Object... args) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, message(messageKey, args));
        problem.setTitle(message("problem.title." + status.value()));
        return problem;
    }

    private String message(String key, Object... args) {
        return messages.getMessage(key, args, key, locale());
    }

    private static Map<String, String> fieldError(String field, String message) {
        return Map.of("field", field, "message", message);
    }

    private static Locale locale() {
        return LocaleContextHolder.getLocale();
    }
}
