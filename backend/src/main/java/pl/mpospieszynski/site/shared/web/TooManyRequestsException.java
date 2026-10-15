package pl.mpospieszynski.site.shared.web;

/** 429: a rate limit was hit (e.g. the contact form). */
public class TooManyRequestsException extends SiteException {

    public TooManyRequestsException(String messageKey, Object... messageArgs) {
        super(messageKey, messageArgs);
    }
}
