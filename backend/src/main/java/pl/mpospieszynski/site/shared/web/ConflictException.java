package pl.mpospieszynski.site.shared.web;

/** 409, e.g. a slug that is already taken. Stale versions (optimistic locking) map to 409 automatically. */
public class ConflictException extends SiteException {

    public ConflictException(String messageKey, Object... messageArgs) {
        super(messageKey, messageArgs);
    }
}
