package pl.mpospieszynski.site.shared.web;

/** 404. Default message: "problem.notFound"; pass a more specific key when the page needs one. */
public class NotFoundException extends SiteException {

    public NotFoundException() {
        super("problem.notFound");
    }

    public NotFoundException(String messageKey, Object... messageArgs) {
        super(messageKey, messageArgs);
    }
}
