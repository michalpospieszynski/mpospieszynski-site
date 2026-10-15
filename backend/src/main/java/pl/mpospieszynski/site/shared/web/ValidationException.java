package pl.mpospieszynski.site.shared.web;

import java.util.List;

/** 400 for rules Bean Validation cannot express (e.g. "a Polish translation is required"). */
public class ValidationException extends SiteException {

    /** One invalid field; `messageKey` is resolved in the request's language. */
    public record FieldProblem(String field, String messageKey, Object... args) {
    }

    private final transient List<FieldProblem> problems;

    public ValidationException(List<FieldProblem> problems) {
        this("problem.validation", problems);
    }

    /** With a specific summary (`detail`), e.g. "To publish, fill in the highlighted fields." */
    public ValidationException(String messageKey, List<FieldProblem> problems) {
        super(messageKey);
        this.problems = List.copyOf(problems);
    }

    public ValidationException(String field, String messageKey, Object... args) {
        this(List.of(new FieldProblem(field, messageKey, args)));
    }

    public List<FieldProblem> problems() {
        return problems;
    }
}
